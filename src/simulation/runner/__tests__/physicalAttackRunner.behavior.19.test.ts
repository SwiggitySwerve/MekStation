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

it('destroys the DFA attacker when miss displacement is impossible', () => {
  const { events, result } = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      piloting: 12,
    },
    target: {
      piloting: 12,
    },
    grid: createPhysicalGrid({ blockDfaDisplacement: true }),
  });
  const destroyed = events.find(
    (event) =>
      event.type === GameEventType.UnitDestroyed &&
      (event.payload as IUnitDestroyedPayload).unitId === 'player-1',
  );
  const psrEvents = events.filter(
    (event) => event.type === GameEventType.PSRTriggered,
  );
  const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'dfa',
    hit: false,
    roll: 8,
    toHitNumber: 12,
  });
  expect(resolvedPayload(events).displacements).toBeUndefined();
  expect(payload).toMatchObject({
    unitId: 'player-1',
    cause: 'impossible_displacement',
  });
  expect(payload?.killerUnitId).toBeUndefined();
  expect(psrEvents).toHaveLength(0);
  expect(result.units['player-1'].destroyed).toBe(true);
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});
