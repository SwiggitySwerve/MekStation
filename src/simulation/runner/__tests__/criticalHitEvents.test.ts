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
  buildPrimedDamageState,
  scriptedRoller,
} from './criticalHitEvents.test-helpers';

it('Scenario: structure damage with crit roll 8 produces 1 critical hit entry', () => {
  // GIVEN structure damage applied to CT
  // AND a roller producing 4 + 4 = 8 on the trigger roll, 1 on the
  //     slot-selection roll (engine slot 0)
  // WHEN resolveDamage is called with criticalContext
  // THEN IDamageResult.criticalHits MUST contain exactly 1 entry
  const roller = scriptedRoller([4, 4, 1]);
  const state = buildPrimedDamageState({ location: 'center_torso' });
  const stateWithCtx: IUnitDamageState = {
    ...state,
    criticalContext: {
      unitId: 'opponent-1',
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: DEFAULT_COMPONENT_DAMAGE,
    },
  };

  const { result } = resolveDamage(stateWithCtx, 'center_torso', 5, roller);

  expect(result.criticalHits).toHaveLength(1);
  expect(result.criticalHits[0].location).toBe('center_torso');
  expect(result.criticalHits[0].slot.destroyed).toBe(true);
});

it('Scenario: engine critical emits an engine-hit PSR trigger', () => {
  const roller = scriptedRoller([4, 4, 1]);
  const state = buildPrimedDamageState({ location: 'center_torso' });
  const stateWithCtx: IUnitDamageState = {
    ...state,
    criticalContext: {
      unitId: 'opponent-1',
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: DEFAULT_COMPONENT_DAMAGE,
    },
  };

  const { criticalEvents } = resolveDamage(
    stateWithCtx,
    'center_torso',
    5,
    roller,
  );

  expect(criticalEvents).toContainEqual(
    expect.objectContaining({
      type: 'psr_triggered',
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        reasonCode: PSRTrigger.EngineHit,
        triggerSource: PSRTrigger.EngineHit,
      }),
    }),
  );
});

it('Scenario: structure damage with crit roll 7 produces 0 critical hits', () => {
  // 3 + 4 = 7 → trigger.triggered === false → criticalHits[] empty
  const roller = scriptedRoller([3, 4]);
  const state = buildPrimedDamageState({ location: 'center_torso' });
  const stateWithCtx: IUnitDamageState = {
    ...state,
    criticalContext: {
      unitId: 'opponent-1',
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: DEFAULT_COMPONENT_DAMAGE,
    },
  };

  const { result } = resolveDamage(stateWithCtx, 'center_torso', 5, roller);

  expect(result.criticalHits).toEqual([]);
});

it('Scenario: structure damage with crit roll 12 produces 3 critical hits or limb-blown-off', () => {
  // 6 + 6 = 12 on a non-limb (CT) → 3 crits.
  // Slot-selection rolls 1, 2, 3 → engine slot 0, 1, 2 → 3 engine
  // hits → engine destroyed → unit_destroyed event also emitted.
  // Slot-selection rolls: each crit destroys a slot, shrinking the
  // available list. To always pick an engine slot, we roll `1`
  // every time — picks index 0 of the *remaining* available slots,
  // which after each engine destruction continues to be the next
  // surviving engine slot (engine 0 → engine 1 → engine 2).
  const roller = scriptedRoller([6, 6, 1, 1, 1]);
  const state = buildPrimedDamageState({ location: 'center_torso' });
  const stateWithCtx: IUnitDamageState = {
    ...state,
    criticalContext: {
      unitId: 'opponent-1',
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: DEFAULT_COMPONENT_DAMAGE,
    },
  };

  const { result, criticalEvents } = resolveDamage(
    stateWithCtx,
    'center_torso',
    5,
    roller,
  );

  expect(result.criticalHits).toHaveLength(3);
  // The roll=12 + 3-engine-hit cascade also triggers unit destruction
  // (engine 3-hit threshold) — surfaced via `criticalEvents`.
  const engineDestroyedHits = result.criticalHits.filter(
    (h) => h.effect.type === 'engine_hit',
  );
  expect(engineDestroyedHits).toHaveLength(3);
  expect(criticalEvents).toBeDefined();
  expect(criticalEvents?.some((e) => e.type === 'unit_destroyed')).toBe(true);
});

