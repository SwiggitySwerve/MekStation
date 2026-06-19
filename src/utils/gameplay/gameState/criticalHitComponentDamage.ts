import type { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import type {
  ICriticalHitResolvedPayload,
  IComponentDamageState,
} from '@/types/gameplay';

import { asCombatLocation } from '@/utils/gameplay/criticalHitResolution/actuatorEffects';

import {
  isAutocannonCriticalComponent,
  isEmergencyCoolantSystemCriticalComponent,
  isHarJelCriticalComponent,
  isRiscLaserPulseModuleLinkedCritical,
  isSuperCooledMyomerCriticalComponent,
} from './criticalHitPayloadPredicates';
import { applyVehicleCriticalLocationDamage } from './vehicleCriticalLocationDamage';

const SCM_CRITICAL_DISABLE_THRESHOLD = 6;

type CriticalDamageHandler = (
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
) => IComponentDamageState;

const COMPONENT_DAMAGE_HANDLERS: Readonly<
  Record<string, CriticalDamageHandler>
> = {
  actuator: applyActuatorCritical,
  cockpit: markCockpitHit,
  engine: incrementEngineHits,
  equipment: applyEquipmentCritical,
  gyro: incrementGyroHits,
  heat_sink: incrementHeatSinkHits,
  jump_jet: incrementJumpJetHits,
  life_support: incrementLifeSupportHits,
  sensor: incrementSensorHits,
  weapon: applyWeaponCritical,
};

export function applyCriticalHitComponentDamage(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  const handler = COMPONENT_DAMAGE_HANDLERS[payload.componentType];
  const updatedDamage = handler
    ? handler({ ...componentDamage }, payload)
    : { ...componentDamage };

  return applyVehicleCriticalLocationDamage(updatedDamage, payload);
}

function incrementEngineHits(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return { ...componentDamage, engineHits: componentDamage.engineHits + 1 };
}

function incrementGyroHits(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return { ...componentDamage, gyroHits: componentDamage.gyroHits + 1 };
}

function incrementSensorHits(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return { ...componentDamage, sensorHits: componentDamage.sensorHits + 1 };
}

function incrementLifeSupportHits(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return { ...componentDamage, lifeSupport: componentDamage.lifeSupport + 1 };
}

function markCockpitHit(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return { ...componentDamage, cockpitHit: true };
}

function incrementHeatSinkHits(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return {
    ...componentDamage,
    heatSinksDestroyed: componentDamage.heatSinksDestroyed + 1,
  };
}

function incrementJumpJetHits(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return {
    ...componentDamage,
    jumpJetsDestroyed: componentDamage.jumpJetsDestroyed + 1,
  };
}

function applyWeaponCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  if (payload.destroyed === false && isAutocannonCriticalComponent(payload)) {
    return applyPlaytestAutocannonFirstCritical(componentDamage, payload);
  }

  return addDestroyedWeapon(
    componentDamage,
    payload.weaponId ?? payload.componentName,
  );
}

function applyActuatorCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  // Per audit 2026-06-09 A-6: mirror `applyActuatorHit`'s per-location
  // bookkeeping into the event-sourced replay path for hull-down pricing,
  // QuadVee conversion gates, and AirMek landing control.
  const combatLocation = asCombatLocation(payload.location);
  return {
    ...componentDamage,
    actuators: {
      ...componentDamage.actuators,
      [payload.componentName]: true,
    },
    ...(combatLocation
      ? {
          actuatorsByLocation: {
            ...componentDamage.actuatorsByLocation,
            [combatLocation]: {
              ...componentDamage.actuatorsByLocation?.[combatLocation],
              [payload.componentName as ActuatorType]: true,
            },
          },
        }
      : {}),
  };
}

function applyEquipmentCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  if (isSuperCooledMyomerCriticalComponent(payload.componentName)) {
    return applySuperCooledMyomerHit(componentDamage);
  }
  if (isEmergencyCoolantSystemCriticalComponent(payload.componentName)) {
    return { ...componentDamage, emergencyCoolantSystemDamaged: true };
  }
  if (payload.destroyed === false && isAutocannonCriticalComponent(payload)) {
    return applyPlaytestAutocannonFirstCritical(componentDamage, payload);
  }
  if (isHarJelCriticalComponent(payload)) {
    return applyHarJelBreachCritical(componentDamage, payload);
  }
  if (isRiscLaserPulseModuleLinkedCritical(payload)) {
    return addDestroyedWeapon(componentDamage, payload.linkedCriticalWeaponId);
  }

  return componentDamage;
}

function applySuperCooledMyomerHit(
  componentDamage: IComponentDamageState,
): IComponentDamageState {
  return {
    ...componentDamage,
    superCooledMyomerHits: Math.min(
      (componentDamage.superCooledMyomerHits ?? 0) + 1,
      SCM_CRITICAL_DISABLE_THRESHOLD,
    ),
  };
}

function applyHarJelBreachCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  return {
    ...componentDamage,
    breachedLocations: addUniqueString(
      componentDamage.breachedLocations,
      payload.location,
    ),
  };
}

function applyPlaytestAutocannonFirstCritical(
  componentDamage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  const key = payload.weaponId ?? payload.componentName;
  const previous = componentDamage.playtestAutocannonFirstCrits ?? [];
  return {
    ...componentDamage,
    playtestAutocannonFirstCrits: previous.includes(key)
      ? previous
      : [...previous, key],
  };
}

function addDestroyedWeapon(
  componentDamage: IComponentDamageState,
  weaponId: string,
): IComponentDamageState {
  return {
    ...componentDamage,
    weaponsDestroyed: [...componentDamage.weaponsDestroyed, weaponId],
  };
}

function addUniqueString(
  values: readonly string[] | undefined,
  value: string,
): readonly string[] {
  return values?.includes(value) ? values : [...(values ?? []), value];
}
