import type {
  CombatFiringArc,
  IGameState,
  ICombatRangeHex,
  IHexCoordinate,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { RangeBracket } from '@/types/gameplay';
import { classifyFiringArc } from '@/utils/overlays/arcClassifier';
import { classifyLOS } from '@/utils/overlays/losClassifier';

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
  deriveToHitProjection,
} from './combatProjection.toHit';
import { determineArc } from './firingArcs';
import { isGroundToGroundTokenAttack } from './groundToGround';
import { coordToKey, hexDistance } from './hexMath';
import {
  getTargetCoverInfo,
  tokenUsesMekHorizontalCover,
  tokenUsesMekWaterCover,
} from './terrainCover';
import { calculateTargetTerrainModifierFromHex } from './toHit';
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
    const waterAttackInvalidState =
      targetContacts.length > 0
        ? representedWaterAttackInvalidState({
            grid,
            attackerPosition: attacker.position,
            targetPosition: hex,
            weapons: rangeAndArcWeapons,
          })
        : undefined;
    const availableWeapons = rangeAndArcWeapons.filter((weapon) =>
      weaponPassesRepresentedWaterAttackRules({
        grid,
        attackerPosition: attacker.position,
        targetPosition: hex,
        weapon,
      }),
    );
    const weaponIdsAvailable = availableWeapons.map((weapon) => weapon.id);
    const inArc = weaponIdsInArc.length > 0;
    const usableRangeBracket =
      availableWeapons.length > 0
        ? bestRangeBracket(
            availableWeapons.map((weapon) =>
              weaponBracketAtDistance(weapon, distance),
            ),
          )
        : rangeBracket;
    const los = classifyLOS(attacker.position, hex, grid, { tokens });
    const lineOfSightBlockerReason =
      los.state === 'blocked'
        ? (los.blockerAnnotations[0]?.title ?? lineOfSightBlockedDetails(los))
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
    const targetCover = getTargetCoverInfo(grid, attacker.position, hex, {
      horizontalCoverEligible: visibleTargetToken
        ? tokenUsesMekHorizontalCover(visibleTargetToken)
        : true,
      targetHexWaterCoverEligible: visibleTargetToken
        ? tokenUsesMekWaterCover(visibleTargetToken)
        : true,
    });
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
      losTokens: tokens,
    });
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
      weaponEnvironmentInvalidState: waterAttackInvalidState,
      indirectFirePermitted: indirectFire?.available === true,
    });
    const attackable =
      projectedTargetUnitId !== undefined &&
      hasAvailableWeapon &&
      (los.state !== 'blocked' || indirectFire?.available === true) &&
      !attackInvalidState.reason;
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
          interveningTerrainEffects:
            indirectFire?.available === true
              ? indirectFire.interveningTerrainEffects
              : los.engineResult.interveningTerrainEffects,
          indirectFire,
        })
      : undefined;
    const effectiveRangeBracket =
      toHitProjection?.rangeBracket ?? usableRangeBracket;
    const blockedReason = blockedReasonForHex(
      attackInvalidState,
      firingArc,
      los,
    );

    results.push({
      hex,
      distance,
      rangeBracket: effectiveRangeBracket,
      inRange,
      inArc,
      losState: los.state,
      lineOfSightBlockerReason,
      targetCoverLevel: targetCover.coverLevel,
      targetPartialCover: targetCover.partialCover,
      targetCoverModifier: targetCover.modifier,
      targetCoverReason: targetCover.reason,
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
      targetUnitIds,
      validTargetUnitIds: attackable ? visibleTargetUnitIds : [],
      attackInvalidReason: attackInvalidState.reason,
      attackInvalidDetails: attackInvalidState.details,
      blockedReason,
      indirectFireAvailable: indirectFire?.available,
      indirectFireSpotterId: indirectFire?.spotterId,
      indirectFireBasis: indirectFire?.basis,
      indirectFireToHitPenalty: indirectFire?.toHitPenalty,
      indirectFireForwardObserver: indirectFire?.forwardObserverApplied,
      indirectFirePenaltyCancelled: indirectFire?.penaltyCancelled,
      indirectFireReason: indirectFire?.reason,
    });
  }

  return results;
}
