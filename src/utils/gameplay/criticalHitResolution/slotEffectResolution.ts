import { CriticalEffectType, ICriticalEffect } from '@/types/gameplay';

import { applyActuatorHit } from './actuatorEffects';
import { applyEngineHit, applyGyroHit, applyCockpitHit } from './engineEffects';
import {
  applyWeaponHit,
  applyHeatSinkHit,
  applyJumpJetHit,
  applyAmmoHit,
} from './equipmentEffects';
import { applySensorHit, applyLifeSupportHit } from './sensorEffects';
import {
  addUniqueString,
  autocannonCriticalKey,
  isArtemisFcsCriticalSlot,
  isEmergencyCoolantSystemEquipment,
  isHarJelEquipment,
  isHarJelSecondaryCriticalEquipment,
  isPlaytest3FirstAutocannonCritical,
  isRiscLaserPulseModuleLinkedCritical,
  isShieldEquipment,
  isSuperCooledMyomerEquipment,
  representedEquipmentExplosionDamage,
  representedHotLoadedWeaponExplosionDamage,
} from './slotEffectPredicates';
import {
  CriticalHitEvent,
  CriticalSlotComponentType,
  IComponentDamageState,
  ICriticalEffectOptions,
  ICriticalSlotEntry,
} from './types';

const SCM_CRITICAL_DISABLE_THRESHOLD = 6;

type CriticalComponentEffectHandler = (
  slot: ICriticalSlotEntry,
  unitId: string,
  location: string,
  componentDamage: IComponentDamageState,
  events: CriticalHitEvent[],
) => { effect: ICriticalEffect; updatedDamage: IComponentDamageState };

export interface CriticalSlotEffectResolution {
  readonly effect: ICriticalEffect;
  readonly updatedDamage: IComponentDamageState;
  readonly destroyed: boolean;
  readonly slotDestroyed: boolean;
  readonly secondaryCriticals: number;
  readonly representedExplosionDamage?: number;
  readonly linkedCriticalWeaponId?: string;
  readonly linkedCriticalWeaponName?: string;
  readonly breached?: boolean;
}

const STANDARD_COMPONENT_HANDLERS: Partial<
  Record<CriticalSlotComponentType, CriticalComponentEffectHandler>
> = {
  engine: (_slot, unitId, location, componentDamage, events) =>
    applyEngineHit(unitId, location, componentDamage, events),
  gyro: (_slot, unitId, location, componentDamage, events) =>
    applyGyroHit(unitId, location, componentDamage, events),
  cockpit: (_slot, unitId, location, componentDamage, events) =>
    applyCockpitHit(unitId, location, componentDamage, events),
  sensor: (_slot, unitId, location, componentDamage, events) =>
    applySensorHit(unitId, location, componentDamage, events),
  life_support: (_slot, unitId, location, componentDamage, events) =>
    applyLifeSupportHit(unitId, location, componentDamage, events),
  actuator: (slot, unitId, location, componentDamage, events) =>
    applyActuatorHit(slot, unitId, location, componentDamage, events),
  heat_sink: (_slot, unitId, location, componentDamage, events) =>
    applyHeatSinkHit(unitId, location, componentDamage, events),
  jump_jet: (_slot, unitId, location, componentDamage, events) =>
    applyJumpJetHit(unitId, location, componentDamage, events),
  ammo: (slot, unitId, location, componentDamage, events) =>
    applyAmmoHit(slot, unitId, location, componentDamage, events),
};

export function resolveCriticalSlotEffect(options: {
  readonly slot: ICriticalSlotEntry;
  readonly unitId: string;
  readonly location: string;
  readonly componentDamage: IComponentDamageState;
  readonly events: CriticalHitEvent[];
  readonly effectOptions: ICriticalEffectOptions;
}): CriticalSlotEffectResolution {
  const { componentDamage, effectOptions, events, location, slot, unitId } =
    options;
  const standardHandler = STANDARD_COMPONENT_HANDLERS[slot.componentType];
  if (standardHandler) {
    return toResolution(
      standardHandler(slot, unitId, location, componentDamage, events),
    );
  }

  if (slot.componentType === 'weapon') {
    return resolveWeaponCriticalSlot(slot, {
      componentDamage,
      effectOptions,
      events,
      location,
      unitId,
    });
  }

  return resolveEquipmentCriticalSlot(slot, {
    componentDamage,
    effectOptions,
    location,
  });
}

