import type {
  CombatFiringArc,
  ICombatRangeHex,
  IHexCoordinate,
  IWeaponStatus,
} from '@/types/gameplay';

import { RangeBracket } from '@/types/gameplay';
import { classifyFiringArc } from '@/utils/overlays/arcClassifier';
import { classifyLOS } from '@/utils/overlays/losClassifier';

import type { ICombatProjectionInput } from './combatProjection.types';

import { expectedDamageForProjection } from './combatProjection.expectedDamage';
import { lineOfSightBlockerForLOS } from './combatProjection.los';
import { withPerWeaponToHitProjections } from './combatProjection.perWeaponToHit';
import {
  createWeaponRuleBlocker,
  deriveAvailableWeaponState,
  deriveMinimumRangeState,
  deriveProjectedTargetState,
  deriveTargetCoverState,
  deriveWeaponEnvironmentInvalidState,
  targetTerrainHex,
} from './combatProjection.rangeHexState';
import {
  bestRangeBracket,
  blockedReasonForHex,
  deriveAttackInvalidState,
  deriveWeaponReadinessInvalidState,
  isOperationalWeaponStatus,
  summarizeTargetVisibility,
  targetIdsAtHex,
  visibilityBlockedReasonForHex,
  weaponBracketAtDistance,
  weaponCanCoverTargetArc,
} from './combatProjection.targeting';
import {
  deriveIndirectFireProjection,
  deriveIndirectFireUnavailableReason,
  deriveToHitProjection,
} from './combatProjection.toHit';
import { deriveCombatWeaponRangeOptions } from './combatProjection.weaponOptions';
import { determineArc } from './firingArcs';
import { isGroundToGroundTokenAttack } from './groundToGround';
import { hexDistance } from './hexMath';
import { isRepresentedVehicleAttacker } from './hullDownRestrictions';
import { calculateTargetTerrainModifierFromHex } from './toHit';

interface IPreparedProjectionInput extends ICombatProjectionInput {
  readonly attacker: NonNullable<ICombatProjectionInput['attacker']>;
  readonly operationalWeapons: readonly IWeaponStatus[];
  readonly weaponReadinessInvalidState?: ReturnType<
    typeof deriveWeaponReadinessInvalidState
  >;
}

function targetArcForHex({
  attacker,
  hex,
  distance,
}: {
  readonly attacker: IPreparedProjectionInput['attacker'];
  readonly hex: IHexCoordinate;
  readonly distance: number;
}): ReturnType<typeof determineArc>['arc'] | null {
  return distance
    ? determineArc(
        {
          unitId: attacker.unitId,
          coord: attacker.position,
          facing: attacker.facing,
          prone: false,
        },
        hex,
      ).arc
    : null;
}

function deriveRangeArcState({
  attacker,
  hex,
  operationalWeapons,
}: {
  readonly attacker: IPreparedProjectionInput['attacker'];
  readonly hex: IHexCoordinate;
  readonly operationalWeapons: readonly IWeaponStatus[];
}) {
  const distance = hexDistance(attacker.position, hex);
  const targetArc = targetArcForHex({ attacker, hex, distance });
  const firingArc = classifyFiringArc(
    {
      coord: attacker.position,
      facing: attacker.facing,
      unitId: attacker.unitId,
    },
    hex,
    { includeOrigin: false },
  ) as CombatFiringArc;
  const weaponIdsInRange = operationalWeapons
    .filter(
      (weapon) =>
        weaponBracketAtDistance(weapon, distance) !== RangeBracket.OutOfRange,
    )
    .map((weapon) => weapon.id);
  const weaponIdsInArc = operationalWeapons
    .filter((weapon) => weaponCanCoverTargetArc(weapon, targetArc))
    .map((weapon) => weapon.id);
  const rangeAndArcWeapons = operationalWeapons.filter(
    (weapon) =>
      weaponCanCoverTargetArc(weapon, targetArc) &&
      weaponBracketAtDistance(weapon, distance) !== RangeBracket.OutOfRange,
  );

  return {
    distance,
    targetArc,
    firingArc,
    weaponIdsInRange,
    weaponIdsInArc,
    rangeAndArcWeapons,
    rangeBracket: bestRangeBracket(
      operationalWeapons.map((weapon) =>
        weaponBracketAtDistance(weapon, distance),
      ),
    ),
    inRange: weaponIdsInRange.length > 0,
    inArc: weaponIdsInArc.length > 0,
  };
}

