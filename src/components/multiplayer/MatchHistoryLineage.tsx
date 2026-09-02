/**
 * Presentational strip for a viewer-projected lineage block.
 *
 * Reason is rendered only when the key is present so a player
 * projection (key omitted) cannot grow a blank "reason" row. Not
 * mounted on /audit/timeline — that page lists IBaseEvent[] from
 * EventStoreService and is not this HTTP surface.
 */

import React from 'react';

import type { IViewerHistoryLineage } from '@/lib/multiplayer/server/history/ViewerHistoryLineage';

export interface MatchHistoryLineageProps {
  readonly lineage: IViewerHistoryLineage;
}

export function MatchHistoryLineage({
  lineage,
}: MatchHistoryLineageProps): React.ReactElement {
  return (
    <ol
      data-testid="match-history-lineage"
      className="space-y-1 text-sm text-text-theme-primary"
    >
      {lineage.transitions.map((transition) => (
        <li
          key={`${transition.fromBranchId}:${transition.toBranchId}:${transition.supersededAt}`}
          data-testid="match-history-lineage-transition"
        >
          <span>
            {transition.fromBranchId} → {transition.toBranchId}
          </span>
          <span> cutoff {transition.baseRevision}</span>
          <span>
            {' '}
            {transition.invalidatedArtifacts.length} artifacts
          </span>
          {'reason' in transition ? (
            <span data-testid="match-history-lineage-reason">
              {' '}
              {transition.reason}
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
