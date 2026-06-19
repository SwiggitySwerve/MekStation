import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IAmmoSlotState,
  IGameEvent,
  IGameSession,
} from '@/types/gameplay';

import {
  applyAmmoExplosionRearArmorBlowout,
  caseProtectionForLocation,
  resolveAmmoExplosion,
  resolveCaseAdjustedAmmoExplosionDamage,
  type CASEProtectionLevel,
} from './ammoTracking';
import { resolveInternalDamage as resolveInternalDamagePipeline } from './damage';
import { type DiceRoller } from './diceTypes';
import {
  createAmmoConsumedEvent,
  createAmmoExplosionEvent,
} from './gameEvents';
import { createEventBase } from './gameEvents/base';
import {
  appendUnitDestroyedEvent,
  buildDamageStateFromUnit,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { appendHeatAmmoExplosionPilotDamage } from './gameSessionHeat.ammoExplosionPilot';
import { createD6RollerFromDiceRoller } from './gameSessionHeat.helpers';

interface IHeatLocationDamage {
  readonly location: CombatLocation;
  readonly damage: number;
  readonly armorRemaining: number;
  readonly structureRemaining: number;
  readonly destroyed: boolean;
  readonly transferredDamage: number;
  readonly transferLocation?: CombatLocation;
}

interface IHeatLocationDestroyedEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly unitId: string;
  readonly location: string;
  readonly cascadedTo?: string;
  readonly viaTransfer?: boolean;
}

interface IHeatTransferDamageEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly unitId: string;
  readonly fromLocation: string;
  readonly toLocation: string;
  readonly damage: number;
}

function createHeatDamageAppliedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  locationDamage: IHeatLocationDamage,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.DamageApplied,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload: {
      unitId,
      location: locationDamage.location,
      damage: locationDamage.damage,
      armorRemaining: locationDamage.armorRemaining,
      structureRemaining: locationDamage.structureRemaining,
      locationDestroyed: locationDamage.destroyed,
    },
  };
}

function createHeatLocationDestroyedEvent({
  gameId,
  sequence,
  turn,
  unitId,
  location,
  cascadedTo,
  viaTransfer,
}: IHeatLocationDestroyedEventInput): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.LocationDestroyed,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload: {
      unitId,
      location,
      cascadedTo,
      viaTransfer,
    },
  };
}

function createHeatTransferDamageEvent({
  gameId,
  sequence,
  turn,
  unitId,
  fromLocation,
  toLocation,
  damage,
}: IHeatTransferDamageEventInput): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.TransferDamage,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload: {
      unitId,
      fromLocation,
      toLocation,
      damage,
    },
  };
}

function cascadedArmFor(
  location: CombatLocation,
  newlyDestroyed: readonly CombatLocation[],
): CombatLocation | undefined {
  if (
    location === 'left_torso' &&
    newlyDestroyed.includes('left_arm' as CombatLocation)
  ) {
    return 'left_arm' as CombatLocation;
  }
  if (
    location === 'right_torso' &&
    newlyDestroyed.includes('right_arm' as CombatLocation)
  ) {
    return 'right_arm' as CombatLocation;
  }
  return undefined;
}

