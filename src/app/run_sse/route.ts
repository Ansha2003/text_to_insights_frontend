import { NextRequest } from 'next/server';

export const maxDuration = 300; // 5 minutes — needed for long-running agent SSE streams

const BACKEND = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const body = await request.text();

  const response = await fetch(`${BACKEND}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
