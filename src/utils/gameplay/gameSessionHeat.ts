import {
  ENGINE_HIT_HEAT,
  getAmmoExplosionTN,
  getMaxTechPilotHeatDamageAvoidTN,
  getPilotHeatDamage,
  getShutdownTN,
} from '@/constants/heat';
import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IEnvironmentalConditions,
  IGameEvent,
  IGameSession,
  IHexCoordinate,
  IMovementDeclaredPayload,
  PSRTrigger,
} from '@/types/gameplay';
import {
  buildDefaultCriticalSlotManifest,
  type CriticalHitEvent,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import { logger } from '@/utils/logger';

import { resolveAmmoExplosion } from './ammoTracking';
import { resolvePilotConsciousnessCheck } from './damage';
import { type D6Roller, type DiceRoller } from './diceTypes';
import { calculateEnvironmentalHeatModifier } from './environmentalModifiers';
import {
  createAmmoExplosionEvent,
  createComponentDestroyedEvent,
  createCriticalHitResolvedEvent,
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { createEventBase } from './gameEvents/base';
import { buildDefaultComponentDamageState } from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { getWaterCoolingBonus } from './heat';
import { resolveMaxTechHeatCriticalDamage } from './heatCriticalDamage';
import { roll2d6 as rollDice } from './hitLocation';
import {
  getWeaponCoolingHeatModifier,
  getWeaponQuirks,
} from './quirkModifiers';
import {
  getCoolUnderFireHeatReduction,
  getHotDogHeatTargetNumberModifier,
  hasSPA,
} from './spaModifiers';

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
  readonly getEnvironmentHeatEffect?: (
    unitId: string,
    position: IHexCoordinate,
  ) => number;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly maxTechHeatScale?: boolean;
  readonly criticalManifestsByUnit?: Map<string, CriticalSlotManifest>;
  readonly maxTechCriticalLocationRoller?: () => number;
}

function hasMaxTechHeatScaleRule(optionalRules: readonly string[]): boolean {
  return optionalRules.some((rule) =>
    [
      'maxtech-heat-scale',
      'maxtech_heat_scale',
      'maxtech-heat',
      'tacops-heat-scale',
    ].includes(rule.toLowerCase()),
  );
}

function createD6RollerFromDiceRoller(diceRoller: DiceRoller): D6Roller {
  let queuedDice: number[] = [];
  return () => {
    if (queuedDice.length === 0) {
      queuedDice = [...diceRoller().dice];
    }
    return queuedDice.shift() ?? 1;
  };
}

function createHeatCriticalHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  location: string,
  component: string,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.CriticalHit,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload: {
      unitId,
      location,
      component,
      count: 1,
    },
  };
}

function mapCriticalDestructionCause(
  cause: string,
):
  | 'damage'
  | 'ammo_explosion'
  | 'pilot_death'
  | 'engine_destroyed'
  | 'impossible_displacement'
  | 'shutdown'
  | 'ct_destroyed'
  | 'head_destroyed' {
  return cause === 'damage'
    ? 'engine_destroyed'
    : (cause as
        | 'damage'
        | 'ammo_explosion'
        | 'pilot_death'
        | 'engine_destroyed'
        | 'impossible_displacement'
        | 'shutdown'
        | 'ct_destroyed'
        | 'head_destroyed');
}

