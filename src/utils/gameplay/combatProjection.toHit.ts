import type {
  IGameState,
  IToHitModifier,
  IToHitModifierDetail,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ILOSInterveningTerrainEffect } from '@/utils/gameplay/lineOfSight';

import { DEFAULT_GUNNERY } from '@/constants/PilotConstants';
import { RangeBracket } from '@/types/gameplay';

import type { IIndirectFireProjection } from './combatProjection.indirectFire';

import { calculateGroundToAirAltitudeModifier } from './aerospace/groundToAir';
export {
  deriveIndirectFireProjection,
  deriveIndirectFireUnavailableReason,
} from './combatProjection.indirectFire';
import { minimumRangeForWeapons } from './combatProjection.targeting';
import { isGroundToGroundGameAttack } from './groundToGround';
import { calculateToHitWithC3, selectC3RangeBracket } from './toHit/c3';
import { calculateToHit } from './toHit/calculate';
import { calculateInterveningTerrainModifier } from './toHit/environmentModifiers';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
} from './toHit/stateHydration';
import { deriveVehicleToHitContext } from './vehicleToHitContext';

interface IToHitProjectionInput {
  readonly attacker: IUnitToken;
  readonly targetUnitId?: string;
  readonly combatState?: IGameState | null;
  readonly rangeBracket: RangeBracket;
  readonly distance: number;
  readonly weapons: readonly IWeaponStatus[];
  readonly targetPartialCover: boolean;
  readonly targetTerrainModifier?: IToHitModifierDetail | null;
  readonly interveningTerrainEffects?: readonly ILOSInterveningTerrainEffect[];
  readonly indirectFire?: IIndirectFireProjection;
}

interface IToHitProjectionResult {
  readonly rangeBracket: RangeBracket;
  readonly toHitNumber: number;
  readonly toHitModifiers: readonly IToHitModifier[];
  readonly toHitReason: string;
  readonly c3BenefitApplied?: boolean;
  readonly c3SpotterId?: string | null;
  readonly c3SpotterRange?: number | null;
}

type ToHitCalculation = ReturnType<typeof calculateToHit>;
type C3Result = ReturnType<typeof calculateToHitWithC3>['c3Result'];

function formatToHitReason(
  toHitNumber: number,
  modifiers: readonly IToHitModifier[],
): string {
  return `To-hit ${toHitNumber}: ${modifiers
    .map(
      (modifier) =>
        `${modifier.name} ${modifier.value >= 0 ? '+' : ''}${modifier.value}`,
    )
    .join(', ')}`;
}

function attackContextModifiers({
  attackerUnit,
  targetUnit,
  targetTerrainModifier,
  interveningTerrainEffects,
}: {
  readonly attackerUnit: IGameState['units'][string];
  readonly targetUnit: IGameState['units'][string];
  readonly targetTerrainModifier?: IToHitModifierDetail | null;
  readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
}): readonly IToHitModifierDetail[] {
  return [
    calculateInterveningTerrainModifier(interveningTerrainEffects),
    targetTerrainModifier,
    calculateGroundToAirAltitudeModifier(attackerUnit, targetUnit),
  ].filter(
    (modifier): modifier is IToHitModifierDetail =>
      modifier !== null && modifier !== undefined,
  );
}

function buildProjectionAttackerState({
  attackerUnit,
  targetUnitId,
  weapons,
  contextModifiers,
}: {
  readonly attackerUnit: IGameState['units'][string];
  readonly targetUnitId: string;
  readonly weapons: readonly IWeaponStatus[];
  readonly contextModifiers: readonly IToHitModifierDetail[];
}) {
  const primaryWeapon = weapons[0];
  return {
    ...buildWeaponAttackAttackerToHitState(
      attackerUnit,
      attackerUnit.gunnery ?? DEFAULT_GUNNERY,
      primaryWeapon
        ? { id: primaryWeapon.id, name: primaryWeapon.name }
        : undefined,
      targetUnitId,
      undefined,
      {
        calledShot: weapons.some((weapon) => weapon.calledShot === true),
        teammateCalledShot: weapons.some(
          (weapon) => weapon.teammateCalledShot === true,
        ),
      },
    ),
    damageModifiers: contextModifiers,
    ...deriveVehicleToHitContext(attackerUnit, weapons),
  };
}

function weaponRangeProfiles(weapons: readonly IWeaponStatus[]) {
  return weapons.map((weapon) => ({
    short: weapon.ranges.short,
    medium: weapon.ranges.medium,
    long: weapon.ranges.long,
    extreme: weapon.ranges.extreme,
    minimum: weapon.ranges.minimum,
  }));
}

