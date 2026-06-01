import React from 'react';

import type { IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

export function movementReasonText(
  movementInfo: IMovementRangeHex,
): string | undefined {
  return (
    movementInfo.movementInvalidDetails ??
    movementInfo.blockedReason ??
    movementInfo.movementInvalidReason
  );
}

export function MovementReasonContextRows({
  movementInfo,
  projection,
  testId,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testId: string;
}): React.ReactElement | null {
  const label = movementReasonText(movementInfo);
  if (!label) return null;

  const movementSourceReferences =
    projection?.sourceReferences.filter(
      (source) => source.channel === 'movement',
    ) ?? [];
  const movementSourceRefsAttribute =
    formatTacticalProjectionSourceReferences(movementSourceReferences) ||
    undefined;
  const movementRuleRefsAttribute =
    formatTacticalProjectionRuleReferences(movementSourceReferences) ||
    undefined;
  const movementProjectionChannel =
    movementSourceReferences.length > 0 ? 'movement' : undefined;

  return (
    <div
      className="mt-1 border-t border-slate-700/70 pt-1 text-[11px] text-slate-200"
      data-testid={testId}
      data-tactical-projection-source={
        movementProjectionChannel ? 'shared-tactical-map-projection' : undefined
      }
      data-tactical-projection-channel={movementProjectionChannel}
      data-tactical-rules-surface={movementProjectionChannel}
      data-movement-reachable={movementInfo.reachable ? 'true' : 'false'}
      data-movement-type={movementInfo.movementType}
      data-movement-mode={movementInfo.movementMode}
      data-movement-blocked-reason={movementInfo.blockedReason}
      data-movement-invalid-reason={movementInfo.movementInvalidReason}
      data-movement-invalid-details={movementInfo.movementInvalidDetails}
      data-movement-altitude-control-required={
        movementInfo.altitudeControlRequired ? 'true' : undefined
      }
      data-movement-altitude-control-mode={movementInfo.altitudeControlMode}
      data-movement-altitude-control-altitude={
        movementInfo.altitudeControlAltitude
      }
      data-movement-reason={label}
      data-movement-reason-source-refs={movementSourceRefsAttribute}
      data-movement-reason-rule-refs={movementRuleRefsAttribute}
    >
      {label}
    </div>
  );
}
