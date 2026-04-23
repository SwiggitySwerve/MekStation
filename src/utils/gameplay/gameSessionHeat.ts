import {
  ENGINE_HIT_HEAT,
  getAmmoExplosionTN,
  getPilotHeatDamage,
  getShutdownTN,
} from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IGameSession,
  IHexCoordinate,
  IMovementDeclaredPayload,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import { resolveAmmoExplosion } from './ammoTracking';
import { type DiceRoller } from './diceTypes';
import {
  createAmmoExplosionEvent,
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { getWaterCoolingBonus } from './heat';
import { roll2d6 as rollDice } from './hitLocation';

/**
 * Per `wire-heat-generation-and-effects` task 5 (water cooling) and
 * decisions.md: `IHex.terrain` is a plain `string` at runtime with no
 * structured depth. Callers who track water depth externally pass a
 * resolver via `options.getWaterDepth`; when omitted, water bonus is
 * zero and dissipation falls back to real-heat-sink math only (tasks
 * 4.2 / 4.3).
 */
export interface IResolveHeatPhaseOptions {
  readonly getWaterDepth?: (unitId: string, position: IHexCoordinate) => number;
}

export function resolveHeatPhase(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
  options?: IResolveHeatPhaseOptions,
): IGameSession {
  if (session.currentState.phase !== GamePhase.Heat) {
    throw new Error('Not in heat phase');
  }

  const { turn } = session.currentState;
  let currentSession = session;

  const turnEvents = session.events.filter((event) => event.turn === turn);
  const unitIds = Object.keys(session.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    const unit = currentSession.units.find((entry) => entry.id === unitId);

    if (!unit || unitState.destroyed) {
      continue;
    }

    let heatFromMovement = 0;
    const movementEvent = turnEvents.find(
      (event) =>
        event.type === GameEventType.MovementDeclared &&
        event.actorId === unitId,
    );
    if (movementEvent) {
      const payload = movementEvent.payload as IMovementDeclaredPayload;
      heatFromMovement = payload.heatGenerated;
    }

    let heatFromWeapons = 0;
    const attackEvents = turnEvents.filter(
      (event) =>
        event.type === GameEventType.AttackDeclared && event.actorId === unitId,
    );
    for (const attackEvent of attackEvents) {
      const payload = attackEvent.payload as IAttackDeclaredPayload;
      if (payload.weaponAttacks && payload.weaponAttacks.length > 0) {
        for (const weaponAttack of payload.weaponAttacks) {
          heatFromWeapons += weaponAttack.heat;
        }
      } else {
        // Producers now always populate weaponAttacks (per
        // wire-real-weapon-data). An empty weaponAttacks with a non-empty
        // weapons list indicates a malformed legacy event; treat it as
        // zero firing heat rather than approximating `weapons.length * 3`
        // (which is the original bug this change targets).
        if (payload.weapons.length > 0) {
          logger.warn(
            `[gameSessionHeat] AttackDeclared event for unit "${unitId}" has ${payload.weapons.length} weapon(s) but empty weaponAttacks — firing heat for this event accumulated as 0. Source: malformed legacy event.`,
          );
        }
      }
    }

    const componentDamage = unitState.componentDamage;
    const engineHits = componentDamage?.engineHits ?? 0;
    const heatFromEngine = engineHits * ENGINE_HIT_HEAT;

    // Per `wire-heat-generation-and-effects` task 13.1 + 0.5.4: emit
    // one `HeatGenerated` event per contributing source (movement /
    // firing / engine_hit) so UI + AI consumers can break down the
    // per-turn heat budget without summing adjacent events or parsing
    // attack payloads. Skip sources that contributed zero.
    //
    // Accounting: movement heat is already baked into `unit.heat` by
    // the `MovementDeclared` reducer (`unit.heat + payload.heatGenerated`).
    // Firing heat + engine-hit heat are NOT accumulated by any reducer
    // before the heat phase — they exist only on attack payloads and
    // component-damage state — so those sources add to `newTotal`. The
    // movement event we emit here is a log-only record (`newTotal`
    // matches current) so the UI can still show the movement
    // contribution without the reducer double-counting it on replay.
    let runningHeat = unitState.heat;
    if (heatFromMovement > 0) {
      const seq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createHeatGeneratedEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.Heat,
          unitId,
          heatFromMovement,
          'movement',
          runningHeat,
        ),
      );
    }
    if (heatFromWeapons > 0) {
      runningHeat += heatFromWeapons;
      const seq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createHeatGeneratedEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.Heat,
          unitId,
          heatFromWeapons,
          'firing',
          runningHeat,
        ),
      );
    }
    if (heatFromEngine > 0) {
      runningHeat += heatFromEngine;
      const seq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createHeatGeneratedEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.Heat,
          unitId,
          heatFromEngine,
          'engine_hit',
          runningHeat,
        ),
      );
    }

    const currentHeatBeforeDissipation =
      currentSession.currentState.units[unitId].heat;

    // Per `wire-heat-generation-and-effects` tasks 4.2 / 4.3 /
    // decisions.md "Double heat sink modeling": dissipation uses a
    // per-sink rating derived from `unit.heatSinkType`. Singles = 1,
    // doubles = 2. Destroyed sinks lose their rating too, so a
    // destroyed double correctly loses 2 dissipation (not 1). When
    // `heatSinkType` is absent, we default to singles for back-compat.
    const unitHeatSinks = unit.heatSinks ?? 10;
    const heatSinksDestroyed = componentDamage?.heatSinksDestroyed ?? 0;
    const heatSinkRating = unit.heatSinkType === 'double' ? 2 : 1;
    const baseDissipation = Math.max(
      0,
      (unitHeatSinks - heatSinksDestroyed) * heatSinkRating,
    );

    // Per `wire-heat-generation-and-effects` task 5.1 / 5.2: water
    // cooling adds +2 dissipation at depth 1 and +4 at depth 2+. The
    // map's `IHex.terrain` is a raw string (no depth metadata), so we
    // read depth via the `getWaterDepth` provider callback. Callers
    // that don't track water (legacy + tests) omit it, yielding a zero
    // bonus and preserving existing behaviour.
    const unitPosition = currentSession.currentState.units[unitId].position;
    const waterDepth =
      options?.getWaterDepth !== undefined
        ? options.getWaterDepth(unitId, unitPosition)
        : 0;
    const waterBonus = getWaterCoolingBonus(waterDepth);

    const totalDissipation = baseDissipation + waterBonus;
    const newHeat = Math.max(
      0,
      currentHeatBeforeDissipation - totalDissipation,
    );

    // Per task 13.2: attach `breakdown` so UI + replay can show
    // base-dissipation vs water-bonus split in the per-turn heat log.
    const dissipationSequence = currentSession.events.length;
    const dissipationEvent = createHeatDissipatedEvent(
      currentSession.id,
      dissipationSequence,
      turn,
      unitId,
      totalDissipation,
      newHeat,
      { baseDissipation, waterBonus },
    );
    currentSession = appendEvent(currentSession, dissipationEvent);

    const finalHeat = currentSession.currentState.units[unitId].heat;

    // Per `wire-heat-generation-and-effects` task 10: shut-down units
    // attempt to restart once heat has dissipated to 29 or lower. TN
    // mirrors the shutdown TN at the current heat. Success flips
    // `shutdown: false`; failure leaves the unit shut down for another
    // turn. Units must be shut down AND below auto-shutdown threshold
    // (30) to be eligible — automatic at heat 0 (TN 0).
    const stateAfterDissipation = currentSession.currentState.units[unitId];
    if (stateAfterDissipation.shutdown && finalHeat <= 29) {
      const startupTN = getShutdownTN(finalHeat);
      const autoRestart = startupTN === 0;
      const startupRoll = autoRestart ? null : diceRoller();
      const startupSuccess = autoRestart
        ? true
        : (startupRoll?.total ?? 0) >= startupTN;
      const startupSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createStartupAttemptEvent(
          currentSession.id,
          startupSequence,
          turn,
          GamePhase.Heat,
          unitId,
          startupTN,
          startupRoll?.total ?? 0,
          startupSuccess,
        ),
      );
      // If startup succeeded the unit is now active and skips the
      // shutdown check path below (it was already shut down for the
      // whole turn, so no further shutdown check applies). If it
      // failed, fall through to any additional effects at heat
      // thresholds (pilot heat damage, ammo explosion still apply
      // while shut down, so we don't `continue` out of the loop).
      if (startupSuccess) {
        // Continue to heat-effect processing below — pilot heat
        // damage + ammo explosion risk still apply regardless of
        // startup outcome.
      }
    }

    if (finalHeat >= 30) {
      const shutdownSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createShutdownCheckEvent(
          currentSession.id,
          shutdownSequence,
          turn,
          GamePhase.Heat,
          unitId,
          finalHeat,
          Infinity,
          0,
          true,
        ),
      );

      const psrSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSequence,
          turn,
          GamePhase.Heat,
          unitId,
          'Reactor shutdown',
          0,
          'heat_shutdown',
        ),
      );
    } else {
      const shutdownTN = getShutdownTN(finalHeat);
      if (shutdownTN > 0) {
        const shutdownRoll = diceRoller();
        const shutdownAvoided = shutdownRoll.total >= shutdownTN;

        const shutdownSequence = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createShutdownCheckEvent(
            currentSession.id,
            shutdownSequence,
            turn,
            GamePhase.Heat,
            unitId,
            finalHeat,
            shutdownTN,
            shutdownRoll.total,
            !shutdownAvoided,
          ),
        );

        if (!shutdownAvoided) {
          const psrSequence = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createPSRTriggeredEvent(
              currentSession.id,
              psrSequence,
              turn,
              GamePhase.Heat,
              unitId,
              'Reactor shutdown',
              0,
              'heat_shutdown',
            ),
          );
        }
      }
    }

    // Per `wire-heat-generation-and-effects` task 11.4: when an
    // explosive ammo bin detonates from heat, emit an
    // `AmmoExplosion` event first (location, damage, bin metadata,
    // source = "HeatInduced"). Only emit `UnitDestroyed` when the
    // explosion damage actually destroys the unit — the damage
    // pipeline (parallel `integrate-damage-pipeline` change) owns CT
    // internal structure accounting, so here we conservatively treat
    // "explosion result present with damage > 0" as a destruction
    // trigger to preserve legacy behavior while the new event is
    // emitted to consumers. CASE / CASE II protection routing stays
    // out of scope per decisions.md (deferred to damage pipeline).
    const ammoExplosionTN = getAmmoExplosionTN(finalHeat);
    if (ammoExplosionTN > 0) {
      const unitAmmoState =
        currentSession.currentState.units[unitId].ammoState ?? {};
      const hasAmmo = Object.values(unitAmmoState).some(
        (bin) => bin.remainingRounds > 0 && bin.isExplosive,
      );

      if (hasAmmo) {
        if (ammoExplosionTN === Infinity) {
          for (const bin of Object.values(unitAmmoState)) {
            if (bin.remainingRounds > 0 && bin.isExplosive) {
              const explosionResult = resolveAmmoExplosion(
                unitAmmoState,
                bin.binId,
                bin.remainingRounds,
                'none',
              );
              if (explosionResult && explosionResult.totalDamage > 0) {
                const explosionSequence = currentSession.events.length;
                currentSession = appendEvent(
                  currentSession,
                  createAmmoExplosionEvent(
                    currentSession.id,
                    explosionSequence,
                    turn,
                    GamePhase.Heat,
                    unitId,
                    explosionResult.location,
                    explosionResult.totalDamage,
                    'HeatInduced',
                    {
                      binId: explosionResult.binId,
                      weaponType: explosionResult.weaponType,
                      roundsDestroyed: bin.remainingRounds,
                    },
                  ),
                );
                const destroySequence = currentSession.events.length;
                currentSession = appendEvent(
                  currentSession,
                  createUnitDestroyedEvent(
                    currentSession.id,
                    destroySequence,
                    turn,
                    GamePhase.Heat,
                    unitId,
                    'ammo_explosion',
                  ),
                );
                break;
              }
            }
          }
        } else {
          const ammoRoll = diceRoller();
          if (ammoRoll.total < ammoExplosionTN) {
            const explosiveBin = Object.values(unitAmmoState).find(
              (bin) => bin.remainingRounds > 0 && bin.isExplosive,
            );
            if (explosiveBin) {
              const explosionResult = resolveAmmoExplosion(
                unitAmmoState,
                explosiveBin.binId,
                explosiveBin.remainingRounds,
                'none',
              );
              if (explosionResult && explosionResult.totalDamage > 0) {
                const explosionSequence = currentSession.events.length;
                currentSession = appendEvent(
                  currentSession,
                  createAmmoExplosionEvent(
                    currentSession.id,
                    explosionSequence,
                    turn,
                    GamePhase.Heat,
                    unitId,
                    explosionResult.location,
                    explosionResult.totalDamage,
                    'HeatInduced',
                    {
                      binId: explosionResult.binId,
                      weaponType: explosionResult.weaponType,
                      roundsDestroyed: explosiveBin.remainingRounds,
                    },
                  ),
                );
                const destroySequence = currentSession.events.length;
                currentSession = appendEvent(
                  currentSession,
                  createUnitDestroyedEvent(
                    currentSession.id,
                    destroySequence,
                    turn,
                    GamePhase.Heat,
                    unitId,
                    'ammo_explosion',
                  ),
                );
              }
            }
          }
        }
      }
    }

    // Per `wire-heat-generation-and-effects` task 12.3: pilot damage
    // from heat thresholds uses `source: 'heat'`, not `'head_hit'`.
    // Heat damage bypasses head-location armor and isn't a head crit,
    // so consumers (UI, replay, AI threat models) must distinguish it
    // from head-location hits.
    const lifeSupportHits = componentDamage?.lifeSupport ?? 0;
    const pilotDamage = getPilotHeatDamage(finalHeat, lifeSupportHits);
    if (pilotDamage > 0) {
      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + pilotDamage;
      const pilotSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          pilotSequence,
          turn,
          GamePhase.Heat,
          unitId,
          pilotDamage,
          totalWounds,
          'heat',
          true,
          totalWounds < 6,
        ),
      );
    }
  }

  return currentSession;
}
