/**
 * Pending Outcomes Banner
 *
 * Per `wire-encounter-to-campaign-round-trip` spec task group 5: surfaced
 * on the campaign dashboard whenever the campaign store carries one or
 * more entries in `pendingBattleOutcomes`. Each row links to the
 * corresponding `/gameplay/games/[matchId]/review` page so the player
 * can re-inspect the outcome before advancing the day.
 *
 * Wave 5 §11.2 extension: when any outcome has a recorded apply error,
 * the banner switches to a critical-tone variant showing
 * "N outcome(s) failed to apply — see details" with per-match links
 * that include the recorded error message in the link's title attr.
 *
 * Pure presentational — the dashboard wires the live store to it. This
 * keeps the banner trivially testable with synthetic outcomes.
 */

import Link from 'next/link';

import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

export interface PendingOutcomesBannerProps {
  /** Live snapshot from `useCampaignStore.getPendingOutcomes()`. */
  readonly outcomes: readonly ICombatOutcome[];
  /**
   * Optional matchId → error message map from
   * `useCampaignStore.getOutcomeApplyErrors()`. When non-empty, the
   * banner shows a "failed to apply" sub-line and styles affected
   * outcome links in red.
   */
  readonly applyErrors?: Readonly<Record<string, string>>;
}

/**
 * Render the pending-outcomes banner. Returns null when the queue is
 * empty — Wave 5 spec scenario "Banner dismisses itself once queue is
 * drained by the post-battle processor" is satisfied implicitly: the
 * dashboard re-evaluates props on every store mutation and unmounts the
 * banner when the queue empties.
 */
export function PendingOutcomesBanner({
  outcomes,
  applyErrors = {},
}: PendingOutcomesBannerProps): React.ReactElement | null {
  if (outcomes.length === 0) return null;

  const errorCount = Object.keys(applyErrors).length;

  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 ${
        errorCount > 0
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-amber-500/40 bg-amber-500/10'
      }`}
      data-testid="pending-outcomes-banner"
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-text-theme-primary">
          <p
            className="text-sm font-semibold"
            data-testid="pending-outcomes-count"
          >
            {outcomes.length} pending battle outcome
            {outcomes.length === 1 ? '' : 's'} — advance day to apply
          </p>
          {errorCount > 0 && (
            <p
              className="mt-1 text-xs font-medium text-red-300"
              data-testid="pending-outcomes-error-count"
            >
              {errorCount} outcome{errorCount === 1 ? '' : 's'} failed to apply
              — see details
            </p>
          )}
          <p className="text-text-theme-secondary mt-1 text-xs">
            Review individual matches before the day pipeline drains the queue.
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {outcomes.map((outcome) => {
          const error = applyErrors[outcome.matchId];
          const isError = Boolean(error);
          return (
            <li key={outcome.matchId}>
              <Link
                href={`/gameplay/games/${outcome.matchId}/review`}
                className={`inline-flex min-h-[32px] items-center rounded-md px-3 py-1.5 text-xs font-medium ${
                  isError
                    ? 'border border-red-400/60 bg-red-500/15 text-red-100 hover:bg-red-500/25'
                    : 'border border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
                }`}
                data-testid={`pending-outcome-link-${outcome.matchId}`}
                title={error ?? undefined}
              >
                {outcome.contractId
                  ? `Match ${outcome.matchId.slice(0, 8)} (contract)`
                  : `Match ${outcome.matchId.slice(0, 8)}`}
                {isError ? ' — failed' : ''}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
