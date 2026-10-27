import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
export type ValidationIconSeverity = 'error' | 'warning' | 'info';
export const validationIconColors: Record<ValidationIconSeverity, string> = {
  error: 'text-red-400',
  warning: 'text-warning',
  info: 'text-blue-400',
};

export function ValidationIssueIcon({
  severity,
  className = '',
}: {
  severity: ValidationIconSeverity;
  className?: string;
}): React.ReactElement {
  return (
    <AppIcon
      name={severity === 'warning' ? 'warning' : 'info'}
      size="inline"
      className={className + ' shrink-0'}
      aria-hidden="true"
    />
  );
}
