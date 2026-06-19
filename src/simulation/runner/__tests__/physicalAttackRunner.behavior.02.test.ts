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

it('honors an injected source-backed jump jet attack declaration as selected-leg damage without PSR side effects', () => {
  const { events, result } = runPhase('jump-jet-attack', {
    attacker: { facing: Facing.Southeast },
    movementCapabilitiesByUnit: new Map([
      ['player-1', { walkMP: 4, runMP: 6, jumpMP: 2 }],
    ]),
    optionalRules: ['tacops_jump_jet_attack'],
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.DamageApplied,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'jump-jet-attack',
    toHitNumber: 7,
    hit: true,
    damage: 6,
  });
  expect(damageEventsFor(events, 'opponent-1')).toEqual([
    expect.objectContaining({
      unitId: 'opponent-1',
      damage: 6,
      sourceUnitId: 'player-1',
    }),
  ]);
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
});

it('honors an injected source-backed brush-off declaration as swarmer damage and dislodgement', () => {
  const { events, result } = runPhase('brush-off', {
    attacker: { piloting: 1 },
    target: {
      isSwarming: true,
      unitType: UnitType.INFANTRY,
    },
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.DamageApplied,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'brush-off',
    toHitNumber: 5,
    hit: true,
    damage: 7,
  });
  expect(damageEventsFor(events, 'opponent-1')).toEqual([
    expect.objectContaining({
      unitId: 'opponent-1',
      damage: 7,
      sourceUnitId: 'player-1',
    }),
  ]);
  expect(result.units['opponent-1'].isSwarming).toBe(false);
});

it('removes exactly one attached iNARC pod on a successful brush-off', () => {
  const iNarcPods = [
    { teamId: GameSide.Player, podType: 'homing' as const },
    { teamId: GameSide.Player, podType: 'ecm' as const },
  ];
  const { events, result } = runPhase('brush-off', {
    attacker: { piloting: 1 },
    target: { iNarcPods },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'brush-off',
    toHitNumber: 5,
    hit: true,
  });
  expect(result.units['opponent-1'].iNarcPods).toEqual([iNarcPods[1]]);
});

it('removes the selected attached iNARC pod on a successful brush-off', () => {
  const selectedINarcPod = {
    teamId: GameSide.Player,
    podType: 'ecm' as const,
    location: 'left_torso',
  };
  const iNarcPods = [
    { teamId: GameSide.Player, podType: 'homing' as const },
    selectedINarcPod,
    { teamId: GameSide.Opponent, podType: 'ecm' as const },
  ];
  const { events, result } = runPhase('brush-off', {
    attacker: { piloting: 1 },
    target: { iNarcPods },
    selectedINarcPod,
  });

  const declared = events.find(
    (event) => event.type === GameEventType.PhysicalAttackDeclared,
  )?.payload as IPhysicalAttackDeclaredPayload | undefined;
  expect(declared).toMatchObject({
    attackType: 'brush-off',
    selectedINarcPod,
  });
  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'brush-off',
    hit: true,
    selectedINarcPod,
  });
  expect(result.units['opponent-1'].iNarcPods).toEqual([
    iNarcPods[0],
    iNarcPods[2],
  ]);
});

it('honors an injected source-backed brush-off miss as attacker self-damage', () => {
  const { events, result } = runPhase('brush-off', {
    target: {
      isSwarming: true,
      unitType: UnitType.INFANTRY,
    },
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.DamageApplied,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'brush-off',
    toHitNumber: 9,
    hit: false,
    damage: 0,
  });
  expect(damageEventsFor(events, 'player-1')).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      damage: 7,
      sourceUnitId: 'player-1',
    }),
  ]);
  expect(result.units['opponent-1'].isSwarming).toBe(true);
});

it('preserves attached iNARC pods on a missed brush-off', () => {
  const iNarcPods = [
    { teamId: GameSide.Player, podType: 'haywire' as const },
    { teamId: GameSide.Player, podType: 'nemesis' as const },
  ];
  const { events, result } = runPhase('brush-off', {
    target: { iNarcPods },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'brush-off',
    toHitNumber: 9,
    hit: false,
  });
  expect(result.units['opponent-1'].iNarcPods).toEqual(iNarcPods);
});

it('automatically selects brush-off against attached iNARC pods when it is the best legal attack', () => {
  const iNarcPods = [{ teamId: GameSide.Player, podType: 'homing' as const }];
  const { events, result } = runAutomaticPhase({
    attacker: {
      piloting: 1,
      componentDamage: {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      },
    },
    target: { iNarcPods },
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
    attackType: 'brush-off',
    selectedINarcPod: iNarcPods[0],
  });
  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'brush-off',
    hit: true,
    selectedINarcPod: iNarcPods[0],
  });
  expect(result.units['opponent-1'].iNarcPods).toEqual([]);
});

it('rejects injected jump jet attacks without the TacOps option before side effects', () => {
  const { events, result } = runPhase('jump-jet-attack', {
    attacker: { facing: Facing.Southeast },
    movementCapabilitiesByUnit: new Map([
      ['player-1', { walkMP: 4, runMP: 6, jumpMP: 2 }],
    ]),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'jump-jet-attack',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TacOpsJumpJetAttackDisabled',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
});
