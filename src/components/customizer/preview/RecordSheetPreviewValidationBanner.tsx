import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { ValidationSeverity } from '@/hooks/useUnitValidation';

interface PreviewValidationIssue {
  readonly id: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly details?: string;
  readonly fix?: string;
}

interface RecordSheetPreviewValidationBannerProps {
  readonly issues: readonly PreviewValidationIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
}

const SEVERITY_STYLES: Record<ValidationSeverity, string> = {
  [ValidationSeverity.ERROR]: 'border-red-500/40 bg-red-950/30 text-red-200',
  [ValidationSeverity.WARNING]: 'border-warning/50 bg-warning/10 text-warning',
  [ValidationSeverity.INFO]: 'border-sky-400/40 bg-sky-950/20 text-sky-200',
};

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}

export function RecordSheetPreviewValidationBanner({
  issues,
  errorCount,
  warningCount,
}: RecordSheetPreviewValidationBannerProps): React.ReactElement | null {
  if (issues.length === 0) {
    return null;
  }

  const summaryTone =
    errorCount > 0
      ? 'text-red-200'
      : warningCount > 0
        ? 'text-warning'
        : 'text-sky-200';

  return (
    <details className="group bg-surface-raised/80 border-border-theme-subtle border-b">
      <summary className="hover:bg-surface-raised focus-visible:ring-accent flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className={summaryTone}>
          {errorCount > 0 ? (
            <AppIcon name="close" size="inline" aria-hidden="true" />
          ) : warningCount > 0 ? (
            <AppIcon name="warning" size="inline" aria-hidden="true" />
          ) : (
            <AppIcon name="info" size="inline" aria-hidden="true" />
          )}
        </span>
        <span className="text-text-theme-primary text-sm font-semibold">
          Review {formatCount(issues.length, 'validation issue')}
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs tabular-nums">
          {errorCount > 0 && (
            <span className="text-red-200">
              {formatCount(errorCount, 'error')}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-warning">
              {formatCount(warningCount, 'warning')}
            </span>
          )}
          <span
            aria-hidden="true"
            className="text-text-theme-secondary transition-transform group-open:rotate-180"
          >
            <AppIcon name="chevron-down" size="inline" aria-hidden="true" />
          </span>
        </span>
      </summary>

      <div className="border-border-theme-subtle border-t px-4 py-2">
        <ul className="divide-border-theme-subtle max-h-64 divide-y overflow-y-auto">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="flex items-start gap-3 py-2 first:pt-0"
            >
              <span
                className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${SEVERITY_STYLES[issue.severity]}`}
              >
                {issue.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-text-theme-primary text-sm font-medium">
                  {issue.message}
                </p>
                {issue.details && (
                  <p className="text-text-theme-secondary mt-0.5 text-xs">
                    {issue.details}
                  </p>
                )}
                {issue.fix && (
                  <p className="mt-1 text-xs text-emerald-300">
                    Suggested fix: {issue.fix}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
