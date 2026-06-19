/**
 * Handler Integration Tests
 *
 * Tests the full handler registration and parsing flow across all unit types.
 * Validates that all 13 handlers work correctly with the UnitTypeRegistry.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { UnitTypeRegistry, getUnitTypeRegistry } from '../../UnitTypeRegistry';
import {
  initializeUnitTypeHandlers,
  resetHandlerInitialization,
  getSupportedUnitTypes,
} from '../initializeHandlers';

// ============================================================================
// Test Setup
// ============================================================================

export function createBaseDocument(
  unitType: string,
  mappedUnitType: UnitType,
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType,
    mappedUnitType,
    name: 'Test Unit',
    model: 'TU-1',
    year: 3050,
    type: 'IS Level 2',
    tonnage: 50,
    armor: [10, 10, 10, 10],
    equipmentByLocation: {},
    rawTags: {},
    ...overrides,
  };
}

export function createVehicleDocument(): IBlkDocument {
  return createBaseDocument('Tank', UnitType.VEHICLE, {
    name: 'Rommel',
    model: 'Tank',
    tonnage: 60,
    cruiseMP: 4,
    motionType: 'Tracked',
    armor: [40, 30, 30, 20, 30],
    equipmentByLocation: {
      'Turret Equipment': ['AC/20'],
    },
  });
}

export function createVTOLDocument(): IBlkDocument {
  return createBaseDocument('VTOL', UnitType.VTOL, {
    name: 'Yellow Jacket',
    model: 'Gunship',
    tonnage: 20,
    cruiseMP: 10,
    motionType: 'VTOL',
    armor: [16, 12, 12, 8, 2],
    equipmentByLocation: {
      'Chin Equipment': ['Machine Gun', 'Machine Gun'],
    },
  });
}

export function createSupportVehicleDocument(): IBlkDocument {
  return createBaseDocument('SupportTank', UnitType.SUPPORT_VEHICLE, {
    name: 'Cargo Truck',
    model: 'Standard',
    tonnage: 10,
    cruiseMP: 5,
    motionType: 'Wheeled',
    armor: [4, 4, 4, 4],
    rawTags: {
      bar: '5',
      cargo: '5',
    },
  });
}

export function createAerospaceDocument(): IBlkDocument {
  return createBaseDocument('Aero', UnitType.AEROSPACE, {
    name: 'Stuka',
    model: 'STU-K5',
    tonnage: 75,
    safeThrust: 5,
    fuel: 400,
    structuralIntegrity: 7,
    heatsinks: 15,
    armor: [80, 50, 50, 40],
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser', 'Large Laser'],
      'Left Wing Equipment': ['Medium Laser'],
      'Right Wing Equipment': ['Medium Laser'],
    },
  });
}

export function createConventionalFighterDocument(): IBlkDocument {
  return createBaseDocument('ConvFighter', UnitType.CONVENTIONAL_FIGHTER, {
    name: 'Boomerang',
    model: 'Spotter',
    tonnage: 25,
    safeThrust: 8,
    fuel: 160,
    structuralIntegrity: 4,
    armor: [20, 16, 16, 10],
    rawTags: {
      bar: '6',
    },
  });
}

export function createSmallCraftDocument(): IBlkDocument {
  return createBaseDocument('SmallCraft', UnitType.SMALL_CRAFT, {
    name: 'K-1',
    model: 'Dropshuttle',
    tonnage: 150,
    safeThrust: 3,
    fuel: 400,
    structuralIntegrity: 6,
    armor: [60, 50, 50, 40],
    crew: 4,
    passengers: 20,
  });
}

export function createBattleArmorDocument(): IBlkDocument {
  return createBaseDocument('BattleArmor', UnitType.BATTLE_ARMOR, {
    name: 'Elemental',
    model: '[Point]',
    tonnage: 1,
    type: 'Clan Level 2',
    rawTags: {
      squadsize: '5',
      chassis: 'biped',
      weightclass: 'Medium',
      groundmp: '1',
      jumpmp: '3',
      armorvalue: '5',
    },
  });
}

export function createInfantryDocument(): IBlkDocument {
  return createBaseDocument('Infantry', UnitType.INFANTRY, {
    name: 'Foot Rifle Platoon',
    model: '(Standard)',
    tonnage: 0.1, // Infantry uses minimal tonnage
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'Rifle',
    cruiseMP: 1,
    armor: [0],
    rawTags: {},
  });
}

export function createProtoMechDocument(): IBlkDocument {
  return createBaseDocument('ProtoMech', UnitType.PROTOMECH, {
    name: 'Centaur',
    model: 'Prime',
    tonnage: 5,
    type: 'Clan Level 2',
    cruiseMP: 5,
    jumpingMP: 4,
    armor: [3, 6, 2, 2, 4],
    equipmentByLocation: {
      'Torso Equipment': ['ER Small Laser'],
      'Main Gun Equipment': ['LRM 3'],
    },
    rawTags: {
      pointsize: '5',
    },
  });
}

export function createDropShipDocument(): IBlkDocument {
  return createBaseDocument('Dropship', UnitType.DROPSHIP, {
    name: 'Leopard',
    model: 'CV',
    tonnage: 3500,
    motionType: 'Aerodyne',
    safeThrust: 4,
    fuel: 2500,
    structuralIntegrity: 9,
    heatsinks: 100,
    armor: [200, 180, 180, 160, 160, 120],
    crew: 14,
    passengers: 0,
    transporters: ['mechbay:4', 'asfbay:2'],
    equipmentByLocation: {
      'Nose Equipment': ['LRM 20', 'LRM 20'],
    },
  });
}

export function createWarShipDocument(): IBlkDocument {
  return createBaseDocument('Warship', UnitType.WARSHIP, {
    name: 'Congress',
    model: 'D-Class Frigate',
    tonnage: 760000,
    motionType: 'Spheroid',
    safeThrust: 3,
    fuel: 5000,
    structuralIntegrity: 50,
    heatsinks: 2000,
    armor: [500, 400, 400, 350, 350, 300],
    crew: 320,
    rawTags: {
      kfdrive: 'true',
      kfintegrity: '15',
    },
  });
}

export function createJumpShipDocument(): IBlkDocument {
  return createBaseDocument('Jumpship', UnitType.JUMPSHIP, {
    name: 'Invader',
    model: 'Class JumpShip',
    tonnage: 152000,
    safeThrust: 0,
    fuel: 1500,
    structuralIntegrity: 30,
    armor: [100, 80, 80, 60, 60, 50],
    crew: 28,
    rawTags: {
      kfdrive: 'true',
      dockingcollars: '3',
    },
  });
}

export function createSpaceStationDocument(): IBlkDocument {
  return createBaseDocument('SpaceStation', UnitType.SPACE_STATION, {
    name: 'Olympus',
    model: 'Recharge Station',
    tonnage: 50000,
    safeThrust: 0,
    structuralIntegrity: 20,
    armor: [200, 150, 150, 100, 100, 80],
    crew: 120,
    passengers: 500,
    rawTags: {
      stationtype: 'recharge',
      dockingcollars: '4',
      gravdecks: '2',
    },
  });
}

export const DOCUMENT_FACTORIES_BY_UNIT_TYPE: Partial<
  Record<UnitType, () => IBlkDocument>
> = {
  [UnitType.VEHICLE]: createVehicleDocument,
  [UnitType.VTOL]: createVTOLDocument,
  [UnitType.SUPPORT_VEHICLE]: createSupportVehicleDocument,
  [UnitType.AEROSPACE]: createAerospaceDocument,
  [UnitType.CONVENTIONAL_FIGHTER]: createConventionalFighterDocument,
  [UnitType.SMALL_CRAFT]: createSmallCraftDocument,
  [UnitType.BATTLE_ARMOR]: createBattleArmorDocument,
  [UnitType.INFANTRY]: createInfantryDocument,
  [UnitType.PROTOMECH]: createProtoMechDocument,
  [UnitType.DROPSHIP]: createDropShipDocument,
  [UnitType.WARSHIP]: createWarShipDocument,
  [UnitType.JUMPSHIP]: createJumpShipDocument,
  [UnitType.SPACE_STATION]: createSpaceStationDocument,
};

/**
 * Create a document for any unit type
 */
export function createDocumentForUnitType(unitType: UnitType): IBlkDocument {
  const createDocument =
    DOCUMENT_FACTORIES_BY_UNIT_TYPE[unitType] ?? createVehicleDocument;

  return createDocument();
}
