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

it('applies represented domino step-out CFR decisions before forced fallback in runner physical displacement', () => {
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
        {
          facing: Facing.Northeast,
          movementThisTurn: MovementType.Walk,
          pilotConscious: false,
        },
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
    {
      blockerStepOutDecision: {
        blockerUnitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        response: 'move',
        psrPassed: true,
        context: {
          sideEntered: true,
          blockerJumped: false,
          legalStepOptions: [
            { kind: 'forward', to: { q: 2, r: 0 } },
            { kind: 'backward', to: { q: 0, r: 2 } },
          ],
        },
        path: [{ q: 2, r: 0 }],
      },
    },
  );

  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'domino-blocker',
      from: { q: 1, r: 1 },
      to: { q: 2, r: 0 },
      reason: 'domino_step_out',
    },
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
  expect(result.units['domino-blocker'].position).toEqual({ q: 2, r: 0 });
  expect(result.units['domino-tail'].position).toEqual({ q: 1, r: 2 });
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 1 });
  expect(result.units['player-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['domino-blocker'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
  );
  expect(result.units['domino-tail'].pendingPSRs).toEqual([]);
});

it('applies represented minefield fallout when domino displacement enters mined terrain', () => {
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
  const grid = createDominoChargeGrid();
  const minedHex = grid.hexes.get('1,3');
  const minedHexes = new Map(grid.hexes);
  if (minedHex) {
    minedHexes.set('1,3', { ...minedHex, terrain: TerrainType.Mines });
  }

  const { events, result } = runPhaseWithState(
    'charge',
    state,
    {
      ...grid,
      hexes: minedHexes,
    },
    {
      random: scriptedD6Random(Array.from({ length: 24 }, () => 6)),
    },
  );
  const dominoTailDamageEvents = events.filter(
    (event) =>
      event.type === GameEventType.DamageApplied &&
      (event.payload as IDamageAppliedPayload).unitId === 'domino-tail',
  );
  const minePsrEvent = events.find((event) => {
    const payload = event.payload as {
      unitId?: string;
      reasonCode?: PSRTrigger;
    };
    return (
      event.type === GameEventType.PSRTriggered &&
      payload.unitId === 'domino-tail' &&
      payload.reasonCode === PSRTrigger.PhaseDamage20Plus
    );
  });

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
  expect(result.units['domino-tail']).toMatchObject({
    position: { q: 1, r: 3 },
    damageThisPhase: 20,
    armor: {
      left_leg: 11,
      right_leg: 11,
    },
  });
  expect(dominoTailDamageEvents.map((event) => event.phase)).toEqual([
    GamePhase.PhysicalAttack,
    GamePhase.PhysicalAttack,
  ]);
  expect(dominoTailDamageEvents.map((event) => event.payload)).toEqual([
    expect.objectContaining({
      unitId: 'domino-tail',
      location: 'left_leg',
      damage: 10,
      armorRemaining: 11,
      structureRemaining: 14,
    }),
    expect.objectContaining({
      unitId: 'domino-tail',
      location: 'right_leg',
      damage: 10,
      armorRemaining: 11,
      structureRemaining: 14,
    }),
  ]);
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.PhaseDamage20Plus, {
    triggerSource: PSRTrigger.PhaseDamage20Plus,
  });
  expect(minePsrEvent?.phase).toBe(GamePhase.PhysicalAttack);
});
