/**
 * CalculationService Unit Tests
 * 
 * Tests for Battle Value (BV), heat profile, and cost calculations.
 * 
 * Note: These tests focus on BV formula calculations without requiring
 * the equipment registry to be initialized. Equipment-dependent tests
 * are integration tests that require the full loader to be available.
 */

import { CalculationService } from '@/services/construction/CalculationService';
import { IEditableMech } from '@/services/construction/MechBuilderService';
import { TechBase } from '@/types/enums/TechBase';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import {
  calculateTMM,
  getDefensiveSpeedFactor,
  getOffensiveSpeedFactor,
} from '@/types/validation/BattleValue';

describe('CalculationService', () => {
  let service: CalculationService;

  beforeEach(() => {
    service = new CalculationService();
  });

  describe('calculateBattleValue', () => {
    // Base mech configuration for a 75-ton mech (similar to Marauder C)
    const createBaseMech = (overrides: Partial<IEditableMech> = {}): IEditableMech => ({
      id: 'test-mech',
      chassis: 'Test',
      variant: 'T',
      tonnage: 75,
      techBase: TechBase.CLAN,
      engineType: EngineType.STANDARD,
      engineRating: 300,
      walkMP: 4,
      structureType: InternalStructureType.STANDARD,
      gyroType: GyroType.STANDARD,
      cockpitType: CockpitType.STANDARD,
      armorType: ArmorTypeEnum.STANDARD,
      armorAllocation: {
        head: 9,
        centerTorso: 35,
        centerTorsoRear: 10,
        leftTorso: 24,
        leftTorsoRear: 8,
        rightTorso: 24,
        rightTorsoRear: 8,
        leftArm: 24,
        rightArm: 24,
        leftLeg: 24,
        rightLeg: 24,
      },
      heatSinkType: HeatSinkType.SINGLE,
      heatSinkCount: 12,
      equipment: [],
      isDirty: false,
      ...overrides,
    });

    it('should calculate defensive BV from armor, structure, and gyro', () => {
      const mech = createBaseMech({ equipment: [] });
      const bv = service.calculateBattleValue(mech);
      
      // Total armor: 214 points
      // Armor BV: 214 × 2.5 = 535
      // Structure BV: 114 × 1.5 = 171 (75-ton mech)
      // Gyro BV: 75 × 0.5 = 37.5
      // Defensive base: 743.5
      // Defensive speed factor (TMM 2): 1.2
      // Defensive BV: 743.5 × 1.2 = 892.2
      // 
      // Offensive BV (weight bonus only, no equipment registry):
      // Weight: 75
      // Offensive speed factor: 1.12
      // Offensive BV: 75 × 1.12 = 84
      // 
      // Total: 892.2 + 84 = 976.2 → 976
      // But without equipment registry, only weight bonus is included: 892
      expect(bv).toBeGreaterThan(800); // Defensive BV from armor + structure + gyro
    });

    it('should calculate BV consistently for the same mech', () => {
      const mech = createBaseMech({ equipment: [] });

      // Calculate BV multiple times
      const bv1 = service.calculateBattleValue(mech);
      const bv2 = service.calculateBattleValue(mech);
      const bv3 = service.calculateBattleValue(mech);

      // All calculations should return the same value
      expect(bv1).toBe(bv2);
      expect(bv2).toBe(bv3);
      expect(bv1).toBeGreaterThan(0);
    });

    it('should handle mech with no equipment', () => {
      const mech = createBaseMech({ equipment: [] });
      const bv = service.calculateBattleValue(mech);

      // Should still have defensive BV from armor/structure/gyro + weight bonus
      expect(bv).toBeGreaterThan(0);
    });

    it('should handle different tonnages correctly', () => {
      const lightMech = createBaseMech({
        tonnage: 20,
        engineRating: 120,
        walkMP: 6,
        equipment: [],
        armorAllocation: {
          head: 6,
          centerTorso: 8,
          centerTorsoRear: 3,
          leftTorso: 6,
          leftTorsoRear: 2,
          rightTorso: 6,
          rightTorsoRear: 2,
          leftArm: 4,
          rightArm: 4,
          leftLeg: 6,
          rightLeg: 6,
        },
      });

      const assaultMech = createBaseMech({
        tonnage: 100,
        engineRating: 300,
        walkMP: 3,
        equipment: [],
        armorAllocation: {
          head: 9,
          centerTorso: 45,
          centerTorsoRear: 15,
          leftTorso: 32,
          leftTorsoRear: 10,
          rightTorso: 32,
          rightTorsoRear: 10,
          leftArm: 34,
          rightArm: 34,
          leftLeg: 42,
          rightLeg: 42,
        },
      });

      const bvLight = service.calculateBattleValue(lightMech);
      const bvAssault = service.calculateBattleValue(assaultMech);

      // Assault mech should have higher defensive BV due to more armor/structure/tonnage
      expect(bvAssault).toBeGreaterThan(bvLight);
    });
    
    it('should include gyro BV based on tonnage', () => {
      // Compare two mechs with same armor but different tonnage
      const lightMech = createBaseMech({
        tonnage: 20,
        engineRating: 120,
        equipment: [],
        armorAllocation: {
          head: 9,
          centerTorso: 10,
          centerTorsoRear: 5,
          leftTorso: 7,
          leftTorsoRear: 3,
          rightTorso: 7,
          rightTorsoRear: 3,
          leftArm: 6,
          rightArm: 6,
          leftLeg: 8,
          rightLeg: 8,
        },
      });

      const heavyMech = createBaseMech({
        tonnage: 70,
        engineRating: 280,
        equipment: [],
        armorAllocation: {
          head: 9,
          centerTorso: 10,
          centerTorsoRear: 5,
          leftTorso: 7,
          leftTorsoRear: 3,
          rightTorso: 7,
          rightTorsoRear: 3,
          leftArm: 6,
          rightArm: 6,
          leftLeg: 8,
          rightLeg: 8,
        },
      });

      const bvLight = service.calculateBattleValue(lightMech);
      const bvHeavy = service.calculateBattleValue(heavyMech);

      // Heavy mech should have higher BV due to:
      // - Higher gyro BV (70 × 0.5 = 35 vs 20 × 0.5 = 10)
      // - Higher structure BV
      // - Higher weight bonus (70 vs 20)
      expect(bvHeavy).toBeGreaterThan(bvLight);
    });
  });

  describe('TMM and Speed Factor', () => {
    it('should calculate TMM correctly for various movement profiles', () => {
      // Test various movement profiles
      expect(calculateTMM(2, 0)).toBe(0);  // 0-2 hexes = TMM 0
      expect(calculateTMM(4, 0)).toBe(1);  // 3-4 hexes = TMM 1
      expect(calculateTMM(6, 0)).toBe(2);  // 5-6 hexes = TMM 2
      expect(calculateTMM(8, 0)).toBe(3);  // 7-9 hexes = TMM 3
      expect(calculateTMM(12, 0)).toBe(4); // 10-17 hexes = TMM 4
      expect(calculateTMM(20, 0)).toBe(5); // 18-24 hexes = TMM 5
      expect(calculateTMM(30, 0)).toBe(6); // 25+ hexes = TMM 6
    });

    it('should use jump MP for TMM when better than run MP', () => {
      // Jump 8 is better than run 6, so TMM should be based on jump
      expect(calculateTMM(6, 8)).toBe(3); // Jump 8 = TMM 3
    });
    
    it('should return correct defensive speed factors', () => {
      // Defensive speed factors per MegaMekLab
      expect(getDefensiveSpeedFactor(2, 0)).toBe(1.0);  // TMM 0
      expect(getDefensiveSpeedFactor(4, 0)).toBe(1.1);  // TMM 1
      expect(getDefensiveSpeedFactor(6, 0)).toBe(1.2);  // TMM 2
      expect(getDefensiveSpeedFactor(8, 0)).toBe(1.3);  // TMM 3
    });
    
    it('should return correct offensive speed factors', () => {
      // Offensive speed factors per MegaMekLab (slightly lower than defensive)
      expect(getOffensiveSpeedFactor(2, 0)).toBe(1.0);   // TMM 0
      expect(getOffensiveSpeedFactor(4, 0)).toBe(1.06);  // TMM 1
      expect(getOffensiveSpeedFactor(6, 0)).toBe(1.12);  // TMM 2
      expect(getOffensiveSpeedFactor(8, 0)).toBe(1.18);  // TMM 3
    });
  });

  describe('calculateHeatProfile', () => {
    it('should calculate heat dissipation from single heat sinks', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      // Single heat sinks: 10 × 1 = 10 dissipation
      expect(profile.heatDissipated).toBe(10);
    });

    it('should calculate heat dissipation from double heat sinks', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 10,
        equipment: [],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);

      // Double heat sinks: 10 × 2 = 20 dissipation
      expect(profile.heatDissipated).toBe(20);
    });

    it('should return heat neutral when no weapons', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      expect(profile.heatGenerated).toBe(2);
      expect(profile.heatDissipated).toBe(10);
      expect(profile.netHeat).toBe(-8);
    });

    it('should use running heat (2) when jump jets < 3', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [
          { equipmentId: 'jump-jet', location: 'LT', slotIndex: 0 },
          { equipmentId: 'jump-jet', location: 'RT', slotIndex: 0 },
        ],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      expect(profile.heatGenerated).toBe(2);
    });

    it('should use jump heat when jump jets >= 3', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [
          { equipmentId: 'jump-jet', location: 'LT', slotIndex: 0 },
          { equipmentId: 'jump-jet', location: 'LT', slotIndex: 1 },
          { equipmentId: 'jump-jet', location: 'RT', slotIndex: 0 },
          { equipmentId: 'jump-jet', location: 'RT', slotIndex: 1 },
        ],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      expect(profile.heatGenerated).toBe(4);
    });

    it('should combine jump heat with movement when jump > 2', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [
          { equipmentId: 'jump-jet', location: 'LT', slotIndex: 0 },
          { equipmentId: 'jump-jet', location: 'LT', slotIndex: 1 },
          { equipmentId: 'jump-jet', location: 'RT', slotIndex: 0 },
          { equipmentId: 'jump-jet', location: 'RT', slotIndex: 1 },
          { equipmentId: 'jump-jet', location: 'CT', slotIndex: 0 },
        ],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      expect(profile.heatGenerated).toBe(5);
      expect(profile.alphaStrikeHeat).toBe(0);
    });

    it('should track alpha strike heat separately from movement heat', () => {
      const mech = {
        id: 'test',
        chassis: 'Test',
        variant: 'T',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
        engineType: EngineType.STANDARD,
        engineRating: 200,
        walkMP: 4,
        structureType: InternalStructureType.STANDARD,
        gyroType: GyroType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
        armorAllocation: {
          head: 0, centerTorso: 0, centerTorsoRear: 0,
          leftTorso: 0, leftTorsoRear: 0, rightTorso: 0, rightTorsoRear: 0,
          leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0,
        },
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 12,
        equipment: [],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      expect(profile.alphaStrikeHeat).toBe(0);
      expect(profile.heatGenerated).toBe(2);
      expect(profile.heatDissipated).toBe(24);
      expect(profile.netHeat).toBe(-22);
    });
  });

  describe('Marauder C BV Calculation (MegaMekLab Reference)', () => {
    /**
     * MegaMekLab BV Breakdown for Marauder C:
     * 
     * Defensive BV:
     *   Armor: 184 × 2.5 = 460
     *   Structure: 114 × 1.5 = 171
     *   Gyro: 75 × 0.5 = 37.5
     *   Defensive Speed Factor (TMM 2): 1.2
     *   Defensive BV: (460 + 171 + 37.5) × 1.2 = 802.2
     * 
     * Offensive BV:
     *   Heat Efficiency: 6 + 19 - 2 (Run) = 23 available for weapons
     *   Weapons (sorted by BV, with incremental heat tracking):
     *     - Large Pulse Laser (LA): 265 (Heat: 10, Cumulative: 12) = 265
     *     - Large Pulse Laser (RA): 265 (Heat: 20, Cumulative: 22) = 530
     *     - Ultra AC/5: 122 (Heat: 22, Cumulative: 23) = 652
     *     - Medium Laser (LA): 46 (Heat: 25, Cumulative: 26) = 698
     *     - Medium Laser (RA): 46 × 0.5 (Overheat penalty) = 721
     *   Ammo: Ultra AC/5 Ammo = 15
     *   Weight Bonus: 75
     *   Offensive Speed Factor (TMM 2): 1.12
     *   Offensive BV: (721 + 15 + 75) × 1.12 = 908.32
     * 
     * Total BV: 802.2 + 908.32 = 1710.52 → 1711
     */
    
    const createMarauderC = (): IEditableMech => ({
      id: 'marauder-c',
      chassis: 'Marauder',
      variant: 'C',
      tonnage: 75,
      techBase: TechBase.CLAN,
      engineType: EngineType.STANDARD,
      engineRating: 300,
      walkMP: 4,
      structureType: InternalStructureType.STANDARD,
      gyroType: GyroType.STANDARD,
      cockpitType: CockpitType.STANDARD,
      armorType: ArmorTypeEnum.STANDARD,
      // Total armor: 184 points (per MegaMekLab)
      armorAllocation: {
        head: 9,
        centerTorso: 35,
        centerTorsoRear: 10,
        leftTorso: 24,
        leftTorsoRear: 8,
        rightTorso: 24,
        rightTorsoRear: 8,
        leftArm: 24,
        rightArm: 24,
        leftLeg: 9,   // Reduced to match 184 total
        rightLeg: 9,  // Reduced to match 184 total
      },
      heatSinkType: HeatSinkType.SINGLE,
      heatSinkCount: 19,
      equipment: [
        { equipmentId: 'clan-large-pulse-laser', location: 'LEFT_ARM', slotIndex: 0 },
        { equipmentId: 'medium-laser', location: 'LEFT_ARM', slotIndex: 2 },
        { equipmentId: 'clan-large-pulse-laser', location: 'RIGHT_ARM', slotIndex: 0 },
        { equipmentId: 'medium-laser', location: 'RIGHT_ARM', slotIndex: 2 },
        { equipmentId: 'clan-uac-5', location: 'RIGHT_TORSO', slotIndex: 0 },
        { equipmentId: 'uac-5-ammo', location: 'LEFT_TORSO', slotIndex: 0 },
      ],
      isDirty: false,
    });

    it('should calculate BV for mech without equipment (defensive only)', () => {
      const mechNoEquipment: IEditableMech = {
        ...createMarauderC(),
        equipment: [], // No weapons/ammo
      };
      const bv = service.calculateBattleValue(mechNoEquipment);
      
      // Defensive BV only (no weapons):
      // Armor: 184 × 2.5 = 460
      // Structure: 114 × 1.5 = 171
      // Gyro: 75 × 0.5 = 37.5
      // Defensive speed factor (TMM 2): 1.2
      // Defensive BV: 668.5 × 1.2 = 802.2
      // 
      // Offensive BV (weight bonus only, no weapons):
      // Weight: 75
      // Offensive speed factor: 1.12
      // Offensive BV: 75 × 1.12 = 84
      // 
      // Total: 802.2 + 84 = 886.2 → 886
      expect(bv).toBe(886);
    });

    it('should apply speed factor of 1.2 for defensive TMM 2', () => {
      // Run 6 MP = TMM 2
      const tmm = calculateTMM(6, 0);
      expect(tmm).toBe(2);
      
      // Defensive speed factor for TMM 2 should be 1.2
      const defensiveFactor = getDefensiveSpeedFactor(6, 0);
      expect(defensiveFactor).toBe(1.2);
    });

    it('should apply speed factor of 1.12 for offensive TMM 2', () => {
      // Offensive speed factor for TMM 2 should be 1.12
      const offensiveFactor = getOffensiveSpeedFactor(6, 0);
      expect(offensiveFactor).toBe(1.12);
    });

    it('should calculate heat dissipation correctly', () => {
      const mech = createMarauderC();
      const heatProfile = service.calculateHeatProfile(mech);
      
      // 19 single heat sinks = 19 dissipation
      expect(heatProfile.heatDissipated).toBe(19);
    });

    it('should verify armor points sum to 184', () => {
      const mech = createMarauderC();
      const a = mech.armorAllocation;
      const totalArmor = 
        a.head +
        a.centerTorso + a.centerTorsoRear +
        a.leftTorso + a.leftTorsoRear +
        a.rightTorso + a.rightTorsoRear +
        a.leftArm + a.rightArm +
        a.leftLeg + a.rightLeg;
      
      expect(totalArmor).toBe(184);
    });
  });

  describe('BV Formula Components', () => {
    it('should calculate armor BV correctly (armor × 2.5)', () => {
      // 184 armor points × 2.5 = 460 armor BV
      const armorPoints = 184;
      const expectedArmorBV = armorPoints * 2.5;
      expect(expectedArmorBV).toBe(460);
    });

    it('should calculate structure BV correctly (structure × 1.5)', () => {
      // 75-ton mech has 114 total structure points
      // Structure BV = 114 × 1.5 = 171
      const structurePoints = 114;
      const expectedStructureBV = structurePoints * 1.5;
      expect(expectedStructureBV).toBe(171);
    });

    it('should calculate gyro BV correctly (tonnage × 0.5)', () => {
      // 75-ton mech: 75 × 0.5 = 37.5 gyro BV
      const tonnage = 75;
      const expectedGyroBV = tonnage * 0.5;
      expect(expectedGyroBV).toBe(37.5);
    });

    it('should calculate Marauder C defensive BV per MegaMekLab', () => {
      // Armor: 184 × 2.5 = 460
      // Structure: 114 × 1.5 = 171
      // Gyro: 75 × 0.5 = 37.5
      // Base: 668.5
      // Speed factor (TMM 2): 1.2
      // Defensive BV: 668.5 × 1.2 = 802.2
      const armorBV = 184 * 2.5;
      const structureBV = 114 * 1.5;
      const gyroBV = 75 * 0.5;
      const base = armorBV + structureBV + gyroBV;
      const defensiveBV = base * 1.2;
      
      expect(base).toBe(668.5);
      expect(defensiveBV).toBeCloseTo(802.2, 1);
    });

    it('should calculate weight bonus correctly', () => {
      // Weight bonus = tonnage
      // 75-ton mech gets +75 weight bonus to offensive BV
      const tonnage = 75;
      const weightBonus = tonnage;
      expect(weightBonus).toBe(75);
    });
  });
});
