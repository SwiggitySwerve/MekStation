import type {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IUnitDestroyedPayload,
  IUnitGameState,
  IVehicleCombatState,
} from '@/types/gameplay';

type VehicleCombatEnvelope = IUnitGameState['combatState'];
type VehicleDestructionCause = NonNullable<
  IVehicleCombatState['destructionCause']
>;
type VehicleCriticalHandler = (
  vehicle: IVehicleCombatState,
) => IVehicleCombatState;

const VEHICLE_CRITICAL_EFFECT_HANDLERS: Readonly<
  Record<string, VehicleCriticalHandler>
> = {
  ammo_explosion: destroyVehicle('ammo_explosion'),
  commander_hit: applyCommanderHit,
  copilot_hit: applyDriverHit,
  crew_killed: destroyVehicle('crew_killed'),
  crew_stunned: applyCrewStun,
  driver_hit: applyDriverHit,
  engine_hit: applyEngineHit,
  fuel_tank: destroyVehicle('fuel_tank_explosion'),
  pilot_hit: applyDriverHit,
  rotor_damage: applyRotorDamage,
  rotor_destroyed: immobilizeVehicle,
  turret_destroyed: destroyVehicle('turret_destroyed'),
  turret_jammed: lockTurret,
  turret_locked: lockTurret,
};

export function applyVehicleDamageToCombatState(
  unit: IUnitGameState,
  payload: IDamageAppliedPayload,
  destroyedLocations: readonly string[],
): VehicleCombatEnvelope {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicle = unit.combatState.state;
  const armor = {
    ...(vehicle.armor as Record<string, number>),
    [payload.location]: payload.armorRemaining,
  } as IVehicleCombatState['armor'];
  const structure = {
    ...(vehicle.structure as Record<string, number>),
    [payload.location]: payload.structureRemaining,
  } as IVehicleCombatState['structure'];

  return {
    kind: 'vehicle',
    state: {
      ...vehicle,
      armor,
      structure,
      destroyedLocations:
        destroyedLocations as IVehicleCombatState['destroyedLocations'],
    },
  };
}

export function applyVehicleDestroyedToCombatState(
  unit: IUnitGameState,
  payload: IUnitDestroyedPayload,
): VehicleCombatEnvelope {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicle = unit.combatState.state;
  return {
    kind: 'vehicle',
    state: {
      ...vehicle,
      destroyed: true,
      destructionCause:
        vehicle.destructionCause ??
        vehicleCauseFromUnitDestroyed(payload.cause),
    },
  };
}

export function applyVehicleCriticalToCombatState(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): VehicleCombatEnvelope {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicle = cloneVehicleMutableState(unit.combatState.state);
  const handler = VEHICLE_CRITICAL_EFFECT_HANDLERS[payload.effect];
  return { kind: 'vehicle', state: handler ? handler(vehicle) : vehicle };
}

function cloneVehicleMutableState(
  vehicle: IVehicleCombatState,
): IVehicleCombatState {
  return { ...vehicle, motive: { ...vehicle.motive } };
}

function vehicleCauseFromUnitDestroyed(
  cause: IUnitDestroyedPayload['cause'],
): IVehicleCombatState['destructionCause'] {
  if (cause === 'ammo_explosion' || cause === 'engine_destroyed') {
    return cause;
  }
  return 'damage';
}

function destroyVehicle(
  cause: VehicleDestructionCause,
): VehicleCriticalHandler {
  return (vehicle) => ({
    ...vehicle,
    destroyed: true,
    destructionCause: cause,
  });
}

function applyCrewStun(vehicle: IVehicleCombatState): IVehicleCombatState {
  return {
    ...vehicle,
    motive: {
      ...vehicle.motive,
      crewStunnedPhases: vehicle.motive.crewStunnedPhases + 2,
    },
  };
}

function applyDriverHit(vehicle: IVehicleCombatState): IVehicleCombatState {
  const driverHits = vehicle.motive.driverHits + 1;
  return {
    ...vehicle,
    motive: { ...vehicle.motive, driverHits },
    ...(driverHits >= 2
      ? { destroyed: true as const, destructionCause: 'crew_killed' as const }
      : {}),
  };
}

function applyCommanderHit(vehicle: IVehicleCombatState): IVehicleCombatState {
  const commanderHits = vehicle.motive.commanderHits + 1;
  return {
    ...vehicle,
    motive: { ...vehicle.motive, commanderHits },
    ...(commanderHits >= 2
      ? { destroyed: true as const, destructionCause: 'crew_killed' as const }
      : {}),
  };
}

function applyEngineHit(vehicle: IVehicleCombatState): IVehicleCombatState {
  const engineHits = vehicle.motive.engineHits + 1;
  return {
    ...vehicle,
    motive: { ...vehicle.motive, engineHits },
    ...(engineHits >= 2
      ? {
          destroyed: true as const,
          destructionCause: 'engine_destroyed' as const,
        }
      : {}),
  };
}

function lockTurret(vehicle: IVehicleCombatState): IVehicleCombatState {
  return {
    ...vehicle,
    turretLock: { ...vehicle.turretLock, primaryLocked: true },
    motive: { ...vehicle.motive, turretLocked: true },
  };
}

function applyRotorDamage(vehicle: IVehicleCombatState): IVehicleCombatState {
  // VTOL rotor damage: each hit adds 1 MP penalty; immobilized once the
  // penalty reaches original cruise MP (MegaMek `VTOL.CRIT_ROTOR_DAMAGE`).
  const penaltyMP = vehicle.motive.penaltyMP + 1;
  return {
    ...vehicle,
    motive: {
      ...vehicle.motive,
      penaltyMP,
      immobilized:
        vehicle.motive.immobilized ||
        penaltyMP >= vehicle.motive.originalCruiseMP,
    },
  };
}

function immobilizeVehicle(vehicle: IVehicleCombatState): IVehicleCombatState {
  return {
    ...vehicle,
    motive: { ...vehicle.motive, immobilized: true },
  };
}
