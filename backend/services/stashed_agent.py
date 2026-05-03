"""
This module contains the Playwright agent for automating web tasks,
built using the smolagents library for intelligence.
"""
import json
import logging
from typing import Any, Dict, List, Literal, Optional
from io import BytesIO
from PIL import Image

from playwright.sync_api import sync_playwright, Browser, Page
from smolagents import ToolCallingAgent, OpenAIServerModel, InferenceClientModel, LiteLLMModel, tool, ActionStep
from smolagents.default_tools import FinalAnswerTool, UserInputTool, VisitWebpageTool
from .search import brave_search_tool
from os import getenv
from dotenv import load_dotenv
from bs4 import BeautifulSoup, Comment
from database.database import get_collection
from models.models import Collection, ModelProvider
import re
from datetime import datetime
from bson import ObjectId

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



# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# --- Environment Variables ---
GEMINI_API_KEY = getenv("GEMINI_API_KEY")
HF_TOKEN = getenv("HF_TOKEN")
OPENAI_API_KEY = getenv("OPENAI_API_KEY")


def minify_html(html_content):
    """
    Minifies HTML content by removing style tags and comments.
    """
    soup = BeautifulSoup(html_content, 'lxml')
    
    # Remove all <style> tags
    for style_tag in soup.find_all('style'):
        style_tag.decompose()
    
    # Remove all HTML comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()
        
    return str(soup)

# # Example usage:
# html_doc = """
# <!DOCTYPE html>
# <html>
# <head>
#     <title>Example Page</title>
#     <style>
#         body {
#             font-family: Arial, sans-serif;
#             color: #333;
#         }
#     </style>
# </head>
# <body>
#     <h1>This is a heading</h1>
#     <p>This is a paragraph.</p>
#     <div>
#         <p>Another paragraph in a div.</p>
#         </div>
# </body>
# </html>
# """
#
# minified_doc = minify_html(html_doc)
# print(minified_doc)


