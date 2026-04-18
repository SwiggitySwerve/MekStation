/**
 * Pending Outcomes Banner
 *
 * Per `wire-encounter-to-campaign-round-trip` spec task group 5: surfaced
 * on the campaign dashboard whenever the campaign store carries one or
 * more entries in `pendingBattleOutcomes`. Each row links to the
 * corresponding `/gameplay/games/[matchId]/review` page so the player
 * can re-inspect the outcome before advancing the day.
 *
 * Pure presentational — the dashboard wires the live store to it. This
 * keeps the banner trivially testable with synthetic outcomes.
 */

import Link from 'next/link';

import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

export interface PendingOutcomesBannerProps {
  /** Live snapshot from `useCampaignStore.getPendingOutcomes()`. */
  readonly outcomes: readonly ICombatOutcome[];
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
}: PendingOutcomesBannerProps): React.ReactElement | null {
  if (outcomes.length === 0) return null;

  return (
    <div
      className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
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
          <p className="text-text-theme-secondary mt-1 text-xs">
            Review individual matches before the day pipeline drains the queue.
          </p>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {outcomes.map((outcome) => (
          <li key={outcome.matchId}>
            <Link
              href={`/gameplay/games/${outcome.matchId}/review`}
              className="inline-flex min-h-[32px] items-center rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
              data-testid={`pending-outcome-link-${outcome.matchId}`}
            >
              {outcome.contractId
                ? `Match ${outcome.matchId.slice(0, 8)} (contract)`
                : `Match ${outcome.matchId.slice(0, 8)}`}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
