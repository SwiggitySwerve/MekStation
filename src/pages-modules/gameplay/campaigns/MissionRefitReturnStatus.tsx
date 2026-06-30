import type React from 'react';

interface MissionRefitReturnStatusProps {
  readonly customizerResult: string | null;
}

export function MissionRefitReturnStatus({
  customizerResult,
}: MissionRefitReturnStatusProps): React.ReactElement | null {
  if (customizerResult !== 'saved') return null;

  return (
    <div
      data-testid="mission-readiness-refit-return-status"
      className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100"
    >
      Refit order saved. Deployment validation refreshed for the selected unit.
    </div>
  );
}
