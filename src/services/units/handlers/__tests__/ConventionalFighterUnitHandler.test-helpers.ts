/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ConventionalFighterEngineType,
  AerospaceCockpitType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  ConventionalFighterUnitHandler,
  createConventionalFighterHandler,
} from '../ConventionalFighterUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'ConvFighter',
    mappedUnitType: UnitType.CONVENTIONAL_FIGHTER,
    name: 'F-92 Stingray',
    model: 'Standard',
    year: 3025,
    type: 'IS Level 2',
    tonnage: 50,
    safeThrust: 6,
    fuel: 160,
    structuralIntegrity: 6,
    heatsinks: 0,
    sinkType: 0,
    engineType: 0, // ICE
    armorType: 0,
    cockpitType: 0, // Standard
    armor: [16, 12, 12, 8],
    equipmentByLocation: {
      'Nose Equipment': ['Autocannon/10', 'Ammo AC/10'],
      'Left Wing Equipment': ['Machine Gun'],
      'Right Wing Equipment': ['Machine Gun'],
    },
    rawTags: {},
    ...overrides,
  };
}

export function createLightFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Light Scout',
    model: 'LS-1',
    tonnage: 30,
    safeThrust: 10,
    fuel: 100,
    structuralIntegrity: 4,
    armor: [10, 8, 8, 6],
    equipmentByLocation: {
      'Nose Equipment': ['Medium Laser'],
    },
  });
}

export function createMediumFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Medium Interceptor',
    model: 'MI-2',
    tonnage: 60,
    safeThrust: 7,
    fuel: 200,
    structuralIntegrity: 7,
    armor: [20, 16, 16, 12],
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser'],
      'Left Wing Equipment': ['Medium Laser'],
      'Right Wing Equipment': ['Medium Laser'],
    },
  });
}

export function createHeavyFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Heavy Bomber',
    model: 'HB-5',
    tonnage: 90,
    safeThrust: 5,
    fuel: 300,
    structuralIntegrity: 8,
    armor: [30, 24, 24, 18],
    equipmentByLocation: {
      'Nose Equipment': ['Autocannon/20'],
      'Left Wing Equipment': ['LRM 10'],
      'Right Wing Equipment': ['LRM 10'],
      'Fuselage Equipment': ['Bomb Bay'],
    },
  });
}

// ============================================================================
// Constructor and Properties Tests
// ============================================================================