function appendHeatAmmoExplosionDamageCascade(
  session: IGameSession,
  unitId: string,
  location: string,
  damage: number,
  caseProtection: CASEProtectionLevel,
  diceRoller: DiceRoller,
): { readonly session: IGameSession; readonly unitDestroyed: boolean } {
  const unit = session.currentState.units[unitId];
  if (!unit || damage <= 0) {
    return { session, unitDestroyed: false };
  }

  const d6Roller = createD6RollerFromDiceRoller(diceRoller);
  const blowout = applyAmmoExplosionRearArmorBlowout(
    buildDamageStateFromUnit(unit),
    location as CombatLocation,
    caseProtection,
    damage,
  );
  const damageResult = resolveInternalDamagePipeline(
    blowout.state,
    location as CombatLocation,
    damage,
    d6Roller,
    { applyHeadPilotDamage: false },
  );
  const locationDamages = [
    ...blowout.locationDamages,
    ...damageResult.result.locationDamages,
  ];
  const preDestroyedSet = new Set<CombatLocation>(
    unit.destroyedLocations as readonly CombatLocation[],
  );
  const newlyDestroyed = damageResult.state.destroyedLocations.filter(
    (loc) => !preDestroyedSet.has(loc),
  );

  let currentSession = session;
  const turn = currentSession.currentState.turn;
  for (const locationDamage of locationDamages) {
    currentSession = appendEvent(
      currentSession,
      createHeatDamageAppliedEvent(
        currentSession.id,
        currentSession.events.length,
        turn,
        unitId,
        locationDamage as IHeatLocationDamage,
      ),
    );

    if (locationDamage.destroyed) {
      const cascadedArm = cascadedArmFor(
        locationDamage.location,
        newlyDestroyed,
      );
      currentSession = appendEvent(
        currentSession,
        createHeatLocationDestroyedEvent({
          gameId: currentSession.id,
          sequence: currentSession.events.length,
          turn,
          unitId,
          location: locationDamage.location,
          cascadedTo: cascadedArm,
        }),
      );
      if (cascadedArm) {
        currentSession = appendEvent(
          currentSession,
          createHeatLocationDestroyedEvent({
            gameId: currentSession.id,
            sequence: currentSession.events.length,
            turn,
            unitId,
            location: cascadedArm,
          }),
        );
      }
    }

    if (
      locationDamage.transferredDamage > 0 &&
      locationDamage.transferLocation
    ) {
      currentSession = appendEvent(
        currentSession,
        createHeatTransferDamageEvent({
          gameId: currentSession.id,
          sequence: currentSession.events.length,
          turn,
          unitId,
          fromLocation: locationDamage.location,
          toLocation: locationDamage.transferLocation,
          damage: locationDamage.transferredDamage,
        }),
      );
    }
  }

  return {
    session: currentSession,
    unitDestroyed: damageResult.result.unitDestroyed && !unit.destroyed,
  };
}

export function appendHeatAmmoExplosionEvents(
  session: IGameSession,
  unitId: string,
  bin: IAmmoSlotState,
  diceRoller: DiceRoller,
): IGameSession {
  const unit = session.currentState.units[unitId];
  if (!unit) {
    return session;
  }

  const caseProtection = caseProtectionForLocation(unit, bin.location);
  const explosionResult = resolveAmmoExplosion(
    unit.ammoState ?? {},
    bin.binId,
    bin.remainingRounds,
    caseProtection,
  );
  if (!explosionResult || explosionResult.totalDamage <= 0) {
    return session;
  }

  const caseAdjustedDamage = resolveCaseAdjustedAmmoExplosionDamage(
    unit,
    explosionResult.location,
    explosionResult.totalDamage,
  );
  let currentSession = appendEvent(
    session,
    createAmmoExplosionEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      GamePhase.Heat,
      unitId,
      explosionResult.location,
      explosionResult.totalDamage,
      'HeatInduced',
      {
        binId: explosionResult.binId,
        weaponType: explosionResult.weaponType,
        roundsDestroyed: bin.remainingRounds,
        caseProtection: caseAdjustedDamage.caseProtection,
      },
    ),
  );

  currentSession = appendEvent(
    currentSession,
    createAmmoConsumedEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      GamePhase.Heat,
      unitId,
      explosionResult.binId,
      explosionResult.weaponType,
      bin.remainingRounds,
      0,
    ),
  );

  const cascadeResult = appendHeatAmmoExplosionDamageCascade(
    currentSession,
    unitId,
    explosionResult.location,
    caseAdjustedDamage.damageToApply,
    caseAdjustedDamage.caseProtection,
    diceRoller,
  );
  currentSession = cascadeResult.session;

  const pilotResult = appendHeatAmmoExplosionPilotDamage(
    currentSession,
    unitId,
    explosionResult.totalDamage,
    caseAdjustedDamage.caseProtection,
    diceRoller,
  );
  currentSession = pilotResult.session;

  if (
    (cascadeResult.unitDestroyed || pilotResult.pilotDestroyed) &&
    !unit.destroyed
  ) {
    const finalUnit = currentSession.currentState.units[unitId];
    currentSession = appendUnitDestroyedEvent(currentSession, {
      turn: currentSession.currentState.turn,
      phase: GamePhase.Heat,
      unitId,
      cause:
        finalUnit?.destructionCause ??
        (pilotResult.pilotDestroyed ? 'pilot_death' : 'ammo_explosion'),
    });
  }

  return currentSession;
}
