import React from 'react';

import type { IMovementRangeHex } from '@/types/gameplay';
import type { ITacticalMapHexProjection } from '@/utils/gameplay/tacticalMapProjection';

import {
  formatTacticalProjectionRuleReferences,
  formatTacticalProjectionSourceReferences,
} from '@/utils/gameplay/tacticalMapProjection';

function movementSourceAttributes(
  movementInfo: IMovementRangeHex,
  projection?: ITacticalMapHexProjection,
): Record<string, string | number | undefined> {
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

  return {
    'data-tactical-projection-source': movementProjectionChannel
      ? 'shared-tactical-map-projection'
      : undefined,
    'data-tactical-projection-channel': movementProjectionChannel,
    'data-tactical-rules-surface': movementProjectionChannel,
    'data-movement-reachable': movementInfo.reachable ? 'true' : 'false',
    'data-movement-type': movementInfo.movementType,
    'data-movement-mode': movementInfo.movementMode,
    'data-movement-mp-cost': movementInfo.mpCost,
    'data-movement-source-refs': movementSourceRefsAttribute,
    'data-movement-rule-refs': movementRuleRefsAttribute,
  };
}

function finiteNumberAttribute(value: number | undefined): number | undefined {
  return value === undefined || !Number.isFinite(value) ? undefined : value;
}

function formatStandUpLabel(movementInfo: IMovementRangeHex): string {
  return `${movementInfo.standUpMode === 'careful' ? 'Careful stand' : 'Stand up'}: +${movementInfo.standUpCost ?? '?'} MP`;
}

function formatHullDownExitLabel(movementInfo: IMovementRangeHex): string {
  return `Exit hull-down: +${movementInfo.hullDownExitCost ?? '?'} MP`;
}

function formatStandUpPsrLabel(movementInfo: IMovementRangeHex): string {
  const reason = movementInfo.standUpPsrReason ?? 'Stand-up PSR';
  if (!movementInfo.standUpPsrRequired) {
    return `${movementInfo.standUpPsrAutomaticSuccessReason ?? reason}: no PSR`;
  }
  if (movementInfo.standUpPsrImpossibleReason) {
    return `${reason} impossible - ${movementInfo.standUpPsrImpossibleReason}`;
  }
  if (movementInfo.standUpPsrTargetNumber === undefined) {
    return `${reason} PSR required`;
  }
  const modifier =
    movementInfo.standUpPsrModifier !== undefined &&
    movementInfo.standUpPsrModifier !== 0
      ? ` (${movementInfo.standUpPsrModifier >= 0 ? '+' : ''}${movementInfo.standUpPsrModifier})`
      : '';
  return `${reason} TN ${movementInfo.standUpPsrTargetNumber}${modifier}`;
}

export function MovementStandUpContextRows({
  movementInfo,
  projection,
  testIdPrefix,
}: {
  readonly movementInfo: IMovementRangeHex;
  readonly projection?: ITacticalMapHexProjection;
  readonly testIdPrefix: string;
}): React.ReactElement | null {
  if (
    !movementInfo.standUpRequired &&
    !movementInfo.hullDownExitRequired &&
    !movementInfo.standUpPsrRequired &&
    !movementInfo.standUpPsrAutomaticSuccessReason &&
    !movementInfo.standUpPsrModifierDetails?.length
  ) {
    return null;
  }

  const sourceAttributes = movementSourceAttributes(movementInfo, projection);
  const hasStandUpPsrContext =
    movementInfo.standUpPsrRequired ||
    movementInfo.standUpPsrAutomaticSuccessReason !== undefined;

  return (
    <>
      {movementInfo.standUpRequired && (
        <div
          data-testid={`${testIdPrefix}-stand-up`}
          data-movement-context-kind="stand-up"
          data-movement-stand-up-required="true"
          data-movement-stand-up-mode={movementInfo.standUpMode}
          data-movement-stand-up-cost={movementInfo.standUpCost}
          {...sourceAttributes}
        >
          {formatStandUpLabel(movementInfo)}
        </div>
      )}
      {movementInfo.hullDownExitRequired && (
        <div
          data-testid={`${testIdPrefix}-hull-down-exit`}
          data-movement-context-kind="hull-down-exit"
          data-movement-hull-down-exit-required="true"
          data-movement-hull-down-exit-cost={movementInfo.hullDownExitCost}
          {...sourceAttributes}
        >
          {formatHullDownExitLabel(movementInfo)}
        </div>
      )}
      {hasStandUpPsrContext && (
        <div
          data-testid={`${testIdPrefix}-stand-up-psr`}
          data-movement-context-kind="stand-up-psr"
          data-movement-stand-up-psr-required={
            movementInfo.standUpPsrRequired ? 'true' : 'false'
          }
          data-movement-stand-up-psr-reason={movementInfo.standUpPsrReason}
          data-movement-stand-up-psr-automatic-success-reason={
            movementInfo.standUpPsrAutomaticSuccessReason
          }
          data-movement-stand-up-psr-target-number={finiteNumberAttribute(
            movementInfo.standUpPsrTargetNumber,
          )}
          data-movement-stand-up-psr-modifier={movementInfo.standUpPsrModifier}
          data-movement-stand-up-psr-impossible-reason={
            movementInfo.standUpPsrImpossibleReason
          }
          {...sourceAttributes}
        >
          {formatStandUpPsrLabel(movementInfo)}
        </div>
      )}
      {movementInfo.standUpPsrModifierDetails?.length ? (
        <div
          data-testid={`${testIdPrefix}-stand-up-modifiers`}
          data-movement-context-kind="stand-up-psr-modifiers"
          data-movement-stand-up-psr-modifier-details={movementInfo.standUpPsrModifierDetails.join(
            '|',
          )}
          {...sourceAttributes}
        >
          Modifiers: {movementInfo.standUpPsrModifierDetails.join('; ')}
        </div>
      ) : null}
    </>
  );
}
