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

it('does not apply Frogman from shallow or target-only water', () => {
  const shallow = runPhase('kick', {
    attacker: {
      abilities: ['tm_frogman'],
    },
    grid: createPhysicalGrid({ waterAttackerDepth: 1 }),
  });
  const targetOnly = runPhase('kick', {
    attacker: {
      abilities: ['tm_frogman'],
    },
    grid: createPhysicalGrid({ waterTarget: true }),
  });

  expect(resolvedPayload(shallow.events)).toMatchObject({
    attackType: 'kick',
    toHitNumber: 3,
  });
  expect(resolvedPayload(targetOnly.events)).toMatchObject({
    attackType: 'kick',
    toHitNumber: 3,
  });
});

it('applies physical unit quirks to runner punch restrictions and to-hit', () => {
  const noArms = runPhase('punch', {
    attacker: {
      unitQuirks: ['no_arms'],
    },
  });
  expect(resolvedPayload(noArms.events)).toMatchObject({
    attackType: 'punch',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
  });

  const baselinePunch = resolvedPayload(runPhase('punch').events);
  const battleFist = runPhase('punch', {
    attacker: {
      unitQuirks: ['battle_fists_ra'],
    },
  });

  expect(baselinePunch).toMatchObject({
    attackType: 'punch',
    toHitNumber: 5,
    damage: 7,
  });
  expect(resolvedPayload(battleFist.events)).toMatchObject({
    attackType: 'punch',
    roll: 8,
    toHitNumber: 4,
    hit: true,
    damage: baselinePunch.damage,
  });
});

it('applies active TSM to runner physical damage', () => {
  const { events } = runPhase('kick', {
    attacker: {
      heat: 9,
      hasTSM: true,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 3,
    hit: true,
    damage: 26,
  });
});

it('derives underwater physical damage from water terrain', () => {
  const { events } = runPhase('kick', {
    grid: createPhysicalGrid({ waterTarget: true }),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 8,
    toHitNumber: 3,
    hit: true,
    damage: 6,
  });
});

it('automatically selects charge after a running approach', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
  });

  const declared = events.find(
    (event) =>
      event.type === GameEventType.PhysicalAttackDeclared &&
      (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
        'player-1',
  )?.payload as IPhysicalAttackDeclaredPayload | undefined;

  expect(declared).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'charge',
  });
});

it('does not automatically select charge after a backward running approach', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
      movedBackwardThisTurn: true,
    },
  });

  const declared = events.find(
    (event) =>
      event.type === GameEventType.PhysicalAttackDeclared &&
      (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
        'player-1',
  )?.payload as IPhysicalAttackDeclaredPayload | undefined;

  expect(declared).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'kick',
  });
});

it('automatically selects death from above after a jumping approach', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
  });

  const declared = events.find(
    (event) =>
      event.type === GameEventType.PhysicalAttackDeclared &&
      (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
        'player-1',
  )?.payload as IPhysicalAttackDeclaredPayload | undefined;

  expect(declared).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'dfa',
  });
});

it('does not automatically select DFA when hydrated jump MP cannot reach an airborne VTOL target', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    target: { isAirborne: true, unitType: UnitType.VTOL },
    grid: createPhysicalGrid({ targetElevation: 5 }),
    movementCapabilitiesByUnit: new Map([
      ['player-1', { walkMP: 4, runMP: 6, jumpMP: 3 }],
    ]),
  });

  expect(
    events.filter(
      (event) =>
        event.actorId === 'player-1' &&
        (event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved),
    ),
  ).toEqual([]);
});

it('does not automatically select death from above after mechanical jump booster movement', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      usedMechanicalJumpBoosterThisTurn: true,
    },
  });

  const declared = events.find(
    (event) =>
      event.type === GameEventType.PhysicalAttackDeclared &&
      (event.payload as IPhysicalAttackDeclaredPayload).attackerId ===
        'player-1',
  )?.payload as IPhysicalAttackDeclaredPayload | undefined;

  expect(declared).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'kick',
  });
});

it('does not automatically select physical attacks for evading units', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      isEvading: true,
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
  });

  expect(
    events.filter(
      (event) =>
        event.actorId === 'player-1' &&
        (event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved),
    ),
  ).toEqual([]);
});

it('does not automatically select physical attacks for cargo-interacting units', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      isLoadingOrUnloadingCargo: true,
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
  });

  expect(
    events.filter(
      (event) =>
        event.actorId === 'player-1' &&
        (event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved),
    ),
  ).toEqual([]);
});
