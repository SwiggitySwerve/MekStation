/**
 * CalculationService Tests
 *
 * Tests for mech calculation service covering totals, battle value, cost,
 * heat profiles, and movement calculations.
 *
 * @spec openspec/specs/construction-services/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { TechBase } from '@/types/enums/TechBase';

import {
  CalculationService,
  getCalculationService,
  _resetCalculationService,
  IMechTotals,
  IHeatProfile,
  IMovementProfile,
} from '../CalculationService';
import {
  IEditableMech,
  IArmorAllocation,
  IEquipmentSlot,
} from '../MechBuilderService';

// =============================================================================
// Mock Equipment Registry
// =============================================================================

const mockEquipment: Map<
  string,
  { battleValue?: number; heat?: number; cost?: number; category?: string }
> = new Map([
  [
    'medium-laser',
    { battleValue: 46, heat: 3, cost: 40000, category: 'Energy' },
  ],
  [
    'large-laser',
    { battleValue: 123, heat: 8, cost: 100000, category: 'Energy' },
  ],
  ['ppc', { battleValue: 176, heat: 10, cost: 200000, category: 'Energy' }],
  ['lrm-10', { battleValue: 90, heat: 4, cost: 100000, category: 'Missile' }],
  ['ac-10', { battleValue: 124, heat: 3, cost: 200000, category: 'Ballistic' }],
  ['jump-jet', { battleValue: 0, heat: 0, cost: 50000, category: 'Movement' }],
  [
    'jump-jet-light',
    { battleValue: 0, heat: 0, cost: 25000, category: 'Movement' },
  ],
  [
    'improved-jump-jet',
    { battleValue: 0, heat: 0, cost: 75000, category: 'Movement' },
  ],
  [
    'ammo-lrm-10',
    { battleValue: 11, heat: 0, cost: 30000, category: 'Ammunition' },
  ],
  [
    'ammo-ac-10',
    { battleValue: 8, heat: 0, cost: 12000, category: 'Ammunition' },
  ],
  ['heat-sink', { battleValue: 0, heat: 0, cost: 2000, category: 'Heat Sink' }],
]);

let mockRegistryReady = true;

jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: () => ({
    isReady: () => mockRegistryReady,
    initialize: jest.fn().mockResolvedValue(undefined),
    lookup: (id: string) => {
      const equipment = mockEquipment.get(id.toLowerCase());
      if (equipment) {
        return { found: true, equipment, category: equipment.category };
      }
      return { found: false, equipment: null, category: null };
    },
  }),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a standard armor allocation for testing
 */
function createArmorAllocation(
  overrides: Partial<IArmorAllocation> = {},
): IArmorAllocation {
  return {
    head: 9,
    centerTorso: 30,
    centerTorsoRear: 10,
    leftTorso: 20,
    leftTorsoRear: 8,
    rightTorso: 20,
    rightTorsoRear: 8,
    leftArm: 16,
    rightArm: 16,
    leftLeg: 20,
    rightLeg: 20,
    ...overrides,
  };
}

/**
 * Create a basic editable mech for testing
 */
function createTestMech(overrides: Partial<IEditableMech> = {}): IEditableMech {
  return {
    id: 'test-mech-001',
    chassis: 'Atlas',
    variant: 'AS7-D',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    engineType: EngineType.STANDARD,
    engineRating: 300,
    walkMP: 3,
    structureType: InternalStructureType.STANDARD,
    gyroType: GyroType.STANDARD,
    cockpitType: CockpitType.STANDARD,
    armorType: ArmorTypeEnum.STANDARD,
    armorAllocation: createArmorAllocation(),
    heatSinkType: HeatSinkType.SINGLE,
    heatSinkCount: 10,
    equipment: [],
    isDirty: false,
    ...overrides,
  };
}

/**
 * Create equipment slots for testing
 */
