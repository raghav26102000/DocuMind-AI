from pymongo.results import UpdateResult
import requests
import os
from dotenv import load_dotenv
import boto3
import hashlib
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone, timedelta
import pembot.AnyToText.convertor as pemconv
import pembot.utils.string_tools as stringtools
import pembot.TextEmbedder.mongodb_embedder as pembedder
import pembot.query as pq
from pembot import make_query
from pathlib import Path
import json
from huggingface_hub import InferenceClient
import pickle
import ssl
import urllib3
import mimetypes
import tempfile
import rarfile
from bson import ObjectId
from pymongo import ReturnDocument
from pymongo.operations import UpdateOne
from PIL import Image
from io import BytesIO
import logging
from huggingface_hub.inference._generated.types.chat_completion import ChatCompletionOutputComplete
from openai import OpenAI
from google import genai
import re

from schemerpipe.inference import query_llm
# Assuming models.py contains ApiResponse and ApiData as previously defined
# (including the updated EnglishContent with documents_required: Optional[List[str]])
from schemerpipe.database import get_db, get_s3_client
from schemerpipe.models import required_fields, Collection, ApiResponse, ApiData

import re
from selectolax.parser import HTMLParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# USER_AGENT= "Mozilla/5.0 (iPhone17,5; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FireKeepers/1.7.0"
# USER_AGENT= "Mozilla/5.0 (Linux; Android 14; Pixel 9 Pro Build/AD1A.240418.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.54 Mobile Safari/537.36"
USER_AGENT= "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36"
# USER_AGENT= "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0"

VIDEO_FILE_EXTENSIONS= ['.mp4', '.flv', '.mkv', '.webm', '.gifv', '.3gp']
HF_TOKEN= os.getenv("HF_TOKEN", "")

TIME_TO_EXPIRE_S3_URL= 604800 # 7 days
HOURS_TO_CONSIDER_URL_OLD= 12
SCHEMEDOC_CLASSES= {
        "1": "Aadhaar",
        "2": "PAN",
        "3": "Driving License",
        "4": "BPL Card",
        "5": "Caste Certificate",
        "6": "Electricity Bill",
        "7": "Water Bill",
        "8": "10th Class Marksheet",
        "9": "12th Class Marksheet",
        "10": "Graduation Degree",
        "11": "Bonafide Certificate",
        "12": "Ration Card",
        "13": "Disability Certificate",
        "14": "Income Proof / BPL Card",
        "15": "Voter ID Card",
        "16": "ESI Identity Certificate",
        "17": "Bank Account Details / Cancelled Cheque",
        "18": "Photograph",
        "19": "8th Class Marksheet",
        "20": "School Leaving Certificate",
        "21": "Domicile Certificate",
        "22": "Visa",
        "23": "Passport",
        "24": "Marriage Certificate",
        "25": "Birth Certificate",
        "26": "DPR (Detailed Project Report)",
        "27": "Other"
}

NUMBER_OF_SCHEMEDOC_CLASSES= len(SCHEMEDOC_CLASSES)


load_dotenv()


def serialize_doc(doc: dict[str, any]) -> dict[str, any]:
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



def cleaned_webpage(html_content):
    """Fast text extraction using selectolax"""
    parser = HTMLParser(html_content)

    # Remove unwanted tags
    for tag in parser.css('script, style, meta, link, noscript'):
        tag.decompose()

    # Get clean text
    text = parser.text(deep=True, separator=' ', strip=True)

    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


def convertor(file_content: bytes, file_type: str, file_extension: str, model_name: str | None= None) -> str | None:
    """Converts document content to structured markdown"""
    res= None
    if file_type == 'excel' or file_type == 'pdf':
        conv= pemconv.Convertor(None, None, file_bytes= file_content, file_type= file_type, suffix= file_extension, model_name= model_name)
        res= conv.output
        if "GPU" in res and "quota" in res:
            print("gpu error")
            #raise Exception("gpu error")
    # elif file_type == 'pdf':
    #     res= None
    elif file_type == 'html':
        res= cleaned_webpage(file_content)
    elif file_type == 'rar' or 'rar' in file_extension:
        rar_res= ''
        with tempfile.TemporaryDirectory() as temp_dir:
            with tempfile.NamedTemporaryFile(delete=True) as temp_file:
                temp_file.write(file_content)
                temp_file.flush()

                temp_file_name = temp_file.name
                try:
                    rf= rarfile.RarFile(temp_file_name)
                    rf.extractall(path= temp_dir)
                    for file_name in rf.namelist():
                        extracted_file_path = os.path.join(temp_dir, file_name)
                        if os.path.exists(extracted_file_path):
                            file_extension = os.path.splitext(file_name)[1]

                            with open(extracted_file_path, 'rb') as file:
                                file_content_extracted = file.read()

                            file_type_extracted, _ = mimetypes.guess_type(file_name)
                            if file_type_extracted is None:
                                converted= ""
                            else:
                                converted= convertor(file_content_extracted,
                                                      file_type_extracted,
                                                      file_extension,
                                                      model_name= model_name)
                            if converted is not None:
                                rar_res += '\n\n' + converted
                            else:
                                print("skipped this extracted file: ", file_name, " because its un-extractable")
                    res= rar_res

                except rarfile.BadRarFile as e:
                    print("BAd RAR FILE: ", e)
                    return None

    elif file_type == 'video' or file_extension in VIDEO_FILE_EXTENSIONS:
        res= "![A video describing the scheme](file{})".format(file_extension)
    else:
        res= str(file_content)
    return res


