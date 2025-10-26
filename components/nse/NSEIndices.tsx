"use client";

import { useEffect, useState } from 'react';
import type { NSEIndicesResponse, NSEIndex } from '@/lib/nse/types';

function IndexRow({ label, data }: { label: string; data?: NSEIndex }) {
  if (!data) return null;
  const sign = data.change >= 0 ? '+' : '';
  const color = data.change >= 0 ? 'text-green-600' : 'text-red-600';
  return (
    <div className="flex items-baseline justify-between py-1">
      <div className="font-medium">{label}</div>
      <div className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900 mr-2">{data.value.toFixed(2)}</span>
        <span className={`${color} mr-1`}>{sign}{data.change.toFixed(2)}</span>
        <span className={color}>({sign}{data.change_percent.toFixed(2)}%)</span>
      </div>
    </div>
  );
}

export default function NSEIndices() {
  const [data, setData] = useState<NSEIndicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/nse/indices', { next: { revalidate: 300 } })
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (!mounted) return;
        if (!ok) {
          setError(json?.error || 'Failed to load indices');
        } else {
          setData(json as NSEIndicesResponse);
        }
      })
      .catch((e) => mounted && setError(e?.message || 'Failed to load indices'));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">NSE Market Indices</h3>
        <span className="text-xs text-gray-500">{data?.timestamp ? new Date(data.timestamp).toLocaleString() : ''}</span>
      </div>
      {error && (
        <div className="text-sm text-red-600 mb-2">{error}</div>
      )}
      {!data && !error && (
        <div className="text-sm text-gray-500">Loading...</div>
      )}
      {data && (
        <div className="space-y-1">
          <IndexRow label="NASI" data={data.indices.NASI} />
          <IndexRow label="NSE 20" data={data.indices.N20I} />
          <IndexRow label="NSE 25" data={data.indices.N25I} />
        </div>
      )}
    </div>
  );
}
