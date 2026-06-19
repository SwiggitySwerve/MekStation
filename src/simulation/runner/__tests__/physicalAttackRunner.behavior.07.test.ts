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

it('rejects side-adjacent push targets that are not directly ahead', () => {
  const { events, result } = runPhase('push');

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
  });
  expect(resolved.displacements).toBeUndefined();
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('does not schedule injected physical attacks against non-adjacent targets', () => {
  const { events, result } = runPhase('kick', {
    target: { position: { q: 2, r: 0 } },
  });

  expect(
    events.filter(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared ||
        event.type === GameEventType.PhysicalAttackResolved,
    ),
  ).toEqual([]);
  expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('does not schedule injected physical attacks against friendly targets', () => {
  const { events, result } = runPhase('kick', {
    target: { side: GameSide.Player },
  });

  expect(
    events.filter(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared ||
        event.type === GameEventType.PhysicalAttackResolved,
    ),
  ).toEqual([]);
  expect(result.units['opponent-1'].side).toBe(GameSide.Player);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('does not schedule injected physical attacks against destroyed targets', () => {
  const { events, result } = runPhase('kick', {
    target: { destroyed: true },
  });

  expect(
    events.filter(
      (event) =>
        event.type === GameEventType.PhysicalAttackDeclared ||
        event.type === GameEventType.PhysicalAttackResolved,
    ),
  ).toEqual([]);
  expect(result.units['opponent-1'].destroyed).toBe(true);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('applies source-backed push displacement when the target hex is valid', () => {
  const { events, result } = runPhase('push', {
    attacker: { facing: Facing.Southeast },
    grid: createPhysicalGrid(),
  });

  const resolved = resolvedPayload(events);
  expect(resolved.displacements).toEqual([
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
  expect(result.units['opponent-1'].position).toEqual({ q: 2, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
});

it('honors an injected melee weapon declaration and applies damage', () => {
  const { events, result } = runPhase('sword');

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'sword',
    roll: 8,
    toHitNumber: 3,
    hit: true,
    damage: 8,
  });
  expect(
    events.some((event) => event.type === GameEventType.DamageApplied),
  ).toBe(true);
  expect(result.units['opponent-1'].armor.right_torso).toBeLessThan(22);
});

it('honors selected-arm melee weapon declarations in runner legality and events', () => {
  const { events } = runPhase('sword', {
    attacker: {
      componentDamage: {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuatorsByLocation: {
          right_arm: { [ActuatorType.LOWER_ARM]: true },
        },
      },
    },
    limb: 'leftArm',
  });

  const declared = events.find(
    (event) => event.type === GameEventType.PhysicalAttackDeclared,
  )?.payload as IPhysicalAttackDeclaredPayload | undefined;
  const resolved = resolvedPayload(events);

  expect(declared).toMatchObject({
    attackType: 'sword',
    limb: 'leftArm',
  });
  expect(resolved).toMatchObject({
    attackType: 'sword',
    hit: true,
    damage: 8,
  });
});

it('threads target movement modifier into physical to-hit resolution', () => {
  const { events } = runPhase('kick', {
    target: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 5,
    hit: true,
  });
});

it('threads explicit target evasion into physical to-hit resolution', () => {
  const { events } = runPhase('kick', {
    target: { isEvading: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 4,
    hit: true,
  });
});

it('threads explicit Skilled Evasion target bonuses into physical to-hit resolution', () => {
  const { events } = runPhase('kick', {
    target: { isEvading: true, evasionBonus: 3 },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 6,
    hit: true,
  });
});

it('applies pilot physical SPAs to runner to-hit and damage math', () => {
  const { events } = runPhase('kick', {
    attacker: {
      abilities: ['melee-specialist'],
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 2,
    hit: true,
    damage: 14,
  });
});

it('does not apply Melee Master as a flat runner physical damage bonus', () => {
  const { events } = runPhase('kick', {
    attacker: {
      abilities: ['melee-master'],
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 3,
    hit: true,
    damage: 13,
  });
});

it('hydrates source-backed Frogman depth-2 water to runner physical to-hit', () => {
  const { events } = runPhase('kick', {
    attacker: {
      abilities: ['tm_frogman'],
    },
    grid: createPhysicalGrid({ waterAttackerDepth: 2 }),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 2,
    hit: true,
  });
});
