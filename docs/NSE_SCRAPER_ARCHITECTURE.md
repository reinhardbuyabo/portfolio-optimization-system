# NSE Data Scraper Architecture & Implementation Plan

## Overview
This document outlines the Test-Driven Development (TDD) approach for building a comprehensive web scraper for real-time Nairobi Stock Exchange data from https://live.mystocks.co.ke/.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Data Sources](#data-sources)
3. [Technology Stack](#technology-stack)
4. [TDD Implementation Plan](#tdd-implementation-plan)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [React Components](#react-components)
8. [Error Handling & Fallbacks](#error-handling--fallbacks)
9. [Deployment & Monitoring](#deployment--monitoring)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         React Components (with fallbacks)           │   │
│  │  - NSEIndices    - NSEStockList                     │   │
│  │  - NSENews       - NSECorporateActions              │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Requests
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (TypeScript)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /api/nse/indices   /api/nse/stocks                 │   │
│  │  /api/nse/news      /api/nse/actions                │   │
│  │  - Validation (Zod) - Caching - Error Handling      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Read from Cache
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Storage Layer                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JSON Files (./data/nse/)  OR  Redis Cache          │   │
│  │  - indices.json    - stocks.json                    │   │
│  │  - news.json       - actions.json                   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ Written by Scraper
                         ↑
┌─────────────────────────────────────────────────────────────┐
│                Python Scraper Service                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  - scrape_indices.py    - scrape_stocks.py          │   │
│  │  - scrape_news.py       - scrape_actions.py         │   │
│  │  - Scheduler (runs every 5-15 min during market)    │   │
│  │  - Retry logic - Rate limiting - Error logging      │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP Requests
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              https://live.mystocks.co.ke/                   │
│                  (Data Source)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Sources

### MyStocks.co.ke Data Points

#### 1. NSE Indices
- **URL:** `https://live.mystocks.co.ke/`
- **Selector:** `div#hpIndices`
- **Data:** 
  - NASI (NSE All Share Index)
  - N20I (NSE 20 Index)
  - N25I (NSE 25 Index)
  - Values, changes, percentages

#### 2. Individual Stock Data
- **URL:** `https://live.mystocks.co.ke/stock={SYMBOL}`
- **Data:**
  - Current price
  - Daily change
  - Volume
  - High/Low
  - Market cap
  - Historical prices

#### 3. Market News
- **URL:** `https://live.mystocks.co.ke/`
- **Selector:** `div#otherNewsDiv`
- **Data:**
  - Headlines
  - Sources
  - Timestamps
  - Article links

#### 4. Corporate Actions
- **URL:** `https://live.mystocks.co.ke/`
- **Selector:** `div#hpEvents`
- **Data:**
  - Dividend payments
  - Book closures
  - Rights issues
  - Company names, dates

#### 5. Top Gainers/Losers
- **URL:** `https://live.mystocks.co.ke/`
- **Selectors:** Dynamically loaded (JS-based)
- **Alternative:** Parse from homepage stock list

---

## Technology Stack

### Backend (Scraper)
- **Language:** Python 3.9+
- **Libraries:**
  - `requests` - HTTP requests
  - `beautifulsoup4` - HTML parsing
  - `lxml` - Fast XML/HTML parser
  - `schedule` - Job scheduling
  - `python-dotenv` - Environment variables
  - `pytest` - Testing

### API Layer
- **Framework:** Next.js 14+ API Routes
- **Language:** TypeScript
- **Libraries:**
  - `zod` - Schema validation
  - `node-cron` - Task scheduling (optional)

### Frontend
- **Framework:** React 19+ (Next.js)
- **Testing:** Vitest + React Testing Library
- **UI:** Tailwind CSS

### Data Storage
- **Primary:** JSON files (`./data/nse/`)
- **Optional:** Redis for caching
- **Database:** PostgreSQL (for historical data)

---

## TDD Implementation Plan

### Phase 1: Setup & Infrastructure (Day 1)

#### 1.1 Python Environment Setup
```bash
# Create Python scraper directory
mkdir -p scripts/scraper
cd scripts/scraper

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Create requirements.txt
```

**File: `scripts/scraper/requirements.txt`**
```
requests>=2.31.0
beautifulsoup4>=4.12.0
lxml>=5.1.0
schedule>=1.2.0
python-dotenv>=1.0.0
pytest>=8.0.0
pytest-mock>=3.12.0
```

#### 1.2 Directory Structure
```
portfolio-optimization-system/
├── scripts/
│   └── scraper/
│       ├── __init__.py
│       ├── requirements.txt
│       ├── scraper/
│       │   ├── __init__.py
│       │   ├── indices.py
│       │   ├── stocks.py
│       │   ├── news.py
│       │   ├── actions.py
│       │   └── utils.py
│       ├── tests/
│       │   ├── __init__.py
│       │   ├── test_indices.py
│       │   ├── test_stocks.py
│       │   ├── test_news.py
│       │   ├── test_actions.py
│       │   └── fixtures/
│       │       ├── homepage.html
│       │       └── stock_page.html
│       └── main.py
├── data/
│   └── nse/
│       ├── indices.json
│       ├── stocks.json
│       ├── news.json
│       └── actions.json
├── app/
│   └── api/
│       └── nse/
│           ├── indices/
│           │   └── route.ts
│           ├── stocks/
│           │   └── route.ts
│           ├── news/
│           │   └── route.ts
│           └── actions/
│               └── route.ts
├── components/
│   └── nse/
│       ├── NSEIndices.tsx
│       ├── NSEStockList.tsx
│       ├── NSENews.tsx
│       └── NSECorporateActions.tsx
├── __tests__/
│   ├── api/
│   │   └── nse/
│   │       ├── indices.test.ts
│   │       ├── stocks.test.ts
│   │       └── news.test.ts
│   └── components/
│       └── nse/
│           ├── NSEIndices.test.tsx
│           └── NSENews.test.tsx
└── lib/
    ├── nse/
    │   ├── types.ts
    │   ├── schemas.ts
    │   └── utils.ts
    └── cache/
        └── file-cache.ts
```

---

### Phase 2: TDD - Write Tests First (Day 1-2)

#### 2.1 Python Scraper Tests

**File: `scripts/scraper/tests/test_indices.py`**
```python
import pytest
from scraper.indices import scrape_indices, parse_index_data
from scraper.utils import load_html_fixture

def test_scrape_indices_returns_dict():
    """Test that scrape_indices returns a dictionary"""
    # This will fail initially - TDD approach
    result = scrape_indices()
    assert isinstance(result, dict)
    assert 'indices' in result
    assert 'timestamp' in result

def test_parse_index_data_extracts_nasi():
    """Test parsing NASI index from HTML"""
    html = load_html_fixture('homepage.html')
    indices = parse_index_data(html)
    
    assert 'NASI' in indices
    assert 'value' in indices['NASI']
    assert 'change' in indices['NASI']
    assert 'change_percent' in indices['NASI']

def test_parse_index_data_handles_malformed_html():
    """Test graceful handling of malformed HTML"""
    html = "<html><body></body></html>"
    indices = parse_index_data(html)
    
    assert indices == {}  # Should return empty dict, not crash

def test_scrape_indices_includes_all_three_indices():
    """Test that all three NSE indices are scraped"""
    result = scrape_indices()
    indices = result['indices']
    
    assert 'NASI' in indices
    assert 'N20I' in indices
    assert 'N25I' in indices
```

**File: `scripts/scraper/tests/test_news.py`**
```python
import pytest
from scraper.news import scrape_news, parse_news_items
from scraper.utils import load_html_fixture

def test_scrape_news_returns_list():
    """Test that scrape_news returns a list of news items"""
    result = scrape_news()
    assert isinstance(result, dict)
    assert 'news' in result
    assert isinstance(result['news'], list)

def test_parse_news_items_extracts_headlines():
    """Test parsing news headlines from HTML"""
    html = load_html_fixture('homepage.html')
    news = parse_news_items(html)
    
    assert len(news) > 0
    first_item = news[0]
    assert 'headline' in first_item
    assert 'source' in first_item
    assert 'timestamp' in first_item
    assert 'url' in first_item

def test_parse_news_items_limits_results():
    """Test that news parsing can limit results"""
    html = load_html_fixture('homepage.html')
    news = parse_news_items(html, limit=5)
    
    assert len(news) <= 5

def test_scrape_news_handles_network_errors():
    """Test graceful handling of network errors"""
    # Mock network failure
    # Should return empty list or cached data
    pass
```

#### 2.2 TypeScript API Tests

**File: `__tests__/api/nse/indices.test.ts`**
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/nse/indices/route';
import fs from 'fs/promises';

describe('NSE Indices API', () => {
  it('should return indices data when available', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('indices');
    expect(data).toHaveProperty('timestamp');
  });

  it('should return 503 when data is unavailable', async () => {
    // Mock file read failure
    vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));
    
    const response = await GET();
    
    expect(response.status).toBe(503);
  });

  it('should validate data structure', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data.indices).toHaveProperty('NASI');
    expect(data.indices.NASI).toHaveProperty('value');
    expect(data.indices.NASI).toHaveProperty('change');
    expect(data.indices.NASI).toHaveProperty('change_percent');
  });

  it('should include cache headers', async () => {
    const response = await GET();
    
    expect(response.headers.get('Cache-Control')).toBeTruthy();
  });
});
```

#### 2.3 React Component Tests

**File: `__tests__/components/nse/NSEIndices.test.tsx`**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import NSEIndices from '@/components/nse/NSEIndices';

describe('NSEIndices Component', () => {
  it('should render loading state initially', () => {
    render(<NSEIndices />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display indices data when loaded', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          indices: {
            NASI: { value: 177.72, change: 1.33, change_percent: 0.75 }
          }
        })
      })
    ) as any;

    render(<NSEIndices />);
    
    await waitFor(() => {
      expect(screen.getByText('NASI')).toBeInTheDocument();
      expect(screen.getByText('177.72')).toBeInTheDocument();
    });
  });

  it('should not render when data fails to load (graceful degradation)', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 503
      })
    ) as any;

    render(<NSEIndices />);
    
    await waitFor(() => {
      // Component should not render anything when data unavailable
      expect(screen.queryByText('NASI')).not.toBeInTheDocument();
    });
  });

  it('should show positive/negative change styling', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          indices: {
            NASI: { value: 177.72, change: 1.33, change_percent: 0.75 }
          }
        })
      })
    ) as any;

    render(<NSEIndices />);
    
    await waitFor(() => {
      const changeElement = screen.getByText('+1.33');
      expect(changeElement).toHaveClass('text-green-500'); // or similar
    });
  });
});
```

