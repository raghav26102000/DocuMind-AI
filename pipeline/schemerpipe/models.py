from pydantic import BaseModel, Field, field_validator, AnyUrl
from typing import Any, List, Optional, Union, Dict
from datetime import datetime, timezone
from enum import Enum

class Collection(str, Enum):
    SCHEMES = "schemes"
    SCHEME_DOCUMENTS = "scheme_documents"
    USER_DOCUMENTS = "user_documents"
    USERS = "users"
    REFERENCES = "references"
    PIPELINE_REQUESTS = "pipeline_requests"
    PIPELINE_API_DATA = "pipeline_api_data"
    GLOBAL_SETTINGS = "globalSettings"

class ValueLabelPair(BaseModel):
    """A generic model for objects with 'value' and 'label'."""
    value: Optional[Any] = None  # Made optional to handle missing values
    label: str

    @field_validator('value', mode='before')
    @classmethod
    def handle_missing_value(cls, v):
        """Handle cases where 'value' field is missing"""
        return v


class Reference(BaseModel):
    title: Optional[str] = None  # Made optional to handle missing titles
    url: Union[AnyUrl, str]

    @field_validator('url', mode='before')
    @classmethod
    def validate_url(cls, v):
        """Handle various URL schemes or invalid URLs by keeping them as strings"""
        if isinstance(v, str):
            # If it's a chrome-extension or other non-http scheme, keep as string
            if v.startswith(('chrome-extension://', 'file://', 'ftp://')) or not v.startswith(('http://', 'https://')):
                return v
        return v


class BenefitType(ValueLabelPair):
    """Specific type for benefits (e.g., cash, in-kind)"""
    id: Optional[int] = None




class SchemeContent(BaseModel):
    references: List[Reference] = Field([], description="External links related to the scheme")
    references_metadata: List[dict] = Field([], description="Summary description of the external fields")
    schemeImageUrl: Optional[Union[AnyUrl, str]] = Field(None, description="URL for the scheme's image")
    detailedDescription_md: Optional[str] = Field(None, description="Detailed description in Markdown format")
    benefits_md: Optional[str] = Field(None, description="Benefits in Markdown format")
    exclusions_md: Optional[str] = Field(None, description="Exclusions in Markdown format")
    briefDescription: Optional[str] = Field(None, description="Brief description of the scheme")
    benefitTypes: Optional[BenefitType] = Field(None, description="Type of benefits provided (e.g., Cash)")

    # For schemeImageUrl validation
    @field_validator('schemeImageUrl', mode='before')
    @classmethod
    def convert_empty_string_to_none(cls, v: Any) -> Optional[str]:
        if v == '':
            return None
        # Handle non-http URLs
        if isinstance(v, str) and not v.startswith(('http://', 'https://')):
            return v
        return v


class ApplicationProcessStep(BaseModel):
    mode: Optional[str] = Field(None, description="Mode of application (e.g., 'Online', 'Offline')")
    process_md: Optional[str] = Field(None, description="Steps of the application process in Markdown format")

    # @field_validator('process', mode='before')
    # @classmethod
    # def handle_process_string_or_empty(cls, v):
    #     """Handle process field when it's a string or empty string instead of list"""
    #     if isinstance(v, str):
    #         if v.strip():  # If non-empty string, create a simple text node
    #             return [{"type": "paragraph", "children": [{"text": v}]}]
    #         else:  # If empty string, return empty list
    #             return []
    #     return v if v is not None else []


class EligibilityCriteria(BaseModel):
    eligibilityDescription_md: Optional[str] = Field(None, description="Eligibility criteria in Markdown format")
    # eligibilityDescription: List[RichTextNode] = Field([], description="Eligibility criteria as rich text nodes")


