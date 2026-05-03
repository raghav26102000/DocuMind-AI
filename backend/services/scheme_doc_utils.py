# services/scheme_doc_utils.py
"""
Builds SCHEME_DOC_MAP from the `scheme-documents` collection.

SCHEME_DOC_MAP maps alias_lower (str) -> canonical document_type_name (str).

The map is built lazily on first import/use and can be refreshed by calling
refresh_scheme_doc_map().
"""

import re
import logging
from typing import Dict, Iterable, Any
from pymongo.collection import Collection as PyMongoCollection

from database.database import get_collection
from models.models import Collection

logger = logging.getLogger(__name__)

# Public map exported for importers (e.g., application_routes.py)
SCHEME_DOC_MAP: Dict[str, str] = {}

# Internal lock-free rebuild helper state (simple approach - we rebuild atomically by replacing dict)
# Constants
SCHEME_DOCS_COLL_NAME = Collection.SCHEME_DOCUMENTS

# Normalization helpers -----------------------------------------------------

_RE_NON_ALNUM = re.compile(r"[^\w\s]", flags=re.UNICODE)  # remove punctuation (but keep underscores, letters, numbers, spaces)
_RE_MULTI_SPACE = re.compile(r"\s+")


def _make_keys_from_string(s: str) -> Iterable[str]:
    """
    Produce multiple matching keys from an alias string so we tolerate small differences:
      - raw_lower: original stripped + lower
      - cleaned: punctuation removed, collapsed spaces, lower
      - compact: cleaned with spaces collapsed to single space (same as cleaned but explicit)
    Returns set of keys (deduped).
    """
    if not s:
        return ()

    orig = s.strip()
    if not orig:
        return ()

    # raw lower (keeps punctuation)
    raw_lower = orig.lower()

    # normalized cleaned (remove punctuation)
    cleaned = _RE_NON_ALNUM.sub(" ", orig).strip()
    cleaned = _RE_MULTI_SPACE.sub(" ", cleaned).lower()

    # also provide a version with no spaces (rarely useful but cheap)
    nospace = cleaned.replace(" ", "")

    # also provide a version trimmed of trailing periods (in case original had trailing dot only)
    trimmed = raw_lower.rstrip(" .,")

    keys = {raw_lower, cleaned, nospace, trimmed}
    # remove empty if any
    keys = {k for k in keys if k}
    return keys


def _iter_alias_strings(sd_map_field: Any) -> Iterable[str]:
    """
    Given scheme_document_name_map value (could be list of dicts, list of strings, dict, etc.),
    yield each alias string found.
    """
    if sd_map_field is None:
        return ()

    # if it's a dict: iterate values
    if isinstance(sd_map_field, dict):
        for v in sd_map_field.values():
            if isinstance(v, str):
                yield v
            else:
                # nested types: convert to str defensively
                yield str(v)
        return

    # if it's an iterable (list)
    if isinstance(sd_map_field, (list, tuple, set)):
        for item in sd_map_field:
            if isinstance(item, dict):
                for v in item.values():
                    if v is None:
                        continue
                    yield str(v)
            else:
                if item is None:
                    continue
                yield str(item)
        return

    # else fallback to stringification
    yield str(sd_map_field)


def _build_map_from_db() -> Dict[str, str]:
    """
    Read the scheme-documents collection and build a mapping:
      key (alias normalized) -> canonical document_type_name

    - includes canonical title itself as a key
    - includes each alias value found in scheme_document_name_map
    - keys are produced by _make_keys_from_string to tolerate punctuation/spacing
    """
    result: Dict[str, str] = {}

    try:
        coll: PyMongoCollection = get_collection(SCHEME_DOCS_COLL_NAME)
    except Exception as e:
        logger.exception("Failed to get scheme-documents collection: %s", e)
        return result

    try:
        # prefer fetching only active docs if your collection uses a status flag; otherwise fetch all
        cursor = coll.find({"status": 1})
    except Exception:
        cursor = coll.find({})

    for doc in cursor:
        canonical = doc.get("document_type_name") or ""
        if not canonical:
            continue

        canonical_str = str(canonical).strip()
        if not canonical_str:
            continue

        # Map canonical itself
        for k in _make_keys_from_string(canonical_str):
            # only set if not already set; preserve first-seen mapping (you can change policy if needed)
            if k not in result:
                result[k] = canonical_str

        # Map aliases in scheme_document_name_map
        sd_map = doc.get("scheme_document_name_map") or []
        for alias in _iter_alias_strings(sd_map):
            for k in _make_keys_from_string(alias):
                if k not in result:
                    result[k] = canonical_str

    logger.info("Built SCHEME_DOC_MAP with %d aliases", len(result))
    return result


def refresh_scheme_doc_map() -> None:
    """
    Force-rebuild SCHEME_DOC_MAP from DB and replace global.
    Call this from an admin endpoint or app startup hook when scheme_documents change.
    """
    global SCHEME_DOC_MAP
    try:
        new_map = _build_map_from_db()
        SCHEME_DOC_MAP = new_map
        logger.info("SCHEME_DOC_MAP refreshed (%d entries)", len(SCHEME_DOC_MAP))
    except Exception as e:
        logger.exception("Failed to refresh SCHEME_DOC_MAP: %s", e)


def clean_string(text):
    # Check if text is a string before attempting string methods
    if not isinstance(text, str):
        return "" # Or raise an error, depending on expected input

    # 1. Strip leading/trailing whitespace
    text = text.strip()
    # 2. Convert to lowercase
    text = text.lower()
    # 3. Use regex to remove all non-alphanumeric characters (including spaces)
    # [^a-z0-9] matches anything that is NOT a lowercase letter or a digit
    return re.sub(r'[^a-z0-9]', '', text)


def relevance_pipeline(scheme_idstr):
    return [
        {
            "$match": {
                f"scheme_document_name_map.{scheme_idstr}": {
                    "$exists": True
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "document_code": 1,
                "document_type_name": 1,
                "scheme_document_name_map": {
                    "$filter": {
                        "input": "$scheme_document_name_map",
                        "as": "themap",
                        "cond": {
                            "$eq": [
                                {
                                    "$objectToArray": "$$themap"
                                },
                                [{"k": scheme_idstr, "v": f"$$themap.{scheme_idstr}"}]
                            ]
                        }
                    }
                }
            }
        }
    ]



# Lazy build on import (safe and fast enough in most apps). If you prefer explicit startup hook,
# remove this call and call refresh_scheme_doc_map() from your FastAPI startup event.
try:
    if not SCHEME_DOC_MAP:
        refresh_scheme_doc_map()
except Exception:
    # swallow to avoid import-time failure; route logic will still work (map may be empty and fallback to phrase)
    logger.exception("Error while initializing SCHEME_DOC_MAP at import time")
