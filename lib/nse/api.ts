import { NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

// Common helper to read a JSON file and validate with Zod
export async function readJsonValidated<T>(
  filePath: string,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return { error: 'Invalid data format' };
    }
    return { data: parsed.data };
  } catch (err: any) {
    return { error: err?.message || 'Failed to read data file' };
  }
}

export function withCaching(json: unknown, status = 200) {
  const res = NextResponse.json(json, { status });
  // Cache hints: allow CDN to cache for 5 minutes, serve stale for 10 minutes while revalidating
  res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res;
}

export function dataDir(...segments: string[]) {
  return path.join(process.cwd(), 'data', 'nse', ...segments);
}
