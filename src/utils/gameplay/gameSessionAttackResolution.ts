import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IGameEvent,
  IGameSession,
  IWeaponAttackData,
} from '@/types/gameplay';
import { logger } from '@/utils/logger';

import { consumeAmmo, isEnergyWeapon } from './ammoTracking';
import {
  checkTACTrigger,
  processTAC,
  resolveCriticalHits,
  buildDefaultCriticalSlotManifest,
} from './criticalHitResolution';
import { resolveDamage as resolveDamagePipeline } from './damage';
import { type DiceRoller } from './diceTypes';
import { calculateFiringArc } from './firingArc';
import {
  createAmmoConsumedEvent,
  createAttackResolvedEvent,
  createDamageAppliedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import {
  buildDamageStateFromUnit,
  emitCriticalEvents,
  firingArcToString,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import {
  determineHitLocationFromRoll,
  isHeadHit,
  roll2d6 as rollDice,
} from './hitLocation';
import { isLegLocation } from './pilotingSkillRolls';

export function resolveAttack(
  session: IGameSession,
  attackEvent: IGameEvent,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const payload = attackEvent.payload as IAttackDeclaredPayload;
  const { attackerId, targetId, weapons, weaponAttacks, toHitNumber } = payload;

  const weaponDataMap = new Map<string, IWeaponAttackData>();
  if (weaponAttacks) {
    for (const weaponAttack of weaponAttacks) {
      weaponDataMap.set(weaponAttack.weaponId, weaponAttack);
    }
  }

  let currentSession = session;

  for (const weaponId of weapons) {
    const weaponData = weaponDataMap.get(weaponId);
    if (!weaponData) {
      // Producers (InteractiveSession / GameEngine.phases) now route through
      // buildWeaponAttacks, which guarantees weaponAttacks is populated for
      // every declared weapon. If this branch fires, the attack declaration
      // is malformed (legacy test fixture, hand-crafted event, etc.). Skip
      // the weapon rather than silently defaulting to 5 damage / 3 heat.
      logger.warn(
        `[resolveAttack] weaponAttacks payload missing entry for weapon "${weaponId}" on attacker "${attackerId}" — skipping. This indicates a malformed AttackDeclared event.`,
      );
      continue;
    }
    const weaponName = weaponData.weaponName;

    const attackerStateForAmmo = currentSession.currentState.units[attackerId];
    const ammoState = attackerStateForAmmo?.ammoState ?? {};
    if (!isEnergyWeapon(weaponName) && Object.keys(ammoState).length > 0) {
      const ammoResult = consumeAmmo(ammoState, attackerId, weaponName);
      if (ammoResult) {
        const ammoSequence = currentSession.events.length;
        const ammoTurn = currentSession.currentState.turn;
        currentSession = appendEvent(
          currentSession,
          createAmmoConsumedEvent(
            currentSession.id,
            ammoSequence,
            ammoTurn,
            GamePhase.WeaponAttack,
            attackerId,
            ammoResult.event.binId,
            ammoResult.event.weaponType,
            ammoResult.event.roundsConsumed,
            ammoResult.event.roundsRemaining,
          ),
        );
      }
    }

    const attackRoll = diceRoller();
    const hit = attackRoll.total >= toHitNumber;

    const sequence = currentSession.events.length;
    const { turn } = currentSession.currentState;

    if (hit) {
      const attackerState = currentSession.currentState.units[attackerId];
      const targetState = currentSession.currentState.units[targetId];
      const firingArc = calculateFiringArc(
        attackerState.position,
        targetState.position,
        targetState.facing,
      );
      const locationRoll = diceRoller();
      const hitLocationResult = determineHitLocationFromRoll(
        firingArc,
        locationRoll,
      );
      const location = hitLocationResult.location;
      let damage = weaponData.damage;

      if (isHeadHit(location) && damage > 3) {
        damage = 3;
      }

      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        sequence,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        toHitNumber,
        true,
        location,
        damage,
        weaponData.heat,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);

      const damageState = buildDamageStateFromUnit(targetState);
      const damageResult = resolveDamagePipeline(
        damageState,
        location as CombatLocation,
        damage,
      );

      for (const locationDamage of damageResult.result.locationDamages) {
        const damageSequence = currentSession.events.length;
        const damageEvent = createDamageAppliedEvent(
          currentSession.id,
          damageSequence,
          turn,
          targetId,
          locationDamage.location,
          locationDamage.damage,
          locationDamage.armorRemaining,
          locationDamage.structureRemaining,
          locationDamage.destroyed,
        );
        currentSession = appendEvent(currentSession, damageEvent);
      }

      const d6Roller = () => {
        const roll = diceRoller();
        return roll.dice[0];
      };
      const manifest = buildDefaultCriticalSlotManifest();
      const targetComponentDamage =
        targetState.componentDamage ??
        ({
          engineHits: 0,
          gyroHits: 0,
          sensorHits: 0,
          lifeSupport: 0,
          cockpitHit: false,
          actuators: {},
          weaponsDestroyed: [],
          heatSinksDestroyed: 0,
          jumpJetsDestroyed: 0,
        } as const);

      for (const locationDamage of damageResult.result.locationDamages) {
        if (locationDamage.structureDamage > 0 && !locationDamage.destroyed) {
          const criticalResult = resolveCriticalHits(
            targetId,
            locationDamage.location as CombatLocation,
            manifest,
            targetComponentDamage,
            d6Roller,
          );
          currentSession = emitCriticalEvents(
            currentSession,
            criticalResult.events,
            turn,
            targetId,
          );
        }
      }

      if (locationRoll.total === 2) {
        const arc = firingArcToString(firingArc);
        const tacLocation = checkTACTrigger(2, arc);
        if (tacLocation) {
          const tacResult = processTAC(
            targetId,
            tacLocation,
            manifest,
            targetComponentDamage,
            d6Roller,
          );
          currentSession = emitCriticalEvents(
            currentSession,
            tacResult.events,
            turn,
            targetId,
          );
        }
      }

      for (const locationDamage of damageResult.result.locationDamages) {
        if (
          isLegLocation(locationDamage.location) &&
          locationDamage.structureDamage > 0
        ) {
          const legPSRSequence = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createPSRTriggeredEvent(
              currentSession.id,
              legPSRSequence,
              turn,
              GamePhase.WeaponAttack,
              targetId,
              'Leg damage (internal structure exposed)',
              0,
              'leg_damage',
            ),
          );
          break;
        }
      }

      if (damageResult.result.pilotDamage) {
        const pilotDamage = damageResult.result.pilotDamage;
        const pilotSequence = currentSession.events.length;
        const pilotEvent = createPilotHitEvent(
          currentSession.id,
          pilotSequence,
          turn,
          GamePhase.WeaponAttack,
          targetId,
          pilotDamage.woundsInflicted,
          pilotDamage.totalWounds,
          pilotDamage.source as
            | 'head_hit'
            | 'ammo_explosion'
            | 'mech_destruction',
          pilotDamage.consciousnessCheckRequired,
          pilotDamage.conscious,
        );
        currentSession = appendEvent(currentSession, pilotEvent);
      }

      if (damageResult.result.unitDestroyed) {
        const destroySequence = currentSession.events.length;
        const destroyEvent = createUnitDestroyedEvent(
          currentSession.id,
          destroySequence,
          turn,
          GamePhase.WeaponAttack,
          targetId,
          (damageResult.result.destructionCause as
            | 'damage'
            | 'ammo_explosion'
            | 'pilot_death'
            | 'shutdown') ?? 'damage',
        );
        currentSession = appendEvent(currentSession, destroyEvent);
      }
    } else {
      // Miss — attacker still generates firing heat per canonical rules
      // (TechManual p.68: heat is charged at weapon-firing time, not on
      // hit). Pass weaponData.heat so the heat phase accumulates correctly.
      const resolvedEvent = createAttackResolvedEvent(
        currentSession.id,
        sequence,
        turn,
        attackerId,
        targetId,
        weaponId,
        attackRoll.total,
        toHitNumber,
        false,
        undefined,
        undefined,
        weaponData.heat,
      );
      currentSession = appendEvent(currentSession, resolvedEvent);
    }
  }

  return currentSession;
}

export function resolveAllAttacks(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  const { turn } = session.currentState;

  const attackEvents = session.events.filter(
    (event) =>
      event.type === GameEventType.AttackDeclared && event.turn === turn,
  );

  let currentSession = session;
  for (const attackEvent of attackEvents) {
    currentSession = resolveAttack(currentSession, attackEvent, diceRoller);
  }

  return currentSession;
}