def update_pipe(pipecoll, step, status, user_id, request_id, error_message: str | None= None, processing_queue: bytes | None= None):

    if processing_queue is not None:
            pipecoll.update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {
                    "step": step,
                    "status": status,
                    "error_message": error_message,
                    "processing_queue": processing_queue,
                    "lastModifiedOn": datetime.now(timezone.utc),
                    "lastModifiedBy": ObjectId(user_id),
                }}
            )
            return None
    elif error_message is not None:
            pipecoll.update_one(
                {"_id": ObjectId(request_id)},
                {"$set": {
                    "step": step,
                    "status": status,
                    "error_message": error_message,
                    "lastModifiedOn": datetime.now(timezone.utc),
                    "lastModifiedBy": ObjectId(user_id),
                }}
            )
            return None

    return pipecoll.find_one_and_update(
            filter={"_id": ObjectId(request_id)},
            update={"$set": {
                "step": step,
                "status": status,
                "lastModifiedOn": datetime.now(timezone.utc),
                "lastModifiedBy": ObjectId(user_id),
            }},
            return_document=ReturnDocument.AFTER
        )


def get_structured_dict_from_markdown(slug, title, markdown_text: str) -> dict:
    """Converts markdown to structured JSON"""


    db_client = get_db()
    llm_client= None    # wont use Ollama
    embeddings_collection: str= "scheme_chunks"
    provider= "hf-inference"
    inference_client= InferenceClient(
        provider=provider,
        api_key= HF_TOKEN,
    )
    chunk_size= int(2_50_000 / len(required_fields))
    embedding_model: str= 'BAAI/bge-base-en-v1.5'
    filepath= Path()
    document_id= stringtools.make_it_an_id(slug + '-' + title)

    pembedder.process_document_and_embed(
        db_client,
        llm_client,
        inference_client,
        filepath,
        chunk_size= chunk_size, embedding_model= embedding_model,
        embeddings_collection_name= embeddings_collection,
        use_custom_id= document_id,
        use_custom_input= markdown_text
    )

    print("embedding done...")

    query= make_query(required_fields)
    print("query: ", query)
    required_fields_descriptions= list(map(lambda x: x[1], required_fields))
    model_name: str= "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B"
    llm_provider= "novita"
    index_name: str=  "bge_vectors"

    llm_output= pq.rag_query_llm(db_client, llm_client, inference_client,
        query,
        document_id,
        required_fields_descriptions,
        no_of_fields= len(required_fields),
        llm_provider_name= llm_provider, model_name= model_name, embedding_model= embedding_model,
        embeddings_collection= embeddings_collection, index_name= index_name
    )
    print("llm output: ", llm_output)

    # llm_output= rag_query_llm(query, no_of_fields= len(required_fields))
    jsonstr= pq.remove_bs(llm_output)

    try:
        return json.loads(jsonstr)
    except:
        return {}


def get_from_s3(s3_client, bucket_name, object_key) -> bytes | None:
    """
    Get from S3 if key exists, otherwise return None.

    Args:
        s3_client: boto3 S3 client
        bucket_name: S3 bucket name
        object_key: S3 object key (path)

    Returns:
        str or None: Markdown content if file exists, None otherwise
    """
    try:
        print("tbf: ", object_key)
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        markdown_content = response['Body'].read()
        return markdown_content
    except s3_client.exceptions.NoSuchKey as e:
        # If error code is 404, file doesn't exist
        print("no such key error: ", e)
        return None
    except Exception as e:
        print("unhandled exception while trying cached object in s3:")
        print(e)
        # raise e
        return None


def get_data_from_url(url) -> tuple[bytes, str]:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Upgrade-Insecure-Requests': '1',
    }

    # --- TRYING WITH REQUESTS FIRST ---
    try:
        print(f"Attempting to fetch {url} using requests...")

        # Ensure the URL has a scheme for requests to work correctly
        parsed_url = urlparse(url)
        if not parsed_url.scheme:
            url_with_scheme = "https://" + url # Default to https
            print(f"URL missing scheme, defaulting to {url_with_scheme}")
        else:
            url_with_scheme = url

        # Using verify=False for insecure but "sure shot" retrieval, as per your requirement
        response = requests.get(url_with_scheme, headers=headers, timeout=30, stream=True, verify=False)

        # Check for server errors (5xx) explicitly first, then use raise_for_status for others
        if 500 <= response.status_code < 600:
            print(f"requests received server error: {response.status_code}. Aborting.")
            raise requests.exceptions.HTTPError(f"Server error: {response.status_code} for URL: {url}")

        response.raise_for_status() # This will raise for 4xx and other 5xx errors if not caught above
        print("Got response with requests:", response.status_code)
        content_type = response.headers.get('Content-Type', '').lower()
        return response.content, content_type

    except requests.exceptions.Timeout as e:
        print(f"requests Timeout Error: {e}. Falling back to urllib3.")
        # Fall through to the next try block
    except requests.exceptions.ConnectionError as e:
        print(f"requests Connection Error: {e}. Falling back to urllib3.")
    except requests.exceptions.HTTPError as e:
        # This will catch 4xx and 5xx errors from raise_for_status()
        # If it's a 5xx, we already raised it, so it will propagate.
        # If it's a 4xx, we're treating it as a final error as per previous discussions.
        print(f"requests HTTP Error: {e}. Not falling back for HTTP errors, re-raising.")
        raise # Re-raise immediately if it's an HTTP error (4xx or 5xx)
    except requests.exceptions.RequestException as e:
        print(f"An unknown error occurred with requests: {e}. Falling back to urllib3.")
        # Fall through to the next try block

    # --- FALLBACK TO URLLIB3 ---
    try:
        print(f"Attempting to fetch {url} using urllib3 as a fallback...")

        context = ssl._create_unverified_context()
        context.options |= ssl.OP_LEGACY_SERVER_CONNECT

        timeout = urllib3.Timeout(connect=5.0, read=20.0)

        # retry policy - keep the total retries as 3 for network issues
        retries = urllib3.Retry(total=3, backoff_factor=0.5)

        http = urllib3.PoolManager(ssl_context=context, timeout=timeout)

        response = http.request('GET', url, headers=headers, retries=retries)

        # Check for server errors immediately after getting a response from urllib3
        if 500 <= response.status < 600:
            print(f"urllib3 received server error: {response.status}. Aborting.")
            response.release_conn() # Release the connection back to the pool
            raise requests.exceptions.HTTPError(f"Server error: {response.status} for URL: {url}") # Re-use requests's HTTPError for consistency

        print("Got response with urllib3:", response.status)
        content_type = response.headers.get('Content-Type', '').lower()
        return response.data, content_type

    except urllib3.exceptions.MaxRetryError as e:
        print(f"urllib3 MaxRetryError (possibly timeout/connection issues): {e}. Giving up.")
        raise # Re-raise, as this is the final attempt
    except urllib3.exceptions.NewConnectionError as e:
        print(f"urllib3 NewConnectionError: {e}. Giving up.")
        raise
    except urllib3.exceptions.SSLError as e:
        print(f"urllib3 SSLError: {e}. Giving up.")
        raise
    except Exception as e:
        # Catch any other unexpected urllib3 errors, indicating complete failure
        print(f"An unexpected error occurred with urllib3: {e}. Giving up.")
        raise


