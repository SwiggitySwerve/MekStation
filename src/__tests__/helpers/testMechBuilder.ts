/**
 * Test Mech Builder
 * 
 * Utility for creating test BattleMech objects with sensible defaults.
 * Used for unit and integration testing.
 */

import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';

/**
 * Minimal mech structure for testing
 */
export interface TestMech {
  id: string;
  name: string;
  chassis: string;
  variant: string;
  tonnage: number;
  techBase: TechBase;
  era: Era;
  rulesLevel: RulesLevel;
  weightClass: WeightClass;
  
  // Construction
  engineType: EngineType;
  engineRating: number;
  gyroType: GyroType;
  
  // Calculated totals (for validation tests)
  totalWeight?: number;
  
  // Armor
  armorPoints?: {
    head: number;
    centerTorso: number;
    centerTorsoRear: number;
    leftTorso: number;
    leftTorsoRear: number;
    rightTorso: number;
    rightTorsoRear: number;
    leftArm: number;
    rightArm: number;
    leftLeg: number;
    rightLeg: number;
  };
  
  // Equipment
  equipment?: Array<{
    id: string;
    location: string;
    slots: number;
    weight: number;
  }>;
  
  // Heat sinks
  heatSinks?: {
    type: 'single' | 'double';
    count: number;
  };
}

/**
 * Options for creating a test mech
 */
export interface TestMechOptions extends Partial<TestMech> {}

/**
 * Default values for a standard test mech (50-ton Hunchback-like)
 */
const DEFAULT_TEST_MECH: TestMech = {
  id: 'test-mech-001',
  name: 'Test Mech HNK-4G',
  chassis: 'Test Mech',
  variant: 'HNK-4G',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
  era: Era.SUCCESSION_WARS,
  rulesLevel: RulesLevel.STANDARD,
  weightClass: WeightClass.MEDIUM,
  engineType: EngineType.STANDARD,
  engineRating: 200, // 4 walk
  gyroType: GyroType.STANDARD,
  heatSinks: {
    type: 'single',
    count: 10,
  },
};

/**
 * Create a test mech with specified options
 * 
 * @param options - Partial mech options to override defaults
 * @returns Complete test mech object
 */
export function createTestMech(options: TestMechOptions = {}): TestMech {
  const mech = { ...DEFAULT_TEST_MECH, ...options };
  
  // Auto-determine weight class if tonnage is provided
  if (options.tonnage && !options.weightClass) {
    mech.weightClass = getWeightClass(options.tonnage);
  }
  
  return mech;
}

/**
 * Get weight class from tonnage
 */
function getWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 35) return WeightClass.LIGHT;
  if (tonnage <= 55) return WeightClass.MEDIUM;
  if (tonnage <= 75) return WeightClass.HEAVY;
  return WeightClass.ASSAULT;
}

/**
 * Create a light mech (20-35 tons)
 */
export function createLightMech(options: TestMechOptions = {}): TestMech {
  return createTestMech({
    tonnage: 25,
    engineRating: 150, // 6 walk
    weightClass: WeightClass.LIGHT,
    name: 'Test Commando COM-2D',
    ...options,
  });
}

/**
 * Create a medium mech (40-55 tons)
 */
export function createMediumMech(options: TestMechOptions = {}): TestMech {
  return createTestMech({
    tonnage: 50,
    engineRating: 200, // 4 walk
    weightClass: WeightClass.MEDIUM,
    name: 'Test Hunchback HBK-4G',
    ...options,
  });
}

/**
 * Create a heavy mech (60-75 tons)
 */
export function createHeavyMech(options: TestMechOptions = {}): TestMech {
  return createTestMech({
    tonnage: 75,
    engineRating: 300, // 4 walk
    weightClass: WeightClass.HEAVY,
    name: 'Test Marauder MAD-3R',
    ...options,
  });
}

/**
 * Create an assault mech (80-100 tons)
 */
export function createAssaultMech(options: TestMechOptions = {}): TestMech {
  return createTestMech({
    tonnage: 100,
    engineRating: 300, // 3 walk
    weightClass: WeightClass.ASSAULT,
    name: 'Test Atlas AS7-D',
    ...options,
  });
}

/**
 * Create a Clan mech
 */
export function createClanMech(options: TestMechOptions = {}): TestMech {
  return createTestMech({
    techBase: TechBase.CLAN,
    era: Era.CLAN_INVASION,
    rulesLevel: RulesLevel.STANDARD,
    engineType: EngineType.XL_CLAN,
    ...options,
  });
}

/**
 * Create a mech with invalid configuration (for error testing)
 */
export function createInvalidMech(options: TestMechOptions = {}): TestMech {
  return createTestMech({
    id: 'invalid-mech-001',
    name: 'Invalid Test Mech',
    totalWeight: 60, // Exceeds 50-ton chassis
    ...options,
  });
}

/**
 * Canonical test mech definitions for consistent testing
 */
export const CANONICAL_TEST_MECHS = {
  locust: createLightMech({
    id: 'locust-lct-1v',
    name: 'Locust LCT-1V',
    tonnage: 20,
    engineRating: 160, // 8 walk
    era: Era.AGE_OF_WAR,
    rulesLevel: RulesLevel.INTRODUCTORY,
  }),
  
  hunchback: createMediumMech({
    id: 'hunchback-hbk-4g',
    name: 'Hunchback HBK-4G',
    tonnage: 50,
    engineRating: 200,
    era: Era.SUCCESSION_WARS,
  }),
  
  marauder: createHeavyMech({
    id: 'marauder-mad-3r',
    name: 'Marauder MAD-3R',
    tonnage: 75,
    engineRating: 300,
    era: Era.STAR_LEAGUE,
  }),
  
  atlas: createAssaultMech({
    id: 'atlas-as7-d',
    name: 'Atlas AS7-D',
    tonnage: 100,
    engineRating: 300,
    era: Era.SUCCESSION_WARS,
  }),
  
  timberwolf: createClanMech({
    id: 'timberwolf-prime',
    name: 'Timber Wolf Prime',
    tonnage: 75,
    engineRating: 375, // 5 walk
    era: Era.CLAN_INVASION,
  }),
};

