import os, re, boto3, logging
from botocore.exceptions import ClientError
from huggingface_hub import InferenceClient
import pembot.AnyToText.convertor as pemconv
import base64, json, fitz
from typing import Any
from PIL import Image
from google import genai
from google.genai import types
from google.genai import Client as GoogleClient
from io import BytesIO
import mimetypes
import tempfile
from typing import Optional

# Load environment
from dotenv import load_dotenv
load_dotenv()

# HF OCR model
# HF_OCR_MODEL = "nanonets/Nanonets-OCR-s"
HF_OCR_MODEL = "gemini-2.5-flash"
HF_VLM_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
HF_TOKEN = os.getenv("HF_TOKEN")

# Initialize once
_hf_client = None
logger = logging.getLogger(__name__)

def get_hf_client(model_name):
    global _hf_client
    if _hf_client is None:
        _hf_client = InferenceClient(model=model_name, token=HF_TOKEN)
    return _hf_client

def fetch_s3_bytes(s3_client: Any, bucket: str, key: str) -> bytes:
    """
    Download object from S3 and return its raw bytes.
    """
    try:
        resp = s3_client.get_object(Bucket=bucket, Key=key)
        return resp["Body"].read()
    except ClientError as e:
        raise RuntimeError(f"S3 get_object failed: {e}")


def ocr_extract_text(data: bytes) -> str:
    """
    Run OCR on given bytes (PDF or image) using HF model.
    Returns the concatenated extracted text.
    """
    conv= pemconv.Convertor(None, None, file_bytes= data, file_type= "pdf", suffix= ".pdf", model_name= HF_OCR_MODEL)
    out= conv.output
    if "GPU" in out and "quota" in out:
        print("gpu error")
    # output is a list of { “prediction”: [...], “ocr_text”: “...” }
    # We'll join all ocr_text fields:
    if isinstance(out, list):
        texts = [item.get("ocr_text","") for item in out]
    elif isinstance(out, dict):
        texts = [out.get("ocr_text","")]
    else:
        texts= [out]
    return "\n".join(texts)

# regex for date search (DD/MM/YYYY or DD-MM-YYYY)
_DATE_RE = re.compile(r"(?:dob|जन्म तिथि)[^\d]{0,10}(\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?)", re.IGNORECASE)
DOB_LINE_RE = re.compile(r"dob\s*[:\-]\s*\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?",re.IGNORECASE)

def _contains_any(text: str, tokens: list[str]) -> bool:
    tl = text.lower()
    return any(t.lower() in tl for t in tokens)

def verify_aadhaar(text: str, user_name: str) -> bool:
    """
    Aadhaar checks:
    - government of india OR भारत सरकार
    - a DOB-looking date
    - gender token (male/female/other/transgender)
    - user_name partial match (any token of name longer than 2 chars)
    We don't require exact full-name match.
    """
    tl = text.lower()
    checks = []

    gov_ok = _contains_any(text, ["government of india", "भारत सरकार", "uidai", "unique identification authority of india"])
    checks.append(gov_ok)

    found = _DATE_RE.search(text)
    if found:
        dob_ok = True
    else:
        alt = DOB_LINE_RE.search(text)
        if alt:  # found "DOB : 19/03" (maybe year merged/missing)
            dob_ok = True
        else:
            dob_ok = False
    checks.append(dob_ok)

    gender_ok = any(token in tl for token in ["male", "female", "पुरुष", "स्त्री", "म", "f", "m"])
    checks.append(gender_ok)

    name_ok = False
    if user_name:
        nm_parts = [p.strip().lower() for p in user_name.split() if len(p.strip()) > 2]
        for part in nm_parts:
            if part and part in tl:
                name_ok = True
                break
    else:
        # if we don't have a username, do not fail on this
        name_ok = True
    checks.append(name_ok)

    return all(checks)


PAN_RE = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", re.IGNORECASE)

def verify_pan(text: str) -> bool:
    """
    PAN checks:
    - PAN regex must be found
    - plus at least one cue such as 'income tax', 'permanent account number', 'govt', etc.
    """
    tl = text.lower()
    pan_match = PAN_RE.search(text) is not None

    textual_cues = [
        "income tax department", "income tax", "permanent account number", "permanent account number card",
        "department of incometax", "govt of india", "government of india", "govt. of india"
    ]
    cue_ok = _contains_any(text, textual_cues)

    logger.debug("PAN checks: pan_regex=%s cue=%s", pan_match, cue_ok)

    # require PAN regex and at least one textual cue
    return pan_match and cue_ok


