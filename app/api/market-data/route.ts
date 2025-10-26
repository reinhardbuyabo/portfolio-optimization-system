
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HORIZONS = ['1H', '1D', '3D', '1W', '1M', '3M', '1Y', '5Y'];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const horizon = searchParams.get('horizon') || '1M';

  if (!ALLOWED_HORIZONS.includes(horizon)) {
    return NextResponse.json({ error: `Invalid horizon. Allowed values are: ${ALLOWED_HORIZONS.join(', ')}` }, { status: 400 });
  }

  const pythonExecutable = 'scripts/scraper/testenv/bin/python';
  const scriptPath = path.join(process.cwd(), 'scripts', 'data_generator.py');

  const python = spawn(pythonExecutable, [scriptPath, '--horizon', horizon], { env: process.env });

  let dataToSend = '';
  python.stdout.on('data', (data) => {
    dataToSend += data.toString();
  });

  let error = '';
  python.stderr.on('data', (data) => {
    error += data.toString();
  });

  const exitCode = await new Promise((resolve) => {
    python.on('close', resolve);
  });

  if (exitCode) {
    return NextResponse.json({ error: `Subprocess exited with code ${exitCode}: ${error}` }, { status: 500 });
  }

  try {
    const jsonData = JSON.parse(dataToSend);
    return NextResponse.json(jsonData);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to parse JSON from python script', details: dataToSend }, { status: 500 });
  }
}
