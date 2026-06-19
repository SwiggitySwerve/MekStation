import type { CriticalSlotComponentType } from '@/utils/gameplay/criticalHitResolution';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import type { IWeapon } from '../ai/types';
import type { IUnitEquipmentEntry } from './UnitHydrationTypes';

import { artemisFcsKindFromNormalizedId } from './UnitHydrationArtemis';
import {
  blueShieldExplosionDamageForCriticalSlot,
  equipmentEntryForCriticalSlotWeapon,
  equipmentExplosionMetadataForCriticalSlot,
  hotLoadedCriticalMetadataFromEquipmentEntry,
  isBlueShieldParticleFieldDamperCriticalSlot,
  isEmergencyCoolantSystemCriticalSlot,
  isExtendedFuelTankCriticalSlot,
  isPrototypeImprovedJumpJetCriticalSlot,
  isRiscLaserPulseModuleCriticalSlot,
  linkedWeaponForArtemisFcs,
  linkedWeaponForRiscLaserPulseModule,
  weaponForCriticalSlot,
} from './UnitHydrationCriticalSlotSupport';
import {
  normalizeCriticalSlotText,
  stripCriticalSlotRearMarker,
} from './UnitHydrationText';

export interface ICriticalSlotComponentClassification {
  readonly componentType: CriticalSlotComponentType;
  readonly actuatorType?: ActuatorType;
  readonly weaponId?: string;
  readonly linkedCriticalWeaponId?: string;
  readonly linkedCriticalWeaponName?: string;
  readonly hotLoaded?: boolean;
  readonly explosionDamage?: number;
  readonly explosionRequiresSecondaryEffects?: boolean;
}

interface ICriticalSlotClassificationContext {
  readonly slotText: string;
  readonly normalized: string;
  readonly sourceLocation: string;
  readonly aiWeapons: readonly IWeapon[];
  readonly equipmentEntries: readonly IUnitEquipmentEntry[];
}

type CriticalSlotClassifier = (
  context: ICriticalSlotClassificationContext,
) => ICriticalSlotComponentClassification | undefined;

const ACTUATOR_TYPE_BY_SLOT_TEXT: Readonly<Record<string, ActuatorType>> = {
  [normalizeCriticalSlotText(ActuatorType.SHOULDER)]: ActuatorType.SHOULDER,
  [normalizeCriticalSlotText(ActuatorType.UPPER_ARM)]: ActuatorType.UPPER_ARM,
  [normalizeCriticalSlotText(ActuatorType.LOWER_ARM)]: ActuatorType.LOWER_ARM,
  [normalizeCriticalSlotText(ActuatorType.HAND)]: ActuatorType.HAND,
  [normalizeCriticalSlotText(ActuatorType.HIP)]: ActuatorType.HIP,
  [normalizeCriticalSlotText(ActuatorType.UPPER_LEG)]: ActuatorType.UPPER_LEG,
  [normalizeCriticalSlotText(ActuatorType.LOWER_LEG)]: ActuatorType.LOWER_LEG,
  [normalizeCriticalSlotText(ActuatorType.FOOT)]: ActuatorType.FOOT,
};

const SYSTEM_COMPONENT_CLASSIFIERS: readonly {
  readonly matches: (normalized: string) => boolean;
  readonly componentType: CriticalSlotComponentType;
}[] = [
  {
    matches: (normalized) => normalized.includes('lifesupport'),
    componentType: 'life_support',
  },
  {
    matches: (normalized) => normalized.includes('sensor'),
    componentType: 'sensor',
  },
  {
    matches: (normalized) => normalized.includes('cockpit'),
    componentType: 'cockpit',
  },
  {
    matches: (normalized) => normalized.includes('gyro'),
    componentType: 'gyro',
  },
  {
    matches: (normalized) => normalized.includes('engine'),
    componentType: 'engine',
  },
  {
    matches: (normalized) => normalized.includes('heatsink'),
    componentType: 'heat_sink',
  },
];

const FIXED_EXPLOSIVE_EQUIPMENT_CLASSIFIERS: readonly {
  readonly matches: (normalized: string) => boolean;
  readonly explosionDamage: number;
}[] = [
  {
    matches: isPrototypeImprovedJumpJetCriticalSlot,
    explosionDamage: 10,
  },
  {
    matches: isExtendedFuelTankCriticalSlot,
    explosionDamage: 20,
  },
  {
    matches: isEmergencyCoolantSystemCriticalSlot,
    explosionDamage: 5,
  },
];

const CRITICAL_SLOT_CLASSIFIERS: readonly CriticalSlotClassifier[] = [
  classifyActuator,
  classifySystemComponent,
  classifyFixedExplosiveEquipment,
  classifyBlueShieldParticleFieldDamper,
  classifyRiscLaserPulseModule,
  classifyArtemisFcs,
  classifyWeapon,
  classifyEquipmentExplosion,
  classifyJumpJet,
  classifyAmmo,
];