class PlaywrightAgent:
    """
    An agent that uses Playwright to navigate and interact with web pages,
    guided by a smolagents ToolCallingAgent.
    """

    def __init__(
        self,
        user: Dict[str, Any],
        user_data: List[Dict[str, Any]],
        model_provider: ModelProvider = "gemini",
        model_id: Optional[str] = None,
        headless: bool = False,
    ):
        self.user_data_str = json.dumps(self._process_user_data(user, user_data), indent=2)
        self.headless = headless
        self.model = self._initialize_model(model_provider, model_id)
        self.agent = self._initialize_agent()
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    def _process_user_data(self, user: Dict[str, Any], user_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Processes raw user and document data into a clean, JSON-serializable format
        that is easy for the language model to understand and use.
        It specifically handles and simplifies MongoDB/BSON date objects.
        """
        processed_data = {"documents": {}}
        for doc in user_data:
            title = doc.get("title", "unknown_document")
            processed_data["documents"][title] = {
                "filename": doc.get("filename"),
                "s3_url": doc.get("s3_url"),
                "verified": doc.get("verified"),
            }

        # Clean the user dictionary to simplify complex data types (e.g., BSON dates)
        # for easier use by the LLM.
        # cleaned_user = {}
        # for key, value in user.items():
        #     if isinstance(value, dict) and "$date" in value:
        #         cleaned_user[key] = value["$date"]
        #     else:
        #         cleaned_user[key] = value
        # 
        processed_data.update(user)

        return processed_data

    def _initialize_model(self, model_provider: ModelProvider, model_id: Optional[str]):
        """Initializes the language model based on the provider."""
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
                model_id=model_id or "meta-llama/Meta-Llama-3-70B-Instruct",
                token=HF_TOKEN,
            )
        elif model_provider == "openai":
            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY environment variable not set.")
            return LiteLLMModel(
                model_id=model_id or "openai/gpt-4o-mini",
                api_key=OPENAI_API_KEY,
            )
        else:
            raise ValueError(f"Unsupported model provider: {model_provider}")

    def _initialize_agent(self) -> ToolCallingAgent:
        """Initializes the smolagents ToolCallingAgent with browser control tools."""
        system_prompt = self._construct_system_prompt()

        def take_screenshot(step_log: ActionStep, agent: ToolCallingAgent):
            """
            Callback to take a screenshot after each step.
            It tries to capture the element related to the last action,
            falling back to a full-page screenshot.
            The image is compressed to save tokens.
            """
            if not self.page:
                logger.warning("Browser not running, cannot take screenshot.")
                return

            selector = "body"  # Default to full page
            try:
                if step_log.action and hasattr(step_log.action, 'tool_input') and 'selector' in step_log.action.tool_input:
                    selector = step_log.action.tool_input['selector']
            except Exception:
                pass # Keep default selector if action details are not available

            try:
                # Take screenshot of the element or the full page
                screenshot_bytes = self.page.locator(selector).screenshot()
                
                # Compress the image
                image = Image.open(BytesIO(screenshot_bytes))
                output_buffer = BytesIO()
                image.save(output_buffer, format='JPEG', quality=50)
                compressed_image_bytes = output_buffer.getvalue()
                
                final_image = Image.open(BytesIO(compressed_image_bytes))

                logger.info(f"Captured screenshot of '{selector}': {final_image.size} pixels")
                step_log.observations_images = [final_image.copy()]

            except Exception as e:
                logger.error(f"Failed to take screenshot for selector '{selector}': {e}")
                # Fallback to a full-page screenshot if the selector fails
                try:
                    screenshot_bytes = self.page.screenshot()
                    image = Image.open(BytesIO(screenshot_bytes))
                    output_buffer = BytesIO()
                    image.save(output_buffer, format='JPEG', quality=50)
                    compressed_image_bytes = output_buffer.getvalue()
                    final_image = Image.open(BytesIO(compressed_image_bytes))
                    
                    logger.info(f"Captured a browser screenshot (full page fallback): {final_image.size} pixels")
                    step_log.observations_images = [final_image.copy()]
                except Exception as e2:
                    logger.error(f"Failed to take full page screenshot: {e2}")

        @tool
        def open_url(url: str) -> str:
            """
            Navigates to a specific URL in the browser.

            Args:
                url (str): The fully qualified URL to navigate to.

            Returns:
                str: A confirmation message indicating success or failure.
            """
            return self.open_url(url)

        @tool
        def get_current_url() -> str:
            """
            Returns the current URL of the browser page.

            Args:
                None

            Returns:
                str: The current URL, or an error message if the browser is not active.
            """
            return self.get_current_url()

        @tool
        def get_html_content(selector: str = "body") -> str:
            """
            Returns the HTML content of the page, optionally filtered by a CSS selector.
            Use a selector to focus on relevant parts of the page.

            Args:
                selector (str, optional): A CSS selector to filter the HTML content.
                                          Defaults to "body".

            Returns:
                str: The inner HTML of the selected element, or an error message.
            """
            return self.get_html_content(selector)

        @tool
        def get_text_content(selector: str) -> str | None:
            """
            Returns the text content of an element, filtered by a CSS selector.

            Args:
                selector (str): A CSS selector to specify the element.

            Returns:
                str | None: The text content of the element, or an error message.
            """
            return self.get_text_content(selector)

        @tool
        def click_element(selector: str, description: str) -> str:
            """
            Clicks an element on the page identified by a CSS selector.

            Args:
                selector (str): The CSS selector of the element to click.
                description (str): An explanation of why this element is being clicked.

            Returns:
                str: A confirmation message indicating success or failure.
            """
            return self.click_element(selector, description)

        @tool
        def fill_input(selector: str, text: str, description: str) -> str:
            """
            Fills an input field on the page with the given text.

            Args:
                selector (str): The CSS selector of the input field.
                text (str): The text to fill into the input field.
                description (str): An explanation of what is being filled in and why.

            Returns:
                str: A confirmation message indicating success or failure.
            """
            return self.fill_input(selector, text, description)

        @tool
        def select_option(selector: str, value: str, description: str) -> str:
            """
            Selects an option in a dropdown (select element).

            Args:
                selector (str): The CSS selector of the select element.
                value (str): The value of the option to select.
                description (str): An explanation of what is being selected and why.

            Returns:
                str: A confirmation message indicating success or failure.
            """
            return self.select_option(selector, value, description)

        @tool
        def check_element(selector: str, checked: bool, description: str) -> str:
            """
            Checks or unchecks a checkbox or radio button.

            Args:
                selector (str): The CSS selector of the checkbox or radio button.
                checked (bool): The desired state (True for checked, False for unchecked).
                description (str): An explanation of what is being checked/unchecked and why.

            Returns:
                str: A confirmation message indicating the action taken.
            """
            return self.check_element(selector, checked, description)

        @tool
        def scroll(direction: Literal["up", "down"]) -> str:
            """
            Scrolls the page up or down.

            Args:
                direction (Literal["up", "down"]): The direction to scroll.

            Returns:
                str: A message indicating the scroll direction.
            """
            return self.scroll(direction)

        @tool
        def go_back() -> str:
            """
            Navigates to the previous page in the browser history.

            Args:
                None

            Returns:
                str: A confirmation message.
            """
            return self.go_back()

        @tool
        def go_forward() -> str:
            """
            Navigates to the next page in the browser history.

            Args:
                None

            Returns:
                str: A confirmation message.
            """
            return self.go_forward()

        @tool
        def wait_for_element(selector: str, timeout: int = 5000) -> str:
            """
            Waits for an element to be visible on the page.

            Args:
                selector (str): The CSS selector of the element to wait for.
                timeout (int, optional): The maximum time to wait in milliseconds.
                                         Defaults to 5000.

            Returns:
                str: A message indicating whether the element is visible or an error occurred.
            """
            return self.wait_for_element(selector, timeout)

        tools = [
            open_url,
            get_current_url,
            get_html_content,
            get_text_content,
            click_element,
            fill_input,
            select_option,
            check_element,
            scroll,
            go_back,
            go_forward,
            wait_for_element,
            FinalAnswerTool(),
            UserInputTool(),
            VisitWebpageTool(),
            # output_save_to_file,
            brave_search_tool

        ]
        return ToolCallingAgent(
            tools=tools,
            model=self.model,
            instructions= system_prompt,
            add_base_tools=False,
            step_callbacks = [take_screenshot]
        )

    def _construct_system_prompt(self) -> str:
        """Constructs the detailed system prompt for the agent."""
        return f"""
        You are an expert web automation assistant. Your goal is to complete a task on a website
        by intelligently using the provided tools to control a web browser.

        **User Data:**
        You have access to the following user data. Use this information to fill out forms,
        answer questions, or make decisions during the web automation task. Do not ask the user for information
        that is already available here.
        ```json
        {self.user_data_str}
        ```

        **Workflow:**
        1.  Start by navigating to the initial URL using the `open_url` tool.
        2.  Analyze the webpage content using `get_html_content`.
        3.  Use `get_html_content` with a CSS selector to focus on specific parts of the page,
            like a form or a specific div, to avoid analyzing large, irrelevant HTML sections.
            Use `get_text_content` to extract specific text from an element.
        4.  If the HTML is complex or you are unsure what to do, use your take_screenshot callback to get a
            visual representation of the page in the step log. In general stop your action after each button 
            click to see what happens on your screenshot.
            The image will be provided to you for analysis.
        5.  When you encounter a form, use the provided user data to fill in the fields.
            Use the `fill_input` tool for text fields, `select_option` for dropdowns, and
            `check_element` for checkboxes or radio buttons.
        6.  Use `wait_for_element` if you need to wait for a specific element to appear on the page.
        7.  Based on your analysis, decide the next action (e.g., `click_element`, `fill_input`, `select_option`).
        8.  Continue this process step-by-step until the user's goal is achieved.
        9.  If you are stuck or need clarification on information not present in the user data, use the `ask_user` tool.
        10. When the task is complete, respond with a summary of what you have done.
        """

    def start_browser(self):
        """Starts the Playwright browser and creates a new page."""
        if self.browser is None:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(headless=self.headless)
            self.page = self.browser.new_page()
            logger.info("Browser started.")

    def close_browser(self):
        """Closes the Playwright browser."""
        if self.browser:
            self.browser.close()
            self.playwright.stop()
            self.browser = None
            self.page = None
            logger.info("Browser closed.")

    # --- Browser Tools for the Agent ---

    def open_url(self, url: str) -> str:
        """Navigates to a specific URL in the browser."""
        if not self.page:
            return "Error: Browser is not running. Call start_browser() first."
        self.page.goto(url)
        return f"Successfully navigated to {url}."

    def get_current_url(self) -> str:
        """Returns the current URL of the browser page."""
        if not self.page:
            return "Error: Browser is not running."
        return self.page.url

    def get_html_content(self, selector: str = "body") -> str:
        """
        Returns the HTML content of the page, optionally filtered by a CSS selector.
        Use a selector to focus on relevant parts of the page.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            # 25_000 is ~ 5k tokens per webpage
            return minify_html(self.page.locator(selector).inner_html())[:25_000]
        except Exception as e:
            return f"Error getting HTML for selector '{selector}': {e}"

    def get_text_content(self, selector: str) -> str | None:
        """
        Returns the text content of an element, filtered by a CSS selector.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            return self.page.locator(selector).text_content()
        except Exception as e:
            return f"Error getting text for selector '{selector}': {e}"

    def click_element(self, selector: str, description: str) -> str:
        """
        Clicks an element on the page identified by a CSS selector.
        'description' should explain why you are clicking this element.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            self.page.locator(selector).click()
            return f"Successfully clicked element with selector: {selector}"
        except Exception as e:
            return f"Error clicking element with selector '{selector}': {e}"

    def fill_input(self, selector: str, text: str, description: str) -> str:
        """
        Fills an input field on the page with the given text.
        'description' should explain what you are filling in and why.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            self.page.locator(selector).fill(text)
            return f"Successfully filled input '{selector}' with text."
        except Exception as e:
            return f"Error filling input with selector '{selector}': {e}"

    def select_option(self, selector: str, value: str, description: str) -> str:
        """
        Selects an option in a dropdown (select element).
        'description' should explain what you are selecting and why.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            self.page.locator(selector).select_option(value)
            return f"Successfully selected option '{value}' in '{selector}'."
        except Exception as e:
            return f"Error selecting option in '{selector}': {e}"

    def check_element(self, selector: str, checked: bool, description: str) -> str:
        """
        Checks or unchecks a checkbox or radio button.
        'description' should explain what you are checking/unchecking and why.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            self.page.locator(selector).set_checked(checked)
            status = "checked" if checked else "unchecked"
            return f"Successfully {status} element '{selector}'."
        except Exception as e:
            return f"Error checking element '{selector}': {e}"

    def scroll(self, direction: Literal["up", "down"]) -> str:
        """Scrolls the page up or down."""
        if not self.page:
            return "Error: Browser is not running."
        if direction == "down":
            self.page.evaluate("window.scrollBy(0, window.innerHeight)")
            return "Scrolled down."
        else:
            self.page.evaluate("window.scrollBy(0, -window.innerHeight)")
            return "Scrolled up."

    def go_back(self) -> str:
        """Navigates to the previous page in the browser history."""
        if not self.page:
            return "Error: Browser is not running."
        self.page.go_back()
        return "Navigated back."

    def go_forward(self) -> str:
        """Navigates to the next page in the browser history."""
        if not self.page:
            return "Error: Browser is not running."
        self.page.go_forward()
        return "Navigated forward."

    def wait_for_element(self, selector: str, timeout: int = 5000) -> str:
        """
        Waits for an element to be visible on the page.
        'timeout' is in milliseconds.
        """
        if not self.page:
            return "Error: Browser is not running."
        try:
            self.page.wait_for_selector(selector, state='visible', timeout=timeout)
            return f"Element '{selector}' is visible."
        except Exception as e:
            return f"Error waiting for element '{selector}': {e}"

    def run(self, prompt: str):
        """
        Runs the agent to complete a given task.

        Args:
            prompt: The initial prompt or goal for the agent.
        """
        self.start_browser()
        try:
            final_answer = self.agent.run(prompt)
            logger.info(f"Agent finished with final answer: {final_answer}")
        except Exception as e:
            logger.error(f"An error occurred during agent execution: {e}")
        finally:
            self.close_browser()


# --- High-Level Runner Function ---
DEFAULT_PROMPT_INSTRUCTIONS = (
    "Your goal is to apply for a government scheme on the user's behalf. "
    "First, thoroughly explore the website to find the application form. This may involve navigating through menus or clicking on 'Apply Now' buttons. "
    "Once you locate the form, use the provided user data to fill in all the required fields accurately. "
    "If you encounter any fields for which the user data is missing or insufficient, you MUST use the 'ask_user' tool to request the specific information you need. Do not guess or leave fields blank if they seem important. "
    "After filling out the form, proceed to the submission step. Confirm that the application has been submitted successfully."
)

def run_playwright_agent(
    user: Dict[str, Any],
    user_data: List[Dict[str, Any]],
    application_url: str,
    prompt_instructions: str = DEFAULT_PROMPT_INSTRUCTIONS,
    model_provider: ModelProvider = "gemini",
    model_id: Optional[str] = None,
    headless: bool = False,
):
    """
    Initializes and runs the PlaywrightAgent for a specific task.
    This is the primary entry point for using the agent from other modules.

    Args:
        user_data: A list of user documents and data.
        application_url: The starting URL for the web automation task.
        prompt_instructions: The high-level goal for the agent to achieve. Defaults to a detailed
                             set of instructions for applying to government schemes.
        model_provider: The AI model provider to use ('gemini', 'huggingface', 'openai').
        model_id: The specific model ID to use (optional).
        headless: Whether to run the browser in headless mode.
    """
    # Combine the URL and instructions into a single, clear prompt for the agent
    prompt = (
        f"Your first task is to navigate to {application_url}. " if application_url else "Search for relevant indian government scheme application websites corresponding to the following information."
        f"Then, follow these instructions to complete your goal: {prompt_instructions}"
    )

    agent = PlaywrightAgent(
        user=user,
        user_data=user_data,
        model_provider=model_provider,
        model_id=model_id,
        headless=headless,
    )
    agent.run(prompt)


# --- Example Usage ---
if __name__ == "__main__":
    # This block demonstrates how to use the run_playwright_agent function.
    # It will only run when the script is executed directly.
    
    # Example user data
    example_user_data = [
        {
            "_id": "doc1", "status": 1, "user_id": "user123", "title": "Aadhaar Card",
            "filename": "aadhaar.pdf", "s3_url": "s3://bucket/aadhaar.pdf", "verified": True
        },
        {
            "_id": "doc2", "status": 1, "user_id": "user123", "title": "PAN Card",
            "filename": "pan.jpg", "s3_url": "s3://bucket/pan.jpg", "verified": True
        },
    ]

    # example_user= {
    #     "full_name": "Priya Sharma",
    #     "email": "priya.sharma@gmail.com",
    #     "phone": "+919971504957",
    #     "caste": "SC",
    #     "dob": "1970-01-01",
    #     "gender": "Female",
    #     "state": "Delhi",
    #     "address": "Na",
    #     "registered_on": "2025-07-23T10:25:21.982604+00:00",
    #     "last_active": "2025-08-18T12:11:18.812+00:00"
    # }



    # Example 3: Government Scheme Eligibility Check
    print("\n--- Running agent for Government Scheme Eligibility Check ---")
    # # Using a real government scheme page for demonstration
    # scheme_url = ""
    #
    # scheme_instructions = (
    #     "Read the page to understand the eligibility criteria for the 'Pradhan Mantri Matru Vandana Yojana' scheme. "
    #     "Based on the user's data (e.g., caste), determine if the user is likely eligible. "
    #     "Provide a summary of the eligibility criteria and your assessment."
    # )

    example_user= get_collection(Collection.USERS).find_one({'username': 'cyto'}, 
        {
        '_id': 1,
        'username': 1,
       'phone': 1,
       'full_name': 1,
       'email': 1,
       'gender': 1,
       'dob': 1,
       '_id': 1,
       'state': 1,
       }
    )
    if not example_user:
        print("in __main__ test run, user wasnt found")
        exit()

    example_user['phone']= '+911231234560'
    user_id= str(example_user['_id'])

    scheme= get_collection(Collection.SCHEMES).find_one({'slug': 'csss-cus'})
    if not scheme:
        print("in __main__ test run, scheme wasnt found")
        exit()


    scheme= serialize_doc(scheme)
    example_user= serialize_doc(example_user)

    if scheme and scheme.get("applicationProcess"):
        # print("processes: ", scheme["applicationProcess"])
        for process in scheme["applicationProcess"]:
            if process.get("mode") == "Online":
                md_text = process.get("process_md", "")
                urls= re.findall(r'(https?://[^\s]+)', md_text)
                application_url= ''
                if urls:
                    application_url = ', '.join(urls)
                else:
                    print("no urls were there")

                scheme_instructions = (DEFAULT_PROMPT_INSTRUCTIONS + 
                    "Here are some information about the scheme to be applied to:" +
                    str(scheme)

                )
                user_docs = list(get_collection(Collection.USER_DOCUMENTS).find({"user_id": user_id}))

                print("inputs gonna be: ")
                print("\nuser: \n", example_user)
                print("\nuser data: \n", example_user_data)
                print("\napplication url: \n", application_url)
                print("\nprompt instructions: \n", scheme_instructions)
                # run_playwright_agent(
                #     user= example_user,
                #     user_data=example_user_data,
                #     application_url=application_url,
                #     prompt_instructions=scheme_instructions,
                #     headless=False,
                #     model_id="gemini-2.5-flash"
                #     # model_id="gpt-4.1-mini",
                #     # model_provider="openai"
                # )
            else:
                print('process not online')
    else:
        print('no scheme or no application process in scheme')


