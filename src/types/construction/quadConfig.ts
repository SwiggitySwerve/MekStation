import type { IMechConfigurationDefinition } from './MechConfigTypes';

import { createStandardTorsoLocationDefinitions } from './bipedConfig';
import { createLocationDef, LEG_ACTUATORS } from './mechConfigHelpers';
import { MechConfiguration, MechLocation } from './MechConfigTypes';

export const QUAD_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.QUAD,
  displayName: 'Quad',
  description: 'Four-legged BattleMech without arms',
  locations: [
    ...createStandardTorsoLocationDefinitions(),
    createLocationDef(
      MechLocation.FRONT_LEFT_LEG,
      'Front Left Leg',
      'FLL',
      12,
      {
        isLimb: true,
        actuators: LEG_ACTUATORS,
        transfersTo: MechLocation.LEFT_TORSO,
      },
    ),
    createLocationDef(
      MechLocation.FRONT_RIGHT_LEG,
      'Front Right Leg',
      'FRL',
      12,
      {
        isLimb: true,
        actuators: LEG_ACTUATORS,
        transfersTo: MechLocation.RIGHT_TORSO,
      },
    ),
    createLocationDef(MechLocation.REAR_LEFT_LEG, 'Rear Left Leg', 'RLL', 12, {
      isLimb: true,
      actuators: LEG_ACTUATORS,
      transfersTo: MechLocation.LEFT_TORSO,
    }),
    createLocationDef(
      MechLocation.REAR_RIGHT_LEG,
      'Rear Right Leg',
      'RRL',
      12,
      {
        isLimb: true,
        actuators: LEG_ACTUATORS,
        transfersTo: MechLocation.RIGHT_TORSO,
      },
    ),
  ],
  mountingRules: [],
  prohibitedEquipment: [],
  baseMovementModifier: 0,
  diagramComponentName: 'QuadArmorDiagram',
};
