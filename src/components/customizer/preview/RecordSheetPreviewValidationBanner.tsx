import React from 'react';

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

export function RecordSheetPreviewValidationBanner({
  issues,
  errorCount,
  warningCount,
}: RecordSheetPreviewValidationBannerProps): React.ReactElement | null {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor:
          errorCount > 0
            ? 'rgba(239, 68, 68, 0.15)'
            : 'rgba(234, 179, 8, 0.15)',
        borderBottom: `1px solid ${
          errorCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'
        }`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      <span
        style={{
          color: errorCount > 0 ? '#ef4444' : '#eab308',
          fontSize: '16px',
          marginTop: '2px',
        }}
      >
        {errorCount > 0 ? '⛔' : '⚠'}
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: errorCount > 0 ? '#ef4444' : '#eab308',
            fontWeight: 600,
            fontSize: '13px',
            marginBottom: '4px',
          }}
        >
          {errorCount > 0 ? 'Configuration Error' : 'Preview Warning'}
          {issues.length > 1 ? 's' : ''}
          {errorCount > 0 &&
            warningCount > 0 &&
            ` (${errorCount} error${errorCount > 1 ? 's' : ''}, ${warningCount} warning${warningCount > 1 ? 's' : ''})`}
        </div>
        <ul
          style={{
            margin: 0,
            padding: '0 0 0 16px',
            fontSize: '12px',
          }}
        >
          {issues.map((issue) => (
            <li
              key={issue.id}
              style={{
                marginBottom: '4px',
                color:
                  issue.severity === ValidationSeverity.ERROR
                    ? 'rgba(239, 68, 68, 0.9)'
                    : issue.severity === ValidationSeverity.WARNING
                      ? 'rgba(234, 179, 8, 0.9)'
                      : 'rgba(156, 163, 175, 0.9)',
              }}
            >
              <strong>{issue.message}</strong>
              {issue.details && (
                <span style={{ opacity: 0.8 }}> — {issue.details}</span>
              )}
              {issue.fix && (
                <div
                  style={{
                    fontSize: '11px',
                    opacity: 0.7,
                    marginTop: '2px',
                  }}
                >
                  Fix: {issue.fix}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
