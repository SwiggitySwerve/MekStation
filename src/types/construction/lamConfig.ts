import type { IMechConfigurationDefinition } from './MechConfigTypes';

import {
  createLocationDef,
  ARM_ACTUATORS,
  LEG_ACTUATORS,
} from './mechConfigHelpers';
import { MechConfiguration, MechLocation, LAMMode } from './MechConfigTypes';

/**
 * LAM equipment definitions
 * Landing Gear: 3 slots total (1 each in CT, LT, RT)
 * Avionics: 3 slots total (1 each in HD, LT, RT)
 */
export const LAM_EQUIPMENT = {
  LANDING_GEAR: {
    id: 'landing-gear',
    name: 'Landing Gear',
    slots: 1,
    locations: [
      MechLocation.CENTER_TORSO,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ],
  },
  AVIONICS: {
    id: 'avionics',
    name: 'Avionics',
    slots: 1,
    locations: [
      MechLocation.HEAD,
      MechLocation.LEFT_TORSO,
      MechLocation.RIGHT_TORSO,
    ],
  },
} as const;

/**
 * LAM mech configuration definition
 * LAMs are limited to 55 tons max and cannot use XL engines, Endo Steel, or Ferro-Fibrous armor
 */
export const LAM_CONFIGURATION: IMechConfigurationDefinition = {
  id: MechConfiguration.LAM,
  displayName: 'Land-Air Mech',
  description: 'Transformable BattleMech capable of flight (max 55 tons)',
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
  ],
  mountingRules: [],
  prohibitedEquipment: [
    'endo-steel',
    'endo-steel-clan',
    'ferro-fibrous',
    'ferro-fibrous-clan',
    'light-ferro-fibrous',
    'heavy-ferro-fibrous',
    'stealth-armor',
  ],
  baseMovementModifier: 0,
  modes: [
    {
      mode: LAMMode.MECH,
      displayName: 'Mech Mode',
      movementType: 'ground',
      weaponRestrictions: [],
    },
    {
      mode: LAMMode.AIRMECH,
      displayName: 'AirMech Mode',
      movementType: 'vtol',
      weaponRestrictions: [],
    },
    {
      mode: LAMMode.FIGHTER,
      displayName: 'Fighter Mode',
      movementType: 'aerospace',
      weaponRestrictions: ['physical'],
      armorLocationMapping: {
        [MechLocation.HEAD]: MechLocation.NOSE,
        [MechLocation.CENTER_TORSO]: MechLocation.FUSELAGE,
        [MechLocation.LEFT_TORSO]: MechLocation.LEFT_WING,
        [MechLocation.RIGHT_TORSO]: MechLocation.RIGHT_WING,
        [MechLocation.LEFT_ARM]: MechLocation.LEFT_WING,
        [MechLocation.RIGHT_ARM]: MechLocation.RIGHT_WING,
        [MechLocation.LEFT_LEG]: MechLocation.AFT,
        [MechLocation.RIGHT_LEG]: MechLocation.AFT,
        [MechLocation.NOSE]: MechLocation.NOSE,
        [MechLocation.LEFT_WING]: MechLocation.LEFT_WING,
        [MechLocation.RIGHT_WING]: MechLocation.RIGHT_WING,
        [MechLocation.AFT]: MechLocation.AFT,
        [MechLocation.FUSELAGE]: MechLocation.FUSELAGE,
        // Non-LAM locations (required by type)
        [MechLocation.CENTER_LEG]: MechLocation.AFT,
        [MechLocation.FRONT_LEFT_LEG]: MechLocation.AFT,
        [MechLocation.FRONT_RIGHT_LEG]: MechLocation.AFT,
        [MechLocation.REAR_LEFT_LEG]: MechLocation.AFT,
        [MechLocation.REAR_RIGHT_LEG]: MechLocation.AFT,
      },
    },
  ],
  requiredEquipment: [
    {
      equipmentId: LAM_EQUIPMENT.LANDING_GEAR.id,
      locations: LAM_EQUIPMENT.LANDING_GEAR.locations,
    },
    {
      equipmentId: LAM_EQUIPMENT.AVIONICS.id,
      locations: LAM_EQUIPMENT.AVIONICS.locations,
    },
  ],
  diagramComponentName: 'LAMArmorDiagram',
};
