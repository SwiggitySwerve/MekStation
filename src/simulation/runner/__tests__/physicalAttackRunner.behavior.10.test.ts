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

it('emits represented Zweihander self-critical events for two-handed punch hits', () => {
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    [
      'player-1',
      buildCriticalSlotManifest({
        right_arm: [
          {
            slotIndex: 0,
            componentType: 'actuator',
            componentName: ActuatorType.UPPER_ARM,
            destroyed: false,
            actuatorType: ActuatorType.UPPER_ARM,
          },
        ],
        left_arm: [
          {
            slotIndex: 0,
            componentType: 'actuator',
            componentName: ActuatorType.LOWER_ARM,
            destroyed: false,
            actuatorType: ActuatorType.LOWER_ARM,
          },
        ],
      }),
    ],
  ]);

  const { events, result } = runPhase('punch', {
    attacker: {
      abilities: ['zweihander'],
    },
    twoHandedZweihander: true,
    manifestsByUnit,
    random: scriptedD6Random([6, 6, 5, 1, 1]),
  });

  const selfCriticals = events.filter(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).unitId === 'player-1',
  );

  expect(selfCriticals.map((event) => event.phase)).toEqual([
    GamePhase.PhysicalAttack,
    GamePhase.PhysicalAttack,
  ]);
  expect(selfCriticals.map((event) => event.payload)).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_arm',
      componentType: 'actuator',
      componentName: ActuatorType.UPPER_ARM,
      destroyed: true,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_arm',
      componentType: 'actuator',
      componentName: ActuatorType.LOWER_ARM,
      destroyed: true,
    }),
  ]);
  expect(
    result.units['player-1'].componentDamage?.actuatorsByLocation?.right_arm?.[
      ActuatorType.UPPER_ARM
    ],
  ).toBe(true);
  expect(
    result.units['player-1'].componentDamage?.actuatorsByLocation?.left_arm?.[
      ActuatorType.LOWER_ARM
    ],
  ).toBe(true);
  expect(manifestsByUnit.get('player-1')?.right_arm?.[0].destroyed).toBe(true);
  expect(manifestsByUnit.get('player-1')?.left_arm?.[0].destroyed).toBe(true);
});

it('emits represented Zweihander self-critical events alongside the miss PSR', () => {
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    [
      'player-1',
      buildCriticalSlotManifest({
        right_arm: [
          {
            slotIndex: 0,
            componentType: 'actuator',
            componentName: ActuatorType.SHOULDER,
            destroyed: false,
            actuatorType: ActuatorType.SHOULDER,
          },
        ],
        left_arm: [
          {
            slotIndex: 0,
            componentType: 'actuator',
            componentName: ActuatorType.HAND,
            destroyed: false,
            actuatorType: ActuatorType.HAND,
          },
        ],
      }),
    ],
  ]);

  const { events, result } = runPhase('punch', {
    attacker: {
      abilities: ['zweihander'],
    },
    twoHandedZweihander: true,
    manifestsByUnit,
    random: scriptedD6Random([1, 1, 1, 1]),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'punch',
    hit: false,
    damage: 0,
  });
  expect(
    events.filter(
      (event) =>
        event.type === GameEventType.CriticalHitResolved &&
        (event.payload as ICriticalHitResolvedPayload).unitId === 'player-1',
    ),
  ).toHaveLength(2);
  expect(result.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({
      reason: 'punch missed',
      triggerSource: 'punch_miss',
    }),
  );
});

it('rejects invalid runner two-handed Zweihander declarations before damage or miss PSR', () => {
  const { events, result } = runPhase('punch', {
    attacker: {
      abilities: ['zweihander'],
      destroyedLocations: ['left_arm'],
    },
    twoHandedZweihander: true,
  });

  const declared = events.find(
    (event) => event.type === GameEventType.PhysicalAttackDeclared,
  )?.payload as IPhysicalAttackDeclaredPayload;
  expect(declared).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'punch',
    twoHandedZweihander: true,
    toHitNumber: Infinity,
  });
  expect(resolvedPayload(events)).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'punch',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'LimbMissing',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].damageThisPhase).toBe(0);
});

it('does not consume Zweihander in runner punch damage without explicit declaration state', () => {
  const { events } = runPhase('punch', {
    attacker: {
      abilities: ['zweihander'],
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'punch',
    hit: true,
    damage: 7,
  });
});

it('emits physical-phase claw equipment criticals and removes the hit claw modifier', () => {
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    [
      'opponent-1',
      buildCriticalSlotManifest({
        right_arm: [
          {
            slotIndex: 0,
            componentType: 'equipment',
            componentName: 'Claw',
            destroyed: false,
          },
        ],
      }),
    ],
  ]);
  const { events, result } = runPhase('punch', {
    target: {
      armor: {
        ...createState().units['opponent-1'].armor,
        right_arm: 0,
      },
      rightArmHasClaw: true,
    },
    manifestsByUnit,
    // to-hit 6+6, punch location 5 = RA, crit trigger 4+4,
    // slot selection 1 = the Claw equipment slot.
    random: scriptedD6Random([6, 6, 5, 4, 4, 1]),
  });

  const critical = events.find(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
  );

  expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
  expect(critical?.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_arm',
    componentType: 'equipment',
    componentName: 'Claw',
    destroyed: true,
  });
  expect(result.units['opponent-1'].rightArmHasClaw).toBe(false);
});