function calculateProjectionToHit({
  attacker,
  combatState,
  rangeBracket,
  distance,
  weapons,
  attackerUnit,
  targetUnit,
  targetUnitId,
  targetPartialCover,
  contextModifiers,
  indirectFire,
}: IToHitProjectionInput & {
  readonly combatState: IGameState;
  readonly attackerUnit: IGameState['units'][string];
  readonly targetUnit: IGameState['units'][string];
  readonly targetUnitId: string;
  readonly contextModifiers: readonly IToHitModifierDetail[];
}): {
  readonly toHitCalc: ToHitCalculation;
  readonly c3Result?: C3Result;
} {
  const primaryWeapon = weapons[0];
  const attackerState = buildProjectionAttackerState({
    attackerUnit,
    targetUnitId,
    weapons,
    contextModifiers,
  });
  const targetState = buildWeaponAttackTargetToHitState(
    targetUnit,
    targetPartialCover,
  );
  const minimumRange = minimumRangeForWeapons(
    weapons,
    distance,
    isGroundToGroundGameAttack(attackerUnit, targetUnit),
  );
  const c3State = combatState.c3State;
  const rangeProfiles = weaponRangeProfiles(weapons);
  const c3Selection =
    indirectFire?.available === true || !c3State
      ? undefined
      : selectC3RangeBracket({
          attackerEntityId: attacker.unitId,
          targetPosition: targetUnit.position,
          weaponRangeProfiles: rangeProfiles,
          directRangeBracket: rangeBracket,
          c3State,
        });
  const c3WeaponRangeProfile =
    c3Selection !== undefined
      ? rangeProfiles[c3Selection.weaponIndex]
      : undefined;

  if (c3Selection !== undefined && c3WeaponRangeProfile && c3State) {
    const c3ToHit = calculateToHitWithC3(
      attackerState,
      targetState,
      rangeBracket,
      distance,
      {
        attackerEntityId: attacker.unitId,
        targetPosition: targetUnit.position,
        weaponRangeProfile: c3WeaponRangeProfile,
        c3State,
      },
      minimumRange,
      primaryWeapon?.id,
    );
    return {
      toHitCalc: c3ToHit,
      c3Result: c3ToHit.c3Result.benefitApplied ? c3ToHit.c3Result : undefined,
    };
  }

  return {
    toHitCalc: calculateToHit(
      attackerState,
      targetState,
      rangeBracket,
      distance,
      minimumRange,
      primaryWeapon?.id,
    ),
  };
}

function modifiersWithIndirectFire(
  toHitCalc: ToHitCalculation,
  indirectFire?: IIndirectFireProjection,
): {
  readonly toHitNumber: number;
  readonly modifiers: readonly IToHitModifier[];
} {
  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
    description: modifier.description,
  }));
  let toHitNumber = toHitCalc.finalToHit;

  if (indirectFire?.available === true && indirectFire.toHitPenalty > 0) {
    modifiers.push({
      name: 'Indirect fire',
      value: indirectFire.toHitPenalty,
      source: 'other',
    });
    toHitNumber += indirectFire.toHitPenalty;
  }

  return { toHitNumber, modifiers };
}

export function deriveToHitProjection(
  input: IToHitProjectionInput,
): IToHitProjectionResult | undefined {
  const {
    attacker,
    targetUnitId,
    combatState,
    rangeBracket,
    distance,
    weapons,
    targetTerrainModifier,
    interveningTerrainEffects = [],
  } = input;

  if (!combatState || !targetUnitId || weapons.length === 0) return undefined;
  if (rangeBracket === RangeBracket.OutOfRange || distance === 0) {
    return undefined;
  }

  const attackerUnit = combatState.units[attacker.unitId];
  const targetUnit = combatState.units[targetUnitId];
  if (!attackerUnit || !targetUnit) return undefined;

  const { toHitCalc, c3Result } = calculateProjectionToHit({
    ...input,
    combatState,
    targetUnitId,
    attackerUnit,
    targetUnit,
    contextModifiers: attackContextModifiers({
      attackerUnit,
      targetUnit,
      targetTerrainModifier,
      interveningTerrainEffects,
    }),
  });
  const { toHitNumber, modifiers } = modifiersWithIndirectFire(
    toHitCalc,
    input.indirectFire,
  );

  return {
    rangeBracket: c3Result?.bestBracket ?? rangeBracket,
    toHitNumber,
    toHitModifiers: modifiers,
    toHitReason: formatToHitReason(toHitNumber, modifiers),
    c3BenefitApplied: c3Result?.benefitApplied,
    c3SpotterId: c3Result?.spotterId,
    c3SpotterRange: c3Result?.spotterRange,
  };
}
