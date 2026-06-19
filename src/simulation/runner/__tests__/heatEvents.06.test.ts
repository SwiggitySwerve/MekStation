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
  it('emits heat-sourced PilotHit and mutates wounds when life support is damaged', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 25,
        heatSinks: 0,
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

    const pilotHit = events.find((e) => e.type === GameEventType.PilotHit);
    expect(pilotHit).toBeDefined();
    expect(pilotHit!.payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      totalWounds: 2,
      source: 'heat',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    });
    expect(newState.units['player-1']).toMatchObject({
      pilotWounds: 2,
      pilotConscious: true,
      destroyed: false,
    });
  });

  it('routes optional MaxTech pilot heat damage through Hot Dog target-number relief', () => {
    const baseUnit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 32,
        heatSinks: 0,
      },
    );
    const hotDogUnit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 32,
        heatSinks: 0,
        abilities: ['hot_dog'],
      },
    );
    const baseEvents: IGameEvent[] = [];
    const hotDogEvents: IGameEvent[] = [];

    const baseState = runHeatPhase({
      state: makeMinimalState({ 'player-1': baseUnit }),
      events: baseEvents,
      gameId: 'maxtech-heat-pilot-damage-test',
      random: new SeededRandom(2),
      maxTechHeatScale: true,
    });
    const hotDogState = runHeatPhase({
      state: makeMinimalState({ 'player-1': hotDogUnit }),
      events: hotDogEvents,
      gameId: 'maxtech-heat-pilot-damage-test',
      random: new SeededRandom(2),
      maxTechHeatScale: true,
    });

    const basePilotHits = baseEvents.filter(
      (event) => event.type === GameEventType.PilotHit,
    );
    const hotDogPilotHits = hotDogEvents.filter(
      (event) => event.type === GameEventType.PilotHit,
    );

    expect(basePilotHits).toHaveLength(1);
    expect(basePilotHits[0].payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'heat',
    });
    expect(baseState.units['player-1'].pilotWounds).toBe(1);
    expect(hotDogPilotHits).toHaveLength(0);
    expect(hotDogState.units['player-1'].pilotWounds).toBe(0);
  });

  it('routes optional MaxTech heat critical damage through a random BattleMech critical location', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 36,
        heatSinks: 0,
        abilities: ['artificial_pain_shunt'],
      },
    );
    const events: IGameEvent[] = [];
    const manifestsByUnit = new Map<string, CriticalSlotManifest>();

    const newState = runHeatPhase({
      state: makeMinimalState({ 'player-1': unit }),
      events,
      gameId: 'maxtech-heat-critical-damage-test',
      random: createScriptedHeatRandom([3, 3, 1], 2),
      maxTechHeatScale: true,
      manifestsByUnit,
    });

    const criticalHit = events.find(
      (event) => event.type === GameEventType.CriticalHit,
    );
    const criticalResolved = events.find(
      (event) => event.type === GameEventType.CriticalHitResolved,
    );
    const componentDestroyed = events.find(
      (event) => event.type === GameEventType.ComponentDestroyed,
    );

    expect(criticalHit).toMatchObject({
      phase: GamePhase.Heat,
      payload: expect.objectContaining({
        unitId: 'player-1',
        location: 'right_torso',
        component: 'engine',
        count: 1,
      }),
    });
    expect(criticalResolved).toMatchObject({
      phase: GamePhase.Heat,
      payload: expect.objectContaining({
        unitId: 'player-1',
        location: 'right_torso',
        componentType: 'engine',
      }),
    });
    expect(componentDestroyed).toMatchObject({
      phase: GamePhase.Heat,
      payload: expect.objectContaining({
        unitId: 'player-1',
        location: 'right_torso',
        componentType: 'engine',
      }),
    });
    expect(newState.units['player-1'].componentDamage?.engineHits).toBe(1);
    expect(manifestsByUnit.get('player-1')?.right_torso?.[0]?.destroyed).toBe(
      true,
    );
  });

  it('applies Hot Dog relief to optional MaxTech heat critical damage rolls', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 36,
        heatSinks: 0,
        abilities: ['artificial_pain_shunt', 'hot-dog'],
      },
    );
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state: makeMinimalState({ 'player-1': unit }),
      events,
      gameId: 'maxtech-heat-critical-hot-dog-test',
      random: createScriptedHeatRandom([3, 4], 2),
      maxTechHeatScale: true,
    });

    expect(
      events.some((event) => event.type === GameEventType.CriticalHitResolved),
    ).toBe(false);
    expect(newState.units['player-1'].componentDamage?.engineHits ?? 0).toBe(0);
  });

  it('applies consciousness SPAs to heat-sourced pilot damage', () => {
    const unit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        abilities: ['pain-resistance'],
        heat: 15,
        heatSinks: 0,
        componentDamage: { ...DEFAULT_COMPONENT_DAMAGE, lifeSupport: 1 },
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: { next: () => 0.2 } as SeededRandom,
    });

    const pilotHit = events.find((e) => e.type === GameEventType.PilotHit);
    expect(pilotHit?.payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'heat',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: true,
    });
    expect(newState.units['player-1']).toMatchObject({
      pilotWounds: 1,
      pilotConscious: true,
      destroyed: false,
    });
  });
});
