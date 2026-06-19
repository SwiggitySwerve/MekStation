/**
 * DropShipUnitHandler Tests
 *
 * Tests for DropShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  CapitalArc,
  DropShipDesignType,
  BayType,
} from '@/types/unit/CapitalShipInterfaces';

import {
  DropShipUnitHandler,
  createDropShipHandler,
} from '../DropShipUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'DropShip',
    mappedUnitType: UnitType.DROPSHIP,
    name: 'Union',
    model: 'Standard',
    year: 2708,
    type: 'IS Level 2',
    tonnage: 3500,
    motionType: 'Spheroid',
    safeThrust: 3,
    structuralIntegrity: 10,
    fuel: 2500,
    heatsinks: 100,
    sinkType: 0,
    engineType: 0,
    armorType: 0,
    armor: [200, 150, 150, 120, 120, 80],
    crew: 21,
    officers: 5,
    gunners: 4,
    passengers: 0,
    marines: 0,
    escapePod: 7,
    lifeBoat: 0,
    equipmentByLocation: {
      'Nose Equipment': ['LRM 20', 'LRM 20', 'Large Laser'],
      'FL Equipment': ['PPC', 'Medium Laser'],
      'FR Equipment': ['PPC', 'Medium Laser'],
      'Aft Equipment': ['Large Laser', 'Medium Laser'],
    },
    transporters: ['mechbay:12', 'asfbay:2:1', 'cargobay:75.5:1'],
    rawTags: {
      dockingcollar: 'true',
    },
    designType: 0, // Military
    ...overrides,
  };
}

export function createAerodyneDropShip(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Leopard',
    model: 'CV',
    motionType: 'Aerodyne',
    tonnage: 1720,
    safeThrust: 4,
    structuralIntegrity: 8,
    armor: [150, 100, 100, 80, 80, 60],
    transporters: ['mechbay:4', 'asfbay:2:1', 'cargobay:50.0:1'],
  });
}

export function createCivilianDropShip(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Mule',
    model: 'Cargo',
    designType: 1, // Civilian
    tonnage: 11200,
    safeThrust: 2,
    transporters: ['cargobay:8000.0:4'],
    equipmentByLocation: {},
  });
}

// ============================================================================
// Tests
// ============================================================================
