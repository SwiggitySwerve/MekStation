import type { IMechConfigurationDefinition } from './MechConfigTypes';

import { createStandardTorsoLocationDefinitions } from './bipedConfig';
import {
  createLocationDef,
  ARM_ACTUATORS,
  LEG_ACTUATORS,
} from './mechConfigHelpers';
import { MechConfiguration, MechLocation, LAMMode } from './MechConfigTypes';

/** Native subtype shared by construction and BV; retain legacy exact matching. */
export function isBimodalLAM(type?: string): boolean {
  return type?.toLowerCase() === 'bimodal';
}

/**
 * MegaMek 48fcb2f64 TestMek.java:191-200: conversion equipment uses 10%
 * (standard) or 15% (bimodal) of tonnage, rounded up to whole tons.
 * The caller selects LAMs; ordinary mech construction does not pay this mass.
 */
export function getLAMConversionWeight(tonnage: number, type?: string): number {
  return Math.ceil(tonnage * (isBimodalLAM(type) ? 0.15 : 0.1));
}

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
