import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
  const jsonFilePath = path.join(process.cwd(), 'data', 'nse', 'news.json');
  const fileContents = await fs.readFile(jsonFilePath, 'utf8');
  const jsonData = JSON.parse(fileContents);
  return NextResponse.json(jsonData);
}
