import type { IMovementRangeHex } from '@/types/gameplay';

import type { ProjectionExplanationInput } from './tacticalMapProjection.types';

import {
  formatMovementOption,
  formatMovementOptionElevation,
  formatMovementType,
  formatSignedCost,
} from './tacticalMapProjection.movementFormatting';

export function appendMovementProjectionExplanation(
  parts: string[],
  { movement, movementCostReasons }: ProjectionExplanationInput,
): void {
  if (!movement) {
    return;
  }

  parts.push(formatMovementSummary(movement));
  appendIfPresent(parts, formatMovementModeDetail(movement));
  appendIfPresent(parts, formatMovementTerrainCost(movement));
  appendIfPresent(parts, formatMovementElevationDetail(movement));
  appendIfPresent(parts, formatMovementHeat(movement));
  appendIfPresent(parts, formatMovementConversion(movement));
  appendIfPresent(parts, formatMovementAltitudeControl(movement));
  appendAutomaticLandingProjectionExplanation(parts, movement);
  appendIfPresent(parts, formatMovementHullDownExit(movement));
  appendMovementOptionsProjectionExplanation(parts, movement);
  appendMovementPathProjectionExplanation(parts, movement);
  appendStandUpProjectionExplanation(parts, movement);
  appendMovementCostConsequences(parts, movementCostReasons);
}

function appendIfPresent(parts: string[], value: string | undefined): void {
  if (value) {
    parts.push(value);
  }
}

function formatMovementSummary(movement: IMovementRangeHex): string {
  return `${formatMovementType(movement.movementType)} ${
    movement.reachable ? 'reachable' : 'blocked'
  } ${movement.mpCost} MP`;
}

function formatMovementModeDetail(
  movement: IMovementRangeHex,
): string | undefined {
  const movementTypeName = String(movement.movementType).toLowerCase();
  return movement.movementMode && movement.movementMode !== movementTypeName
    ? `mode ${movement.movementMode}`
    : undefined;
}

function formatMovementTerrainCost(
  movement: IMovementRangeHex,
): string | undefined {
  return movement.terrainCost === undefined
    ? undefined
    : `terrain cost ${formatSignedCost(movement.terrainCost)}`;
}

function formatMovementElevationDetail(
  movement: IMovementRangeHex,
): string | undefined {
  return movement.elevationDelta !== undefined ||
    movement.elevationCost !== undefined
    ? `elevation ${formatMovementOptionElevation(movement)}`
    : undefined;
}

function formatMovementHeat(movement: IMovementRangeHex): string | undefined {
  return movement.heatGenerated === undefined
    ? undefined
    : `heat ${formatSignedCost(movement.heatGenerated)}`;
}

function formatMovementConversion(
  movement: IMovementRangeHex,
): string | undefined {
  return movement.conversionStepCount !== undefined ||
    movement.conversionMpCost !== undefined
    ? `conversion ${movement.conversionStepCount ?? 0} steps ${
        movement.conversionMpCost ?? 0
      } MP`
    : undefined;
}

function formatMovementAltitudeControl(
  movement: IMovementRangeHex,
): string | undefined {
  return movement.altitudeControlStepCount !== undefined ||
    movement.altitudeControlMpCost !== undefined
    ? `altitude control ${movement.altitudeControlStepCount ?? 0} steps ${
        movement.altitudeControlMpCost ?? 0
      } MP`
    : undefined;
}

function appendAutomaticLandingProjectionExplanation(
  parts: string[],
  movement: IMovementRangeHex,
): void {
  if (!movement.automaticLandingRequired) {
    return;
  }

  parts.push(
    `automatic landing ${movement.automaticLandingDistance ?? 0}/${
      movement.automaticLandingMinimumDistance ?? 0
    } hexes`,
  );
  if (movement.automaticLandingReason) {
    parts.push(`automatic landing reason ${movement.automaticLandingReason}`);
  }
}

function formatMovementHullDownExit(
  movement: IMovementRangeHex,
): string | undefined {
  return movement.hullDownExitRequired
    ? `hull-down exit ${formatSignedCost(movement.hullDownExitCost ?? 0)} MP`
    : undefined;
}

function appendMovementOptionsProjectionExplanation(
  parts: string[],
  movement: IMovementRangeHex,
): void {
  if (movement.movementModeOptions?.length) {
    parts.push(
      `movement options ${movement.movementModeOptions
        .map(formatMovementOption)
        .join(', ')}`,
    );
  }
}

function appendMovementPathProjectionExplanation(
  parts: string[],
  movement: IMovementRangeHex,
): void {
  if (movement.path && movement.path.length > 1) {
    const stepCount = movement.path.length - 1;
    parts.push(`path ${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`);
  }
}

function appendMovementCostConsequences(
  parts: string[],
  movementCostReasons: readonly string[],
): void {
  if (movementCostReasons.length > 0) {
    parts.push(`movement cost consequences ${movementCostReasons.join('; ')}`);
  }
}

function appendStandUpProjectionExplanation(
  parts: string[],
  movement: IMovementRangeHex,
): void {
  if (!movement.standUpRequired) {
    return;
  }

  const standUpMode = movement.standUpMode ?? 'normal';
  const standUpCost =
    movement.standUpCost === undefined
      ? ''
      : ` ${formatSignedCost(movement.standUpCost)} MP`;
  parts.push(`stand-up ${standUpMode}${standUpCost}`);

  const psrText = formatStandUpPsrExplanation(movement);
  if (psrText) {
    parts.push(psrText);
  }
  if (
    movement.standUpPsrModifier !== undefined &&
    movement.standUpPsrModifier !== 0
  ) {
    parts.push(
      `stand-up PSR modifier ${formatSignedCost(movement.standUpPsrModifier)}`,
    );
  }
  if (movement.standUpPsrModifierDetails?.length) {
    parts.push(
      `stand-up modifiers ${movement.standUpPsrModifierDetails.join('; ')}`,
    );
  }
}

function formatStandUpPsrExplanation(
  movement: IMovementRangeHex,
): string | undefined {
  if (movement.standUpPsrImpossibleReason) {
    return `stand-up impossible ${movement.standUpPsrImpossibleReason}`;
  }
  if (movement.standUpPsrRequired) {
    const psrReason = movement.standUpPsrReason
      ? `${movement.standUpPsrReason} `
      : '';
    const target =
      movement.standUpPsrTargetNumber === undefined
        ? 'unknown'
        : Number.isFinite(movement.standUpPsrTargetNumber)
          ? `${movement.standUpPsrTargetNumber}`
          : 'impossible';
    return `stand-up PSR ${psrReason}TN ${target}`;
  }
  if (movement.standUpPsrAutomaticSuccessReason) {
    return `stand-up no PSR ${movement.standUpPsrAutomaticSuccessReason}`;
  }
  return undefined;
}
