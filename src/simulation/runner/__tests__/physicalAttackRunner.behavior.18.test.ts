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

it('hydrates grounded DropShip source context for DFA hit displacement', () => {
  const baseState = createState();
  const state: IGameState = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      'grounded-dropship': createUnit(
        'grounded-dropship',
        GameSide.Opponent,
        { q: 1, r: 0 },
        {
          unitType: UnitType.DROPSHIP,
          isAirborne: false,
          pilotConscious: false,
        },
      ),
    },
  };
  const { events, result } = runPhaseWithState(
    'dfa',
    state,
    createGroundedDropShipDfaGrid(),
  );

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    hit: true,
  });
  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 1, r: 2 },
      reason: 'dfa',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'dfa',
    },
  ]);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 2 });
  expect(result.units['grounded-dropship'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
});

it('applies source-backed DFA miss target displacement and attacker fall-in', () => {
  const { events, result } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      piloting: 12,
    },
    target: {
      piloting: 12,
    },
    grid: createPhysicalGrid(),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    roll: 8,
    toHitNumber: 12,
    hit: false,
  });
  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 1, r: 1 },
      reason: 'dfa_miss',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'dfa_miss',
    },
  ]);
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  const attackerFallDamage = damageEventsFor(events, 'player-1');
  const fell = events.find((event) => event.type === GameEventType.UnitFell);
  const pilotHit = events.find(
    (event) => event.type === GameEventType.PilotHit,
  );
  const fallPayload = fell?.payload as IUnitFellPayload | undefined;
  const pilotHitPayload = pilotHit?.payload as IPilotHitPayload | undefined;
  expect(attackerFallDamage.reduce((sum, event) => sum + event.damage, 0)).toBe(
    21,
  );
  expect(fallPayload).toMatchObject({
    unitId: 'player-1',
    fallDamage: 21,
    newFacing: Facing.North,
    pilotDamage: 1,
    location: 'dfa_miss',
    reason: 'Missed DFA',
    reasonCode: PSRTrigger.DFAMiss,
  });
  expect(pilotHitPayload).toMatchObject({
    unitId: 'player-1',
    wounds: 1,
    totalWounds: 1,
    source: 'fall',
    consciousnessCheckRequired: true,
    consciousnessCheckPassed: true,
  });
  expect(result.units['player-1'].pendingPSRs).toEqual([]);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-1']).toMatchObject({
    position: { q: 1, r: 0 },
    prone: true,
    facing: Facing.North,
    pilotWounds: 1,
    pilotConscious: true,
  });
});

it('avoids friendly occupied DFA miss displacement destinations in runner resolution', () => {
  const baseState = createState();
  const state: IGameState = {
    ...baseState,
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        facing: Facing.South,
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        piloting: 12,
      },
      'opponent-1': {
        ...baseState.units['opponent-1'],
        piloting: 12,
      },
      'opponent-friend': createUnit(
        'opponent-friend',
        GameSide.Opponent,
        { q: 1, r: 1 },
        { pilotConscious: false },
      ),
    },
  };
  const { events, result } = runPhaseWithState(
    'dfa',
    state,
    createFriendlyDfaMissGrid(),
  );

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    hit: false,
  });
  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 0, r: 1 },
      reason: 'dfa_miss',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'dfa_miss',
    },
  ]);
  expect(result.units['opponent-1'].position).toEqual({ q: 0, r: 1 });
  expect(result.units['opponent-friend'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
});

it('destroys the DFA target when hit displacement is impossible', () => {
  const { events, result } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    grid: createPhysicalGrid({ blockDfaDisplacement: true }),
  });
  const destroyed = events.find(
    (event) =>
      event.type === GameEventType.UnitDestroyed &&
      (event.payload as IUnitDestroyedPayload).unitId === 'opponent-1',
  );
  const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'opponent-1',
    cause: 'impossible_displacement',
    killerUnitId: 'player-1',
  });
  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'dfa',
    },
  ]);
  expect(result.units['opponent-1'].destroyed).toBe(true);
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
});
