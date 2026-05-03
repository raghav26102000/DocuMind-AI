import json
from pathlib import Path

from fastapi import UploadFile

from database.database import get_collection
from models.models import Collection, ModelProvider, MyUploadFile
from bson import ObjectId
from datetime import datetime, timezone
import pembot.query as pq
from services.pdflatex import DPRGenerator
from services.scheme_doc_utils import relevance_pipeline
from services.search import brave_search_tool
from routes.user_document_routes import upload_to_s3
from typing import Any
from auth.auth_utils import get_user_by_id
import tempfile
from services.playwright_agent import PlaywrightAgent
from smolagents import ToolCallingAgent, tool
from smolagents.default_tools import FinalAnswerTool
from services.websocket_manager import manager
import pembot.AnyToText.convertor as pemconv
import base64
import mimetypes
import pymongo
import boto3
from botocore.exceptions import ClientError

import base64


EXCEL_FILE_TYPES_EXTENSION_MAP = {
    # Microsoft Excel (Older Binary Formats)
    'application/vnd.ms-excel': '.xls',
    'application/msexcel': '.xls',  # Older/unofficial MIME types for .xls
    'application/x-msexcel': '.xls',
    'application/x-ms-excel': '.xls',
    'application/x-excel': '.xls',
    'application/x-dos_ms_excel': '.xls',
    'application/xls': '.xls',
    'application/x-xls': '.xls',
    
    # Microsoft Excel (Open XML Formats)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel.sheet.macroEnabled.12': '.xlsm',
    'application/vnd.ms-excel.sheet.binary.macroEnabled.12': '.xlsb',

    # Microsoft Excel Templates and Add-ins
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template': '.xltx',
    'application/vnd.ms-excel.template.macroEnabled.12': '.xltm',
    'application/vnd.ms-excel.addin.macroEnabled.12': '.xlam',

    # Other Spreadsheet Formats
    'text/csv': '.csv',
    'text/tab-separated-values': '.tsv',
    'application/vnd.oasis.opendocument.spreadsheet': '.ods',
    'application/vnd.google-apps.spreadsheet': '.gdocs' # For Google Sheets
}


DPR_DOCUMENT_TYPE_CODE= 26

how_many_times_to_ask_the_user_for_all_the_answers= 5

questions_template= """

    {
        questions: [{'question': ..., 'key': ...}, ...]
    }

"""


def is_valid_base64(s):
    """
    Checks if a given string is a valid Base64 encoded string.

    Args:
        s (str or bytes): The string or bytes object to check.

    Returns:
        bool: True if the string is valid Base64, False otherwise.
    """
    if not isinstance(s, (str, bytes)):
        return False  # Input must be a string or bytes

    # If it's a string, convert to bytes for decoding
    if isinstance(s, str):
        try:
            s_bytes = s.encode('ascii')
        except UnicodeEncodeError:
            return False  # String contains non-ASCII characters, cannot be Base64
    else:
        s_bytes = s

    try:
        # Attempt to decode the bytes
        decoded_bytes = base64.b64decode(s_bytes, validate=True)
        # Re-encode to check for perfect round-trip (optional, for stricter validation)
        # return base64.b64encode(decoded_bytes) == s_bytes
        return True
    except base64.binascii.Error:
        return False  # Decoding failed, not a valid Base64 string
    except Exception:
        return False # Catch any other unexpected errors



