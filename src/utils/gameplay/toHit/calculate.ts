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
} from '../spaModifiers';
import { aggregateModifiers } from './aggregation';
import { RANGE_MODIFIERS } from './constants';
import {
  calculateActuatorDamageModifier,
  calculateAttackerMovementModifier,
  calculateAttackerProneModifier,
  calculateCalledShotModifier,
  calculateHeatModifier,
  calculateHullDownModifier,
  calculateImmobileModifier,
  calculateIndirectFireModifier,
  calculateMinimumRangeModifier,
  calculatePartialCoverModifier,
  calculatePilotWoundModifier,
  calculateProneModifier,
  calculateSecondaryTargetModifier,
  calculateSensorDamageModifier,
  calculateTargetingComputerModifier,
  calculateTMM,
  createBaseModifier,
  getRangeBracket,
  getRangeModifierForBracket,
} from './modifiers';

export function calculateToHit(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  range: number,
  minRange: number = 0,
): IToHitCalculation {
  const modifiers: IToHitModifierDetail[] = [];

  modifiers.push(createBaseModifier(attacker.gunnery));
  modifiers.push(getRangeModifierForBracket(rangeBracket));

  const minRangeMod = calculateMinimumRangeModifier(range, minRange);
  if (minRangeMod) modifiers.push(minRangeMod);

  modifiers.push(calculateAttackerMovementModifier(attacker.movementType));
  modifiers.push(calculateTMM(target.movementType, target.hexesMoved));
  modifiers.push(calculateHeatModifier(attacker.heat));

  const proneMod = calculateProneModifier(target.prone, range);
  if (proneMod) modifiers.push(proneMod);

  const immobileMod = calculateImmobileModifier(target.immobile);
  if (immobileMod) modifiers.push(immobileMod);

  const coverMod = calculatePartialCoverModifier(target.partialCover);
  if (coverMod) modifiers.push(coverMod);

  const hullDownMod = calculateHullDownModifier(
    target.hullDown ?? false,
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
