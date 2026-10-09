import { NextRequest, NextResponse } from 'next/server';
import { classifyIncident, ClassifyIncidentInput } from '@/lib/gemini';

// ==============================================================================
// POST /api/ai/classify
// Classifies incident descriptions and suggests category, severity, and depth
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON object with description.' },
        { status: 400 }
      );
    }

    if (typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid parameter: description must be a string.' },
        { status: 400 }
      );
    }

    const input: ClassifyIncidentInput = {
      description: body.description,
      userCategory: body.userCategory,
      userSeverity: body.userSeverity,
    };

    const classification = await classifyIncident(input);

    return NextResponse.json(classification, {
      status: 200,
    });
  } catch (error) {
    console.error('Error in /api/ai/classify:', error);
    return NextResponse.json(
      { error: 'Internal server error processing incident classification.' },
      { status: 500 }
    );
  }
}