def get_extension(file_type, default: str | None= None) -> str:
    if file_type == 'pdf':
        return '.pdf'
    elif file_type == 'html':
        return '.html'
    elif file_type == 'excel':
        return '.xlsx'
    elif file_type == 'word':
        return '.docx'
    elif file_type == 'text':
        return '.txt'
    elif file_type == 'rar':
        return '.rar'
    elif file_type == 'video':
        return '.mp4'
    else:
        # Use original extension if available
        if default:
            return default
    return ''


def get_first_metadata_from_search_result(search_result, s3_client, s3_bucket_name) -> dict[str, str] | None:
    if 'Contents' in search_result and len(search_result['Contents']) > 0:
        first_object_key = search_result['Contents'][0]['Key']
        print(f"Found first object with key: {first_object_key}")

        head_response = s3_client.head_object(
                        Bucket=s3_bucket_name,
                        Key=first_object_key
        )
        metadata = head_response.get('Metadata', {})
        file_type= metadata.get('file_type')

        file_extension= get_extension(file_type)
        content_type= mimetypes.guess_type(f"dummy_filename{file_extension}")[0]
        if not isinstance(content_type, str):
            print("couldnt guess mime type")
            content_type= 'text/plain'

        return {
            'file_type': file_type,
            'file_extension': file_extension,
            'content_type': content_type
        }
    return None


def upload_scheme_references(api_data, s3_bucket_name: str, s3_client=None) -> list[dict[str, str]]:
    """
    Process references from scheme data: fetch documents, upload to S3, convert to structured JSON

    Args:
        api_data: ApiData object containing scheme information
        s3_bucket_name: Name of the S3 bucket to upload documents to
        s3_client: Optional boto3 S3 client (will create one if not provided)

    Returns:
        List of object data {} uploaded to s3 for each reference, to be later aggregated according to each slug
        Output dictionary will be of format:
        { s3_object_key_stem, s3_bucket_name, file_type, file_extension, content_type }
    """
    if not s3_client:
        s3_client = boto3.client('s3')

    references = api_data.en.schemeContent.references
    scheme_slug = api_data.slug
    scheme_id = api_data.id

    to_be_parsed= []

    len_refs= len(references)
    for ref_idx, reference in enumerate(references):

        url = str(reference.url)
        title = reference.title or f"Document_{ref_idx}"
        try:
            print(f"\nProcessing reference: {title} - {url} : {ref_idx}/{len_refs} \n\n")
            # Skip non-HTTP URLs (chrome-extension, file://, etc.)
            if not url.startswith(('http://', 'https://')):
                print(f"Skipping non-HTTP URL: {url}")
                continue


            # Generate S3 object key
            # Format: schemes/{scheme_slug}/references/{ref_index}_{sanitized_title}_{hash}
            url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
            sanitized_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
            sanitized_title = sanitized_title.replace(' ', '_')

            s3_object_key = f"schemes/{url_hash}"
            s3_object_key_stem= s3_object_key

            # Checking if exists
            s3_response = s3_client.list_objects_v2(Bucket=s3_bucket_name, Prefix=s3_object_key_stem)
            if 'Contents' in s3_response:
                print("CACHE HIT")
                metadata= get_first_metadata_from_search_result(s3_response, s3_client, s3_bucket_name)
                if metadata is not None:
                    reference_uploaded_information = {
                        "url": url,
                        "title": title,
                        "s3_object_key_stem": s3_object_key_stem,
                        "s3_bucket_name": s3_bucket_name,
                        "file_type": metadata['file_type'],
                        "file_extension": metadata['file_extension'],
                        "content_type": metadata['content_type']
                    }
                    to_be_parsed.append(reference_uploaded_information)
                else:
                    print("Failed to get the metadata for the Cache hit, cant be processed !!")
                continue


            file_content, content_type= get_data_from_url(url)

            parsed_url = urlparse(url)
            file_extension = os.path.splitext(parsed_url.path)[1].lower()

            # Map content types and extensions to file types
            file_type = 'unknown'
            if 'pdf' in content_type or file_extension == '.pdf':
                file_type = 'pdf'
            elif 'html' in content_type or file_extension in ['.html', '.htm']:
                file_type = 'html'
            elif 'excel' in content_type or 'spreadsheet' in content_type or content_type in pemconv.EXCEL_FILE_TYPES or file_extension in ['.xlsx', '.xls']:
                file_type = 'excel'
            elif 'word' in content_type or file_extension in ['.docx', '.doc']:
                file_type = 'word'
            elif 'text' in content_type or file_extension == '.txt':
                file_type = 'text'
            elif 'rar' in content_type or file_extension == '.rar':
                file_type = 'rar'
            elif 'video' in content_type or file_extension in VIDEO_FILE_EXTENSIONS:
                file_type = 'video'

            print("got file content: ", str(file_content)[:50] + " ... ")


            # THE FINAL OBJECT KEY
            s3_object_key += get_extension(file_type, default= file_extension)



            # Upload to S3
            s3_client.put_object(
                Bucket=s3_bucket_name,
                Key=s3_object_key,
                Body=file_content,
                ContentType=content_type,
                Metadata={
                    'original_url': url,
                    'title': title,
                    'scheme_slug': scheme_slug,
                    'scheme_id': scheme_id,
                    'processed_at': datetime.now(timezone.utc).isoformat(),
                    'file_type': file_type
                }
            )

            reference_uploaded_information = {
                "url": url,
                "title": title,
                "s3_object_key_stem": s3_object_key_stem,
                "s3_bucket_name": s3_bucket_name,
                "file_type": file_type,
                "file_extension": file_extension,
                "content_type": content_type
            }

            to_be_parsed.append(reference_uploaded_information)

            print(f"Uploaded to S3: {s3_object_key}")


        except Exception as s3_error:
            print(f"Failed to upload {url} to S3: {s3_error}")
            continue


    return to_be_parsed


