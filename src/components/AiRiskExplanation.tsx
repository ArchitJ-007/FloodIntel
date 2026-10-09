'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Incident } from '@/context/IncidentContext';

// ==============================================================================
// FloodIntel — AI Natural-Language Risk Explanation Component
// PRD Reference: FR-AI-01, FR-AI-05, FR-AI-06, FR-AI-08, FR-AI-09
// ==============================================================================

interface ExplanationData {
  headline: string;
  explanation: string;
  keyFactors: string[];
  caveats: string[];
  recommendedAction: string;
  generatedBy: 'gemini' | 'template';
  modelUsed?: string;
}

interface AiRiskExplanationProps {
  incident: Incident;
  calculatedRiskScore: number | null;
  scoreBreakdown?: {
    severityScore: number;
    rainScore: number;
    recencyScore: number;
    corroborationScore: number;
    hotspotScore: number;
  };
  weatherSnapshot?: {
    precipitationMm?: number | null;
    rainRiskIndex?: number | null;
    intensityLabel?: string;
    isStale?: boolean;
  };
}

export function AiRiskExplanation({
  incident,
  calculatedRiskScore,
  scoreBreakdown,
  weatherSnapshot,
}: AiRiskExplanationProps) {
  const [data, setData] = useState<ExplanationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Client-side component memoization cache (PRD F-13)
  const explanationCacheRef = useRef<Map<string, ExplanationData>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Derive stable primitive cache key
  const incidentId = incident?.id;
  const incidentSeverity = incident?.severity;
  const incidentDepth = incident?.depth;
  const severityScore = scoreBreakdown?.severityScore;
  const rainScore = scoreBreakdown?.rainScore;
  const rainRiskIndex = weatherSnapshot?.rainRiskIndex;

  const primitiveKey = `${incidentId}:${calculatedRiskScore}:${severityScore}:${rainScore}:${rainRiskIndex}`;

  useEffect(() => {
    if (!incidentId) return;

    // Check client memoization cache
    const cached = explanationCacheRef.current.get(primitiveKey);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    async function executeFetch() {
      try {
        const response = await fetch('/api/ai/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            incidentId,
            title: incident.title,
            location: incident.location,
            severity: incidentSeverity,
            depth: incidentDepth,
            isDemo: incident.provenance === 'demo',
            isVerified: incident.verificationStatus === 'verified',
            reportCount: incident.corroborationCount || 1,
            reportedAt: incident.reportedTime,
            riskScore: calculatedRiskScore,
            scoreBreakdown,
            weatherSnapshot,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const json = await response.json();
        if (abortControllerRef.current === controller) {
          explanationCacheRef.current.set(primitiveKey, json);
          setData(json);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Failed to fetch AI explanation, using local fallback:', err);
        if (abortControllerRef.current === controller) {
          setError('Live advisory generation temporarily unavailable.');
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    }

    executeFetch();

    return () => {
      controller.abort();
    };
  }, [
    incidentId,
    incidentSeverity,
    incidentDepth,
    calculatedRiskScore,
    severityScore,
    rainScore,
    rainRiskIndex,
    primitiveKey,
    retryCount,
  ]);

  return (
    <div className="bg-surface-container rounded-xl border border-secondary-container/40 p-4 relative overflow-hidden shadow-sm space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/50">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-secondary text-base"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            auto_awesome
          </span>
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            Plain-Language Risk Insight
          </h4>
        </div>

        {/* Provenance Badge */}
        {data && (
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              data.generatedBy === 'gemini'
                ? 'bg-purple-950/40 text-purple-300 border-purple-500/40'
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                data.generatedBy === 'gemini' ? 'bg-purple-400 animate-pulse' : 'bg-slate-400'
              }`}
            ></span>
            <span>{data.generatedBy === 'gemini' ? 'Gemini AI' : 'Deterministic Template'}</span>
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-2 py-1 animate-pulse">
          <div className="h-3.5 bg-surface-container-high rounded w-3/4"></div>
          <div className="h-3 bg-surface-container-high rounded w-full"></div>
          <div className="h-3 bg-surface-container-high rounded w-5/6"></div>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-outline font-mono">
            <span className="material-symbols-outlined text-xs animate-spin text-secondary">sync</span>
            <span>Synthesizing evidence & telemetry...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && !data && (
        <div className="p-2.5 rounded bg-error/15 border border-error/30 text-xs text-error flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => {
              explanationCacheRef.current.delete(primitiveKey);
              setRetryCount((c) => c + 1);
            }}
            className="text-[11px] font-semibold underline hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!isLoading && data && (
        <div className="space-y-2.5 text-xs">
          {/* Headline */}
          <div className="font-semibold text-on-surface text-xs leading-snug">
            {data.headline}
          </div>

          {/* Detailed Paragraph */}
          <p className="text-on-surface-variant leading-relaxed text-xs">
            {data.explanation}
          </p>

          {/* Key Factors */}
          {data.keyFactors && data.keyFactors.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-outline-variant/40">
              <span className="text-[10px] uppercase font-mono text-outline block">
                Evidence Breakdown:
              </span>
              <ul className="space-y-1">
                {data.keyFactors.map((factor, idx) => (
                  <li key={idx} className="text-[11px] text-on-surface-variant flex items-start gap-1.5">
                    <span className="text-secondary shrink-0">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Action Box */}
          {data.recommendedAction && (
            <div className="p-2.5 rounded-lg bg-surface-container-high border border-outline-variant/60 flex items-start gap-2 text-[11px]">
              <span className="material-symbols-outlined text-sm text-primary shrink-0 mt-0.5">
                navigation
              </span>
              <div>
                <strong className="text-primary block font-semibold">Recommended Action:</strong>
                <span className="text-on-surface leading-snug">{data.recommendedAction}</span>
              </div>
            </div>
          )}

          {/* Caveats / Warnings */}
          {data.caveats && data.caveats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {data.caveats.map((caveat, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-outline border border-outline-variant/60"
                >
                  {caveat}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
