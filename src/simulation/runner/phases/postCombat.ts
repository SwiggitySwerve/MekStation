import { getAmmoExplosionTN, getShutdownTN } from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IUnitGameState,
  MovementType,
} from '@/types/gameplay';
import {
  IPSRBatchResult,
  resolveAllPSRs,
} from '@/utils/gameplay/pilotingSkillRolls';

import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import {
  BASE_HEAT_SINKS,
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
  ENGINE_HEAT_PER_CRITICAL,
  JUMP_HEAT,
  LETHAL_PILOT_WOUNDS,
  MEDIUM_LASER_HEAT,
  RUN_HEAT,
  WALK_HEAT,
} from '../SimulationRunnerConstants';
import { createD6Roller, createGameEvent } from './utils';

export function runPSRPhase(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
}): IGameState {
  const { events, gameId, random, state } = options;
  let currentState = state;
  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const pendingPSRs = unit.pendingPSRs ?? [];
    if (pendingPSRs.length === 0) {
      continue;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const batchResult: IPSRBatchResult = resolveAllPSRs(
      DEFAULT_PILOTING,
      pendingPSRs,
      componentDamage,
      unit.pilotWounds,
      d6Roller,
    );

    for (const psrResult of batchResult.results) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRResolved,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            reason: psrResult.psr.reason,
            targetNumber: psrResult.targetNumber,
            roll: psrResult.roll,
            passed: psrResult.passed,
          },
          unitId,
        ),
      );
    }

    if (batchResult.unitFell) {
      const currentUnit = currentState.units[unitId];
      const newPilotWounds = currentUnit.pilotWounds + 1;
      const pilotConscious =
        newPilotWounds < LETHAL_PILOT_WOUNDS && currentUnit.pilotConscious;

      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentUnit,
            prone: true,
            pilotWounds: newPilotWounds,
            pilotConscious,
            destroyed: !pilotConscious ? true : currentUnit.destroyed,
            pendingPSRs: [],
          },
        },
      };

      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta — UnitFell Carries Location and Reason):
      // pull the failing-PSR reason from batchResult; default location is
      // `'center_torso'` (canonical fall-damage location for damage-induced
      // PSR failures — PR E tightens this to a per-trigger discriminated
      // location once `PSRReasonCode` lands).
      const failedPsr = batchResult.results.find((r) => !r.passed);
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitFell,
          currentState.turn,
          currentState.phase,
          {
            unitId,
            pilotDamage: 1,
            location: 'center_torso',
            ...(failedPsr ? { reason: failedPsr.psr.reason } : {}),
          },
          unitId,
        ),
      );

      if (!pilotConscious && !currentUnit.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.UnitDestroyed,
            currentState.turn,
            currentState.phase,
            {
              unitId,
              cause: 'pilot_death' as const,
            },
          ),
        );
      }
    } else {
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [unitId]: {
            ...currentState.units[unitId],
            pendingPSRs: [],
          },
        },
      };
    }
  }

  return currentState;
}

// =============================================================================
// Phase 4 — Heat lifecycle helpers
// =============================================================================

/**
 * Per `add-combat-fidelity-suite` Phase 4 (`combat-resolution` delta —
 * Heat Lifecycle Events): the canonical Total Warfare threshold ladder
 * carried into `HeatEffectApplied` events. Ordered ascending so the
 * runner emits effects from lowest threshold up — consumers receive
 * one event per threshold the unit's NEW heat meets and can render
 * each effect that just became active.
 *
 * `effect` is a coarse classification mapping multiple threshold
 * values to the same effect name (e.g. heat 8 / 13 / 17 / 24 all map
 * to `'attack_penalty'`). `threshold` carries the precise heat value
 * so UI / replay layers can show the exact match.
 */
const HEAT_THRESHOLD_LADDER: ReadonlyArray<{
  readonly threshold: number;
  readonly effect:
    | 'movement_penalty'
    | 'attack_penalty'
    | 'shutdown_check'
    | 'shutdown'
    | 'pilot_damage'
    | 'ammo_explosion_risk';
}> = [
  { threshold: 5, effect: 'movement_penalty' },
  { threshold: 8, effect: 'attack_penalty' },
  { threshold: 13, effect: 'attack_penalty' },
  { threshold: 14, effect: 'shutdown_check' },
  { threshold: 15, effect: 'pilot_damage' },
  { threshold: 17, effect: 'attack_penalty' },
  { threshold: 19, effect: 'ammo_explosion_risk' },
  { threshold: 23, effect: 'ammo_explosion_risk' },
  { threshold: 24, effect: 'attack_penalty' },
  { threshold: 25, effect: 'pilot_damage' },
  { threshold: 28, effect: 'ammo_explosion_risk' },
  { threshold: 30, effect: 'shutdown' },
];

