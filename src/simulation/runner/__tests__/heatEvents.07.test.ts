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
  it('destroys the unit when heat pilot damage reaches lethal wounds', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 15,
        heatSinks: 0,
        pilotWounds: 5,
        componentDamage: { ...DEFAULT_COMPONENT_DAMAGE, lifeSupport: 1 },
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

    const unitDestroyed = events.find(
      (e) => e.type === GameEventType.UnitDestroyed,
    );
    expect(unitDestroyed?.payload).toMatchObject({
      unitId: 'player-1',
      cause: 'pilot_death',
    });
    expect(newState.units['player-1']).toMatchObject({
      pilotWounds: 6,
      pilotConscious: false,
      destroyed: true,
    });
  });

  it('reduces heat dissipation when heat sinks are destroyed', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 10,
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          heatSinksDestroyed: 3,
        },
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

    const heatDis = events.find((e) => e.type === GameEventType.HeatDissipated)!
      .payload as IHeatPayload;
    expect(heatDis.amount).toBe(-7);
    expect(heatDis.newTotal).toBe(3);
    expect(heatDis.breakdown).toMatchObject({
      baseDissipation: 7,
      waterBonus: 0,
    });
    expect(newState.units['player-1'].heat).toBe(3);
  });

  it('uses the unit heat sink count for dissipation instead of the synthetic base', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 25,
        heatSinks: 20,
        heatSinkType: 'single',
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

    const heatDis = events.find((e) => e.type === GameEventType.HeatDissipated)!
      .payload as IHeatPayload;
    expect(heatDis.amount).toBe(-20);
    expect(heatDis.newTotal).toBe(5);
    expect(heatDis.breakdown).toMatchObject({
      baseDissipation: 20,
      waterBonus: 0,
    });
    expect(newState.units['player-1'].heat).toBe(5);
  });

  it('debits destroyed double heat sinks at double-sink rating', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 25,
        heatSinks: 10,
        heatSinkType: 'double',
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          heatSinksDestroyed: 3,
        },
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

    const heatDis = events.find((e) => e.type === GameEventType.HeatDissipated)!
      .payload as IHeatPayload;
    expect(heatDis.amount).toBe(-14);
    expect(heatDis.newTotal).toBe(11);
    expect(heatDis.breakdown).toMatchObject({
      baseDissipation: 14,
      waterBonus: 0,
    });
    expect(newState.units['player-1'].heat).toBe(11);
  });

  it('HeatDissipated breakdown includes baseDissipation + waterBonus fields', () => {
    const unit = createUnit('player-1', GameSide.Player, { q: 0, r: 0 });
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const heatDis = events.find((e) => e.type === GameEventType.HeatDissipated)!
      .payload as IHeatPayload;
    expect(heatDis.breakdown).toBeDefined();
    expect(heatDis.breakdown!.baseDissipation).toBe(10);
    expect(heatDis.breakdown!.waterBonus).toBe(0);
    expect(heatDis.breakdown!.environmentalModifier).toBe(0);
  });

  it('skips destroyed units in the heat phase', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        destroyed: true,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    expect(events).toHaveLength(0);
  });
});
