"""
Playwright agent for automating web tasks with advanced tools and capabilities.
Built using the smolagents library with comprehensive browser automation features.
"""
import json
import logging
import time
from typing import Any, Dict, List, Literal, Optional
from io import BytesIO
from PIL import Image
from pathlib import Path
import asyncio

from playwright.async_api import ViewportSize, async_playwright, Browser, Page, Error as PlaywrightError
from smolagents import ToolCallingAgent, OpenAIServerModel, InferenceClientModel, LiteLLMModel, tool, ActionStep
from smolagents.default_tools import FinalAnswerTool, VisitWebpageTool
from services.search import brave_search_tool
from os import getenv
from dotenv import load_dotenv
from bs4 import BeautifulSoup, Comment
from models.models import ModelProvider
import re
from datetime import datetime
from bson import ObjectId
from services.websocket_manager import manager

def serialize_doc(doc: dict[str, Any] | list) -> dict[str, Any] | list:
    """
    Manually serializes MongoDB document for API response.
    Converts ObjectId to string and datetime to ISO format string.
    """
    if isinstance(doc, list):
        for i, docdict in enumerate(doc):
            doc[i]= serialize_doc(docdict)

        return doc

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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# --- Environment Variables ---
GEMINI_API_KEY = getenv("GEMINI_API_KEY")
HF_TOKEN = getenv("HF_TOKEN")
OPENAI_API_KEY = getenv("OPENAI_API_KEY")

def minify_html(html_content: str, preserve_forms: bool = True) -> str:
    """
    HTML minification with better form preservation.
    """
    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove style tags but preserve inline styles on form elements if needed
    for style_tag in soup.find_all('style'):
        style_tag.decompose()

    # Remove script tags that aren't essential
    for script in soup.find_all('script'):
        # Keep scripts that might be needed for form functionality
        if not (script.get('src') and any(keyword in script.get('src', '') for keyword in ['jquery', 'bootstrap', 'form'])):
            script.decompose()

    # Remove HTML comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Remove empty divs and spans that don't contain forms
    if not preserve_forms:
        for tag in soup.find_all(['div', 'span']):
            if not tag.get_text(strip=True) and not tag.find_all(['input', 'select', 'textarea', 'button']):
                tag.decompose()

    return str(soup)


