import { NextRequest, NextResponse } from 'next/server';
import { explainRisk, ExplainRiskInput } from '@/lib/gemini';
import { checkRateLimit, getClientIp, sanitizeErrorMessage } from '@/lib/rateLimit';

// ==============================================================================
// POST /api/ai/explain
// Explains calculated flood-risk scores using Gemini AI or deterministic template
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(ip, 'ai_explain', { limit: 20, windowMs: 60000 });
    if (!rate.success) {
      return NextResponse.json(
        { error: 'AI explanation rate limit reached. Please wait a moment.', retryAfterMs: rate.resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 65536) {
      return NextResponse.json(
        { error: 'Payload size exceeds 64KB limit.' },
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
        { error: 'Invalid request body. Expected JSON object with incident details.' },
        { status: 400 }
      );
    }

    if (!body.incidentId || !body.location) {
      return NextResponse.json(
        { error: 'Missing required parameters: incidentId and location must be specified.' },
        { status: 400 }
      );
    }

    const input: ExplainRiskInput = {
      incidentId: String(body.incidentId),
      title: String(body.title || body.incidentId),
      location: String(body.location),
      severity: body.severity || 'moderate',
      depth: body.depth,
      isDemo: Boolean(body.isDemo),
      isVerified: Boolean(body.isVerified),
      reportCount: typeof body.reportCount === 'number' ? body.reportCount : 1,
      reportedAt: body.reportedAt,
      ageHours: typeof body.ageHours === 'number' ? body.ageHours : undefined,
      riskScore: typeof body.riskScore === 'number' ? body.riskScore : null,
      scoreBreakdown: body.scoreBreakdown,
      weatherSnapshot: body.weatherSnapshot,
      evidenceRecords: Array.isArray(body.evidenceRecords) ? body.evidenceRecords : undefined,
    };

    const explanation = await explainRisk(input);

    return NextResponse.json(explanation, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error in /api/ai/explain:', error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, 'Internal server error processing risk explanation.') },
      { status: 500 }
    );
  }
}
