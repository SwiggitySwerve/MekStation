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

interface IWeaponToHitDescriptor {
  readonly id: string;
  readonly name: string;
  readonly category?: string;
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
  calledShot?: boolean,
  teammateCalledShot?: boolean,
  applyLocalCalledShotAbilityReduction: boolean = true,
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
    calledShot,
    teammateCalledShot,
    applyLocalCalledShotAbilityReduction,
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
    immobile: unit.shutdown ?? false,
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