def upload_references_content(user_id: str, request_id: str) -> tuple[str, int, str]:
    """
    Loads requests.processing_queue from the database,
    and uploads the references with content and slug.
    Updates processing_queue pickled state and request status accordingly.
    """

    db = get_db()
    if db is None:
        msg= "Database connection failed in upload_references_content."
        print(msg)
        return request_id, 1, msg

    pipecoll = db[Collection.PIPELINE_REQUESTS]
    refs = db[Collection.REFERENCES]

    # Load current_request ensuring step and status update
    try:
        current_request = update_pipe(pipecoll, step= 4, status= 2, user_id= user_id, request_id= request_id)
        if not current_request:
            raise Exception(f"Request with ID {request_id} not found or update failed.")

        processing_queue: dict[str, list[dict[str, str]]] = pickle.loads(current_request.get("processing_queue", pickle.dumps({})))
        if not processing_queue:
            print("Processing queue is empty.")
            # Mark step complete with empty processing_queue cleared
            update_pipe(pipecoll, step= 5, status= 0, user_id= user_id, request_id= current_request["_id"], error_message= "", processing_queue= pickle.dumps({}))
            return request_id, 0, ""

        processing_queue_items = list(processing_queue.items())
        len_queue = len(processing_queue_items)

        s3_client, S3_BUCKET, S3_REGION = get_s3_client()

        i = 0
        for scheme_id, references_data_list in processing_queue_items:
            print("\nScheme", i + 1, " / ", len_queue, " being processed\n")
            for ref_dict in references_data_list:
                url = ref_dict['url']
                title = ref_dict['title']
                s3_object_key_stem = ref_dict['s3_object_key_stem']
                ref_already = refs.find_one({'object_key': s3_object_key_stem})

                filter_query = {"object_key": s3_object_key_stem}
                update_payload: dict[str, dict[str, str] | str | list] = {
                    "$addToSet": {
                        "schemes": ObjectId(scheme_id)
                    },
                    "$set": {},
                    "$setOnInsert": {}
                }

                if ref_already and ref_already.get('content') and ref_already.get('content').strip() != '':
                    print("already processed the resource:")
                    print(ref_already['content'][:50] + " ... ")

                    if not update_payload["$set"]:
                        del update_payload["$set"]
                        del update_payload["$setOnInsert"]

                else:
                    file_extension = get_extension(ref_dict['file_type'], default=ref_dict['file_extension'])
                    print("file extension: ", file_extension)
                    file_content: bytes | None = get_from_s3(
                        s3_client,
                        S3_BUCKET,
                        s3_object_key_stem + file_extension
                    )
                    if file_content is None:
                        print("file not found while looking in s3, from processing queue, onto the next..")
                        continue
                    # model_name = "Nanonets-OCR-s"
                    model_name = "gemini-2.5-flash"
                    content = convertor(file_content, ref_dict['file_type'], file_extension, model_name=model_name)
                    if isinstance(content, str):
                        update_payload['$set']['content'] = content
                        update_payload['$set']['lastModifiedOn'] = datetime.now(timezone.utc)
                        update_payload['$set']['lastModifiedBy'] = ObjectId(user_id)
                        update_payload['$set']['status'] = 1
                        update_payload['$setOnInsert']['createdOn'] = datetime.now(timezone.utc)
                        update_payload['$setOnInsert']['createdBy'] = ObjectId(user_id)
                    else:
                        print("ERROR: skipping content update")
                        if not update_payload["$set"]:
                            del update_payload["$set"]

                if "$set" in update_payload and not update_payload["$set"]:
                    del update_payload["$set"]
                    del update_payload["$setOnInsert"]

                if not update_payload:
                    print(f"No update operations for {s3_object_key_stem}. Skipping.")
                    continue

                result = refs.update_one(
                    filter_query,
                    update_payload,
                    upsert=True
                )
                print("upserted id: ", result.upserted_id)
                print("modified count: ", result.modified_count)
            i += 1

            # Update processing_queue to remove processed scheme_id after inner loop
            # Remove scheme_id from queue
            processing_queue.pop(scheme_id, None)
            # Persist updated processing queue in database after each scheme processed
            update_pipe(pipecoll, step= 5, status= 2, user_id= user_id, request_id= current_request["_id"], processing_queue= pickle.dumps(processing_queue), error_message= "Processing")

        # All done: mark step complete
        update_pipe(pipecoll, step= 5, status= 0, user_id= user_id, request_id= current_request["_id"], processing_queue= pickle.dumps({}), error_message= "")
        return request_id, 0, ""

    except Exception as e:
        print(f"Error in upload_references_content for request {request_id}: {e}")
        update_pipe(pipecoll, step= 5, status= 1, user_id= user_id, request_id= request_id, error_message= str(e))

        return request_id, 1, str(e)


