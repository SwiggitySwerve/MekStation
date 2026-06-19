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

it('emits source-missing claw lifecycle events and removes the represented claw modifier', () => {
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
            missing: true,
          },
        ],
      }),
    ],
  ]);
  const { events, result } = runPhase('punch', {
    target: {
      rightArmHasClaw: true,
    },
    manifestsByUnit,
    random: scriptedD6Random([6, 6, 5]),
  });

  const critical = events.find(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
  );
  const componentDestroyed = events.find(
    (event) =>
      event.type === GameEventType.ComponentDestroyed &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
  );

  expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
  expect(critical?.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_arm',
    componentType: 'equipment',
    componentName: 'Claw',
    destroyed: false,
    missing: true,
  });
  expect(componentDestroyed).toBeUndefined();
  expect(result.units['opponent-1'].rightArmHasClaw).toBe(false);
  expect(manifestsByUnit.get('opponent-1')?.right_arm?.[0]).toMatchObject({
    destroyed: false,
    missing: true,
  });
});

it('emits source-breached claw lifecycle events and removes the represented claw modifier', () => {
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
            breached: true,
          },
        ],
      }),
    ],
  ]);
  const { events, result } = runPhase('punch', {
    target: {
      rightArmHasClaw: true,
    },
    manifestsByUnit,
    random: scriptedD6Random([6, 6, 5]),
  });

  const critical = events.find(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
  );
  const componentDestroyed = events.find(
    (event) =>
      event.type === GameEventType.ComponentDestroyed &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Claw',
  );

  expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
  expect(critical?.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_arm',
    componentType: 'equipment',
    componentName: 'Claw',
    destroyed: false,
    breached: true,
  });
  expect(componentDestroyed).toBeUndefined();
  expect(result.units['opponent-1'].rightArmHasClaw).toBe(false);
  expect(manifestsByUnit.get('opponent-1')?.right_arm?.[0]).toMatchObject({
    destroyed: false,
    breached: true,
  });
});

it('emits physical-phase talon equipment criticals and removes the hit talon modifier', () => {
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    [
      'opponent-1',
      buildCriticalSlotManifest({
        right_leg: [
          {
            slotIndex: 0,
            componentType: 'equipment',
            componentName: 'Talons',
            destroyed: false,
          },
        ],
      }),
    ],
  ]);
  const { events, result } = runPhase('kick', {
    target: {
      armor: {
        ...createState().units['opponent-1'].armor,
        right_leg: 0,
      },
      rightLegHasTalons: true,
    },
    manifestsByUnit,
    // to-hit 6+6, kick location 1 = RL, crit trigger 4+4,
    // slot selection 1 = the Talons equipment slot.
    random: scriptedD6Random([6, 6, 1, 4, 4, 1]),
  });

  const critical = events.find(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Talons',
  );

  expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
  expect(critical?.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_leg',
    componentType: 'equipment',
    componentName: 'Talons',
    destroyed: true,
  });
  expect(result.units['opponent-1'].rightLegHasTalons).toBe(false);
});

it('emits source-missing talon lifecycle events and removes the represented talon modifier', () => {
  const manifestsByUnit = new Map<string, CriticalSlotManifest>([
    [
      'opponent-1',
      buildCriticalSlotManifest({
        right_leg: [
          {
            slotIndex: 0,
            componentType: 'equipment',
            componentName: 'Talons',
            destroyed: false,
            missing: true,
          },
        ],
      }),
    ],
  ]);
  const { events, result } = runPhase('kick', {
    target: {
      rightLegHasTalons: true,
    },
    manifestsByUnit,
    random: scriptedD6Random([6, 6, 1]),
  });

  const critical = events.find(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Talons',
  );
  const componentDestroyed = events.find(
    (event) =>
      event.type === GameEventType.ComponentDestroyed &&
      (event.payload as ICriticalHitResolvedPayload).componentName === 'Talons',
  );

  expect(critical?.phase).toBe(GamePhase.PhysicalAttack);
  expect(critical?.payload).toMatchObject({
    unitId: 'opponent-1',
    location: 'right_leg',
    componentType: 'equipment',
    componentName: 'Talons',
    destroyed: false,
    missing: true,
  });
  expect(componentDestroyed).toBeUndefined();
  expect(result.units['opponent-1'].rightLegHasTalons).toBe(false);
  expect(manifestsByUnit.get('opponent-1')?.right_leg?.[0]).toMatchObject({
    destroyed: false,
    missing: true,
  });
});
