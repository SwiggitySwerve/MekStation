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
  createVehicleCrewStunnedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
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

  const rolledCrit = rollVehicleCrit(input.d6Roller);
  const critResult = applyVehicleCritEffect(
    input.damageResult.state,
    rolledCrit,
    {
      engineType: input.damageResult.state.engineType ?? EngineType.STANDARD,
      hasAmmoInSlot: hasExplosiveAmmoAtLocation(
        input.targetState.ammoState,
        input.location,
      ),
    },
  );

  let currentSession = emitVehicleCriticalEvents(
    input.session,
    input.targetId,
    input.location,
    critResult.applied,
    critResult.state.destroyed,
  );

  if (critResult.ammoExplosion) {
    currentSession = emitAmmoExplosionEvent(
      currentSession,
      input.targetId,
      input.location,
      selectExplosiveAmmoAtLocation(
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

  if (crit.kind === 'crew_stunned') {
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

function vehicleCritComponentType(kind: VehicleCritKind): string {
  switch (kind) {
    case 'ammo_explosion':
      return 'ammo';
    case 'cargo_hit':
      return 'cargo';
    case 'crew_stunned':
      return 'crew';
    case 'driver_hit':
      return 'driver';
    case 'engine_hit':
    case 'fuel_tank':
      return 'engine';
    case 'weapon_destroyed':
      return 'weapon';
    case 'none':
      return 'none';
  }
}

function vehicleCritComponentName(kind: VehicleCritKind): string {
  switch (kind) {
    case 'ammo_explosion':
      return 'Ammo';
    case 'cargo_hit':
      return 'Cargo';
    case 'crew_stunned':
      return 'Crew';
    case 'driver_hit':
      return 'Driver';
    case 'engine_hit':
      return 'Engine';
    case 'fuel_tank':
      return 'Fuel Tank';
    case 'weapon_destroyed':
      return 'Vehicle weapon';
    case 'none':
      return 'None';
  }
}

function hasExplosiveAmmoAtLocation(
  ammoState: Record<string, IAmmoSlotState> | undefined,
  location: VehicleLocation | VTOLLocation,
): boolean {
  return selectExplosiveAmmoAtLocation(ammoState, location) !== undefined;
}

function selectExplosiveAmmoAtLocation(
  ammoState: Record<string, IAmmoSlotState> | undefined,
  location: VehicleLocation | VTOLLocation,
): IAmmoSlotState | undefined {
  return Object.values(ammoState ?? {}).find(
    (bin) =>
      bin.location === location && bin.isExplosive && bin.remainingRounds > 0,
  );
}

function computeAmmoExplosionDamage(ammo: IAmmoSlotState | undefined): number {
  if (!ammo) {
    return 0;
  }
  return ammo.remainingRounds * (ammo.damagePerRound ?? 1);
}
