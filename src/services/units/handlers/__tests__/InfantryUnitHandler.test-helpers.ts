/**
 * InfantryUnitHandler Tests
 *
 * Comprehensive tests for Infantry BLK parsing, validation, calculations, and serialization
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateInfantryBVFromUnit } from '@/utils/construction/infantry';

import {
  InfantryUnitHandler,
  createInfantryHandler,
} from '../InfantryUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Infantry',
    mappedUnitType: UnitType.INFANTRY,
    name: 'Foot Rifle Platoon',
    model: 'Standard',
    year: 2750,
    type: 'IS Level 1',
    tonnage: 0.1,
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'Rifle',
    cruiseMP: 1,
    armor: [0],
    equipmentByLocation: {},
    rawTags: {},
    ...overrides,
  };
}

export function createJumpInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Jump Rifle Platoon',
    motionType: 'Jump',
    cruiseMP: 1,
    jumpingMP: 3,
    armorKit: 'Flak',
    armor: [1],
  });
}

export function createMechanizedInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Mechanized Rifle Platoon',
    motionType: 'Mechanized',
    cruiseMP: 3,
    squadSize: 6,
    squadn: 3,
    primary: 'Auto-Rifle',
    armorKit: 'Standard',
    armor: [1],
  });
}

export function createFieldGunInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Foot Field Gun Platoon',
    motionType: 'Foot',
    squadSize: 8,
    squadn: 2,
    primary: 'Rifle',
    equipmentByLocation: {
      Platoon: ['Light Field Gun', 'Medium Field Gun'],
    },
  });
}

export function createAntiMechInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Anti-Mech Infantry',
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'SRM',
    rawTags: {
      antimech: 'true',
      specialization: 'anti-mech',
    },
  });
}

export function createAugmentedInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Augmented Infantry',
    motionType: 'Foot',
    squadSize: 5,
    squadn: 4,
    rawTags: {
      augmented: 'true',
      augmentationtype: 'DEST',
    },
  });
}

export function createClanInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Clan Elemental Infantry',
    type: 'Clan Level 2',
    motionType: 'Jump',
    jumpingMP: 2,
    armorKit: 'Clan',
    armor: [2],
  });
}

// ============================================================================
// Tests
// ============================================================================
