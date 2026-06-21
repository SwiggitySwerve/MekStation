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
  calculateSpottingAttackerModifier,
  calculateIndirectFireModifier,
  calculateCalledShotModifier,
} from './damageModifiers';
import {
  calculateHeatModifier,
  calculatePartialCoverModifier,
  calculateHullDownModifier,
} from './environmentModifiers';
import { calculateTargetingComputerModifier } from './equipmentModifiers';
import {
  calculateAttackerMovementModifier,
  calculateTMM,
  calculateTargetEvasionModifier,
  calculateTargetSprintedModifier,
} from './movementModifiers';
import {
  calculateMinimumRangeModifier,
  getRangeModifierForBracket,
  getRangeBracket,
} from './rangeModifiers';
import {
  calculateSemiGuidedTagIndirectFireModifier,
  calculateSemiGuidedTagTargetMovementModifier,
  type ISemiGuidedTagToHitContext,
} from './semiGuidedTagModifiers';
import { calculateChinTurretPivotModifier } from './vehicleModifiers';

export interface ICalculateToHitInput {
  readonly attacker: IAttackerState;
  readonly target: ITargetState;
  readonly rangeBracket: RangeBracket;
  readonly range: number;
  readonly minRange?: number;
  readonly weaponId?: string;
  readonly semiGuidedTagContext?: ISemiGuidedTagToHitContext;
}

interface IResolvedCalculateToHitInput extends Omit<
  ICalculateToHitInput,
  'minRange'
> {
  readonly minRange: number;
}

type LegacyCalculateToHitArgs = readonly [
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  range: number,
  minRange?: number,
  weaponId?: string,
  semiGuidedTagContext?: ISemiGuidedTagToHitContext,
];

type CalculateToHitArgs =
  | readonly [input: ICalculateToHitInput]
  | LegacyCalculateToHitArgs;

function normalizeCalculateToHitInput(
  args: CalculateToHitArgs,
): IResolvedCalculateToHitInput {
  if (args.length === 1) {
    const { minRange = 0, ...input } = args[0];
    return { ...input, minRange };
  }

  const [
    attacker,
    target,
    rangeBracket,
    range,
    minRange = 0,
    weaponId,
    semiGuidedTagContext,
  ] = args;
  return {
    attacker,
    target,
    rangeBracket,
    range,
    minRange,
    ...(weaponId !== undefined ? { weaponId } : {}),
    ...(semiGuidedTagContext !== undefined ? { semiGuidedTagContext } : {}),
  };
}

function appendModifier(
  modifiers: IToHitModifierDetail[],
  modifier: IToHitModifierDetail | null | undefined,
): void {
  if (modifier) modifiers.push(modifier);
}

function collectBaseAndRangeModifiers({
  attacker,
  rangeBracket,
  range,
  minRange,
}: IResolvedCalculateToHitInput): IToHitModifierDetail[] {
  const modifiers = [
    createBaseModifier(attacker.gunnery),
    getRangeModifierForBracket(rangeBracket),
  ];

  appendModifier(modifiers, calculateMinimumRangeModifier(range, minRange));
  return modifiers;
}

function collectMovementModifiers({
  attacker,
  target,
  semiGuidedTagContext,
}: IResolvedCalculateToHitInput): IToHitModifierDetail[] {
  const modifiers = [calculateAttackerMovementModifier(attacker.movementType)];
  const targetMovementModifier = calculateTMM(
    target.movementType,
    target.hexesMoved,
  );
  modifiers.push(targetMovementModifier);
  appendModifier(
    modifiers,
    calculateSemiGuidedTagTargetMovementModifier(
      semiGuidedTagContext,
      targetMovementModifier,
    ),
  );
  appendModifier(
    modifiers,
    calculateTargetEvasionModifier(
      target.isEvading,
      target.prone,
      target.evasionBonus,
    ),
  );
  appendModifier(
    modifiers,
    calculateTargetSprintedModifier(target.sprintedThisTurn),
  );
  return modifiers;
}

function collectHeatAndTargetDefenseModifiers({
  attacker,
  target,
  range,
}: IResolvedCalculateToHitInput): IToHitModifierDetail[] {
  const modifiers: IToHitModifierDetail[] = [];
  modifiers.push(
    calculateHeatModifier(
      attacker.heat,
      getSomeLikeItHotHeatPenaltyReduction(attacker.abilities ?? []),
    ),
  );

  appendModifier(modifiers, calculateProneModifier(target.prone, range));
  appendModifier(modifiers, calculateImmobileModifier(target.immobile));

  const targetHullDown = target.hullDown ?? false;
  appendModifier(
    modifiers,
    calculatePartialCoverModifier(targetHullDown ? false : target.partialCover),
  );
  appendModifier(
    modifiers,
    calculateHullDownModifier(targetHullDown, target.partialCover),
  );
  return modifiers;
}

function getPilotWoundModifier(
  attacker: IAttackerState,
): IToHitModifierDetail | null {
  if (!attacker.pilotWounds) return null;

  const effectiveWounds = getEffectiveWounds(
    attacker.abilities ?? [],
    attacker.pilotWounds,
  );
  return calculatePilotWoundModifier(effectiveWounds);
}

