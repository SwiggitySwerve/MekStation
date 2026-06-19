/**
 * UnitFormatConverter Tests
 *
 * Tests for converting MegaMekLab format to internal format.
 */

import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  UnitFormatConverter,
  unitFormatConverter,
  MegaMekLabUnit,
} from '../UnitFormatConverter';

/**
 * Create a minimal valid MegaMekLab unit for testing
 */
export function createMegaMekLabUnit(
  overrides: Partial<MegaMekLabUnit> = {},
): MegaMekLabUnit {
  return {
    chassis: 'Atlas',
    model: 'AS7-D',
    mul_id: '123',
    config: 'Biped',
    tech_base: 'Inner Sphere',
    era: 3025,
    source: 'TRO 3025',
    rules_level: '2',
    role: 'Juggernaut',
    mass: 100,
    engine: {
      type: 'Fusion Engine',
      rating: 300,
    },
    structure: {
      type: 'Standard',
    },
    heat_sinks: {
      type: 'Single',
      count: 20,
    },
    walk_mp: '3',
    jump_mp: '0',
    armor: {
      type: 'Standard',
      locations: [
        { location: 'Head', armor_points: 9 },
        { location: 'Center Torso', armor_points: 47, rear_armor_points: 14 },
        { location: 'Left Torso', armor_points: 32, rear_armor_points: 10 },
        { location: 'Right Torso', armor_points: 32, rear_armor_points: 10 },
        { location: 'Left Arm', armor_points: 34 },
        { location: 'Right Arm', armor_points: 34 },
        { location: 'Left Leg', armor_points: 41 },
        { location: 'Right Leg', armor_points: 41 },
      ],
    },
    weapons_and_equipment: [
      {
        item_name: 'AC/20',
        location: 'Right Torso',
        item_type: 'AC20',
        tech_base: 'IS',
      },
      {
        item_name: 'LRM 20',
        location: 'Left Torso',
        item_type: 'LRM20',
        tech_base: 'IS',
      },
      {
        item_name: 'Medium Laser',
        location: 'Left Arm',
        item_type: 'MediumLaser',
        tech_base: 'IS',
      },
      {
        item_name: 'Medium Laser',
        location: 'Right Arm',
        item_type: 'MediumLaser',
        tech_base: 'IS',
      },
      {
        item_name: 'SRM 6',
        location: 'Left Torso',
        item_type: 'SRM6',
        tech_base: 'IS',
      },
    ],
    criticals: [
      {
        location: 'Head',
        slots: [
          'Life Support',
          'Sensors',
          'Cockpit',
          'Sensors',
          'Life Support',
          '-Empty-',
        ],
      },
      {
        location: 'Left Leg',
        slots: [
          'Hip',
          'Upper Leg Actuator',
          'Lower Leg Actuator',
          'Foot Actuator',
          '-Empty-',
          '-Empty-',
        ],
      },
      {
        location: 'Right Leg',
        slots: [
          'Hip',
          'Upper Leg Actuator',
          'Lower Leg Actuator',
          'Foot Actuator',
          '-Empty-',
          '-Empty-',
        ],
      },
      { location: 'Left Arm', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Right Arm', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Left Torso', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Right Torso', slots: Array<string>(12).fill('-Empty-') },
      { location: 'Center Torso', slots: Array<string>(12).fill('-Empty-') },
    ],
    ...overrides,
  };
}
