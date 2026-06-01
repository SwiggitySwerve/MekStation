import type {
  ICriticalHitResolvedPayload,
  IUnitGameState,
} from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';

export function applyVehicleCriticalToEnvelope(
  unit: IUnitGameState,
  payload: ICriticalHitResolvedPayload,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  switch (payload.effect) {
    case 'engine_hit':
      return applyVehicleEngineHit(unit);
    case 'driver_hit':
    case 'pilot_hit':
      return applyVehicleDriverHit(unit);
    case 'commander_hit':
    case 'copilot_hit':
      return applyVehicleCommanderHit(unit);
    case 'crew_killed':
      return {
        kind: 'vehicle',
        state: {
          ...vehicleState,
          destroyed: true,
          destructionCause: 'crew_killed',
        },
      };
    case 'fuel_tank':
      return {
        kind: 'vehicle',
        state: {
          ...vehicleState,
          destroyed: true,
          destructionCause: 'fuel_tank_explosion',
        },
      };
    case 'ammo_explosion':
      return {
        kind: 'vehicle',
        state: {
          ...vehicleState,
          destroyed: true,
          destructionCause: 'ammo_explosion',
        },
      };
    case 'turret_locked':
      return {
        kind: 'vehicle',
        state: {
          ...vehicleState,
          turretLock: {
            ...vehicleState.turretLock,
            primaryLocked: true,
          },
          motive: {
            ...vehicleState.motive,
            turretLocked: true,
          },
        },
      };
    case 'turret_destroyed':
      return applyVehicleTurretDestroyed(unit);
    case 'rotor_damage':
      return applyVehicleRotorDamage(unit);
    case 'rotor_destroyed':
      return {
        kind: 'vehicle',
        state: {
          ...vehicleState,
          motive: {
            ...vehicleState.motive,
            immobilized: true,
          },
        },
      };
    default:
      return unit.combatState;
  }
}

function applyVehicleEngineHit(
  unit: IUnitGameState,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  const engineHits = vehicleState.motive.engineHits + 1;
  return {
    kind: 'vehicle',
    state: {
      ...vehicleState,
      motive: {
        ...vehicleState.motive,
        engineHits,
      },
      destroyed: vehicleState.destroyed || engineHits >= 2,
      destructionCause:
        engineHits >= 2 ? 'engine_destroyed' : vehicleState.destructionCause,
    },
  };
}

function applyVehicleDriverHit(
  unit: IUnitGameState,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  const driverHits = vehicleState.motive.driverHits + 1;
  return {
    kind: 'vehicle',
    state: {
      ...vehicleState,
      motive: {
        ...vehicleState.motive,
        driverHits,
      },
      destroyed: vehicleState.destroyed || driverHits >= 2,
      destructionCause:
        driverHits >= 2 ? 'crew_killed' : vehicleState.destructionCause,
    },
  };
}

function applyVehicleCommanderHit(
  unit: IUnitGameState,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  const commanderHits = vehicleState.motive.commanderHits + 1;
  return {
    kind: 'vehicle',
    state: {
      ...vehicleState,
      motive: {
        ...vehicleState.motive,
        commanderHits,
      },
      destroyed: vehicleState.destroyed || commanderHits >= 2,
      destructionCause:
        commanderHits >= 2 ? 'crew_killed' : vehicleState.destructionCause,
    },
  };
}

function applyVehicleTurretDestroyed(
  unit: IUnitGameState,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  const turretLocation = VehicleLocation.TURRET;
  return {
    kind: 'vehicle',
    state: {
      ...vehicleState,
      destroyedLocations: vehicleState.destroyedLocations.includes(
        turretLocation,
      )
        ? vehicleState.destroyedLocations
        : [...vehicleState.destroyedLocations, turretLocation],
      destroyed: true,
      destructionCause: 'turret_destroyed',
    },
  };
}

function applyVehicleRotorDamage(
  unit: IUnitGameState,
): IUnitGameState['combatState'] {
  if (unit.combatState?.kind !== 'vehicle') {
    return unit.combatState;
  }

  const vehicleState = unit.combatState.state;
  const penaltyMP = vehicleState.motive.penaltyMP + 1;
  return {
    kind: 'vehicle',
    state: {
      ...vehicleState,
      motive: {
        ...vehicleState.motive,
        penaltyMP,
        immobilized:
          vehicleState.motive.immobilized ||
          penaltyMP >= vehicleState.motive.originalCruiseMP,
      },
    },
  };
}