class BasicDetails(BaseModel):
    """Basic details of the scheme from the API"""
    dbtScheme: Optional[bool] = None
    tags: List[str] = []
    schemeName: str = Field(..., description="Scheme name")
    schemeShortTitle: str = Field(..., description="Scheme short title")
    level: Optional[ValueLabelPair] = None
    schemeCategory: List[ValueLabelPair] = Field([], description="Categories the scheme belongs to")
    schemeSubCategory: Optional[List[ValueLabelPair]] = Field(None, description="Sub-categories of the scheme")
    schemeOpenDate: Optional[str] = Field(None, description="Date the scheme opened (e.g., 'YYYY-MM-DD')")
    targetBeneficiaries: List[ValueLabelPair] = Field([], description="Types of beneficiaries targeted by the scheme")
    state: Optional[ValueLabelPair] = Field(None, description="State/UT associated with the scheme")
    nodalDepartmentName: Optional[ValueLabelPair] = Field(None, description="Nodal department responsible for the scheme")

    @field_validator('schemeSubCategory', mode='before')
    @classmethod
    def handle_null_subcategory(cls, v):
        """Convert null to empty list for schemeSubCategory"""
        return v if v is not None else []

    @field_validator('targetBeneficiaries', mode='before')
    @classmethod
    def handle_null_target_beneficiaries(cls, v):
        """Convert null to empty list for targetBeneficiaries"""
        return v if v is not None else []

    @field_validator('tags', mode='before')
    @classmethod
    def handle_null_tags(cls, v):
        """Filter out null values from tags list"""
        if isinstance(v, list):
            return [tag for tag in v if tag is not None]
        return v if v is not None else []


class EnglishContent(BaseModel):
    """English content wrapper"""
    basicDetails: BasicDetails
    schemeContent: Optional[SchemeContent] = None
    applicationProcess: List[ApplicationProcessStep] = Field([], description="List of application process steps")
    schemeDefinitions: List[Any] = Field([], description="Scheme definitions")
    eligibilityCriteria: Optional[EligibilityCriteria] = Field(None, description="Eligibility criteria for the scheme")
    documents_required: Optional[List[str]] = Field(None, description="Documents required for the scheme as simple list of strings")
    documentsRequired_md: Optional[str] = Field(None, description="Documents required for the scheme in Markdown format")

    @field_validator('schemeDefinitions', mode='before')
    @classmethod
    def handle_dict_as_list(cls, v):
        """Convert dict with numeric keys to list for schemeDefinitions"""
        if isinstance(v, dict):
            # If it's a dict with numeric string keys, convert to list
            try:
                # Check if all keys are numeric strings
                numeric_keys = []
                for key in v.keys():
                    if isinstance(key, str) and key.isdigit():
                        numeric_keys.append(int(key))
                    else:
                        # If not all keys are numeric, return as is (will be handled as dict)
                        return [v] if v else []

                # Convert dict to list based on numeric keys
                if numeric_keys:
                    max_key = max(numeric_keys)
                    result = []
                    for i in range(max_key + 1):
                        if str(i) in v:
                            result.append(v[str(i)])
                        else:
                            result.append(None)  # Fill gaps with None
                    return result
            except (ValueError, TypeError):
                # If conversion fails, wrap the dict in a list
                return [v] if v else []

        return v if v is not None else []


class ApiData(BaseModel):
    """Data wrapper from API response"""
    id: str = Field(alias="_id", description="MongoDB ID")
    en: EnglishContent = Field(description="English content")
    slug: str = Field(..., description="URL slug")


class ApiResponse(BaseModel):
    """Complete API response structure"""
    status: str
    statusCode: int
    errorDescription: str
    error: str
    data: ApiData


