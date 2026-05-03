from os import getenv
import base64
import mimetypes
from google import genai
from openai import OpenAI
from huggingface_hub import InferenceClient
from pathlib import Path
from os.path import exists

def query_llm(prompt: str, model_name: str, attachment_paths: list[str] | list[Path] | None = None):
    """
    Query various LLM providers with support for file attachments.

    Args:
        prompt (str): The text prompt to send to the model
        model_name (str): The name of the model to use
        attachment_paths (List[str], List[Path], optional): List of file paths to attach

    Returns:
        str: The model's response

    Raises:
        Exception: If there's an error querying the LLM
    """
    try:
        if 'gemini' in model_name.lower():
            return _query_gemini(prompt, model_name, attachment_paths)
        elif 'gpt' in model_name.lower():
            return _query_openai(prompt, model_name, attachment_paths)
        else:
            return _query_huggingface(prompt, model_name, attachment_paths)

    except Exception as e:
        raise Exception(f"Error while querying llm: {e}")

def _query_gemini(prompt: str, model_name: str, attachment_paths: list[str] | list[Path] | None = None):
    """Handle Gemini API requests with file attachments."""
    client = genai.Client(api_key=getenv('GEMINI_API_KEY', ''))

    if attachment_paths:
        # Upload files to Gemini Files API
        uploaded_files = []
        contents = [prompt]  # Start with the text prompt

        for file_path in attachment_paths:
            if not exists(file_path):
                raise Exception(f"File not found: {file_path}")

            if isinstance(file_path, Path):
                file_path= str(file_path.resolve())

            # Upload file using Files API
            uploaded_file = client.files.upload(file=file_path)
            uploaded_files.append(uploaded_file)
            contents.append(uploaded_file)

        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
            )
            return response.text
        finally:
            # Clean up uploaded files
            for uploaded_file in uploaded_files:
                try:
                    client.files.delete(name=uploaded_file.name)
                except Exception:
                    pass  # Ignore cleanup errors
    else:
        # No attachments, simple text query
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        return response.text

def _query_openai(prompt: str, model_name: str, attachment_paths: list[str] | list[Path] | None = None):
    """Handle OpenAI API requests with file attachments."""
    client = OpenAI(api_key=getenv('OPENAI_API_KEY', ''))

    if attachment_paths:
        # Build message content with attachments
        content = [{"type": "text", "text": prompt}]

        for file_path in attachment_paths:
            if not exists(file_path):
                raise Exception(f"File not found: {file_path}")


            if isinstance(file_path, Path):
                file_path= str(file_path.resolve())

            mime_type, _ = mimetypes.guess_type(file_path)

            if mime_type and mime_type.startswith('image/'):
                # Handle images using vision capabilities
                with open(file_path, "rb") as image_file:
                    base64_image = base64.b64encode(image_file.read()).decode('utf-8')

                content.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}"
                    }
                })
            else:
                # For non-image files, read as text if possible
                try:
                    with open(file_path, 'r', encoding='utf-8') as file:
                        file_content = file.read()
                        content[0]["text"] += f"\n\n--- Content of {Path(file_path).name} ---\n{file_content}\n--- End of file ---"
                except UnicodeDecodeError:
                    # If file can't be read as text, skip with warning
                    content[0]["text"] += f"\n\n[Note: Could not read binary file {Path(file_path).name} as text]"

        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": content}
            ]
        )
        return completion.choices[0].message.content
    else:
        # No attachments, simple text query
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return completion.choices[0].message.content

