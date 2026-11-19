import type { IPendingPSR } from '@/types/gameplay';

/** Present the already-decided target shape; never derive a piloting target. */
export function PendingPilotingChecks({
  checks,
}: {
  readonly checks: readonly IPendingPSR[];
}): React.ReactElement | null {
  if (checks.length === 0) return null;
  return (
    <section className="mb-4" aria-label="Pending piloting checks">
      <h3 className="text-text-theme-primary mb-2 text-sm font-bold">
        PENDING PILOTING CHECKS
      </h3>
      <p className="text-text-theme-secondary text-sm">
        {checks
          .map(
            (check) =>
              `${check.reason}: ${
                check.automaticFailure
                  ? 'automatic failure'
                  : check.fixedTargetNumber !== undefined
                    ? `TN ${check.fixedTargetNumber}+`
                    : 'PSR required'
              }`,
          )
          .join('; ')}
      </p>
    </section>
  );
}
