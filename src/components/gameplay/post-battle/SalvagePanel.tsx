/**
 * SalvagePanel
 *
 * Renders the Wave 3a `ISalvageReport` as a two-column UI: per-side
 * totals on top, candidate list below. When `report` is null/empty
 * shows the "No salvage" empty state.
 *
 * Pure presentational — caller is responsible for fetching the
 * `ISalvageReport` from the salvage engine before render.
 *
 * @spec openspec/changes/add-post-battle-review-ui § 5 (Salvage Panel)
 * @module components/gameplay/post-battle/SalvagePanel
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card, CardSection } from '@/components/ui/Card';
import {
  type ISalvageCandidate,
  type ISalvageReport,
} from '@/types/campaign/Salvage';

export interface SalvagePanelProps {
  /** Engine-derived salvage report; null when no pool was generated. */
  readonly report: ISalvageReport | null;
}

/**
 * Format an integer C-Bill amount as a localized string with the
 * "CB" suffix. Keeps formatting consistent with the rest of the
 * campaign UI.
 */
function formatCBills(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} CB`;
}

function dispositionBadgeVariant(
  disposition: ISalvageCandidate['disposition'],
): 'emerald' | 'amber' | 'cyan' | 'slate' {
  if (disposition === 'mercenary') return 'emerald';
  if (disposition === 'employer') return 'cyan';
  if (disposition === 'auction-mercenary') return 'amber';
  return 'slate';
}

function CandidateRow({
  candidate,
}: {
  readonly candidate: ISalvageCandidate;
}): React.ReactElement {
  return (
    <li
      className="border-border-theme-subtle flex items-center justify-between border-b py-2 last:border-b-0"
      data-testid={`salvage-candidate-${candidate.unitId}`}
    >
      <div>
        <div className="text-text-theme-primary text-sm font-medium">
          {candidate.designation}
        </div>
        <div className="text-text-theme-secondary mt-0.5 text-xs">
          {candidate.damageLevel} &middot;{' '}
          {Math.round(candidate.recoveryPercentage * 100)}% recovery
        </div>
      </div>
      <div className="text-right">
        <div className="text-text-theme-primary font-mono text-sm">
          {formatCBills(candidate.recoveredValue)}
        </div>
        <Badge
          variant={dispositionBadgeVariant(candidate.disposition)}
          size="sm"
        >
          {candidate.disposition}
        </Badge>
      </div>
    </li>
  );
}

export function SalvagePanel({
  report,
}: SalvagePanelProps): React.ReactElement {
  // Empty state: no report at all OR a report with zero candidates.
  if (!report || report.candidates.length === 0) {
    return (
      <Card data-testid="salvage-panel">
        <CardSection title="Salvage" titleColor="amber">
          <p
            className="text-text-theme-secondary text-sm"
            data-testid="salvage-empty"
          >
            No salvage recovered from this engagement.
          </p>
        </CardSection>
      </Card>
    );
  }

  // Partition candidates by recipient. We bucket auction variants into
  // their downstream side so the totals match the engine's split.
  const mercenaryCandidates = report.candidates.filter(
    (c) =>
      c.disposition === 'mercenary' || c.disposition === 'auction-mercenary',
  );
  const employerCandidates = report.candidates.filter(
    (c) => c.disposition === 'employer' || c.disposition === 'auction-employer',
  );

  return (
    <Card data-testid="salvage-panel">
      <CardSection title="Salvage" titleColor="amber">
        <div
          className="mb-4 grid grid-cols-2 gap-4 text-sm"
          data-testid="salvage-totals"
        >
          <div className="bg-surface-raised/30 rounded-md p-3">
            <div className="text-text-theme-secondary text-xs tracking-wider uppercase">
              Mercenary
            </div>
            <div
              className="mt-1 font-mono text-emerald-400"
              data-testid="salvage-total-mercenary"
            >
              {formatCBills(report.totalValueMercenary)}
            </div>
          </div>
          <div className="bg-surface-raised/30 rounded-md p-3">
            <div className="text-text-theme-secondary text-xs tracking-wider uppercase">
              Employer
            </div>
            <div
              className="mt-1 font-mono text-cyan-400"
              data-testid="salvage-total-employer"
            >
              {formatCBills(report.totalValueEmployer)}
            </div>
          </div>
        </div>

        {report.auctionRequired ? (
          <div
            className="mb-3 text-xs text-amber-400"
            data-testid="salvage-auction-flag"
          >
            Auction draft required — candidates marked `auction-*` are still
            contested.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div data-testid="salvage-mercenary-list">
            <div className="text-text-theme-secondary mb-2 text-xs font-semibold uppercase">
              Mercenary award ({mercenaryCandidates.length})
            </div>
            {mercenaryCandidates.length === 0 ? (
              <p className="text-text-theme-muted text-xs">None</p>
            ) : (
              <ul>
                {mercenaryCandidates.map((c) => (
                  <CandidateRow key={c.unitId} candidate={c} />
                ))}
              </ul>
            )}
          </div>
          <div data-testid="salvage-employer-list">
            <div className="text-text-theme-secondary mb-2 text-xs font-semibold uppercase">
              Employer award ({employerCandidates.length})
            </div>
            {employerCandidates.length === 0 ? (
              <p className="text-text-theme-muted text-xs">None</p>
            ) : (
              <ul>
                {employerCandidates.map((c) => (
                  <CandidateRow key={c.unitId} candidate={c} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardSection>
    </Card>
  );
}

export default SalvagePanel;