/**
 * Resolve a per-unit weapon-heat total for the heat phase. When the
 * runner threaded `weaponsByUnit` (Phase 1 hydration), each weapon id
 * fired this turn maps to a real catalog heat value via the per-unit
 * weapon list. Without hydration the legacy synthetic-medium-laser
 * fallback (3 heat per shot) preserves pre-P4 behaviour for unit
 * fixtures that don't supply weapons.
 */
function computeWeaponHeat(
  weaponsFired: readonly string[],
  unitWeapons: readonly IWeapon[] | undefined,
): number {
  if (!unitWeapons || unitWeapons.length === 0) {
    return weaponsFired.length * MEDIUM_LASER_HEAT;
  }
  let total = 0;
  for (const weaponId of weaponsFired) {
    const weapon = unitWeapons.find((w) => w.id === weaponId);
    total += weapon ? weapon.heat : MEDIUM_LASER_HEAT;
  }
  return total;
}

/**
 * Movement heat per the canonical Total Warfare table — Walk = 1,
 * Run = 2, Jump = max(3, hexes), Stationary = 0. This phase predates
 * the more elaborate jump-MP heat table; the synthetic-fixture path
 * uses the constant `JUMP_HEAT = 3` and that's preserved here.
 */
function computeMovementHeat(unit: IUnitGameState): number {
  if (unit.movementThisTurn === MovementType.Walk) return WALK_HEAT;
  if (unit.movementThisTurn === MovementType.Run) return RUN_HEAT;
  if (unit.movementThisTurn === MovementType.Jump) return JUMP_HEAT;
  return 0;
}

