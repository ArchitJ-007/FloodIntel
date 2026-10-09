import { NextRequest, NextResponse } from 'next/server';
import { classifyIncident, ClassifyIncidentInput } from '@/lib/gemini';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rateLimit';

// ==============================================================================
// POST /api/ai/classify
// Classifies incident descriptions and suggests category, severity, and depth
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, 'ai_classify', { limit: 20, windowMs: 60000 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'AI classification rate limit reached. Please wait a moment.', retryAfterMs: rate.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 32768) {
      return NextResponse.json(
        { error: 'Payload size exceeds 32KB limit.' },
        { status: 413 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON object with description.' },
        { status: 400 }
      );
    }

    if (typeof body.description !== 'string' || !body.description.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid parameter: description must be a non-empty string.' },
        { status: 400 }
      );
    }

    const input: ClassifyIncidentInput = {
      description: body.description.slice(0, 1000),
      userCategory: body.userCategory ? String(body.userCategory).slice(0, 50) : undefined,
      userSeverity: body.userSeverity ? String(body.userSeverity).slice(0, 50) : undefined,
    };

    const classification = await classifyIncident(input);

    return NextResponse.json(classification, {
      status: 200,
    });
  } catch (error) {
    console.error('Error in /api/ai/classify:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Internal server error processing incident classification.') },
      { status: 500 }
    );
  }
}
