import type {
  ICriticalHitResolvedPayload,
  IUnitGameState,
} from '@/types/gameplay';

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
    case 'fuel_tank':
      return applyVehicleEngineHit(unit);
    case 'driver_hit':
      return applyVehicleDriverHit(unit);
    case 'ammo_explosion':
      return {
        kind: 'vehicle',
        state: {
          ...vehicleState,
          destroyed: true,
          destructionCause: 'ammo_explosion',
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