---

### Phase 3: Implement Scraper (Day 2-3)

#### 3.1 Utility Functions

**File: `scripts/scraper/scraper/utils.py`**
```python
import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
from typing import Optional, Dict, Any

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'

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
        return response.text
    except requests.RequestException as e:
        print(f"Error fetching {url}: {e}")
        return None

def parse_html(html: str) -> BeautifulSoup:
    """Parse HTML content with BeautifulSoup"""
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
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving to {filepath}: {e}")
        return False

def load_from_json(filepath: str) -> Optional[Dict[Any, Any]]:
    """Load data from JSON file"""
    try:
        with open(filepath, 'r') as f:
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
        # Remove commas, spaces, and other non-numeric characters (except . and -)
        cleaned = text.strip().replace(',', '').replace(' ', '')
        return float(cleaned)
    except (ValueError, AttributeError):
        return None

def get_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.utcnow().isoformat() + 'Z'
```

#### 3.2 Indices Scraper

**File: `scripts/scraper/scraper/indices.py`**
```python
from typing import Dict, Any, Optional
from .utils import fetch_html, parse_html, save_to_json, clean_number, get_timestamp

MYSTOCKS_URL = "https://live.mystocks.co.ke/"
DATA_DIR = "../../data/nse/"

def parse_index_data(html: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse NSE indices from HTML
    
    Args:
        html: HTML content from mystocks.co.ke
        
    Returns:
        Dictionary of index data
    """
    soup = parse_html(html)
    indices = {}
    
    indices_div = soup.find('div', id='hpIndices')
    if not indices_div:
        return indices
    
    tables = indices_div.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 3:
                # Extract index symbol (e.g., ^NASI)
                symbol_cell = cells[0].text.strip()
                # Clean symbol (remove ^)
                symbol = symbol_cell.replace('^', '')
                
                # Parse combined value/change/percent cell
                value_text = cells[1].text.strip()
                # Try to extract individual components
                # Format appears to be: "177.721.330.75%"
                # We'll split and clean
                parts = value_text.replace('%', '').split()
                
                if len(parts) >= 3:
                    value = clean_number(parts[0])
                    change = clean_number(parts[1])
                    change_percent = clean_number(parts[2])
                    
                    if value is not None:
                        indices[symbol] = {
                            'value': value,
                            'change': change,
                            'change_percent': change_percent
                        }
    
    return indices

def scrape_indices() -> Dict[str, Any]:
    """
    Scrape NSE indices from mystocks.co.ke
    
    Returns:
        Dictionary containing indices data and metadata
    """
    html = fetch_html(MYSTOCKS_URL)
    if not html:
        return {'indices': {}, 'timestamp': get_timestamp(), 'error': 'Failed to fetch data'}
    
    indices = parse_index_data(html)
    
    result = {
        'indices': indices,
        'timestamp': get_timestamp(),
        'source': MYSTOCKS_URL
    }
    
    # Save to JSON
    filepath = f"{DATA_DIR}/indices.json"
    save_to_json(result, filepath)
    
    return result

if __name__ == '__main__':
    print("Scraping NSE indices...")
    data = scrape_indices()
    print(f"Scraped {len(data['indices'])} indices")
    for symbol, info in data['indices'].items():
        print(f"  {symbol}: {info['value']} ({info['change']:+.2f}, {info['change_percent']:+.2f}%)")
```

