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

it('does not automatically select physical attacks against different-board targets', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      boardId: 'board-alpha',
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    target: {
      boardId: 'board-beta',
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

it('does not automatically select charge against targets making displacement attacks', () => {
  const { events } = runAutomaticPhase({
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    target: {
      isMakingDisplacementAttack: true,
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

it.each([
  ['hatchet', 4, 13],
  ['sword', 3, 8],
  ['mace', 6, 17],
  ['lance', 6, 13],
  ['retractable-blade', 3, 7],
  ['flail', 5, 9],
  ['wrecking-ball', 6, 8],
] satisfies Array<[PhysicalAttackType, number, number]>)(
  'honors supported melee weapon %s through runner resolution',
  (attackType, toHitNumber, damage) => {
    expect(SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES).toContain(attackType);

    const { events } = runPhase(attackType);
    const declared = events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const resolved = resolvedPayload(events);

    expect(declared?.payload).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType,
    });
    expect(resolved).toMatchObject({
      attackerId: 'player-1',
      targetId: 'opponent-1',
      attackType,
      roll: 8,
      toHitNumber,
      hit: true,
      damage,
    });
    expect(damageEventsFor(events, 'opponent-1')).toHaveLength(1);
  },
);

it('threads talon state into runner kick damage resolution', () => {
  const { events } = runPhase('kick', {
    attacker: {
      leftLegHasTalons: true,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'kick',
    hit: true,
    damage: 20,
  });
});

it('threads quad arm-location talon state into runner kick damage resolution', () => {
  const { events } = runPhase('kick', {
    attacker: {
      isQuad: true,
      rightArmHasTalons: true,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'kick',
    hit: true,
    damage: 20,
  });
});

it('threads claw state into runner punch damage and to-hit resolution', () => {
  const { events } = runPhase('punch', {
    attacker: {
      rightArmHasClaw: true,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'punch',
    roll: 8,
    toHitNumber: 6,
    hit: true,
    damage: 10,
  });
});

it('threads PLAYTEST_3 claw to-hit relief without removing runner claw damage', () => {
  const { events } = runPhase('punch', {
    attacker: {
      rightArmHasClaw: true,
    },
    optionalRules: ['PLAYTEST_3'],
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'punch',
    roll: 8,
    toHitNumber: 5,
    hit: true,
    damage: 10,
  });
});

it('threads explicit two-handed Zweihander declaration into runner punch damage', () => {
  const { events, result } = runPhase('punch', {
    attacker: {
      abilities: ['zweihander'],
    },
    twoHandedZweihander: true,
  });

  const declared = events.find(
    (event) => event.type === GameEventType.PhysicalAttackDeclared,
  )?.payload as IPhysicalAttackDeclaredPayload;
  expect(declared.twoHandedZweihander).toBe(true);
  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'punch',
    roll: 8,
    toHitNumber: 5,
    hit: true,
    damage: 13,
  });
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
});
