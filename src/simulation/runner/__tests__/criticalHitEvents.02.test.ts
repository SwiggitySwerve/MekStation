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
  buildPrimedRunnerScenario,
  createCritProbeWeapon,
  runPhase,
  scriptedRoller,
} from './criticalHitEvents.test-helpers';

it('Artificial Pain Shunt suppresses VDNI neural feedback pilot damage', () => {
  const roller = scriptedRoller([3, 4]);
  const state: IUnitDamageState = {
    ...buildPrimedDamageState({ location: 'center_torso' }),
    pilotAbilities: ['vdni', 'artificial_pain_shunt'],
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

it('emits PilotHit for VDNI neural feedback after internal structure damage', () => {
  const scenario = buildPrimedRunnerScenario();
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        abilities: ['vdni'],
      },
    },
  };
  const events: IGameEvent[] = [];

  const next = resolveWeaponHit({
    currentState: state,
    events,
    gameId: state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'neural-feedback-probe',
    weapon: createCritProbeWeapon('neural-feedback-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // Hit location 3+3 = right_torso, crit trigger 3+4 misses,
    // VDNI feedback 4+4 wounds, consciousness 6+6 passes.
    d6Roller: scriptedRoller([3, 3, 3, 4, 4, 4, 6, 6]),
    getOrSeedManifest: () => buildDefaultCriticalSlotManifest(),
    manifestsByUnit: scenario.manifestsByUnit,
    weaponsByUnit: scenario.weaponsByUnit,
  });

  const pilotHit = events.find(
    (event) => event.type === GameEventType.PilotHit,
  ) as IGameEvent & { payload: IPilotHitPayload };
  expect(pilotHit.payload).toMatchObject({
    unitId: 'opponent-1',
    wounds: 1,
    totalWounds: 1,
    source: 'neural_feedback',
    consciousnessCheckRequired: true,
    consciousnessCheckPassed: true,
  });
  expect(next.units['opponent-1'].pilotWounds).toBe(1);
  expect(next.units['opponent-1'].pilotConscious).toBe(true);
});

it('emits CriticalHit before CriticalHitResolved when a hit lands on structure', () => {
  const scenario = buildPrimedRunnerScenario();
  // Try several seeds — at least one must produce a hit (the AC/20
  // at gunnery 4, range 1 has TN ~4 → ~91% hit rate).
  let foundCrit = false;
  let events: IGameEvent[] = [];
  // Seed sweep — empirically chosen so at least one seed produces
  // a critical hit on the stripped-armor target. The runner uses
  // a single shared `SeededRandom` for to-hit + hit-location +
  // crit-trigger + slot-selection, so the trigger probability is
  // determined by all four streams together. 22, 77, 200 are
  // known-good crit seeds from the probe suite.
  for (const seed of [22, 77, 200, 1, 7, 42, 99, 1337]) {
    events = runPhase({ ...scenario, seed });
    if (events.some((e) => e.type === GameEventType.CriticalHit)) {
      foundCrit = true;
      break;
    }
    // Reset manifests + state for the next seed.
    scenario.manifestsByUnit.clear();
  }
  expect(foundCrit).toBe(true);

  // Causal ordering: every CriticalHit MUST be followed by a
  // CriticalHitResolved with matching location.
  const indices = {
    crit: events.findIndex((e) => e.type === GameEventType.CriticalHit),
    resolved: events.findIndex(
      (e) => e.type === GameEventType.CriticalHitResolved,
    ),
    damageApplied: events.findIndex(
      (e) => e.type === GameEventType.DamageApplied,
    ),
  };
  expect(indices.crit).toBeGreaterThan(indices.damageApplied);
  expect(indices.resolved).toBeGreaterThan(indices.crit);
});

it('CriticalHit payload carries unitId, location, count=1, sourceUnitId, component', () => {
  const scenario = buildPrimedRunnerScenario();
  let events: IGameEvent[] = [];
  // Seed sweep — empirically chosen so at least one seed produces
  // a critical hit on the stripped-armor target. The runner uses
  // a single shared `SeededRandom` for to-hit + hit-location +
  // crit-trigger + slot-selection, so the trigger probability is
  // determined by all four streams together. 22, 77, 200 are
  // known-good crit seeds from the probe suite.
  for (const seed of [22, 77, 200, 1, 7, 42, 99, 1337]) {
    events = runPhase({ ...scenario, seed });
    if (events.some((e) => e.type === GameEventType.CriticalHit)) break;
    scenario.manifestsByUnit.clear();
  }

  const critEvent = events.find((e) => e.type === GameEventType.CriticalHit);
  expect(critEvent).toBeDefined();
  const payload = critEvent!.payload as ICriticalHitPayload;
  expect(payload.unitId).toBe('opponent-1');
  expect(payload.sourceUnitId).toBe('player-1');
  expect(payload.count).toBe(1);
  expect(typeof payload.location).toBe('string');
  expect(typeof payload.component).toBe('string');
});

it('ComponentDestroyed follows CriticalHitResolved when slot is fully destroyed', () => {
  const scenario = buildPrimedRunnerScenario();
  let events: IGameEvent[] = [];
  // Seed sweep — empirically chosen so at least one seed produces
  // a critical hit on the stripped-armor target. The runner uses
  // a single shared `SeededRandom` for to-hit + hit-location +
  // crit-trigger + slot-selection, so the trigger probability is
  // determined by all four streams together. 22, 77, 200 are
  // known-good crit seeds from the probe suite.
  for (const seed of [22, 77, 200, 1, 7, 42, 99, 1337]) {
    events = runPhase({ ...scenario, seed });
    if (events.some((e) => e.type === GameEventType.ComponentDestroyed)) {
      break;
    }
    scenario.manifestsByUnit.clear();
  }

  const resolvedIdx = events.findIndex(
    (e) => e.type === GameEventType.CriticalHitResolved,
  );
  const destroyedIdx = events.findIndex(
    (e) => e.type === GameEventType.ComponentDestroyed,
  );
  expect(destroyedIdx).toBeGreaterThan(resolvedIdx);
  expect(destroyedIdx).toBeGreaterThanOrEqual(0);

  // Payload field assertions per `IComponentDestroyedPayload`.
  const destroyedPayload = events[destroyedIdx]
    .payload as IComponentDestroyedPayload;
  expect(destroyedPayload.unitId).toBe('opponent-1');
  expect(typeof destroyedPayload.componentType).toBe('string');
  expect(typeof destroyedPayload.slotIndex).toBe('number');
  expect(destroyedPayload.slotIndex).toBeGreaterThanOrEqual(0);
});

it('CriticalHitResolved payload mirrors the resolver shape', () => {
  const scenario = buildPrimedRunnerScenario();
  let events: IGameEvent[] = [];
  // Seed sweep — empirically chosen so at least one seed produces
  // a critical hit on the stripped-armor target. The runner uses
  // a single shared `SeededRandom` for to-hit + hit-location +
  // crit-trigger + slot-selection, so the trigger probability is
  // determined by all four streams together. 22, 77, 200 are
  // known-good crit seeds from the probe suite.
  for (const seed of [22, 77, 200, 1, 7, 42, 99, 1337]) {
    events = runPhase({ ...scenario, seed });
    if (events.some((e) => e.type === GameEventType.CriticalHitResolved)) {
      break;
    }
    scenario.manifestsByUnit.clear();
  }
  const resolvedEvent = events.find(
    (e) => e.type === GameEventType.CriticalHitResolved,
  );
  expect(resolvedEvent).toBeDefined();
  const p = resolvedEvent!.payload as ICriticalHitResolvedPayload;
  expect(p.unitId).toBe('opponent-1');
  expect(typeof p.location).toBe('string');
  expect(typeof p.slotIndex).toBe('number');
  expect(typeof p.componentType).toBe('string');
  expect(typeof p.componentName).toBe('string');
  expect(typeof p.effect).toBe('string');
  expect(p.destroyed).toBe(true);
});
