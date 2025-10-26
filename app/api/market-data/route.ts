
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const horizon = searchParams.get('horizon') || '1M';

  const python = spawn('scripts/scraper/testenv/bin/python', ['scripts/data_generator.py', '--horizon', horizon]);

  let dataToSend = '';
  for await (const chunk of python.stdout) {
    dataToSend += chunk;
  }

  let error = '';
  for await (const chunk of python.stderr) {
    error += chunk;
  }

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
    return NextResponse.json({ error: 'Failed to parse JSON from python script' }, { status: 500 });
  }
}