function emitHeatCriticalEvents(
  session: IGameSession,
  criticalEvents: readonly CriticalHitEvent[],
  turn: number,
  unitId: string,
): IGameSession {
  let currentSession = session;

  for (const event of criticalEvents) {
    const sequence = currentSession.events.length;

    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createHeatCriticalHitEvent(
          currentSession.id,
          sequence,
          turn,
          payload.unitId,
          payload.location,
          payload.componentType,
        ),
      );
      currentSession = appendEvent(
        currentSession,
        createCriticalHitResolvedEvent(
          currentSession.id,
          currentSession.events.length,
          turn,
          GamePhase.Heat,
          payload.unitId,
          payload.location,
          payload.slotIndex,
          payload.componentType,
          payload.componentName,
          payload.effect,
          payload.destroyed,
        ),
      );
      if (payload.destroyed) {
        currentSession = appendEvent(
          currentSession,
          createComponentDestroyedEvent(
            currentSession.id,
            currentSession.events.length,
            turn,
            payload.unitId,
            payload.location,
            payload.componentType,
            payload.slotIndex,
            payload.componentName,
            GamePhase.Heat,
          ),
        );
      }
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      const psrUnit = currentSession.units.find((u) => u.id === payload.unitId);
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.Heat,
          payload.unitId,
          payload.reason,
          payload.additionalModifier,
          payload.triggerSource,
          psrUnit?.piloting,
          payload.reasonCode,
        ),
      );
      continue;
    }

    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.Heat,
          payload.unitId,
          payload.wounds,
          payload.totalWounds,
          payload.source,
          payload.consciousnessCheckRequired,
          payload.consciousnessCheckPassed,
        ),
      );
      continue;
    }

    if (event.type === 'unit_destroyed') {
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.Heat,
          unitId,
          mapCriticalDestructionCause(event.payload.cause),
        ),
      );
    }
  }

  return currentSession;
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
  const maxTechHeatScale =
    options?.maxTechHeatScale ??
    hasMaxTechHeatScaleRule(session.config.optionalRules);
  const getOrSeedCriticalManifest = (unitId: string): CriticalSlotManifest => {
    const existing = options?.criticalManifestsByUnit?.get(unitId);
    if (existing) return existing;
    const seeded = buildDefaultCriticalSlotManifest();
    options?.criticalManifestsByUnit?.set(unitId, seeded);
    return seeded;
  };
  const heatCriticalD6Roller = createD6RollerFromDiceRoller(diceRoller);
  const maxTechCriticalLocationRoller =
    options?.maxTechCriticalLocationRoller ??
    (() => Math.floor(Math.random() * 8));

  const turnEvents = session.events.filter((event) => event.turn === turn);
  const unitIds = Object.keys(session.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    const unit = currentSession.units.find((entry) => entry.id === unitId);

    if (!unit || unitState.destroyed) {
      continue;
    }
    const hotDogTargetNumberModifier = getHotDogHeatTargetNumberModifier(
      unitState.abilities ?? unit.abilities ?? [],
    );

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
          const quirks = [
            ...getWeaponQuirks(
              unitState.weaponQuirks ?? unit.weaponQuirks,
              weaponAttack.weaponId,
            ),
            ...getWeaponQuirks(
              unitState.weaponQuirks ?? unit.weaponQuirks,
              weaponAttack.weaponName,
            ),
          ];
          heatFromWeapons += Math.max(
            0,
            weaponAttack.heat +
              getWeaponCoolingHeatModifier(quirks, weaponAttack.heat),
          );
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
    const unitPosition = unitState.position;
    const heatFromEnvironment = Math.max(
      0,
      options?.getEnvironmentHeatEffect !== undefined
        ? options.getEnvironmentHeatEffect(unitId, unitPosition)
        : 0,
    );

    // Per `wire-heat-generation-and-effects` task 13.1 + 0.5.4: emit
    // one `HeatGenerated` event per contributing source (movement /
    // firing / engine_hit / environment) so UI + AI consumers can break down the
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
    if (heatFromEnvironment > 0) {
      runningHeat += heatFromEnvironment;
      const seq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createHeatGeneratedEvent(
          currentSession.id,
          seq,
          turn,
          GamePhase.Heat,
          unitId,
          heatFromEnvironment,
          'environment',
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
    const waterDepth =
      options?.getWaterDepth !== undefined
        ? options.getWaterDepth(unitId, unitPosition)
        : 0;
    const waterBonus = getWaterCoolingBonus(waterDepth);
    const environmentalModifier =
      options?.environmentalConditions !== undefined
        ? calculateEnvironmentalHeatModifier(options.environmentalConditions)
        : 0;
    const heatGenerationReduction = Math.min(
      getCoolUnderFireHeatReduction(
        unitState.abilities ?? unit.abilities ?? [],
      ),
      heatFromMovement + heatFromWeapons + heatFromEngine + heatFromEnvironment,
    );

    const totalDissipation = Math.max(
      0,
      baseDissipation +
        waterBonus +
        environmentalModifier +
        heatGenerationReduction,
    );
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
      {
        baseDissipation,
        waterBonus,
        environmentalModifier,
        heatGenerationReduction,
      },
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
      const startupTN = getShutdownTN(finalHeat, hotDogTargetNumberModifier);
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
          unit?.piloting,
          PSRTrigger.Shutdown,
        ),
      );
    } else {
      const shutdownTN = getShutdownTN(finalHeat, hotDogTargetNumberModifier);
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
              unit?.piloting,
              PSRTrigger.Shutdown,
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
    const ammoExplosionTN = getAmmoExplosionTN(
      finalHeat,
      hotDogTargetNumberModifier,
    );
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
    const defaultPilotDamage = getPilotHeatDamage(finalHeat, lifeSupportHits);
    let pilotDamage = defaultPilotDamage;
    if (
      pilotDamage <= 0 &&
      maxTechHeatScale &&
      !hasSPA(
        currentSession.currentState.units[unitId].abilities ??
          unit.abilities ??
          [],
        'artificial_pain_shunt',
      )
    ) {
      const maxTechAvoidTN = getMaxTechPilotHeatDamageAvoidTN(
        finalHeat,
        hotDogTargetNumberModifier,
      );
      if (maxTechAvoidTN > 0) {
        const maxTechRoll = diceRoller();
        pilotDamage = maxTechRoll.total < maxTechAvoidTN ? 1 : 0;
      }
    }
    if (pilotDamage > 0) {
      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + pilotDamage;
      const d6Roller = () => {
        const roll = diceRoller();
        return roll.dice[0];
      };
      const consciousnessCheck = resolvePilotConsciousnessCheck(
        totalWounds,
        pilotDamage,
        currentUnitState.abilities ?? unit.abilities ?? [],
        d6Roller,
      );
      const consciousnessPassed =
        currentUnitState.pilotConscious &&
        (consciousnessCheck.conscious ?? true) &&
        totalWounds < 6;
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
          consciousnessPassed,
        ),
      );
    }

    if (maxTechHeatScale) {
      const currentUnitState = currentSession.currentState.units[unitId];
      const heatCriticalResult = resolveMaxTechHeatCriticalDamage({
        unitId,
        heat: finalHeat,
        manifest: getOrSeedCriticalManifest(unitId),
        componentDamage:
          currentUnitState.componentDamage ??
          buildDefaultComponentDamageState(),
        d6Roller: heatCriticalD6Roller,
        locationIndexRoller: maxTechCriticalLocationRoller,
        targetNumberModifier: hotDogTargetNumberModifier,
      });
      options?.criticalManifestsByUnit?.set(
        unitId,
        heatCriticalResult.updatedManifest,
      );
      if (heatCriticalResult.applied) {
        currentSession = emitHeatCriticalEvents(
          currentSession,
          heatCriticalResult.events,
          turn,
          unitId,
        );
      }
    }
  }

  return currentSession;
}
