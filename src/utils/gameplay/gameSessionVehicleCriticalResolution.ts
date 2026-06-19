import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  GamePhase,
  IAmmoSlotState,
  IGameSession,
  IUnitGameState,
  IVehicleCritRollResult,
  IVehicleHitLocationResult,
  IVehicleResolveDamageResult,
  VehicleCritKind,
} from '@/types/gameplay';

import { type D6Roller } from './diceTypes';
import {
  createAmmoExplosionEvent,
  createComponentDestroyedEvent,
  createCriticalHitResolvedEvent,
  createTurretLockedEvent,
  createVehicleCrewStunnedEvent,
  createVehicleImmobilizedEvent,
  createVTOLCrashCheckEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { vehicleCriticalAvailabilityContext } from './vehicleCriticalAvailability';
import {
  applyVehicleCritEffect,
  rollVehicleCrit,
} from './vehicleCriticalHitResolution';

interface IVehicleCriticalDispatchInput {
  readonly session: IGameSession;
  readonly targetId: string;
  readonly location: VehicleLocation | VTOLLocation;
  readonly hitLocation: IVehicleHitLocationResult;
  readonly damageResult: IVehicleResolveDamageResult;
  readonly targetState: IUnitGameState;
  readonly d6Roller: D6Roller;
}

interface IVehicleCriticalDispatchResult {
  readonly session: IGameSession;
  readonly unitDestroyed: boolean;
  readonly destructionCause?: IVehicleResolveDamageResult['destructionCause'];
}

export function resolveVehicleCriticalIfTriggered(
  input: IVehicleCriticalDispatchInput,
): IVehicleCriticalDispatchResult {
  const trigger =
    input.hitLocation.isTAC ||
    input.damageResult.locationDamages.some(
      (damage) => damage.structureExposed,
    );
  if (!trigger || input.damageResult.state.destroyed) {
    return {
      session: input.session,
      unitDestroyed: false,
    };
  }

  const rolledCrit = rollVehicleCrit(input.d6Roller, {
    location: input.location,
    motionType: input.damageResult.state.motionType,
    engineType: input.damageResult.state.engineType ?? EngineType.STANDARD,
    hasAvailableAmmo: hasExplosiveAmmoForVehicle(input.targetState.ammoState),
    engineAlreadyHit: input.damageResult.state.motive.engineHits > 0,
    driverAlreadyHit: input.damageResult.state.motive.driverHits > 0,
    commanderAlreadyHit: input.damageResult.state.motive.commanderHits > 0,
    sensorHits: input.targetState.componentDamage?.sensorHits,
    turretAlreadyLocked:
      input.location === VehicleLocation.TURRET &&
      input.damageResult.state.turretLock.primaryLocked,
    vehicleImmobile: input.damageResult.state.motive.immobilized,
    ...vehicleCriticalAvailabilityContext(
      input.session.units.find((unit) => unit.id === input.targetId),
      input.location,
      input.targetState.componentDamage,
    ),
  });
  const critResult = applyVehicleCritEffect(
    input.damageResult.state,
    rolledCrit,
    {
      engineType: input.damageResult.state.engineType ?? EngineType.STANDARD,
      hasAmmoInSlot: hasExplosiveAmmoForVehicle(input.targetState.ammoState),
    },
  );

  let currentSession = emitVehicleCriticalEvents(
    input.session,
    input.targetId,
    input.location,
    critResult.applied,
    critResult.state.destroyed,
    input.damageResult.state.altitude ?? 0,
  );

  if (critResult.ammoExplosion) {
    currentSession = emitAmmoExplosionEvent(
      currentSession,
      input.targetId,
      input.location,
      selectExplosiveAmmoForVehicle(
        input.targetState.ammoState,
        input.location,
      ),
    );
  }

  return {
    session: currentSession,
    unitDestroyed: critResult.state.destroyed,
    destructionCause: critResult.state.destructionCause,
  };
}

function emitVehicleCriticalEvents(
  session: IGameSession,
  targetId: string,
  location: VehicleLocation | VTOLLocation,
  crit: IVehicleCritRollResult,
  destroyed: boolean,
  altitude: number,
): IGameSession {
  if (crit.kind === 'none') {
    return session;
  }

  let currentSession = appendEvent(
    session,
    createCriticalHitResolvedEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      GamePhase.WeaponAttack,
      targetId,
      location,
      0,
      vehicleCritComponentType(crit.kind),
      vehicleCritComponentName(crit.kind),
      crit.kind,
      destroyed,
    ),
  );

  if (
    crit.kind === 'crew_stunned' ||
    crit.kind === 'commander_hit' ||
    crit.kind === 'copilot_hit'
  ) {
    currentSession = appendEvent(
      currentSession,
      createVehicleCrewStunnedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        targetId,
        2,
      ),
    );
  }

  if (crit.kind === 'turret_locked') {
    currentSession = appendEvent(
      currentSession,
      createTurretLockedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        targetId,
        false,
      ),
    );
  }

  if (crit.kind === 'weapon_destroyed') {
    currentSession = appendEvent(
      currentSession,
      createComponentDestroyedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        targetId,
        location,
        'weapon',
        0,
        'Vehicle weapon',
      ),
    );
  }

  if (crit.kind === 'rotor_destroyed') {
    currentSession = appendEvent(
      currentSession,
      createVehicleImmobilizedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        targetId,
        'rotor_destroyed',
      ),
    );

    currentSession = appendEvent(
      currentSession,
      createVTOLCrashCheckEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        targetId,
        altitude,
        altitude * 10,
      ),
    );
  }

  return currentSession;
}

