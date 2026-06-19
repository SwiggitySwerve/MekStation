/**
 * Phase 3 of `add-combat-fidelity-suite` — per-event-type unit tests
 * for `runAttackPhase`'s critical-hit event chain plus direct
 * `resolveDamage` dispatch tests.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Critical Hit Trigger Return Value Captured"
 *       (Scenarios: roll 8 → 1 crit, roll 7 → 0 crits, roll 12 → 3 crits)
 *     - "Critical Hit Events Emitted by Runner"
 *       (Scenarios: gyro destruction event chain, engine-3-hit
 *       triggers UnitDestroyed)
 *
 * Determinism strategy:
 *   - Layer 1 (resolveDamage): a custom `D6Roller` closure returns a
 *     scripted sequence so the 2d6 trigger + slot-selection roll are
 *     fully predictable.
 *   - Layer 2 (runAttackPhase): a fixed `SeededRandom` seed picks the
 *     to-hit + hit-location rolls; the test asserts on the structural
 *     event chain (causal ordering, count parity) rather than which
 *     specific slot is destroyed.
 */

import type { ICriticalHitPayload } from '@/types/gameplay/GameSessionInterfaces';
import type {
  CriticalHitEvent,
  CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution/types';
import type {
  IResolveDamageResult,
  IUnitDamageState,
} from '@/utils/gameplay/damage';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoExplosionPayload,
  IAmmoSlotState,
  IComponentDestroyedPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IGameState,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import {
  buildCriticalSlotManifest,
  buildDefaultCriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { resolveDamage } from '@/utils/gameplay/damage';
import { applyEvent } from '@/utils/gameplay/gameState/gameStateReducer';

import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { runAttackPhase } from '../phases/weaponAttack';
import { applyCritAmmoExplosions } from '../phases/weaponAttackAmmoExplosions';
import { emitCritEvents } from '../phases/weaponAttackHelpers';
import { resolveWeaponHit } from '../phases/weaponAttackHitResolution';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { buildDamageState } from '../SimulationRunnerState';
// =============================================================================
// Scripted-roller helpers
// =============================================================================
/**
 * Build a `D6Roller` that returns a scripted sequence of d6 values.
 * After the scripted values are exhausted, the roller falls back to
 * the supplied `tail` value (default: 1) so cluster cascades that
 * out-roll the script don't crash.
 *
 * Example: `scriptedRoller([4, 4, 1])` returns 4, 4, 1, 1, 1, ...
 *   - first two calls: roll1=4, roll2=4 → 2d6 sum = 8 (crit triggers)
 *   - third call: slot-selection d6 = 1 → idx (1-1) % 7 = 0 (engine slot)
 */
import {
  buildPrimedRunnerScenario,
  createCritProbeWeapon,
  scriptedRoller,
} from './criticalHitEvents.test-helpers';

it('runner removes talon kick modifiers when a talons equipment critical resolves', () => {
  const scenario = buildPrimedRunnerScenario();
  const events: IGameEvent[] = [];
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        leftLegHasTalons: true,
        rightLegHasTalons: true,
      },
    },
  };
  const manifest = buildCriticalSlotManifest({
    right_leg: [
      {
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Talons',
        destroyed: false,
      },
    ],
  });

  const next = resolveWeaponHit({
    currentState: state,
    events,
    gameId: state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'talons-crit-probe',
    weapon: createCritProbeWeapon('talons-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // hit location 2+3 = right leg, crit trigger 4+4 = one crit,
    // slot-selection 1 = the talons equipment slot.
    d6Roller: scriptedRoller([2, 3, 4, 4, 1]),
    getOrSeedManifest: () => manifest,
  });

  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.CriticalHitResolved,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_leg',
        componentType: 'equipment',
        componentName: 'Talons',
        destroyed: true,
      }),
    }),
  );
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.ComponentDestroyed,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_leg',
        componentType: 'equipment',
        componentName: 'Talons',
      }),
    }),
  );
  expect(next.units['opponent-1'].leftLegHasTalons).toBe(true);
  expect(next.units['opponent-1'].rightLegHasTalons).toBe(false);

  const replayed = events.reduce(applyEvent, state);
  expect(replayed.units['opponent-1'].leftLegHasTalons).toBe(true);
  expect(replayed.units['opponent-1'].rightLegHasTalons).toBe(false);
  expect(replayed.units['opponent-1'].destroyedEquipment).toEqual(['Talons']);
});

it('runner reduces Partial Wing jump bonus when a partial-wing equipment critical resolves', () => {
  const scenario = buildPrimedRunnerScenario();
  const events: IGameEvent[] = [];
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        partialWingJumpBonus: 2,
      },
    },
  };
  const manifest = buildCriticalSlotManifest({
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Partial Wing',
        destroyed: false,
      },
    ],
  });

  const next = resolveWeaponHit({
    currentState: state,
    events,
    gameId: state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'partial-wing-crit-probe',
    weapon: createCritProbeWeapon('partial-wing-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // hit location 3+3 = right torso, crit trigger 4+4 = one crit,
    // slot-selection 1 = the Partial Wing equipment slot.
    d6Roller: scriptedRoller([3, 3, 4, 4, 1]),
    getOrSeedManifest: () => manifest,
  });

  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.CriticalHitResolved,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_torso',
        componentType: 'equipment',
        componentName: 'Partial Wing',
        destroyed: true,
      }),
    }),
  );
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.ComponentDestroyed,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_torso',
        componentType: 'equipment',
        componentName: 'Partial Wing',
      }),
    }),
  );
  expect(next.units['opponent-1'].partialWingJumpBonus).toBe(1);

  const replayed = events.reduce(applyEvent, state);
  expect(replayed.units['opponent-1'].partialWingJumpBonus).toBe(1);
  expect(replayed.units['opponent-1'].destroyedEquipment).toEqual([
    'Partial Wing',
  ]);
});

it('replay reduces Partial Wing jump bonus from generic equipment critical events', () => {
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        partialWingJumpBonus: 2,
      },
    },
  };
  const criticalEvents: CriticalHitEvent[] = [
    {
      type: 'critical_hit_resolved',
      payload: {
        unitId: 'opponent-1',
        location: 'right_torso',
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Partial Wing',
        effect: 'Equipment destroyed: Partial Wing',
        destroyed: true,
      },
    },
  ];
  const events: IGameEvent[] = [];

  emitCritEvents({
    events,
    gameId: state.gameId,
    turn: state.turn,
    attackerId: 'player-1',
    targetId: 'opponent-1',
    critEvents: criticalEvents,
    targetAlreadyDestroyed: false,
  });

  const replayed = events.reduce(applyEvent, state);

  expect(replayed.units['opponent-1'].partialWingJumpBonus).toBe(1);
  expect(replayed.units['opponent-1'].destroyedEquipment).toEqual([
    'Partial Wing',
  ]);
});
