"use client";

import { useEffect, useState } from 'react';
import type { NSENewsResponse, NewsItem } from '@/lib/nse/types';

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <li className="py-2 border-b last:border-b-0">
      <a href={item.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
        {item.headline}
      </a>
      <div className="text-xs text-gray-500">
        {item.source} • {item.timestamp}
      </div>
    </li>
  );
}

export default function NSENewsList({ limit = 10 }: { limit?: number }) {
  const [data, setData] = useState<NSENewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/nse/news', { next: { revalidate: 300 } })
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (!mounted) return;
        if (!ok) {
          setError(json?.error || 'Failed to load news');
        } else {
          setData(json as NSENewsResponse);
        }
      })
      .catch((e) => mounted && setError(e?.message || 'Failed to load news'));
    return () => {
      mounted = false;
    };
  }, []);

  const items = data?.news?.slice(0, limit) || [];

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Market News</h3>
        <span className="text-xs text-gray-500">{data?.timestamp ? new Date(data.timestamp).toLocaleString() : ''}</span>
      </div>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      {!data && !error && <div className="text-sm text-gray-500">Loading...</div>}
      {data && (
        <ul>
          {items.map((n) => (
            <NewsRow key={n.url} item={n} />
          ))}
        </ul>
      )}
    </div>
  );
}
