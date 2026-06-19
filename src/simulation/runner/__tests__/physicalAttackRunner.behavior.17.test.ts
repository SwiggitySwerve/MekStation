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

it('refreshes runner grid occupancy after displacement before later same-phase attacks', () => {
  const events: IGameEvent[] = [];
  const violations: IViolation[] = [];
  const state = createSamePhaseDisplacementState();

  const result = runPhysicalAttackPhase({
    state,
    botPlayer: new DeclaresMappedPhysicalAttackAI({
      'player-1': { targetId: 'opponent-1', attackType: 'push' },
      'player-2': { targetId: 'opponent-2', attackType: 'charge' },
    }),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
    grid: createSamePhaseDisplacementGrid(),
    random: new SeededRandom(11),
  });
  const resolved = events
    .filter((event) => event.type === GameEventType.PhysicalAttackResolved)
    .map((event) => event.payload as IPhysicalAttackResolvedPayload);

  expect(resolved).toHaveLength(2);
  expect(resolved[0]).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'push',
    hit: true,
  });
  expect(resolved[0].displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 2, r: 0 },
      reason: 'push',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'push',
    },
  ]);
  expect(resolved[1]).toMatchObject({
    attackerId: 'player-2',
    targetId: 'opponent-2',
    attackType: 'charge',
    hit: true,
  });
  expect(resolved[1].displacements).toBeUndefined();
  expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
  expect(result.units['opponent-2'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-2'].position).toEqual({ q: 0, r: 2 });
  expect(result.units['opponent-2'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
  expect(result.units['player-2'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Charged }),
  );
});

it('moves a missed charge attacker without queuing a normal charge-miss PSR', () => {
  const { events, result } = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
      piloting: 12,
    },
    grid: createPhysicalGrid(),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'charge',
    roll: 8,
    toHitNumber: 14,
    hit: false,
  });
  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: -1, r: 1 },
      reason: 'charge_miss',
    },
  ]);
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['player-1'].pendingPSRs ?? []).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.ChargeMiss }),
  );
  expect(result.units['player-1'].position).toEqual({ q: -1, r: 1 });
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
});

it('applies DFA target clusters, attacker leg damage, and both PSRs', () => {
  const { events, initialState, result } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    roll: 8,
    toHitNumber: 5,
    hit: true,
    damage: 21,
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(5);
  expect(
    damageEventsFor(events, 'player-1').map((payload) => payload.location),
  ).toEqual(expect.arrayContaining(['left_leg', 'right_leg']));
  expect(result.units['player-1'].armor.left_leg).toBeLessThan(
    initialState.units['player-1'].armor.left_leg ?? 0,
  );
  expect(result.units['player-1'].armor.right_leg).toBeLessThan(
    initialState.units['player-1'].armor.right_leg ?? 0,
  );
  expectPendingPSR(result, 'opponent-1', PSRTrigger.DFATarget, {
    additionalModifier: 2,
  });
  expect(result.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({
      reason: 'Executed DFA',
      reasonCode: PSRTrigger.DFATarget,
      additionalModifier: 4,
      triggerSource: 'dfa_attacker_hit',
    }),
  );
});

it('applies source-backed DFA Battle Armor target-class to-hit modifier', () => {
  const { events } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    target: {
      unitType: UnitType.BATTLE_ARMOR,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    roll: 8,
    toHitNumber: 6,
    hit: true,
  });
});

it('applies source-backed DFA piloting skill differential modifier', () => {
  const { events } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      piloting: 5,
    },
    target: {
      piloting: 3,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    roll: 8,
    toHitNumber: 7,
    hit: true,
  });
});

it('applies source-backed DFA hit displacement', () => {
  const { events, result } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    grid: createPhysicalGrid(),
  });

  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 1, r: 1 },
      reason: 'dfa',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'dfa',
    },
  ]);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
});
