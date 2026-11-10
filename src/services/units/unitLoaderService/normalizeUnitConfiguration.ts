import { UnitState, createEmptySelectionMemory } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  CockpitType,
  getCockpitTypeFromSystems,
} from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  LAMMode,
  QuadVeeMode,
} from '@/types/construction/MechConfigurationSystem';
import {
  createDefaultComponentTechBases,
  TechBaseComponent,
} from '@/types/construction/TechBaseConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  getMechCrewType,
  normalizeMechCrewSeats,
} from '@/types/pilot/MechCrewSeats';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { cloneSerializedStructure } from '@/utils/serialization/structureMetadata';

import type { IRawSerializedUnit } from './types';

import { deriveEffectiveConfiguration } from '../../../utils/construction/mechBV/calculatorSetup';
import { calculateArmorTonnage } from './armorCalculations';
import {
  mapEngineType,
  mapGyroType,
  mapStructureType,
  mapCockpitType,
  mapHeatSinkType,
  mapArmorType,
  mapTechBase,
  mapTechBaseMode,
  mapRulesLevel,
  mapArmorAllocation,
} from './componentMappers';
import { getCriticalSlotsForLocation } from './criticalSlotEquipment';
import { parseCriticalSlotToken } from './equipmentResolution';
import { mapMovementConfiguration } from './movementConfiguration';

function deriveArmActuators(
  serialized: IRawSerializedUnit,
): UnitState['armActuators'] {
  const result: Partial<
    Record<MechLocation, { lowerArm: boolean; hand: boolean }>
  > = {};
  for (const location of [
    MechLocation.LEFT_ARM,
    MechLocation.RIGHT_ARM,
  ] as const) {
    const slots = getCriticalSlotsForLocation(
      serialized.criticalSlots,
      location,
    )?.map((token) =>
      parseCriticalSlotToken(token ?? '').lookupToken.toLowerCase(),
    );
    // Equipment-only older saves have no actuator evidence; retain their defaults.
    if (!slots?.includes('shoulder')) continue;
    result[location] = {
      lowerArm: slots.some((token) => token.startsWith('lower arm')),
      hand: slots.some((token) => token.startsWith('hand')),
    };
  }
  return result;
}

interface IUnitTechBaseContext {
  readonly techBaseMode: UnitState['techBaseMode'];
  readonly techBase: TechBase;
}

type UnitIdentityState = Pick<
  UnitState,
  | 'name'
  | 'chassis'
  | 'clanName'
  | 'model'
  | 'mulId'
  | 'role'
  | 'fluff'
  | 'year'
  | 'rulesLevel'
  | 'tonnage'
  | 'techBase'
>;

type UnitConfigurationState = Pick<
  UnitState,
  | 'unitType'
  | 'configuration'
  | 'lamMode'
  | 'lamType'
  | 'quadVeeMode'
  | 'isOmni'
  | 'baseChassisHeatSinks'
  | 'techBaseMode'
  | 'componentTechBases'
  | 'selectionMemory'
>;

type EngineState = Pick<UnitState, 'engineType' | 'engineRating'>;
type HeatSinkState = Pick<UnitState, 'heatSinkType' | 'heatSinkCount'>;
type ArmorState = Pick<
  UnitState,
  'armorType' | 'armorTonnage' | 'armorAllocation'
>;

function deriveTechBaseContext(
  serialized: IRawSerializedUnit,
): IUnitTechBaseContext {
  return {
    techBaseMode: mapTechBaseMode(serialized.techBase),
    techBase: mapTechBase(serialized.techBase),
  };
}

function deriveEngineState(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
): EngineState {
  const engineType = serialized.engine?.type
    ? mapEngineType(serialized.engine.type, techBase)
    : EngineType.STANDARD;
  const engineRating =
    serialized.engine?.rating ??
    (serialized.movement?.walk ?? 4) * serialized.tonnage;

  return { engineType, engineRating };
}

function deriveGyroType(serialized: IRawSerializedUnit): GyroType {
  return serialized.gyro?.type
    ? mapGyroType(serialized.gyro.type)
    : GyroType.STANDARD;
}

function deriveStructureType(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
): InternalStructureType {
  return serialized.structure?.type
    ? mapStructureType(serialized.structure.type, techBase)
    : InternalStructureType.STANDARD;
}

function deriveCockpitType(serialized: IRawSerializedUnit): CockpitType {
  const declared = serialized.cockpit
    ? mapCockpitType(serialized.cockpit)
    : CockpitType.STANDARD;
  if (declared !== CockpitType.STANDARD) return declared;
  const systems = (location: MechLocation): string[] =>
    (getCriticalSlotsForLocation(serialized.criticalSlots, location) ?? []).map(
      (token) => parseCriticalSlotToken(token ?? '').lookupToken.toLowerCase(),
    );
  return (
    getCockpitTypeFromSystems(
      systems(MechLocation.HEAD),
      systems(MechLocation.CENTER_TORSO),
      systems(MechLocation.LEFT_TORSO),
      systems(MechLocation.RIGHT_TORSO),
    ) ?? declared
  );
}

function deriveHeatSinkState(serialized: IRawSerializedUnit): HeatSinkState {
  return {
    heatSinkType: serialized.heatSinks?.type
      ? mapHeatSinkType(serialized.heatSinks.type)
      : HeatSinkType.SINGLE,
    heatSinkCount: serialized.heatSinks?.count ?? 10,
  };
}

