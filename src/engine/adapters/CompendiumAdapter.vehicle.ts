import { z } from 'zod';

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { UNIT_DEFINITION_FAMILIES } from '@/services/units/unitLoaderService/definitionTypes';
import { UnitContract } from '@/types/contracts';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import {
  contractVehicleToBVUnit,
  vehicleContractTurretType,
} from '@/utils/construction/contractBVUnitAdapter';
import { computeFlankMP } from '@/utils/construction/vehicle/engine';
import { computeVehicleLocationStructurePoints } from '@/utils/construction/vehicle/structure';

import type { IAdaptedUnit } from '../types';
import type { AdaptableEquipmentItem } from './CompendiumAdapter.weapons';

import { applyInitialDamageToArmor } from './CompendiumAdapter.armor';

type VehicleCombatConstruction = Pick<
  IAdaptedUnit,
  'unitType' | 'armor' | 'structure' | 'bv' | 'walkMP' | 'runMP' | 'jumpMP'
> & {
  vehicleInit: NonNullable<IAdaptedUnit['vehicleInit']>;
  equipment: readonly AdaptableEquipmentItem[];
  turret: { type: TurretType };
  secondaryTurret: { type: TurretType } | undefined;
};

export function isVehicleDefinition(unit: IFullUnit): boolean {
  const types: readonly string[] = UNIT_DEFINITION_FAMILIES.vehicles.unitTypes;
  return types.includes(unit.unitType);
}

const required = z.object({
  tonnage: z.number().positive(),
  movement: z.object({ cruiseMP: z.number().int().nonnegative() }),
});

/** Transport catalog construction through the existing vehicle owners. */
export function adaptVehicleConstruction(
  fullUnit: IFullUnit,
  initialDamage: Record<string, number>,
): VehicleCombatConstruction {
  const definition = UnitContract.parse(fullUnit);
  const { tonnage, movement } = required.parse(definition);
  if (!definition.armor)
    throw new Error(`Vehicle '${fullUnit.id}' requires armor`);
  const source = {
    id: definition.id,
    motionType: definition.motionType,
    equipment: definition.equipment,
    internalType: definition.internalType,
    tonnage,
    unitType:
      definition.unitType === 'SupportVehicle'
        ? UnitType.SUPPORT_VEHICLE
        : definition.unitType,
    armor: definition.armor,
    movement: {
      ...definition.movement,
      cruiseMP: movement.cruiseMP,
      flankMP: computeFlankMP(movement.cruiseMP),
    },
  };
  const vehicle = contractVehicleToBVUnit(source);
  const armor = { ...vehicle.armorByLocation };
  applyInitialDamageToArmor(armor, initialDamage);
  const structure = Object.fromEntries(
    vehicle.structureLocations.map((location) => [
      location,
      computeVehicleLocationStructurePoints(tonnage),
    ]),
  );
  const installedTurret = vehicleContractTurretType(source);
  const turretType =
    installedTurret === undefined
      ? TurretType.NONE
      : vehicle.motionType === GroundMotionType.VTOL
        ? TurretType.CHIN
        : installedTurret;
  const vehicleInit: NonNullable<IAdaptedUnit['vehicleInit']> = {
    motionType: vehicle.motionType,
    turretType,
    engineType: definition.engine?.type,
    originalCruiseMP: vehicle.movement.cruiseMP,
    armor,
    structure,
  };
  const bv = calculateBattleValueForUnit(vehicle);
  if (bv?.kind !== 'vehicle' || !Number.isFinite(bv.breakdown.final))
    throw new Error(`Vehicle '${fullUnit.id}' has no finite vehicle BV`);
  return {
    unitType: vehicle.unitType,
    armor,
    structure,
    vehicleInit,
    bv: bv.breakdown.final,
    walkMP: vehicle.movement.cruiseMP,
    runMP: vehicle.movement.flankMP,
    jumpMP: vehicle.movement.jumpMP,
    equipment: vehicle.equipment.map((mount) => ({
      ...mount,
      id: mount.equipmentId,
    })),
    turret: { type: turretType },
    secondaryTurret:
      turretType === TurretType.DUAL ? { type: TurretType.SINGLE } : undefined,
  };
}
