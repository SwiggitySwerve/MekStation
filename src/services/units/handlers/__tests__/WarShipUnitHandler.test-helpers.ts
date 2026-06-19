/**
 * WarShipUnitHandler Tests
 *
 * Tests for WarShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc, KFDriveType } from '@/types/unit/CapitalShipInterfaces';

import {
  WarShipUnitHandler,
  createWarShipHandler,
} from '../WarShipUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for WarShip testing
 */
export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'WarShip',
    mappedUnitType: UnitType.WARSHIP,
    name: 'McKenna',
    model: 'Battleship',
    year: 2652,
    type: 'IS Level 3',
    tonnage: 1400000,
    safeThrust: 2,
    structuralIntegrity: 75,
    fuel: 10000,
    heatsinks: 5000,
    sinkType: 1,
    engineType: 0,
    armorType: 0,
    armor: [500, 400, 400, 350, 350, 300, 450, 450],
    crew: 2200,
    officers: 150,
    gunners: 400,
    marines: 60,
    passengers: 20,
    escapePod: 50,
    lifeBoat: 20,
    equipmentByLocation: {
      'Nose Equipment': ['Naval Laser 55', 'Naval PPC'],
      'FL Equipment': ['Naval Autocannon/20'],
      'FR Equipment': ['Naval Autocannon/20'],
      'Aft Equipment': ['Naval Laser 35'],
    },
    transporters: ['mechbay:24', 'asfbay:12:2', 'cargobay:5000.0:1'],
    rawTags: {
      kfdrivetype: 'standard',
      lfbattery: 'true',
      sailarea: '1000',
      hardpoints: '6',
      gravdecks: '3',
      largegravdecks: '1',
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================
