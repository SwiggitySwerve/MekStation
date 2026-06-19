/**
 * Behavior-class coverage for runner physical attacks that are supported by
 * the shared physical-attack rules but historically skipped by the runner.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHex,
  IHexGrid,
  IDamageAppliedPayload,
  ICriticalHitResolvedPayload,
  IMinefieldChangedPayload,
  IRepresentedMinefieldState,
  IPhysicalAttackDeclaredPayload,
  IMovementCapability,
  IPilotHitPayload,
  IPhysicalAttackResolvedPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  buildCriticalSlotManifest,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import {
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type PhysicalAttackINarcPodSelection,
  type PhysicalAttackLimb,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import type {
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '../../ai/IAIPlayer';
import type { IViolation } from '../../invariants/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from '../CombatPhysicalLegalityGateSupport';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  EXPLICIT_UNSUPPORTED_MINEFIELD_VARIANT_TYPES,
  DeclaresMappedPhysicalAttackAI,
  createUnit,
  createState,
  scriptedD6Random,
  createPhysicalGrid,
  createSameHexPhysicalGrid,
  createBreakGrapplePhysicalGrid,
  createGroundedDropShipDfaGrid,
  createSamePhaseDisplacementState,
  createSamePhaseDisplacementGrid,
  createDominoChargeGrid,
  createBlockedDominoChargeGrid,
  createFriendlyDfaMissGrid,
  runPhase,
  runPhaseWithState,
  runAutomaticPhase,
  damageEventsFor,
  resolvedPayload,
  expectPendingPSR,
} from './physicalAttackRunner.behavior.test-helpers';

it('applies represented emp coordinate minefield effects during domino fallout without conventional damage', () => {
  const baseState = createState();
  const mineCoord = { q: 1, r: 3 };
  const empMinefield: IRepresentedMinefieldState = {
    type: 'emp',
    damagePerLeg: 5,
    source: 'scenario',
  };
  const state: IGameState = {
    ...baseState,
    minefields: {
      '1,3': empMinefield,
    },
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        facing: Facing.South,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        piloting: 0,
      },
      'domino-blocker': createUnit(
        'domino-blocker',
        GameSide.Opponent,
        { q: 1, r: 1 },
        { pilotConscious: false },
      ),
      'domino-tail': createUnit(
        'domino-tail',
        GameSide.Opponent,
        { q: 1, r: 2 },
        { pilotConscious: false },
      ),
    },
  };
  const { events, result } = runPhaseWithState(
    'charge',
    state,
    createDominoChargeGrid(),
    {
      random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
    },
  );

  expect(resolvedPayload(events).displacements).toContainEqual({
    unitId: 'domino-tail',
    from: { q: 1, r: 2 },
    to: mineCoord,
    reason: 'domino',
  });
  expect(result.units['domino-tail']).toMatchObject({
    position: mineCoord,
    damageThisPhase: 0,
    armor: state.units['domino-tail'].armor,
    shutdown: true,
    empShutdownTurns: expect.any(Number),
  });
  expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
  expect(
    events.find(
      (event) => event.type === GameEventType.EmpMinefieldEffectApplied,
    )?.payload,
  ).toMatchObject({
    unitId: 'domino-tail',
    hex: mineCoord,
    effect: 'shutdown',
    source: 'minefield',
  });
  expect(
    events.find((event) => event.type === GameEventType.MinefieldChanged)
      ?.payload,
  ).toMatchObject({
    hex: mineCoord,
    minefield: {
      ...empMinefield,
      detonated: true,
    },
    operation: 'detonate',
    reason: 'movement_detonation',
  });
  expect(result.minefields?.['1,3']).toEqual({
    ...empMinefield,
    detonated: true,
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
});

it('does not emit partial charge domino displacement when the downstream chain is blocked', () => {
  const baseState = createState();
  const state: IGameState = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        facing: Facing.South,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        piloting: 0,
      },
      'domino-blocker': createUnit(
        'domino-blocker',
        GameSide.Opponent,
        { q: 1, r: 1 },
        { pilotConscious: false },
      ),
      'domino-tail': createUnit(
        'domino-tail',
        GameSide.Opponent,
        { q: 1, r: 2 },
        { pilotConscious: false },
      ),
    },
  };
  const { events, result } = runPhaseWithState(
    'charge',
    state,
    createBlockedDominoChargeGrid(),
  );

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'charge',
    hit: true,
    damage: 28,
  });
  expect(resolvedPayload(events).displacements).toBeUndefined();
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['domino-blocker'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['domino-tail'].position).toEqual({ q: 1, r: 2 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(result.units['domino-blocker'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
  );
  expect(result.units['domino-tail'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
  );
  expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
  expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
});

it('keeps a successful charge in place when target displacement is blocked', () => {
  const { events, result } = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    grid: createPhysicalGrid({ blockChargeDisplacement: true }),
  });
  const destroyed = events.find(
    (event) =>
      event.type === GameEventType.UnitDestroyed &&
      (event.payload as IUnitDestroyedPayload).cause ===
        'impossible_displacement',
  );

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'charge',
    hit: true,
    damage: 28,
  });
  expect(resolvedPayload(events).displacements).toBeUndefined();
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(6);
  expect(damageEventsFor(events, 'player-1').length).toBeGreaterThan(0);
  expect(destroyed).toBeUndefined();
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
  expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
});

it('keeps a successful charge in place when displacement would climb too high', () => {
  const { events, result } = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    grid: createPhysicalGrid({ displacementElevation: 3 }),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'charge',
    hit: true,
    damage: 28,
  });
  expect(resolvedPayload(events).displacements).toBeUndefined();
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
  expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
});

it.each([
  ['impassable terrain', 'impassable'],
  [
    'overgrown woods terrain',
    JSON.stringify([{ type: TerrainType.HeavyWoods, level: 3 }]),
  ],
])(
  'keeps a successful charge in place when displacement destination is %s',
  (_label, chargeDisplacementTerrain) => {
    const { events, result } = runPhase('charge', {
      attacker: {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
      grid: createPhysicalGrid({ chargeDisplacementTerrain }),
    });

    expect(resolvedPayload(events)).toMatchObject({
      attackType: 'charge',
      hit: true,
      damage: 28,
    });
    expect(resolvedPayload(events).displacements).toBeUndefined();
    expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
    expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
    expect(result.units['opponent-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
    expect(result.units['player-1'].pendingPSRs).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
    );
  },
);
