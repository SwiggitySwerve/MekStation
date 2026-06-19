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
  it('contains HeatInduced AmmoExplosion damage when the bin location has CASE', () => {
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
        caseProtection: { right_torso: 'case' },
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

    const explosion = events.find(
      (e) => e.type === GameEventType.AmmoExplosion,
    );
    const damageEvents = events.filter(
      (e) => e.type === GameEventType.DamageApplied,
    );

    expect(explosion?.payload as IAmmoExplosionPayload).toMatchObject({
      unitId: 'player-1',
      location: 'right_torso',
      binId: 'ac-20-bin-0',
      damage: 100,
      caseProtection: 'case',
      source: 'HeatInduced',
    });
    expect(
      events.find(
        (e) =>
          e.type === GameEventType.PilotHit &&
          (e.payload as IPilotHitPayload).source === 'ammo_explosion',
      )?.payload as IPilotHitPayload,
    ).toMatchObject({
      unitId: 'player-1',
      wounds: 2,
      source: 'ammo_explosion',
    });
    expect(events.some((e) => e.type === GameEventType.TransferDamage)).toBe(
      false,
    );
    expect(events.some((e) => e.type === GameEventType.UnitDestroyed)).toBe(
      false,
    );
    expect(damageEvents.map((e) => e.payload as IDamageAppliedPayload)).toEqual(
      [
        expect.objectContaining({
          location: 'right_torso',
          damage: 5,
          structureRemaining: 0,
          locationDestroyed: true,
        }),
      ],
    );
    expect(newState.units['player-1']).toMatchObject({
      destroyed: false,
      destroyedLocations: expect.arrayContaining(['right_torso', 'right_arm']),
    });
    expect(newState.units['player-1'].structure.center_torso).toBe(10);
    expect(
      newState.units['player-1'].ammoState?.['ac-20-bin-0'].remainingRounds,
    ).toBe(0);
  });

  it('applies protected HeatInduced AmmoExplosion damage to internals and blows out rear torso armor', () => {
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
        caseProtection: { right_torso: 'case' },
      },
    );
    const unit: IUnitGameState = {
      ...baseUnit,
      armor: {
        ...baseUnit.armor,
        right_torso: 12,
        right_torso_rear: 6,
        center_torso: 0,
      },
      structure: {
        ...baseUnit.structure,
        right_torso: 15,
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

    const damageEvents = events
      .filter((e) => e.type === GameEventType.DamageApplied)
      .map((e) => e.payload as IDamageAppliedPayload);

    expect(damageEvents).toEqual([
      expect.objectContaining({
        location: 'right_torso_rear',
        damage: 6,
        armorRemaining: 0,
        structureRemaining: 15,
        locationDestroyed: false,
      }),
      expect.objectContaining({
        location: 'right_torso',
        damage: 10,
        armorRemaining: 12,
        structureRemaining: 5,
        locationDestroyed: false,
      }),
    ]);
    expect(events.some((e) => e.type === GameEventType.TransferDamage)).toBe(
      false,
    );
    expect(newState.units['player-1'].armor.right_torso).toBe(12);
    expect(newState.units['player-1'].armor.right_torso_rear).toBe(0);
    expect(newState.units['player-1'].structure.right_torso).toBe(5);
    expect(newState.units['player-1'].structure.center_torso).toBe(10);
  });
});