def extract_text_from_node(node: dict) -> list[str]:
    """
    Recursively extracts text from a rich text node and its children.
    This function can be generalized further if nesting patterns are more complex.
    For this specific API response, it handles 'text', 'list_item', 'paragraph', 'block_quote'
    by looking for the 'text' key at the deepest level expected.
    """
    texts = []

    # If the node itself has a 'text' key (like in a basic text node)
    if 'text' in node and isinstance(node['text'], str):
        # We also need to check for empty strings, as paragraph types sometimes have ""
        if node['text'].strip(): # Add text only if it's not empty or just whitespace
            texts.append(node['text'])

    # If the node has 'children', recurse into them
    if 'children' in node and isinstance(node['children'], list):
        for child in node['children']:
            texts.extend(extract_text_from_node(child)) # Use extend to flatten the list of lists

    return texts

def get_documents_required(id: str) -> tuple[list[str] | None, str | None]:
    """
    Gets the documents required for a given scheme ID,
    extracting text into a simple list of strings from the rich text,
    and also returns the markdown string. This version handles mixed content types
    in the 'documents_required' array.
    """
    doc_url = f"https://api.myscheme.gov.in/schemes/v5/public/schemes/{id}/documents"

    documents_list_of_strings = None
    documents_md_string = None

    try:
        user_agent= USER_AGENT
        res = requests.get(doc_url, headers={'Accept': 'application/json, text/plain, */*', 'x-api-key': os.getenv('SCHEMER_API_KEY'), 'User-Agent': user_agent, 'Origin': 'https://www.myscheme.gov.in', 'Host': 'api.myscheme.gov.in'})
        res.raise_for_status()
        resj = res.json()

        if 'data' in resj and isinstance(resj['data'], dict) and \
           'en' in resj['data'] and isinstance(resj['data']['en'], dict):
            en_data = resj['data']['en']

            documents_md_string = en_data.get('documentsRequired_md')
            raw_documents_rich_text = en_data.get('documents_required')

            extracted_items = []
            if raw_documents_rich_text and isinstance(raw_documents_rich_text, list):
                for top_level_node in raw_documents_rich_text:
                    # Use the helper function to extract text from each top-level node
                    extracted_items.extend(extract_text_from_node(top_level_node))

                # Filter out any potential empty strings if extract_text_from_node didn't already
                extracted_items = [item for item in extracted_items if item.strip()]

            if extracted_items:
                documents_list_of_strings = extracted_items

    except requests.exceptions.HTTPError as errh:
        print(f"HTTP Error in get_documents_required: {errh}")
    except requests.exceptions.ConnectionError as errc:
        print(f"Error Connecting in get_documents_required: {errc}")
    except requests.exceptions.Timeout as errt:
        print(f"Timeout Error in get_documents_required: {errt}")
    except requests.exceptions.TooManyRedirects as errr:
        print(f"Too Many Redirects in get_documents_required: {errr}")
    except requests.exceptions.RequestException as err:
        print(f"An unknown error occurred in get_documents_required: {err}")
    except json.JSONDecodeError as je:
        print("json decode error in get_documents_required, the resource seems to be tweaking", je)
    except Exception as e:
        print(f"Exception while getting / parsing documents: {e}")

    return documents_list_of_strings, documents_md_string


# The getApiDataFromSlug and main execution block remain the same
# as they call get_documents_required and assign its output.

def getApiDataFromSlug(slug: str = "inspire-ff") -> ApiData | None:
    doc_url = "https://api.myscheme.gov.in/schemes/v5/public/schemes?slug={}&lang=en".format(slug)
    fin = None
    try:
        user_agent= USER_AGENT
        res = requests.get(doc_url, headers={'Accept': 'application/json, text/plain, */*', 'x-api-key': os.getenv('SCHEMER_API_KEY'), 'User-Agent': user_agent, 'Origin': 'https://www.myscheme.gov.in', 'Host': 'api.myscheme.gov.in'})
        res.raise_for_status()
        resj = res.json()

        api_response = ApiResponse(**resj)
        api_data = api_response.data

        docs_list, docs_md = get_documents_required(api_data.id)

        api_data.en.documents_required = docs_list
        api_data.en.documentsRequired_md = docs_md

        fin = api_data
    except requests.exceptions.HTTPError as errh:
        print(f"HTTP Error: {errh}")
    except requests.exceptions.ConnectionError as errc:
        print(f"Error Connecting: {errc}")
    except requests.exceptions.Timeout as errt:
        print(f"Timeout Error: {errt}")
    except requests.exceptions.TooManyRedirects as errr:
        print(f"Too Many Redirects: {errr}")
    except requests.exceptions.RequestException as err:
        print(f"An unknown error occurred: {err}")
    except json.JSONDecodeError as je:
        print("json decode error, the resource seems to be tweaking", je)
    except Exception as e:
        print(f"Exception while getting / parsing: {e}")

    return fin






# Configure logging

def revalidate(scheme_id: str, bucket: str, s3_client) -> str | None:

    filename = f"scheme-images/{scheme_id}.png"
    
    # Check if image already exists in S3 using list_objects_v2
    response = s3_client.list_objects_v2(
        Bucket=bucket,
        Prefix=filename,
        MaxKeys=1
    )
    
    # If Contents exists and has at least one item, the object exists
    if 'Contents' in response and len(response['Contents']) > 0:
        # Check if the exact key matches (not just prefix)
        if response['Contents'][0]['Key'] == filename:
            # Image exists, generate and return new presigned URL
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': filename},
                ExpiresIn=TIME_TO_EXPIRE_S3_URL
            )
            return presigned_url
    return None


