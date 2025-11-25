"""
NSE News Scraper

Scrapes market news from mystocks.co.ke
"""

import os
from typing import Dict, Any, List
from .utils import fetch_html, parse_html, save_to_json, load_from_json, get_timestamp

MYSTOCKS_URL = "https://live.mystocks.co.ke/"

# Get absolute path to data directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'data', 'nse'))


def parse_news_items(html: str, limit: int = 20) -> List[Dict[str, str]]:
    """
    Parse news items from HTML
    
    Args:
        html: HTML content from mystocks.co.ke
        limit: Maximum number of news items to return
        
    Returns:
        List of news item dictionaries with structure:
        [
            {
                'headline': 'CBK Strips PayU Kenya...',
                'url': 'https://live.mystocks.co.ke/news=123',
                'source': 'The Kenyan Wall Street',
                'timestamp': 'Yesterday, 10:33 pm'
            },
            ...
        ]
    """
    soup = parse_html(html)
    news_items = []
    
    news_div = soup.find('div', id='otherNewsDiv')
    if not news_div:
        return news_items
    
    news_heads = news_div.find_all('div', class_='newsHead')
    
    for item in news_heads[:limit]:
        link = item.find('a')
        source_time = item.find('span')
        
        if link:
            headline = link.text.strip()
            url = link.get('href', '')
            
            # Make URL absolute if it's relative
            if url and not url.startswith('http'):
                url = f"https://live.mystocks.co.ke{url}"
            
            # Parse source and timestamp
            source = ''
            timestamp = ''
            if source_time:
                source_text = source_time.text.strip()
                # Try to split source from timestamp
                # Format is usually: "Source Yesterday, 10:33 pm" or "Source Mon, 9:30 pm"
                parts = source_text.split()
                
                # Look for time indicators (Yesterday, Today, day names, etc.)
                time_indicators = ['Yesterday', 'Today', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                time_start_idx = -1
                
                for idx, part in enumerate(parts):
                    if any(indicator in part for indicator in time_indicators):
                        time_start_idx = idx
                        break
                
                if time_start_idx > 0:
                    source = ' '.join(parts[:time_start_idx])
                    timestamp = ' '.join(parts[time_start_idx:])
                else:
                    # Fallback: assume last 3-4 parts are timestamp
                    if len(parts) > 3:
                        source = ' '.join(parts[:-3])
                        timestamp = ' '.join(parts[-3:])
                    else:
                        source = source_text
            
            news_items.append({
                'headline': headline,
                'url': url,
                'source': source,
                'timestamp': timestamp
            })
    
    return news_items


def scrape_news(limit: int = 20) -> Dict[str, Any]:
    """
    Scrape news from mystocks.co.ke
    
    Args:
        limit: Maximum number of news items to scrape
        
    Returns:
        Dictionary containing news data and metadata:
        {
            'news': [...],
            'count': 10,
            'timestamp': '2025-10-22T03:45:00Z',
            'source': 'https://live.mystocks.co.ke/'
        }
    """
    # Try to fetch fresh data
    html = fetch_html(MYSTOCKS_URL)
    
    if not html:
        # On failure, try to load cached data only if not in test environment
        # (test environment doesn't have DATA_DIR setup)
        if os.path.exists(DATA_DIR):
            cached = load_from_json(os.path.join(DATA_DIR, 'news.json'))
            if cached:
                print("Using cached news data")
                return cached
        return {
            'news': [],
            'count': 0,
            'timestamp': get_timestamp(),
            'error': 'Failed to fetch data and no cache available'
        }
    
    # Parse the data
    news = parse_news_items(html, limit)
    
    result = {
        'news': news,
        'count': len(news),
        'timestamp': get_timestamp(),
        'source': MYSTOCKS_URL
    }
    
    # Save to JSON
    filepath = os.path.join(DATA_DIR, 'news.json')
    save_to_json(result, filepath)
    
    return result


if __name__ == '__main__':
    print("Scraping NSE news...")
    data = scrape_news(limit=10)
    
    if 'error' in data:
        print(f"Error: {data['error']}")
    else:
        print(f"Scraped {data['count']} news items")
        for item in data['news']:
            print(f"\n  - {item['headline']}")
            print(f"    {item['source']} | {item['timestamp']}")
            print(f"    {item['url']}")