function toResolution(result: {
  effect: ICriticalEffect;
  updatedDamage: IComponentDamageState;
}): CriticalSlotEffectResolution {
  return {
    ...result,
    destroyed: true,
    slotDestroyed: true,
    secondaryCriticals: 0,
  };
}

function resolveWeaponCriticalSlot(
  slot: ICriticalSlotEntry,
  context: {
    readonly componentDamage: IComponentDamageState;
    readonly effectOptions: ICriticalEffectOptions;
    readonly events: CriticalHitEvent[];
    readonly location: string;
    readonly unitId: string;
  },
): CriticalSlotEffectResolution {
  const { componentDamage, effectOptions, events, location, unitId } = context;
  const hotLoadedExplosionDamage = representedHotLoadedWeaponExplosionDamage(
    slot,
    effectOptions,
  );

  if (
    isPlaytest3FirstAutocannonCritical(slot, componentDamage, effectOptions)
  ) {
    return createPlaytestAutocannonFirstCritResolution(slot, componentDamage);
  }

  if (hotLoadedExplosionDamage !== undefined) {
    return createExplosionResolution(
      slot,
      componentDamage,
      hotLoadedExplosionDamage,
    );
  }

  return toResolution(
    applyWeaponHit(slot, unitId, location, componentDamage, events),
  );
}

function resolveEquipmentCriticalSlot(
  slot: ICriticalSlotEntry,
  context: {
    readonly componentDamage: IComponentDamageState;
    readonly effectOptions: ICriticalEffectOptions;
    readonly location: string;
  },
): CriticalSlotEffectResolution {
  const { componentDamage, effectOptions, location } = context;
  const equipmentExplosionDamage = representedEquipmentExplosionDamage(
    slot,
    effectOptions,
  );

  if (
    isPlaytest3FirstAutocannonCritical(slot, componentDamage, effectOptions)
  ) {
    return withArtemisLinkedWeapon(
      slot,
      createPlaytestAutocannonFirstCritResolution(slot, componentDamage),
    );
  }

  if (isShieldEquipment(slot) && equipmentExplosionDamage === undefined) {
    return withArtemisLinkedWeapon(
      slot,
      createEquipmentHitResolution(slot, componentDamage, true),
    );
  }

  if (isSuperCooledMyomerEquipment(slot)) {
    return withArtemisLinkedWeapon(
      slot,
      resolveSuperCooledMyomerCritical(slot, componentDamage),
    );
  }

  if (isEmergencyCoolantSystemEquipment(slot)) {
    return withArtemisLinkedWeapon(
      slot,
      resolveEmergencyCoolantSystemCritical(
        slot,
        componentDamage,
        equipmentExplosionDamage,
      ),
    );
  }

  if (isHarJelEquipment(slot)) {
    return withArtemisLinkedWeapon(
      slot,
      resolveHarJelCritical(slot, componentDamage, location),
    );
  }

  if (isHarJelSecondaryCriticalEquipment(slot, effectOptions)) {
    return withArtemisLinkedWeapon(slot, {
      ...createEquipmentDestroyedResolution(slot, componentDamage),
      secondaryCriticals: 1,
    });
  }

  if (isRiscLaserPulseModuleLinkedCritical(slot, componentDamage)) {
    return resolveRiscLaserPulseModuleCritical(slot, componentDamage);
  }

  if (equipmentExplosionDamage !== undefined) {
    return withArtemisLinkedWeapon(
      slot,
      createExplosionResolution(
        slot,
        componentDamage,
        equipmentExplosionDamage,
      ),
    );
  }

  return withArtemisLinkedWeapon(
    slot,
    createEquipmentDestroyedResolution(slot, componentDamage),
  );
}

function createPlaytestAutocannonFirstCritResolution(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
): CriticalSlotEffectResolution {
  const autocannonKey = autocannonCriticalKey(slot);
  return {
    effect: {
      type: CriticalEffectType.EquipmentHit,
      equipmentHit: slot.componentName,
    },
    updatedDamage: {
      ...componentDamage,
      playtestAutocannonFirstCrits: addUniqueString(
        componentDamage.playtestAutocannonFirstCrits,
        autocannonKey,
      ),
    },
    destroyed: false,
    slotDestroyed: false,
    secondaryCriticals: 0,
  };
}

