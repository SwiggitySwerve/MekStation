import type {
  IMovementStandUpCapability,
  IMovementWaterCapability,
  MovementHeatProfile,
  MovementMotiveMode,
  MovementPavementRoadBonusProfile,
  MovementTerrainProfile,
  MovementUnitHeightProfile,
} from '@/types/gameplay/HexGridInterfaces';

import {
  booleanField,
  normalizedKey,
  numberField,
  recordField,
} from './CompendiumAdapter.fields';
import {
  movementUnitHeightProfileFromUnitData,
  unitHeightFromUnitData,
} from './CompendiumAdapter.movementHeight';
import {
  movementHeatProfileFromUnitData,
  movementModeFromUnitData,
  movementTerrainProfileFromUnitData,
  pavementRoadBonusProfileFromUnitData,
  standUpCapabilityFromUnitData,
  waterCapabilityFromUnitData,
} from './CompendiumAdapter.movementProfiles';

export interface AdaptedMovementState {
  walkMP: number;
  runMP: number;
  jumpMP: number;
  movementMode?: MovementMotiveMode;
  movementHeatProfile?: MovementHeatProfile;
  movementTerrainProfile?: MovementTerrainProfile;
  pavementRoadBonusProfile?: MovementPavementRoadBonusProfile;
  unitHeight?: number;
  unitHeightProfile?: MovementUnitHeightProfile;
  waterCapability?: IMovementWaterCapability;
  standUpCapability?: IMovementStandUpCapability;
}

export function calculateMovement(
  unitData: Record<string, unknown>,
): AdaptedMovementState {
  const movement = recordField(unitData.movement);
  const walkMP =
    numberField(movement, 'walk', 'walkMP', 'groundMP', 'cruiseMP') ??
    numberField(unitData, 'walkMP', 'groundMP', 'cruiseMP') ??
    0;
  const explicitRunMP =
    numberField(movement, 'run', 'runMP', 'flankMP') ??
    numberField(unitData, 'runMP', 'flankMP');
  const jumpMP =
    numberField(movement, 'jump', 'jumpMP', 'jumpingMP') ??
    numberField(unitData, 'jumpMP', 'jumpingMP') ??
    0;
  const runMP = explicitRunMP ?? deriveRunMP(unitData, walkMP);
  const movementMode = movementModeFromUnitData(unitData);
  const movementHeatProfile = movementHeatProfileFromUnitData(unitData);
  const movementTerrainProfile = movementTerrainProfileFromUnitData(unitData);
  const pavementRoadBonusProfile =
    pavementRoadBonusProfileFromUnitData(unitData);
  const unitHeight = unitHeightFromUnitData(unitData);
  const unitHeightProfile = movementUnitHeightProfileFromUnitData(unitData);
  const waterCapability = waterCapabilityFromUnitData(unitData);
  const standUpCapability = standUpCapabilityFromUnitData(unitData);
  return {
    walkMP,
    runMP,
    jumpMP,
    ...(movementMode ? { movementMode } : {}),
    ...(movementHeatProfile ? { movementHeatProfile } : {}),
    ...(movementTerrainProfile ? { movementTerrainProfile } : {}),
    ...(pavementRoadBonusProfile ? { pavementRoadBonusProfile } : {}),
    ...(unitHeight !== undefined ? { unitHeight } : {}),
    ...(unitHeightProfile ? { unitHeightProfile } : {}),
    ...(waterCapability ? { waterCapability } : {}),
    ...(standUpCapability ? { standUpCapability } : {}),
  };
}

function deriveRunMP(
  unitData: Record<string, unknown>,
  walkMP: number,
): number {
  const unitType = normalizedKey(unitData.unitType);
  const fastInfantryMove = tacOpsFastInfantryMoveEnabled(unitData);

  if (unitType === 'infantry') {
    return fastInfantryMove ? (walkMP > 0 ? walkMP + 1 : walkMP + 2) : walkMP;
  }
  if (unitType === 'battlearmor') {
    return fastInfantryMove ? walkMP + 1 : walkMP;
  }

  return Math.ceil(walkMP * 1.5);
}

function tacOpsFastInfantryMoveEnabled(
  unitData: Record<string, unknown>,
): boolean {
  const movement = recordField(unitData.movement);
  const fieldNames = [
    'tacOpsFastInfantryMove',
    'tacOpsFastInfantryMovement',
    'fastInfantryMove',
    'fastInfantryMovement',
    'fastInfantry',
  ] as const;
  return (
    booleanField(unitData, ...fieldNames) ||
    (movement !== undefined && booleanField(movement, ...fieldNames))
  );
}
