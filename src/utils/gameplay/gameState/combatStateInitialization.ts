import type { IGameUnit, IUnitGameState } from '@/types/gameplay';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { createAerospaceCombatState } from '@/utils/gameplay/aerospace/state';
import { createBattleArmorCombatState } from '@/utils/gameplay/battlearmor/state';
import { createInfantryCombatStateFromUnit } from '@/utils/gameplay/infantry/state';
import { createProtoMechCombatState } from '@/utils/gameplay/protomech/state';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

type CombatStateEnvelope = Exclude<IUnitGameState['combatState'], undefined>;
type CombatStateBuilder = (
  unit: IGameUnit,
  unitType: UnitType,
) => CombatStateEnvelope;
type RequiredField = readonly [name: string, value: unknown];

// Per Council #1 / wire-combat-behavior-dispatch: supported non-mech unit
// families must seed a combatState envelope at session creation and throw
// loudly when required construction input is missing.
const COMBAT_STATE_BUILDERS: Readonly<
  Partial<Record<UnitType, CombatStateBuilder>>
> = {
  [UnitType.AEROSPACE]: buildAerospaceCombatState,
  [UnitType.BATTLE_ARMOR]: buildBattleArmorCombatState,
  [UnitType.CONVENTIONAL_FIGHTER]: buildAerospaceCombatState,
  [UnitType.INFANTRY]: buildInfantryCombatState,
  [UnitType.PROTOMECH]: buildProtoMechCombatState,
  [UnitType.SMALL_CRAFT]: buildAerospaceCombatState,
  [UnitType.SUPPORT_VEHICLE]: buildVehicleCombatState,
  [UnitType.VEHICLE]: buildVehicleCombatState,
  [UnitType.VTOL]: buildVehicleCombatState,
};

export function buildCombatStateForUnit(
  unit: IGameUnit,
): IUnitGameState['combatState'] {
  const unitType = unit.unitType;
  if (unitType === undefined) {
    return undefined;
  }

  return COMBAT_STATE_BUILDERS[unitType]?.(unit, unitType);
}

function buildVehicleCombatState(
  unit: IGameUnit,
  unitType: UnitType,
): CombatStateEnvelope {
  const init = requireInit(unit, unitType, 'vehicleInit');
  assertRequiredFields(unit, unitType, [
    ['vehicleInit.motionType', init.motionType],
    ['vehicleInit.originalCruiseMP', init.originalCruiseMP],
    ['vehicleInit.armor', init.armor],
    ['vehicleInit.structure', init.structure],
  ]);

  return {
    kind: 'vehicle',
    state: createVehicleCombatState({
      unitId: unit.id,
      motionType: init.motionType,
      turretType: init.turretType,
      originalCruiseMP: init.originalCruiseMP,
      armor: init.armor,
      structure: init.structure,
      altitude: init.altitude,
    }),
  };
}

function buildAerospaceCombatState(
  unit: IGameUnit,
  unitType: UnitType,
): CombatStateEnvelope {
  const init = requireInit(unit, unitType, 'aerospaceInit');
  assertRequiredFields(unit, unitType, [
    ['aerospaceInit.maxSI', init.maxSI],
    ['aerospaceInit.armorByArc', init.armorByArc],
    ['aerospaceInit.heatSinks', init.heatSinks],
    ['aerospaceInit.fuelPoints', init.fuelPoints],
    ['aerospaceInit.safeThrust', init.safeThrust],
    ['aerospaceInit.maxThrust', init.maxThrust],
  ]);

  return {
    kind: 'aero',
    state: createAerospaceCombatState({
      maxSI: init.maxSI,
      armorByArc: init.armorByArc,
      heatSinks: init.heatSinks,
      fuelPoints: init.fuelPoints,
      safeThrust: init.safeThrust,
      maxThrust: init.maxThrust,
      altitude: init.altitude ?? 1,
      currentVelocity: init.currentVelocity,
      nextVelocity: init.nextVelocity,
      airborneState: init.airborneState,
      dogfightWith: init.dogfightWith,
    }),
  };
}

function buildInfantryCombatState(
  unit: IGameUnit,
  unitType: UnitType,
): CombatStateEnvelope {
  const init = requireInit(unit, unitType, 'infantryInit');
  return {
    kind: 'platoon',
    state: createInfantryCombatStateFromUnit(init),
  };
}

function buildProtoMechCombatState(
  unit: IGameUnit,
  unitType: UnitType,
): CombatStateEnvelope {
  const init = requireInit(unit, unitType, 'protoMechInit');
  assertRequiredFields(unit, unitType, [
    ['protoMechInit.chassisType', init.chassisType],
    ['protoMechInit.hasMainGun', init.hasMainGun],
    ['protoMechInit.armorByLocation', init.armorByLocation],
    ['protoMechInit.structureByLocation', init.structureByLocation],
  ]);

  return {
    kind: 'proto',
    state: createProtoMechCombatState({
      unitId: unit.id,
      chassisType: init.chassisType,
      hasMainGun: init.hasMainGun,
      armorByLocation: init.armorByLocation,
      structureByLocation: init.structureByLocation,
      altitude:
        init.chassisType === ProtoChassis.GLIDER
          ? (init.altitude ?? 0)
          : init.altitude,
    }),
  };
}

function buildBattleArmorCombatState(
  unit: IGameUnit,
  unitType: UnitType,
): CombatStateEnvelope {
  const init = requireInit(unit, unitType, 'battleArmorInit');
  assertRequiredFields(unit, unitType, [
    ['battleArmorInit.squadSize', init.squadSize],
    ['battleArmorInit.armorPointsPerTrooper', init.armorPointsPerTrooper],
  ]);

  return {
    kind: 'squad',
    state: createBattleArmorCombatState({
      unitId: unit.id,
      squadSize: init.squadSize,
      armorPointsPerTrooper: init.armorPointsPerTrooper,
      stealthKind: init.stealthKind,
      hasMagneticClamp: init.hasMagneticClamp,
      hasVibroClaws: init.hasVibroClaws,
      vibroClawCount: init.vibroClawCount,
    }),
  };
}

function requireInit<K extends keyof IGameUnit>(
  unit: IGameUnit,
  unitType: UnitType,
  fieldName: K,
): NonNullable<IGameUnit[K]> {
  const init = unit[fieldName];
  if (init === undefined) {
    throwMissingFields(unit, unitType, [String(fieldName)]);
  }
  return init as NonNullable<IGameUnit[K]>;
}

function assertRequiredFields(
  unit: IGameUnit,
  unitType: UnitType,
  fields: readonly RequiredField[],
): void {
  const missing = fields
    .filter(([, value]) => value === undefined)
    .map(([name]) => name);
  if (missing.length > 0) {
    throwMissingFields(unit, unitType, missing);
  }
}

function throwMissingFields(
  unit: IGameUnit,
  unitType: UnitType,
  missingFields: readonly string[],
): never {
  throw new Error(
    `createInitialUnitState: ${unitType} unit '${unit.id}' missing required field(s): ${missingFields.join(', ')}`,
  );
}