def _query_huggingface(prompt: str, model_name: str, attachment_paths: list[str] | list[Path] | None = None):
    """Handle Hugging Face API requests with file attachments using proper multimodal support."""
    HF_TOKEN = getenv('HF_TOKEN', '')
    inference_client = InferenceClient(
        model=model_name,
        token=HF_TOKEN
    )

    if attachment_paths:
        # Check if this is a vision/multimodal model by trying chat completion first
        try:
            # Build message content for chat completion (supports multimodal)
            content = [{"type": "text", "text": prompt}]

            for file_path in attachment_paths:
                if not exists(file_path):
                    raise Exception(f"File not found: {file_path}")

                if isinstance(file_path, Path):
                    file_path= str(file_path.resolve())

                mime_type, _ = mimetypes.guess_type(file_path)

                if mime_type and mime_type.startswith('image/'):
                    # Convert image to base64 for HF chat completion
                    with open(file_path, "rb") as image_file:
                        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

                    content.append({
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    })
                else:
                    # For non-image files, append as text
                    try:
                        with open(file_path, 'r', encoding='utf-8') as file:
                            file_content = file.read()
                            content[0]["text"] += f"\n\n--- Content of {Path(file_path).name} ---\n{file_content}\n--- End of file ---"
                    except UnicodeDecodeError:
                        content[0]["text"] += f"\n\n[Note: Could not read binary file {Path(file_path).name} as text]"

            # Try chat completion with multimodal content
            completion = inference_client.chat_completion(
                messages=[
                    {"role": "user", "content": content}
                ]
            )
            return completion.choices[0].message.content

        except Exception as chat_error:
            # If chat completion fails, fall back to specific task methods or text-only
            return _fallback_huggingface_with_files(inference_client, prompt, attachment_paths, str(chat_error))
    else:
        # No attachments, use chat completion for consistency
        try:
            completion = inference_client.chat_completion(
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return completion.choices[0].message.content
        except Exception:
            # Fallback to text generation if chat completion is not supported
            try:
                response = inference_client.text_generation(prompt, max_new_tokens=512)
                return response
            except Exception as e:
                raise Exception(f"Failed to get response from Hugging Face model: {e}")

def _fallback_huggingface_with_files(inference_client, prompt: str, attachment_paths: list[str], chat_error: str):
    """Fallback method for HF models that don't support chat completion."""

    # Try specific task methods for single files
    if len(attachment_paths) == 1:
        file_path = attachment_paths[0]
        mime_type, _ = mimetypes.guess_type(file_path)

        try:
            if mime_type and mime_type.startswith('image/'):
                # Try image-to-text for image analysis
                try:
                    result = inference_client.image_to_text(file_path)
                    combined_response = f"Image analysis: {result.generated_text}\n\nUser query: {prompt}\n\nBased on the image analysis above, here's my response:"
                    # Generate response based on the analysis
                    text_response = inference_client.text_generation(combined_response, max_new_tokens=512)
                    return text_response
                except Exception:
                    # Try image classification as backup
                    try:
                        classifications = inference_client.image_classification(file_path)
                        class_text = ", ".join([f"{c.label} ({c.score:.2f})" for c in classifications[:3]])
                        combined_prompt = f"The image shows: {class_text}. {prompt}"
                        return inference_client.text_generation(combined_prompt, max_new_tokens=512)
                    except Exception:
                        pass
        except Exception:
            pass

    # Final fallback: append file contents as text
    enhanced_prompt = prompt
    for file_path in attachment_paths:
        if not exists(file_path):
            continue

        mime_type, _ = mimetypes.guess_type(file_path)

        if mime_type and mime_type.startswith('image/'):
            enhanced_prompt += f"\n\n[Note: Image file {Path(file_path).name} was provided but the model doesn't support vision capabilities]"
        else:
            # Try to read text files
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    file_content = file.read()
                    enhanced_prompt += f"\n\n--- Content of {Path(file_path).name} ---\n{file_content}\n--- End of file ---"
            except UnicodeDecodeError:
                enhanced_prompt += f"\n\n[Note: Could not read binary file {Path(file_path).name} as text]"

    try:
        return inference_client.text_generation(enhanced_prompt, max_new_tokens=512)
    except Exception as e:
        raise Exception(f"All Hugging Face methods failed. Chat error: {chat_error}. Final error: {e}")
