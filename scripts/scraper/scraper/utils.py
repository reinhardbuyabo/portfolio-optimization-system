"""
Utility functions for NSE data scraper
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
from datetime import timezone
from typing import Optional, Dict, Any

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'


def fetch_html(url: str, timeout: int = 10) -> Optional[str]:
    """
    Fetch HTML content from URL with error handling
    
    Args:
        url: The URL to fetch
        timeout: Request timeout in seconds
        
    Returns:
        HTML content as string, or None if request fails
    """
    try:
        headers = {'User-Agent': USER_AGENT}
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        # Validate that we got HTML content, not JSON or other formats
        content_type = response.headers.get('content-type', '')
        if 'application/json' in content_type:
            # Some URLs may return JSON error messages - treat as failure
            return None
        return response.text
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None


def parse_html(html: str) -> BeautifulSoup:
    """
    Parse HTML content with BeautifulSoup
    
    Args:
        html: HTML content as string
        
    Returns:
        BeautifulSoup object
    """
    return BeautifulSoup(html, 'lxml')


def save_to_json(data: Dict[Any, Any], filepath: str) -> bool:
    """
    Save data to JSON file
    
    Args:
        data: Dictionary to save
        filepath: Path to JSON file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        directory = os.path.dirname(filepath)
        if directory:
            os.makedirs(directory, exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving to {filepath}: {e}")
        return False


def load_from_json(filepath: str) -> Optional[Dict[Any, Any]]:
    """
    Load data from JSON file
    
    Args:
        filepath: Path to JSON file
        
    Returns:
        Dictionary with loaded data, or None if file doesn't exist or error
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading from {filepath}: {e}")
        return None


def clean_number(text: str) -> Optional[float]:
    """
    Clean and convert text to float
    
    Args:
        text: String containing number (may have commas, spaces, etc.)
        
    Returns:
        Float value or None if conversion fails
    """
    try:
        if not text or not isinstance(text, str):
            return None
        # Remove commas, spaces, and other non-numeric characters (except . and -)
        cleaned = text.strip().replace(',', '').replace(' ', '')
        if not cleaned:
            return None
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def get_timestamp() -> str:
    """
    Get current timestamp in ISO format
    
    Returns:
        ISO format timestamp string with 'Z' suffix
    """
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def load_html_fixture(filename: str) -> str:
    """
    Load HTML fixture file for testing
    
    Args:
        filename: Name of fixture file
        
    Returns:
        HTML content as string
    """
    fixtures_dir = os.path.join(os.path.dirname(__file__), '..', 'tests', 'fixtures')
    filepath = os.path.join(fixtures_dir, filename)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error loading fixture {filename}: {e}")
        return ""