def extract_images_from_pdf(pdf_file_bytes: bytes) -> list[bytes]:
    images: list[bytes] = []
    pdf_document = fitz.open("pdf", pdf_file_bytes)

    for page_number in range(len(pdf_document)):
        page = pdf_document[page_number]
        image_list = page.get_images(full=True)

        for img_index, img in enumerate(image_list):
            print("image index in images list: ", img_index)
            xref = img[0]
            base_image = pdf_document.extract_image(xref)
            image_bytes = base_image["image"]
            # image = Image.open(io.BytesIO(image_bytes))
            images.append(image_bytes)

    return images


def get_file_type(file_bytes):
    if file_bytes.startswith(b'%PDF-'):
        return 'pdf'
    elif file_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'png'
    elif file_bytes.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    elif file_bytes.startswith(b'GIF87a') or file_bytes.startswith(b'GIF89a'):
        return 'gif'
    else:
        return 'unknown'


def verify_signature(file_bytes: bytes, file_extension: str, model_name: str = "gemini-2.5-flash") -> bool:
    
    try:
        # existing behavior: extract images and ask VLM
        if file_extension == "pdf":
            images = extract_images_from_pdf(file_bytes)
            for img in images:
                if verify_signature(img, "png"):
                    return True
            return False

        output_content= ""
        if "gemini" in model_name:
            client= genai.Client(api_key= os.getenv("GEMINI_API_KEY", ''))
            contents: list = [
                "You are a signature checker, check if the given image is signed or not," +
                "just return a JSON like {'signed': boolean, 'description': string}. Now, generate the JSON:"
            ] 
            if file_bytes:
                pil_image = Image.open(BytesIO(file_bytes))
                image_format = pil_image.format or "JPEG"
                dummy_filename = f"dummy.{image_format.lower()}"
                mime_type, _ = mimetypes.guess_type(dummy_filename)
                if mime_type:
                    contents.insert(0, types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
                else:
                    logger.warning("Could not determine MIME type for image.")

                response = client.models.generate_content(model= model_name, contents= contents)
                if response.text is None:
                    raise Exception("Gemini response text reads None")
                output_content= response.text
                logger.info("output content: " + output_content)

        else:
            # image file: call VLM to check signature
            base64_image = base64.b64encode(file_bytes).decode("utf-8")
            base64_url = f"data:image/jpeg;base64,{base64_image}"

            client = get_hf_client(HF_VLM_MODEL)
            completion = client.chat.completions.create(
                model=HF_VLM_MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Does this image contain a handwritten signature? "
                                    "Return JSON only: {'signed': boolean, 'description': string}"
                                )
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": base64_url}
                            }
                        ]
                    }
                ],
            )
            output_content = completion.choices[0].message.content or ""

        # attempt to extract JSON substring
        start = output_content.find("{")
        end = output_content.rfind("}") + 1
        if start == -1 or end == 0:
            logger.warning("VLM response not valid JSON: %s", output_content[:200])
            return False
        payload = json.loads(output_content[start:end])
        signed = bool(payload.get("signed", False))
        logger.debug("Signature check result: %s desc=%s", signed, payload.get("description"))
        return signed
    except Exception as exc:
        logger.exception("verify_signature failed: %s", exc)
        return False

def verify_document_type(
    s3_client: Any,
    s3_config: dict,
    bucket: str,
    key: str, 
    expected_type: str, 
    user_name: str = ""
) -> tuple[bool, Optional[str]]:
    """
    High-level API: fetches from S3, OCRs, and runs the appropriate verifier.
    """
    raw: bytes = fetch_s3_bytes(s3_client, bucket, key)
    file_extension = key.split('.')[-1]
    text = ocr_extract_text(raw)
    text_lc = text.lower()

    logger.debug("OCR text (first 300 chars): %s", text_lc[:300])

    markdown_content = text

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".md", prefix="ocr_")
    try:
        tmp.write(markdown_content.encode("utf-8"))
        tmp.flush()
        markdown_path = tmp.name
        logger.info("Markdown content saved successfully to %s", markdown_path)
    except Exception as e_md_save:
        logger.error("Error saving markdown file: %s", e_md_save)
        markdown_path = None
    finally:
        tmp.close()

    # Verification 
    if expected_type == "aadhaar":
        valid = verify_aadhaar(text, user_name)
        if not valid:
            logger.info("Aadhaar verification failed for key=%s; user_name=%s", key, user_name)
    elif expected_type == "pan":
        valid = verify_pan(text)
        if not valid:
            logger.info("PAN verification failed for key=%s; candidate pan found? %s", key, bool(PAN_RE.search(text)))
    else:
        valid = verify_signature(raw, file_extension, model_name= "gemini-2.5-flash")
        if not valid:
            logger.info("Signature check failed for key=%s; file_ext=%s", key, file_extension)

    return valid, markdown_path

