import type {
  CombatFiringArc,
  CombatLineOfSightBlockerKind,
  IGameState,
  ICombatRangeHex,
  ICombatLineOfSightBlocker,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { RangeBracket } from '@/types/gameplay';
import { classifyFiringArc } from '@/utils/overlays/arcClassifier';
import { classifyLOS } from '@/utils/overlays/losClassifier';

import {
  INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
  groundToAirIndirectWeaponBlockedReason,
} from './aerospace/groundToAir';
import { expectedDamageForProjection } from './combatProjection.expectedDamage';
import { withPerWeaponToHitProjections } from './combatProjection.perWeaponToHit';
import {
  bestRangeBracket,
  blockedReasonForHex,
  deriveAttackInvalidState,
  deriveWeaponReadinessInvalidState,
  formatMinimumRangeReason,
  isOperationalWeaponStatus,
  lineOfSightBlockedDetails,
  minimumRangePenaltyForWeapon,
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
import {
  deriveCombatWeaponRangeOptions,
  weaponImpactForStatus,
} from './combatProjection.weaponOptions';
import { determineArc } from './firingArcs';
import { isGroundToGroundTokenAttack } from './groundToGround';
import { coordToKey, hexDistance } from './hexMath';
import {
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
  isRepresentedVehicleAttacker,
} from './hullDownRestrictions';
import {
  getTargetCoverInfo,
  tokenUsesMekHorizontalCover,
  tokenUsesMekWaterCover,
} from './terrainCover';
import {
  calculateHullDownModifier,
  calculateTargetTerrainModifierFromHex,
} from './toHit';
import {
  representedWaterAttackInvalidState,
  weaponPassesRepresentedWaterAttackRules,
} from './underwaterAttacks';
export { isOperationalWeaponStatus } from './combatProjection.targeting';

export interface ICombatProjectionInput {
  readonly attacker: IUnitToken | null;
  readonly targetUnitId?: string | null;
  readonly hexes: readonly IHexCoordinate[];
  readonly grid: IHexGrid;
  readonly tokens: readonly IUnitToken[];
  readonly weapons: readonly IWeaponStatus[];
  readonly combatState?: IGameState | null;
}

function blockerKindForLOS(
  los: ReturnType<typeof classifyLOS>,
): CombatLineOfSightBlockerKind {
  if (los.engineResult.blockingElevation !== undefined) return 'elevation';
  if (los.state === 'partial') return 'cover';
  if (los.blockerAnnotations[0]?.terrain || los.engineResult.blockingTerrain) {
    return 'terrain';
  }
  return 'unknown';
}

function lineOfSightBlockerForLOS(
  los: ReturnType<typeof classifyLOS>,
): ICombatLineOfSightBlocker | undefined {
  const annotation = los.blockerAnnotations[0];
  const hex = annotation?.coord ?? los.engineResult.blockedBy;
  if (!hex) return undefined;

  return {
    hex,
    kind: blockerKindForLOS(los),
    terrain: annotation?.terrain ?? los.engineResult.blockingTerrain,
    reason: annotation?.title ?? lineOfSightBlockedDetails(los),
  };
}

export function deriveCombatRangeHexes({
  attacker,
  targetUnitId,
  hexes,
  grid,
  tokens,
  weapons,
  combatState,
}: ICombatProjectionInput): readonly ICombatRangeHex[] {
  if (!attacker) return [];

  const operationalWeapons = weapons.filter(isOperationalWeaponStatus);
  const weaponReadinessInvalidState =
    operationalWeapons.length === 0
      ? deriveWeaponReadinessInvalidState(weapons)
      : undefined;
  const results: ICombatRangeHex[] = [];

  for (const hex of hexes) {
    const distance = hexDistance(attacker.position, hex);
    const brackets = operationalWeapons.map((weapon) =>
      weaponBracketAtDistance(weapon, distance),
    );
    const rangeBracket = bestRangeBracket(brackets);
    const weaponIdsInRange = operationalWeapons
      .filter(
        (weapon) =>
          weaponBracketAtDistance(weapon, distance) !== RangeBracket.OutOfRange,
      )
      .map((weapon) => weapon.id);
    const inRange = weaponIdsInRange.length > 0;
    const targetArc = hexDistance(attacker.position, hex)
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
    const firingArc = classifyFiringArc(
      {
        coord: attacker.position,
        facing: attacker.facing,
        unitId: attacker.unitId,
      },
      hex,
      { includeOrigin: false },
    ) as CombatFiringArc;
    const weaponIdsInArc = operationalWeapons
      .filter((weapon) => weaponCanCoverTargetArc(weapon, targetArc))
      .map((weapon) => weapon.id);
    const targetContacts = targetIdsAtHex(hex, attacker, tokens);
    const rangeAndArcWeapons = operationalWeapons.filter(
      (weapon) =>
        weaponCanCoverTargetArc(weapon, targetArc) &&
        weaponBracketAtDistance(weapon, distance) !== RangeBracket.OutOfRange,
    );
    const inArc = weaponIdsInArc.length > 0;
    const los = classifyLOS(attacker.position, hex, grid);
    const lineOfSightBlocker = lineOfSightBlockerForLOS(los);
    const lineOfSightBlockerReason =
      los.state === 'blocked'
        ? (lineOfSightBlocker?.reason ?? lineOfSightBlockedDetails(los))
        : undefined;
    const targetUnitIds = targetContacts.map((contact) => contact.unitId);
    const selectedTargetContact = targetUnitId
      ? targetContacts.find((contact) => contact.unitId === targetUnitId)
      : undefined;
    const shouldProjectSelectedTarget = selectedTargetContact !== undefined;
    const projectedTargetContact =
      (shouldProjectSelectedTarget ? selectedTargetContact : undefined) ??
      targetContacts.find((contact) => contact.attackable);
    const visibleTargetUnitIds = shouldProjectSelectedTarget
      ? selectedTargetContact?.attackable
        ? [selectedTargetContact.unitId]
        : []
      : targetContacts
          .filter((contact) => contact.attackable)
          .map((contact) => contact.unitId);
    const obscuredTargetUnitIds = shouldProjectSelectedTarget
      ? selectedTargetContact && !selectedTargetContact.attackable
        ? [selectedTargetContact.unitId]
        : []
      : targetContacts
          .filter((contact) => !contact.attackable)
          .map((contact) => contact.unitId);
    const projectedTargetUnitId = projectedTargetContact?.attackable
      ? projectedTargetContact.unitId
      : undefined;
    const visibleTargetToken = projectedTargetUnitId
      ? tokens.find((token) => token.unitId === projectedTargetUnitId)
      : undefined;
    const attackerUnit = combatState?.units[attacker.unitId];
    const projectedTargetUnit = projectedTargetUnitId
      ? combatState?.units[projectedTargetUnitId]
      : undefined;
    const attackerIsRepresentedVehicle = isRepresentedVehicleAttacker({
      tokenUnitType: attacker.unitType,
      combatStateKind: attackerUnit?.combatState?.kind,
    });
    const groundToAirIndirectBlockedReasonForWeapon = (weapon: IWeaponStatus) =>
      attackerUnit && projectedTargetUnit
        ? groundToAirIndirectWeaponBlockedReason(
            attackerUnit,
            projectedTargetUnit,
            weapon,
          )
        : undefined;
    const hullDownLegWeaponBlockedReasonForWeapon = (weapon: IWeaponStatus) =>
      hullDownLegWeaponBlockedReason(attackerUnit?.hullDown, weapon);
    const hullDownVehicleFrontWeaponBlockedReasonForWeapon = (
      weapon: IWeaponStatus,
    ) =>
      hullDownVehicleFrontWeaponBlockedReason(
        attackerUnit?.hullDown,
        attackerIsRepresentedVehicle,
        weapon,
      );
    const weaponRuleBlockedReasonForWeapon = (weapon: IWeaponStatus) =>
      hullDownLegWeaponBlockedReasonForWeapon(weapon) ??
      hullDownVehicleFrontWeaponBlockedReasonForWeapon(weapon) ??
      groundToAirIndirectBlockedReasonForWeapon(weapon);
    const groundToAirIndirectInvalidState = rangeAndArcWeapons.some(
      groundToAirIndirectBlockedReasonForWeapon,
    )
      ? {
          reason: 'InvalidTarget' as const,
          details: INDIRECT_FIRE_AIRBORNE_TARGET_REJECTION,
        }
      : undefined;
    const hullDownLegWeaponInvalidState = rangeAndArcWeapons.some(
      hullDownLegWeaponBlockedReasonForWeapon,
    )
      ? {
          reason: 'InvalidTarget' as const,
          details: hullDownLegWeaponBlockedReasonForWeapon(
            rangeAndArcWeapons.find(hullDownLegWeaponBlockedReasonForWeapon)!,
          )!,
        }
      : undefined;
    const hullDownVehicleFrontWeaponInvalidState = rangeAndArcWeapons.some(
      hullDownVehicleFrontWeaponBlockedReasonForWeapon,
    )
      ? {
          reason: 'InvalidTarget' as const,
          details: hullDownVehicleFrontWeaponBlockedReasonForWeapon(
            rangeAndArcWeapons.find(
              hullDownVehicleFrontWeaponBlockedReasonForWeapon,
            )!,
          )!,
        }
      : undefined;
    const waterAttackInvalidState =
      targetContacts.length > 0
        ? representedWaterAttackInvalidState({
            grid,
            attackerPosition: attacker.position,
            targetPosition: hex,
            weapons: rangeAndArcWeapons,
          })
        : undefined;
    const availableWeapons = rangeAndArcWeapons.filter(
      (weapon) =>
        weaponPassesRepresentedWaterAttackRules({
          grid,
          attackerPosition: attacker.position,
          targetPosition: hex,
          weapon,
        }) && !weaponRuleBlockedReasonForWeapon(weapon),
    );
    const weaponIdsAvailable = availableWeapons.map((weapon) => weapon.id);
    const availableWeaponImpacts = availableWeapons.map(weaponImpactForStatus);
    const availableWeaponHeat = availableWeaponImpacts.reduce(
      (sum, impact) => sum + impact.heat,
      0,
    );
    const availableWeaponDamage = availableWeaponImpacts.reduce(
      (sum, impact) => sum + impact.damage,
      0,
    );
    const usableRangeBracket =
      availableWeapons.length > 0
        ? bestRangeBracket(
            availableWeapons.map((weapon) =>
              weaponBracketAtDistance(weapon, distance),
            ),
          )
        : rangeBracket;
    const targetCover = getTargetCoverInfo(grid, attacker.position, hex, {
      horizontalCoverEligible: visibleTargetToken
        ? tokenUsesMekHorizontalCover(visibleTargetToken)
        : true,
      targetHexWaterCoverEligible: visibleTargetToken
        ? tokenUsesMekWaterCover(visibleTargetToken)
        : true,
    });
    const targetHullDown = projectedTargetUnit?.hullDown === true;
    const targetHullDownModifier = calculateHullDownModifier(
      targetHullDown,
      targetCover.partialCover,
    );
    const targetHullDownReason = targetHullDown
      ? (targetHullDownModifier?.description ??
        'Target is hull-down, but MegaMek applies the hull-down modifier only when LOS/terrain cover is present')
      : undefined;
    const targetTerrainModifier = calculateTargetTerrainModifierFromHex(
      grid.hexes.get(coordToKey(hex)),
    );
    const minimumRangeApplies =
      !visibleTargetToken ||
      isGroundToGroundTokenAttack(attacker, visibleTargetToken);
    const minimumRangePenalty = availableWeapons.reduce(
      (strictestPenalty, weapon) =>
        Math.max(
          strictestPenalty,
          minimumRangePenaltyForWeapon(weapon, distance, minimumRangeApplies),
        ),
      0,
    );
    const minimumRangeWeaponIds = availableWeapons
      .filter(
        (weapon) =>
          minimumRangePenaltyForWeapon(
            weapon,
            distance,
            minimumRangeApplies,
          ) === minimumRangePenalty,
      )
      .map((weapon) => weapon.id);
    const minimumRangeReason = formatMinimumRangeReason(
      minimumRangePenalty,
      minimumRangeWeaponIds,
    );
    const baseWeaponRangeOptions = deriveCombatWeaponRangeOptions({
      weapons,
      distance,
      targetArc,
      grid,
      attackerPosition: attacker.position,
      targetPosition: hex,
      minimumRangeApplies,
      weaponRuleBlockedReason: weaponRuleBlockedReasonForWeapon,
    });
    const targetVisibilityState = shouldProjectSelectedTarget
      ? selectedTargetContact.visibility
      : summarizeTargetVisibility(targetContacts);
    const hasTarget = shouldProjectSelectedTarget || targetUnitIds.length > 0;
    const hasAvailableWeapon = weaponIdsAvailable.length > 0;
    const indirectFire = deriveIndirectFireProjection({
      attacker,
      combatState,
      targetHex: hex,
      targetUnitId: projectedTargetUnitId,
      weaponIdsAvailable,
      directLosBlocked: los.state === 'blocked',
      grid,
    });
    const indirectFireUnavailableReason =
      los.state === 'blocked' && indirectFire?.available !== true
        ? deriveIndirectFireUnavailableReason({
            combatState,
            targetUnitId: projectedTargetUnitId,
            weaponIdsAvailable,
          })
        : undefined;
    const visibilityBlockedReason = visibilityBlockedReasonForHex(
      targetVisibilityState,
      visibleTargetUnitIds.length,
    );
    const attackInvalidState = deriveAttackInvalidState({
      hasTarget,
      distance,
      inRange,
      inArc,
      hasAvailableWeapon,
      firingArc,
      los,
      operationalWeaponCount: operationalWeapons.length,
      weaponReadinessInvalidState,
      visibilityBlockedReason,
      weaponEnvironmentInvalidState:
        waterAttackInvalidState ??
        hullDownLegWeaponInvalidState ??
        hullDownVehicleFrontWeaponInvalidState ??
        groundToAirIndirectInvalidState,
      indirectFirePermitted: indirectFire?.available === true,
      indirectFireUnavailableReason,
    });
    const attackable =
      projectedTargetUnitId !== undefined &&
      hasAvailableWeapon &&
      (los.state !== 'blocked' || indirectFire?.available === true) &&
      !attackInvalidState.reason;
    const toHitInterveningTerrainEffects =
      indirectFire?.available === true
        ? indirectFire.interveningTerrainEffects
        : los.engineResult.interveningTerrainEffects;
    const toHitProjection = attackable
      ? deriveToHitProjection({
          attacker,
          targetUnitId: projectedTargetUnitId,
          combatState,
          rangeBracket: usableRangeBracket,
          distance,
          weapons: availableWeapons,
          targetPartialCover: targetCover.partialCover,
          targetTerrainModifier,
          interveningTerrainEffects: toHitInterveningTerrainEffects,
          indirectFire,
        })
      : undefined;
    const effectiveRangeBracket =
      toHitProjection?.rangeBracket ?? usableRangeBracket;
    const weaponRangeOptions = withPerWeaponToHitProjections({
      enabled: attackable && toHitProjection !== undefined,
      options: baseWeaponRangeOptions,
      attacker,
      targetUnitId: projectedTargetUnitId,
      combatState,
      distance,
      weapons: availableWeapons,
      targetPartialCover: targetCover.partialCover,
      targetTerrainModifier,
      interveningTerrainEffects: toHitInterveningTerrainEffects,
      indirectFire,
    });
    const blockedReason = blockedReasonForHex(
      attackInvalidState,
      firingArc,
      los,
    );
    const expectedDamage = attackable
      ? expectedDamageForProjection(
          availableWeaponImpacts,
          weaponRangeOptions,
          toHitProjection?.toHitNumber,
        )
      : undefined;

    results.push({
      hex,
      distance,
      rangeBracket: effectiveRangeBracket,
      inRange,
      inArc,
      losState: los.state,
      lineOfSightBlockerReason,
      lineOfSightBlocker,
      targetCoverLevel: targetCover.coverLevel,
      targetPartialCover: targetCover.partialCover,
      targetCoverModifier: targetCover.modifier,
      targetCoverReason: targetCover.reason,
      targetHullDown,
      targetHullDownModifier: targetHullDownModifier?.value,
      targetHullDownReason,
      minimumRangePenalty:
        minimumRangePenalty > 0 ? minimumRangePenalty : undefined,
      minimumRangeWeaponIds:
        minimumRangePenalty > 0 ? minimumRangeWeaponIds : undefined,
      minimumRangeReason,
      toHitNumber: toHitProjection?.toHitNumber,
      toHitModifiers: toHitProjection?.toHitModifiers,
      toHitReason: toHitProjection?.toHitReason,
      c3BenefitApplied: toHitProjection?.c3BenefitApplied,
      c3SpotterId: toHitProjection?.c3SpotterId,
      c3SpotterRange: toHitProjection?.c3SpotterRange,
      firingArc,
      hasTarget,
      targetVisibilityState,
      visibleTargetUnitIds,
      obscuredTargetUnitIds,
      visibilityBlockedReason,
      attackable,
      weaponIdsInRange,
      weaponIdsInArc,
      weaponIdsAvailable,
      weaponRangeOptions,
      availableWeaponImpacts,
      availableWeaponHeat,
      availableWeaponDamage,
      expectedDamage,
      targetUnitIds,
      validTargetUnitIds: attackable ? visibleTargetUnitIds : [],
      attackInvalidReason: attackInvalidState.reason,
      attackInvalidDetails: attackInvalidState.details,
      blockedReason,
      indirectFireAvailable: indirectFire?.available,
      indirectFireSpotterId: indirectFire?.spotterId,
      indirectFireBasis: indirectFire?.basis,
      indirectFireToHitPenalty: indirectFire?.toHitPenalty,
      indirectFireSpotterGunnery: indirectFire?.spotterGunnery,
      indirectFireSpotterSkillModifier: indirectFire?.spotterSkillModifier,
      indirectFireForwardObserver: indirectFire?.forwardObserverApplied,
      indirectFirePenaltyCancelled: indirectFire?.penaltyCancelled,
      indirectFireReason: indirectFire?.reason,
      indirectFireUnavailableReason,
    });
  }

  return results;
}
