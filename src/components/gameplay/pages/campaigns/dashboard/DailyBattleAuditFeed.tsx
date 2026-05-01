/**
 * Daily Battle Audit Feed
 *
 * Per `wire-encounter-to-campaign-round-trip` Wave 5 §7.3 / §7.4: the
 * campaign dashboard's audit feed for daily battle-effects rollups. Each
 * entry summarises one day's worth of post-battle / salvage / repair
 * processing and links to the per-match review page so the player can
 * re-inspect details.
 *
 * The component is purely presentational — the dashboard wires the
 * campaign store's `dailyBattleAudit` ledger to it.
 */

import Link from 'next/link';

import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';

export interface DailyBattleAuditFeedProps {
  /** Newest-first list of audit entries from the campaign ledger. */
  readonly entries: readonly IDailyBattleAuditEntry[];
  /** Maximum number of entries to show before collapsing into a "more" link. */
  readonly maxEntries?: number;
}

/**
 * Render the audit feed. Returns null when the ledger is empty so the
 * dashboard layout doesn't show an empty card.
 */
export function DailyBattleAuditFeed({
  entries,
  maxEntries = 5,
}: DailyBattleAuditFeedProps): React.ReactElement | null {
  if (entries.length === 0) return null;

  // Newest-first slice for surface area control. The ledger itself is
  // append-only chronological so we reverse + cap.
  const visible = [...entries].reverse().slice(0, maxEntries);

  return (
    <div
      className="border-border-theme-subtle bg-surface-raised mb-6 rounded-lg border p-4"
      data-testid="daily-battle-audit-feed"
    >
      <h3 className="text-text-theme-primary mb-3 text-base font-semibold">
        Battle Audit Feed
      </h3>
      <ul className="space-y-3">
        {visible.map((entry) => (
          <li
            key={
              entry.date + ':' + entry.matches.map((m) => m.matchId).join(',')
            }
            className="border-border-theme-subtle/60 rounded-md border p-3"
            data-testid={`audit-entry-${entry.date}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-text-theme-primary text-sm font-medium">
                {entry.date}
              </span>
              <span className="text-text-theme-secondary text-xs">
                {entry.matchesProcessed} match
                {entry.matchesProcessed === 1 ? '' : 'es'} processed
              </span>
            </div>

            <dl className="text-text-theme-secondary mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
              <div>
                <dt className="inline">XP awarded:</dt>{' '}
                <dd className="text-text-theme-primary inline font-medium">
                  {entry.totalXpAwarded}
                </dd>
              </div>
              <div>
                <dt className="inline">Wounded:</dt>{' '}
                <dd className="text-text-theme-primary inline font-medium">
                  {entry.pilotsWounded}
                </dd>
              </div>
              <div>
                <dt className="inline">KIA:</dt>{' '}
                <dd className="text-text-theme-primary inline font-medium">
                  {entry.pilotsKia}
                </dd>
              </div>
              <div>
                <dt className="inline">MIA:</dt>{' '}
                <dd className="text-text-theme-primary inline font-medium">
                  {entry.pilotsMia}
                </dd>
              </div>
              <div>
                <dt className="inline">Salvage:</dt>{' '}
                <dd className="text-text-theme-primary inline font-medium">
                  {entry.salvageValueSecured.toLocaleString()} C
                </dd>
              </div>
              <div>
                <dt className="inline">Repairs:</dt>{' '}
                <dd className="text-text-theme-primary inline font-medium">
                  {entry.repairTicketsCreated}
                </dd>
              </div>
            </dl>

            {entry.contractsClosed.length > 0 && (
              <p
                className="mt-2 text-xs text-amber-200"
                data-testid={`audit-entry-${entry.date}-contracts-closed`}
              >
                Contracts closed:{' '}
                {entry.contractsClosed.map((id) => id.slice(0, 8)).join(', ')}
              </p>
            )}

            {/* Per §7.4: clicking each match link navigates to its review page. */}
            <ul className="mt-2 flex flex-wrap gap-2">
              {entry.matches.map((match) => (
                <li key={match.matchId}>
                  <Link
                    href={`/gameplay/games/${match.matchId}/review`}
                    className="bg-surface-base/40 text-text-theme-primary hover:bg-surface-base/60 inline-flex items-center rounded-md px-2 py-1 text-xs"
                    data-testid={`audit-match-link-${match.matchId}`}
                  >
                    {match.summary}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {entries.length > maxEntries && (
        <p className="text-text-theme-secondary mt-3 text-xs">
          Showing {visible.length} of {entries.length} entries.
        </p>
      )}
    </div>
  );
}