def update_scheme_image_urls(user_id: str, request_id: str) -> tuple[str, int, str]:
    """
    Updates scheme image URLs by validating existing URLs and generating new images if needed.

    Args:
        user_id: The user ID to process schemes for
        request_id: The request ID for tracking

    Returns:
        Tuple of (request_id, status_code, message)
    """
    try:
        # Get database instance and schemes
        db = get_db()
        if db is None:
            return request_id, 1, "db initialization error"


        pipecoll = db[Collection.PIPELINE_REQUESTS]

        # Load current_request ensuring step and status update
        current_request = update_pipe(pipecoll= pipecoll, step= 6, status= 2, user_id= user_id, request_id= request_id)

        # Initialize clients using your existing functions
        s3_client, S3_BUCKET, S3_REGION = get_s3_client()
        hf_client: InferenceClient = InferenceClient(
            provider="fal-ai",
            api_key=HF_TOKEN
        )

        schemescoll= db[Collection.SCHEMES]

        schemes = schemescoll.find({"status": 1}).to_list()

        updated_count = 0

        for i, scheme in enumerate(schemes):
            try:
                # Check if scheme has schemeContent and schemeImageUrl
                if 'schemeContent' not in scheme or 'schemeImageUrl' not in scheme['schemeContent']:
                    err= f"Scheme {i}: {scheme['_id']} missing required attributes"
                    logger.warning(err)
                    if request_id:
                        update_pipe(pipecoll= pipecoll, step= 6, status= 1, user_id= user_id, request_id= request_id, error_message= err)
                    return request_id, 1, err

                current_url = scheme['schemeContent']['schemeImageUrl']

                # Skip if URL is empty or None
                if not current_url:
                    logger.info(f"Scheme {i}: {scheme['_id']} has no image URL, generating new image")
                    new_url = generate_and_upload_image(scheme, s3_client, hf_client, S3_BUCKET, S3_REGION)
                    if new_url:
                        # Update the scheme document in database
                        schemescoll.update_one(
                            {"_id": scheme["_id"]},
                            {"$set": {"schemeContent.schemeImageUrl": new_url}}
                        )
                        updated_count += 1
                    continue


                # Validate existing URL
                validity= is_valid_image_url(current_url, S3_BUCKET)
                new_url= None

                if validity == 0:
                    logger.info(f"Scheme {i}: {scheme['_id']} image URL is valid: {current_url}")
                    continue
                elif validity == 2:
                    logger.info(f"Scheme {i}: {scheme['_id']} has an S3 URL, checking validity and refreshing if >12 hr older")
                    parsed_url = urlparse(current_url)
                    query_params = parse_qs(parsed_url.query)

                    # Extract values
                    amz_date_str = query_params.get('X-Amz-Date', [None])[0]
                    expires_seconds_str = query_params.get('X-Amz-Expires', [None])[0]
                    if not amz_date_str or not expires_seconds_str:
                        logger.info("Missing required URL parameters (X-Amz-Date or X-Amz-Expires).")
                        continue
                    amz_date = datetime.strptime(amz_date_str, '%Y%m%dT%H%M%SZ').replace(tzinfo=timezone.utc)

                    current_time = datetime.now(timezone.utc)

                    # Calculate the difference between now and the signing time
                    time_difference = current_time - amz_date

                    # Check if the time difference is less than 12 hours
                    is_less_than_12_hours = time_difference < timedelta(hours=HOURS_TO_CONSIDER_URL_OLD)


                    # if old, make new link
                    if not is_less_than_12_hours:
                        logger.info(f"Scheme {i}: {scheme['_id']} is quite old, refreshing... ")
                        new_url= revalidate(scheme['_id'], S3_BUCKET, s3_client)
                    else:
                        logger.info(f"Scheme {i}: {scheme['_id']} is AOK!")
                        continue
                else:
                    # URL is invalid, generate new image
                    logger.info(f"Scheme {i}: {scheme['_id']} has invalid image URL, generating replacement")
                    new_url = generate_and_upload_image(scheme, s3_client, hf_client, S3_BUCKET, S3_REGION)

                if new_url:
                    # Update the scheme document in database
                    res: UpdateResult= schemescoll.update_one(
                        {"_id": scheme["_id"]},
                        {"$set": {"schemeContent.schemeImageUrl": new_url}}
                    )
                    print("update one modified: ", res.modified_count)
                    updated_count += 1
                    logger.info(f"Updated scheme {i}: {scheme['_id']} with new image URL: {new_url}")
                else:
                    logger.error(f"Failed to generate new/refreshed image for scheme {i}")

            except Exception as e:
                logger.error(f"Error processing scheme {i}: {str(e)}")
                continue

        message = f"Successfully updated {updated_count} scheme images"
        logger.info(message)
        if request_id:
            update_pipe(pipecoll= pipecoll, step= 6, status= 0, user_id= user_id, request_id= request_id, error_message= "")
        return request_id, 0, message

    except Exception as e:
        error_msg = f"Error updating scheme images: {str(e)}"
        logger.error(error_msg)
        return request_id, 1, error_msg


def is_valid_image_url(url: str, S3_BUCKET: str, timeout: int = 10) -> int:
    """
    Check if URL is valid and points to a valid image.

    Args:
        url: The URL to validate
        timeout: Request timeout in seconds

    Returns:
        bool: True if URL is valid and image is valid
    """
    try:

        print("s3 bucket being checked: ", S3_BUCKET)
        if url.startswith(f"https://{S3_BUCKET}.s3.amazonaws.com"):
            return 2

        # Download the image
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()

        # Check if content type suggests an image
        content_type = response.headers.get('content-type', '').lower()
        if not content_type.startswith('image/'):
            logger.warning(f"URL does not return image content type: {content_type}")
            return 1

        # Try to open and verify the image
        image_data = BytesIO(response.content)
        with Image.open(image_data) as img:
            # Verify image by checking its size and format
            if img.size[0] > 0 and img.size[1] > 0 and img.format:
                return 0

    except requests.RequestException as e:
        logger.warning(f"Network error accessing URL {url}: {str(e)}")
    except Image.UnidentifiedImageError:
        logger.warning(f"Invalid image format at URL {url}")
    except Exception as e:
        logger.warning(f"Unexpected error validating URL {url}: {str(e)}")

    return 1



