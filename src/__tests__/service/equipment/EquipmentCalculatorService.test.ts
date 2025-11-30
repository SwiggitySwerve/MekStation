/**
 * Equipment Calculator Service Tests
 * 
 * Tests for variable equipment property calculations.
 * Uses mock FormulaRegistry and FormulaEvaluator.
 * 
 * @spec openspec/specs/equipment-services/spec.md
 */

import { EquipmentCalculatorService } from '@/services/equipment/EquipmentCalculatorService';
import { createMockFormulaRegistry } from '@/__tests__/mocks/services/MockFormulaRegistry';
import { FormulaEvaluator } from '@/services/equipment/FormulaEvaluator';
import { IFormulaRegistry } from '@/services/equipment/FormulaRegistry';

describe('EquipmentCalculatorService', () => {
  let service: EquipmentCalculatorService;
  let mockRegistry: jest.Mocked<IFormulaRegistry>;

  beforeEach(() => {
    mockRegistry = createMockFormulaRegistry();
    service = new EquipmentCalculatorService(mockRegistry, new FormulaEvaluator());
  });

  // ============================================================================
  // Initialization
  // ============================================================================
  describe('initialize', () => {
    it('should initialize the registry', async () => {
      await service.initialize();
      expect(mockRegistry.initialize).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // isVariable
  // ============================================================================
  describe('isVariable', () => {
    it('should return true for known variable equipment', () => {
      expect(service.isVariable('targeting-computer-is')).toBe(true);
      expect(service.isVariable('masc-is')).toBe(true);
      expect(service.isVariable('hatchet')).toBe(true);
    });

    it('should return false for unknown equipment', () => {
      expect(service.isVariable('medium-laser')).toBe(false);
      expect(service.isVariable('unknown')).toBe(false);
    });
  });

  // ============================================================================
  // getRequiredContext
  // ============================================================================
  describe('getRequiredContext', () => {
    it('should return required context for targeting computer', () => {
      const context = service.getRequiredContext('targeting-computer-is');
      expect(context).toContain('directFireWeaponTonnage');
    });

    it('should return required context for MASC', () => {
      const context = service.getRequiredContext('masc-is');
      expect(context).toContain('tonnage');
      expect(context).toContain('engineRating');
    });

    it('should return required context for physical weapons', () => {
      const context = service.getRequiredContext('hatchet');
      expect(context).toContain('tonnage');
    });

    it('should return empty array for unknown equipment', () => {
      expect(service.getRequiredContext('unknown')).toEqual([]);
    });
  });

  // ============================================================================
  // getAllVariableEquipmentIds
  // ============================================================================
  describe('getAllVariableEquipmentIds', () => {
    it('should return all variable equipment IDs', () => {
      const ids = service.getAllVariableEquipmentIds();
      expect(ids).toContain('targeting-computer-is');
      expect(ids).toContain('targeting-computer-clan');
      expect(ids).toContain('masc-is');
      expect(ids).toContain('hatchet');
      expect(ids).toContain('sword');
    });

    it('should return unique IDs', () => {
      const ids = service.getAllVariableEquipmentIds();
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ============================================================================
  // calculateProperties - Targeting Computer
  // ============================================================================
  describe('calculateProperties - Targeting Computer', () => {
    describe('IS Targeting Computer', () => {
      // Weight = ceil(directFireWeaponTonnage / 4)
      // Slots = weight
      // Cost = weight × 10000

      it.each([
        [4, 1, 1, 10000],    // 4 tons → 1 ton, 1 slot, 10000 C-Bills
        [8, 2, 2, 20000],    // 8 tons → 2 tons, 2 slots, 20000 C-Bills
        [12, 3, 3, 30000],   // 12 tons → 3 tons
        [16, 4, 4, 40000],   // 16 tons → 4 tons
        [5, 2, 2, 20000],    // 5 tons → ceil(5/4) = 2 tons
      ])('%d ton weapons: %d ton, %d slots, %d cost', 
        (weapons, expectedWeight, expectedSlots, expectedCost) => {
          const result = service.calculateProperties('targeting-computer-is', {
            directFireWeaponTonnage: weapons,
          });

          expect(result.weight).toBe(expectedWeight);
          expect(result.criticalSlots).toBe(expectedSlots);
          expect(result.costCBills).toBe(expectedCost);
        }
      );
    });

    describe('Clan Targeting Computer', () => {
      // Weight = ceil(directFireWeaponTonnage / 5)
      it.each([
        [5, 1],   // ceil(5/5) = 1
        [10, 2],  // ceil(10/5) = 2
        [15, 3],  // ceil(15/5) = 3
        [6, 2],   // ceil(6/5) = 2
      ])('%d ton weapons: %d ton TC', (weapons, expectedWeight) => {
        const result = service.calculateProperties('targeting-computer-clan', {
          directFireWeaponTonnage: weapons,
        });
        expect(result.weight).toBe(expectedWeight);
      });
    });
  });

  // ============================================================================
  // calculateProperties - MASC
  // ============================================================================
  describe('calculateProperties - MASC', () => {
    describe('IS MASC', () => {
      // Weight = ceil(tonnage × engineRating / 100 / 20)
      // Simplified as: ceil(engineRating / 20) in the mock

      it.each([
        [50, 200, 10],   // ceil(200/20) = 10
        [75, 300, 15],   // ceil(300/20) = 15
        [100, 300, 15],  // ceil(300/20) = 15
        [75, 375, 19],   // ceil(375/20) = 19
      ])('%d ton mech, rating %d: %d ton MASC', 
        (tonnage, engineRating, expectedWeight) => {
          const result = service.calculateProperties('masc-is', {
            tonnage,
            engineRating,
          });
          expect(result.weight).toBe(expectedWeight);
        }
      );
    });

    describe('Clan MASC', () => {
      // Weight = ceil(tonnage × engineRating / 100 / 25)
      it('should weigh less than IS MASC', () => {
        const isResult = service.calculateProperties('masc-is', {
          tonnage: 75,
          engineRating: 300,
        });
        const clanResult = service.calculateProperties('masc-clan', {
          tonnage: 75,
          engineRating: 300,
        });
        
        expect(clanResult.weight).toBeLessThan(isResult.weight);
      });
    });
  });

  // ============================================================================
  // calculateProperties - Physical Weapons
  // ============================================================================
  describe('calculateProperties - Physical Weapons', () => {
    describe('Hatchet', () => {
      // Weight = ceil(tonnage / 15)
      // Slots = weight
      // Damage = ceil(tonnage / 5)

      it.each([
        [20, 2, 2, 4],     // 20 tons: weight 2, slots 2, damage 4
        [50, 4, 4, 10],    // 50 tons: weight 4, slots 4, damage 10
        [75, 5, 5, 15],    // 75 tons: weight 5, slots 5, damage 15
        [100, 7, 7, 20],   // 100 tons: weight 7, slots 7, damage 20
      ])('%d ton mech: %d ton, %d slots, %d damage', 
        (tonnage, expectedWeight, expectedSlots, expectedDamage) => {
          const result = service.calculateProperties('hatchet', { tonnage });

          expect(result.weight).toBe(expectedWeight);
          expect(result.criticalSlots).toBe(expectedSlots);
          expect(result.damage).toBe(expectedDamage);
        }
      );
    });

    describe('Sword', () => {
      // Weight = ceil(tonnage / 15)
      // Slots = weight (EQUALS_WEIGHT)
      // Damage = floor(tonnage / 10) + 1

      it.each([
        [50, 4, 4, 6],     // 50 tons: weight ceil(50/15)=4, slots 4, damage floor(50/10)+1=6
        [75, 5, 5, 8],     // 75 tons: weight ceil(75/15)=5, slots 5, damage floor(75/10)+1=8
        [100, 7, 7, 11],   // 100 tons: weight ceil(100/15)=7, slots 7, damage floor(100/10)+1=11
      ])('%d ton mech: %d ton, %d slots, %d damage', 
        (tonnage, expectedWeight, expectedSlots, expectedDamage) => {
          const result = service.calculateProperties('sword', { tonnage });

          expect(result.weight).toBe(expectedWeight);
          expect(result.criticalSlots).toBe(expectedSlots);
          expect(result.damage).toBe(expectedDamage);
        }
      );
    });
  });

  // ============================================================================
  // calculateProperties - Supercharger
  // ============================================================================
  describe('calculateProperties - Supercharger', () => {
    // Weight = engineWeight × 0.1, rounded to 0.5 (multiplyRound)
    // Slots = 1 (fixed)
    // Cost = engineWeight × 10000

    it.each([
      [8.5, 1, 1, 85000],    // 8.5 × 0.1 = 0.85 → ceil to 1.0
      [19, 2, 1, 190000],    // 19 × 0.1 = 1.9 → ceil to 2.0
      [52.5, 5.5, 1, 525000],  // 52.5 × 0.1 = 5.25 → ceil to 5.5
    ])('engine weight %d: %d ton, %d slot, %d cost', 
      (engineWeight, expectedWeight, expectedSlots, expectedCost) => {
        const result = service.calculateProperties('supercharger', { engineWeight });

        expect(result.weight).toBe(expectedWeight);
        expect(result.criticalSlots).toBe(expectedSlots);
        expect(result.costCBills).toBe(expectedCost);
      }
    );
  });

  // ============================================================================
  // Error Handling
  // ============================================================================
  describe('Error Handling', () => {
    it('should throw for unknown equipment', () => {
      expect(() => 
        service.calculateProperties('unknown-equipment', {})
      ).toThrow('Unknown variable equipment');
    });

    it('should throw for missing required context', () => {
      expect(() => 
        service.calculateProperties('targeting-computer-is', {})
      ).toThrow('Missing required context');
    });

    it('should throw for partial context', () => {
      expect(() => 
        service.calculateProperties('masc-is', { tonnage: 75 })
      ).toThrow('Missing required context');
    });
  });

  // ============================================================================
  // Return Value Structure
  // ============================================================================
  describe('Return Value Structure', () => {
    it('should always include weight, slots, and cost', () => {
      const result = service.calculateProperties('targeting-computer-is', {
        directFireWeaponTonnage: 8,
      });

      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('criticalSlots');
      expect(result).toHaveProperty('costCBills');
      
      expect(typeof result.weight).toBe('number');
      expect(typeof result.criticalSlots).toBe('number');
      expect(typeof result.costCBills).toBe('number');
    });

    it('should include damage for physical weapons', () => {
      const result = service.calculateProperties('hatchet', { tonnage: 50 });
      expect(result).toHaveProperty('damage');
      expect(typeof result.damage).toBe('number');
    });

    it('should not include damage for non-physical equipment', () => {
      const result = service.calculateProperties('targeting-computer-is', {
        directFireWeaponTonnage: 8,
      });
      expect(result.damage).toBeUndefined();
    });
  });
});