export function runHeatPhase(options: {
  state: IGameState;
  events?: IGameEvent[];
  gameId?: string;
  random?: SeededRandom;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon
   * list, keyed by runner unit id. When supplied, weapon heat is
   * sourced from the catalog per mount; without it, the legacy
   * synthetic-laser fallback fires.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
}): IGameState {
  const { state, events, gameId, random, weaponsByUnit } = options;
  let currentState = { ...state };

  // Phase 4 events require an event sink + game id + roller for
  // shutdown / ammo-explosion 2d6 rolls. When the legacy single-arg
  // caller invokes us via a `state`-only options object, fall back to
  // silent state mutation so existing callers (legacy session / older
  // test fixtures) keep working without an event log.
  const canEmit =
    events !== undefined && gameId !== undefined && random !== undefined;
  const d6Roller = random !== undefined ? createD6Roller(random) : undefined;

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const weaponsFired = unit.weaponsFiredThisTurn ?? [];
    const weaponHeat = computeWeaponHeat(
      weaponsFired,
      weaponsByUnit?.get(unitId),
    );
    const movementHeat = computeMovementHeat(unit);

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const engineHeat = componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL;

    const heatSinksLost = componentDamage.heatSinksDestroyed ?? 0;
    const dissipation = Math.max(0, BASE_HEAT_SINKS - heatSinksLost);

    const generated = weaponHeat + movementHeat + engineHeat;
    const previousHeat = unit.heat;
    const newHeat = Math.max(0, previousHeat + generated - dissipation);

    // Per spec scenario "Heat phase events fire even when heat is
    // zero": emit `HeatGenerated` and `HeatDissipated` unconditionally
    // so consumers can audit per-turn heat tracking even when no
    // weapons fired and no movement heat applied. The event payload
    // breakdown carries the per-source decomposition so UI / replay
    // can show "0 heat: 0 weapons + 0 movement" rather than nothing.
    if (canEmit) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.HeatGenerated,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            amount: generated,
            // Source classification is multi-cause when more than one
            // input contributed; report the dominant source. Movement
            // outweighs weapons in alpha-strike-light cases; weapons
            // dominate alpha-strike-heavy. When generated is exactly
            // zero, default to `'firing'` (the most common
            // legacy-test value).
            source:
              engineHeat > 0
                ? 'engine_hit'
                : weaponHeat >= movementHeat
                  ? 'firing'
                  : 'movement',
            newTotal: newHeat,
            previousTotal: previousHeat,
            ammoExplosionRisk: newHeat >= 19,
          },
          unitId,
        ),
      );

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.HeatDissipated,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            amount: dissipation,
            source: 'dissipation',
            newTotal: newHeat,
            previousTotal: previousHeat,
            breakdown: {
              baseDissipation: dissipation,
              waterBonus: 0,
            },
          },
          unitId,
        ),
      );

      // Per spec scenario "Atlas alpha-strike at heat 0 produces
      // shutdown event chain": every threshold the unit's NEW heat
      // meets fires a `HeatEffectApplied` event (one per threshold
      // crossed in this phase, ordered ascending). Heat 0 produces
      // none. The `effect` field maps multiple thresholds to the same
      // coarse classification (e.g. 8/13/17/24 → `'attack_penalty'`).
      for (const entry of HEAT_THRESHOLD_LADDER) {
        if (newHeat >= entry.threshold) {
          events.push(
            createGameEvent(
              gameId,
              events.length,
              GameEventType.HeatEffectApplied,
              currentState.turn,
              GamePhase.Heat,
              {
                unitId,
                threshold: entry.threshold,
                effect: entry.effect,
                heatLevel: newHeat,
              },
              unitId,
            ),
          );
        }
      }
    }

    // Per spec scenario: shutdown check fires when heat ≥ 14
    // (avoidable) or ≥ 30 (auto). The roller is shared with the rest
    // of the phase so seed-pinned tests are deterministic.
    let shutdownNow = unit.shutdown ?? false;
    if (canEmit && d6Roller && newHeat >= 14) {
      const automatic = newHeat >= 30;
      const targetNumber = getShutdownTN(newHeat);
      let roll = 0;
      let shutdownOccurred = automatic;
      if (!automatic) {
        const die1 = d6Roller();
        const die2 = d6Roller();
        roll = die1 + die2;
        // Shutdown occurs when roll is BELOW the TN (the pilot fails
        // to avoid). Heat 30+ short-circuits to auto-shutdown above.
        shutdownOccurred = roll < targetNumber;
      }
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.ShutdownCheck,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            heatLevel: newHeat,
            targetNumber: automatic ? Infinity : targetNumber,
            roll,
            shutdownOccurred,
            automatic,
          },
          unitId,
        ),
      );
      if (shutdownOccurred) {
        shutdownNow = true;
      }
    }

    // Per `ammo-explosion-system/spec.md` "Heat-Triggered Ammo
    // Explosion": at heat 19+ the engine SHALL roll a 1d6-style check
    // (here implemented as 2d6 ≥ TN per the canonical Total Warfare
    // ammo-explosion table) per loaded ammo bin. On any roll meeting
    // or exceeding the threshold for that heat level,
    // `AmmoExplosion { source: 'heat_overflow' }` MUST emit. We use
    // the canonical `getAmmoExplosionTN` table from
    // `src/constants/heat.ts` (TN 4 at 19-22, TN 6 at 23-27, TN 8 at
    // 28-29, auto-explode at 30+).
    //
    // CASE / CASE-II is NOT yet wired (the runner's `IUnitGameState`
    // does not carry construction CASE flags — see the deferred-flag
    // note in `notepad/issues.md`). The default is "no CASE" so
    // damage cascade flows naturally per `combat-resolution`'s
    // canonical transfer chain. Future plumbing (post-P4) will hook
    // CASE flags into this branch.
    if (canEmit && d6Roller) {
      const ammoState = unit.ammoState ?? {};
      const loadedBins = Object.values(ammoState).filter(
        (bin) => bin.remainingRounds > 0 && bin.isExplosive,
      );
      if (loadedBins.length > 0) {
        const ammoTN = getAmmoExplosionTN(newHeat);
        if (ammoTN > 0) {
          for (const bin of loadedBins) {
            const auto = ammoTN === Infinity;
            let triggered = auto;
            if (!auto) {
              const die1 = d6Roller();
              const die2 = d6Roller();
              const ammoRoll = die1 + die2;
              // Ammo explodes when the roll is BELOW the TN (per
              // Total Warfare). At auto threshold the bin always
              // detonates without a roll.
              triggered = ammoRoll < ammoTN;
            }
            if (triggered) {
              const damage = bin.remainingRounds * 1; // damage-per-round resolved at consumer; default 1
              events.push(
                createGameEvent(
                  gameId,
                  events.length,
                  GameEventType.AmmoExplosion,
                  currentState.turn,
                  GamePhase.Heat,
                  {
                    unitId,
                    location: bin.location,
                    binId: bin.binId,
                    weaponType: bin.weaponType,
                    roundsDestroyed: bin.remainingRounds,
                    damage,
                    source: 'HeatInduced' as const,
                  },
                  unitId,
                ),
              );
            }
          }
        }
      }
    }

    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [unitId]: {
          ...unit,
          heat: newHeat,
          shutdown: shutdownNow,
        },
      },
    };
  }

  return currentState;
}
