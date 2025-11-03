"""
Tests for scraper utility functions
"""

import pytest
from scraper.utils import (
    fetch_html,
    parse_html,
    save_to_json,
    load_from_json,
    clean_number,
    get_timestamp
)


def test_clean_number_with_comma():
    """Test cleaning numbers with commas"""
    assert clean_number("1,234.56") == 1234.56


def test_clean_number_with_spaces():
    """Test cleaning numbers with spaces"""
    assert clean_number("  123.45  ") == 123.45


def test_clean_number_negative():
    """Test cleaning negative numbers"""
    assert clean_number("-45.67") == -45.67


def test_clean_number_invalid():
    """Test that invalid input returns None"""
    assert clean_number("not a number") is None
    assert clean_number("") is None


def test_get_timestamp_format():
    """Test that timestamp is in ISO format"""
    timestamp = get_timestamp()
    assert isinstance(timestamp, str)
    assert timestamp.endswith('Z')
    assert 'T' in timestamp


def test_parse_html_returns_beautifulsoup():
    """Test that parse_html returns BeautifulSoup object"""
    html = "<html><body><p>Test</p></body></html>"
    soup = parse_html(html)
    assert soup.find('p').text == "Test"


def test_save_and_load_json(tmp_path):
    """Test saving and loading JSON data"""
    data = {'test': 'data', 'number': 123}
    filepath = tmp_path / "test.json"
    
    # Save
    result = save_to_json(data, str(filepath))
    assert result is True
    
    # Load
    loaded = load_from_json(str(filepath))
    assert loaded == data


def test_load_json_nonexistent_file():
    """Test loading from non-existent file returns None"""
    result = load_from_json("/nonexistent/file.json")
    assert result is None


def test_fetch_html_invalid_url():
    """Test that fetching from invalid URL returns None"""
    result = fetch_html("http://invalid-url-that-does-not-exist.com")
    assert result is None
