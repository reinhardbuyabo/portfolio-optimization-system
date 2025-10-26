import { NextRequest } from 'next/server';
import { NSENewsResponse } from '@/lib/nse/types';
import { NSENewsResponseSchema } from '@/lib/nse/schemas';
import { dataDir, readJsonValidated, withCaching } from '@/lib/nse/api';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const file = dataDir('news.json');
  const { data, error } = await readJsonValidated<NSENewsResponse>(file, NSENewsResponseSchema);

  if (error || !data) {
    const fallback: NSENewsResponse = {
      news: [],
      count: 0,
      timestamp: new Date().toISOString(),
      error: error || 'Data unavailable',
    };
    return withCaching(fallback, 502);
  }

  return withCaching(data, 200);
}
