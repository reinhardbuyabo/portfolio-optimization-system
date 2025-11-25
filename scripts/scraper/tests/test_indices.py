"""
Tests for NSE indices scraper
"""

import pytest
from scraper.indices import parse_index_data, scrape_indices


def test_parse_index_data_extracts_nasi():
    """Test parsing NASI index from HTML"""
    html = """
    <html>
        <body>
            <div id="hpIndices">
                <table>
                    <tr>
                        <td>^NASI</td>
                        <td>177.72 1.33 0.75%</td>
                    </tr>
                </table>
            </div>
        </body>
    </html>
    """
    indices = parse_index_data(html)
    
    assert 'NASI' in indices
    assert 'value' in indices['NASI']
    assert 'change' in indices['NASI']
    assert 'change_percent' in indices['NASI']
    assert indices['NASI']['value'] == 177.72


def test_parse_index_data_handles_malformed_html():
    """Test graceful handling of malformed HTML"""
    html = "<html><body></body></html>"
    indices = parse_index_data(html)
    
    assert indices == {}  # Should return empty dict, not crash


def test_parse_index_data_extracts_all_three_indices():
    """Test that all three NSE indices can be parsed"""
    html = """
    <html>
        <body>
            <div id="hpIndices">
                <table>
                    <tr>
                        <td>^NASI</td>
                        <td>177.72 1.33 0.75%</td>
                    </tr>
                    <tr>
                        <td>^N20I</td>
                        <td>3,006.77 22.23 0.74%</td>
                    </tr>
                    <tr>
                        <td>^N25I</td>
                        <td>4,745.80 63.53 1.36%</td>
                    </tr>
                </table>
            </div>
        </body>
    </html>
    """
    indices = parse_index_data(html)
    
    assert 'NASI' in indices
    assert 'N20I' in indices
    assert 'N25I' in indices


def test_parse_index_data_handles_negative_change():
    """Test parsing indices with negative changes"""
    html = """
    <html>
        <body>
            <div id="hpIndices">
                <table>
                    <tr>
                        <td>^NASI</td>
                        <td>175.50 -2.22 -1.25%</td>
                    </tr>
                </table>
            </div>
        </body>
    </html>
    """
    indices = parse_index_data(html)
    
    assert indices['NASI']['change'] == -2.22
    assert indices['NASI']['change_percent'] == -1.25


def test_scrape_indices_returns_dict():
    """Test that scrape_indices returns a dictionary with expected structure"""
    # Note: This test will make actual network request
    # Mark as slow or skip in CI
    result = scrape_indices()
    
    assert isinstance(result, dict)
    assert 'indices' in result
    assert 'timestamp' in result
    assert isinstance(result['indices'], dict)


def test_scrape_indices_handles_network_failure(monkeypatch):
    """Test graceful handling of network failures"""
    def mock_fetch_html(*args, **kwargs):
        return None
    
    def mock_load_from_json(*args, **kwargs):
        return None
    
    monkeypatch.setattr('scraper.indices.fetch_html', mock_fetch_html)
    monkeypatch.setattr('scraper.indices.load_from_json', mock_load_from_json)
    
    result = scrape_indices()
    
    assert 'error' in result
    assert result['indices'] == {}
    assert 'timestamp' in result