#### 3.3 News Scraper

**File: `scripts/scraper/scraper/news.py`**
```python
from typing import Dict, Any, List
from .utils import fetch_html, parse_html, save_to_json, get_timestamp

MYSTOCKS_URL = "https://live.mystocks.co.ke/"
DATA_DIR = "../../data/nse/"

def parse_news_items(html: str, limit: int = 20) -> List[Dict[str, str]]:
    """
    Parse news items from HTML
    
    Args:
        html: HTML content from mystocks.co.ke
        limit: Maximum number of news items to return
        
    Returns:
        List of news item dictionaries
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
            
            # Parse source and timestamp
            source = ''
            timestamp = ''
            if source_time:
                source_text = source_time.text.strip()
                # Split by newlines or commas to separate source from time
                parts = [p.strip() for p in source_text.replace('\\n', ' ').split()]
                if len(parts) >= 2:
                    # Last part is usually the timestamp
                    timestamp = ' '.join(parts[-3:])  # e.g., "Mon, 9:30 pm"
                    source = ' '.join(parts[:-3]) if len(parts) > 3 else parts[0]
            
            news_items.append({
                'headline': headline,
                'url': url if url.startswith('http') else f"https://live.mystocks.co.ke{url}",
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
        Dictionary containing news data and metadata
    """
    html = fetch_html(MYSTOCKS_URL)
    if not html:
        return {'news': [], 'timestamp': get_timestamp(), 'error': 'Failed to fetch data'}
    
    news = parse_news_items(html, limit)
    
    result = {
        'news': news,
        'count': len(news),
        'timestamp': get_timestamp(),
        'source': MYSTOCKS_URL
    }
    
    # Save to JSON
    filepath = f"{DATA_DIR}/news.json"
    save_to_json(result, filepath)
    
    return result

if __name__ == '__main__':
    print("Scraping NSE news...")
    data = scrape_news()
    print(f"Scraped {data['count']} news items")
    for item in data['news'][:5]:
        print(f"  - {item['headline']}")
        print(f"    {item['source']} | {item['timestamp']}")
```

