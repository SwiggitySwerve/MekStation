import type {
  ILocationDefinition,
  ILAMModeDefinition,
  IQuadVeeModeDefinition,
  IMechConfigurationDefinition,
} from './MechConfigTypes';

import { BIPED_CONFIGURATION } from './bipedConfig';
import { LAM_CONFIGURATION } from './lamConfig';
import {
  MechConfiguration,
  MechLocation,
  LAMMode,
  QuadVeeMode,
  QUADVEE_MODES,
} from './MechConfigTypes';
import { QUAD_CONFIGURATION } from './quadConfig';
import { QUADVEE_CONFIGURATION } from './quadVeeConfig';
import { TRIPOD_CONFIGURATION } from './tripodConfig';

export interface MechConfigurationRegistry {
  getConfiguration(type: MechConfiguration): IMechConfigurationDefinition;
  getAllConfigurations(): IMechConfigurationDefinition[];
  getLocationDefinitions(
    type: MechConfiguration,
  ): readonly ILocationDefinition[];
  getLocationDefinition(
    type: MechConfiguration,
    location: MechLocation,
  ): ILocationDefinition | undefined;
  hasLocation(type: MechConfiguration, location: MechLocation): boolean;
  getValidLocations(type: MechConfiguration): MechLocation[];
  getDiagramComponentName(type: MechConfiguration): string;
  isQuadConfiguration(type: MechConfiguration): boolean;
  isTransformingConfiguration(type: MechConfiguration): boolean;
  isLAMConfiguration(type: MechConfiguration): boolean;
  getModes(type: MechConfiguration): readonly ILAMModeDefinition[] | undefined;
  getModeDefinition(
    type: MechConfiguration,
    mode: LAMMode,
  ): ILAMModeDefinition | undefined;
  getFighterArmorMapping(
    type: MechConfiguration,
  ): Readonly<Record<MechLocation, MechLocation>> | undefined;
  isQuadVeeConfiguration(type: MechConfiguration): boolean;
  getQuadVeeModes(): readonly IQuadVeeModeDefinition[];
  getQuadVeeModeDefinition(
    mode: QuadVeeMode,
  ): IQuadVeeModeDefinition | undefined;
  getRequiredEquipment(
    type: MechConfiguration,
  ): readonly { equipmentId: string; locations: readonly MechLocation[] }[];
  getProhibitedEquipment(type: MechConfiguration): readonly string[];
  getMaxTonnage(type: MechConfiguration): number | undefined;
}

const configurations = new Map<MechConfiguration, IMechConfigurationDefinition>(
  [
    [MechConfiguration.BIPED, BIPED_CONFIGURATION],
    [MechConfiguration.QUAD, QUAD_CONFIGURATION],
    [MechConfiguration.TRIPOD, TRIPOD_CONFIGURATION],
    [MechConfiguration.LAM, LAM_CONFIGURATION],
    [MechConfiguration.QUADVEE, QUADVEE_CONFIGURATION],
  ],
);

function getConfiguration(
  type: MechConfiguration,
): IMechConfigurationDefinition {
  return configurations.get(type) ?? BIPED_CONFIGURATION;
}

function getModes(
  type: MechConfiguration,
): readonly ILAMModeDefinition[] | undefined {
  return getConfiguration(type).modes;
}

function getModeDefinition(
  type: MechConfiguration,
  mode: LAMMode,
): ILAMModeDefinition | undefined {
  const modes = getModes(type);
  return modes?.find((m) => m.mode === mode);
}

export const configurationRegistry: MechConfigurationRegistry = {
  getConfiguration,

  getAllConfigurations: () => Array.from(configurations.values()),

  getLocationDefinitions: (type) => getConfiguration(type).locations,

  getLocationDefinition: (type, location) =>
    getConfiguration(type).locations.find((loc) => loc.id === location),

  hasLocation: (type, location) =>
    getConfiguration(type).locations.some((loc) => loc.id === location),

  getValidLocations: (type) =>
    getConfiguration(type).locations.map((loc) => loc.id),

  getDiagramComponentName: (type) =>
    getConfiguration(type).diagramComponentName,

  isQuadConfiguration: (type) =>
    type === MechConfiguration.QUAD || type === MechConfiguration.QUADVEE,

  isTransformingConfiguration: (type) =>
    type === MechConfiguration.LAM || type === MechConfiguration.QUADVEE,

  isLAMConfiguration: (type) => type === MechConfiguration.LAM,

  getModes,

  getModeDefinition,

  getFighterArmorMapping: (type) =>
    getModeDefinition(type, LAMMode.FIGHTER)?.armorLocationMapping,

  isQuadVeeConfiguration: (type) => type === MechConfiguration.QUADVEE,

  getQuadVeeModes: () => QUADVEE_MODES,

  getQuadVeeModeDefinition: (mode) =>
    QUADVEE_MODES.find((m) => m.mode === mode),

  getRequiredEquipment: (type) =>
    getConfiguration(type).requiredEquipment ?? [],

  getProhibitedEquipment: (type) => getConfiguration(type).prohibitedEquipment,

  getMaxTonnage: (type) => (type === MechConfiguration.LAM ? 55 : undefined),
};
