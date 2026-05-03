import asyncio
from dotenv import load_dotenv
load_dotenv()
from browser_use import Agent
from browser_use.llm import ChatOpenAI

async def research(prompt: str | None= None):
    if prompt is None:
        #prompt= "I am a 22 year old general male. My name is John Doe, my Phone number is 8752012846, and address is 54, Club Road, Punjabi Bagh, New Delhi. Apply for my learners licence. pause wherever you see captcha, i'll solve it manually"
        prompt= """I am a 22 year old tribal male. My name is Nirav Modi, my Phone number is 8752012846, and address is 54, Sabarmati, Ahmedabad, Gujarat. Its 19 august 2025 right now. I want to apply in "Term Loan Scheme (GNDTDC)" scheme

        Please fill the form accordingly, pause whenever the information is inadequate.

        This is the process details for application to the scheme:
        **Step 1: Visit the Official Portal**

- Go to the [Official Website](https://gndcdconline.gujarat.gov.in/) Gujarat Nomadic and Denotified Tribes Development Corporation.- Scroll down on the homepage, find the &quot;Term Loan&quot; and click on &quot;Apply Now&quot;.
- You will be directed to the application form.

**Step 2: Access and Fill Out the Application Form**

- Complete all sections under &quot;Applicant information,&quot; including full name, father/husband&#39;s name, gender, complete address details, contact numbers, Aadhaar No., parents/husband/guardian occupation and income details. Also provide Date of Birth, Age, Caste, and Subspecies. Also, if you are disabled and provide a percentage.
- If you have taken a past loan, select &quot;Yes&quot; or &quot;No&quot;. If you selected &quot;Yes&quot;, provide loan details (date, amount, paid, remaining) and your account number.
- Provide bank account number, bank name, branch name, name as per account, account type (Saving/Current), MICR code, and IFSC code.

**Step 3: Upload Documents**

- Go to &quot;Upload Photo&quot; in the menu, then upload your photograph and signature (each file less than 15 KB). Click &quot;Save Photo and Signature&quot;
- Navigate to &quot;Upload Document&quot; in the menu and upload all required files (PDF, JPG, JPEG, PNG only).

**Step 4: Review and Final Submission**

- Carefully review each module. Use the preview option to examine the application before final submission. Fill out the provided &quot;CAPTCHA&quot; and Click on “Submit”.

**Track and Review Status**

- Applicant will receive an Application ID/Reference Number. Save or print the acknowledgement for future tracking.
- Go to the [Official Website](https://gndcdconline.gujarat.gov.in/) Gujarat Nomadic and Denotified Tribes Development Corporation.- Scroll down and locate the Know App Status. Click on &quot;Know App Status&quot;.
- Select the Scheme name, Enter App No., and Birth Date. Fill out the Captcha and click on Submit.

<br>





----------
this is the eligibility:

1. The applicant should be a resident of Gujarat.
1. The applicant should belong to the Nomadic Tribe or Denotified Tribe.
1. The applicant&#39;s family&#39;s annual income should not exceed ₹3,00,000/-.
1. The applicant&#39;s age should be between 21 to 50 years on the date of application.
1. The applicant must have experience in the proposed trade/business.
1. The applicant will have to provide suitable collateral to get the loan.

**Note:** At least 50% of the total loan amount under this scheme will be specifically allocated to families with an annual income of up to ₹1,50,000/-.
<br>



        pause wherever you see captcha, i'll solve it manually
        """

    agent = Agent(
        task= prompt,
        llm=ChatOpenAI(model="gpt-4.1-mini"),
    )
    await agent.run()


asyncio.run(research())
