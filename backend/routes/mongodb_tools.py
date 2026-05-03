from datetime import datetime
import json
from typing import Optional # Added Optional for type hints

from database.database import get_db
from models.models import Collection, SCHEME_CATEGORIES
from pathlib import Path
import os
from smolagents import tool
from .user_document_routes import serialize_doc

# Initialize DB connection (assuming it's handled elsewhere, e.g., in main.py or through dependency injection)
db = get_db()

SCHEMES_CACHE_FILE = Path(__file__).parent.parent / "schemes_cache.json"


@tool
def get_schemes_info(
    keyword: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    state: Optional[str] = None
) -> str:
    """
    Retrieves and returns information about all cached or filtered (recommended) government schemes.

    This tool reads the pre-cached scheme data from 'schemes_cache.json' if no
    filters are provided. If filters (keyword, category, tag, state) are provided,
    it queries the 'schemes' collection in MongoDB to find matching schemes.
    It's useful for providing the LLM with an overview of available schemes
    and their slugs and brief descriptions, enabling it to identify relevant
    schemes based on a user's query.

    Args:
        keyword (Optional[str]): General search query for scheme name or description.
        category (Optional[str]): Filter by scheme category label. Allowed inputs are: [
            "Business & Entrepreneurship",
            "Science, IT & Communications",
            "Agriculture,Rural & Environment",
            "Travel & Tourism",
            "Skills & Employment",
            "Utility & Sanitation",
            "Transport & Infrastructure",
            "Social welfare & Empowerment",
            "Women and Child",
            "Health & Wellness",
            "Education & Learning",
            "Sports & Culture",
            "Housing & Shelter",
            "Banking,Financial Services and Insurance",
            "Public Safety,Law & Justice"
        ]
        tag (Optional[str]): Filter by tags. (Short words preferable for better text search)
        state (Optional[str]): Filter by state label.

    Returns:
        str: A JSON string representing a list of dictionaries, where each
             dictionary contains 'id', 'name', 'description', and 'slug'
             for a scheme. Returns an empty JSON array if no schemes
             match the filters or if the cache file is not found/empty/invalid.
    """
    if any([keyword, category, tag, state]):
        if db is None:
            return json.dumps({"error": "Database connection not established."})

        query_filter = {}

        if keyword:
            query_filter["$or"] = [
                {"schemeName": {"$regex": keyword, "$options": "i"}},
                {"schemeContent.briefDescription": {"$regex": keyword, "$options": "i"}},
                {"schemeContent.detailedDescription_md": {"$regex": keyword, "$options": "i"}}
            ]

        if category:
            query_filter["schemeCategory.label"] = category
        if state:
            query_filter["state.label"] = state
        if tag:
            query_filter["tags"] = tag

        projection = {
            "_id": 1,
            "slug": 1,
            "schemeName": 1,
            "schemeContent.briefDescription": 1,
        }

        try:
            schemes_cursor = db[Collection.SCHEMES].find(query_filter, projection)
            schemes_data = []
            for scheme in schemes_cursor:
                schemes_data.append({
                    'id': str(scheme['_id']),
                    'name': scheme.get('schemeName', ''),
                    'description': scheme.get('schemeContent', {}).get('briefDescription', ''),
                    'slug': scheme.get('slug', '')
                })
            return json.dumps(schemes_data, indent=2)
        except Exception as e:
            # Log the error for debugging purposes
            print(f"Error fetching filtered schemes: {e}")
            return json.dumps([]) # Return empty list on database error
    else:
        # Existing logic for reading from cache when no filters are provided
        if SCHEMES_CACHE_FILE.exists() and os.path.getsize(SCHEMES_CACHE_FILE) > 0:
            try:
                with open(SCHEMES_CACHE_FILE, 'r') as f:
                    cached_data = json.load(f)
                return json.dumps(cached_data, indent=2)
            except json.JSONDecodeError:
                return json.dumps([]) # Return empty list if JSON is invalid
        return json.dumps([]) # Return empty list if file doesn't exist or is empty


@tool
def get_scheme_by_slug(scheme_slug: str) -> str:
    """
    Fetches detailed information for a specific government scheme by its slug.

    This tool queries the 'schemes' collection in MongoDB to retrieve
    all available details for a scheme matching the provided slug.
    It's essential for providing the LLM with the full context of a
    particular scheme when the user's query is known to be about it.

    Args:
        scheme_slug (str): The unique slug identifier for the government scheme.

    Returns:
        str: A JSON string representation of the scheme document if found,
             otherwise an empty JSON object. Datetime objects are converted
             to ISO 8601 strings for serialization.
    """
    if db is None:
        return json.dumps({"error": "Database connection not established."})

    scheme = db[Collection.SCHEMES].find_one({'slug': scheme_slug})
    if scheme:
        # MongoDB ObjectId is not JSON serializable, convert it to string
        scheme['_id'] = str(scheme['_id'])
        return json.dumps(serialize_doc(scheme), indent=2)
    return json.dumps({})


@tool
def get_references_by_slug(scheme_slug: str) -> str:
    """
    Retrieves all reference documents associated with a given scheme slug.

    This tool queries the 'references' collection in MongoDB for documents
    that contain the specified scheme slug in their 'slugs' array.
    These references often contain unstructured text or additional
    information relevant to the scheme, which can be used by the LLM
    for Retrieval-Augmented Generation (RAG).

    Args:
        scheme_slug (str): The unique slug identifier for the government scheme.

    Returns:
        str: A JSON string representing a list of reference documents. Each
             document includes its '_id' (converted to string) and 'content'.
             Returns an empty JSON array if no references are found or
             if the database connection is not established.
    """
    if db is None:
        return json.dumps({"error": "Database connection not established."})

    references_cursor = db[Collection.REFERENCES].find({'slugs': {"$in": [scheme_slug]}})

    references_data = []
    for ref in references_cursor:
        # Convert ObjectId to string and only include relevant fields for the LLM
        references_data.append({
            'id': str(ref['_id']),
            'content': ref.get('content', '') # Assuming 'content' field exists
        })
    return json.dumps(references_data, indent=2)


if __name__ == "__main__":
    print(get_scheme_by_slug("nbcfdc-gls"))
    print(get_references_by_slug("nbcfdc-gls"))