function createEquipmentHitResolution(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
  slotDestroyed: boolean,
): CriticalSlotEffectResolution {
  return {
    effect: {
      type: CriticalEffectType.EquipmentHit,
      equipmentHit: slot.componentName,
    },
    updatedDamage: componentDamage,
    destroyed: false,
    slotDestroyed,
    secondaryCriticals: 0,
  };
}

function createEquipmentDestroyedResolution(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
): CriticalSlotEffectResolution {
  return {
    effect: {
      type: CriticalEffectType.EquipmentDestroyed,
      equipmentDestroyed: slot.componentName,
    },
    updatedDamage: componentDamage,
    destroyed: true,
    slotDestroyed: true,
    secondaryCriticals: 0,
  };
}

function createExplosionResolution(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
  explosionDamage: number,
): CriticalSlotEffectResolution {
  return {
    effect: {
      type: CriticalEffectType.AmmoExplosion,
      equipmentDestroyed: slot.componentName,
      additionalDamage: explosionDamage,
    },
    updatedDamage: componentDamage,
    destroyed: true,
    slotDestroyed: true,
    secondaryCriticals: 0,
    representedExplosionDamage: explosionDamage,
  };
}

function resolveSuperCooledMyomerCritical(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
): CriticalSlotEffectResolution {
  const superCooledMyomerHits =
    (componentDamage.superCooledMyomerHits ?? 0) + 1;
  const updatedDamage = { ...componentDamage, superCooledMyomerHits };
  if (superCooledMyomerHits >= SCM_CRITICAL_DISABLE_THRESHOLD) {
    return createEquipmentDestroyedResolution(slot, updatedDamage);
  }

  return createEquipmentHitResolution(slot, updatedDamage, true);
}

function resolveEmergencyCoolantSystemCritical(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
  explosionDamage: number | undefined,
): CriticalSlotEffectResolution {
  const updatedDamage = {
    ...componentDamage,
    emergencyCoolantSystemDamaged: true,
  };

  if (explosionDamage !== undefined) {
    return createExplosionResolution(slot, updatedDamage, explosionDamage);
  }

  return createEquipmentDestroyedResolution(slot, updatedDamage);
}

function resolveHarJelCritical(
  slot: ICriticalSlotEntry,
  componentDamage: IComponentDamageState,
  location: string,
): CriticalSlotEffectResolution {
  return {
    ...createEquipmentDestroyedResolution(slot, {
      ...componentDamage,
      breachedLocations: addUniqueString(
        componentDamage.breachedLocations,
        location,
      ),
    }),
    breached: true,
  };
}

function resolveRiscLaserPulseModuleCritical(
  slot: ICriticalSlotEntry & { readonly linkedCriticalWeaponId: string },
  componentDamage: IComponentDamageState,
): CriticalSlotEffectResolution {
  const linkedWeaponId = slot.linkedCriticalWeaponId;
  const linkedWeaponName = slot.linkedCriticalWeaponName ?? linkedWeaponId;
  return {
    effect: {
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: linkedWeaponName,
      weaponDisabled: linkedWeaponId,
    },
    updatedDamage: {
      ...componentDamage,
      weaponsDestroyed: [...componentDamage.weaponsDestroyed, linkedWeaponId],
    },
    destroyed: true,
    slotDestroyed: true,
    secondaryCriticals: 0,
    linkedCriticalWeaponId: linkedWeaponId,
    linkedCriticalWeaponName: linkedWeaponName,
  };
}

function withArtemisLinkedWeapon(
  slot: ICriticalSlotEntry,
  resolution: CriticalSlotEffectResolution,
): CriticalSlotEffectResolution {
  if (
    resolution.linkedCriticalWeaponId !== undefined ||
    !isArtemisFcsCriticalSlot(slot)
  ) {
    return resolution;
  }

  return {
    ...resolution,
    linkedCriticalWeaponId: slot.linkedCriticalWeaponId,
    linkedCriticalWeaponName: slot.linkedCriticalWeaponName,
  };
}