---

### Phase 4: API Routes (Day 3-4)

#### 4.1 Type Definitions

**File: `lib/nse/types.ts`**
```typescript
export interface NSEIndex {
  value: number;
  change: number;
  change_percent: number;
}

export interface NSEIndicesResponse {
  indices: {
    NASI?: NSEIndex;
    N20I?: NSEIndex;
    N25I?: NSEIndex;
  };
  timestamp: string;
  source?: string;
}

export interface NewsItem {
  headline: string;
  url: string;
  source: string;
  timestamp: string;
}

export interface NSENewsResponse {
  news: NewsItem[];
  count: number;
  timestamp: string;
  source?: string;
}

export interface CorporateAction {
  company: string;
  symbol: string;
  action: string;
  date: string;
}

export interface NSECorporateActionsResponse {
  actions: CorporateAction[];
  count: number;
  timestamp: string;
  source?: string;
}
```

#### 4.2 Zod Schemas

**File: `lib/nse/schemas.ts`**
```typescript
import { z } from 'zod';

export const NSEIndexSchema = z.object({
  value: z.number(),
  change: z.number(),
  change_percent: z.number(),
});

export const NSEIndicesResponseSchema = z.object({
  indices: z.object({
    NASI: NSEIndexSchema.optional(),
    N20I: NSEIndexSchema.optional(),
    N25I: NSEIndexSchema.optional(),
  }),
  timestamp: z.string(),
  source: z.string().optional(),
  error: z.string().optional(),
});

export const NewsItemSchema = z.object({
  headline: z.string(),
  url: z.string().url(),
  source: z.string(),
  timestamp: z.string(),
});

export const NSENewsResponseSchema = z.object({
  news: z.array(NewsItemSchema),
  count: z.number(),
  timestamp: z.string(),
  source: z.string().optional(),
  error: z.string().optional(),
});
```