function deriveArmorState(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
  configuration: MechConfiguration,
): ArmorState {
  const armorType = serialized.armor?.type
    ? mapArmorType(serialized.armor.type, techBase)
    : ArmorTypeEnum.STANDARD;
  const armorAllocation = mapArmorAllocation(serialized.armor?.allocation);

  return {
    armorType,
    armorAllocation,
    armorTonnage: calculateArmorTonnage(
      armorAllocation,
      armorType,
      configuration,
    ),
  };
}

function deriveRulesLevel(serialized: IRawSerializedUnit): RulesLevel {
  return serialized.rulesLevel
    ? mapRulesLevel(serialized.rulesLevel)
    : RulesLevel.STANDARD;
}

function deriveModel(serialized: IRawSerializedUnit): string {
  return serialized.model ?? serialized.variant ?? '';
}

function deriveIdentityState(
  serialized: IRawSerializedUnit,
  model: string,
  rulesLevel: RulesLevel,
  techBase: TechBase,
): UnitIdentityState {
  return {
    name: `${serialized.chassis}${model ? ' ' + model : ''}`,
    chassis: serialized.chassis,
    clanName: serialized.clanName ?? '',
    model,
    mulId: String(serialized.mulId ?? -1),
    role: serialized.role ?? '',
    fluff: serialized.fluff ?? {},
    year: serialized.year ?? 3025,
    rulesLevel,
    tonnage: serialized.tonnage,
    techBase,
  };
}

/** Saved Mixed Tech selections over the unit-wide default; absent keys keep the default. */
function deriveComponentTechBases(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
): UnitState['componentTechBases'] {
  const components = createDefaultComponentTechBases(techBase);
  for (const component of Object.keys(components) as TechBaseComponent[]) {
    const saved = serialized.componentTechBases?.[component];
    if (saved)
      components[component] =
        saved === 'CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE;
  }
  return components;
}

function deriveConfigurationState(
  serialized: IRawSerializedUnit,
  techBase: TechBase,
  techBaseMode: UnitState['techBaseMode'],
): UnitConfigurationState {
  return {
    unitType: (serialized.unitType as UnitType) || 'BattleMech',
    configuration:
      Object.values(MechConfiguration).find(
        (config) =>
          config ===
          deriveEffectiveConfiguration(
            serialized.configuration,
            (serialized.cockpit ?? '').toUpperCase(),
            [],
          ),
      ) ?? MechConfiguration.BIPED,
    lamMode: LAMMode.MECH,
    lamType:
      typeof serialized.lamType === 'string' ? serialized.lamType : undefined,
    quadVeeMode: QuadVeeMode.MECH,
    isOmni: serialized.isOmni ?? false,
    baseChassisHeatSinks: serialized.baseChassisHeatSinks ?? -1,
    techBaseMode,
    componentTechBases: deriveComponentTechBases(serialized, techBase),
    selectionMemory: createEmptySelectionMemory(),
  };
}

export type NormalizedUnitConfiguration = Omit<
  UnitState,
  'id' | 'isModified' | 'createdAt' | 'lastModifiedAt' | 'sourceDefinition'
>;

/** Saved Tripod/QuadVee seats; a configuration without native seats reopens blank. */
function deriveCrewSeats(
  serialized: IRawSerializedUnit,
  configuration: MechConfiguration,
  tonnage: number,
): UnitState['crewSeats'] {
  return getMechCrewType(configuration, tonnage)
    ? normalizeMechCrewSeats(serialized.crewSeats)
    : undefined;
}

export function normalizeUnitConfiguration(
  serialized: IRawSerializedUnit,
  equipment: UnitState['equipment'],
): NormalizedUnitConfiguration {
  const { techBaseMode, techBase } = deriveTechBaseContext(serialized);
  const model = deriveModel(serialized);
  const rulesLevel = deriveRulesLevel(serialized);
  const configuration = deriveConfigurationState(
    serialized,
    techBase,
    techBaseMode,
  );
  const normalized = {
    ...deriveIdentityState(serialized, model, rulesLevel, techBase),
    ...configuration,
    ...deriveEngineState(serialized, techBase),
    gyroType: deriveGyroType(serialized),
    internalStructureType: deriveStructureType(serialized, techBase),
    ...(serialized.structure?.typeByLocation !== undefined ||
    serialized.structure?.locationTonnage !== undefined
      ? { frankenStructure: cloneSerializedStructure(serialized.structure) }
      : {}),
    cockpitType: deriveCockpitType(serialized),
    ...deriveHeatSinkState(serialized),
    ...deriveArmorState(serialized, techBase, configuration.configuration),
    ...mapMovementConfiguration(serialized.movement),
    equipment,
    armActuators: deriveArmActuators(serialized),
  };
  const crewSeats = deriveCrewSeats(
    serialized,
    normalized.configuration,
    normalized.tonnage,
  );
  return {
    ...normalized,
    ...(crewSeats ? { crewSeats } : {}),
    bvContext: {
      source: serialized,
      equipment,
      types: {
        engineType: normalized.engineType,
        gyroType: normalized.gyroType,
        internalStructureType: normalized.internalStructureType,
        cockpitType: normalized.cockpitType,
        armorType: normalized.armorType,
        heatSinkType: normalized.heatSinkType,
      },
    },
  };
}
