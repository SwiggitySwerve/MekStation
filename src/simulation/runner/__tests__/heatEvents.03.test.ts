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
  it('applies Iron Man to HeatInduced AmmoExplosion pilot damage', () => {
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
        abilities: ['iron-man'],
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: new SeededRandom(42),
      weaponsByUnit: new Map([['player-1', createAtlasWeapons()]]),
    });

    const pilotHit = events.find(
      (e) =>
        e.type === GameEventType.PilotHit &&
        (e.payload as IPilotHitPayload).source === 'ammo_explosion',
    );
    expect(pilotHit?.payload as IPilotHitPayload).toMatchObject({
      unitId: 'player-1',
      wounds: 1,
      totalWounds: 1,
      source: 'ammo_explosion',
    });
    expect(newState.units['player-1'].pilotWounds).toBe(1);
  });

  it('suppresses HeatInduced AmmoExplosion pilot damage with artificial pain shunt', () => {
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
        abilities: ['artificial_pain_shunt'],
      },
    );
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: new SeededRandom(42),
      weaponsByUnit: new Map([['player-1', createAtlasWeapons()]]),
    });

    expect(
      events.some(
        (event) =>
          event.type === GameEventType.PilotHit &&
          (event.payload as IPilotHitPayload).source === 'ammo_explosion',
      ),
    ).toBe(false);
    expect(newState.units['player-1'].pilotWounds).toBe(0);
  });

  it('routes HeatInduced AmmoExplosion damage through transfer and destruction cascade', () => {
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
    const baseUnit = createUnit(
      'player-1',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        heat: 40,
        ammoState,
      },
    );
    const unit: IUnitGameState = {
      ...baseUnit,
      armor: {
        ...baseUnit.armor,
        right_torso: 0,
        center_torso: 0,
      },
      structure: {
        ...baseUnit.structure,
        right_torso: 5,
        center_torso: 10,
      },
    };
    const state = makeMinimalState({ 'player-1': unit });
    const events: IGameEvent[] = [];

    const newState = runHeatPhase({
      state,
      events,
      gameId: state.gameId,
      random: new SeededRandom(42),
      weaponsByUnit: new Map([['player-1', createAtlasWeapons()]]),
    });

    const explosionIndex = events.findIndex(
      (e) => e.type === GameEventType.AmmoExplosion,
    );
    const firstDamageIndex = events.findIndex(
      (e) => e.type === GameEventType.DamageApplied,
    );
    const transfer = events.find(
      (e) => e.type === GameEventType.TransferDamage,
    );
    const destroyed = events.find(
      (e) => e.type === GameEventType.UnitDestroyed,
    );
    const damageLocations = events
      .filter((e) => e.type === GameEventType.DamageApplied)
      .map((e) => (e.payload as IDamageAppliedPayload).location);
    const destroyedLocations = events
      .filter((e) => e.type === GameEventType.LocationDestroyed)
      .map((e) => (e.payload as ILocationDestroyedPayload).location);

    expect(explosionIndex).toBeGreaterThanOrEqual(0);
    expect(firstDamageIndex).toBeGreaterThan(explosionIndex);
    expect(damageLocations).toEqual(['right_torso', 'center_torso']);
    expect(destroyedLocations).toEqual(['right_torso', 'center_torso']);
    expect(transfer!.payload as ITransferDamagePayload).toMatchObject({
      unitId: 'player-1',
      fromLocation: 'right_torso',
      toLocation: 'center_torso',
      damage: 95,
    });
    expect(destroyed!.payload).toMatchObject({
      unitId: 'player-1',
      cause: 'ammo_explosion',
    });
    expect(newState.units['player-1']).toMatchObject({
      destroyed: true,
      destroyedLocations: expect.arrayContaining([
        'right_torso',
        'right_arm',
        'center_torso',
      ]),
    });
    expect(
      newState.units['player-1'].ammoState?.['ac-20-bin-0'].remainingRounds,
    ).toBe(0);
  });
});