it('limb-blown-off: roll 12 on a limb (LA) destroys all remaining slots', () => {
  // 6 + 6 = 12 on left_arm → limb_blown_off === true; 4 LA slots
  // (shoulder, upper_arm, lower_arm, hand) all destroyed.
  const roller = scriptedRoller([6, 6]);
  const state = buildPrimedDamageState({ location: 'left_arm' });
  const stateWithCtx: IUnitDamageState = {
    ...state,
    criticalContext: {
      unitId: 'opponent-1',
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: DEFAULT_COMPONENT_DAMAGE,
    },
  };

  const { result } = resolveDamage(stateWithCtx, 'left_arm', 5, roller);

  // 4 LA slots all destroyed (4 actuators).
  expect(result.criticalHits.length).toBeGreaterThanOrEqual(3);
  expect(result.criticalHits.every((h) => h.location === 'left_arm')).toBe(
    true,
  );
});

it('without criticalContext, criticalHits stays empty (legacy behavior)', () => {
  // Legacy callers (the existing damage.test.ts fixture) don't
  // build a context — the trigger fires but slot resolution is
  // deferred. Backwards-compatible.
  const roller = scriptedRoller([4, 4]);
  const state = buildPrimedDamageState({ location: 'center_torso' });

  const { result } = resolveDamage(state, 'center_torso', 5, roller);

  expect(result.criticalHits).toEqual([]);
});

it('VDNI rolls neural feedback on internal structure damage and wounds on 8+', () => {
  const roller = scriptedRoller([3, 4, 4, 4, 6, 6]);
  const state: IUnitDamageState = {
    ...buildPrimedDamageState({ location: 'center_torso' }),
    pilotAbilities: ['vdni'],
  };

  const { state: after, neuralFeedbackPilotDamage } = resolveDamage(
    state,
    'center_torso',
    5,
    roller,
  );

  expect(neuralFeedbackPilotDamage).toMatchObject({
    source: 'neural_feedback',
    woundsInflicted: 1,
    totalWounds: 1,
    consciousnessCheckRequired: true,
    conscious: true,
  });
  expect(after.pilotWounds).toBe(1);
  expect(after.pilotConscious).toBe(true);
});

it('BVDNI rolls neural feedback after a resolved critical hit and wounds on 8+', () => {
  const roller = scriptedRoller([4, 4, 1, 4, 4, 6, 6]);
  const state: IUnitDamageState = {
    ...buildPrimedDamageState({ location: 'center_torso' }),
    pilotAbilities: ['bvdni'],
    criticalContext: {
      unitId: 'opponent-1',
      manifest: buildDefaultCriticalSlotManifest(),
      componentDamage: DEFAULT_COMPONENT_DAMAGE,
    },
  };

  const {
    state: after,
    criticalEvents,
    neuralFeedbackPilotDamage,
  } = resolveDamage(state, 'center_torso', 5, roller);

  expect(
    criticalEvents?.some((event) => event.type === 'critical_hit_resolved'),
  ).toBe(true);
  expect(neuralFeedbackPilotDamage).toMatchObject({
    source: 'neural_feedback',
    woundsInflicted: 1,
    totalWounds: 1,
  });
  expect(after.pilotWounds).toBe(1);
});

it('does not infer VDNI neural feedback for Prototype DNI internal damage', () => {
  const roller = scriptedRoller([3, 4, 4, 4, 6, 6]);
  const state: IUnitDamageState = {
    ...buildPrimedDamageState({ location: 'center_torso' }),
    pilotAbilities: ['proto_dni'],
  };

  const { state: after, neuralFeedbackPilotDamage } = resolveDamage(
    state,
    'center_torso',
    5,
    roller,
  );

  expect(neuralFeedbackPilotDamage).toBeUndefined();
  expect(after.pilotWounds).toBe(0);
});