#### 4.3 Cache Utility

**File: `lib/cache/file-cache.ts`**
```typescript
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'nse');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function readCacheFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(CACHE_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as T & { timestamp?: string };
    
    // Check if data is stale
    if (data.timestamp) {
      const age = Date.now() - new Date(data.timestamp).getTime();
      if (age > CACHE_TTL) {
        console.warn(`Cache file ${filename} is stale (${age}ms old)`);
        // Return data anyway, but log warning
      }
    }
    
    return data;
  } catch (error) {
    console.error(`Error reading cache file ${filename}:`, error);
    return null;
  }
}

export async function writeCacheFile<T>(filename: string, data: T): Promise<boolean> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const filePath = path.join(CACHE_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing cache file ${filename}:`, error);
    return false;
  }
}

export function getCacheAge(timestamp: string): number {
  return Date.now() - new Date(timestamp).getTime();
}
```

#### 4.4 API Route - Indices

**File: `app/api/nse/indices/route.ts`**
```typescript
import { NextResponse } from 'next/server';
import { readCacheFile } from '@/lib/cache/file-cache';
import { NSEIndicesResponseSchema } from '@/lib/nse/schemas';
import type { NSEIndicesResponse } from '@/lib/nse/types';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    // Read from cache file
    const data = await readCacheFile<NSEIndicesResponse>('indices.json');
    
    if (!data) {
      return NextResponse.json(
        { error: 'Data temporarily unavailable' },
        { status: 503 }
      );
    }
    
    // Validate data structure
    const validationResult = NSEIndicesResponseSchema.safeParse(data);
    
    if (!validationResult.success) {
      console.error('Invalid indices data structure:', validationResult.error);
      return NextResponse.json(
        { error: 'Invalid data structure' },
        { status: 500 }
      );
    }
    
    // Return validated data with cache headers
    return NextResponse.json(validationResult.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Error in NSE indices API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Phase 5: React Components (Day 4-5)

#### 5.1 NSE Indices Component

**File: `components/nse/NSEIndices.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import type { NSEIndicesResponse, NSEIndex } from '@/lib/nse/types';

export default function NSEIndices() {
  const [data, setData] = useState<NSEIndicesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const response = await fetch('/api/nse/indices');
        
        if (!response.ok) {
          // Gracefully fail - don't render component
          setError('Data unavailable');
          setLoading(false);
          return;
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch NSE indices:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchIndices();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchIndices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Graceful degradation - don't render if data unavailable
  if (loading || error || !data || !data.indices) {
    return null;
  }

  const indices = data.indices;
  const hasData = Object.keys(indices).length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-100 mb-4">NSE Indices</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {indices.NASI && (
          <IndexCard name="NASI" data={indices.NASI} fullName="NSE All Share Index" />
        )}
        {indices.N20I && (
          <IndexCard name="NSE 20" data={indices.N20I} fullName="NSE 20 Index" />
        )}
        {indices.N25I && (
          <IndexCard name="NSE 25" data={indices.N25I} fullName="NSE 25 Index" />
        )}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  );
}

function IndexCard({ name, data, fullName }: { 
  name: string; 
  data: NSEIndex; 
  fullName: string;
}) {
  const isPositive = data.change >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const bgColor = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <div className={`${bgColor} rounded-lg p-4 border border-gray-700`}>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{fullName}</h3>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold text-gray-100">
          {data.value.toFixed(2)}
        </span>
        <div className={`text-right ${changeColor}`}>
          <div className="text-lg font-semibold">
            {isPositive ? '+' : ''}{data.change.toFixed(2)}
          </div>
          <div className="text-sm">
            ({isPositive ? '+' : ''}{data.change_percent.toFixed(2)}%)
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 5.2 NSE News Component

**File: `components/nse/NSENews.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import type { NSENewsResponse } from '@/lib/nse/types';
import { ExternalLink } from 'lucide-react';

interface NSENewsProps {
  limit?: number;
}

export default function NSENews({ limit = 10 }: NSENewsProps) {
  const [data, setData] = useState<NSENewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/nse/news');
        
        if (!response.ok) {
          setLoading(false);
          return;
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch NSE news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    
    // Refresh every 10 minutes
    const interval = setInterval(fetchNews, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Graceful degradation
  if (loading || !data || !data.news || data.news.length === 0) {
    return null;
  }

  const newsItems = data.news.slice(0, limit);

  return (
    <div className="w-full bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-gray-100 mb-4">Market News</h2>
      <div className="space-y-4">
        {newsItems.map((item, index) => (
          <a
            key={index}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-100 group-hover:text-yellow-400 mb-2">
                  {item.headline}
                </h3>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>{item.source}</span>
                  <span>•</span>
                  <span>{item.timestamp}</span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
            </div>
          </a>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
```

---

### Phase 6: Scheduler & Monitoring (Day 5-6)

#### 6.1 Main Scraper Script

**File: `scripts/scraper/main.py`**
```python
#!/usr/bin/env python3
"""
NSE Data Scraper - Main Entry Point

Runs scheduled scraping jobs during NSE market hours
"""

import schedule
import time
from datetime import datetime
import pytz
from scraper.indices import scrape_indices
from scraper.news import scrape_news
from scraper.actions import scrape_actions

# NSE timezone (East Africa Time)
EAT = pytz.timezone('Africa/Nairobi')

# NSE market hours: 9:00 AM - 3:00 PM EAT
MARKET_OPEN = 9
MARKET_CLOSE = 15

def is_market_hours() -> bool:
    """Check if current time is within NSE market hours"""
    now = datetime.now(EAT)
    hour = now.hour
    # Also check if it's a weekday
    is_weekday = now.weekday() < 5
    return is_weekday and MARKET_OPEN <= hour < MARKET_CLOSE

def scrape_all():
    """Run all scraping tasks"""
    print(f"\\n[{datetime.now(EAT)}] Starting scrape cycle...")
    
    # Only scrape during market hours for real-time data
    # News and corporate actions can be scraped anytime
    if is_market_hours():
        print("Market is open - scraping all data")
        scrape_indices()
    else:
        print("Market is closed - scraping news only")
    
    scrape_news()
    scrape_actions()
    
    print("Scrape cycle completed\\n")

def main():
    """Main entry point"""
    print("NSE Data Scraper Started")
    print(f"Current time (EAT): {datetime.now(EAT)}")
    print(f"Market hours: {MARKET_OPEN}:00 - {MARKET_CLOSE}:00 EAT")
    print()
    
    # Run immediately on startup
    scrape_all()
    
    # Schedule regular scraping
    # During market hours: every 5 minutes
    # Outside market hours: every 30 minutes (for news)
    schedule.every(5).minutes.do(scrape_all)
    
    print("Scheduler started. Press Ctrl+C to stop.\\n")
    
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        print("\\nScraper stopped by user")

if __name__ == '__main__':
    main()
```

#### 6.2 Systemd Service (Optional)

**File: `scripts/scraper/nse-scraper.service`**
```ini
[Unit]
Description=NSE Data Scraper
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/portfolio-optimization-system/scripts/scraper
ExecStart=/var/www/portfolio-optimization-system/scripts/scraper/venv/bin/python main.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
```

---

## Error Handling & Fallbacks

### Principles

1. **Fail Silently:** If data is unavailable, components should not render (return null)
2. **Cache Stale Data:** Serve slightly stale data rather than no data
3. **Log Errors:** Log all failures for monitoring
4. **Graceful Degradation:** Show TradingView widgets even if scraped data fails
5. **User Feedback:** No error messages shown to users - just hide unavailable data

### Implementation Examples

#### API Route Error Handling
```typescript
try {
  const data = await readCacheFile('indices.json');
  if (!data) {
    // Return 503 - let client handle gracefully
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  }
  return NextResponse.json(data);
} catch (error) {
  console.error('API Error:', error);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}
```

#### Component Error Handling
```typescript
if (loading || error || !data) {
  return null; // Don't render anything
}

// Only render if we have valid data
return <div>...</div>;
```

#### Scraper Error Handling
```python
def scrape_indices():
    try:
        html = fetch_html(URL)
        if not html:
            # Load from previous cache if available
            return load_from_json('indices.json') or {'indices': {}}
        
        data = parse_index_data(html)
        save_to_json(data, 'indices.json')
        return data
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        # Return cached data
        return load_from_json('indices.json') or {'indices': {}}
```

---

## Testing Strategy

### Unit Tests
- Test each scraper function independently
- Mock HTTP requests with fixtures
- Test data parsing with various HTML structures
- Test error handling and edge cases

### Integration Tests
- Test full scrape -> save -> API -> component flow
- Test with real network requests (marked as optional/slow)
- Test cache behavior

### Component Tests
- Test loading states
- Test data display
- Test error states (data unavailable)
- Test no-render when data is missing

### E2E Tests (Optional)
- Test full user flow on landing page
- Verify components render correctly with live data
- Test fallback to TradingView widgets

---

## Monitoring & Logging

### Metrics to Track
- Scraper success rate
- API response times
- Cache hit/miss rates
- Component render errors
- Data staleness

### Logging Levels
- **ERROR:** Failed scrapes, API errors
- **WARN:** Stale data, slow responses
- **INFO:** Successful scrapes, cache updates
- **DEBUG:** Detailed scraping steps

### Tools
- Winston/Pino for Node.js logging
- Python logging module
- Optional: Sentry for error tracking

---

## Deployment Checklist

### Development
- [ ] Install Python dependencies
- [ ] Create data directory structure
- [ ] Run initial scrape manually
- [ ] Test API endpoints locally
- [ ] Test React components

### Production
- [ ] Set up scraper as systemd service or cron job
- [ ] Configure logging
- [ ] Set up monitoring/alerts
- [ ] Test graceful degradation
- [ ] Document maintenance procedures

---

## Future Enhancements

1. **Historical Data Storage:** Store scraped data in PostgreSQL for predictions
2. **Real-time Updates:** WebSocket support for live data streaming
3. **Stock Screeners:** Advanced filtering based on scraped data
4. **Price Alerts:** Notify users of price movements
5. **Comparison Tools:** Compare stocks using scraped data
6. **API Rate Limiting:** Implement rate limiting for API endpoints
7. **Admin Dashboard:** Monitor scraper health and data quality

---

## Conclusion

This architecture provides a robust, test-driven approach to scraping NSE data with comprehensive error handling and graceful degradation. The system prioritizes user experience by never showing errors - just hiding unavailable data.

Key principles:
- **TDD:** Write tests first
- **Graceful Degradation:** Fail silently
- **Caching:** Serve stale data over no data
- **Monitoring:** Track everything
- **Modularity:** Each component is independent
