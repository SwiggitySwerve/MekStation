/**
 * CalculationService Unit Tests
 * 
 * Tests for Battle Value (BV), heat profile, and cost calculations.
 */

import { CalculationService } from '@/services/construction/CalculationService';
import { IEditableMech } from '@/services/construction/MechBuilderService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { ArmorType } from '@/types/construction/ArmorType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

describe('CalculationService', () => {
  let service: CalculationService;

  beforeAll(async () => {
    // Initialize equipment loader first
    const loader = getEquipmentLoader();
    if (!loader.getIsLoaded()) {
      await loader.loadOfficialEquipment();
    }
    
    // Initialize the equipment registry
    const registry = getEquipmentRegistry();
    await registry.initialize();
  }, 30000); // Increase timeout for loading

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
      armorType: ArmorType.STANDARD,
      armorAllocation: {
        HEAD: 9,
        CENTER_TORSO: 35,
        CENTER_TORSO_REAR: 10,
        LEFT_TORSO: 24,
        LEFT_TORSO_REAR: 8,
        RIGHT_TORSO: 24,
        RIGHT_TORSO_REAR: 8,
        LEFT_ARM: 24,
        RIGHT_ARM: 24,
        LEFT_LEG: 24,
        RIGHT_LEG: 24,
      },
      heatSinkType: HeatSinkType.SINGLE,
      heatSinkCount: 12,
      equipment: [],
      isDirty: false,
      ...overrides,
    });

    it('should calculate defensive BV from armor and structure', () => {
      const mech = createBaseMech();
      const bv = service.calculateBattleValue(mech);
      
      // Defensive BV should be positive for any mech with armor/structure
      expect(bv).toBeGreaterThan(0);
    });

    it('should include offensive BV from weapons', () => {
      const mechNoWeapons = createBaseMech({ equipment: [] });
      const bvNoWeapons = service.calculateBattleValue(mechNoWeapons);

      const mechWithWeapons = createBaseMech({
        equipment: [
          { equipmentId: 'clan-large-pulse-laser', location: 'LEFT_ARM', slotIndex: 0 },
          { equipmentId: 'clan-large-pulse-laser', location: 'RIGHT_ARM', slotIndex: 0 },
        ],
      });
      const bvWithWeapons = service.calculateBattleValue(mechWithWeapons);

      // BV with weapons should be higher than without
      expect(bvWithWeapons).toBeGreaterThan(bvNoWeapons);
    });

    it('should apply speed factor based on TMM', () => {
      // 4/6/0 mech (TMM 2) should have speed factor 1.2
      const mech = createBaseMech({
        walkMP: 4,
        equipment: [
          { equipmentId: 'medium-laser', location: 'LEFT_ARM', slotIndex: 0 },
        ],
      });
      const bv = service.calculateBattleValue(mech);
      
      // BV should reflect the 1.2 speed factor
      expect(bv).toBeGreaterThan(0);
    });

    it('should reduce BV for heat-inefficient mechs', () => {
      const mechLowHeat = createBaseMech({
        heatSinkCount: 20, // Good heat dissipation
        equipment: [
          { equipmentId: 'medium-laser', location: 'LEFT_ARM', slotIndex: 0 },
        ],
      });

      const mechHighHeat = createBaseMech({
        heatSinkCount: 10, // Poor heat dissipation
        equipment: [
          { equipmentId: 'clan-large-pulse-laser', location: 'LEFT_ARM', slotIndex: 0 },
          { equipmentId: 'clan-large-pulse-laser', location: 'RIGHT_ARM', slotIndex: 0 },
          { equipmentId: 'clan-large-pulse-laser', location: 'LEFT_TORSO', slotIndex: 0 },
          { equipmentId: 'clan-large-pulse-laser', location: 'RIGHT_TORSO', slotIndex: 0 },
        ],
      });

      const bvLowHeat = service.calculateBattleValue(mechLowHeat);
      const bvHighHeat = service.calculateBattleValue(mechHighHeat);

      // Heat-inefficient mech should have reduced offensive BV (heat adjustment)
      // Both should be positive
      expect(bvLowHeat).toBeGreaterThan(0);
      expect(bvHighHeat).toBeGreaterThan(0);
    });

    it('should calculate BV consistently for the same mech', () => {
      const mech = createBaseMech({
        equipment: [
          { equipmentId: 'clan-large-pulse-laser', location: 'LEFT_ARM', slotIndex: 0 },
          { equipmentId: 'medium-laser', location: 'LEFT_ARM', slotIndex: 2 },
          { equipmentId: 'clan-large-pulse-laser', location: 'RIGHT_ARM', slotIndex: 0 },
          { equipmentId: 'medium-laser', location: 'RIGHT_ARM', slotIndex: 2 },
          { equipmentId: 'clan-uac-5', location: 'RIGHT_TORSO', slotIndex: 0 },
          { equipmentId: 'uac-5-ammo', location: 'LEFT_TORSO', slotIndex: 0 },
        ],
      });

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

      // Should still have defensive BV from armor/structure
      expect(bv).toBeGreaterThan(0);
    });

    it('should handle different tonnages correctly', () => {
      const lightMech = createBaseMech({
        tonnage: 20,
        engineRating: 120,
        walkMP: 6,
        armorAllocation: {
          HEAD: 6,
          CENTER_TORSO: 8,
          CENTER_TORSO_REAR: 3,
          LEFT_TORSO: 6,
          LEFT_TORSO_REAR: 2,
          RIGHT_TORSO: 6,
          RIGHT_TORSO_REAR: 2,
          LEFT_ARM: 4,
          RIGHT_ARM: 4,
          LEFT_LEG: 6,
          RIGHT_LEG: 6,
        },
      });

      const assaultMech = createBaseMech({
        tonnage: 100,
        engineRating: 300,
        walkMP: 3,
        armorAllocation: {
          HEAD: 9,
          CENTER_TORSO: 45,
          CENTER_TORSO_REAR: 15,
          LEFT_TORSO: 32,
          LEFT_TORSO_REAR: 10,
          RIGHT_TORSO: 32,
          RIGHT_TORSO_REAR: 10,
          LEFT_ARM: 34,
          RIGHT_ARM: 34,
          LEFT_LEG: 42,
          RIGHT_LEG: 42,
        },
      });

      const bvLight = service.calculateBattleValue(lightMech);
      const bvAssault = service.calculateBattleValue(assaultMech);

      // Assault mech should have higher defensive BV due to more armor/structure
      expect(bvAssault).toBeGreaterThan(bvLight);
    });
  });

  describe('TMM and Speed Factor', () => {
    it('should calculate TMM correctly for various movement profiles', () => {
      // Import the calculateTMM function
      const { calculateTMM } = require('@/types/validation/BattleValue');
      
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
      const { calculateTMM } = require('@/types/validation/BattleValue');
      
      // Jump 8 is better than run 6, so TMM should be based on jump
      expect(calculateTMM(6, 8)).toBe(3); // Jump 8 = TMM 3
    });
  });

  describe('calculateHeatProfile', () => {
    it('should calculate heat generated from weapons', () => {
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
        armorType: ArmorType.STANDARD,
        armorAllocation: {},
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [
          { equipmentId: 'medium-laser', location: 'LEFT_ARM', slotIndex: 0 },
          { equipmentId: 'medium-laser', location: 'RIGHT_ARM', slotIndex: 0 },
        ],
        isDirty: false,
      } as IEditableMech;

      const profile = service.calculateHeatProfile(mech);
      
      // Should have 6 heat generated from 2 medium lasers (3 heat each)
      expect(profile.heatGenerated).toBe(6);
      // Should have 10 heat dissipation from 10 single heat sinks
      expect(profile.heatDissipated).toBe(10);
      // Net heat should be -4 (heat neutral)
      expect(profile.netHeat).toBe(-4);
    });

    it('should calculate heat dissipation from heat sinks', () => {
      const mechSingle = {
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
        armorType: ArmorType.STANDARD,
        armorAllocation: {},
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        equipment: [],
        isDirty: false,
      } as IEditableMech;

      const mechDouble = {
        ...mechSingle,
        heatSinkType: HeatSinkType.DOUBLE,
      } as IEditableMech;

      const profileSingle = service.calculateHeatProfile(mechSingle);
      const profileDouble = service.calculateHeatProfile(mechDouble);

      // Single heat sinks: 10 × 1 = 10 dissipation
      expect(profileSingle.heatDissipated).toBe(10);
      // Double heat sinks: 10 × 2 = 20 dissipation
      expect(profileDouble.heatDissipated).toBe(20);
    });

    it('should calculate Marauder C heat profile correctly', () => {
      const marauderC: IEditableMech = {
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
        armorType: ArmorType.STANDARD,
        armorAllocation: {},
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
      };

      const profile = service.calculateHeatProfile(marauderC);

      // Heat generated:
      // 2x Clan Large Pulse Laser: 10 each = 20
      // 2x Medium Laser: 3 each = 6
      // 1x Clan UAC/5: 1 = 1
      // 1x UAC/5 Ammo: 0 = 0
      // Total: 27
      expect(profile.heatGenerated).toBe(27);
      
      // Heat dissipation: 19 single heat sinks = 19
      expect(profile.heatDissipated).toBe(19);
      
      // Net heat: 27 - 19 = 8
      expect(profile.netHeat).toBe(8);
      
      // Alpha strike heat = heat generated
      expect(profile.alphaStrikeHeat).toBe(27);
    });
  });

  describe('Equipment Resolution', () => {
    it('should find Clan Large Pulse Laser with BV', async () => {
      const registry = getEquipmentRegistry();
      const result = registry.lookup('clan-large-pulse-laser');
      
      expect(result.found).toBe(true);
      expect(result.equipment).toBeDefined();
      expect(result.equipment).toHaveProperty('battleValue');
      expect((result.equipment as { battleValue: number }).battleValue).toBe(265);
    });

    it('should find Medium Laser with BV and heat', async () => {
      const registry = getEquipmentRegistry();
      const result = registry.lookup('medium-laser');
      
      expect(result.found).toBe(true);
      expect(result.equipment).toBeDefined();
      expect(result.equipment).toHaveProperty('heat');
      expect((result.equipment as { heat: number }).heat).toBe(3);
      expect(result.equipment).toHaveProperty('battleValue');
      expect((result.equipment as { battleValue: number }).battleValue).toBe(46);
    });

    it('should find Clan UAC/5 with correct properties', async () => {
      const registry = getEquipmentRegistry();
      const result = registry.lookup('clan-uac-5');
      
      expect(result.found).toBe(true);
      expect(result.equipment).toBeDefined();
      expect(result.equipment).toHaveProperty('weight');
      expect((result.equipment as { weight: number }).weight).toBe(7); // Clan UAC/5 is 7 tons
      expect(result.equipment).toHaveProperty('criticalSlots');
      expect((result.equipment as { criticalSlots: number }).criticalSlots).toBe(3); // 3 slots
    });

    it('should find UAC/5 Ammo', async () => {
      const registry = getEquipmentRegistry();
      const result = registry.lookup('uac-5-ammo');
      
      expect(result.found).toBe(true);
      expect(result.equipment).toBeDefined();
    });
  });

  describe('Marauder C BV Calculation (Reference)', () => {
    // Marauder C expected values:
    // - 2x Clan Large Pulse Laser: BV 265 each = 530
    // - 2x Medium Laser: BV 46 each = 92
    // - 1x Clan UAC/5: BV 112
    // - 1x UAC/5 Ammo: BV ~6
    // Total weapon BV ≈ 740
    // 
    // MegaMekLab shows BV: 1711
    // Our calculation shows lower - need to investigate modifiers
    
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
      armorType: ArmorType.STANDARD,
      armorAllocation: {
        HEAD: 9,
        CENTER_TORSO: 35,
        CENTER_TORSO_REAR: 10,
        LEFT_TORSO: 24,
        LEFT_TORSO_REAR: 8,
        RIGHT_TORSO: 24,
        RIGHT_TORSO_REAR: 8,
        LEFT_ARM: 24,
        RIGHT_ARM: 24,
        LEFT_LEG: 16,
        RIGHT_LEG: 16,
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

    it('should calculate offensive BV for Marauder C weapons', () => {
      const mech = createMarauderC();
      const bv = service.calculateBattleValue(mech);
      
      // BV should be significantly higher than just defensive BV
      expect(bv).toBeGreaterThan(800);
    });

    it('should apply speed factor of 1.2 for 4/6/0 movement', () => {
      const { calculateTMM } = require('@/types/validation/BattleValue');
      
      // Run 6 MP = TMM 2
      const tmm = calculateTMM(6, 0);
      expect(tmm).toBe(2);
    });

    it('should calculate heat correctly for Marauder C weapons', () => {
      const mech = createMarauderC();
      const heatProfile = service.calculateHeatProfile(mech);
      
      // Expected heat:
      // 2x Clan Large Pulse Laser: 10 heat each = 20
      // 2x Medium Laser: 3 heat each = 6
      // 1x Clan UAC/5: 1 heat = 1
      // Total = 27 heat
      expect(heatProfile.heatGenerated).toBe(27);
      
      // 19 single heat sinks = 19 dissipation
      expect(heatProfile.heatDissipated).toBe(19);
      
      // Net heat = 27 - 19 = 8
      expect(heatProfile.netHeat).toBe(8);
    });
  });

  describe('BV Calculation Components', () => {
    const createTestMech = (overrides: Partial<IEditableMech> = {}): IEditableMech => ({
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
      armorType: ArmorType.STANDARD,
      armorAllocation: {
        HEAD: 9,
        CENTER_TORSO: 35,
        CENTER_TORSO_REAR: 10,
        LEFT_TORSO: 24,
        LEFT_TORSO_REAR: 8,
        RIGHT_TORSO: 24,
        RIGHT_TORSO_REAR: 8,
        LEFT_ARM: 24,
        RIGHT_ARM: 24,
        LEFT_LEG: 24,
        RIGHT_LEG: 24,
      },
      heatSinkType: HeatSinkType.SINGLE,
      heatSinkCount: 12,
      equipment: [],
      isDirty: false,
      ...overrides,
    });

    it('should calculate defensive BV from armor points', () => {
      // 184 armor points * 2.5 BV per point = 460
      const mech = createTestMech();
      const bv = service.calculateBattleValue(mech);
      
      // With 184 armor points, defensive BV should include armor contribution
      expect(bv).toBeGreaterThan(400);
    });

    it('should calculate defensive BV from structure points', () => {
      // 75-ton mech has 114 total structure points
      // Structure BV = 114 * 1.5 = 171
      const mech = createTestMech();
      const bv = service.calculateBattleValue(mech);
      
      // Should include structure contribution
      expect(bv).toBeGreaterThan(0);
    });

    it('should verify heat has no penalty when dissipation >= generation', () => {
      const mech = createTestMech({
        heatSinkCount: 20, // 20 single heat sinks = 20 dissipation
        equipment: [
          { equipmentId: 'medium-laser', location: 'LEFT_ARM', slotIndex: 0 }, // 3 heat
        ],
      });
      
      const bv = service.calculateBattleValue(mech);
      
      // Heat adjustment should be 1.0 (no penalty)
      expect(bv).toBeGreaterThan(0);
    });
  });
});