function deriveUsableRangeBracket({
  availableWeapons,
  distance,
  fallbackRangeBracket,
}: {
  readonly availableWeapons: readonly IWeaponStatus[];
  readonly distance: number;
  readonly fallbackRangeBracket: RangeBracket;
}): RangeBracket {
  if (availableWeapons.length === 0) return fallbackRangeBracket;
  return bestRangeBracket(
    availableWeapons.map((weapon) => weaponBracketAtDistance(weapon, distance)),
  );
}

function buildCombatRangeHex(
  input: IPreparedProjectionInput,
  hex: IHexCoordinate,
): ICombatRangeHex {
  const { attacker, targetUnitId, grid, tokens, combatState } = input;
  const rangeArc = deriveRangeArcState({
    attacker,
    hex,
    operationalWeapons: input.operationalWeapons,
  });
  const los = classifyLOS(attacker.position, hex, grid);
  const targetContacts = targetIdsAtHex(hex, attacker, tokens);
  const targetState = deriveProjectedTargetState({
    targetUnitId,
    targetContacts,
    tokens,
    combatState,
  });
  const attackerUnit = combatState?.units[attacker.unitId];
  const attackerIsRepresentedVehicle = isRepresentedVehicleAttacker({
    tokenUnitType: attacker.unitType,
    combatStateKind: attackerUnit?.combatState?.kind,
  });
  const weaponRuleBlockedReason = createWeaponRuleBlocker({
    attackerUnit,
    projectedTargetUnit: targetState.projectedTargetUnit,
    attackerIsRepresentedVehicle,
  });
  const availableWeaponState = deriveAvailableWeaponState({
    grid,
    attackerPosition: attacker.position,
    targetPosition: hex,
    weapons: rangeArc.rangeAndArcWeapons,
    weaponRuleBlockedReason,
  });
  const minimumRangeApplies =
    !targetState.visibleTargetToken ||
    isGroundToGroundTokenAttack(attacker, targetState.visibleTargetToken);
  const targetCoverState = deriveTargetCoverState({
    grid,
    attackerPosition: attacker.position,
    targetPosition: hex,
    visibleTargetToken: targetState.visibleTargetToken,
    projectedTargetUnit: targetState.projectedTargetUnit,
  });
  const minimumRange = deriveMinimumRangeState({
    weapons: availableWeaponState.availableWeapons,
    distance: rangeArc.distance,
    minimumRangeApplies,
  });
  const baseWeaponRangeOptions = deriveCombatWeaponRangeOptions({
    weapons: input.weapons,
    distance: rangeArc.distance,
    targetArc: rangeArc.targetArc,
    grid,
    attackerPosition: attacker.position,
    targetPosition: hex,
    minimumRangeApplies,
    weaponRuleBlockedReason,
  });
  const targetVisibilityState = targetState.shouldProjectSelectedTarget
    ? targetState.selectedTargetContact!.visibility
    : summarizeTargetVisibility(targetContacts);
  const indirectFire = deriveIndirectFireProjection({
    attacker,
    combatState,
    targetHex: hex,
    targetUnitId: targetState.projectedTargetUnitId,
    weaponIdsAvailable: availableWeaponState.weaponIdsAvailable,
    directLosBlocked: los.state === 'blocked',
    grid,
  });
  const indirectFireUnavailableReason =
    los.state === 'blocked' && indirectFire?.available !== true
      ? deriveIndirectFireUnavailableReason({
          combatState,
          targetUnitId: targetState.projectedTargetUnitId,
          weaponIdsAvailable: availableWeaponState.weaponIdsAvailable,
        })
      : undefined;
  const attackInvalidState = deriveAttackInvalidState({
    hasTarget:
      targetState.shouldProjectSelectedTarget ||
      targetState.targetUnitIds.length > 0,
    distance: rangeArc.distance,
    inRange: rangeArc.inRange,
    inArc: rangeArc.inArc,
    hasAvailableWeapon: availableWeaponState.weaponIdsAvailable.length > 0,
    firingArc: rangeArc.firingArc,
    los,
    operationalWeaponCount: input.operationalWeapons.length,
    weaponReadinessInvalidState: input.weaponReadinessInvalidState,
    visibilityBlockedReason: visibilityBlockedReasonForHex(
      targetVisibilityState,
      targetState.visibleTargetUnitIds.length,
    ),
    weaponEnvironmentInvalidState: deriveWeaponEnvironmentInvalidState({
      grid,
      attackerPosition: attacker.position,
      targetPosition: hex,
      targetContacts,
      weapons: rangeArc.rangeAndArcWeapons,
      attackerUnit,
      projectedTargetUnit: targetState.projectedTargetUnit,
      attackerIsRepresentedVehicle,
    }),
    indirectFirePermitted: indirectFire?.available === true,
    indirectFireUnavailableReason,
    attackerId: attacker.unitId,
    attackerIsEvading: attackerUnit?.isEvading === true,
    attackerSprintedThisTurn: attackerUnit?.sprintedThisTurn === true,
  });
  const attackable =
    targetState.projectedTargetUnitId !== undefined &&
    availableWeaponState.weaponIdsAvailable.length > 0 &&
    (los.state !== 'blocked' || indirectFire?.available === true) &&
    !attackInvalidState.reason;
  const toHitInterveningTerrainEffects =
    indirectFire?.available === true
      ? indirectFire.interveningTerrainEffects
      : los.engineResult.interveningTerrainEffects;
  const targetTerrainModifier = calculateTargetTerrainModifierFromHex(
    targetTerrainHex(grid, hex),
  );
  const toHitProjection = attackable
    ? deriveToHitProjection({
        attacker,
        targetUnitId: targetState.projectedTargetUnitId,
        combatState,
        rangeBracket: deriveUsableRangeBracket({
          availableWeapons: availableWeaponState.availableWeapons,
          distance: rangeArc.distance,
          fallbackRangeBracket: rangeArc.rangeBracket,
        }),
        distance: rangeArc.distance,
        weapons: availableWeaponState.availableWeapons,
        targetPartialCover: targetCoverState.targetCover.partialCover,
        targetTerrainModifier,
        interveningTerrainEffects: toHitInterveningTerrainEffects,
        indirectFire,
      })
    : undefined;
  const effectiveRangeBracket =
    toHitProjection?.rangeBracket ??
    deriveUsableRangeBracket({
      availableWeapons: availableWeaponState.availableWeapons,
      distance: rangeArc.distance,
      fallbackRangeBracket: rangeArc.rangeBracket,
    });
  const weaponRangeOptions = withPerWeaponToHitProjections({
    enabled: attackable && toHitProjection !== undefined,
    options: baseWeaponRangeOptions,
    attacker,
    targetUnitId: targetState.projectedTargetUnitId,
    combatState,
    distance: rangeArc.distance,
    weapons: availableWeaponState.availableWeapons,
    targetPartialCover: targetCoverState.targetCover.partialCover,
    targetTerrainModifier,
    interveningTerrainEffects: toHitInterveningTerrainEffects,
    indirectFire,
  });
  const expectedDamage = attackable
    ? expectedDamageForProjection(
        availableWeaponState.availableWeaponImpacts,
        weaponRangeOptions,
        toHitProjection?.toHitNumber,
      )
    : undefined;
  const lineOfSightBlocker = lineOfSightBlockerForLOS(los);

  return {
    hex,
    distance: rangeArc.distance,
    rangeBracket: effectiveRangeBracket,
    inRange: rangeArc.inRange,
    inArc: rangeArc.inArc,
    losState: los.state,
    lineOfSightBlockerReason:
      los.state === 'blocked' ? lineOfSightBlocker?.reason : undefined,
    lineOfSightBlocker,
    targetCoverLevel: targetCoverState.targetCover.coverLevel,
    targetPartialCover: targetCoverState.targetCover.partialCover,
    targetCoverModifier: targetCoverState.targetCover.modifier,
    targetCoverReason: targetCoverState.targetCover.reason,
    targetHullDown: targetCoverState.targetHullDown,
    targetHullDownModifier: targetCoverState.targetHullDownModifier?.value,
    targetHullDownReason: targetCoverState.targetHullDownReason,
    minimumRangePenalty:
      minimumRange.minimumRangePenalty > 0
        ? minimumRange.minimumRangePenalty
        : undefined,
    minimumRangeWeaponIds:
      minimumRange.minimumRangePenalty > 0
        ? minimumRange.minimumRangeWeaponIds
        : undefined,
    minimumRangeReason: minimumRange.minimumRangeReason,
    toHitNumber: toHitProjection?.toHitNumber,
    toHitModifiers: toHitProjection?.toHitModifiers,
    toHitReason: toHitProjection?.toHitReason,
    c3BenefitApplied: toHitProjection?.c3BenefitApplied,
    c3SpotterId: toHitProjection?.c3SpotterId,
    c3SpotterRange: toHitProjection?.c3SpotterRange,
    firingArc: rangeArc.firingArc,
    hasTarget:
      targetState.shouldProjectSelectedTarget ||
      targetState.targetUnitIds.length > 0,
    targetVisibilityState,
    visibleTargetUnitIds: targetState.visibleTargetUnitIds,
    obscuredTargetUnitIds: targetState.obscuredTargetUnitIds,
    visibilityBlockedReason: visibilityBlockedReasonForHex(
      targetVisibilityState,
      targetState.visibleTargetUnitIds.length,
    ),
    attackable,
    weaponIdsInRange: rangeArc.weaponIdsInRange,
    weaponIdsInArc: rangeArc.weaponIdsInArc,
    weaponIdsAvailable: availableWeaponState.weaponIdsAvailable,
    weaponRangeOptions,
    availableWeaponImpacts: availableWeaponState.availableWeaponImpacts,
    availableWeaponHeat: availableWeaponState.availableWeaponHeat,
    availableWeaponDamage: availableWeaponState.availableWeaponDamage,
    expectedDamage,
    targetUnitIds: targetState.targetUnitIds,
    validTargetUnitIds: attackable ? targetState.visibleTargetUnitIds : [],
    attackInvalidReason: attackInvalidState.reason,
    attackInvalidDetails: attackInvalidState.details,
    blockedReason: blockedReasonForHex(
      attackInvalidState,
      rangeArc.firingArc,
      los,
    ),
    indirectFireAvailable: indirectFire?.available,
    indirectFireSpotterId: indirectFire?.spotterId,
    indirectFireBasis: indirectFire?.basis,
    indirectFireToHitPenalty: indirectFire?.toHitPenalty,
    indirectFireSpotterAttacked: indirectFire?.spotterAttackedThisTurn,
    indirectFireForwardObserver: indirectFire?.forwardObserverApplied,
    indirectFirePenaltyCancelled: indirectFire?.penaltyCancelled,
    indirectFireReason: indirectFire?.reason,
    indirectFireUnavailableReason,
  };
}

export function deriveCombatRangeHexes({
  attacker,
  ...input
}: ICombatProjectionInput): readonly ICombatRangeHex[] {
  if (!attacker) return [];

  const operationalWeapons = input.weapons.filter(isOperationalWeaponStatus);
  const weaponReadinessInvalidState =
    operationalWeapons.length === 0
      ? deriveWeaponReadinessInvalidState(input.weapons)
      : undefined;

  return input.hexes.map((hex) =>
    buildCombatRangeHex(
      {
        ...input,
        attacker,
        operationalWeapons,
        weaponReadinessInvalidState,
      },
      hex,
    ),
  );
}
