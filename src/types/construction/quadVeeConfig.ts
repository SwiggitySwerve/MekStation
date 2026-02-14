import type { IMechConfigurationDefinition } from './MechConfigTypes';

import { createLocationDef, LEG_ACTUATORS } from './mechConfigHelpers';
import { MechConfiguration, MechLocation } from './MechConfigTypes';

/**
 * QuadVee required equipment definitions
 * Conversion Equipment: Required in each leg for transformation
 */
export const QUADVEE_EQUIPMENT = {
  CONVERSION_EQUIPMENT: {
    id: 'conversion-equipment',
    name: 'Conversion Equipment',
    slots: 1,
    locations: [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ],
  },
  TRACKS: {
    id: 'tracks',
    name: 'Tracks',
    slots: 1,
    locations: [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ],
  },
} as const;

export const QUADVEE_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.QUADVEE,
  displayName: 'QuadVee',
  description: 'Transformable quad mech capable of vehicle mode',
  locations: [
    createLocationDef(MechLocation.HEAD, 'Head', 'HD', 6, {
      maxArmorMultiplier: 3,
    }),
    createLocationDef(MechLocation.CENTER_TORSO, 'Center Torso', 'CT', 12, {
      hasRearArmor: true,
    }),
    createLocationDef(MechLocation.LEFT_TORSO, 'Left Torso', 'LT', 12, {
      hasRearArmor: true,
      transfersTo: MechLocation.CENTER_TORSO,
    }),
    createLocationDef(MechLocation.RIGHT_TORSO, 'Right Torso', 'RT', 12, {
      hasRearArmor: true,
      transfersTo: MechLocation.CENTER_TORSO,
    }),
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
  requiredEquipment: [
    {
      equipmentId: QUADVEE_EQUIPMENT.CONVERSION_EQUIPMENT.id,
      locations: QUADVEE_EQUIPMENT.CONVERSION_EQUIPMENT.locations,
    },
  ],
  diagramComponentName: 'QuadVeeArmorDiagram',
};