export function classifyCriticalSlotComponent(
  slotText: string,
  sourceLocation: string,
  aiWeapons: readonly IWeapon[],
  equipmentEntries: readonly IUnitEquipmentEntry[] = [],
): ICriticalSlotComponentClassification {
  const context: ICriticalSlotClassificationContext = {
    slotText,
    normalized: normalizeCriticalSlotText(
      stripCriticalSlotRearMarker(slotText),
    ),
    sourceLocation,
    aiWeapons,
    equipmentEntries,
  };

  for (const classifier of CRITICAL_SLOT_CLASSIFIERS) {
    const classification = classifier(context);
    if (classification !== undefined) return classification;
  }

  return { componentType: 'equipment' };
}

function classifyActuator({
  normalized,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  const actuatorType = ACTUATOR_TYPE_BY_SLOT_TEXT[normalized];
  return actuatorType !== undefined
    ? { componentType: 'actuator', actuatorType }
    : undefined;
}

function classifySystemComponent({
  normalized,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  const systemComponent = SYSTEM_COMPONENT_CLASSIFIERS.find((entry) =>
    entry.matches(normalized),
  );
  return systemComponent !== undefined
    ? { componentType: systemComponent.componentType }
    : undefined;
}

function classifyFixedExplosiveEquipment({
  normalized,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  const equipment = FIXED_EXPLOSIVE_EQUIPMENT_CLASSIFIERS.find((entry) =>
    entry.matches(normalized),
  );
  return equipment !== undefined
    ? explosiveEquipmentClassification(equipment.explosionDamage)
    : undefined;
}

function explosiveEquipmentClassification(
  explosionDamage: number,
): ICriticalSlotComponentClassification {
  return {
    componentType: 'equipment',
    explosionDamage,
    explosionRequiresSecondaryEffects: true,
  };
}

function classifyBlueShieldParticleFieldDamper({
  equipmentEntries,
  normalized,
  sourceLocation,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  if (!isBlueShieldParticleFieldDamperCriticalSlot(normalized)) {
    return undefined;
  }

  const explosionDamage = blueShieldExplosionDamageForCriticalSlot(
    sourceLocation,
    equipmentEntries,
  );
  return {
    componentType: 'equipment',
    ...(explosionDamage !== undefined
      ? {
          explosionDamage,
          explosionRequiresSecondaryEffects: true,
        }
      : {}),
  };
}

function classifyRiscLaserPulseModule({
  aiWeapons,
  equipmentEntries,
  normalized,
  sourceLocation,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  if (!isRiscLaserPulseModuleCriticalSlot(normalized)) return undefined;

  const linkedWeapon = linkedWeaponForRiscLaserPulseModule(
    sourceLocation,
    equipmentEntries,
    aiWeapons,
  );
  return equipmentClassificationWithLinkedWeapon(linkedWeapon);
}

function classifyArtemisFcs({
  aiWeapons,
  equipmentEntries,
  normalized,
  sourceLocation,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  if (artemisFcsKindFromNormalizedId(normalized) === undefined) {
    return undefined;
  }

  const linkedWeapon = linkedWeaponForArtemisFcs(
    normalized,
    sourceLocation,
    equipmentEntries,
    aiWeapons,
  );
  return equipmentClassificationWithLinkedWeapon(linkedWeapon);
}

function equipmentClassificationWithLinkedWeapon(
  linkedWeapon: IWeapon | undefined,
): ICriticalSlotComponentClassification {
  return {
    componentType: 'equipment',
    ...(linkedWeapon !== undefined
      ? {
          linkedCriticalWeaponId: linkedWeapon.id,
          linkedCriticalWeaponName: linkedWeapon.name,
        }
      : {}),
  };
}

function classifyWeapon({
  aiWeapons,
  equipmentEntries,
  slotText,
  sourceLocation,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  const weapon = weaponForCriticalSlot(slotText, sourceLocation, aiWeapons);
  if (weapon === undefined) return undefined;

  const sourceEquipment = equipmentEntryForCriticalSlotWeapon(
    slotText,
    sourceLocation,
    weapon,
    equipmentEntries,
  );
  const hotLoadedMetadata = hotLoadedCriticalMetadataFromEquipmentEntry(
    sourceEquipment,
    equipmentEntries,
  );
  return {
    componentType: 'weapon',
    weaponId: weapon.id,
    ...(hotLoadedMetadata ?? {}),
  };
}

function classifyEquipmentExplosion({
  equipmentEntries,
  normalized,
  sourceLocation,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  const sourceEquipmentExplosionMetadata =
    equipmentExplosionMetadataForCriticalSlot(
      normalized,
      sourceLocation,
      equipmentEntries,
    );
  return sourceEquipmentExplosionMetadata !== undefined
    ? {
        componentType: 'equipment',
        ...sourceEquipmentExplosionMetadata,
      }
    : undefined;
}

function classifyJumpJet({
  normalized,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  return normalized.includes('jumpjet')
    ? { componentType: 'jump_jet' }
    : undefined;
}

function classifyAmmo({
  normalized,
}: ICriticalSlotClassificationContext):
  | ICriticalSlotComponentClassification
  | undefined {
  return normalized.includes('ammo') ? { componentType: 'ammo' } : undefined;
}
