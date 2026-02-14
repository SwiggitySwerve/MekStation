import {
  CombatLocation,
  FiringArc,
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IGameEvent,
  IGameSession,
  IUnitGameState,
  IWeaponAttackData,
} from '@/types/gameplay';

import { consumeAmmo, isEnergyWeapon } from './ammoTracking';
import {
  checkTACTrigger,
  CriticalHitEvent,
  processTAC,
  resolveCriticalHits,
  buildDefaultCriticalSlotManifest,
} from './criticalHitResolution';
import {
  resolveDamage as resolveDamagePipeline,
  IUnitDamageState,
} from './damage';
import { type DiceRoller } from './diceTypes';
import { calculateFiringArc } from './firingArc';
import {
  createAmmoConsumedEvent,
  createAttackResolvedEvent,
  createCriticalHitResolvedEvent,
  createDamageAppliedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import {
  determineHitLocationFromRoll,
  isHeadHit,
  roll2d6 as rollDice,
} from './hitLocation';
import { isLegLocation } from './pilotingSkillRolls';

function firingArcToString(
  arc: FiringArc,
): 'front' | 'rear' | 'left' | 'right' {
  switch (arc) {
    case FiringArc.Front:
      return 'front';
    case FiringArc.Rear:
      return 'rear';
    case FiringArc.Left:
      return 'left';
    case FiringArc.Right:
      return 'right';
    default:
      return 'front';
  }
}

function emitCriticalEvents(
  session: IGameSession,
  events: readonly CriticalHitEvent[],
  turn: number,
  unitId: string,
): IGameSession {
  let currentSession = session;
  for (const event of events) {
    const sequence = currentSession.events.length;
    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createCriticalHitResolvedEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          payload.unitId,
          payload.location,
          payload.slotIndex,
          payload.componentType,
          payload.componentName,
          payload.effect,
          payload.destroyed,
        ),
      );
    } else if (event.type === 'psr_triggered') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          payload.unitId,
          payload.reason,
          payload.additionalModifier,
          payload.triggerSource,
        ),
      );
    } else if (event.type === 'unit_destroyed') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          unitId,
          payload.cause as
            | 'damage'
            | 'ammo_explosion'
            | 'pilot_death'
            | 'shutdown',
        ),
      );
    } else if (event.type === 'pilot_hit') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          payload.unitId,
          payload.wounds,
          payload.totalWounds,
          payload.source,
          payload.consciousnessCheckRequired,
          payload.consciousnessCheckPassed,
        ),
      );
    }
  }
  return currentSession;
}

const DEFAULT_REAR_ARMOR: Record<
  'center_torso' | 'left_torso' | 'right_torso',
  number
> = {
  center_torso: 10,
  left_torso: 7,
  right_torso: 7,
};

function buildDamageStateFromUnit(
  unit: IUnitGameState,
  tonnage: number = 50,
): IUnitDamageState {
  const _tonnage = tonnage;
  const armorRecord = unit.armor as Record<CombatLocation, number>;
  const structureRecord = unit.structure as Record<CombatLocation, number>;
  const rearArmor: Record<
    'center_torso' | 'left_torso' | 'right_torso',
    number
  > = {
    center_torso:
      armorRecord.center_torso_rear ?? DEFAULT_REAR_ARMOR.center_torso,
    left_torso: armorRecord.left_torso_rear ?? DEFAULT_REAR_ARMOR.left_torso,
    right_torso: armorRecord.right_torso_rear ?? DEFAULT_REAR_ARMOR.right_torso,
  };

  return {
    armor: armorRecord,
    rearArmor,
    structure: structureRecord,
    destroyedLocations: unit.destroyedLocations as CombatLocation[],
    pilotWounds: unit.pilotWounds,
    pilotConscious: unit.pilotConscious,
    destroyed: unit.destroyed,
  };
}

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
    const weaponName = weaponData?.weaponName ?? weaponId;

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
      let damage = weaponData?.damage ?? 5;

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