class DprAgentState:
    def __init__(self, model, connection_id: str, temp_dir_path: Path):
        self.connection_id = connection_id
        self.temp_dir_path = temp_dir_path
        self.model= model
        self.latex_code_str= ""


        @tool
        def compile_latex(latex_code_str: str) -> dict:
            """
            Compiles the latex into a pdf using the pdflatex binary found in the system, gives the error otherwise

            Args:
                latex_code_str (str): The compilable and correct LaTeX code string to be converted to pdf

            Return:
                dict: A dictionary of form { "status", "message"} where status is 1 or 0 depending on
                    whether it failed or not, and message is a detailed string for reason of failure or just 'success' if it
                    went fine
            """
            return self.compile_latex_core(latex_code_str)

        @tool
        def save_incomplete_latex(latex_code_str: str) -> str:
            """
            Saves the incomplete latex code string to memory for further filling of data

            Args:
                latex_code_str (str): The latest incomplete LaTeX code string to be saved

            Return:
                str: A description message for what happened
            """
            self.latex_code_str = latex_code_str
            return "The latex has been saved for further filling. Now if there are still some more questions you need to ask, you can safely give the questions json as the final answer. compile the pdf otherwise."

        @tool
        def get_current_latex() -> str:
            """
            Retrieves the current version of latex code string in the memory

            Return:
                str: the current latex code string to be further filled answers into
            """
            return self.latex_code_str


        self.agent= ToolCallingAgent(
                # removed tool due to infinite loading error: 
                tools=[FinalAnswerTool(), compile_latex, save_incomplete_latex, get_current_latex,
                        brave_search_tool, 
                       ],
                model=self.model,
                # max_iterations=10
        )


    def compile_latex_core(self, latex_code_string):
        try:
            # curdir= Path.cwd()
            latex_file_path = self.temp_dir_path / "document.tex"
            pdf_file_path = self.temp_dir_path / "document.pdf"

            latex_file_path.write_text(latex_code_string, encoding="utf-8")

            output_path= DPRGenerator.compile_to_pdf(latex_file_path, self.connection_id + ".pdf")


            if Path(output_path).exists():
                return {"status": 0, "message": f"success: compiled at: {output_path}"}
            else:
                return {"status": 1, "message": f"PDF compilation failed but there was no exception raised."}

        except Exception as e:
            return {"status": 1, "message": f"Exception during compilation: {str(e)}"}


    async def dpr_questioner_state(self, questions_to_ask: list[dict]) -> dict:
        """
        Asks the user to provide information for a Dynamic Project Review (DPR) document. The user can respond by directly typing answers to a set of specific questions or by uploading a document (PDF, DOCX, etc.) which the tool will then analyze to extract the required information.

        Args:
            questions_to_ask (list[dict]): A list of dictionaries, where each dictionary defines a question. Each dictionary must contain two keys:
                - 'key' (str): A unique identifier for the question (e.g., 'project_name', 'client_contact_info'). This key is used to map the extracted answer.
                - 'question' (str): The full text of the question to be presented to the user.

        Returns:
            dict: A dictionary containing the user's answers. Keys are the 'key' values from the input `questions_to_ask` list, and values are the extracted answers. If the user provides a document, the tool uses an LLM to parse the content and extract answers. If there's an error in file processing or JSON decoding, it may include a key like 'file_processing_error' or 'user_text_response' to return the raw content or error message."""

        answered_questions = {}

        questions_jsonstr= json.dumps(questions_to_ask)
        response = await manager.get_user_input(self.connection_id, questions_jsonstr)

        if "error" in response:
            return {"error": response["error"]}

        # Case: user uploaded a file instead of entering answers
        if ("data" in response and
            "extra_documents" in response['data'] and
            isinstance(response['data']['extra_documents'], list) and 
            len(response['data']['extra_documents']) > 0):
            # response.data.extra_documents: [{filename: string size: number}]
            # in the database, the files exist in arrayfield dpr_documents[] like [{title: "the filename", s3_url, s3_key}]

            apps= get_collection(Collection.APPLICATIONS)
            _, user_id, scheme_id= self.connection_id.split('-')
            user_id= ObjectId(user_id)
            scheme_id= ObjectId(scheme_id)
            dprdocs_cursor= apps.find_one({"user_id": user_id, "scheme_id": scheme_id, "application_status": 1}, {"_id": 1, "dpr_documents": 1},
                                    sort=[("createdOn", pymongo.DESCENDING)]
                                   )
            if dprdocs_cursor and 'dpr_documents' in dprdocs_cursor:
                dprdocs = dprdocs_cursor['dpr_documents']
                markdown_content_all = ""
                
                s3_config_coll = get_collection(Collection.GLOBAL_SETTINGS)
                s3_config = s3_config_coll.find_one({"lkCode": "S3_CONFIGURATIONS"})
                
                if not s3_config:
                    return {"error": "S3 configuration not found in database."}

                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=s3_config['key2'],
                    aws_secret_access_key=s3_config['key3'],
                    region_name=s3_config['key4']
                )
                bucket_name = s3_config['key1']

                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_dir_path = Path(temp_dir)
                    for dprdoc in dprdocs:
                        print("found dpr doc while getting question" , dprdoc)
                        s3_key = dprdoc.get("s3_key")
                        if not s3_key:
                            continue
                        
                        try:
                            local_filename = temp_dir_path / Path(s3_key).name
                            s3_client.download_file(bucket_name, s3_key, str(local_filename))

                            converted= pemconv.Convertor(file_bytes= local_filename.read_bytes(), suffix= local_filename.suffix, file_type= get_extension_and_type_from_mime(mimetypes.guess_type(local_filename))[1])
                            print("got output: ", converted.output[:200] + "...")

                            markdown_content_all += f"\n\n--- Document: {dprdoc.get('title', 'Unknown')} ---\n\n" + converted.output

                        except ClientError as e:
                            print(f"Error downloading file from S3: {e}")
                            # Optionally add to an error list to return
                        except Exception as e:
                            print(f"Error processing document {dprdoc.get('title')}: {e}")
                
                if markdown_content_all:
                    answered_questions['user_text_response'] = markdown_content_all
                    


            # DEFUNCT CODE block because now data doesnt have base64, its all coming from s3 now

            # file_name = response["file_name"]
            # file_data = base64.b64decode(response["data"])
            #
            # with tempfile.TemporaryDirectory() as temp_dir:
            #     temp_dir_path = Path(temp_dir)
            #     docfile = temp_dir_path / file_name
            #     docfile.write_bytes(file_data)
            #
            #     text_out_dir = temp_dir_path / "md_out"
            #     text_out_dir.mkdir()
            #
            #     try:
            #         pemconv.Convertor(docfile, text_out_dir)
            #         md_file = text_out_dir / (docfile.stem + ".md")
            #         if md_file.exists():
            #             markdown_content = md_file.read_text()


                        # We dont need to parse it to JSON because its going into an LLM anyway
                        # answered_questions['user_text_response'] = markdown_content
                #     else:
                #
                #         answered_questions['file_processing_error'] = "Markdown conversion failed."
                # except Exception as e:
                #     answered_questions['file_processing_error'] = str(e)

        elif "data" in response:
            # llm_prompt = f"Here is a list of questions:\n{questions_str}\n\nHere is a text from the user with answers:\n{response['data']}\n\nPlease extract the answers for the questions from the text. Respond with a JSON object where keys are the question keys and values are the answers. If an answer is not in the document, omit the key. respond with just the JSON: "
            # llm_response = query_llm(llm_prompt, "gemini-2.5-flash")
            # try:
            #     cleaned_response = pq.remove_bs(llm_response.strip())
            #     extracted_answers = json.loads(cleaned_response)
            #     answered_questions.update(extracted_answers)
            # except json.JSONDecodeError:

            # We dont need to parse it to JSON because its going into an LLM anyway
            print("data was in response, when got from ws client")
            print("response: ", response)
            answered_questions['user_text_response'] = response['data']

        return answered_questions



