import { RangeBracket } from '@/types/gameplay';
import {
  IAttackerState,
  ICombatContext,
  ITargetState,
  IToHitCalculation,
  IToHitModifierDetail,
} from '@/types/gameplay';

import { calculateAttackerQuirkModifiers } from '../quirkModifiers';
import {
  calculateAttackerSPAModifiers,
  getEffectiveWounds,
  getSomeLikeItHotHeatPenaltyReduction,
} from '../spaModifiers';
import { aggregateModifiers } from './aggregation';
import { createBaseModifier } from './baseModifier';
import { RANGE_MODIFIERS } from './constants';
import {
  calculateProneModifier,
  calculateImmobileModifier,
  calculatePilotWoundModifier,
  calculateSecondaryTargetModifier,
  calculateSensorDamageModifier,
  calculateActuatorDamageModifier,
  calculateAttackerProneModifier,
  calculateIndirectFireModifier,
  calculateCalledShotModifier,
} from './damageModifiers';
import {
  type IEcmCoverageState,
  type WeaponGuidanceType,
  calculateEcmModifier,
} from './ecmModifier';
import {
  calculateHeatModifier,
  calculatePartialCoverModifier,
  calculateHullDownModifier,
} from './environmentModifiers';
import { calculateTargetingComputerModifier } from './equipmentModifiers';
import {
  calculateAttackerMovementModifier,
  calculateTMM,
} from './movementModifiers';
import {
  calculateMinimumRangeModifier,
  getRangeModifierForBracket,
  getRangeBracket,
} from './rangeModifiers';
import { calculateChinTurretPivotModifier } from './vehicleModifiers';

/**
 * Per `add-ecm-tohit-modifier` (closes playtest gap #1): optional ECM
 * context that, when present, adds a `+1 to-hit` modifier when the
 * weapon's electronic guidance is degraded by an active ECM bubble. The
 * field is OPTIONAL so existing callers (no ECM in the scenario, or
 * weapon has no electronic guidance) are unaffected.
 */
export interface IEcmContext {
  /** The weapon's guidance type (`'none'` returns no modifier). */
  readonly guidance: WeaponGuidanceType;
  /** Resolved per-attack ECM coverage flags. */
  readonly coverage: IEcmCoverageState;
}

