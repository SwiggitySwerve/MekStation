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
  it('selects a single highest-damage loaded ammo bin for heat cookoff', () => {
    const ammoState: Record<string, IAmmoSlotState> = {
      'ac-2-bin-0': {
        binId: 'ac-2-bin-0',
        weaponType: 'ac-2',
        location: 'left_torso',
        remainingRounds: 10,
        maxRounds: 45,
        isExplosive: true,
      },
      'ac-20-bin-0': {
        binId: 'ac-20-bin-0',
        weaponType: 'ac-20',
        location: 'right_torso',
        remainingRounds: 1,
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

    runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: new SeededRandom(42),
      weaponsByUnit: new Map([
        [
          'player-1',
          [
            ...createAtlasWeapons(),
            {
              id: 'ac-2-0',
              name: 'AC/2',
              shortRange: 8,
              mediumRange: 16,
              longRange: 24,
              damage: 2,
              heat: 1,
              minRange: 4,
              ammoPerTon: 45,
              destroyed: false,
            },
          ],
        ],
      ]),
    });

    const ammoExplosions = events.filter(
      (e) => e.type === GameEventType.AmmoExplosion,
    );
    expect(ammoExplosions).toHaveLength(1);
    expect(ammoExplosions[0].payload as IAmmoExplosionPayload).toMatchObject({
      binId: 'ac-20-bin-0',
      weaponType: 'ac-20',
      roundsDestroyed: 1,
      damage: 20,
      source: 'HeatInduced',
    });
  });

  it('does NOT emit AmmoExplosion below heat 19', () => {
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
        heat: 18,
        ammoState,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    expect(
      events.find((e) => e.type === GameEventType.AmmoExplosion),
    ).toBeUndefined();
  });

  it('applies Hot Dog-style target-number relief to heat-induced ammo cookoff rolls', () => {
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
      { ammoState },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const eventsWithoutRelief: IGameEvent[] = [];
    const eventsWithRelief: IGameEvent[] = [];
    let rawDie = 0;
    const rollThree = (): number => [1, 2][rawDie++ % 2] ?? 1;
    let reliefDie = 0;
    const reliefRollThree = (): number => [1, 2][reliefDie++ % 2] ?? 1;

    applyHeatInducedAmmoExplosions({
      currentState: state,
      unit,
      unitId: 'player-1',
      heat: 19,
      events: eventsWithoutRelief,
      gameId: state.gameId,
      d6Roller: rollThree,
      unitWeapons: createAtlasWeapons(),
    });
    applyHeatInducedAmmoExplosions({
      currentState: state,
      unit,
      unitId: 'player-1',
      heat: 19,
      events: eventsWithRelief,
      gameId: state.gameId,
      d6Roller: reliefRollThree,
      unitWeapons: createAtlasWeapons(),
      targetNumberModifier: -1,
    });

    expect(
      eventsWithoutRelief.some((e) => e.type === GameEventType.AmmoExplosion),
    ).toBe(true);
    expect(
      eventsWithRelief.some((e) => e.type === GameEventType.AmmoExplosion),
    ).toBe(false);
  });

  it('skips heat events when called with state-only options (legacy path)', () => {
    // Backward-compat: legacy callers that pass `{ state }` only must
    // not crash and must not emit events. State mutation still
    // happens (heat decay + dissipation).
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 5,
      },
    );
    const state = makeMinimalState({ 'player-1': unit });

    const newState = runHeatPhase({ state });

    // 0 weapons fired, 10 dissipation → newHeat = max(0, 5 - 10) = 0.
    expect(newState.units['player-1'].heat).toBe(0);
  });

  it('emits HeatGenerated with engine_hit source when engine damage adds heat', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 0,
        componentDamage: { ...DEFAULT_COMPONENT_DAMAGE, engineHits: 1 },
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];
    const random = new SeededRandom(42);

    runHeatPhase({ state, events, gameId: state.gameId, random });

    const heatGen = events.find((e) => e.type === GameEventType.HeatGenerated)!
      .payload as IHeatPayload;
    expect(heatGen.source).toBe('engine_hit');
    // Engine heat per critical = 5 (per ENGINE_HEAT_PER_CRITICAL).
    expect(heatGen.amount).toBe(5);
  });

  it('emits movement-sourced heat for walk, run, and jump distance', () => {
    const cases: readonly {
      readonly movementThisTurn: MovementType;
      readonly hexesMovedThisTurn: number;
      readonly expectedHeat: number;
    }[] = [
      {
        movementThisTurn: MovementType.Walk,
        hexesMovedThisTurn: 1,
        expectedHeat: 1,
      },
      {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 4,
        expectedHeat: 2,
      },
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 2,
        expectedHeat: 3,
      },
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 6,
        expectedHeat: 6,
      },
    ];

    for (const testCase of cases) {
      const unit = createUnit(
        'player-1',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          heat: 10,
          movementThisTurn: testCase.movementThisTurn,
          hexesMovedThisTurn: testCase.hexesMovedThisTurn,
        },
      );
      const state = makeMinimalState({ 'player-1': unit });
      const events: IGameEvent[] = [];
      const random = new SeededRandom(42);

      runHeatPhase({ state, events, gameId: state.gameId, random });

      const heatGen = events.find(
        (e) => e.type === GameEventType.HeatGenerated,
      )!.payload as IHeatPayload;
      expect(heatGen.source).toBe('movement');
      expect(heatGen.amount).toBe(testCase.expectedHeat);
      expect(heatGen.newTotal).toBe(testCase.expectedHeat);
    }
  });
});
