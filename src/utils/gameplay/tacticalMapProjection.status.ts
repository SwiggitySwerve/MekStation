import type {
  ICombatRangeHex,
  IHexTerrain,
  IMovementRangeHex,
  IMovementRangeModeOption,
} from '@/types/gameplay';

import type {
  ITacticalMapCombatLosBlockerReference,
  TacticalMapCombatProjectionStatus,
  TacticalMapHexProjectionIntent,
  TacticalMapHexProjectionStatus,
  TacticalMapMovementCostProjectionStatus,
  TacticalMapMovementHazardProjectionStatus,
  TacticalMapMovementProjectionStatus,
} from './tacticalMapProjection.types';

import {
  formatMovementOptionElevation,
  formatSignedCost,
  hasPositiveCost,
  movementHasBlockedOption,
  movementHasReachableOption,
  movementOptionsForProjection,
} from './tacticalMapProjection.movementFormatting';
import { isRepresentedMinefieldTerrain } from './tacticalMapProjection.sourceReferences';

export function deriveProjectionIntent({
  pathIndex,
  movement,
  combat,
  inAttackRange,
  combatLosBlockerFor,
}: {
  readonly pathIndex?: number;
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): TacticalMapHexProjectionIntent {
  if (pathIndex !== undefined) return 'path';
  if (movement && (combat?.hasTarget || inAttackRange)) {
    return 'movement-combat';
  }
  if (movement) return 'movement';
  if (combat?.hasTarget) return 'combat';
  if (combatLosBlockerFor.length > 0) return 'los-blocker';
  if (inAttackRange) return 'combat';
  return 'terrain';
}

export function deriveProjectionStatus({
  movement,
  combat,
  combatLosBlockerFor,
}: {
  readonly movement?: IMovementRangeHex;
  readonly combat?: ICombatRangeHex;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): TacticalMapHexProjectionStatus {
  const movementLegal = movementHasReachableOption(movement);
  const movementBlocked = movementHasBlockedOption(movement);
  const losBlocked = losBlockerHasBlockedRef(combatLosBlockerFor);
  const losPartial =
    combatLosBlockerFor.length > 0 &&
    combatLosBlockerFor.some((ref) => ref.losState === 'partial');
  const legal =
    movementLegal ||
    Boolean(combat?.attackable) ||
    Boolean(
      combat?.inRange && !combat.hasTarget && combatLosBlockerFor.length === 0,
    );
  const blocked =
    movementBlocked ||
    (combat ? combat.hasTarget && !combat.attackable : false) ||
    losBlocked;

  if ((legal || losPartial) && blocked) return 'mixed';
  if (blocked) return 'blocked';
  if (losPartial) return 'mixed';
  if (legal) return 'legal';
  return 'neutral';
}

export function deriveMovementProjectionStatus(
  movement: IMovementRangeHex | undefined,
): TacticalMapMovementProjectionStatus {
  if (!movement) return 'none';

  const hasReachableOption = movementHasReachableOption(movement);
  const hasBlockedOption = movementHasBlockedOption(movement);

  if (hasReachableOption && hasBlockedOption) return 'mixed';
  if (hasReachableOption) return 'legal';
  return 'blocked';
}

export function deriveMovementCostProjectionStatus({
  movement,
  movementCostReasons,
}: {
  readonly movement: IMovementRangeHex | undefined;
  readonly movementCostReasons: readonly string[];
}): TacticalMapMovementCostProjectionStatus {
  if (!movementHasReachableOption(movement)) return 'none';
  return movementCostReasons.length > 0 ? 'costly' : 'ordinary';
}

export function deriveMovementCostProjectionReasons(
  movement: IMovementRangeHex | undefined,
): readonly string[] {
  const reasons = movementOptionsForProjection(movement)
    .filter((option) => option.reachable)
    .flatMap(formatReachableMovementCostReasons);
  return Array.from(new Set(reasons));
}

export function deriveMovementHazardProjectionStatus(
  movementHazardReasons: readonly string[],
): TacticalMapMovementHazardProjectionStatus {
  return movementHazardReasons.length > 0 ? 'represented-minefield' : 'none';
}

export function deriveMovementHazardProjectionReasons({
  terrain,
  movement,
}: {
  readonly terrain: IHexTerrain;
  readonly movement?: IMovementRangeHex;
}): readonly string[] {
  if (!isRepresentedMinefieldTerrain(terrain)) return [];
  const entryContext = movementHasReachableOption(movement)
    ? 'reachable entry'
    : 'BattleMech entry';
  return [
    `${entryContext} through represented mines can apply 10 damage to each leg`,
    'mine leg structure damage can queue a leg-damage PSR',
    '20+ mine damage in the movement phase can queue a damage-threshold PSR',
  ];
}

function formatReachableMovementCostReasons(
  option: IMovementRangeModeOption,
): readonly string[] {
  return [
    formatPositiveMovementCostReason('terrain', option.terrainCost),
    formatPositiveMovementCostReason('turning', option.turningCost),
    formatElevationMovementCostReason(option),
    formatPositiveMovementCostReason('heat', option.heatGenerated),
    formatConversionMovementCostReason(option),
    formatAltitudeControlMovementCostReason(option),
    formatAutomaticLandingMovementCostReason(option),
    formatHullDownExitMovementCostReason(option),
  ].filter(isDefinedString);
}

function formatPositiveMovementCostReason(
  label: string,
  cost: number | undefined,
): string | undefined {
  return hasPositiveCost(cost)
    ? `${label} ${formatSignedCost(cost)}`
    : undefined;
}

function formatElevationMovementCostReason(
  option: IMovementRangeModeOption,
): string | undefined {
  return hasElevationCostConsequence(option)
    ? `elevation ${formatMovementOptionElevation(option)}`
    : undefined;
}

function formatConversionMovementCostReason(
  option: IMovementRangeModeOption,
): string | undefined {
  if (!hasMovementConversionCost(option)) return undefined;
  return `conversion ${option.conversionStepCount ?? 0} steps ${
    option.conversionMpCost ?? 0
  } MP`;
}

function hasMovementConversionCost(option: IMovementRangeModeOption): boolean {
  return (
    hasPositiveCost(option.conversionStepCount) ||
    hasPositiveCost(option.conversionMpCost)
  );
}

function formatAltitudeControlMovementCostReason(
  option: IMovementRangeModeOption,
): string | undefined {
  if (!hasAltitudeControlCost(option)) return undefined;
  return `altitude control ${option.altitudeControlStepCount ?? 0} steps ${
    option.altitudeControlMpCost ?? 0
  } MP`;
}

function hasAltitudeControlCost(option: IMovementRangeModeOption): boolean {
  return (
    option.altitudeControlRequired ||
    hasPositiveCost(option.altitudeControlStepCount) ||
    hasPositiveCost(option.altitudeControlMpCost)
  );
}

function formatAutomaticLandingMovementCostReason(
  option: IMovementRangeModeOption,
): string | undefined {
  if (!option.automaticLandingRequired) return undefined;
  const reason = option.automaticLandingReason
    ? ` ${option.automaticLandingReason}`
    : '';
  return `automatic landing ${option.automaticLandingDistance ?? 0}/${
    option.automaticLandingMinimumDistance ?? 0
  } hexes${reason}`;
}

function formatHullDownExitMovementCostReason(
  option: IMovementRangeModeOption,
): string | undefined {
  if (!hasHullDownExitCost(option)) return undefined;
  return `hull-down exit ${option.hullDownExitCost ?? 0} MP`;
}

function hasHullDownExitCost(option: IMovementRangeModeOption): boolean {
  return (
    option.hullDownExitRequired || hasPositiveCost(option.hullDownExitCost)
  );
}

function isDefinedString(reason: string | undefined): reason is string {
  return reason !== undefined;
}

function hasElevationCostConsequence(
  option: IMovementRangeModeOption,
): boolean {
  return (
    hasPositiveCost(option.elevationCost) ||
    (option.elevationDelta !== undefined && option.elevationDelta !== 0)
  );
}

export function deriveCombatProjectionStatus({
  combat,
  inAttackRange,
  combatLosBlockerFor,
}: {
  readonly combat?: ICombatRangeHex;
  readonly inAttackRange: boolean;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): TacticalMapCombatProjectionStatus {
  if (!combat) {
    if (inAttackRange) return 'range-only';
    if (combatLosBlockerFor.length > 0) {
      return losBlockerHasBlockedRef(combatLosBlockerFor) ? 'blocked' : 'mixed';
    }
    return 'none';
  }

  if (combat.hasTarget) {
    if (combat.attackable) {
      return combatHasBlockedTargets(combat) ? 'mixed' : 'attackable';
    }
    return 'blocked';
  }

  if (combatLosBlockerFor.length > 0) {
    return losBlockerHasBlockedRef(combatLosBlockerFor) ? 'blocked' : 'mixed';
  }

  if (combat.inRange || inAttackRange) return 'range-only';
  return 'none';
}

function combatHasBlockedTargets(combat: ICombatRangeHex): boolean {
  if (!combat.attackable) return false;
  if (combat.targetUnitIds.length > combat.validTargetUnitIds.length) {
    return true;
  }
  return combat.obscuredTargetUnitIds.length > 0;
}

function losBlockerHasBlockedRef(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): boolean {
  return refs.some((ref) => ref.losState === 'blocked');
}

export function collectBlockedReasons({
  movement,
  combat,
  combatLosBlockerFor,
}: {
  readonly movement: IMovementRangeHex | undefined;
  readonly combat: ICombatRangeHex | undefined;
  readonly combatLosBlockerFor: readonly ITacticalMapCombatLosBlockerReference[];
}): readonly string[] {
  const reasons = [
    movement?.movementInvalidDetails,
    movement?.blockedReason,
    movement?.movementInvalidReason,
    ...movementOptionBlockedReasons(movement),
    combat?.attackInvalidDetails,
    combat?.blockedReason,
    combat?.visibilityBlockedReason,
    combat?.lineOfSightBlockerReason,
    combat?.attackInvalidReason,
    ...combatLosBlockerFor.map((ref) => ref.blocker.reason),
  ].filter((reason): reason is string => Boolean(reason));

  return Array.from(new Set(reasons));
}

function movementOptionBlockedReasons(
  movement: IMovementRangeHex | undefined,
): readonly string[] {
  return movementOptionsForProjection(movement)
    .filter((option) => !option.reachable)
    .flatMap((option) => [
      option.movementInvalidDetails,
      option.blockedReason,
      option.movementInvalidReason,
    ])
    .filter((reason): reason is string => Boolean(reason));
}
