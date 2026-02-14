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
  IMovementDeclaredPayload,
} from '@/types/gameplay';

import { resolveAmmoExplosion } from './ammoTracking';
import { type DiceRoller } from './diceTypes';
import {
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';

export function resolveHeatPhase(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
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
        heatFromWeapons += payload.weapons.length * 3;
      }
    }

    const componentDamage = unitState.componentDamage;
    const engineHits = componentDamage?.engineHits ?? 0;
    const heatFromEngine = engineHits * ENGINE_HIT_HEAT;
    const totalHeatGenerated =
      heatFromMovement + heatFromWeapons + heatFromEngine;

    if (totalHeatGenerated > 0) {
      const heatGeneratedSequence = currentSession.events.length;
      const heatGeneratedEvent = createHeatGeneratedEvent(
        currentSession.id,
        heatGeneratedSequence,
        turn,
        GamePhase.Heat,
        unitId,
        totalHeatGenerated,
        heatFromEngine > 0 ? 'external' : 'weapons',
        unitState.heat + totalHeatGenerated,
      );
      currentSession = appendEvent(currentSession, heatGeneratedEvent);
    }

    const currentHeatBeforeDissipation =
      currentSession.currentState.units[unitId].heat;

    const unitHeatSinks = unit.heatSinks ?? 10;
    const heatSinksDestroyed = componentDamage?.heatSinksDestroyed ?? 0;
    const totalDissipation = Math.max(0, unitHeatSinks - heatSinksDestroyed);
    const newHeat = Math.max(
      0,
      currentHeatBeforeDissipation - totalDissipation,
    );

    const dissipationSequence = currentSession.events.length;
    const dissipationEvent = createHeatDissipatedEvent(
      currentSession.id,
      dissipationSequence,
      turn,
      unitId,
      totalDissipation,
      newHeat,
    );
    currentSession = appendEvent(currentSession, dissipationEvent);

    const finalHeat = currentSession.currentState.units[unitId].heat;

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
          'head_hit',
          true,
          totalWounds < 6,
        ),
      );
    }
  }

  return currentSession;
}
