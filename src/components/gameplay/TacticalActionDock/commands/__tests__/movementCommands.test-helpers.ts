/**
 * Movement command family — availability + disabled-reason + commit
 * dispatch tests.
 *
 * Verifies the spec's `Active unit command set follows phase` and
 * `Disabled command explains invalidity` requirements for the
 * movement family.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  GamePhase,
  LockState,
  MovementType,
  TerrainType,
  type IComponentDamageState,
  type IMovementRangeHex,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import { buildMovementCommands } from '../movementCommands';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    activeUnitProne: true,
    activeUnitHeat: 0,
    movementCapability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    ...overrides,
  };
}

function makeMovementProjection(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: { q: 1, r: 0 },
    mpCost: 9,
    reachable: false,
    movementType: MovementType.Walk,
    blockedReason: 'Destination hex is occupied',
    movementInvalidReason: 'DestinationOccupied',
    movementInvalidDetails: 'Destination hex is occupied',
    ...overrides,
  };
}

function makeComponentDamage(
  overrides: Partial<IComponentDamageState> = {},
): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
    ...overrides,
  };
}

export {
  ActuatorType,
  GamePhase,
  GroundMotionType,
  LockState,
  MovementType,
  TerrainType,
  buildMovementCommands,
  makeComponentDamage,
  makeCtx,
  makeMovementProjection,
  terrainStringFromFeatures,
};

export type {
  IComponentDamageState,
  IMovementRangeHex,
  ITacticalCommandContext,
};
