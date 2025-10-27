"""
Tests for NSE news scraper
"""

import pytest
from scraper.news import parse_news_items, scrape_news


def test_parse_news_items_extracts_headlines():
    """Test parsing news headlines from HTML"""
    html = """
    <html>
        <body>
            <div id="otherNewsDiv">
                <div class="newsHead">
                    <a href="/news=123">Test Headline 1</a>
                    <span>Business Daily Mon, 9:30 pm</span>
                </div>
                <div class="newsHead">
                    <a href="/news=456">Test Headline 2</a>
                    <span>Capitalfm.co.ke Yesterday, 10:33 pm</span>
                </div>
            </div>
        </body>
    </html>
    """
    news = parse_news_items(html)
    
    assert len(news) == 2
    assert news[0]['headline'] == "Test Headline 1"
    assert news[0]['source'] == "Business Daily"
    assert 'url' in news[0]
    assert 'timestamp' in news[0]


def test_parse_news_items_limits_results():
    """Test that news parsing can limit results"""
    html = """
    <html>
        <body>
            <div id="otherNewsDiv">
                <div class="newsHead"><a href="/news=1">Headline 1</a><span>Source 1 Today</span></div>
                <div class="newsHead"><a href="/news=2">Headline 2</a><span>Source 2 Today</span></div>
                <div class="newsHead"><a href="/news=3">Headline 3</a><span>Source 3 Today</span></div>
                <div class="newsHead"><a href="/news=4">Headline 4</a><span>Source 4 Today</span></div>
                <div class="newsHead"><a href="/news=5">Headline 5</a><span>Source 5 Today</span></div>
            </div>
        </body>
    </html>
    """
    news = parse_news_items(html, limit=3)
    
    assert len(news) == 3


def test_parse_news_items_handles_empty_div():
    """Test handling of empty news div"""
    html = """
    <html>
        <body>
            <div id="otherNewsDiv">
            </div>
        </body>
    </html>
    """
    news = parse_news_items(html)
    
    assert news == []


def test_parse_news_items_handles_missing_div():
    """Test handling of missing news div"""
    html = "<html><body></body></html>"
    news = parse_news_items(html)
    
    assert news == []


def test_scrape_news_returns_dict():
    """Test that scrape_news returns proper structure"""
    result = scrape_news(limit=5)
    
    assert isinstance(result, dict)
    assert 'news' in result
    assert 'count' in result
    assert 'timestamp' in result
    assert isinstance(result['news'], list)


def test_scrape_news_handles_network_failure(monkeypatch):
    """Test graceful handling of network failures"""
    def mock_fetch_html(*args, **kwargs):
        return None
    
    def mock_load_from_json(*args, **kwargs):
        return None
    
    monkeypatch.setattr('scraper.news.fetch_html', mock_fetch_html)
    monkeypatch.setattr('scraper.news.load_from_json', mock_load_from_json)
    
    result = scrape_news()
    
    assert 'error' in result
    assert result['news'] == []
    assert 'timestamp' in result
