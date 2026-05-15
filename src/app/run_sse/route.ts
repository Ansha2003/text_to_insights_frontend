import { NextRequest } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const url = `${BACKEND}/run_sse`;

  console.log('[run_sse] Proxying to:', url);

  let backendResponse: Response;
  try {
    backendResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch (err) {
    console.error('[run_sse] Failed to reach backend:', url, err);
    return new Response(
      JSON.stringify({ error: 'Cannot reach backend', backend: url }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!backendResponse.ok || !backendResponse.body) {
    const text = await backendResponse.text().catch(() => '');
    console.error('[run_sse] Backend returned', backendResponse.status, text.slice(0, 500));
    return new Response(text || 'Backend error', { status: backendResponse.status });
  }

  // Explicitly pipe the backend stream chunk-by-chunk to prevent buffering
  const stream = new ReadableStream({
    async start(controller) {
      const reader = backendResponse.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
