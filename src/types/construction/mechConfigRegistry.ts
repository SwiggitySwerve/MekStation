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

class MechConfigurationRegistry {
  private readonly configurations: Map<
    MechConfiguration,
    IMechConfigurationDefinition
  >;

  constructor() {
    this.configurations = new Map([
      [MechConfiguration.BIPED, BIPED_CONFIGURATION],
      [MechConfiguration.QUAD, QUAD_CONFIGURATION],
      [MechConfiguration.TRIPOD, TRIPOD_CONFIGURATION],
      [MechConfiguration.LAM, LAM_CONFIGURATION],
      [MechConfiguration.QUADVEE, QUADVEE_CONFIGURATION],
    ]);
  }

  getConfiguration(type: MechConfiguration): IMechConfigurationDefinition {
    const config = this.configurations.get(type);
    if (!config) {
      return BIPED_CONFIGURATION;
    }
    return config;
  }

  getAllConfigurations(): IMechConfigurationDefinition[] {
    return Array.from(this.configurations.values());
  }

  getLocationDefinitions(
    type: MechConfiguration,
  ): readonly ILocationDefinition[] {
    return this.getConfiguration(type).locations;
  }

  getLocationDefinition(
    type: MechConfiguration,
    location: MechLocation,
  ): ILocationDefinition | undefined {
    return this.getConfiguration(type).locations.find(
      (loc) => loc.id === location,
    );
  }

  hasLocation(type: MechConfiguration, location: MechLocation): boolean {
    return this.getConfiguration(type).locations.some(
      (loc) => loc.id === location,
    );
  }

  getValidLocations(type: MechConfiguration): MechLocation[] {
    return this.getConfiguration(type).locations.map((loc) => loc.id);
  }

  getDiagramComponentName(type: MechConfiguration): string {
    return this.getConfiguration(type).diagramComponentName;
  }

  isQuadConfiguration(type: MechConfiguration): boolean {
    return (
      type === MechConfiguration.QUAD || type === MechConfiguration.QUADVEE
    );
  }

  isTransformingConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.LAM || type === MechConfiguration.QUADVEE;
  }

  isLAMConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.LAM;
  }

  getModes(type: MechConfiguration): readonly ILAMModeDefinition[] | undefined {
    return this.getConfiguration(type).modes;
  }

  getModeDefinition(
    type: MechConfiguration,
    mode: LAMMode,
  ): ILAMModeDefinition | undefined {
    const modes = this.getModes(type);
    return modes?.find((m) => m.mode === mode);
  }

  getFighterArmorMapping(
    type: MechConfiguration,
  ): Readonly<Record<MechLocation, MechLocation>> | undefined {
    const fighterMode = this.getModeDefinition(type, LAMMode.FIGHTER);
    return fighterMode?.armorLocationMapping;
  }

  isQuadVeeConfiguration(type: MechConfiguration): boolean {
    return type === MechConfiguration.QUADVEE;
  }

  getQuadVeeModes(): readonly IQuadVeeModeDefinition[] {
    return QUADVEE_MODES;
  }

  getQuadVeeModeDefinition(
    mode: QuadVeeMode,
  ): IQuadVeeModeDefinition | undefined {
    return QUADVEE_MODES.find((m) => m.mode === mode);
  }

  getRequiredEquipment(
    type: MechConfiguration,
  ): readonly { equipmentId: string; locations: readonly MechLocation[] }[] {
    return this.getConfiguration(type).requiredEquipment ?? [];
  }

  getProhibitedEquipment(type: MechConfiguration): readonly string[] {
    return this.getConfiguration(type).prohibitedEquipment;
  }

  getMaxTonnage(type: MechConfiguration): number | undefined {
    if (type === MechConfiguration.LAM) {
      return 55;
    }
    return undefined;
  }
}

export const configurationRegistry = new MechConfigurationRegistry();

export type { MechConfigurationRegistry };