def generate_and_upload_image(scheme, s3_client, hf_client: InferenceClient, bucket: str, region: str) -> str | None:
    """
    Generate a new image using Hugging Face inference and upload to S3.
    If image already exists for this scheme, refresh and return the existing URL.
    Args:
        scheme: The scheme object to generate an image for
        s3_client: Configured S3 client
        hf_client: Configured Hugging Face client
        bucket: S3 bucket name
        region: S3 region
    Returns:
        str: Public URL of uploaded image, or None if failed
    """
    try:
        # Use scheme["_id"] to create consistent filename
        scheme_id = scheme["_id"]
        filename = f"scheme-images/{scheme_id}.png"
        
        # Check if image already exists in S3 using list_objects_v2
        response = s3_client.list_objects_v2(
            Bucket=bucket,
            Prefix=filename,
            MaxKeys=1
        )
        
        # If Contents exists and has at least one item, the object exists
        if 'Contents' in response and len(response['Contents']) > 0:
            # Check if the exact key matches (not just prefix)
            if response['Contents'][0]['Key'] == filename:
                # Image exists, generate and return new presigned URL
                presigned_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket, 'Key': filename},
                    ExpiresIn=TIME_TO_EXPIRE_S3_URL  # URL valid for 7 days
                )
                print(f"Image already exists for scheme {scheme_id}, returning refreshed URL: {presigned_url}")
                return presigned_url
        
        # Generate prompt based on scheme content
        prompt = generate_image_prompt(scheme)
        # Generate image using Hugging Face
        image = hf_client.text_to_image(
            prompt,
            model="black-forest-labs/FLUX.1-Krea-dev"
        )

        # for testing, we make from numpy
        # array = np.array([
        #     [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 0, 0]],
        #     [[0, 0, 0], [255, 255, 255], [128, 128, 128], [255, 0, 255], [0, 255, 255]],
        #     [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 0, 0]],
        #     [[0, 0, 0], [255, 255, 255], [128, 128, 128], [255, 0, 255], [0, 255, 255]],
        #     [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [0, 0, 0]]
        # ], dtype=np.uint8)
        # # Convert the NumPy array to a Pillow image
        # image = Image.fromarray(array)


        # Convert PIL Image to bytes
        buffer = BytesIO()
        image.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        
        # Upload to S3 with consistent filename based on scheme ID
        s3_client.put_object(
            Bucket=bucket,
            Key=filename,
            Body=image_bytes,
            ContentType='image/png',
            #ACL='public-read'
        )
        
        # Generate presigned URL for the new image
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': filename},
            ExpiresIn=TIME_TO_EXPIRE_S3_URL  # URL valid for 7 days
        )
        
        print(f"New image uploaded for scheme {scheme_id}, presigned URL: {presigned_url}")
        return presigned_url
        
    except Exception as e:
        logger.error(f"Error generating and uploading image: {str(e)}")
        return None



def generate_image_prompt(scheme) -> str:
    """
    Generate an appropriate image prompt based on scheme content.

    Args:
        scheme: The scheme document (dict)

    Returns:
        str: Generated prompt for image generation
    """
    try:
        # Try to extract relevant information from the scheme
        scheme_name = scheme.get('schemeName', 'scheme')
        scheme_description = scheme["schemeContent"].get('briefDescription', '')

        # Create a generic but relevant prompt
        if scheme_description:
            prompt = f"Professional illustration for {scheme_name}: {scheme_description[:100]}"
        else:
            prompt = f"Modern, clean professional illustration for {scheme_name}, abstract design"

        # Add style modifiers
        prompt += ", high quality, digital art, clean design, professional"

        return prompt

    except Exception as e:
        logger.warning(f"Error generating prompt: {str(e)}")
        return "Modern abstract professional illustration, clean design, high quality"


def ensure_global_settings(db):
    """Ensure basic_types exists in GLOBAL_SETTINGS collection"""
    global_settings_coll = db[Collection.GLOBAL_SETTINGS]

    # MongoDB requires string keys, so we store with string keys
    basic_types_for_db = SCHEMEDOC_CLASSES

    # For internal use, we keep integer keys
    basic_types_int= {int(k): v for k, v in basic_types_for_db.items()}

    # Check if basic_types already exists
    existing = global_settings_coll.find_one({"basic_types": {"$exists": True}}, {'_id': 1, 'basic_types': 1})

    if not existing or len(existing['basic_types']) != len(basic_types_for_db):
        global_settings_coll.update_one(
            {},
            {"$set": {"basic_types": basic_types_for_db}},
            upsert=True
        )
        print("Basic types inserted into GLOBAL_SETTINGS")

    return basic_types_int



def get_doc_codes_from_llm(documents_required, basic_types, model_name='gemini-2.5-flash'):
    """
    Queries different LLM providers (Gemini, OpenAI, Hugging Face) based on the model name.
    It defaults to Gemini and can be switched by providing a different model_name.
    """
    
    # Create the prompt, which is shared across all providers
    basic_types_str = json.dumps(basic_types, indent=2)
    documents_str = json.dumps(documents_required, indent= 2)
    prompt = f"""
You are a document classification expert. Given a list of document requirements and a mapping of basic document types, return ONLY a JSON array of relevant document type codes.

Basic Document Types:
{basic_types_str}

Document Requirements: {documents_str}

Instructions:
- Match each document requirement to the most appropriate basic document type
- Return ONLY a JSON array of integer codes like [1, 2, 5]
- If a document doesn't clearly match any basic type, use code {NUMBER_OF_SCHEMEDOC_CLASSES} (Other)
- Consider variations in naming (e.g., "aadhar card" = 1, "pan card" = 2, etc.)
- Make sure that the length of the array you return matches the length of the Document Requirements Array, as this is a one-to-one function

Response (JSON array only):"""

    try:
        llm_response_text= query_llm(prompt, model_name= model_name)
        # Common response parsing logic
        # Clean the text of any <think> tags or other conversational clutter
        cleaned_text = re.sub(r"<think>.*?<\/think>", "", llm_response_text, flags=re.DOTALL)
        
        # Extract the JSON array
        json_match = re.search(r'\[[\d,\s]+\]', cleaned_text)
        if json_match:
            codes = json.loads(json_match.group())
            return [int(code) for code in codes if isinstance(code, (int, str)) and str(code).isdigit()]

        print(f"Could not parse JSON response from {model_name}: {llm_response_text}")
        return [NUMBER_OF_SCHEMEDOC_CLASSES] * len(documents_required)

    except Exception as e:
        print(f"API Error for {model_name}: {e}")
        return [NUMBER_OF_SCHEMEDOC_CLASSES] * len(documents_required)


