import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${BACKEND}/apps/${path.join('/')}`;

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.text() : undefined;

  const headers: Record<string, string> = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  const contentType = response.headers.get('Content-Type') || 'application/json';

  // Use arrayBuffer to faithfully proxy both JSON and binary (image) responses
  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: response.status,
    headers: { 'Content-Type': contentType },
  });
}

export { handler as GET, handler as POST, handler as DELETE, handler as PUT, handler as PATCH };
