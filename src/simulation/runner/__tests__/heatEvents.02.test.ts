/**
 * Phase 4 of `add-combat-fidelity-suite` — per-event-type unit tests
 * for `runHeatPhase`'s heat lifecycle event chain plus the ammo
 * consumption + explosion seam in `runAttackPhase`.
 *
 * Spec contract:
 *   openspec/changes/add-combat-fidelity-suite/specs/combat-resolution/spec.md
 *     - "Heat Lifecycle Events"
 *       (Scenarios: alpha-strike at heat 0 → shutdown event chain;
 *        Heat phase events fire even when heat is zero)
 *     - "Ammo Consumption and Explosion Events"
 *       (Scenarios: AC/20 cookoff from internal critical; with CASE
 *        explosion stays in source location)
 *   openspec/changes/add-combat-fidelity-suite/specs/ammo-explosion-system/spec.md
 *     - "Heat-Triggered Ammo Explosion"
 *       (Scenarios: heat 19 with seeded roller; heat 19 with safe roll)
 *
 * Determinism strategy:
 *   - `SeededRandom` controls the to-hit / hit-location / shutdown /
 *     ammo-explosion rolls used inside the runner phases.
 *   - Tests assert structural event-shape (count, ordering, payload
 *     shape) rather than exact-slot-destroyed predicates so they
 *     stay stable across seed sweeps.
 */

import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';
import type { IResolveDamageResult } from '@/utils/gameplay/damage';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IAmmoConsumedPayload,
  IAmmoExplosionPayload,
  IDamageAppliedPayload,
  IAmmoSlotState,
  IGameEvent,
  IGameState,
  IHeatEffectAppliedPayload,
  ILocationDestroyedPayload,
  IHeatPayload,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  ITransferDamagePayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { BotPlayer } from '../../ai/BotPlayer';
import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { applyHeatInducedAmmoExplosions } from '../phases/heatAmmoExplosions';
import { runHeatPhase } from '../phases/postCombat';
import { runAttackPhase } from '../phases/weaponAttack';
import { applyCritAmmoExplosions } from '../phases/weaponAttackAmmoExplosions';
import {
  DEFAULT_COMPONENT_DAMAGE,
  EVADE_HEAT_BONUS,
  RUN_HEAT,
  SPRINT_HEAT,
} from '../SimulationRunnerConstants';
import { buildDamageState } from '../SimulationRunnerState';
import {
  createAtlasWeapons,
  createScriptedHeatRandom,
  createUnit,
  makeMinimalState,
} from './heatEvents.test-helpers';

describe('runHeatPhase (Phase 4 — Heat Lifecycle Events)', () => {
  it('emits ShutdownCheck { automatic: false } at heat 14-29 (avoidable)', () => {
    // Start at 30 so after 10 dissipation newHeat = 20 (avoidable
    // shutdown band).
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 30,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const shutdownCheck = events.find(
      (e) => e.type === GameEventType.ShutdownCheck,
    );
    expect(shutdownCheck).toBeDefined();
    const payload = shutdownCheck!.payload as IShutdownCheckPayload;
    expect(payload.automatic).toBe(false);
    expect(payload.targetNumber).toBeGreaterThan(0);
    expect(payload.targetNumber).toBeLessThan(Infinity);
  });

  it('does NOT emit ShutdownCheck below heat 14', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 13,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    expect(
      events.find((e) => e.type === GameEventType.ShutdownCheck),
    ).toBeUndefined();
  });

  it('persists shutdown state on the unit after auto-shutdown fires', () => {
    // Start at 40 so newHeat = 30 after dissipation → auto-shutdown.
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 40,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
    });

    expect(newState.units['player-1'].shutdown).toBe(true);
  });

  it('emits StartupAttempt and clears shutdown after cooling below the shutdown band', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 12,
        shutdown: true,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
    });

    const startupAttempt = events.find(
      (e) => e.type === GameEventType.StartupAttempt,
    );
    expect(startupAttempt).toBeDefined();
    expect(startupAttempt!.payload as IStartupAttemptPayload).toMatchObject({
      unitId: 'player-1',
      targetNumber: 0,
      roll: 0,
      success: true,
    });
    expect(
      events.find((e) => e.type === GameEventType.ShutdownCheck),
    ).toBeUndefined();
    expect(newState.units['player-1'].shutdown).toBe(false);
  });

  it('uses seeded 2d6 startup rolls while the shutdown unit remains in the shutdown band', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 20,
        heatSinks: 0,
        shutdown: true,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(2);

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
    });

    const startupAttempt = events.find(
      (e) => e.type === GameEventType.StartupAttempt,
    );
    expect(startupAttempt).toBeDefined();
    expect(startupAttempt!.payload as IStartupAttemptPayload).toMatchObject({
      unitId: 'player-1',
      targetNumber: 6,
      roll: 7,
      success: true,
      rolls: [5, 2],
    });
    expect(newState.units['player-1'].shutdown).toBe(false);
  });

  it('wakes an unconscious Pain Resistance pilot on the heat-phase recovery roll', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        pilotWounds: 2,
        pilotConscious: false,
        abilities: ['pain-resistance'],
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: createScriptedHeatRandom([2, 2]),
    });

    expect(newState.units['player-1'].pilotConscious).toBe(true);
  });

  it('keeps non-Pain-Resistance pilots unconscious on the same wake-up roll', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        pilotWounds: 2,
        pilotConscious: false,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: createScriptedHeatRandom([2, 2]),
    });

    expect(newState.units['player-1'].pilotConscious).toBe(false);
  });

  it('emits HeatInduced AmmoExplosion with weapon-scaled damage at heat 30+', () => {
    // Heat 30+ auto-explodes loaded explosive ammo bins. Start at 40
    // so newHeat = 30 after dissipation.
    const ammoState: Record<string, IAmmoSlotState> = {
      'ac-20-bin-0': {
        binId: 'ac-20-bin-0',
        weaponType: 'ac-20',
        location: 'right_torso',
        remainingRounds: 5,
        maxRounds: 5,
        isExplosive: true,
      },
    };
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 40,
        ammoState,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
      weaponsByUnit: new Map([['player-1', createAtlasWeapons()]]),
    });

    const ammoExplosion = events.find(
      (e) => e.type === GameEventType.AmmoExplosion,
    );
    expect(ammoExplosion).toBeDefined();
    const payload = ammoExplosion!.payload as IAmmoExplosionPayload;
    expect(payload.unitId).toBe('player-1');
    expect(payload.source).toBe('HeatInduced');
    expect(payload.location).toBe('right_torso');
    expect(payload.binId).toBe('ac-20-bin-0');
    expect(payload.roundsDestroyed).toBe(5);
    expect(payload.damage).toBe(100);
    const pilotHit = events.find(
      (e) =>
        e.type === GameEventType.PilotHit &&
        (e.payload as IPilotHitPayload).source === 'ammo_explosion',
    );
    expect(pilotHit?.payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      totalWounds: 2,
      source: 'ammo_explosion',
    });
    expect(
      newState.units['player-1'].ammoState?.['ac-20-bin-0'].remainingRounds,
    ).toBe(0);
    expect(newState.units['player-1'].pilotWounds).toBe(2);
  });
});