# --- Main Unified Scheme Model (Flattened for easier use) ---
class GovernmentScheme(BaseModel):
    """Flattened scheme model for easier processing"""
    id: Optional[str] = Field(alias="_id", default=None)

    # Data from basicDetails
    schemeName: str = Field(..., description="Scheme name")
    schemeShortTitle: str = Field(..., description="Scheme short title")
    dbtScheme: Optional[bool] = None
    tags: List[str] = []
    level: Optional[ValueLabelPair] = None
    schemeCategory: List[ValueLabelPair] = Field([], description="Categories the scheme belongs to")
    schemeSubCategory: Optional[List[ValueLabelPair]] = Field(None, description="Sub-categories of the scheme")
    schemeOpenDate: Optional[str] = Field(None, description="Date the scheme opened (e.g., 'YYYY-MM-DD')")
    targetBeneficiaries: List[ValueLabelPair] = Field([], description="Types of beneficiaries targeted by the scheme")
    state: Optional[ValueLabelPair] = Field(None, description="State/UT associated with the scheme")
    nodalDepartmentName: Optional[ValueLabelPair] = Field(None, description="Nodal department responsible for the scheme")

    # Data from schemeContent
    schemeContent: Optional[SchemeContent] = Field(None, description="Content details of the scheme")

    # Application process and eligibility
    applicationProcess: List[ApplicationProcessStep] = Field([], description="List of application process steps")
    eligibilityCriteria: Optional[EligibilityCriteria] = Field(None, description="Eligibility criteria for the scheme")

    # Additional fields
    # documents_required is now populated directly from ApiData.en.documents_required if available
    documents_required: Optional[List[Any]] = Field(None, description="Documents required for the scheme as rich text nodes")
    documentsRequired_md: Optional[str] = Field(None, description="Documents required for the scheme in Markdown format")
    slug: str = Field(..., description="URL slug")
    lastFetchedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def from_api_response(cls, api_response: Union[ApiResponse, Dict]) -> 'GovernmentScheme':
        """Create GovernmentScheme from API response"""
        if isinstance(api_response, dict):
            api_response = ApiResponse(**api_response)

        data = api_response.data
        basic = data.en.basicDetails

        return cls(
            id=data.id,
            schemeName=basic.schemeName,
            schemeShortTitle=basic.schemeShortTitle,
            dbtScheme=basic.dbtScheme,
            tags=basic.tags,
            level=basic.level,
            schemeCategory=basic.schemeCategory,
            schemeSubCategory=basic.schemeSubCategory,
            schemeOpenDate=basic.schemeOpenDate,
            targetBeneficiaries=basic.targetBeneficiaries,
            state=basic.state,
            nodalDepartmentName=basic.nodalDepartmentName,
            schemeContent=data.en.schemeContent,
            applicationProcess=data.en.applicationProcess,
            eligibilityCriteria=data.en.eligibilityCriteria,
            documents_required=data.en.documents_required,
            documentsRequired_md=data.en.documentsRequired_md,
            slug=data.slug
        )

    class Config:
        populate_by_name = True
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


# Example usage:
"""
# Parse the JSON response
json_data = {...}  # Your JSON data
api_response = ApiResponse(**json_data)

# Or create a flattened scheme directly
scheme = GovernmentScheme.from_api_response(json_data)
"""

required_fields= [
        ('title', 'The title or the name of the scheme', 'string', 'unknown'),
        ('objective', 'The objective of the scheme, the scope, and validity', 'string', 'unknown'),
        ('eligibility_income_criteria', 'The list of conditions and income criteria one must satisfy for being eligible in this scheme', 'list[string]', '[]'),
        ('scheme_verticals', 'How the assistance is provided', 'string', 'unknown'),
        ('conditions', 'The key conditions for the beneficiaries', 'list[string]', '[]'),
        ('documents_required', 'The list of documents that are required to avail the scheme', 'list[string]', '[]'),
        ('application_howto', 'What the application process is, step by step, for each vertical', 'string', 'unknown'),
        #('female_ownership_required', 'Does the benefit acquired from the scheme have to be in the name of a woman, ie, the female adult head of the family', 'boolean', 'false'),
        ('application_status_howto', 'What are the steps to track the status of the benefits in the scheme', 'string', 'unknown'),
        ('preferences', 'What are the special preferences given to specific categories of applicants', 'string', 'unknown'),
        ('links', 'What are the hypertext transfer protocol (http://) links one needs to look at for more information on the scheme', 'list[string]', 'unknown'),
]