def serialize_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """
    Manually serializes MongoDB document for API response.
    Converts ObjectId to string and datetime to ISO format string.
    """
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
        elif isinstance(value, dict):
            doc[key] = serialize_doc(value)
        elif isinstance(value, list):
            doc[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, ObjectId):
            doc[key] = str(value)
    return doc


def static_dpr_template() -> str:
    res= ""
    # Assuming static_dpr_template.md is in the same directory or a known path
    template_path = Path(__file__).parent / "static_dpr_template.md"
    if template_path.exists():
        with open(template_path) as f:
            res= f.read()
    return res


def get_extension_and_type_from_mime(mimestr):
    if 'pdf' in mimestr:
        return '.pdf', "pdf"
    elif 'html' in mimestr:
        return '.html', "web"
    elif mimestr in EXCEL_FILE_TYPES_EXTENSION_MAP:
        return EXCEL_FILE_TYPES_EXTENSION_MAP[mimestr], "excel"
    elif 'word' in mimestr:
        return '.docx', "document"
    elif 'text' in mimestr:
        return '.txt', "text"
    else:
        return '.dat', "binary"




async def dpr_latex_prompt(userdoc: dict, schemedoc: dict, connection_id: str, extra_documents: list[UploadFile] | None) -> str:
    already_available_information= ""
    if extra_documents is not None:
        # loop through, get information out of each make md subsection strings for each
        await manager.send_json({"type": "status", "data": "Scanning attached documents..."}, connection_id)
        for i, doc in enumerate(extra_documents):
            
            try:
                filename= doc.filename if doc.filename is not None else "user_dpr_data_doc_" + str(i) + get_extension_and_type_from_mime(doc.content_type)[0]
                already_available_information += "# " + filename + "   \n"
                converted= pemconv.Convertor(file_bytes= doc.file.read(), suffix= '.' + filename.split()[-1], file_type= get_extension_and_type_from_mime(doc.content_type)[1])
                md_content= converted.output
                print("got md: ", md_content[:200] + "...")
                already_available_information += md_content + "\n\n-----\n\n"

            except Exception as e:
                print("While find out the text from provided user documents", str(e))
        await manager.send_json({"type": "status", "data": "Initiating Generation"}, connection_id)

    return (f"""
You are a government scheme application helper agent. Your task is to generate a Detailed Project Report (DPR) in LaTeX format for a user applying for a government scheme.

First, you need to figure out what questions to ask the user to get the necessary information for the DPR.

Here is the user's information:
{json.dumps(serialize_doc(userdoc), indent=2)}

Here are the scheme details:
{json.dumps(serialize_doc(schemedoc), indent=2)}

""" + "Already available Information:\n\n" + (already_available_information if already_available_information != "" else "") + f"""

Here is a markdown template for the DPR structure:
{static_dpr_template()}
 """
# EXPERIMENTAL
 """
use the search tool for some extra help on the information one needs to fill in the DPR for that specific scheme
 """ 
 """

Based on all this information, determine a list of questions with a corresponding key to ask the user:
The questions should be comprehensive enough to fill the DPR.

save the incomplete latex code string (use _PLACEHOLDER_ prefix with the question key as
the value for unknown information for now for later filling) using the save latex tool.
the latex title and description should be modified according to the user and scheme context because it will
be submitted straight to the government


and then,
use the final answer tool to provide your 'questions' response in a JSON format with key: 'questions'. the json should look like so:


    """ + questions_template
    )


