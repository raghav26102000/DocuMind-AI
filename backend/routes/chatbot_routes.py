import os
import asyncio
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from models.models import ChatRequest, ChatResponse
import pembot.query as pq
from database.database import get_db
from .mongodb_tools import get_schemes_info, get_scheme_by_slug, get_references_by_slug
import smtplib
from email.message import EmailMessage
from datetime import datetime
from smolagents import tool

load_dotenv()

router = APIRouter()
MONGO_URI = os.getenv("MONGO_URI")
HF_TOKEN = os.getenv("HF_TOKEN")
SUPPORT_EMAIL= os.getenv('SUPPORT_EMAIL')
smtp_uri= os.getenv('SMTP_SERVER', '')
CHAT_TAG= "chatbot response"

if not MONGO_URI or not HF_TOKEN:
    raise RuntimeError("Please set MONGO_URI and HF_TOKEN in .env")

db = get_db()

s= smtplib.SMTP(smtp_uri)

user= None

@tool
def email_grievance(message: str) -> int:
    """
    Send an email to Saral Seva support team for grievance resolution

    Args:
        message (str): the content to be sent in the email

    Returns:
        int: 0 or 1 for success or failure respectively
    """

    try:
        msg= EmailMessage()
        msg.set_content(message)
        msg['Subject'] = 'Saral Seva Grievance {}'.format(datetime.now().isoformat())
        msg['From'] = 'silverstone965@gmail.com'
        msg['To'] = SUPPORT_EMAIL
        s.send_message(msg)
        return 0
    except:
        return 1



@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.query:
        raise HTTPException(400, "No query provided.")

    resp= None
    resp_chat_id= None
    try:
        if db is None:
            print("db connection not established")
            return JSONResponse( content= {
                    "status": 1,
                    "data": {},
                    "message":  "Database connection not established.",
                    "tag": CHAT_TAG
                },
                status_code= status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        external_tools = [
            get_schemes_info,
            get_scheme_by_slug,
            get_references_by_slug,
            email_grievance
        ]
        
        prompt= """ 
        Context:
            You are a helpful assistant for 'Saral Seva': an Indian Government Schemes Help Portal. You need to get schemes info,
            and get more specific by getting scheme by slug (which is just a code/id for a scheme) and getting references if necessary.
            If the query is about something other than schemes, respond by apologizing and saying that we cant help you with that.
            If the query is in some specific language, give the response in that language only. If the user has a grievance regarding
            the our services, tell them to detail the grievance and when the user responds back, use the email_grievance tool to 
            send it for resolution

        Query:
        {0}
        """.format(req.query)

        # Call pq.smolquery, letting the agent decide which tools to use
        chat_response_dict = await asyncio.to_thread(
            pq.smolquery,
            message=prompt,
            external_tools=external_tools,
            chat_id=req.chat_id if req.chat_id else None,
            allow_web_search= False

        )

        resp = chat_response_dict.get("response", "No response generated.")
        resp_chat_id = chat_response_dict.get("chat_id", "No chat id")
    except Exception as e:
        print(f"Chatbot error during processing: {e}")
        return JSONResponse( content= {
                "status": 1,
                "data": {},
                "message":  f"Chatbot error: {str(e)}",
                "tag": CHAT_TAG
            },
            status_code= status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if not isinstance(resp, str):
        print(f"Unexpected response type from LLM: {type(resp)}. Value: {resp}")
        return JSONResponse( content= {
                "status": 1,
                "data": {},
                "message":  "Chatbot error: LLM response was not a string.",
                "tag": CHAT_TAG
            },
            status_code= status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return JSONResponse(
        content= {
            "status": 0,
            "data": {"response": resp, "chat_id": resp_chat_id},
            "message": "",
            "tag": CHAT_TAG
        },
        status_code= status.HTTP_200_OK
    )
