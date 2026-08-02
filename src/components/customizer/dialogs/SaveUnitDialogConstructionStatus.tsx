import React from 'react';

import { ErrorIcon, SpinnerIcon } from './dialogPresentation';

export interface ConstructionValidationState {
  isValid: boolean;
  isLoading: boolean;
  isValidating: boolean;
  errorCount: number;
}

export function SaveUnitDialogConstructionStatus({
  errorCount,
  isLoading,
  isValid,
  isValidating,
}: ConstructionValidationState): React.ReactElement | null {
  if (isLoading || isValidating) {
    return (
      <div className="text-text-theme-secondary flex items-center gap-2">
        <SpinnerIcon className="h-4 w-4 animate-spin" />
        <span className="text-sm">Checking construction readiness...</span>
      </div>
    );
  }

  if (isValid) return null;

  const displayedErrorCount = errorCount || 1;
  const errorLabel = `${displayedErrorCount} construction error${displayedErrorCount === 1 ? '' : 's'}`;
  return (
    <div className="flex items-start gap-2 text-red-400" role="alert">
      <ErrorIcon />
      <span className="text-sm">
        Fix {errorLabel} before saving. Cancel to keep editing your draft.
      </span>
    </div>
  );
}
