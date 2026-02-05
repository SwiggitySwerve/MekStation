import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';
import { MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { JumpJetType } from '@/utils/construction/movementCalculations';
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
  getTargetingComputerEquipment,
  getTargetingComputerFormulaId,
  calculateTargetingComputerWeight,
  calculateTargetingComputerSlots,
  calculateTargetingComputerCost,
  createTargetingComputerEquipmentList,
  filterOutTargetingComputer,
} from '@/utils/equipment/equipmentListUtils';

// Mock EquipmentLoaderService - return not loaded so fallbacks are used
jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  getEquipmentLoader: jest.fn(() => ({
    getIsLoaded: jest.fn(() => false),
    getMiscEquipmentById: jest.fn(() => null),
    getElectronicsById: jest.fn(() => null),
  })),
}));

// Mock EquipmentCalculatorService
interface MockEquipmentParams {
  tonnage?: number;
  engineWeight?: number;
  directFireWeaponTonnage?: number;
}

jest.mock('@/services/equipment/EquipmentCalculatorService', () => ({
  equipmentCalculatorService: {
    calculateProperties: jest.fn((id: string, params: MockEquipmentParams) => {
      if (id === 'masc-is') {
        return {
          weight: Math.ceil((params.tonnage ?? 0) / 20),
          criticalSlots: Math.ceil((params.tonnage ?? 0) / 20),
        };
      }
      if (id === 'masc-clan') {
        return {
          weight: Math.ceil((params.tonnage ?? 0) / 25),
          criticalSlots: Math.ceil((params.tonnage ?? 0) / 25),
        };
      }
      if (id === 'supercharger') {
        return {
          weight: Math.ceil((params.engineWeight ?? 0) / 10) * 0.5,
          criticalSlots: 1,
        };
      }
      if (id === 'tsm') {
        return { weight: 0, criticalSlots: 6 };
      }
      if (id === 'partial-wing') {
        return { weight: (params.tonnage ?? 0) * 0.05, criticalSlots: 6 };
      }
      // Targeting Computer IS: ceil(directFireWeaponTonnage / 4)
      if (id === 'targeting-computer-is') {
        const dfwt = params.directFireWeaponTonnage ?? 0;
        const weight = Math.ceil(dfwt / 4);
        return { weight, criticalSlots: weight, costCBills: weight * 10000 };
      }
      // Targeting Computer Clan: ceil(directFireWeaponTonnage / 5)
      if (id === 'targeting-computer-clan') {
        const dfwt = params.directFireWeaponTonnage ?? 0;
        const weight = Math.ceil(dfwt / 5);
        return { weight, criticalSlots: weight, costCBills: weight * 10000 };
      }
      return { weight: 0, criticalSlots: 0, costCBills: 0 };
    }),
  },
  VARIABLE_EQUIPMENT: {
    MASC_IS: 'masc-is',
    MASC_CLAN: 'masc-clan',
    SUPERCHARGER: 'supercharger',
    TSM: 'tsm',
    PARTIAL_WING: 'partial-wing',
    TARGETING_COMPUTER_IS: 'targeting-computer-is',
    TARGETING_COMPUTER_CLAN: 'targeting-computer-clan',
  },
}));

const equipmentLoaderMock = getEquipmentLoader as jest.MockedFunction<
  typeof getEquipmentLoader
>;

beforeEach(() => {
  // @ts-expect-error - Partial mock of EquipmentLoaderService for testing
  equipmentLoaderMock.mockReturnValue({
    getIsLoaded: jest.fn(() => false),
    getMiscEquipmentById: jest.fn(() => null),
    getElectronicsById: jest.fn(() => null),
  });
});

