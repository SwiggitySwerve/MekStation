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

it('emits source-breached talon lifecycle events and removes the represented talon modifier', () => {
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
            breached: true,
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
    breached: true,
  });
  expect(componentDestroyed).toBeUndefined();
  expect(result.units['opponent-1'].rightLegHasTalons).toBe(false);
  expect(manifestsByUnit.get('opponent-1')?.right_leg?.[0]).toMatchObject({
    destroyed: false,
    breached: true,
  });
});

it('applies charge target clusters, attacker self-damage, and both PSRs', () => {
  const { events, result } = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'charge',
    roll: 8,
    toHitNumber: 7,
    hit: true,
    damage: 28,
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(6);
  expect(damageEventsFor(events, 'player-1').length).toBeGreaterThan(0);
  expectPendingPSR(result, 'opponent-1', PSRTrigger.Charged, {
    additionalModifier: 2,
  });
  expectPendingPSR(result, 'player-1', PSRTrigger.Charged, {
    additionalModifier: 2,
  });
});

it('applies source-backed charge displacement after a successful charge', () => {
  const { events, result } = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    grid: createPhysicalGrid(),
  });

  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 1, r: 1 },
      reason: 'charge',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'charge',
    },
  ]);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
});

it('splits represented domino-chain behavior from secondary fallout accounting', () => {
  const positionalChain =
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-positional-chain'
    ];
  const representedChain =
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-chain'];
  const secondaryFallout =
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-secondary-fallout'
    ];

  expect(positionalChain).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented push/charge/DFA/charge-miss target-displacement helpers',
    ),
  });
  expect(representedChain).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'source-backed recursive occupied-hex domino chain',
    ),
  });
  expect(secondaryFallout).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Broad domino secondary-fallout accounting is split',
    ),
  });
  expect(secondaryFallout.evidence).toContain(
    'voluntary blocker step-out branch are integrated sibling rows',
  );
  expect(secondaryFallout.gap).toBeUndefined();
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT[
      'shared.displacement-domino-terrain-building-environment-fallout'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented destination terrain/building PSR fallout',
    ),
  });
  expect(DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS).toEqual([]);
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('blockerStepOutDecision'),
    sourceRefs: [
      expect.objectContaining({
        citation: expect.stringContaining('CFR_DOMINO_EFFECT'),
        url: expect.stringContaining('L9190-L9280'),
      }),
    ],
  });
  expect(
    PHYSICAL_LEGALITY_GATE_SUPPORT['shared.displacement-domino-step-out-cfr']
      .gap,
  ).toBeUndefined();
});

it('cascades source-backed charge displacement through occupied destinations', () => {
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
    createDominoChargeGrid(),
  );

  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 1, r: 1 },
      reason: 'charge',
    },
    {
      unitId: 'domino-blocker',
      from: { q: 1, r: 1 },
      to: { q: 1, r: 2 },
      reason: 'domino',
    },
    {
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: { q: 1, r: 3 },
      reason: 'domino',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'charge',
    },
  ]);
  expect(result.units['domino-blocker'].position).toEqual({ q: 1, r: 2 });
  expect(result.units['domino-tail'].position).toEqual({ q: 1, r: 3 });
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  expectPendingPSR(result, 'domino-blocker', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
});
