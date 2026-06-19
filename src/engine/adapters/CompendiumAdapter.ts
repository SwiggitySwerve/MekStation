/**
 * Compendium Adapter
 * Converts compendium unit data to IUnitGameState for the game engine.
 */

import {
  type IFullUnit,
  getCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import {
  hydrateC3EquipmentFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateInitiativeEquipmentFromFullUnit,
} from '@/simulation/runner/UnitHydration';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import type { IAdaptedUnit, IAdaptUnitOptions } from '../types';

import {
  applyInitialDamageToArmor,
  extractArmor,
  getStructureForTonnage,
} from './CompendiumAdapter.armor';
import { recordField, stringField } from './CompendiumAdapter.fields';
import {
  type AdaptedMovementState,
  calculateMovement,
} from './CompendiumAdapter.movement';
import {
  ammoFromWeapons,
  type AdaptableEquipmentItem,
  extractWeapons,
} from './CompendiumAdapter.weapons';

export {
  canonicalizeWeaponId,
  getWeaponData,
} from './CompendiumAdapter.weaponData';

function adaptedUnitOptionalState(
  movement: AdaptedMovementState,
  gyroType: string | undefined,
  initiativeEquipment: IAdaptedUnit['initiativeEquipment'],
  c3Equipment: IAdaptedUnit['c3Equipment'],
): Partial<IAdaptedUnit> {
  const {
    movementMode,
    movementHeatProfile,
    movementTerrainProfile,
    pavementRoadBonusProfile,
    unitHeight,
    unitHeightProfile,
    waterCapability,
    standUpCapability,
  } = movement;

  return {
    ...(movementMode ? { movementMode } : {}),
    ...(movementHeatProfile ? { movementHeatProfile } : {}),
    ...(movementTerrainProfile ? { movementTerrainProfile } : {}),
    ...(pavementRoadBonusProfile ? { pavementRoadBonusProfile } : {}),
    ...(unitHeight !== undefined ? { unitHeight } : {}),
    ...(unitHeightProfile ? { unitHeightProfile } : {}),
    ...(waterCapability ? { waterCapability } : {}),
    ...(standUpCapability ? { standUpCapability } : {}),
    ...(gyroType ? { gyroType } : {}),
    ...(initiativeEquipment ? { initiativeEquipment } : {}),
    ...(c3Equipment && c3Equipment.length > 0 ? { c3Equipment } : {}),
  };
}

/**
 * Synchronously adapt pre-loaded unit data to an IAdaptedUnit.
 */
export function adaptUnitFromData(
  fullUnit: IFullUnit,
  options: IAdaptUnitOptions = {},
): IAdaptedUnit {
  const side = options.side ?? GameSide.Player;
  const position = options.position ?? { q: 0, r: 0 };
  const facing =
    options.facing ?? (side === GameSide.Player ? Facing.North : Facing.South);
  const initialDamage = options.initialDamage ?? {};

  const unitData = fullUnit as Record<string, unknown>;
  const tonnage = (unitData.tonnage as number) ?? 50;
  const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);
  const armorAllocation = recordField(unitData.armor)?.allocation as
    | Record<string, unknown>
    | undefined;
  const armor = extractArmor(armorAllocation ?? {});
  applyInitialDamageToArmor(armor, initialDamage);

  const structure = getStructureForTonnage(tonnage);
  const rawEquipment =
    (unitData.equipment as AdaptableEquipmentItem[] | undefined) ?? [];
  const weapons = extractWeapons(rawEquipment, fullUnit.id, unitData);
  const initiativeEquipment = hydrateInitiativeEquipmentFromFullUnit(fullUnit);
  const c3Equipment = hydrateC3EquipmentFromFullUnit(fullUnit);
  const movement = calculateMovement(unitData);
  const gyroType = gyroTypeFromUnitData(unitData);
  const ammo = ammoFromWeapons(weapons);

  const adapted: IAdaptedUnit = {
    id: fullUnit.id,
    unitType: fullUnit.unitType,
    side,
    position,
    facing,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heatSinks: heatSinks.count,
    heatSinkType: heatSinks.kind,
    armor,
    structure,
    startingInternalStructure: { ...structure },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo,
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    tonnage,
    weapons,
    walkMP: movement.walkMP,
    runMP: movement.runMP,
    jumpMP: movement.jumpMP,
  };
  return {
    ...adapted,
    ...adaptedUnitOptionalState(
      movement,
      gyroType,
      initiativeEquipment,
      c3Equipment,
    ),
  };
}

function gyroTypeFromUnitData(
  unitData: Record<string, unknown>,
): string | undefined {
  const gyro = recordField(unitData.gyro);
  return (
    stringField(unitData, 'gyroType', 'gyro_type') ??
    stringField(gyro, 'type', 'gyroType', 'gyro_type')
  );
}

/**
 * Asynchronously load a unit by ID from the compendium and adapt it.
 * Returns null if the unit is not found.
 */
export async function adaptUnit(
  unitId: string,
  options: IAdaptUnitOptions = {},
): Promise<IAdaptedUnit | null> {
  const service = getCanonicalUnitService();
  const fullUnit = await service.getById(unitId);
  if (!fullUnit) return null;
  return adaptUnitFromData(fullUnit, options);
}
