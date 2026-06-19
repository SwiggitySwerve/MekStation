import React from 'react';

import type { IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import { TacticalProjectionContextRow } from './HexMapDisplay.contextRow';
import { movementProjectionSourceMetadata } from './HexMapDisplay.tacticalProjectionAttributes';

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

  const source = movementProjectionSourceMetadata(projection?.sourceReferences);

  return (
    <TacticalProjectionContextRow
      dataAttributes={{
        'data-movement-reachable': movementInfo.reachable ? 'true' : 'false',
        'data-movement-type': movementInfo.movementType,
        'data-movement-mode': movementInfo.movementMode,
        'data-movement-blocked-reason': movementInfo.blockedReason,
        'data-movement-invalid-reason': movementInfo.movementInvalidReason,
        'data-movement-invalid-details': movementInfo.movementInvalidDetails,
        'data-movement-altitude-control-required':
          movementInfo.altitudeControlRequired ? 'true' : undefined,
        'data-movement-altitude-control-mode': movementInfo.altitudeControlMode,
        'data-movement-altitude-control-altitude':
          movementInfo.altitudeControlAltitude,
        'data-movement-reason': label,
        'data-movement-reason-source-refs': source.sourceRefs,
        'data-movement-reason-rule-refs': source.ruleRefs,
      }}
      source={source}
      testId={testId}
    >
      {label}
    </TacticalProjectionContextRow>
  );
}
