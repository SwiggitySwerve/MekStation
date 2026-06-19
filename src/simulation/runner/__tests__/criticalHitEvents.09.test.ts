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

it('runner queues a pending LegDamage PSR when leg structure takes damage', () => {
  const scenario = buildPrimedRunnerScenario();
  const events: IGameEvent[] = [];

  const next = resolveWeaponHit({
    currentState: scenario.state,
    events,
    gameId: scenario.state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'leg-probe',
    weapon: createCritProbeWeapon('leg-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // hit location 4+5 = left leg, crit trigger 1+1 = no crit.
    d6Roller: scriptedRoller([4, 5, 1, 1]),
    getOrSeedManifest: () => buildDefaultCriticalSlotManifest(),
  });

  const psrEvent = events.find(
    (event) =>
      event.type === GameEventType.PSRTriggered &&
      (event.payload as IPSRTriggeredPayload).reasonCode ===
        PSRTrigger.LegDamage,
  );
  expect(psrEvent?.payload).toMatchObject({
    unitId: 'opponent-1',
    reason: 'Leg damage (internal structure exposed)',
    triggerSource: PSRTrigger.LegDamage,
    reasonCode: PSRTrigger.LegDamage,
  });
  expect(next.units['opponent-1'].pendingPSRs).toEqual([
    expect.objectContaining({
      reasonCode: PSRTrigger.LegDamage,
      triggerSource: PSRTrigger.LegDamage,
    }),
  ]);
});

it('runner queues a pending EngineHit PSR when an engine crit resolves', () => {
  const scenario = buildPrimedRunnerScenario();
  const events: IGameEvent[] = [];
  const getOrSeedManifest = (unitId: string): CriticalSlotManifest => {
    const existing = scenario.manifestsByUnit.get(unitId);
    if (existing) return existing;
    const seeded = buildDefaultCriticalSlotManifest();
    scenario.manifestsByUnit.set(unitId, seeded);
    return seeded;
  };

  const next = resolveWeaponHit({
    currentState: scenario.state,
    events,
    gameId: scenario.state.gameId,
    unitId: 'player-1',
    targetId: 'opponent-1',
    weaponId: 'engine-probe',
    weapon: createCritProbeWeapon(),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // hit location 3+4 = CT, crit trigger 4+4 = one crit,
    // slot-selection 1 = first CT slot (engine).
    d6Roller: scriptedRoller([3, 4, 4, 4, 1]),
    getOrSeedManifest,
    manifestsByUnit: scenario.manifestsByUnit,
  });

  const engineResolved = events.find(
    (event) =>
      event.type === GameEventType.CriticalHitResolved &&
      (event.payload as ICriticalHitResolvedPayload).componentType === 'engine',
  );
  expect(engineResolved).toBeDefined();

  const psrEvent = events.find(
    (event) =>
      event.type === GameEventType.PSRTriggered &&
      (event.payload as IPSRTriggeredPayload).reasonCode ===
        PSRTrigger.EngineHit,
  );
  expect(psrEvent?.payload).toMatchObject({
    unitId: 'opponent-1',
    reason: 'Engine hit',
    triggerSource: PSRTrigger.EngineHit,
    reasonCode: PSRTrigger.EngineHit,
  });
  expect(next.units['opponent-1'].pendingPSRs).toEqual([
    expect.objectContaining({
      reasonCode: PSRTrigger.EngineHit,
      triggerSource: PSRTrigger.EngineHit,
    }),
  ]);
});

it('runner removes claw punch modifiers when a claw equipment critical resolves', () => {
  const scenario = buildPrimedRunnerScenario();
  const events: IGameEvent[] = [];
  const target = scenario.state.units['opponent-1'];
  const state: IGameState = {
    ...scenario.state,
    units: {
      ...scenario.state.units,
      'opponent-1': {
        ...target,
        leftArmHasClaw: true,
        rightArmHasClaw: true,
      },
    },
  };
  const manifest = buildCriticalSlotManifest({
    right_arm: [
      {
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Claw',
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
    weaponId: 'claw-crit-probe',
    weapon: createCritProbeWeapon('claw-crit-probe'),
    attackRoll: 12,
    toHitNumber: 2,
    firingArc: 'front',
    partialCover: false,
    // hit location 1+2 = right arm, crit trigger 4+4 = one crit,
    // slot-selection 1 = the claw equipment slot.
    d6Roller: scriptedRoller([1, 2, 4, 4, 1]),
    getOrSeedManifest: () => manifest,
  });

  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.CriticalHitResolved,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_arm',
        componentType: 'equipment',
        componentName: 'Claw',
        destroyed: true,
      }),
    }),
  );
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.ComponentDestroyed,
      payload: expect.objectContaining({
        unitId: 'opponent-1',
        location: 'right_arm',
        componentType: 'equipment',
        componentName: 'Claw',
      }),
    }),
  );
  expect(next.units['opponent-1'].leftArmHasClaw).toBe(true);
  expect(next.units['opponent-1'].rightArmHasClaw).toBe(false);

  const replayed = events.reduce(applyEvent, state);
  expect(replayed.units['opponent-1'].leftArmHasClaw).toBe(true);
  expect(replayed.units['opponent-1'].rightArmHasClaw).toBe(false);
  expect(replayed.units['opponent-1'].destroyedEquipment).toEqual(['Claw']);
});