async def dpr(user_id: str, scheme_id: str, connection_id: str, extra_documents: list[UploadFile] | None, model_provider: ModelProvider = "gemini", model_id: str = "gemini-2.5-pro"):

    schemescoll= get_collection(Collection.SCHEMES)
    if schemescoll is None:
        await manager.send_json({"type": "error", "data": "Database connection failed"}, connection_id)
        return

    sch = schemescoll.find_one({'_id': ObjectId(scheme_id)})
    if not sch:
        await manager.send_json({"type": "error", "data": "Scheme not found"}, connection_id)
        return

    userdoc = get_user_by_id(user_id) or {}
    userdoc['phone'] = "+911231231238"
    userdoc['password'] = ""

    await manager.send_json({"type": "status", "data": "Generating DPR text ..."}, connection_id)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)

        try:
            model = PlaywrightAgent.initialize_model(model_provider, model_id)

            # this instance is the memory instead of relying on smolagents memory API
            agentstate= DprAgentState(model, connection_id, temp_dir_path)
            print("agentstate: ", agentstate.connection_id)
            agent = agentstate.agent
            prompt = await dpr_latex_prompt(userdoc, sch, connection_id, extra_documents)
            final_answer_content= ""
            final_answer_json= {}

            qa_rounds= how_many_times_to_ask_the_user_for_all_the_answers

            while isinstance(final_answer_json, dict) and qa_rounds > 0:
                await manager.send_json({"type": "status", "data": "Agent is thinking..."}, connection_id)
                agent_response = agent.run(prompt)

                final_answer_content= ''
                # Access the agent's memory steps
                last_step = agent.memory.steps[-1]
                # For ToolCallingAgent, check if last tool call is 'final_answer'
                tool_calls = getattr(getattr(last_step, "model_output_message", None), "tool_calls", None)
                if tool_calls and tool_calls[-1].function.name == "final_answer":
                    final_answer_content= str(agent_response)


                if not final_answer_content:
                    final_answer_content = agent_response if isinstance(agent_response, str) else "Agent did not provide a final answer in the expected format. Unrecoverable Error."

                try:

                    print("reading json (if it is)")
                    final_answer_content_jsononlystr= pq.remove_bs(final_answer_content)
                    final_answer_json= json.loads(final_answer_content_jsononlystr)
                    print("turns out it is")
                    #
                    print("beginning json parse")

                    # s1= """
                    # {"questions": [{"key": "why", "question": "why are we here?"},
                    #                         {"key": "what", "question": "just to suffer?"}]}
                    # """
                    # s1= pq.remove_bs(s1)
                    #
                    # final_answer_json= json.loads(s1)
                    print("got questions json: ", final_answer_json)

                    # step 2: get answers and feed back
                    answers= await agentstate.dpr_questioner_state(final_answer_json['questions'])

                    print("received answers: ", answers)

                    # await manager.send_json({
                    #     "type": "dpr_result",
                    #     "file_name": "DPR.pdf",
                    #     "data": 0
                    # }, connection_id)
                    # return


                    # agent.memory.steps.append(PlanningStep(model_input_messages= [
                    #     ChatMessage(role= MessageRole.USER, content= "Here are the answers from user: \n" + str(answers))
                    #     ], model_output_message = ChatMessage(role= MessageRole.ASSISTANT, content= (
                    #         "I will now continue on to incorporate the given user answers into my latex"
                    #         )
                    #     )
                    #     , plan= "", timing= Timing(start_time= 0, end_time= 1)),
                    # )

                    prompt= (
                            "You are a government scheme document filing agent who works by generating latex code"
                            "continue to generate the more processed form of the current latex string which you can get using the tool."
                            f"consider the answers obtained from user:  \n {answers}\n in your memory and further complete "
                            "the DPR latex by substituting the information into places where _PLACEHOLDER_ text appears. "

                            # TONOTDO: TESTING PROMPT
                            # "The user may enter values which expicitly ask you to generate some random values for that field, "
                            # # "generate some valid sensible values if so.\n\n"
                            # "generate some random, and borderline nonsensical values if so.\n\n"

                            "IF the information still looks not enough (due to more _PLACEHOLDER_ present than answers ) "
                            f"to fill DPR, give the remaining set of questions like this JSON format as final answer: {questions_template} \n "
                            " ----- "
                            "but, if it is enough, make the final complete latex and compile the pdf using compiling tool "
                            "and return just the pdf path returned from compilation tool as the final answer."
                             "You can try the compilation step a maximum of 3 times if it errors out"
                             )
                    qa_rounds -= 1
                except Exception as e:
                    print("exception in next QA round: ", str(e))
                    print("answer was: ", final_answer_content)
                    break


            await manager.send_json({"type": "status", "data": "Agent finished. Processing response..."}, connection_id)


            pdf_path= Path(final_answer_content.strip())
            if not pdf_path.exists():
                raise FileNotFoundError("PDF compilation failed")

            await manager.send_json({"type": "status", "data": "PDF generated successfully. Sending to client..."}, connection_id)

            print("pdf path is: ", pdf_path)

            pdf_bytes = pdf_path.read_bytes()
            print("pdf bytes are: ", pdf_bytes)
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            print("pdf base64 is: ", pdf_base64)


            filename= 'DPR.pdf'
            await manager.send_json({
                "type": "dpr_result",
                "file_name": filename,
                "data": pdf_base64
            }, connection_id)
                            # if agent gives answer
            is_valid= is_valid_base64(pdf_base64)
            if is_valid:
                print("got result from agent: ", pdf_base64[:100] + "...")
                # save the base64 to the user docs, along with document type code for dpr
                user_docs= get_collection(Collection.USER_DOCUMENTS)

                # upload the file to s3
                pdf_binary_data = base64.b64decode(pdf_base64)
                content_type, _ = mimetypes.guess_type(filename)
                if not content_type:
                    content_type = "application/octet-stream"
                myfile= MyUploadFile(filename= filename, content_type= content_type, binary_data= pdf_binary_data)
                url, key= upload_to_s3(myfile, user_id= user_id)

                # let the user decide if the PDF is okay, reject / accept
                # decision can be made by by waiting for a type: user_confirm_response
                # with data: True, if data: False, then dont save
                response = await manager.wait_for_confirmation(connection_id, "user_confirm_response")
                print("got confirmation response: ", response)
                
                save_document = False
                if "data" in response and isinstance(response.get('data'), bool) and response['data']:
                    save_document= True
                    

                if save_document:
                    # TODO: we arent marking which scheme is this dpr for, inside the user_documents collection, 
                    # which could potentially conflict with other dprs, required in other schemes, with the same exact titles

                    await manager.send_json({"type": "status", "data": "Saving DPR document..."}, connection_id)
                    doc_type_code= DPR_DOCUMENT_TYPE_CODE

                    sdcol= get_collection(Collection.SCHEME_DOCUMENTS)
                    relevant_sdocs= sdcol.aggregate(relevance_pipeline(str(scheme_id))).to_list()

                    # we search for the dpr original title inside the relevant scheme docs
                    print("got relevant sdocs during dpr insertion: ", relevant_sdocs)
                    relevant_sdocs_dpr= list(filter(lambda x: x['document_code'] == DPR_DOCUMENT_TYPE_CODE, relevant_sdocs))

                    # taking first element of sdocs because there is only one dpr type in scheme docs, by design
                    # taking first element of the scheme documents name map because there will only ever be
                    #    one dpr document requirement for a scheme
                    original_title= relevant_sdocs_dpr[0]['scheme_document_name_map'][0][str(scheme_id)] if len(relevant_sdocs_dpr) > 0 else "DPR (Detailed Project Report)"

                    # TODO: update the required_documents_status inside the application document as well, or, just 
                    #   update that field on every run of applications/start, even if the application document already exits

                    userdoc_tbi = {
                        "status": 1,
                        "user_id": ObjectId(user_id),
                        "title": original_title,
                        "document_type_code": doc_type_code,
                        "filename": "ai_generated_dpr_" + myfile.filename,
                        "s3_url": url,
                        "s3_key": key,
                        "createdOn": datetime.now(timezone.utc),  
                        "createdBy": ObjectId(user_id),                    
                        "lastModifiedOn": datetime.now(timezone.utc),
                        "lastModifiedBy": ObjectId(user_id), 
                        "verified": True
                    }

                    user_docs.insert_one(userdoc_tbi)
                    await manager.send_json({"type": "status", "data": "DPR document saved successfully."}, connection_id)
                else:
                    await manager.send_json({"type": "status", "data": "DPR document not saved as per user request."}, connection_id)


        except Exception as e:
            error_message = f"Error generating DPR: {e}"
            print(error_message)
            await manager.send_json({"type": "error", "data": error_message}, connection_id)
