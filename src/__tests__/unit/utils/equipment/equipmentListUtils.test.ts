import {
  getJumpJetEquipmentId,
  getJumpJetEquipment,
  createJumpJetEquipmentList,
  filterOutJumpJets,
  createInternalStructureEquipmentList,
  filterOutInternalStructure,
  createArmorEquipmentList,
  filterOutArmorSlots,
  getHeatSinkEquipmentId,
  getHeatSinkEquipment,
  createHeatSinkEquipmentList,
  filterOutHeatSinks,
  getEnhancementEquipmentId,
  getEnhancementEquipment,
  calculateEnhancementWeight,
  calculateEnhancementSlots,
  createEnhancementEquipmentList,
  filterOutEnhancementEquipment,
} from '@/utils/equipment/equipmentListUtils';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

// Mock EquipmentCalculatorService
interface MockEquipmentParams {
  tonnage?: number;
  engineWeight?: number;
}

jest.mock('@/services/equipment/EquipmentCalculatorService', () => ({
  equipmentCalculatorService: {
    calculateProperties: jest.fn((id: string, params: MockEquipmentParams) => {
      if (id === 'masc-is') {
        return { weight: Math.ceil((params.tonnage ?? 0) / 20), criticalSlots: Math.ceil((params.tonnage ?? 0) / 20) };
      }
      if (id === 'masc-clan') {
        return { weight: Math.ceil((params.tonnage ?? 0) / 25), criticalSlots: Math.ceil((params.tonnage ?? 0) / 25) };
      }
      if (id === 'supercharger') {
        return { weight: Math.ceil((params.engineWeight ?? 0) / 10) * 0.5, criticalSlots: 1 };
      }
      if (id === 'tsm') {
        return { weight: 0, criticalSlots: 6 };
      }
      if (id === 'partial-wing') {
        return { weight: (params.tonnage ?? 0) * 0.05, criticalSlots: 6 };
      }
      return { weight: 0, criticalSlots: 0 };
    }),
  },
  VARIABLE_EQUIPMENT: {
    MASC_IS: 'masc-is',
    MASC_CLAN: 'masc-clan',
    SUPERCHARGER: 'supercharger',
    TSM: 'tsm',
    PARTIAL_WING: 'partial-wing',
  },
}));