function emitAmmoExplosionEvent(
  session: IGameSession,
  targetId: string,
  location: VehicleLocation | VTOLLocation,
  explodedAmmo: IAmmoSlotState | undefined,
): IGameSession {
  return appendEvent(
    session,
    createAmmoExplosionEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      GamePhase.WeaponAttack,
      targetId,
      location,
      computeAmmoExplosionDamage(explodedAmmo),
      'CritInduced',
      explodedAmmo
        ? {
            binId: explodedAmmo.binId,
            weaponType: explodedAmmo.weaponType,
            roundsDestroyed: explodedAmmo.remainingRounds,
          }
        : undefined,
    ),
  );
}

const vehicleCritComponentTypes: Record<VehicleCritKind, string> = {
  ammo_explosion: 'ammo',
  cargo_hit: 'cargo',
  commander_hit: 'commander',
  copilot_hit: 'copilot',
  crew_killed: 'crew',
  crew_stunned: 'crew',
  driver_hit: 'driver',
  engine_hit: 'engine',
  flight_stabilizer: 'stabilizer',
  fuel_tank: 'engine',
  none: 'none',
  pilot_hit: 'driver',
  rotor_damage: 'rotor',
  rotor_destroyed: 'rotor',
  sensor_hit: 'sensor',
  stabilizer_hit: 'stabilizer',
  turret_destroyed: 'turret',
  turret_jammed: 'turret',
  turret_locked: 'turret',
  weapon_destroyed: 'weapon',
  weapon_jammed: 'weapon',
};

function vehicleCritComponentType(kind: VehicleCritKind): string {
  return vehicleCritComponentTypes[kind];
}

const vehicleCritComponentNames: Record<VehicleCritKind, string> = {
  ammo_explosion: 'Ammo',
  cargo_hit: 'Cargo',
  commander_hit: 'Commander',
  copilot_hit: 'Copilot',
  crew_killed: 'Crew killed',
  crew_stunned: 'Crew',
  driver_hit: 'Driver',
  engine_hit: 'Engine',
  flight_stabilizer: 'Flight stabilizer',
  fuel_tank: 'Fuel Tank',
  none: 'None',
  pilot_hit: 'Pilot',
  rotor_damage: 'Rotor damage',
  rotor_destroyed: 'Rotor destroyed',
  sensor_hit: 'Sensor',
  stabilizer_hit: 'Stabilizer',
  turret_destroyed: 'Turret destroyed',
  turret_jammed: 'Turret jammed',
  turret_locked: 'Turret locked',
  weapon_destroyed: 'Vehicle weapon',
  weapon_jammed: 'Vehicle weapon jammed',
};

function vehicleCritComponentName(kind: VehicleCritKind): string {
  return vehicleCritComponentNames[kind];
}

function hasExplosiveAmmoForVehicle(
  ammoState: Record<string, IAmmoSlotState> | undefined,
): boolean {
  return Object.values(ammoState ?? {}).some(
    (bin) => bin.isExplosive && bin.remainingRounds > 0,
  );
}

function selectExplosiveAmmoForVehicle(
  ammoState: Record<string, IAmmoSlotState> | undefined,
  location: VehicleLocation | VTOLLocation,
): IAmmoSlotState | undefined {
  const bins = Object.values(ammoState ?? {});
  return (
    bins.find(
      (bin) =>
        bin.location === location && bin.isExplosive && bin.remainingRounds > 0,
    ) ?? bins.find((bin) => bin.isExplosive && bin.remainingRounds > 0)
  );
}

function computeAmmoExplosionDamage(ammo: IAmmoSlotState | undefined): number {
  if (!ammo) {
    return 0;
  }
  return ammo.remainingRounds * (ammo.damagePerRound ?? 1);
}