def get_schemedoc_operations_for_scheme(scheme, basic_types, model_name= "gemini-2.5-flash"):
    tbr= []
    if scheme.get("documents_required") is None or not scheme["documents_required"]:
        # print(f"Skipping scheme {scheme['_id']}: No documents_required")
        return None

    db = get_db()
    if db is None:
        return
    scheme_doc_collection= db[Collection.SCHEME_DOCUMENTS]

    # CHECKING IF SCHEME ALREADY PROCESSED EXISTS TO RUN AGAIN AND AGAIN
    count= scheme_doc_collection.count_documents({
      f"scheme_document_name_map.{str(scheme['_id'])}": { "$exists": True }
    })

    if count != 0:
        # print("Documents for this scheme already put there in scheme documents collection!")
        return None

    documents_required = scheme["documents_required"]
    scheme_id = ObjectId(scheme["_id"])

    # Get document codes from LLM
    document_codes= []
    try:
        document_codes = get_doc_codes_from_llm(documents_required, basic_types, model_name= model_name)
        # print("documents_required: ", documents_required)
        # print("got codes from llm: ", document_codes)
    except Exception as e:
        print(f"Error processing scheme {scheme['_id']}: {e}")
        # Fallback to "Other" for all documents, or, to Crash, just return None
        # return None


    # Ensure we have the same number of codes as documents


    if len(document_codes) != len(documents_required):
        print(f"Warning: Code count from LLM for scheme {scheme['_id']} {'is 0' if len(document_codes) == 0 else 'are not matching'}. Retrying...")
        document_codes = get_doc_codes_from_llm(documents_required, basic_types, model_name= model_name)
        print("got codes from llm: ", document_codes)
        if len(document_codes) != len(documents_required):
            print(f"Warning: Code count from LLM for scheme {scheme['_id']} {'is 0' if len(document_codes) == 0 else 'are not matching'}. Retrying...")
            document_codes = get_doc_codes_from_llm(documents_required, basic_types, model_name= model_name)
            print("got codes from llm: ", document_codes)
            if len(document_codes) != len(documents_required):
                print("tried thrice, skipping...")
                return None

    # Process each document with its corresponding code
    for doc_name, doc_code in zip(documents_required, document_codes):
        # Create the scheme-document mapping entry
        scheme_doc_map = {
            str(scheme_id): doc_name
        }

        tbr.append(
            UpdateOne(
                {"document_code": doc_code},
                {
                    "$set": {
                        "lastModifiedOn": datetime.now(timezone.utc),
                        "lastModifiedBy": ObjectId("6880b8918d6ccea849d2857c"),
                        "status": 1
                    },

                    # "$push": {
                    #     "scheme_document_name_map": {
                    #         "$each": [scheme_doc_map],
                    #         #"$slice": -1000  # Keep last 1000 entries to prevent unlimited growth
                    #     }
                    # },
                    "$addToSet": {
                        "scheme_document_name_map": scheme_doc_map
                    },
                    "$setOnInsert": {
                        "createdOn": datetime.now(timezone.utc),
                        "createdBy": ObjectId("6880b8918d6ccea849d2857c"),
                        "document_type_name": basic_types.get(doc_code, "Other")
                    }
                },
                upsert=True
            )
        )
    return tbr


def get_global_setting_code(lk_code, value):
    # find the key code for the given value
    db= get_db()
    if db is None:
        raise Exception("no db")
    gsets= db[Collection.GLOBAL_SETTINGS]
    gset= gsets.find_one({'lkCode': lk_code, 'key2': value})
    if gset is None:
        raise Exception('no such global setting')

    if gset['key1']:
        return gset['key1']
    else:
        raise Exception('global setting with the given value is there but key1 doesnt exist')


def get_eligibility_gender(scheme_eligibility_text: str) -> int:
    code_str= query_llm("""
    Context:
    Here is some description about aligibility of a certain government scheme in India:
    {0}

    Question:
    Is there a gender criteria mentioned in it? Return a JSON like {'gender': 'Male'} where the gender key can have the values
    'Male' for male, 'Female' for female, 'Transgender' for transgender, 'All' if its eligible to all or no such criteria is mentioned. 
    Answer should have just the JSON.

    JSON:
    """.format(scheme_eligibility_text), model_name= "gemini-2.5-flash")

    if code_str is None:
        raise Exception("llm returned None during getting gender eligibility")

    code_str= pq.remove_bs(code_str)
    code= json.loads(code_str)

    return get_global_setting_code("GENDER", code['gender'])




clean= lambda x: ' '.join(x.split()).strip().lower()
if __name__ == "__main__":
    # Example usage for testing
    # data = getApiDataFromSlug()
    # data = getApiDataFromSlug("nccsis")
    # if data:
    #     print(f"Fetched slug: {data.slug}")
    #     print(f"Scheme Name (EN): {data.en.basicDetails.schemeName}")
    #     print(f"Documents Required (list of strings): {data.en.documents_required}")
    #     # print(f"Documents Required (Markdown): {data.en.documentsRequired_md}")
    # else:
    #     print("Failed to fetch data.")
    print("hemlow myscheme utils")
