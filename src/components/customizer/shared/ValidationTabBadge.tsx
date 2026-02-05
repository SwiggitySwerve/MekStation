import React from 'react';

import { TabValidationCounts } from '@/utils/validation/validationNavigation';

interface ValidationTabBadgeProps {
  counts: TabValidationCounts;
  showZero?: boolean;
  className?: string;
}

export function ValidationTabBadge({
  counts,
  showZero = false,
  className = '',
}: ValidationTabBadgeProps): React.ReactElement | null {
  const { errors, warnings } = counts;

  if (!showZero && errors === 0 && warnings === 0) {
    return null;
  }

  if (errors > 0) {
    return (
      <span
        className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ${className}`}
        aria-label={`${errors} error${errors !== 1 ? 's' : ''}`}
      >
        {errors > 99 ? '99+' : errors}
      </span>
    );
  }

  if (warnings > 0) {
    return (
      <span
        className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black ${className}`}
        aria-label={`${warnings} warning${warnings !== 1 ? 's' : ''}`}
      >
        {warnings > 99 ? '99+' : warnings}
      </span>
    );
  }

  return null;
}

interface ValidationTabBadgeCompactProps {
  errorCount: number;
  warningCount: number;
  className?: string;
}

export function ValidationTabBadgeCompact({
  errorCount,
  warningCount,
  className = '',
}: ValidationTabBadgeCompactProps): React.ReactElement | null {
  if (errorCount === 0 && warningCount === 0) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {errorCount > 0 && (
        <span
          className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-red-500"
          aria-label={`${errorCount} error${errorCount !== 1 ? 's' : ''}`}
        />
      )}
      {warningCount > 0 && errorCount === 0 && (
        <span
          className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-amber-500"
          aria-label={`${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
        />
      )}
    </span>
  );
}
