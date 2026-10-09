'use client';

import React from 'react';
import { SeverityType } from '@/context/IncidentContext';

interface SeverityBadgeProps {
  severity: SeverityType;
  showIcon?: boolean;
  className?: string;
}

export function SeverityBadge({ severity, showIcon = true, className = '' }: SeverityBadgeProps) {
  switch (severity) {
    case 'high':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-error/15 text-error border border-error/30 ${className}`}
        >
          {showIcon && (
            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          )}
          High
        </span>
      );
    case 'moderate':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 ${className}`}
        >
          {showIcon && (
            <span className="material-symbols-outlined text-xs">
              error
            </span>
          )}
          Moderate
        </span>
      );
    case 'low':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/15 text-primary border border-primary/30 ${className}`}
        >
          {showIcon && (
            <span className="material-symbols-outlined text-xs">
              info
            </span>
          )}
          Low
        </span>
      );
    case 'cleared':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-tertiary/15 text-tertiary border border-tertiary/30 ${className}`}
        >
          {showIcon && (
            <span className="material-symbols-outlined text-xs">
              check_circle
            </span>
          )}
          Cleared
        </span>
      );
  }
}