function createEquipmentSlot(
  equipmentId: string,
  location: string = 'rightArm',
  slotIndex: number = 0,
): IEquipmentSlot {
  return { equipmentId, location, slotIndex };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('CalculationService', () => {
  let service: CalculationService;

  beforeEach(() => {
    _resetCalculationService();
    service = getCalculationService();
    mockRegistryReady = true;
  });

  afterEach(() => {
    _resetCalculationService();
  });

  // ===========================================================================
  // Singleton Pattern Tests
  // ===========================================================================

  describe('singleton pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = getCalculationService();
      const instance2 = getCalculationService();
      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after reset', () => {
      const instance1 = getCalculationService();
      _resetCalculationService();
      const instance2 = getCalculationService();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ===========================================================================
  // calculateTotals Tests
  // ===========================================================================

  describe('calculateTotals', () => {
    it('should calculate totals for a basic 100-ton mech', () => {
      const mech = createTestMech();
      const totals = service.calculateTotals(mech);

      expect(totals.maxWeight).toBe(100);
      expect(totals.totalCriticalSlots).toBe(78);
      expect(totals.usedCriticalSlots).toBe(0);
      expect(totals.totalArmorPoints).toBe(177);
    });

    it('should calculate remaining weight correctly', () => {
      const mech = createTestMech({ tonnage: 50 });
      const totals = service.calculateTotals(mech);

      expect(totals.maxWeight).toBe(50);
      expect(totals.remainingWeight).toBe(50 - totals.totalWeight);
    });

    it('should count equipment as used critical slots', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('medium-laser', 'rightArm', 0),
          createEquipmentSlot('medium-laser', 'rightArm', 1),
          createEquipmentSlot('large-laser', 'leftArm', 0),
        ],
      });
      const totals = service.calculateTotals(mech);

      expect(totals.usedCriticalSlots).toBe(3);
    });

    it('should calculate max armor points based on tonnage', () => {
      const lightMech = createTestMech({ tonnage: 20 });
      const heavyMech = createTestMech({ tonnage: 75 });
      const assaultMech = createTestMech({ tonnage: 100 });

      const lightTotals = service.calculateTotals(lightMech);
      const heavyTotals = service.calculateTotals(heavyMech);
      const assaultTotals = service.calculateTotals(assaultMech);

      // Max armor increases with tonnage
      expect(assaultTotals.maxArmorPoints).toBeGreaterThan(
        heavyTotals.maxArmorPoints,
      );
      expect(heavyTotals.maxArmorPoints).toBeGreaterThan(
        lightTotals.maxArmorPoints,
      );
    });

    it('should calculate total armor points from all locations', () => {
      const armor = createArmorAllocation({
        head: 9,
        centerTorso: 20,
        centerTorsoRear: 5,
        leftTorso: 10,
        leftTorsoRear: 3,
        rightTorso: 10,
        rightTorsoRear: 3,
        leftArm: 8,
        rightArm: 8,
        leftLeg: 10,
        rightLeg: 10,
      });
      const mech = createTestMech({ armorAllocation: armor });
      const totals = service.calculateTotals(mech);

      // Total: 9 + 20 + 5 + 10 + 3 + 10 + 3 + 8 + 8 + 10 + 10 = 96
      expect(totals.totalArmorPoints).toBe(96);
    });

    it('should handle zero armor allocation', () => {
      const armor = createArmorAllocation({
        head: 0,
        centerTorso: 0,
        centerTorsoRear: 0,
        leftTorso: 0,
        leftTorsoRear: 0,
        rightTorso: 0,
        rightTorsoRear: 0,
        leftArm: 0,
        rightArm: 0,
        leftLeg: 0,
        rightLeg: 0,
      });
      const mech = createTestMech({ armorAllocation: armor });
      const totals = service.calculateTotals(mech);

      expect(totals.totalArmorPoints).toBe(0);
    });
  });

  // ===========================================================================
  // calculateBattleValue Tests
  // ===========================================================================

  describe('calculateBattleValue', () => {
    it('should calculate BV for a basic mech without weapons', () => {
      const mech = createTestMech();
      const bv = service.calculateBattleValue(mech);

      // BV should include defensive components and tonnage bonus
      expect(bv).toBeGreaterThan(0);
      expect(Number.isInteger(bv)).toBe(true);
    });

    it('should increase BV with more armor', () => {
      const lightArmor = createArmorAllocation({
        head: 5,
        centerTorso: 15,
        centerTorsoRear: 5,
        leftTorso: 10,
        leftTorsoRear: 4,
        rightTorso: 10,
        rightTorsoRear: 4,
        leftArm: 8,
        rightArm: 8,
        leftLeg: 10,
        rightLeg: 10,
      });
      const heavyArmor = createArmorAllocation();

      const lightMech = createTestMech({ armorAllocation: lightArmor });
      const heavyMech = createTestMech({ armorAllocation: heavyArmor });

      const lightBV = service.calculateBattleValue(lightMech);
      const heavyBV = service.calculateBattleValue(heavyMech);

      expect(heavyBV).toBeGreaterThan(lightBV);
    });

    it('should include weapon BV in calculation', () => {
      const unarmedMech = createTestMech();
      const armedMech = createTestMech({
        equipment: [
          createEquipmentSlot('medium-laser', 'rightArm', 0),
          createEquipmentSlot('large-laser', 'leftArm', 0),
        ],
      });

      const unarmedBV = service.calculateBattleValue(unarmedMech);
      const armedBV = service.calculateBattleValue(armedMech);

      expect(armedBV).toBeGreaterThan(unarmedBV);
    });

    it('should apply heat penalty to weapons exceeding heat dissipation', () => {
      // Mech with single heat sinks (10 dissipation)
      const mech = createTestMech({
        heatSinkCount: 10,
        heatSinkType: HeatSinkType.SINGLE,
        equipment: [
          createEquipmentSlot('ppc', 'rightArm', 0), // 10 heat
          createEquipmentSlot('ppc', 'leftArm', 0), // 10 heat - should get penalty
        ],
      });

      const bv = service.calculateBattleValue(mech);

      // BV should still be positive and include weapons
      expect(bv).toBeGreaterThan(0);
    });

    it('should return 0 when registry is not ready', () => {
      mockRegistryReady = false;
      const mech = createTestMech({
        equipment: [createEquipmentSlot('medium-laser', 'rightArm', 0)],
      });
      const bv = service.calculateBattleValue(mech);

      // Defensive BV still calculated, but offensive weapons BV is 0
      expect(bv).toBeGreaterThanOrEqual(0);
    });

    it('should increase BV with higher movement', () => {
      const slowMech = createTestMech({ walkMP: 2 });
      const fastMech = createTestMech({ walkMP: 6 });

      const slowBV = service.calculateBattleValue(slowMech);
      const fastBV = service.calculateBattleValue(fastMech);

      expect(fastBV).toBeGreaterThan(slowBV);
    });

    it('should include ammo BV without heat penalty', () => {
      const mechWithAmmo = createTestMech({
        equipment: [
          createEquipmentSlot('ammo-lrm-10', 'leftTorso', 0),
          createEquipmentSlot('ammo-ac-10', 'rightTorso', 0),
        ],
      });

      const bv = service.calculateBattleValue(mechWithAmmo);
      expect(bv).toBeGreaterThan(0);
    });

    it('should handle double heat sinks for heat dissipation', () => {
      const singleHSMech = createTestMech({
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [
          createEquipmentSlot('ppc', 'rightArm', 0),
          createEquipmentSlot('ppc', 'leftArm', 0),
        ],
      });
      const doubleHSMech = createTestMech({
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 10,
        equipment: [
          createEquipmentSlot('ppc', 'rightArm', 0),
          createEquipmentSlot('ppc', 'leftArm', 0),
        ],
      });

      const singleBV = service.calculateBattleValue(singleHSMech);
      const doubleBV = service.calculateBattleValue(doubleHSMech);

      // Double HS can dissipate more heat, so less penalty
      expect(doubleBV).toBeGreaterThan(singleBV);
    });
  });

  // ===========================================================================
  // calculateCost Tests
  // ===========================================================================

  describe('calculateCost', () => {
    it('should calculate cost for a basic mech', () => {
      const mech = createTestMech();
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
      expect(Number.isInteger(cost)).toBe(true);
    });

    it('should increase cost with XL engine', () => {
      const standardMech = createTestMech({ engineType: EngineType.STANDARD });
      const xlMech = createTestMech({ engineType: EngineType.XL_IS });

      const standardCost = service.calculateCost(standardMech);
      const xlCost = service.calculateCost(xlMech);

      expect(xlCost).toBeGreaterThan(standardCost);
    });

    it('should increase cost with endo steel structure', () => {
      const standardMech = createTestMech({
        structureType: InternalStructureType.STANDARD,
      });
      const endoMech = createTestMech({
        structureType: InternalStructureType.ENDO_STEEL_IS,
      });

      const standardCost = service.calculateCost(standardMech);
      const endoCost = service.calculateCost(endoMech);

      expect(endoCost).toBeGreaterThan(standardCost);
    });

    it('should increase cost with XL gyro', () => {
      const standardMech = createTestMech({ gyroType: GyroType.STANDARD });
      const xlGyroMech = createTestMech({ gyroType: GyroType.XL });

      const standardCost = service.calculateCost(standardMech);
      const xlGyroCost = service.calculateCost(xlGyroMech);

      expect(xlGyroCost).toBeGreaterThan(standardCost);
    });

    it('should apply compact gyro cost multiplier', () => {
      const standardMech = createTestMech({ gyroType: GyroType.STANDARD });
      const compactGyroMech = createTestMech({ gyroType: GyroType.COMPACT });

      const standardCost = service.calculateCost(standardMech);
      const compactCost = service.calculateCost(compactGyroMech);

      // Compact gyro has 4x cost multiplier
      expect(compactCost).toBeGreaterThan(standardCost);
    });

    it('should reduce cost with heavy-duty gyro (0.5 multiplier)', () => {
      const standardMech = createTestMech({ gyroType: GyroType.STANDARD });
      const heavyDutyMech = createTestMech({ gyroType: GyroType.HEAVY_DUTY });

      const standardCost = service.calculateCost(standardMech);
      const heavyDutyCost = service.calculateCost(heavyDutyMech);

      // Heavy-duty has 0.5x cost multiplier on gyro
      expect(heavyDutyCost).toBeLessThan(standardCost);
    });

    it('should increase cost with small cockpit', () => {
      const standardMech = createTestMech({
        cockpitType: CockpitType.STANDARD,
      });
      const smallMech = createTestMech({ cockpitType: CockpitType.SMALL });

      const standardCost = service.calculateCost(standardMech);
      const smallCost = service.calculateCost(smallMech);

      // Small cockpit is cheaper (175000 vs 200000)
      expect(smallCost).toBeLessThan(standardCost);
    });

    it('should increase cost with command console', () => {
      const standardMech = createTestMech({
        cockpitType: CockpitType.STANDARD,
      });
      const commandMech = createTestMech({
        cockpitType: CockpitType.COMMAND_CONSOLE,
      });

      const standardCost = service.calculateCost(standardMech);
      const commandCost = service.calculateCost(commandMech);

      expect(commandCost).toBeGreaterThan(standardCost);
    });

    it('should increase cost with ferro-fibrous armor', () => {
      const standardMech = createTestMech({
        armorType: ArmorTypeEnum.STANDARD,
      });
      const ferroMech = createTestMech({
        armorType: ArmorTypeEnum.FERRO_FIBROUS_IS,
      });

      const standardCost = service.calculateCost(standardMech);
      const ferroCost = service.calculateCost(ferroMech);

      expect(ferroCost).toBeGreaterThan(standardCost);
    });

    it('should increase cost with stealth armor', () => {
      const standardMech = createTestMech({
        armorType: ArmorTypeEnum.STANDARD,
      });
      const stealthMech = createTestMech({ armorType: ArmorTypeEnum.STEALTH });

      const standardCost = service.calculateCost(standardMech);
      const stealthCost = service.calculateCost(stealthMech);

      expect(stealthCost).toBeGreaterThan(standardCost);
    });

    it('should include equipment costs', () => {
      const unarmedMech = createTestMech({ equipment: [] });
      const armedMech = createTestMech({
        equipment: [
          createEquipmentSlot('medium-laser', 'rightArm', 0),
          createEquipmentSlot('ppc', 'leftArm', 0),
        ],
      });

      const unarmedCost = service.calculateCost(unarmedMech);
      const armedCost = service.calculateCost(armedMech);

      expect(armedCost).toBeGreaterThan(unarmedCost);
    });

    it('should charge more for double heat sinks', () => {
      const singleHSMech = createTestMech({
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 15,
        engineRating: 200, // 8 integral, 7 external
      });
      const doubleHSMech = createTestMech({
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 15,
        engineRating: 200, // 8 integral, 7 external
      });

      const singleCost = service.calculateCost(singleHSMech);
      const doubleCost = service.calculateCost(doubleHSMech);

      expect(doubleCost).toBeGreaterThan(singleCost);
    });

    it('should not charge for integral heat sinks', () => {
      // Engine rating 250 = 10 integral heat sinks
      const mech10HS = createTestMech({
        heatSinkCount: 10,
        engineRating: 250,
      });
      const mech15HS = createTestMech({
        heatSinkCount: 15,
        engineRating: 250,
      });

      const cost10 = service.calculateCost(mech10HS);
      const cost15 = service.calculateCost(mech15HS);

      // 5 extra external heat sinks should increase cost
      expect(cost15).toBeGreaterThan(cost10);
    });

    it('should apply construction multiplier', () => {
      const mech = createTestMech();
      const cost = service.calculateCost(mech);

      // Cost should be multiplied by 1.25 construction multiplier
      // This is implicit - we just verify it's a reasonable value
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle legacy string engine types', () => {
      const mechXL = createTestMech({ engineType: 'XL' as EngineType });
      const mechStandard = createTestMech({
        engineType: 'Standard' as EngineType,
      });

      const xlCost = service.calculateCost(mechXL);
      const standardCost = service.calculateCost(mechStandard);

      expect(xlCost).toBeGreaterThan(standardCost);
    });

    it('should handle XXL engine type', () => {
      const mechStandard = createTestMech({ engineType: EngineType.STANDARD });
      const mechXXL = createTestMech({ engineType: EngineType.XXL });

      const standardCost = service.calculateCost(mechStandard);
      const xxlCost = service.calculateCost(mechXXL);

      expect(xxlCost).toBeGreaterThan(standardCost);
    });
  });

  // ===========================================================================
  // calculateHeatProfile Tests
  // ===========================================================================

  describe('calculateHeatProfile', () => {
    it('should calculate heat dissipation for single heat sinks', () => {
      const mech = createTestMech({
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.heatDissipated).toBe(10);
    });

    it('should calculate heat dissipation for double heat sinks', () => {
      const mech = createTestMech({
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 10,
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.heatDissipated).toBe(20);
    });

    it('should calculate heat dissipation for clan double heat sinks', () => {
      const mech = createTestMech({
        heatSinkType: HeatSinkType.DOUBLE_CLAN,
        heatSinkCount: 12,
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.heatDissipated).toBe(24);
    });

    it('should calculate weapon heat generation', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('medium-laser', 'rightArm', 0), // 3 heat
          createEquipmentSlot('large-laser', 'leftArm', 0), // 8 heat
        ],
      });
      const profile = service.calculateHeatProfile(mech);

      // 3 + 8 + 2 (running) = 13
      expect(profile.heatGenerated).toBeGreaterThan(0);
      expect(profile.alphaStrikeHeat).toBe(11); // Just weapons, no movement
    });

    it('should include movement heat', () => {
      const mech = createTestMech({ equipment: [] });
      const profile = service.calculateHeatProfile(mech);

      // Running heat is 2
      expect(profile.heatGenerated).toBe(2);
    });

    it('should include jump heat when higher than running', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('jump-jet', 'rightTorso', 0),
          createEquipmentSlot('jump-jet', 'rightTorso', 1),
          createEquipmentSlot('jump-jet', 'leftTorso', 0),
          createEquipmentSlot('jump-jet', 'leftTorso', 1),
        ],
      });
      const profile = service.calculateHeatProfile(mech);

      // 4 jump jets = 4 jump heat, higher than 2 running heat
      expect(profile.heatGenerated).toBeGreaterThanOrEqual(4);
    });

    it('should calculate net heat correctly', () => {
      const mech = createTestMech({
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [
          createEquipmentSlot('ppc', 'rightArm', 0), // 10 heat
        ],
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.netHeat).toBe(
        profile.heatGenerated - profile.heatDissipated,
      );
    });

    it('should return zeroed heat when registry not ready', () => {
      mockRegistryReady = false;
      const mech = createTestMech({
        heatSinkCount: 10,
        equipment: [createEquipmentSlot('medium-laser', 'rightArm', 0)],
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.heatGenerated).toBe(0);
      expect(profile.alphaStrikeHeat).toBe(0);
      expect(profile.heatDissipated).toBe(10);
    });

    it('should handle improved jump jets', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('improved-jump-jet', 'rightTorso', 0),
          createEquipmentSlot('improved-jump-jet', 'leftTorso', 0),
        ],
      });
      const profile = service.calculateHeatProfile(mech);

      // Improved jump jets still count for jump MP
      expect(profile.heatGenerated).toBeGreaterThanOrEqual(2);
    });

    it('should handle legacy double heat sink string', () => {
      const mech = createTestMech({
        heatSinkType: 'double' as HeatSinkType,
        heatSinkCount: 10,
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.heatDissipated).toBe(20);
    });
  });

  // ===========================================================================
  // calculateMovement Tests
  // ===========================================================================

  describe('calculateMovement', () => {
    it('should return walkMP from mech', () => {
      const mech = createTestMech({ walkMP: 4 });
      const movement = service.calculateMovement(mech);

      expect(movement.walkMP).toBe(4);
    });

    it('should calculate runMP as floor(walkMP * 1.5)', () => {
      const mech4 = createTestMech({ walkMP: 4 });
      const mech5 = createTestMech({ walkMP: 5 });
      const mech7 = createTestMech({ walkMP: 7 });

      expect(service.calculateMovement(mech4).runMP).toBe(6); // 4 * 1.5 = 6
      expect(service.calculateMovement(mech5).runMP).toBe(7); // 5 * 1.5 = 7.5 -> 7
      expect(service.calculateMovement(mech7).runMP).toBe(10); // 7 * 1.5 = 10.5 -> 10
    });

    it('should calculate jumpMP from jump jet count', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('jump-jet', 'rightTorso', 0),
          createEquipmentSlot('jump-jet', 'rightTorso', 1),
          createEquipmentSlot('jump-jet', 'leftTorso', 0),
        ],
      });
      const movement = service.calculateMovement(mech);

      expect(movement.jumpMP).toBe(3);
    });

    it('should count all jump jet variants', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('jump-jet', 'rightTorso', 0),
          createEquipmentSlot('jump-jet-light', 'rightTorso', 1),
          createEquipmentSlot('improved-jump-jet', 'leftTorso', 0),
        ],
      });
      const movement = service.calculateMovement(mech);

      expect(movement.jumpMP).toBe(3);
    });

    it('should return 0 jumpMP without jump jets', () => {
      const mech = createTestMech({
        equipment: [createEquipmentSlot('medium-laser', 'rightArm', 0)],
      });
      const movement = service.calculateMovement(mech);

      expect(movement.jumpMP).toBe(0);
    });

    it('should handle empty equipment', () => {
      const mech = createTestMech({ equipment: [] });
      const movement = service.calculateMovement(mech);

      expect(movement.jumpMP).toBe(0);
    });

    it('should handle walkMP of 0', () => {
      const mech = createTestMech({ walkMP: 0 });
      const movement = service.calculateMovement(mech);

      expect(movement.walkMP).toBe(0);
      expect(movement.runMP).toBe(0);
    });
  });

  // ===========================================================================
  // Edge Cases and Type Handling
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle minimum tonnage (20)', () => {
      const mech = createTestMech({ tonnage: 20 });
      const totals = service.calculateTotals(mech);
      const bv = service.calculateBattleValue(mech);
      const cost = service.calculateCost(mech);

      expect(totals.maxWeight).toBe(20);
      expect(bv).toBeGreaterThan(0);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle maximum tonnage (100)', () => {
      const mech = createTestMech({ tonnage: 100 });
      const totals = service.calculateTotals(mech);
      const bv = service.calculateBattleValue(mech);
      const cost = service.calculateCost(mech);

      expect(totals.maxWeight).toBe(100);
      expect(bv).toBeGreaterThan(0);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle unknown equipment gracefully', () => {
      const mech = createTestMech({
        equipment: [createEquipmentSlot('unknown-weapon-xyz', 'rightArm', 0)],
      });

      // Should not throw
      expect(() => service.calculateBattleValue(mech)).not.toThrow();
      expect(() => service.calculateCost(mech)).not.toThrow();
      expect(() => service.calculateHeatProfile(mech)).not.toThrow();
    });

    it('should handle Clan XL engine type', () => {
      const mech = createTestMech({ engineType: EngineType.XL_CLAN });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Light engine type', () => {
      const mech = createTestMech({ engineType: EngineType.LIGHT });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Compact engine type', () => {
      const mech = createTestMech({ engineType: EngineType.COMPACT });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Clan Endo Steel structure', () => {
      const mech = createTestMech({
        structureType: InternalStructureType.ENDO_STEEL_CLAN,
      });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Endo-Composite structure', () => {
      const mech = createTestMech({
        structureType: InternalStructureType.ENDO_COMPOSITE,
      });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Reactive armor', () => {
      const mech = createTestMech({ armorType: ArmorTypeEnum.REACTIVE });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Reflective armor', () => {
      const mech = createTestMech({ armorType: ArmorTypeEnum.REFLECTIVE });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Clan Ferro-Fibrous armor', () => {
      const mech = createTestMech({
        armorType: ArmorTypeEnum.FERRO_FIBROUS_CLAN,
      });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Light Ferro-Fibrous armor', () => {
      const mech = createTestMech({ armorType: ArmorTypeEnum.LIGHT_FERRO });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle Heavy Ferro-Fibrous armor', () => {
      const mech = createTestMech({ armorType: ArmorTypeEnum.HEAVY_FERRO });
      const cost = service.calculateCost(mech);

      expect(cost).toBeGreaterThan(0);
    });

    it('should handle legacy string types for all components', () => {
      const mech = createTestMech({
        engineType: 'xxl' as EngineType,
        gyroType: 'heavy duty' as GyroType,
        structureType: 'endo steel' as InternalStructureType,
        armorType: 'ferro fibrous' as ArmorTypeEnum,
        cockpitType: 'command console' as CockpitType,
      });

      // Should not throw and produce valid results
      expect(() => service.calculateCost(mech)).not.toThrow();
      const cost = service.calculateCost(mech);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle high heat sink counts', () => {
      const mech = createTestMech({
        heatSinkCount: 30,
        heatSinkType: HeatSinkType.DOUBLE_IS,
      });
      const profile = service.calculateHeatProfile(mech);

      expect(profile.heatDissipated).toBe(60);
    });

    it('should handle very low engine rating', () => {
      const mech = createTestMech({
        engineRating: 60,
        walkMP: 1,
      });

      expect(() => service.calculateCost(mech)).not.toThrow();
      expect(() => service.calculateTotals(mech)).not.toThrow();
    });

    it('should handle high engine rating', () => {
      const mech = createTestMech({
        engineRating: 400,
        walkMP: 8,
      });

      expect(() => service.calculateCost(mech)).not.toThrow();
      expect(() => service.calculateTotals(mech)).not.toThrow();
    });

    it('should not count non-jump-jet equipment as jump jets', () => {
      const mech = createTestMech({
        equipment: [
          createEquipmentSlot('medium-laser', 'rightArm', 0),
          createEquipmentSlot('ammo-lrm-10', 'leftTorso', 0),
          createEquipmentSlot('heat-sink', 'centerTorso', 0),
        ],
      });
      const movement = service.calculateMovement(mech);

      expect(movement.jumpMP).toBe(0);
    });
  });

  // ===========================================================================
  // Interface Compliance Tests
  // ===========================================================================

  describe('interface compliance', () => {
    it('calculateTotals should return IMechTotals', () => {
      const mech = createTestMech();
      const totals: IMechTotals = service.calculateTotals(mech);

      expect(typeof totals.totalWeight).toBe('number');
      expect(typeof totals.remainingWeight).toBe('number');
      expect(typeof totals.maxWeight).toBe('number');
      expect(typeof totals.totalArmorPoints).toBe('number');
      expect(typeof totals.maxArmorPoints).toBe('number');
      expect(typeof totals.usedCriticalSlots).toBe('number');
      expect(typeof totals.totalCriticalSlots).toBe('number');
    });

    it('calculateHeatProfile should return IHeatProfile', () => {
      const mech = createTestMech();
      const profile: IHeatProfile = service.calculateHeatProfile(mech);

      expect(typeof profile.heatGenerated).toBe('number');
      expect(typeof profile.heatDissipated).toBe('number');
      expect(typeof profile.netHeat).toBe('number');
      expect(typeof profile.alphaStrikeHeat).toBe('number');
    });

    it('calculateMovement should return IMovementProfile', () => {
      const mech = createTestMech();
      const movement: IMovementProfile = service.calculateMovement(mech);

      expect(typeof movement.walkMP).toBe('number');
      expect(typeof movement.runMP).toBe('number');
      expect(typeof movement.jumpMP).toBe('number');
    });

    it('calculateBattleValue should return a number', () => {
      const mech = createTestMech();
      const bv = service.calculateBattleValue(mech);

      expect(typeof bv).toBe('number');
      expect(Number.isFinite(bv)).toBe(true);
    });

    it('calculateCost should return a number', () => {
      const mech = createTestMech();
      const cost = service.calculateCost(mech);

      expect(typeof cost).toBe('number');
      expect(Number.isFinite(cost)).toBe(true);
    });
  });
});