function collectAttackerConditionModifiers({
  attacker,
}: IResolvedCalculateToHitInput): IToHitModifierDetail[] {
  const modifiers = [...attacker.damageModifiers];

  appendModifier(modifiers, getPilotWoundModifier(attacker));
  appendModifier(
    modifiers,
    attacker.sensorHits
      ? calculateSensorDamageModifier(attacker.sensorHits)
      : null,
  );
  appendModifier(
    modifiers,
    attacker.actuatorDamage
      ? calculateActuatorDamageModifier(attacker.actuatorDamage)
      : null,
  );
  appendModifier(
    modifiers,
    calculateTargetingComputerModifier(attacker.targetingComputer ?? false),
  );
  appendModifier(
    modifiers,
    calculateAttackerProneModifier(attacker.prone ?? false),
  );

  return modifiers;
}

function getVehicleChinTurretModifier(
  attacker: IAttackerState,
): IToHitModifierDetail | null {
  const {
    vehicleTurretType,
    vehicleWeaponMountLocation,
    vehicleWeaponIsTurretMounted,
  } = attacker;
  if (
    vehicleTurretType === undefined ||
    vehicleWeaponMountLocation === undefined ||
    vehicleWeaponIsTurretMounted === undefined
  ) {
    return null;
  }

  // Vehicle-only chin-turret pivot penalty. Per archived
  // `tier5-audit-cleanup` Phase C 1.A and the firing-arc-calculation spec
  // ("Vehicle Chin Turret Pivot Penalty"), a ground vehicle that pivots its
  // chin turret during the current turn incurs +1 to-hit on every weapon
  // attack from that turret.
  return calculateChinTurretPivotModifier({
    turretType: vehicleTurretType,
    turretPivotedThisTurn: attacker.vehicleTurretPivotedThisTurn ?? false,
    weaponMountLocation: vehicleWeaponMountLocation,
    weaponIsTurretMounted: vehicleWeaponIsTurretMounted,
  });
}

function collectAttackContextModifiers({
  attacker,
  semiGuidedTagContext,
}: IResolvedCalculateToHitInput): IToHitModifierDetail[] {
  const modifiers: IToHitModifierDetail[] = [];
  const indirectFireModifier = attacker.indirectFire
    ? calculateIndirectFireModifier(attacker.indirectFire)
    : null;
  const semiGuidedContextWithPenalty =
    semiGuidedTagContext === undefined
      ? undefined
      : {
          ...semiGuidedTagContext,
          indirectFirePenalty:
            semiGuidedTagContext.indirectFirePenalty ??
            indirectFireModifier?.value ??
            0,
        };

  appendModifier(
    modifiers,
    calculateSpottingAttackerModifier(attacker.isSpotting),
  );
  appendModifier(
    modifiers,
    attacker.secondaryTarget
      ? calculateSecondaryTargetModifier(attacker.secondaryTarget)
      : null,
  );
  appendModifier(modifiers, indirectFireModifier);
  appendModifier(
    modifiers,
    calculateSemiGuidedTagIndirectFireModifier(semiGuidedContextWithPenalty),
  );
  appendModifier(
    modifiers,
    attacker.calledShot
      ? calculateCalledShotModifier({
          calledShot: attacker.calledShot,
          teammateCalledShot: attacker.teammateCalledShot,
          abilities: attacker.abilities,
          applyLocalAbilityReduction:
            attacker.applyLocalCalledShotAbilityReduction !== false,
        })
      : null,
  );
  appendModifier(modifiers, getVehicleChinTurretModifier(attacker));
  return modifiers;
}

function collectSourceBackedModifiers({
  attacker,
  target,
  rangeBracket,
  weaponId,
}: IResolvedCalculateToHitInput): IToHitModifierDetail[] {
  const rangeModValue = RANGE_MODIFIERS[rangeBracket] ?? 0;
  return [
    ...calculateAttackerSPAModifiers(
      attacker,
      target,
      rangeBracket,
      rangeModValue,
    ),
    ...calculateAttackerQuirkModifiers(
      attacker,
      target,
      rangeBracket,
      weaponId,
    ),
  ];
}

export function calculateToHit(...args: CalculateToHitArgs): IToHitCalculation {
  const input = normalizeCalculateToHitInput(args);
  return aggregateModifiers([
    ...collectBaseAndRangeModifiers(input),
    ...collectMovementModifiers(input),
    ...collectHeatAndTargetDefenseModifiers(input),
    ...collectAttackerConditionModifiers(input),
    ...collectAttackContextModifiers(input),
    ...collectSourceBackedModifiers(input),
  ]);
}

export function calculateToHitFromContext(
  context: ICombatContext,
  minRange: number = 0,
): IToHitCalculation {
  const rangeBracket = getRangeBracket(context.range, 3, 6, 15);
  return calculateToHit({
    attacker: context.attacker,
    target: context.target,
    rangeBracket,
    range: context.range,
    minRange,
  });
}
