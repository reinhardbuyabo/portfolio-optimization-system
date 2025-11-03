import { NextRequest } from 'next/server';
import { NSEIndicesResponse } from '@/lib/nse/types';
import { NSEIndicesResponseSchema } from '@/lib/nse/schemas';
import { dataDir, readJsonValidated, withCaching } from '@/lib/nse/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const file = dataDir('indices.json');
  const { data, error } = await readJsonValidated<NSEIndicesResponse>(file, NSEIndicesResponseSchema);

  if (error || !data) {
    // Graceful fallback structure to keep API shape predictable
    const fallback: NSEIndicesResponse = {
      indices: {},
      timestamp: new Date().toISOString(),
      error: error || 'Data unavailable',
    };
    return withCaching(fallback, 502);
  }

  return withCaching(data, 200);
}
