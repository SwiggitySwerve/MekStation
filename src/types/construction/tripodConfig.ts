import type { IMechConfigurationDefinition } from './MechConfigTypes';

import { createStandardTorsoLocationDefinitions } from './bipedConfig';
import {
  createLocationDef,
  ARM_ACTUATORS,
  LEG_ACTUATORS,
} from './mechConfigHelpers';
import { MechConfiguration, MechLocation } from './MechConfigTypes';

export const TRIPOD_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.TRIPOD,
  displayName: 'Tripod',
  description: 'Three-legged BattleMech with arms and center leg',
  locations: [
    ...createStandardTorsoLocationDefinitions(),
    createLocationDef(MechLocation.LEFT_ARM, 'Left Arm', 'LA', 12, {
      isLimb: true,
      actuators: ARM_ACTUATORS,
      transfersTo: MechLocation.LEFT_TORSO,
    }),
    createLocationDef(MechLocation.RIGHT_ARM, 'Right Arm', 'RA', 12, {
      isLimb: true,
      actuators: ARM_ACTUATORS,
      transfersTo: MechLocation.RIGHT_TORSO,
    }),
    createLocationDef(MechLocation.LEFT_LEG, 'Left Leg', 'LL', 6, {
      isLimb: true,
      actuators: LEG_ACTUATORS,
      transfersTo: MechLocation.LEFT_TORSO,
    }),
    createLocationDef(MechLocation.RIGHT_LEG, 'Right Leg', 'RL', 6, {
      isLimb: true,
      actuators: LEG_ACTUATORS,
      transfersTo: MechLocation.RIGHT_TORSO,
    }),
    createLocationDef(MechLocation.CENTER_LEG, 'Center Leg', 'CL', 6, {
      isLimb: true,
      actuators: LEG_ACTUATORS,
      transfersTo: MechLocation.CENTER_TORSO,
    }),
  ],
  mountingRules: [],
  prohibitedEquipment: [],
  baseMovementModifier: 0,
  diagramComponentName: 'TripodArmorDiagram',
};