describe('equipmentListUtils', () => {
  describe('Jump Jet Functions', () => {
    it('should get correct jump jet ID for light mech', () => {
      expect(getJumpJetEquipmentId(30, JumpJetType.STANDARD)).toBe(
        'jump-jet-light',
      );
      expect(getJumpJetEquipmentId(55, JumpJetType.STANDARD)).toBe(
        'jump-jet-light',
      );
    });

    it('should get correct jump jet ID for medium mech', () => {
      expect(getJumpJetEquipmentId(56, JumpJetType.STANDARD)).toBe(
        'jump-jet-medium',
      );
      expect(getJumpJetEquipmentId(85, JumpJetType.STANDARD)).toBe(
        'jump-jet-medium',
      );
    });

    it('should get correct jump jet ID for heavy mech', () => {
      expect(getJumpJetEquipmentId(86, JumpJetType.STANDARD)).toBe(
        'jump-jet-heavy',
      );
      expect(getJumpJetEquipmentId(100, JumpJetType.STANDARD)).toBe(
        'jump-jet-heavy',
      );
    });

    it('should get correct improved jump jet ID', () => {
      expect(getJumpJetEquipmentId(50, JumpJetType.IMPROVED)).toBe(
        'improved-jump-jet-light',
      ); // 50 <= 55
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

    it('should return empty list for negative jump MP', () => {
      const list = createJumpJetEquipmentList(50, -2, JumpJetType.STANDARD);
      expect(list).toHaveLength(0);
    });

    it('should use loader-provided jump jet when data is loaded', () => {
      const loaderReturn = {
        getIsLoaded: jest.fn(() => true),
        getMiscEquipmentById: jest.fn(() => ({
          id: 'loader-jj',
          name: 'Loader Jump Jet',
          category: MiscEquipmentCategory.JUMP_JET,
          techBase: TechBase.CLAN,
          rulesLevel: RulesLevel.STANDARD,
          weight: 1.25,
          criticalSlots: 1,
          costCBills: 500,
          battleValue: 0,
          introductionYear: 3050,
        })),
        getElectronicsById: jest.fn(() => null),
      };
      // @ts-expect-error - Partial mock of EquipmentLoaderService for testing
      equipmentLoaderMock.mockReturnValueOnce(loaderReturn);

      const equip = getJumpJetEquipment(50, JumpJetType.STANDARD);
      expect(loaderReturn.getMiscEquipmentById).toHaveBeenCalledWith(
        'jump-jet-light',
      );
      expect(equip?.id).toBe('loader-jj');
      expect(equip?.techBase).toBe(TechBase.CLAN);
    });

    it('should filter out jump jets', () => {
      const equipment = [
        { equipmentId: 'jump-jet-light', name: 'Jump Jet' },
        { equipmentId: 'medium-laser', name: 'Medium Laser' },
        { equipmentId: 'jump-jet-medium', name: 'Jump Jet' },
      ];

      // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
      const filtered = filterOutJumpJets(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Internal Structure Functions', () => {
    it('should create internal structure equipment list', () => {
      const list = createInternalStructureEquipmentList(
        InternalStructureType.ENDO_STEEL_IS,
      );

      expect(list.length).toBeGreaterThan(0);
      expect(list[0].equipmentId).toContain('internal-structure-slot');
      expect(list[0].category).toBe(EquipmentCategory.STRUCTURAL);
      expect(list[0].criticalSlots).toBe(1);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should return empty list for standard structure', () => {
      const list = createInternalStructureEquipmentList(
        InternalStructureType.STANDARD,
      );
      expect(list).toHaveLength(0);
    });

    it('should filter out internal structure', () => {
      const equipment = [
        {
          equipmentId: 'internal-structure-slot-Endo Steel IS',
          name: 'Endo Steel',
        },
        { equipmentId: 'medium-laser', name: 'Medium Laser' },
      ];

      // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
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
        { equipmentId: 'armor-slot-Ferro-Fibrous', name: 'Ferro-Fibrous' },
        { equipmentId: 'medium-laser', name: 'Medium Laser' },
      ];

      // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
      const filtered = filterOutArmorSlots(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Heat Sink Functions', () => {
    it('should get heat sink equipment ID', () => {
      expect(getHeatSinkEquipmentId(HeatSinkType.SINGLE)).toBe(
        'single-heat-sink',
      );
      expect(getHeatSinkEquipmentId(HeatSinkType.DOUBLE_IS)).toBe(
        'double-heat-sink',
      );
      expect(getHeatSinkEquipmentId(HeatSinkType.DOUBLE_CLAN)).toBe(
        'clan-double-heat-sink',
      );
      expect(getHeatSinkEquipmentId(HeatSinkType.COMPACT)).toBe(
        'compact-heat-sink',
      );
      expect(getHeatSinkEquipmentId(HeatSinkType.LASER)).toBe(
        'laser-heat-sink',
      );
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

    it('should use loader-provided heat sink when data is loaded', () => {
      const loaderReturn = {
        getIsLoaded: jest.fn(() => true),
        getMiscEquipmentById: jest.fn(() => ({
          id: 'loader-dhs',
          name: 'Loaded DHS',
          category: MiscEquipmentCategory.HEAT_SINK,
          techBase: TechBase.CLAN,
          rulesLevel: RulesLevel.STANDARD,
          weight: 0.8,
          criticalSlots: 2,
          costCBills: 5000,
          battleValue: 0,
          introductionYear: 3060,
        })),
        getElectronicsById: jest.fn(() => null),
      };
      // @ts-expect-error - Partial mock of EquipmentLoaderService for testing
      equipmentLoaderMock.mockReturnValueOnce(loaderReturn);

      const equip = getHeatSinkEquipment(HeatSinkType.DOUBLE_CLAN);
      expect(loaderReturn.getMiscEquipmentById).toHaveBeenCalledWith(
        'clan-double-heat-sink',
      );
      expect(equip?.id).toBe('loader-dhs');
      expect(equip?.criticalSlots).toBe(2);
    });

    it('should filter out heat sinks', () => {
      const equipment = [
        { equipmentId: 'double-heat-sink', name: 'DHS' },
        { equipmentId: 'medium-laser', name: 'Medium Laser' },
      ];

      // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
      const filtered = filterOutHeatSinks(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Enhancement Functions', () => {
    it('should get enhancement equipment ID', () => {
      expect(
        getEnhancementEquipmentId(
          MovementEnhancementType.MASC,
          TechBase.INNER_SPHERE,
        ),
      ).toBe('masc');
      expect(
        getEnhancementEquipmentId(MovementEnhancementType.MASC, TechBase.CLAN),
      ).toBe('clan-masc');
      expect(
        getEnhancementEquipmentId(
          MovementEnhancementType.SUPERCHARGER,
          TechBase.INNER_SPHERE,
        ),
      ).toBe('supercharger');
      expect(
        getEnhancementEquipmentId(
          MovementEnhancementType.TSM,
          TechBase.INNER_SPHERE,
        ),
      ).toBe('tsm');
    });

    it('should get enhancement equipment', () => {
      const equip = getEnhancementEquipment(
        MovementEnhancementType.MASC,
        TechBase.INNER_SPHERE,
      );
      expect(equip).toBeDefined();
    });

    it('should calculate MASC weight for IS', () => {
      const weight = calculateEnhancementWeight(
        MovementEnhancementType.MASC,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(weight).toBe(5); // ceil(85/20) = 5
    });

    it('should calculate MASC weight for Clan', () => {
      const weight = calculateEnhancementWeight(
        MovementEnhancementType.MASC,
        85,
        TechBase.CLAN,
        5,
      );
      expect(weight).toBe(4); // ceil(85/25) = 4
    });

    it('should calculate Supercharger weight', () => {
      const weight = calculateEnhancementWeight(
        MovementEnhancementType.SUPERCHARGER,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(weight).toBeGreaterThan(0);
    });

    it('should calculate TSM weight (zero)', () => {
      const weight = calculateEnhancementWeight(
        MovementEnhancementType.TSM,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(weight).toBe(0);
    });

    it('should calculate Partial Wing weight', () => {
      const weight = calculateEnhancementWeight(
        MovementEnhancementType.PARTIAL_WING,
        80,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(weight).toBeCloseTo(4);
    });

    it('should calculate MASC slots for IS', () => {
      const slots = calculateEnhancementSlots(
        MovementEnhancementType.MASC,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(slots).toBe(5);
    });

    it('should calculate Supercharger slots (fixed 1)', () => {
      const slots = calculateEnhancementSlots(
        MovementEnhancementType.SUPERCHARGER,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(slots).toBe(1);
    });

    it('should calculate TSM slots (6)', () => {
      const slots = calculateEnhancementSlots(
        MovementEnhancementType.TSM,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(slots).toBe(6);
    });

    it('should calculate Partial Wing slots', () => {
      const slots = calculateEnhancementSlots(
        MovementEnhancementType.PARTIAL_WING,
        80,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(slots).toBe(6);
    });

    it('should create MASC equipment list', () => {
      const list = createEnhancementEquipmentList(
        MovementEnhancementType.MASC,
        85,
        TechBase.INNER_SPHERE,
        5,
      );

      expect(list).toHaveLength(1);
      expect(list[0].equipmentId).toBe('masc');
      expect(list[0].weight).toBeGreaterThan(0);
      expect(list[0].isRemovable).toBe(false);
    });

    it('should create TSM equipment list with 6 slots', () => {
      const list = createEnhancementEquipmentList(
        MovementEnhancementType.TSM,
        85,
        TechBase.INNER_SPHERE,
        5,
      );

      expect(list).toHaveLength(6);
      expect(list[0].equipmentId).toBe('tsm');
      expect(list[0].criticalSlots).toBe(1);
      expect(list[0].weight).toBe(0);
    });

    it('should create Supercharger equipment with calculated weight and slots', () => {
      const list = createEnhancementEquipmentList(
        MovementEnhancementType.SUPERCHARGER,
        85,
        TechBase.INNER_SPHERE,
        10,
      );

      expect(list).toHaveLength(1);
      expect(list[0].equipmentId).toBe('supercharger');
      expect(list[0].criticalSlots).toBe(1);
      expect(list[0].weight).toBeGreaterThan(0);
    });

    it('should return empty list for null enhancement', () => {
      const list = createEnhancementEquipmentList(
        null,
        85,
        TechBase.INNER_SPHERE,
        5,
      );
      expect(list).toHaveLength(0);
    });

    it('should filter out enhancement equipment', () => {
      const equipment = [
        { equipmentId: 'masc', name: 'MASC' },
        { equipmentId: 'medium-laser', name: 'Medium Laser' },
      ];

      // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
      const filtered = filterOutEnhancementEquipment(equipment);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].equipmentId).toBe('medium-laser');
    });
  });

  describe('Targeting Computer Functions', () => {
    it('should get targeting computer equipment for IS', () => {
      const equip = getTargetingComputerEquipment(TechBase.INNER_SPHERE);
      expect(equip).toBeDefined();
      expect(equip?.id).toBe('targeting-computer');
      expect(equip?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should get targeting computer equipment for Clan', () => {
      const equip = getTargetingComputerEquipment(TechBase.CLAN);
      expect(equip).toBeDefined();
      expect(equip?.id).toBe('clan-targeting-computer');
      expect(equip?.techBase).toBe(TechBase.CLAN);
    });

    it('should get correct formula ID for IS targeting computer', () => {
      expect(getTargetingComputerFormulaId(TechBase.INNER_SPHERE)).toBe(
        'targeting-computer-is',
      );
    });

    it('should get correct formula ID for Clan targeting computer', () => {
      expect(getTargetingComputerFormulaId(TechBase.CLAN)).toBe(
        'targeting-computer-clan',
      );
    });

    describe('IS Targeting Computer Calculations', () => {
      // IS formula: weight = ceil(directFireWeaponTonnage / 4)
      it.each([
        [4, 1], // ceil(4/4) = 1
        [5, 2], // ceil(5/4) = 2
        [8, 2], // ceil(8/4) = 2
        [12, 3], // ceil(12/4) = 3
        [15, 4], // ceil(15/4) = 4
        [16, 4], // ceil(16/4) = 4
      ])('%d tons of weapons → %d ton TC', (weaponTons, expectedWeight) => {
        const weight = calculateTargetingComputerWeight(
          weaponTons,
          TechBase.INNER_SPHERE,
        );
        expect(weight).toBe(expectedWeight);
      });

      it('should have slots equal to weight', () => {
        const weight = calculateTargetingComputerWeight(
          12,
          TechBase.INNER_SPHERE,
        );
        const slots = calculateTargetingComputerSlots(
          12,
          TechBase.INNER_SPHERE,
        );
        expect(slots).toBe(weight);
      });

      it('should calculate cost as weight × 10000', () => {
        const cost = calculateTargetingComputerCost(12, TechBase.INNER_SPHERE);
        expect(cost).toBe(30000); // 3 tons × 10000
      });
    });

    describe('Clan Targeting Computer Calculations', () => {
      // Clan formula: weight = ceil(directFireWeaponTonnage / 5)
      it.each([
        [5, 1], // ceil(5/5) = 1
        [6, 2], // ceil(6/5) = 2
        [10, 2], // ceil(10/5) = 2
        [15, 3], // ceil(15/5) = 3
        [20, 4], // ceil(20/5) = 4
      ])('%d tons of weapons → %d ton TC', (weaponTons, expectedWeight) => {
        const weight = calculateTargetingComputerWeight(
          weaponTons,
          TechBase.CLAN,
        );
        expect(weight).toBe(expectedWeight);
      });

      it('should weigh less than IS for same weapon tonnage', () => {
        const isWeight = calculateTargetingComputerWeight(
          15,
          TechBase.INNER_SPHERE,
        );
        const clanWeight = calculateTargetingComputerWeight(15, TechBase.CLAN);
        expect(clanWeight).toBeLessThan(isWeight);
      });
    });

    describe('Edge Cases', () => {
      it('should return 0 weight for 0 weapon tonnage', () => {
        expect(calculateTargetingComputerWeight(0, TechBase.INNER_SPHERE)).toBe(
          0,
        );
        expect(calculateTargetingComputerWeight(0, TechBase.CLAN)).toBe(0);
      });

      it('should return 0 slots and cost for 0 weapon tonnage', () => {
        expect(calculateTargetingComputerSlots(0, TechBase.INNER_SPHERE)).toBe(
          0,
        );
        expect(calculateTargetingComputerCost(0, TechBase.CLAN)).toBe(0);
      });

      it('should return minimum 1 ton for any positive weapon tonnage', () => {
        expect(calculateTargetingComputerWeight(1, TechBase.INNER_SPHERE)).toBe(
          1,
        );
        expect(calculateTargetingComputerWeight(1, TechBase.CLAN)).toBe(1);
      });
    });

    describe('Create Targeting Computer Equipment List', () => {
      it('should create IS targeting computer equipment', () => {
        const list = createTargetingComputerEquipmentList(
          TechBase.INNER_SPHERE,
          12,
        );

        expect(list).toHaveLength(1);
        expect(list[0].equipmentId).toBe('targeting-computer');
        expect(list[0].weight).toBe(3); // ceil(12/4)
        expect(list[0].criticalSlots).toBe(3);
        expect(list[0].category).toBe(EquipmentCategory.ELECTRONICS);
        expect(list[0].techBase).toBe(TechBase.INNER_SPHERE);
        expect(list[0].isRemovable).toBe(true);
      });

      it('should create Clan targeting computer equipment', () => {
        const list = createTargetingComputerEquipmentList(TechBase.CLAN, 15);

        expect(list).toHaveLength(1);
        expect(list[0].equipmentId).toBe('clan-targeting-computer');
        expect(list[0].weight).toBe(3); // ceil(15/5)
        expect(list[0].criticalSlots).toBe(3);
        expect(list[0].techBase).toBe(TechBase.CLAN);
      });

      it('should return empty list for 0 weapon tonnage', () => {
        const list = createTargetingComputerEquipmentList(
          TechBase.INNER_SPHERE,
          0,
        );
        expect(list).toHaveLength(0);
      });

      it('should return empty list for negative weapon tonnage', () => {
        const list = createTargetingComputerEquipmentList(
          TechBase.INNER_SPHERE,
          -5,
        );
        expect(list).toHaveLength(0);
      });

      it('should use loader-provided targeting computer when available', () => {
        const loaderReturn = {
          getIsLoaded: jest.fn(() => true),
          getMiscEquipmentById: jest.fn(() => null),
          getElectronicsById: jest.fn(() => ({
            id: 'loader-tc',
            name: 'Loaded TC',
            category: ElectronicsCategory.TARGETING,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            weight: 1,
            criticalSlots: 1,
            costCBills: 10000,
            battleValue: 0,
            introductionYear: 3050,
          })),
        };
        // @ts-expect-error - Partial mock of EquipmentLoaderService for testing
        equipmentLoaderMock.mockReturnValueOnce(loaderReturn);

        const equip = getTargetingComputerEquipment(TechBase.CLAN);
        expect(loaderReturn.getElectronicsById).toHaveBeenCalledWith(
          'clan-targeting-computer',
        );
        expect(equip?.id).toBe('loader-tc');
        expect(equip?.techBase).toBe(TechBase.CLAN);
      });
    });

    describe('Filter Out Targeting Computer', () => {
      it('should filter out IS targeting computer', () => {
        const equipment = [
          { equipmentId: 'targeting-computer', name: 'TC' },
          { equipmentId: 'medium-laser', name: 'Medium Laser' },
        ];

        // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
        const filtered = filterOutTargetingComputer(equipment);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].equipmentId).toBe('medium-laser');
      });

      it('should filter out Clan targeting computer', () => {
        const equipment = [
          { equipmentId: 'clan-targeting-computer', name: 'Clan TC' },
          { equipmentId: 'medium-laser', name: 'Medium Laser' },
        ];

        // @ts-expect-error - Partial mock of IMountedEquipmentInstance for testing
        const filtered = filterOutTargetingComputer(equipment);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].equipmentId).toBe('medium-laser');
      });
    });
  });
});
