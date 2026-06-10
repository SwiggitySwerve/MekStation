import type {
  IActuatorDamage,
  IAttackerState,
  IComponentDamageState,
  ISecondaryTarget,
  ITargetState,
  IUnitGameState,
} from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import { isRepresentedTargetImmobile } from '../combatImmobility';

interface IWeaponToHitDescriptor {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
}

/**
 * Audit B-5 (W1.2): the called-shot inputs were three adjacent positional
 * booleans, which let `declareAttack` pass `targetPartialCover` into the
 * `applyLocalCalledShotAbilityReduction` slot unnoticed (the call still
 * type-checked). A named options object makes that bug class impossible.
 */
export interface ICalledShotHydrationOptions {
  /** True when any weapon in the declared volley elected a called shot. */
  readonly calledShot?: boolean;
  /** True when the called shot is spotted by a teammate (+0 variant). */
  readonly teammateCalledShot?: boolean;
  /**
   * Whether the local Marksman/Sharpshooter called-shot reduction applies.
   * Defaults to true (interactive/local-campaign paths); the source-backed
   * simulation runner opts out explicitly because TacOps called shots carry
   * the full +3 without the local helper SPA.
   */
  readonly applyLocalCalledShotAbilityReduction?: boolean;
}

export function buildWeaponAttackActuatorDamage(
  componentDamage: IComponentDamageState | undefined,
): IActuatorDamage | undefined {
  const actuators = componentDamage?.actuators;
  if (!actuators) return undefined;

  const actuatorDamage: IActuatorDamage = {
    shoulderDestroyed: actuators[ActuatorType.SHOULDER] ?? false,
    upperArmDestroyed: actuators[ActuatorType.UPPER_ARM] ?? false,
    lowerArmDestroyed: actuators[ActuatorType.LOWER_ARM] ?? false,
  };

  return actuatorDamage.shoulderDestroyed ||
    actuatorDamage.upperArmDestroyed ||
    actuatorDamage.lowerArmDestroyed
    ? actuatorDamage
    : undefined;
}

export function buildWeaponAttackAttackerToHitState(
  unit: IUnitGameState,
  gunnery: number,
  weapon?: IWeaponToHitDescriptor,
  targetId?: string,
  secondaryTarget?: ISecondaryTarget,
  calledShotOptions: ICalledShotHydrationOptions = {},
): IAttackerState {
  return {
    gunnery,
    movementType: unit.movementThisTurn,
    isAirborne: unit.isAirborne,
    heat: unit.heat,
    damageModifiers: [],
    pilotWounds: unit.pilotWounds,
    sensorHits: unit.componentDamage?.sensorHits,
    actuatorDamage: buildWeaponAttackActuatorDamage(unit.componentDamage),
    prone: unit.prone ?? false,
    isSpotting: unit.isSpotting,
    abilities: unit.abilities,
    weaponType: weapon?.name ?? weapon?.id,
    weaponCategory: weapon?.category,
    designatedWeaponType: unit.designatedWeaponType,
    designatedWeaponCategory: unit.designatedWeaponCategory,
    targetId,
    secondaryTarget,
    calledShot: calledShotOptions.calledShot,
    teammateCalledShot: calledShotOptions.teammateCalledShot,
    applyLocalCalledShotAbilityReduction:
      calledShotOptions.applyLocalCalledShotAbilityReduction ?? true,
    designatedTargetId: unit.designatedTargetId,
    designatedRangeBracket: unit.designatedRangeBracket,
    unitQuirks: unit.unitQuirks,
    weaponQuirks: unit.weaponQuirks,
  };
}

export function buildWeaponAttackTargetToHitState(
  unit: IUnitGameState,
  partialCover: boolean,
  terrainFeatures: readonly ITerrainFeature[] = [],
): ITargetState {
  return {
    unitType: unit.unitType,
    movementType: unit.movementThisTurn,
    isAirborne: unit.isAirborne,
    hexesMoved: unit.hexesMovedThisTurn,
    prone: unit.prone ?? false,
    // Audit B-1 (W1.1): MegaMek's Targetable immobile contract covers
    // shutdown units AND unconscious crews. Route through the centralized
    // isRepresentedTargetImmobile helper (instead of `unit.shutdown` alone)
    // so the engine commit path and the combat projection agree.
    immobile: isRepresentedTargetImmobile(unit),
    partialCover,
    hullDown: unit.hullDown ?? false,
    unitQuirks: unit.unitQuirks,
    weaponQuirks: unit.weaponQuirks,
    abilities: unit.abilities,
    isDodging: unit.isDodging,
    isEvading: unit.isEvading,
    evasionBonus: unit.evasionBonus,
    sprintedThisTurn: unit.sprintedThisTurn,
    terrainFeatures,
  };
}
