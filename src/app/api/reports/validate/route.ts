import { NextRequest, NextResponse } from 'next/server';
import {
  validateHazardReport,
  detectDuplicateReport,
  HazardReportInput,
} from '@/lib/reportingValidation';
import { getInitialDemoIncidents } from '@/lib/demoIncidents';

// ==============================================================================
// POST /api/reports/validate
// Server-side validation and duplicate-report evaluation endpoint
// ==============================================================================

export async function POST(req: NextRequest) {
  try {
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
        { error: 'Request body must be an object with incident parameters.' },
        { status: 400 }
      );
    }

    const input: HazardReportInput = {
      location: String(body.location || ''),
      hazardType: String(body.hazardType || ''),
      severity: String(body.severity || ''),
      waterDepth: String(body.waterDepth || ''),
      description: String(body.description || ''),
      reporterMode: body.reporterMode ? String(body.reporterMode) : undefined,
      contact: body.contact ? String(body.contact) : undefined,
      coordinates:
        body.coordinates && typeof body.coordinates === 'object'
          ? {
              lat: Number(body.coordinates.lat),
              lng: Number(body.coordinates.lng),
            }
          : undefined,
    };

    // 1. Perform server-side validation
    const validationResult = validateHazardReport(input);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed. Please review the highlighted fields.',
          errors: validationResult.errors,
          fieldErrors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 422 }
      );
    }

    // 2. Perform duplicate check against existing incidents
    const existingIncidents = Array.isArray(body.activeIncidents)
      ? body.activeIncidents
      : getInitialDemoIncidents();

    const duplicateCheck = detectDuplicateReport(
      {
        coordinates: validationResult.sanitized!.coordinates,
        hazardType: validationResult.sanitized!.hazardType,
        description: validationResult.sanitized!.description,
        location: validationResult.sanitized!.location,
      },
      existingIncidents
    );

    return NextResponse.json({
      isValid: true,
      errors: {},
      warnings: validationResult.warnings,
      duplicateCheck,
      sanitized: validationResult.sanitized,
    });
  } catch (err: any) {
    console.error('Error in /api/reports/validate:', err);
    return NextResponse.json(
      { error: 'Internal server error validating hazard report.' },
      { status: 500 }
    );
  }
}