def extract_form_info(html_content: str) -> Dict[str, Any]:
    """
    Extracts detailed information about forms on the page.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    forms = []

    for form in soup.find_all('form'):
        form_info = {
            'action': form.get('action', ''),
            'method': form.get('method', 'GET').upper(),
            'fields': []
        }

        # Extract all form fields
        for field in form.find_all(['input', 'select', 'textarea']):
            field_info = {
                'type': field.get('type', field.name),
                'name': field.get('name'),
                'id': field.get('id'),
                'required': field.has_attr('required'),
                'placeholder': field.get('placeholder'),
                'value': field.get('value')
            }

            # For select elements, get options
            if field.name == 'select':
                field_info['options'] = []
                for option in field.find_all('option'):
                    field_info['options'].append({
                        'value': option.get('value'),
                        'text': option.get_text(strip=True)
                    })

            form_info['fields'].append(field_info)

        forms.append(form_info)

    return {'forms': forms, 'form_count': len(forms)}

class PlaywrightAgent:
    """
    agent with advanced browser automation capabilities.
    """

    def __init__(
        self,
        application_id: str,
        user: Dict[str, Any],
        user_data: List[Dict[str, Any]],
        scheme_info: Dict[str, Any],
        model_provider: ModelProvider = "gemini",
        model_id: Optional[str] = None,
        headless: bool = False,
        download_path: Optional[str] = None,
        timeout: int = 30000,
        viewport: Optional[Dict[str, int]] = None
    ):

        self.loop = asyncio.get_event_loop()

        self.application_id = application_id
        self.user = user
        self.user_documents = user_data
        self.scheme = scheme_info
        self.user_data_str = json.dumps(self._process_user_data(serialize_doc(user), serialize_doc(user_data)), indent=2)
        self.headless = headless
        self.timeout = timeout
        self.download_path = download_path or "~/"
        self.viewport = viewport or {"width": 1280, "height": 720}
        self.model = self.initialize_model(model_provider, model_id)
        self.agent = self._initialize_agent()
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
        self.context = None

        # Track state for better decision making
        self.page_history = []
        self.form_data_filled = {}
        self.last_error = None
        self.state = {
            "current_url": "",
            "last_action_description": "",
            "last_error": None,
            "form_data_filled": {},
            "extracted_data": {},
            "user_answers": {}
        }

    def get_agent_state(
        self,
        include_tool_history: bool = False,
        include_user_data: bool = False,
        include_scheme_data: bool = False,
    ) -> str:
        """
        Returns the current internal state of the agent as a JSON string.

        Args:
            include_tool_history (bool, optional): If True, includes the full history of tool calls and their outputs. This can be large. Defaults to False.
            include_user_data (bool, optional): If True, includes the user's personal data and documents. Defaults to False.
            include_scheme_data (bool, optional): If True, includes the full scheme data. Defaults to False.

        Returns:
            str: A JSON string representing the agent's state.
        """
        state_snapshot = self.state.copy()
        if self.page:
            try:
                state_snapshot["current_url"] = self.page.url
            except PlaywrightError:
                state_snapshot["current_url"] = "Page closed or inaccessible."

        if include_user_data:
            state_snapshot["user"] = self.user
            state_snapshot["user_documents"] = self.user_documents

        if include_scheme_data:
            state_snapshot["scheme"] = self.scheme

        if include_tool_history:
            history = []
            if self.agent and hasattr(self.agent, 'memory') and self.agent.memory and hasattr(self.agent.memory, 'steps'):
                for step in self.agent.memory.steps:
                    if isinstance(step, ActionStep):
                        history.append({
                            "thought": step.model_output_message,
                            "tool_calls": [str(call.dict()) for call in step.tool_calls] if step.tool_calls is not None else [],
                            "tool_outputs": step.observations,
                        })
            state_snapshot["tool_history"] = history

        return json.dumps(state_snapshot, indent=2, default=str)

    def set_agent_state_value(self, key: str, value: Any) -> str:
        """Sets a value in the agent's internal state."""
        if key in self.state:
            self.state[key] = value
            return f"State value for '{key}' updated."
        else:
            return f"Error: Invalid state key '{key}'. Must be one of {list(self.state.keys())}."

    def _process_user_data(self, user: Dict[Any, Any], user_data: List[Any]) -> Dict[str, Any]:
        """user data processing with validation."""
        processed_data = {"documents": {}, "personal_info": {}}

        # Process documents
        for doc in user_data:
            title = doc.get("title", "unknown_document")
            processed_data["documents"][title] = {
                "filename": doc.get("filename"),
                "s3_url": doc.get("s3_url"),
                "verified": doc.get("verified"),
                "doc_type": doc.get("doc_type", "unknown")
            }

        # Process personal information with validation
        personal_fields = ['full_name', 'email', 'phone', 'dob', 'gender', 'state', 'address']
        for field in personal_fields:
            if field in user:
                processed_data["personal_info"][field] = user[field]

        processed_data.update(user)
        return processed_data

    @classmethod
    def initialize_model(cls, model_provider: ModelProvider, model_id: Optional[str]):
        """Initialize model with better error handling."""
        try:
            if model_provider == "gemini":
                if not GEMINI_API_KEY:
                    raise ValueError("GEMINI_API_KEY environment variable not set.")
                return OpenAIServerModel(
                    model_id=model_id or "gemini-2.5-flash",
                    api_base="https://generativelanguage.googleapis.com/v1beta/openai/",
                    api_key=GEMINI_API_KEY,
                )
            elif model_provider == "huggingface":
                if not HF_TOKEN:
                    raise ValueError("HF_TOKEN environment variable not set.")
                return InferenceClientModel(
                    model_id=model_id or "deepseek-ai/DeepSeek-V3.1",
                    token=HF_TOKEN,
                )
            elif model_provider == "openai":
                if not OPENAI_API_KEY:
                    raise ValueError("OPENAI_API_KEY environment variable not set.")
                return LiteLLMModel(
                    model_id=model_id or "openai/gpt-4o-mini",
                    api_key=OPENAI_API_KEY,
                )
        except Exception as e:
            logger.error(f"Failed to initialize model: {e}")
            raise

    def _initialize_agent(self) -> ToolCallingAgent:
        """Initialize agent with comprehensive tools."""
        system_prompt = self._construct_system_prompt()

        def log_tool_call_sync(step_log: ActionStep, agent: ToolCallingAgent):
            '''log tool's wrapper because smolagents doesnt take async callbacks '''
            if self.loop:
                future = asyncio.run_coroutine_threadsafe(
                    self.log_tool_call(step_log, agent),
                    self.loop
                )
                try:
                    future.result(timeout=3)
                except Exception as e:
                    print(f"Log callback error: {e}")



        def screenshot_callback_sync(step_log: ActionStep, agent: ToolCallingAgent):
            """screenshot callback with element highlighting, now a sync wrapper for async thingy"""
            if self.loop and self.page:
                future = asyncio.run_coroutine_threadsafe(
                    self.screenshot_callback(step_log, agent),
                    self.loop
                )
                try:
                    future.result(timeout=5)
                except Exception as e:
                    print(f"Screenshot callback error: {e}")



        @tool
        def get_agent_state(
            include_tool_history: bool = False,
            include_user_data: bool = False,
            include_scheme_data: bool = False,
        ) -> str:
            """
            Returns the current internal state of the agent. Heavier data can be included with optional parameters.

            This tool provides a snapshot of the agent's state, which is useful for debugging or re-orienting the agent if it gets stuck.
            By default, it returns lightweight information like the current URL and form data filled.
            Use the optional parameters to include more detailed, but potentially large, information.

            Args:
                include_tool_history (bool, optional): Set to True to include the full history of tool calls and their outputs.
                                                     This is useful for understanding what the agent has done so far, but can be very verbose.
                                                     Defaults to False.
                include_user_data (bool, optional): Set to True to include the original user data and documents the agent was started with.
                                                  Useful if the agent needs to re-check some user information. Defaults to False.
                include_scheme_data (bool, optional): Set to True to include the original scheme information.
                                                    Useful if the agent needs to re-check details about the scheme it is applying for.
                                                    Defaults to False.

            Returns:
                str: A JSON string representing the current state of the agent.
            """
            return self.get_agent_state(
                include_tool_history=include_tool_history,
                include_user_data=include_user_data,
                include_scheme_data=include_scheme_data,
            )

        @tool
        def set_agent_state_value(key: str, value: Any) -> str:
            """
            Sets a value in the agent's internal state.

            Args:
                key (str): The key to update in the state dictionary. Must be one of [
                    "current_url",
                    "last_action_description",
                    "last_error",
                    "form_data_filled",
                    "extracted_data",
                    "user_answers"
                    ]
                value (Any): The new value for the key.
            Returns:
                str: A confirmation message.

            """
            return self.set_agent_state_value(key, value)

        # Define all tools
        @tool
        def open_url(url: str) -> str:
            """
            Navigates to a specific URL in the browser with error handling and page load detection.

            Args:
                url (str): The fully qualified URL to navigate to.

            Returns:
                str: A confirmation message indicating success or failure, including the page title.
            """
            future= asyncio.run_coroutine_threadsafe(self.open_url(url), self.loop)
            return future.result(timeout= 20)

        @tool
        def get_page_info() -> str:
            """
            Retrieves comprehensive information about the current page.

            This includes the page title, URL, and details about its structure such as
            the number of forms, presence of file inputs, and potential CAPTCHAs.

            Returns:
                str: A JSON string containing detailed information about the current page.
            """
            future= asyncio.run_coroutine_threadsafe(self.get_page_info(), self.loop)
            return future.result(timeout= 20)

        @tool
        def analyze_forms() -> str:
            """
            Analyzes all forms on the current page and returns detailed information about them.

            This includes form actions, methods, and a list of all input fields,
            selects, and text areas within each form.

            Returns:
                str: A JSON string with detailed information about all forms found, or a message if no forms are present.
            """
            future= asyncio.run_coroutine_threadsafe(self.analyze_forms(), self.loop)
            return future.result(timeout= 30)

        @tool
        def get_html_content(selector: str = "body", focus_area: Optional[str] = None) -> str:
            """
            Gets the minified HTML content of a specific element, with an option to focus on a relevant area.

            Args:
                selector (str, optional): The CSS selector of the element to retrieve HTML from. Defaults to "body".
                focus_area (Optional[str], optional): A string to help identify a more specific area of the page to focus on. Defaults to None.

            Returns:
                str: The minified HTML content of the selected element, truncated to a safe length.
            """
            future= asyncio.run_coroutine_threadsafe(self.get_html_content(selector, focus_area), self.loop)
            return future.result(timeout= 20)

        @tool
        def get_text_content(selector: str) -> str:
            """
            Extracts the text content from a specified element.

            Args:
                selector (str): The CSS selector of the element from which to extract text.

            Returns:
                str: The text content of the element, or an error message if the element is not visible.
            """
            future= asyncio.run_coroutine_threadsafe(self.get_text_content(selector), self.loop)
            return future.result(timeout= 30)

        @tool
        def find_elements(
            text: Optional[str] = None,
            tag: Optional[str] = None,
            attributes: Optional[Dict[str, str]] = None
        ) -> str:
            """
            Finds visible elements on the page based on a combination of text, tag, and attributes.

            This is more flexible than using a simple CSS selector and can help locate elements
            that are difficult to target otherwise.

            Args:
                text (Optional[str], optional): Text content to search for within the element.
                tag (Optional[str], optional): The HTML tag of the element (e.g., 'a', 'button').
                attributes (Optional[Dict[str, str]], optional): A dictionary of attributes to match (e.g., {'class': 'btn'}).

            Returns:
                str: A JSON string listing the found elements with their selectors, text, and other properties.
            """
            future= asyncio.run_coroutine_threadsafe(self.find_elements(text, tag, attributes), self.loop)
            return future.result(timeout= 30)

        @tool
        def smart_click(
            target: str,
            description: str,
            wait_after: int = 1000,
            verify_action: bool = True
        ) -> str:
            """
            Performs an intelligent click on a target element, with automatic waiting and verification.

            It tries multiple strategies to find the target (selector, text, value, title) and
            verifies the action by checking for URL changes or other indicators.

            Args:
                target (str): The primary identifier for the element to click (e.g., CSS selector, text).
                description (str): A description of the action being performed for logging.
                wait_after (int, optional): Milliseconds to wait after the click. Defaults to 1000.
                verify_action (bool, optional): Whether to verify the click was successful. Defaults to True.

            Returns:
                str: A message indicating the success or failure of the click action.
            """
            future= asyncio.run_coroutine_threadsafe(self.smart_click(target, description, wait_after, verify_action), self.loop)
            return future.result(timeout= 30)

        @tool
        def smart_fill(
            selector: str,
            field_name: str,
            description: str,
            clear_first: bool = True,
            verify_fill: bool = True
        ) -> str:
            """
            Intelligently fills a form field using available user data by mapping the field name.

            It automatically finds the correct user data based on the `field_name` (e.g., 'name', 'email')
            and fills the input field specified by the `selector`.

            Args:
                selector (str): The CSS selector of the input field.
                field_name (str): The logical name of the field to map to user data (e.g., 'full_name', 'dob').
                description (str): A description of the action being performed.
                clear_first (bool, optional): Whether to clear the field before filling. Defaults to True.
                verify_fill (bool, optional): Whether to verify the content after filling. Defaults to True.

            Returns:
                str: A confirmation message upon successful filling or an error if data is not found.
            """
            future= asyncio.run_coroutine_threadsafe(self.smart_fill(selector, field_name, description, clear_first, verify_fill), self.loop)
            return future.result(timeout= 120)

        @tool
        def handle_dropdown(
            selector: str,
            option_text: Optional[str] = None,
            option_value: Optional[str] = None,
            field_name: Optional[str] = None,
            description: str = ""
        ) -> str:
            """
            Handles selecting an option in a dropdown menu using various strategies.

            It can select by option text, value, or infer the correct option from user data
            if a `field_name` is provided (e.g., 'gender', 'state').

            Args:
                selector (str): The CSS selector of the select element.
                option_text (Optional[str], optional): The visible text of the option to select.
                option_value (Optional[str], optional): The value attribute of the option to select.
                field_name (Optional[str], optional): The logical name of the field to map to user data.
                description (str, optional): A description of the action. Defaults to "".

            Returns:
                str: A message indicating the success or failure of the selection.
            """
            future= asyncio.run_coroutine_threadsafe(self.handle_dropdown(selector, option_text, option_value, field_name, description), self.loop)
            return future.result(timeout= 30)

        @tool
        def handle_checkbox_radio(
            selector: str,
            field_name: str,
            description: str,
            state: Optional[bool] = None
        ) -> str:
            """
            Intelligently handles checking or unchecking checkboxes and radio buttons.

            It can set the state directly or infer it from user data based on the `field_name`.

            Args:
                selector (str): The CSS selector of the checkbox or radio button.
                field_name (str): The logical name of the field (e.g., 'terms_accepted').
                description (str): A description of the action being performed.
                state (Optional[bool], optional): The desired state (True for checked, False for unchecked). If None, it's inferred.

            Returns:
                str: A confirmation message of the action performed.
            """
            future= asyncio.run_coroutine_threadsafe(self.handle_checkbox_radio(selector, field_name, description, state), self.loop)
            return future.result(timeout= 120)

        @tool
        def upload_file(selector: str, document_type: str, description: str) -> str:
            """
            Handles file uploads by finding a matching document from the user's data.

            Args:
                selector (str): The CSS selector of the file input element.
                document_type (str): The type of document to upload (e.g., 'Aadhar Card', 'PAN Card').
                description (str): A description of the upload action.

            Returns:
                str: A message indicating the required file and whether it was found in user data.
                     Note: This tool currently identifies the file but requires user interaction for the actual upload.
            """
            return self.upload_file(selector, document_type, description)

        @tool
        def handle_captcha(selector: Optional[str] = None) -> str:
            """
            Detects and reports CAPTCHA challenges on the page.

            It scans for common CAPTCHA indicators and returns a message requesting human
            intervention if a CAPTCHA is found.

            Args:
                selector (Optional[str], optional): A specific selector to check for a CAPTCHA. Defaults to None.

            Returns:
                str: A message indicating whether a CAPTCHA was detected and that human help is required.
            """
            future= asyncio.run_coroutine_threadsafe(self.handle_captcha(selector), self.loop)
            return future.result(timeout= 120)

        @tool
        def wait_and_verify(
            condition: str,
            selector: Optional[str] = None,
            timeout: int = 10000,
            expected_text: Optional[str] = None
        ) -> str:
            """
            Waits for a specific condition to be met on the page and verifies it.

            This is useful for handling dynamic content, page loads, and other asynchronous events.

            Args:
                condition (str): The condition to wait for (e.g., 'element_visible', 'page_load', 'url_change').
                selector (Optional[str], optional): The CSS selector to use for element-based conditions.
                timeout (int, optional): The maximum time to wait in milliseconds. Defaults to 10000.
                expected_text (Optional[str], optional): The text to look for when using the 'text_present' condition.

            Returns:
                str: A message confirming that the condition was met or that it timed out.
            """
            future= asyncio.run_coroutine_threadsafe(self.wait_and_verify(condition, selector, timeout, expected_text), self.loop)
            return future.result(timeout= 30)

        @tool
        def navigate_menu(menu_path: List[str], description: str) -> str:
            """
            Navigates through a sequence of nested menus or navigation links.

            It clicks through each item in the `menu_path` list to reach a specific page or section.

            Args:
                menu_path (List[str]): A list of strings representing the text of each menu item to click in order.
                description (str): A description of the navigation action.

            Returns:
                str: A confirmation message upon successful navigation or an error if an item is not found.
            """
            future= asyncio.run_coroutine_threadsafe(self.navigate_menu(menu_path, description), self.loop)
            return future.result(timeout=30)

        @tool
        def handle_popup(action: Literal["accept", "dismiss", "get_text"] = "accept") -> str:
            """
            Handles JavaScript alerts, confirms, and prompts.

            It can accept, dismiss, or get the text from a popup dialog.

            Args:
                action (Literal["accept", "dismiss", "get_text"], optional): The action to perform on the popup. Defaults to "accept".

            Returns:
                str: A message indicating the action taken and the text of the dialog, if any.
            """
            future=  asyncio.run_coroutine_threadsafe(self.handle_popup(action), self.loop)
            return future.result(timeout=30)

        @tool
        def scroll_smart(
            direction: Literal["up", "down", "to_element", "to_bottom", "to_top"],
            target_selector: Optional[str] = None,
            pixels: Optional[int] = None
        ) -> str:
            """
            Performs smart scrolling actions on the page.

            It can scroll up, down, to a specific element, or to the top/bottom of the page.

            Args:
                direction (Literal["up", "down", "to_element", "to_bottom", "to_top"]): The direction or type of scroll.
                target_selector (Optional[str], optional): The CSS selector of the element to scroll to. Required for 'to_element'.
                pixels (Optional[int], optional): The number of pixels to scroll for 'up' or 'down' actions. Defaults to viewport height.

            Returns:
                str: A confirmation message of the scroll action performed.
            """
            future= asyncio.run_coroutine_threadsafe(self.scroll_smart(direction, target_selector, pixels), self.loop)
            return future.result(timeout=30)

        @tool
        def retry_action(action_description: str, max_attempts: int = 3) -> str:
            """
            Retries the last failed action with different strategies.

            This tool is a placeholder for a more complex retry mechanism. It signals the intent
            to retry a failed operation.

            Args:
                action_description (str): A description of the action to be retried.
                max_attempts (int, optional): The maximum number of retry attempts. Defaults to 3.

            Returns:
                str: A message indicating that the retry mechanism has been triggered.
            """
            return self.retry_action(action_description, max_attempts)

        @tool
        def extract_download_links() -> str:
            """
            Extracts all potential download links from the current page.

            It looks for links pointing to common file types (PDF, DOC, etc.) and links with
            the 'download' attribute.

            Returns:
                str: A JSON string listing the found download links with their URLs and text.
            """
            future= asyncio.run_coroutine_threadsafe(self.extract_download_links(), self.loop)
            return future.result(timeout=30)

        @tool
        def check_page_errors() -> str:
            """
            Checks the current page for common error messages or validation issues.

            It scans for elements with error-related classes or text content (e.g., 'error', 'invalid').

            Returns:
                str: A JSON string of detected errors, or a message indicating no obvious errors were found.
            """
            future= asyncio.run_coroutine_threadsafe(self.check_page_errors(), self.loop)
            return future.result(timeout=30)

        @tool
        def take_full_screenshot(filename: Optional[str] = None) -> str:
            """
            Takes a screenshot of the entire page and saves it to a file.

            Args:
                filename (Optional[str], optional): The name of the file to save the screenshot as. If None, a timestamped name is generated.

            Returns:
                str: The file path where the screenshot was saved.
            """
            future= asyncio.run_coroutine_threadsafe(self.take_full_screenshot(filename), self.loop)
            return future.result(timeout=30)


        tools = [
            open_url, get_page_info, analyze_forms, get_html_content, get_text_content,
            find_elements, smart_click, smart_fill, handle_dropdown, handle_checkbox_radio,
            upload_file, handle_captcha, wait_and_verify, navigate_menu, handle_popup,
            scroll_smart, retry_action, extract_download_links, check_page_errors,
            take_full_screenshot, FinalAnswerTool(), VisitWebpageTool(),
            brave_search_tool, get_agent_state, set_agent_state_value
        ]

        return ToolCallingAgent(
            tools=tools,
            model=self.model,
            instructions=system_prompt,
            add_base_tools=False,
            step_callbacks=[screenshot_callback_sync, log_tool_call_sync]
        )

    def _construct_system_prompt(self) -> str:
        """Construct comprehensive system prompt."""
        return f"""
You are an expert web automation assistant with advanced browser control capabilities.
Your goal is to complete complex web tasks intelligently and efficiently.

**User Data Available:**
```json
{self.user_data_str}
```

**Capabilities:**
1. **Smart Form Handling**: Use field names to automatically map user data to form fields
2. **Intelligent Element Finding**: Find elements by text, attributes, or visual cues
3. **Error Recovery**: Automatically retry failed actions with different strategies
4. **Multi-step Workflows**: Handle complex application processes with multiple pages
5. **Dynamic Content**: Wait for and handle dynamically loaded content
6. **File Uploads**: Automatically handle document uploads from user data
7. **CAPTCHA Detection**: Identify and request help with CAPTCHAs
8. **Form Validation**: Check for and handle form validation errors

**Best Practices:**
- Always analyze forms before filling them using `analyze_forms`
- Use `smart_fill` with field names rather than generic `fill_input`
- Verify actions completed successfully before proceeding
- Handle errors gracefully and use retry mechanisms
- Take screenshots at key steps for debugging
- Use `wait_and_verify` for dynamic content
- Check for validation errors after form submissions

**Workflow Strategy:**
1. Start with `get_page_info` to understand the page structure
2. Use `analyze_forms` to understand form requirements
3. Use smart tools (`smart_click`, `smart_fill`) for better reliability
4. Verify each action before proceeding to the next
5. Handle errors and edge cases proactively
6. Provide detailed status updates throughout the process

**Final Answer Format:**
When you have completed the task, or if you need to ask the user a question, or if you encounter an unrecoverable error, you MUST use the `final_answer` tool. The output should be a JSON string with the following format:
{{
    "status": "success" | "error" | "question",
    "data": "..."
}}
- If the task is successfully completed, `status` is "success" and `data` is a summary of the outcome (e.g., "Application submitted successfully with reference number XXXXX").
- If you need to ask the user for information (e.g., for a CAPTCHA or missing data), `status` is "question" and `data` is a JSON string containing a list of questions, like this: '{{"questions": [{{ "key": "captcha_solution", "question": "Please provide the solution for the CAPTCHA."}}]}}'.
- If you encounter an error you cannot recover from, `status` is "error" and `data` is a description of the error.

**State Management:**
Use the `get_agent_state` tool to review your current state and `set_agent_state_value` to store important information like the current URL, data you've filled, or errors you've encountered. This helps you keep track of your progress.

Remember: You have access to comprehensive user data - use it effectively to auto-fill forms without asking the user for information that's already available.
"""


    async def log_tool_call(self, step_log: ActionStep, agent: ToolCallingAgent):
        if getattr(step_log, "tool_calls", []):
            if step_log.tool_calls is not None:
                last_tool_call = step_log.tool_calls[-1]
                tool_name = last_tool_call.name
                tool_args = last_tool_call.arguments

                description = f"Using tool: `{tool_name}`."
                if tool_name == 'smart_fill' and isinstance(tool_args, dict) and 'field_name' in tool_args:
                    description = f"Filling field '{tool_args.get('field_name')}'."
                elif tool_name == 'smart_click' and isinstance(tool_args, dict) and 'target' in tool_args:
                    description = f"Clicking on '{tool_args.get('target')}'."
                elif tool_name == 'open_url' and isinstance(tool_args, dict) and 'url' in tool_args:
                    description = f"Navigating to {tool_args.get('url')}."

                message = {
                    "type": "agent_tool_call",
                    "data": {
                        "tool_name": tool_name,
                        "tool_args": tool_args,
                        "description": description
                    }
                }
                # manager.send_json_sync(message, self.application_id)
            else:
                message = {
                    "type": "status",
                    "message": "Tried to log the tool calls, but there are none"
                }
                await manager.send_json(message, self.application_id)



    async def screenshot_callback(self, step_log: ActionStep, agent: ToolCallingAgent):
        """screenshot callback with element highlighting."""
        if not self.page:
            logger.warning("Browser not running, cannot take screenshot.")
            return

        # manager.send_json_sync({"type": "agent_log", "data": "Taking screenshot..."}, self.application_id)

        selector = "body"
        try:
            if getattr(step_log, "tool_calls", []) and step_log.tool_calls is not None:
                last_tool_call = step_log.tool_calls[-1]
                args = getattr(last_tool_call, "arguments", {})
                if isinstance(args, dict) and "selector" in args and args.get('selector', '').strip() != "":
                    selector = args["selector"]

            if selector != "body":
                try:
                    await self.page.locator(selector).highlight()
                    time.sleep(0.5)
                except Exception:
                    pass

            screenshot_bytes = await self.page.locator(selector).screenshot(type='png')
            image = Image.open(BytesIO(screenshot_bytes))

            if len(screenshot_bytes) > 500000:  # 500KB
                output_buffer = BytesIO()
                image.save(output_buffer, format='JPEG', quality=70, optimize=True)
                image = Image.open(BytesIO(output_buffer.getvalue()))

            step_log.observations_images = [image.copy()]
            logger.info(f"Screenshot captured for '{selector}': {image.size} pixels")

        except Exception as e:
            logger.error(f"Screenshot failed for '{selector}': {e}")
            try:
                screenshot_bytes = await self.page.screenshot()
                image = Image.open(BytesIO(screenshot_bytes))
                step_log.observations_images = [image.copy()]
            except Exception as e2:
                logger.error(f"Fallback screenshot failed: {e2}")


    async def start_browser(self):
        """Start browser with configuration."""
        if self.browser is None:
            try:
                self.playwright = await async_playwright().start()
                self.browser = await self.playwright.chromium.launch(
                    headless=self.headless,
                    args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled']
                )

                self.context = self.browser.new_context(
                    viewport= ViewportSize(width= self.viewport['width'], height= self.viewport['height']),
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    accept_downloads=True,
                )

                self.page = await (await self.context).new_page()
                self.page.set_default_timeout(self.timeout)
                self.page.on("dialog", lambda dialog: dialog.accept())
                logger.info("browser started successfully.")

            except Exception as e:
                logger.error(f"Failed to start browser: {e}")
                raise

    async def close_browser(self):
        """Close browser with proper cleanup."""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception as e:
            logger.error(f"Error closing browser: {e}")
        finally:
            self.browser = None
            self.page = None
            self.context = None
            self.playwright = None
            logger.info("Browser closed.")

    # === Tool Implementations ===
    async def open_url(self, url: str) -> str:
        if not self.page: return "Error: Browser is not running. Call start_browser() first."
        print("in the async func rn")
        try:
            self.page_history.append(url)
            print("going to the website...")
            response = await self.page.goto(url, timeout=self.timeout)
            print("goto done")
            if response and response.status >= 400:
                return f"Warning: Received HTTP {response.status} when navigating to {url}"
            await self.page.wait_for_load_state("domcontentloaded")
            return f"Successfully navigated to {url}. Page title: {await self.page.title()}"
        except Exception as e:
            self.last_error = str(e)
            return f"Error navigating to {url}: {e}"

    async def get_page_info(self) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            info = {
                "title": await self.page.title(), "url": self.page.url,
                "has_forms": len(await self.page.locator("form").all()) > 0,
                "form_count": len(await self.page.locator("form").all()),
                "has_file_inputs": len(await self.page.locator("input[type='file']").all()) > 0,
                "has_captcha": self._detect_captcha(),
                "page_height": await self.page.evaluate("document.body.scrollHeight"),
                "viewport_height": await self.page.evaluate("window.innerHeight")
            }
            return f"Page Info: {json.dumps(info, indent=2)}"
        except Exception as e: return f"Error getting page info: {e}"

    async def analyze_forms(self) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            html_content = await self.page.content()
            form_info = extract_form_info(html_content)
            if form_info['form_count'] == 0: return "No forms found on the current page."
            return f"Form Analysis: {json.dumps(form_info, indent=2)}"
        except Exception as e: return f"Error analyzing forms: {e}"

    async def get_html_content(self, selector: str = "body", focus_area: Optional[str] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            if focus_area:
                for focus_selector in [f"[id*='{focus_area}']", f"[class*='{focus_area}']", f"*:has-text('{focus_area}')"]:
                    try:
                        if self.page.locator(focus_selector).first.is_visible():
                            selector = focus_selector
                            break
                    except: continue
            html = await self.page.locator(selector).inner_html()
            return minify_html(html)[:30000]
        except Exception as e: return f"Error getting HTML for selector '{selector}': {e}"

    async def get_text_content(self, selector: str) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            element = self.page.locator(selector)
            if not await element.first.is_visible(): return f"Element '{selector}' is not visible."
            return await element.text_content() or ""
        except Exception as e: return f"Error getting text for selector '{selector}': {e}"

    async def find_elements(self, text: Optional[str] = None, tag: Optional[str] = None, attributes: Optional[Dict[str, str]] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            selectors = []
            if text: selectors.extend([f"text='{text}'", f"*:has-text('{text}')", f"[placeholder*='{text}']", f"[label*='{text}']"])
            if tag: selectors.append(tag)
            if attributes:
                for key, value in attributes.items(): selectors.extend([f"[{key}='{value}']", f"[{key}*='{value}']"])

            found_elements = []
            for selector in selectors:
                for i, element in enumerate(await self.page.locator(selector).filter(has_text='').all()):
                    found_elements.append({
                        "selector": selector, "index": i,
                        "text": (await element.text_content() or '')[:100],
                        "tag": element.evaluate("el => el.tagName.toLowerCase()"),
                        "bbox": element.bounding_box()
                    })
            if not found_elements: return "No visible elements found matching criteria."
            return f"Found {len(found_elements)} elements: {json.dumps(found_elements[:10], indent=2)}"
        except Exception as e: return f"Error finding elements: {e}"

    async def smart_click(self, target: str, description: str, wait_after: int = 1000, verify_action: bool = True) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            selectors = [target, f"text='{target}'", f"*:has-text('{target}')", f"[value='{target}']", f"[title='{target}']"]
            for selector in selectors:
                try:
                    element = self.page.locator(selector).first
                    if element.is_visible():
                        await element.scroll_into_view_if_needed()
                        await element.wait_for(state="visible", timeout=5000)
                        await element.click(timeout=5000)
                        await self.page.wait_for_timeout(wait_after)
                        if verify_action:
                            current_url = self.page.url
                            if len(self.page_history) > 0 and current_url != self.page_history[-1]:
                                return f"Successfully clicked '{target}'. Page navigated to: {current_url}"
                        return f"Successfully clicked element: {target}"
                except Exception: continue
            return f"Failed to click element: {target}. Element not found or not clickable."
        except Exception as e:
            self.last_error = str(e)
            return f"Error clicking element '{target}': {e}"

    async def smart_fill(self, selector: str, field_name: str, description: str, clear_first: bool = True, verify_fill: bool = True) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            field_mapping = {'name': 'full_name', 'full_name': 'full_name', 'first_name': 'full_name', 'last_name': 'full_name', 'email': 'email', 'phone': 'phone', 'mobile': 'phone', 'date_of_birth': 'dob', 'dob': 'dob', 'gender': 'gender', 'state': 'state', 'address': 'address'}
            user_data = json.loads(self.user_data_str)
            value = None
            field_key = field_mapping.get(field_name.lower())
            if field_key:
                value = user_data.get('personal_info', {}).get(field_key) or user_data.get(field_key)
                if 'name' in field_name.lower() and field_key == 'full_name' and value:
                    parts = value.split()
                    if 'first' in field_name.lower(): value = parts[0]
                    elif 'last' in field_name.lower(): value = parts[-1] if len(parts) > 1 else ""

            if not value: return f"No data found for field '{field_name}'. Available data keys: {list(user_data.get('personal_info', {}).keys())}"

            element = self.page.locator(selector)
            if not element.first.is_visible(): return f"Element '{selector}' is not visible."
            if clear_first: await element.clear()
            await element.fill(str(value))

            if verify_fill and element.input_value() != str(value):
                return f"Warning: Expected '{value}' but field contains '{element.input_value()}'"

            self.form_data_filled[field_name] = value
            return f"Successfully filled '{field_name}' with value from user data."
        except Exception as e: return f"Error filling field '{field_name}': {e}"

    async def handle_dropdown(self, selector: str, option_text: Optional[str] = None, option_value: Optional[str] = None, field_name: Optional[str] = None, description: str = "") -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            element = self.page.locator(selector)
            if not element.first.is_visible(): return f"Dropdown '{selector}' is not visible."

            if field_name and not option_text and not option_value:
                user_data = json.loads(self.user_data_str)
                field_key = {'gender': 'gender', 'state': 'state'}.get(field_name.lower())
                if field_key: option_text = user_data.get('personal_info', {}).get(field_key) or user_data.get(field_key)

            if option_value:
                await element.select_option(value=option_value)
                return f"Successfully selected option by value: {option_value}"
            elif option_text:
                try:
                    await element.select_option(label=option_text)
                    return f"Successfully selected option: {option_text}"
                except:
                    for option in await element.locator("option").all():
                        option_text_content= await option.text_content()
                        if option_text_content is None:
                            print("blank option in dropdown tool")
                            break
                        if option_text.lower() in option_text_content.lower():
                            await element.select_option(value=await option.get_attribute("value"))
                            return f"Successfully selected option: {option.text_content()} (partial match)"
                    return f"Could not find option matching '{option_text}'"
            return "No option specified for dropdown selection."
        except Exception as e: return f"Error handling dropdown '{selector}': {e}"

    async def handle_checkbox_radio(self, selector: str, field_name: str, description: str, state: Optional[bool] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            element = self.page.locator(selector)
            if not element.first.is_visible(): return f"Element '{selector}' is not visible."
            if state is None:
                state = {'terms_accepted': True, 'privacy_accepted': True, 'newsletter': False, 'notifications': False}.get(field_name.lower(), True)
            await element.set_checked(state)
            return f"Successfully {'checked' if state else 'unchecked'} element '{field_name}'."
        except Exception as e: return f"Error handling checkbox/radio '{field_name}': {e}"

    def upload_file(self, selector: str, document_type: str, description: str) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            documents = json.loads(self.user_data_str).get('documents', {})
            doc_type_lower = document_type.lower()
            matching_doc = next((info for title, info in documents.items() if doc_type_lower in title.lower() or title.lower() in doc_type_lower), None)
            if not matching_doc: return f"No document found for type '{document_type}'. Available documents: {list(documents.keys())}"
            return f"File upload required for '{document_type}'. Found document: {matching_doc['filename']}. Please ensure this file is available for upload. Use user input tool to request file if needed."
        except Exception as e: return f"Error handling file upload: {e}"

    async def handle_captcha(self, selector: Optional[str] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            indicators = ["captcha", "recaptcha", "hcaptcha", "verification", "security", "robot", "human"]
            captcha_info = []
            for indicator in indicators:
                for element in await self.page.locator(f"*:has-text('{indicator}'), [id*='{indicator}'], [class*='{indicator}']").all():
                    if element.is_visible():
                        captcha_info.append({"type": indicator, "text": (await element.text_content() or '')[:100]})
            if captcha_info: return f"CAPTCHA detected! Indicators: {captcha_info}. Human intervention required. Use user input tool to request CAPTCHA solution."
            return "No CAPTCHA detected on current page."
        except Exception as e: return f"Error checking for CAPTCHA: {e}"

    async def wait_and_verify(self, condition: str, selector: Optional[str] = None, timeout: int = 10000, expected_text: Optional[str] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            if condition == "element_visible" and selector:
                await self.page.wait_for_selector(selector, state="visible", timeout=timeout)
                return f"Element '{selector}' is now visible."
            elif condition == "element_hidden" and selector:
                await self.page.wait_for_selector(selector, state="hidden", timeout=timeout)
                return f"Element '{selector}' is now hidden."
            elif condition == "page_load":
                await self.page.wait_for_load_state("networkidle", timeout=timeout)
                return "Page has finished loading."
            elif condition == "url_change":
                current_url = self.page.url
                await self.page.wait_for_url(lambda url: url != current_url, timeout=timeout)
                return f"URL changed to: {self.page.url}"
            elif condition == "text_present" and expected_text:
                await self.page.wait_for_selector(f"*:has-text('{expected_text}')", timeout=timeout)
                return f"Text '{expected_text}' is now present on page."
            return f"Unknown condition: {condition}"
        except Exception as e: return f"Wait condition '{condition}' failed: {e}"

    async def navigate_menu(self, menu_path: List[str], description: str) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            for i, item in enumerate(menu_path):
                selectors = [f"text='{item}'", f"a:has-text('{item}')", f"button:has-text('{item}')", f"[title='{item}']", f"*:has-text('{item}')"]
                clicked = any(self._try_click(s) for s in selectors)
                if not clicked: return f"Failed to find menu item: {item} (step {i+1})"
            return f"Successfully navigated through menu: {' -> '.join(menu_path)}"
        except Exception as e: return f"Error navigating menu: {e}"

    async def _try_click(self, selector: str) -> bool:
        try:
            if self.page is None:
                return False
            element = self.page.locator(selector).first
            if element.is_visible():
                await element.click()
                await self.page.wait_for_timeout(1000)
                return True
        except: return False
        return False

    async def handle_popup(self, action: Literal["accept", "dismiss", "get_text"] = "accept") -> str:
        if not self.page: return "Error: Browser is not running."
        dialog_text = None
        def handle_dialog(dialog):
            nonlocal dialog_text
            dialog_text = dialog.message
            if action == "accept": dialog.accept()
            else: dialog.dismiss()
        self.page.on("dialog", handle_dialog)
        # This is a simplified handling. A real scenario might need to trigger the action that causes the dialog.
        # For now, we assume a dialog might appear and we handle it.
        await self.page.wait_for_timeout(1000) # Give a moment for a dialog to appear
        self.page.remove_listener("dialog", handle_dialog)
        if dialog_text: return f"Handled dialog with message: '{dialog_text}' (action: {action})"
        return "No dialog detected."

    async def scroll_smart(self, direction: Literal["up", "down", "to_element", "to_bottom", "to_top"], target_selector: Optional[str] = None, pixels: Optional[int] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            if direction == "to_element" and target_selector:
                await self.page.locator(target_selector).first.scroll_into_view_if_needed()
                return f"Scrolled to element: {target_selector}"
            elif direction == "to_bottom": await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)"); return "Scrolled to bottom of page."
            elif direction == "to_top": await self.page.evaluate("window.scrollTo(0, 0)"); return "Scrolled to top of page."
            elif direction in ["up", "down"]:
                scroll_amount = pixels or self.page.evaluate("window.innerHeight")
                await self.page.evaluate(f"window.scrollBy(0, {-scroll_amount if direction == 'up' else scroll_amount})")
                return f"Scrolled {direction} by {abs(scroll_amount)} pixels."
            return f"Unknown scroll direction: {direction}"
        except Exception as e: return f"Error scrolling: {e}"

    def retry_action(self, action_description: str, max_attempts: int = 3) -> str:
        if not self.last_error: return "No previous error to retry."
        return f"Retry mechanism triggered for: {action_description}. Last error was: {self.last_error}"

    async def extract_download_links(self) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            selectors = ["a[href$='.pdf']", "a[href$='.doc']", "a[href$='.docx']", "a[href$='.xls']", "a[href$='.xlsx']", "a[download]", "*:has-text('download')", "*:has-text('Download')"]
            links = []
            for selector in selectors:
                for element in await self.page.locator(selector).all():
                    if element.is_visible() and element.get_attribute("href"):
                        links.append({"url": element.get_attribute("href"), "text": (await element.text_content() or '')[:50], "selector": selector})
            if not links: return "No download links found."
            return f"Found {len(links)} download links: {json.dumps(links, indent=2)}"
        except Exception as e: return f"Error extracting download links: {e}"

    async def check_page_errors(self) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            selectors = [".error", ".alert-danger", ".text-danger", "*:has-text('error')", "*:has-text('Error')", "*:has-text('invalid')", "*:has-text('required')", "*:has-text('failed')", "*:has-text('wrong')"]
            errors = []
            for selector in selectors:
                for element in await self.page.locator(selector).all():
                    if element.is_visible() and (await element.text_content() or '').strip():
                        errors.append({"selector": selector, "message": (await element.text_content() or '')[:200]})
            if errors: return f"Page errors detected: {json.dumps(errors, indent=2)}"
            return "No obvious errors detected."
        except Exception as e: return f"Error checking for page errors: {e}"

    async def take_full_screenshot(self, filename: Optional[str] = None) -> str:
        if not self.page: return "Error: Browser is not running."
        try:
            filename = filename or f"screenshot_{int(time.time())}.png"
            filepath = Path(self.download_path) / filename
            filepath.parent.mkdir(parents=True, exist_ok=True)
            await self.page.screenshot(path=str(filepath), full_page=True, type='png')
            return f"Full-page screenshot saved as: {filepath}"
        except Exception as e: return f"Error taking screenshot: {e}"

    def _detect_captcha(self) -> bool:
        try:
            return any(self.page.locator(s).first.is_visible() for s in ["iframe[src*='recaptcha']", "iframe[src*='hcaptcha']", ".g-recaptcha", ".h-captcha", "*:has-text('captcha')", "*:has-text('verification')"])
        except: return False

    async def run(self, prompt: str):
        """Run the agent with error handling and logging."""
        await self.start_browser()

        try:
            logger.info(f"Starting agent for application {self.application_id} with prompt: {prompt[:100]}...")
            await manager.send_json({"type": "agent_log", "data": "Playwright agent has started."}, self.application_id)
            
            max_qa_rounds = 5 # To prevent infinite loops
            current_prompt = prompt
            final_answer_obj = {}

            while not (isinstance(final_answer_obj, dict) and final_answer_obj.get("status") in ["success", "error"]) and max_qa_rounds > 0:
                await manager.send_json({"type": "agent_log", "data": "Agent is thinking..."}, self.application_id)

                agent_response= await self.loop.run_in_executor(
                    None,
                    self.agent.run,
                    current_prompt
                )

                final_answer_content = ''
                last_step = self.agent.memory.steps[-1]
                if isinstance(last_step, ActionStep) and last_step.tool_calls and last_step.tool_calls[-1].name == "final_answer":
                    final_answer_content = str(agent_response)
                
                if not final_answer_content:
                    final_answer_content = agent_response if isinstance(agent_response, str) else '{"status": "error", "data": "Agent did not provide a final answer in the expected format."}'

                try:
                    # A bit of cleaning for JSON that might be in a markdown block
                    cleaned_response = re.sub(r'```json\s*|\s*```', '', final_answer_content).strip()
                    final_answer_obj = json.loads(cleaned_response)

                    if final_answer_obj.get("status") == "question":
                        questions_data_str = final_answer_obj.get("data", "{}")
                        try:
                            questions_data = json.loads(questions_data_str)
                        except json.JSONDecodeError:
                            final_answer_obj = {"status": "error", "data": "Agent asked a question but `data` was not a valid JSON string."}
                            break
                        
                        questions_to_ask = questions_data.get("questions", [])
                        
                        if not questions_to_ask:
                             final_answer_obj = {"status": "error", "data": "Agent asked a question but provided no questions."}
                             break

                        # Ask user for input
                        questions_str = "\n".join([f"- {q['question']}" for q in questions_to_ask])
                        prompt_to_user = f"The agent requires more information:\n{questions_str}\nPlease provide the answer(s)."
                        
                        user_response = await manager.get_user_input(self.application_id, prompt_to_user)
                        
                        answers = {}
                        if "data" in user_response:
                            if len(questions_to_ask) == 1:
                                key = questions_to_ask[0].get("key", "answer_0")
                                answers[key] = user_response["data"]
                            else:
                                answers["user_response_text"] = user_response["data"]
                        else:
                            answers["user_response_text"] = "User provided no answer."
                        
                        self.set_agent_state_value("user_answers", {**self.state["user_answers"], **answers})

                        current_prompt = (
                            "You are a web automation assistant. Continue with your task. "
                            f"Here is the information from the user in response to your questions: {json.dumps(answers, indent=2)}. "
                            "Use this information to proceed with your task. If you asked multiple questions, the user's response may be in a single block of text that you need to interpret. "
                            "Update your internal state with any new information using `set_agent_state_value`. "
                            "Then, continue executing the plan. Remember to provide a final answer in the specified JSON format when you are done, encounter an error, or need to ask another question."
                        )
                        max_qa_rounds -= 1
                    
                    elif final_answer_obj.get("status") in ["success", "error"]:
                        break # Exit loop on success or error
                    
                    else: # Invalid status
                        final_answer_obj = {"status": "error", "data": f"Agent provided an invalid status: {final_answer_obj.get('status')}"}
                        break

                except (json.JSONDecodeError, TypeError) as e:
                    logger.error(f"Could not parse agent's final answer as JSON: {final_answer_content}. Error: {e}")
                    final_answer_obj = {"status": "error", "data": f"Agent's final answer was not in the expected JSON format. Raw answer: {final_answer_content}"}
                    break
            
            final_answer = final_answer_obj if final_answer_obj else {"status": "error", "data": "Agent finished without a clear final answer."}
            
            logger.info(f"Agent for {self.application_id} completed. Final answer: {json.dumps(final_answer)}")
            await manager.send_json({"type": "agent_final_answer", "data": final_answer}, self.application_id)
            return final_answer
        except Exception as e:
            logger.error(f"Agent execution for {self.application_id} failed: {e}")
            await manager.send_json({"type": "agent_error", "data": f"Agent execution failed: {str(e)}"}, self.application_id)
            raise
        finally:
            await self.close_browser()


# === Runner Function ===

DEFAULT_PROMPT = (
    "Your goal is to complete a government scheme application on the user's behalf with maximum efficiency and accuracy. "
    "**Initial Strategy:**\n"
    "1. Start with `get_page_info` to understand the page structure and identify key elements\n"
    "2. Use `analyze_forms` to understand all form requirements before filling anything\n"
    "3. Look for navigation elements like 'Apply Now', 'Application', 'Apply Online' buttons\n"
    "4. Check for authentication requirements or user registration needs\n"
    "**Form Handling Strategy:**\n"
    "1. Use `smart_fill` with proper field names (name, email, phone, dob, gender, state, address)\n"
    "2. Use `handle_dropdown` for select elements with field names when possible\n"
    "3. Use `handle_checkbox_radio` for terms acceptance and other boolean fields\n"
    "4. Handle file uploads using `upload_file` with document types from user data\n"
    "**Error Handling:**\n"
    "1. Use `check_page_errors` after each form submission attempt\n"
    "2. Use `wait_and_verify` for dynamic content loading\n"
    "3. Use `handle_captcha` if verification challenges appear\n"
    "4. Use `retry_action` for failed operations\n"
    "**Navigation:**\n"
    "1. Use `navigate_menu` for complex site navigation\n"
    "2. Use `smart_click` for buttons and links with verification\n"
    "3. Use `scroll_smart` to ensure all content is accessible\n"
    "**Verification:**\n"
    "1. Use `take_full_screenshot` at key steps for documentation\n"
    "2. Verify each action completed successfully before proceeding\n"
    "3. Check for success messages, confirmation numbers, or next steps\n"
    "**Critical Rules:**\n"
    "- NEVER guess or leave required fields empty - use the comprehensive user data provided\n"
    "- If any required information is missing from user data, use user input tool immediately\n"
    "- Take screenshots at key milestones for audit trail\n"
    "- Handle errors gracefully and provide clear status updates\n"
    "- Confirm successful submission with evidence (confirmation message, reference number, etc.)"
    "Remember that you have to give Final Answer using final_answer tool in JSON format, as described in the system prompt"
    "Also keep the State Management rules from the system prompt in mind"
)

async def run_playwright_agent(
    application_id: str,
    user: Dict[str, Any],
    user_data: List[Dict[str, Any]],
    scheme: Dict[str, Any],
    prompt_instructions: str = DEFAULT_PROMPT,
    model_provider: ModelProvider = "gemini",
    model_id: Optional[str] = None,
    headless: bool = False,
    download_path: Optional[str] = None,
    timeout: int = 10000,
    viewport: Optional[Dict[str, int]] = None
):
    """
    runner function with comprehensive configuration options.
    """

    print("HMMMMMMM MMMMMMMM")

    prompt = (
        "You are a government scheme application agent. This is the scheme you have to apply for:" + str(serialize_doc(scheme)) +
        f"Navigate to according to the 'applicationProcess' mentioned in scheme (if the mode is online) and complete instructions:\n\n"
        f"{prompt_instructions}\n\n"
        f"Remember: You have comprehensive user data available - use it effectively!"
    )

    agent = PlaywrightAgent(
        application_id=application_id,
        user=user,
        user_data=user_data,
        scheme_info=scheme,
        model_provider=model_provider,
        model_id=model_id,
        headless=headless,
        download_path=download_path,
        timeout=timeout,
        viewport=viewport
    )


    return await agent.run(prompt)


# === Example Usage ===
# if __name__ == "__main__":
