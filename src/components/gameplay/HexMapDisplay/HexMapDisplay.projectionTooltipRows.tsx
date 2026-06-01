import React from 'react';

import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceLabels,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

function formatProjectionStatusLabel(
  status: ITacticalMapHexProjection['status'],
): string {
  switch (status) {
    case 'mixed':
      return 'Mixed';
    case 'blocked':
      return 'Blocked';
    case 'legal':
      return 'Legal';
    case 'neutral':
      return 'Neutral';
  }
}

export function ProjectionContextRows({
  projection,
  testIdPrefix,
}: {
  readonly projection?: ITacticalMapHexProjection;
  readonly testIdPrefix: string;
}): React.ReactElement | null {
  if (!projection) return null;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={`${testIdPrefix}-projection-context`}
      data-tactical-tooltip-status={projection.status}
      data-tactical-tooltip-intent={projection.intent}
      data-tactical-tooltip-movement-status={projection.movementStatus}
      data-tactical-tooltip-combat-status={projection.combatStatus}
      data-tactical-tooltip-blocked-reasons={projection.blockedReasons.join(
        '|',
      )}
      data-tactical-tooltip-sources={formatTacticalProjectionSourceReferences(
        projection.sourceReferences,
      )}
      data-tactical-tooltip-rule-refs={formatTacticalProjectionRuleReferences(
        projection.sourceReferences,
      )}
      data-tactical-tooltip-explanation={projection.explanation}
    >
      <div data-testid={`${testIdPrefix}-projection-status`}>
        Projection: {formatProjectionStatusLabel(projection.status)} -{' '}
        {projection.intent}
      </div>
      <div data-testid={`${testIdPrefix}-projection-channel-status`}>
        Movement channel: {projection.movementStatus}; combat channel:{' '}
        {projection.combatStatus}
      </div>
      {projection.blockedReasons.length > 0 && (
        <div data-testid={`${testIdPrefix}-projection-reasons`}>
          Projection reasons: {projection.blockedReasons.join('; ')}
        </div>
      )}
      {projection.explanation && (
        <div data-testid={`${testIdPrefix}-projection-explanation`}>
          Projection detail: {projection.explanation}
        </div>
      )}
      {projection.sourceReferences.length > 0 && (
        <div data-testid={`${testIdPrefix}-projection-sources`}>
          Sources:{' '}
          {formatTacticalProjectionSourceLabels(projection.sourceReferences)}
        </div>
      )}
    </div>
  );
}
