'use client';

import React from 'react';
import { StatusType } from '@/context/IncidentContext';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  switch (status) {
    case 'Reported':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-secondary-container/15 text-secondary border border-secondary-container/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          Reported
        </span>
      );
    case 'Under Review':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
          Under Review
        </span>
      );
    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-primary-container/25 text-primary border border-primary-container/40 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          In Progress
        </span>
      );
    case 'Resolved':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-tertiary-container/20 text-tertiary border border-tertiary-container/40 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
          Resolved
        </span>
      );
  }
}