describe('equipmentListUtils', () => {
  describe('Jump Jet Functions', () => {
    it('should get correct jump jet ID for light mech', () => {
      expect(getJumpJetEquipmentId(30, JumpJetType.STANDARD)).toBe('jump-jet-light');
      expect(getJumpJetEquipmentId(55, JumpJetType.STANDARD)).toBe('jump-jet-light');
    });

    it('should get correct jump jet ID for medium mech', () => {
      expect(getJumpJetEquipmentId(56, JumpJetType.STANDARD)).toBe('jump-jet-medium');
      expect(getJumpJetEquipmentId(85, JumpJetType.STANDARD)).toBe('jump-jet-medium');
    });

    it('should get correct jump jet ID for heavy mech', () => {
      expect(getJumpJetEquipmentId(86, JumpJetType.STANDARD)).toBe('jump-jet-heavy');
      expect(getJumpJetEquipmentId(100, JumpJetType.STANDARD)).toBe('jump-jet-heavy');
    });

    it('should get correct improved jump jet ID', () => {
      expect(getJumpJetEquipmentId(50, JumpJetType.IMPROVED)).toBe('improved-jump-jet-light'); // 50 <= 55
    });

    it('should get jump jet equipment', () => {
      const equip = getJumpJetEquipment(50, JumpJetType.STANDARD);
      expect(equip).toBeDefined();
      expect(equip?.id).toBe('jump-jet-light'); // 50 <= 55
    });

    it('should create jump jet equipment list', () => {
      const list = createJumpJetEquipmentList(50, 3, JumpJetType.STANDARD);
      
      expect(list).toHaveLength(3);
      expect(list[0].equipmentId).toBe('jump-jet-light'); // 50 <= 55
      expect(list[0].category).toBe(EquipmentCategory.MOVEMENT);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should return empty list for zero jump MP', () => {
      const list = createJumpJetEquipmentList(50, 0, JumpJetType.STANDARD);
      expect(list).toHaveLength(0);
    });

    it('should filter out jump jets', () => {
      const equipment = [
        { equipmentId: 'jump-jet-light', name: 'Jump Jet' } as any,
        { equipmentId: 'medium-laser', name: 'Medium Laser' } as any,
        { equipmentId: 'jump-jet-medium', name: 'Jump Jet' } as any,
      ];
      
      const filtered = filterOutJumpJets(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Internal Structure Functions', () => {
    it('should create internal structure equipment list', () => {
      const list = createInternalStructureEquipmentList(InternalStructureType.ENDO_STEEL_IS);
      
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].equipmentId).toContain('internal-structure-slot');
      expect(list[0].category).toBe(EquipmentCategory.STRUCTURAL);
      expect(list[0].criticalSlots).toBe(1);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should return empty list for standard structure', () => {
      const list = createInternalStructureEquipmentList(InternalStructureType.STANDARD);
      expect(list).toHaveLength(0);
    });

    it('should filter out internal structure', () => {
      const equipment = [
        { equipmentId: 'internal-structure-slot-Endo Steel IS', name: 'Endo Steel' } as any,
        { equipmentId: 'medium-laser', name: 'Medium Laser' } as any,
      ];
      
      const filtered = filterOutInternalStructure(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Armor Functions', () => {
    it('should create armor equipment list for Ferro-Fibrous', () => {
      const list = createArmorEquipmentList(ArmorTypeEnum.FERRO_FIBROUS_IS);
      
      expect(list.length).toBeGreaterThan(0);
      expect(list[0].equipmentId).toContain('armor-slot');
      expect(list[0].category).toBe(EquipmentCategory.STRUCTURAL);
      expect(list[0].criticalSlots).toBe(1);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should create stealth armor with fixed locations', () => {
      const list = createArmorEquipmentList(ArmorTypeEnum.STEALTH);
      
      expect(list).toHaveLength(6);
      expect(list[0].criticalSlots).toBe(2);
      expect(list[0].location).toBeDefined();
      expect(list[0].location).toBe(MechLocation.LEFT_ARM);
    });

    it('should return empty list for standard armor', () => {
      const list = createArmorEquipmentList(ArmorTypeEnum.STANDARD);
      expect(list).toHaveLength(0);
    });

    it('should filter out armor slots', () => {
      const equipment = [
        { equipmentId: 'armor-slot-Ferro-Fibrous', name: 'Ferro-Fibrous' } as any,
        { equipmentId: 'medium-laser', name: 'Medium Laser' } as any,
      ];
      
      const filtered = filterOutArmorSlots(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Heat Sink Functions', () => {
    it('should get heat sink equipment ID', () => {
      expect(getHeatSinkEquipmentId(HeatSinkType.SINGLE)).toBe('single-heat-sink');
      expect(getHeatSinkEquipmentId(HeatSinkType.DOUBLE_IS)).toBe('double-heat-sink');
      expect(getHeatSinkEquipmentId(HeatSinkType.DOUBLE_CLAN)).toBe('clan-double-heat-sink');
      expect(getHeatSinkEquipmentId(HeatSinkType.COMPACT)).toBe('compact-heat-sink');
      expect(getHeatSinkEquipmentId(HeatSinkType.LASER)).toBe('laser-heat-sink');
    });

    it('should get heat sink equipment', () => {
      const equip = getHeatSinkEquipment(HeatSinkType.DOUBLE_IS);
      expect(equip).toBeDefined();
      expect(equip?.id).toBe('double-heat-sink');
    });

    it('should create heat sink equipment list', () => {
      const list = createHeatSinkEquipmentList(HeatSinkType.DOUBLE_IS, 5);
      
      expect(list).toHaveLength(5);
      expect(list[0].equipmentId).toBe('double-heat-sink');
      expect(list[0].category).toBe(EquipmentCategory.MISC_EQUIPMENT);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should return empty list for zero external heat sinks', () => {
      const list = createHeatSinkEquipmentList(HeatSinkType.DOUBLE_IS, 0);
      expect(list).toHaveLength(0);
    });

    it('should filter out heat sinks', () => {
      const equipment = [
        { equipmentId: 'double-heat-sink', name: 'DHS' } as any,
        { equipmentId: 'medium-laser', name: 'Medium Laser' } as any,
      ];
      
      const filtered = filterOutHeatSinks(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Enhancement Functions', () => {
    it('should get enhancement equipment ID', () => {
      expect(getEnhancementEquipmentId(MovementEnhancementType.MASC, TechBase.INNER_SPHERE)).toBe('masc');
      expect(getEnhancementEquipmentId(MovementEnhancementType.MASC, TechBase.CLAN)).toBe('clan-masc');
      expect(getEnhancementEquipmentId(MovementEnhancementType.SUPERCHARGER, TechBase.INNER_SPHERE)).toBe('supercharger');
      expect(getEnhancementEquipmentId(MovementEnhancementType.TSM, TechBase.INNER_SPHERE)).toBe('tsm');
    });

    it('should get enhancement equipment', () => {
      const equip = getEnhancementEquipment(MovementEnhancementType.MASC, TechBase.INNER_SPHERE);
      expect(equip).toBeDefined();
    });

    it('should calculate MASC weight for IS', () => {
      const weight = calculateEnhancementWeight(MovementEnhancementType.MASC, 85, TechBase.INNER_SPHERE, 5);
      expect(weight).toBe(5); // ceil(85/20) = 5
    });

    it('should calculate MASC weight for Clan', () => {
      const weight = calculateEnhancementWeight(MovementEnhancementType.MASC, 85, TechBase.CLAN, 5);
      expect(weight).toBe(4); // ceil(85/25) = 4
    });

    it('should calculate Supercharger weight', () => {
      const weight = calculateEnhancementWeight(MovementEnhancementType.SUPERCHARGER, 85, TechBase.INNER_SPHERE, 5);
      expect(weight).toBeGreaterThan(0);
    });

    it('should calculate TSM weight (zero)', () => {
      const weight = calculateEnhancementWeight(MovementEnhancementType.TSM, 85, TechBase.INNER_SPHERE, 5);
      expect(weight).toBe(0);
    });

    it('should calculate MASC slots for IS', () => {
      const slots = calculateEnhancementSlots(MovementEnhancementType.MASC, 85, TechBase.INNER_SPHERE, 5);
      expect(slots).toBe(5);
    });

    it('should calculate Supercharger slots (fixed 1)', () => {
      const slots = calculateEnhancementSlots(MovementEnhancementType.SUPERCHARGER, 85, TechBase.INNER_SPHERE, 5);
      expect(slots).toBe(1);
    });

    it('should calculate TSM slots (6)', () => {
      const slots = calculateEnhancementSlots(MovementEnhancementType.TSM, 85, TechBase.INNER_SPHERE, 5);
      expect(slots).toBe(6);
    });

    it('should create MASC equipment list', () => {
      const list = createEnhancementEquipmentList(MovementEnhancementType.MASC, 85, TechBase.INNER_SPHERE, 5);
      
      expect(list).toHaveLength(1);
      expect(list[0].equipmentId).toBe('masc');
      expect(list[0].weight).toBeGreaterThan(0);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should create TSM equipment list with 6 slots', () => {
      const list = createEnhancementEquipmentList(MovementEnhancementType.TSM, 85, TechBase.INNER_SPHERE, 5);
      
      expect(list).toHaveLength(6);
      expect(list[0].equipmentId).toBe('tsm');
      expect(list[0].criticalSlots).toBe(1);
      expect(list[0].weight).toBe(0);
    });

    it('should return empty list for null enhancement', () => {
      const list = createEnhancementEquipmentList(null, 85, TechBase.INNER_SPHERE, 5);
      expect(list).toHaveLength(0);
    });

    it('should filter out enhancement equipment', () => {
      const equipment = [
        { equipmentId: 'masc', name: 'MASC' } as any,
        { equipmentId: 'medium-laser', name: 'Medium Laser' } as any,
      ];
      
      const filtered = filterOutEnhancementEquipment(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });
});