export function calculateToHit(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  range: number,
  minRange: number = 0,
  ecmContext?: IEcmContext,
  weaponId?: string,
): IToHitCalculation {
  const modifiers: IToHitModifierDetail[] = [];

  modifiers.push(createBaseModifier(attacker.gunnery));
  modifiers.push(getRangeModifierForBracket(rangeBracket));

  // Per `add-ecm-tohit-modifier`: ECM modifier is appended to the
  // accumulator and stacks additively with every other modifier. The
  // helper returns null when the guidance is 'none' or the per-guidance
  // rule does not fire, so no-ECM scenarios are unchanged.
  if (ecmContext !== undefined) {
    const ecmMod = calculateEcmModifier(
      ecmContext.guidance,
      ecmContext.coverage,
    );
    if (ecmMod !== null) modifiers.push(ecmMod);
  }

  const minRangeMod = calculateMinimumRangeModifier(range, minRange);
  if (minRangeMod) modifiers.push(minRangeMod);

  modifiers.push(calculateAttackerMovementModifier(attacker.movementType));
  modifiers.push(calculateTMM(target.movementType, target.hexesMoved));
  modifiers.push(
    calculateHeatModifier(
      attacker.heat,
      getSomeLikeItHotHeatPenaltyReduction(attacker.abilities ?? []),
    ),
  );

  const proneMod = calculateProneModifier(target.prone, range);
  if (proneMod) modifiers.push(proneMod);

  const immobileMod = calculateImmobileModifier(target.immobile);
  if (immobileMod) modifiers.push(immobileMod);

  const targetHullDown = target.hullDown ?? false;
  const coverMod = calculatePartialCoverModifier(
    targetHullDown ? false : target.partialCover,
  );
  if (coverMod) modifiers.push(coverMod);

  const hullDownMod = calculateHullDownModifier(
    targetHullDown,
    target.partialCover,
  );
  if (hullDownMod) modifiers.push(hullDownMod);

  modifiers.push(...attacker.damageModifiers);

  if (attacker.pilotWounds) {
    const effectiveWounds = getEffectiveWounds(
      attacker.abilities ?? [],
      attacker.pilotWounds,
    );
    const woundMod = calculatePilotWoundModifier(effectiveWounds);
    if (woundMod) modifiers.push(woundMod);
  }

  if (attacker.sensorHits) {
    const sensorMod = calculateSensorDamageModifier(attacker.sensorHits);
    if (sensorMod) modifiers.push(sensorMod);
  }

  if (attacker.actuatorDamage) {
    const actuatorMod = calculateActuatorDamageModifier(
      attacker.actuatorDamage,
    );
    if (actuatorMod) modifiers.push(actuatorMod);
  }

  if (attacker.targetingComputer) {
    const tcMod = calculateTargetingComputerModifier(
      attacker.targetingComputer,
    );
    if (tcMod) modifiers.push(tcMod);
  }

  if (attacker.prone) {
    const attackerProneMod = calculateAttackerProneModifier(attacker.prone);
    if (attackerProneMod) modifiers.push(attackerProneMod);
  }

  if (attacker.secondaryTarget) {
    const secMod = calculateSecondaryTargetModifier(attacker.secondaryTarget);
    if (secMod) modifiers.push(secMod);
  }

  if (attacker.indirectFire) {
    const indirectMod = calculateIndirectFireModifier(attacker.indirectFire);
    if (indirectMod) modifiers.push(indirectMod);
  }

  if (attacker.calledShot) {
    const calledMod = calculateCalledShotModifier(
      attacker.calledShot,
      attacker.teammateCalledShot,
      attacker.abilities,
    );
    if (calledMod) modifiers.push(calledMod);
  }

  // Vehicle-only chin-turret pivot penalty. Per archived
  // `tier5-audit-cleanup` Phase C 1.A and the firing-arc-calculation spec
  // ("Vehicle Chin Turret Pivot Penalty"), a ground vehicle that pivots its
  // chin turret during the current turn incurs +1 to-hit on every weapon
  // attack from that turret. The fields below are populated only when the
  // attacker is a vehicle; mech callers leave them undefined and the
  // modifier returns null.
  if (
    attacker.vehicleTurretType !== undefined &&
    attacker.vehicleWeaponMountLocation !== undefined &&
    attacker.vehicleWeaponIsTurretMounted !== undefined
  ) {
    const chinPivotMod = calculateChinTurretPivotModifier({
      turretType: attacker.vehicleTurretType,
      turretPivotedThisTurn: attacker.vehicleTurretPivotedThisTurn ?? false,
      weaponMountLocation: attacker.vehicleWeaponMountLocation,
      weaponIsTurretMounted: attacker.vehicleWeaponIsTurretMounted,
    });
    if (chinPivotMod) modifiers.push(chinPivotMod);
  }

  const rangeModValue = RANGE_MODIFIERS[rangeBracket] ?? 0;
  const spaModifiers = calculateAttackerSPAModifiers(
    attacker,
    target,
    rangeBracket,
    rangeModValue,
  );
  modifiers.push(...spaModifiers);

  const quirkModifiers = calculateAttackerQuirkModifiers(
    attacker,
    target,
    rangeBracket,
    weaponId,
  );
  modifiers.push(...quirkModifiers);

  return aggregateModifiers(modifiers);
}

export function calculateToHitFromContext(
  context: ICombatContext,
  minRange: number = 0,
): IToHitCalculation {
  const rangeBracket = getRangeBracket(context.range, 3, 6, 15);
  return calculateToHit(
    context.attacker,
    context.target,
    rangeBracket,
    context.range,
    minRange,
  );
}
