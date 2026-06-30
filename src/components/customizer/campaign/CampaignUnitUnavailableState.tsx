import React from 'react';

export function CampaignUnitUnavailableState({
  onReturn,
  unitId,
}: {
  readonly onReturn: () => void;
  readonly unitId: string;
}): React.ReactElement {
  return (
    <div className="bg-surface-deep flex min-h-screen items-center justify-center">
      <div className="text-text-theme-secondary p-8 text-center">
        <p className="mb-2 text-lg">Campaign unit unavailable</p>
        <p className="mb-4 text-sm">
          The campaign unit {unitId} could not be loaded for refit.
        </p>
        <button
          onClick={onReturn}
          className="bg-accent text-surface-deep hover:bg-accent-hover rounded px-4 py-2 transition-colors"
        >
          Return to campaign
        </button>
      </div>
    </div>
  );
}
