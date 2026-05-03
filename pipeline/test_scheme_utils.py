import sys
import os
import pytest
from unittest.mock import patch

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pipeline.myscheme_utils import getEnglishDataFromSlug  # ✅ Correct import path

@patch("pipeline.myscheme_utils.requests.get")  # ✅ Patch the correct module path
def test_get_english_data_success(mock_get):
    mock_response = {
        "data": {
            "en": {
                "title": "Test Scheme",
                "description": "This is a mock scheme"
            }
        }
    }

    class MockRes:
        def raise_for_status(self): pass
        def json(self): return mock_response

    mock_get.return_value = MockRes()

    result = getEnglishDataFromSlug("mock-slug")

    assert result.title == "Test Scheme"
    assert result.description == "This is a mock scheme"