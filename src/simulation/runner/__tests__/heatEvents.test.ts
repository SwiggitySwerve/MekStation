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
  it('emits HeatGenerated + HeatDissipated even when unit heat is zero (no movement, no fire)', () => {
    // Spec scenario: "Heat phase events fire even when heat is zero".
    const unit = createUnit('player-1', GameSide.Player, { q: 0, r: 0 });
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const heatGen = events.find((e) => e.type === GameEventType.HeatGenerated);
    const heatDis = events.find((e) => e.type === GameEventType.HeatDissipated);
    expect(heatGen).toBeDefined();
    expect(heatDis).toBeDefined();

    const genPayload = heatGen!.payload as IHeatPayload;
    expect(genPayload.unitId).toBe('player-1');
    expect(genPayload.amount).toBe(0); // No fire, no movement.
    expect(genPayload.newTotal).toBe(0);
    expect(genPayload.previousTotal).toBe(0);

    const disPayload = heatDis!.payload as IHeatPayload;
    expect(disPayload.unitId).toBe('player-1');
    // 10 base heat sinks, no destruction → 10 dissipation.
    expect(disPayload.amount).toBe(-10);
    expect(disPayload.newTotal).toBe(0);
  });

  it('emits source-backed sprint movement heat from explicit sprint state', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heatSinks: 0,
        movementThisTurn: MovementType.Run,
        sprintedThisTurn: true,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const heatGen = events.find((e) => e.type === GameEventType.HeatGenerated);
    const payload = heatGen!.payload as IHeatPayload;
    expect(payload.amount).toBe(SPRINT_HEAT);
    expect(payload.source).toBe('movement');
    expect(payload.newTotal).toBe(SPRINT_HEAT);
  });

  it('emits source-backed evasion movement heat from explicit evade state', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heatSinks: 0,
        isEvading: true,
        movementThisTurn: MovementType.Run,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const heatGen = events.find((e) => e.type === GameEventType.HeatGenerated);
    const payload = heatGen!.payload as IHeatPayload;
    expect(payload.amount).toBe(RUN_HEAT + EVADE_HEAT_BONUS);
    expect(payload.source).toBe('movement');
    expect(payload.newTotal).toBe(RUN_HEAT + EVADE_HEAT_BONUS);
  });

  it.each([
    ['Improved Cooling', 'improved_cooling', 9],
    ['Poor Cooling', 'poor_cooling', 11],
    ['No Cooling', 'no_cooling', 12],
  ])(
    'applies %s weapon quirk while summing fired weapon heat',
    (_label, quirkId, expectedHeat) => {
      const weapon: IWeapon = {
        id: 'ppc-cooling-test',
        name: 'PPC',
        shortRange: 6,
        mediumRange: 12,
        longRange: 18,
        damage: 10,
        heat: 10,
        minRange: 3,
        ammoPerTon: -1,
        destroyed: false,
      };
      const unit = createUnit(
        'player-1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          heat: 0,
          heatSinks: 0,
          weaponsFiredThisTurn: [weapon.id],
          weaponQuirks: { [weapon.id]: [quirkId] },
        },
      );
      const state = makeMinimalState({ 'player-1': unit });
      const events: IGameEvent[] = [];

      const newState = runHeatPhase({
        state,
        events,
        gameId: state.gameId,
        random: new SeededRandom(42),
        weaponsByUnit: new Map([['player-1', [weapon]]]),
      });

      const heatGen = events.find(
        (e) => e.type === GameEventType.HeatGenerated,
      )!.payload as IHeatPayload;
      expect(heatGen.amount).toBe(expectedHeat);
      expect(newState.units['player-1'].heat).toBe(expectedHeat);
    },
  );

  it('emits HeatEffectApplied for every threshold the new total meets (alpha-strike at heat 0 → ~30)', () => {
    // Spec scenario: "Atlas alpha-strike at heat 0 produces shutdown
    // event chain". Hand-feed weaponsFiredThisTurn to simulate a
    // full Atlas alpha-strike (AC/20 + LRM-20 + SRM-6 + 4× ML).
    const atlasWeapons = createAtlasWeapons();
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 0,
        weaponsFiredThisTurn: atlasWeapons.map((w) => w.id),
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    const weaponsByUnit = new Map<string, readonly IWeapon[]>([
      ['player-1', atlasWeapons],
    ]);

    runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random,
      weaponsByUnit,
    });

    // Weapon heat sum = 7 + 6 + 4 + 3*4 = 29. With 10 dissipation,
    // newTotal = 19. Heat 19 hits all thresholds at 5 / 8 / 13 / 14 / 15 / 17 / 19.
    const heatGen = events.find((e) => e.type === GameEventType.HeatGenerated)!
      .payload as IHeatPayload;
    expect(heatGen.amount).toBe(29);
    expect(heatGen.newTotal).toBe(19);

    const effectEvents = events.filter(
      (e) => e.type === GameEventType.HeatEffectApplied,
    );
    expect(effectEvents.length).toBeGreaterThanOrEqual(7);
    const thresholds = effectEvents.map(
      (e) => (e.payload as IHeatEffectAppliedPayload).threshold,
    );
    expect(thresholds).toEqual([5, 8, 13, 14, 15, 17, 19]);

    // Threshold 14 → effect 'shutdown_check' (not 'shutdown' — that's 30).
    const shutdownCheckEffect = effectEvents.find(
      (e) => (e.payload as IHeatEffectAppliedPayload).threshold === 14,
    );
    expect(
      (shutdownCheckEffect!.payload as IHeatEffectAppliedPayload).effect,
    ).toBe('shutdown_check');
  });

  it('emits ShutdownCheck { automatic: true } at heat ≥ 30 (auto-shutdown)', () => {
    // Phase-internal heat decay subtracts dissipation (10 base sinks)
    // BEFORE the shutdown check fires. Start at 40 so newHeat = 30
    // → auto-shutdown.
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

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const shutdownCheck = events.find(
      (e) => e.type === GameEventType.ShutdownCheck,
    );
    expect(shutdownCheck).toBeDefined();
    const payload = shutdownCheck!.payload as IShutdownCheckPayload;
    expect(payload.unitId).toBe('player-1');
    expect(payload.automatic).toBe(true);
    expect(payload.shutdownOccurred).toBe(true);
    expect(payload.heatLevel).toBeGreaterThanOrEqual(30);
  });

  it('queues a fixed-TN shutdown PSR when auto-shutdown fires', () => {
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

    const shutdownIndex = events.findIndex(
      (e) => e.type === GameEventType.ShutdownCheck,
    );
    const psrIndex = events.findIndex(
      (e) => e.type === GameEventType.PSRTriggered,
    );
    const psr = events[psrIndex]?.payload as IPSRTriggeredPayload | undefined;

    expect(shutdownIndex).toBeGreaterThanOrEqual(0);
    expect(psrIndex).toBeGreaterThan(shutdownIndex);
    expect(psr).toMatchObject({
      unitId: 'player-1',
      reason: 'Reactor shutdown',
      triggerSource: PSRTrigger.Shutdown,
      reasonCode: PSRTrigger.Shutdown,
      basePilotingSkill: 5,
    });
    expect(newState.units['player-1'].pendingPSRs).toContainEqual(
      expect.objectContaining({
        reasonCode: PSRTrigger.Shutdown,
        triggerSource: PSRTrigger.Shutdown,
      }),
    );
  });
});
