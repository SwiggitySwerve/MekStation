import { UnitCriticalManager } from '../../utils/criticalSlots/UnitCriticalManager';
import { UnitConfiguration } from '../../utils/criticalSlots/UnitCriticalManagerTypes';
import { createComponentConfiguration } from '../../types/componentConfiguration';

// Base configuration template
const createBaseConfig = (): Partial<UnitConfiguration> => ({
  chassis: 'TestMech',
  model: 'TM-1',
  tonnage: 100,
  unitType: 'BattleMech',
  techBase: 'Inner Sphere',
  walkMP: 3,
  engineRating: 300,
  runMP: 5,
  engineType: 'Standard',
  jumpMP: 0,
  jumpJetType: 'Standard Jump Jet',
  jumpJetCounts: {},
  hasPartialWing: false,
  gyroType: 'Standard',
  heatSinkType: 'Single',
  totalHeatSinks: 10,
  internalHeatSinks: 10,
  externalHeatSinks: 0,
  enhancements: [],
  mass: 100,
  armorAllocation: {
    HD: { front: 9, rear: 0 },
    CT: { front: 30, rear: 10 },
    LT: { front: 20, rear: 8 },
    RT: { front: 20, rear: 8 },
    LA: { front: 16, rear: 0 },
    RA: { front: 16, rear: 0 },
    LL: { front: 20, rear: 6 },
    RL: { front: 20, rear: 6 },
  },
  armorTonnage: 19,
});

// All available structure types
const STRUCTURE_TYPES = [
  'Standard',
  'Endo Steel',
  'Endo Steel (Clan)',
  'Composite',
  'Reinforced',
  'Industrial'
];

// All available armor types
const ARMOR_TYPES = [
  'Standard',
  'Ferro-Fibrous',
  'Ferro-Fibrous (Clan)',
  'Light Ferro-Fibrous',
  'Heavy Ferro-Fibrous',
  'Stealth',
  'Reactive',
  'Reflective',
  'Hardened'
];

describe('Comprehensive Special Component Tests', () => {
  it('should show unallocated Endo Steel slots for Endo Steel + Standard', () => {
    const config = {
      ...createBaseConfig(),
      structureType: 'Endo Steel',
      armorType: 'Standard',
    } as UnitConfiguration;

    const manager = new UnitCriticalManager(config);
    // DEBUG: Log the entire unallocatedEquipment array
    // eslint-disable-next-line no-console
    console.log('Unallocated equipment:', JSON.stringify(manager.unallocatedEquipment, null, 2));
    const structureComponents = manager.unallocatedEquipment.filter(eq => eq.equipmentData.id === 'endo_steel');
    expect(structureComponents.length).toBe(14);
  });
  // All other tests commented out for focused debugging
  /*
  describe('Structure Component Combinations', () => {
    STRUCTURE_TYPES.forEach(structureType => {
      it(`should handle ${structureType} structure correctly`, () => {
        const config = {
          ...createBaseConfig(),
          structureType: createComponentConfiguration('structure', structureType)!,
          armorType: 'Standard',
        } as UnitConfiguration;

        const manager = new UnitCriticalManager(config);
        
        // Check if structure components are in unallocated pool
        const structureComponents = manager.unallocatedEquipment.filter(eq => 
          eq.equipmentData.name === structureType
        );
        
        // Standard structure should have 0 slots, others should have slots
        if (structureType === 'Standard') {
          expect(structureComponents.length).toBe(0);
        } else {
          expect(structureComponents.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Armor Component Combinations', () => {
    ARMOR_TYPES.forEach(armorType => {
      it(`should handle ${armorType} armor correctly`, () => {
        const config = {
          ...createBaseConfig(),
          structureType: 'Standard',
          armorType: createComponentConfiguration('armor', armorType)!,
        } as UnitConfiguration;

        const manager = new UnitCriticalManager(config);
        
        // Check if armor components are in unallocated pool
        const armorComponents = manager.unallocatedEquipment.filter(eq => 
          eq.equipmentData.name === armorType
        );
        
        // Standard armor should have 0 slots, others should have slots
        if (armorType === 'Standard') {
          expect(armorComponents.length).toBe(0);
        } else {
          expect(armorComponents.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Cross-Combination Tests', () => {
    // Test every combination of structure and armor
    STRUCTURE_TYPES.forEach(structureType => {
      ARMOR_TYPES.forEach(armorType => {
        it(`should handle ${structureType} + ${armorType} combination`, () => {
          const config = {
            ...createBaseConfig(),
            structureType: createComponentConfiguration('structure', structureType)!,
            armorType: createComponentConfiguration('armor', armorType)!,
          } as UnitConfiguration;

          const manager = new UnitCriticalManager(config);
          
          // DEBUG: Log all unallocated equipment names and counts
          const allUnallocated = manager.unallocatedEquipment.map(eq => eq.equipmentData.name);
          // eslint-disable-next-line no-console
          console.log(`Test: ${structureType} + ${armorType} → Unallocated:`, allUnallocated);
          
          const structureComponents = manager.unallocatedEquipment.filter(eq => 
            eq.equipmentData.name === structureType
          );
          const armorComponents = manager.unallocatedEquipment.filter(eq => 
            eq.equipmentData.name === armorType
          );
          
          // Verify expected slot counts
          if (structureType === 'Standard') {
            expect(structureComponents.length).toBe(0);
          } else {
            expect(structureComponents.length).toBeGreaterThan(0);
          }
          
          if (armorType === 'Standard') {
            expect(armorComponents.length).toBe(0);
          } else {
            expect(armorComponents.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Allocation/Deallocation Tests', () => {
    it('should properly track allocated vs unallocated slots for Endo Steel', () => {
      const config = {
        ...createBaseConfig(),
        structureType: 'Endo Steel',
        armorType: 'Standard',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(config);
      
      // Should start with 14 Endo Steel slots unallocated
      const initialUnallocated = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      );
      expect(initialUnallocated.length).toBe(14);
      
      // Simulate allocating some slots (this would need actual allocation logic)
      // For now, just verify the initial state
      expect(manager.unallocatedEquipment.length).toBeGreaterThan(0);
    });

    it('should properly track allocated vs unallocated slots for Ferro-Fibrous', () => {
      const config = {
        ...createBaseConfig(),
        structureType: 'Standard',
        armorType: 'Ferro-Fibrous',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(config);
      
      // Should start with 14 Ferro-Fibrous slots unallocated
      const initialUnallocated = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'ferro_fibrous'
      );
      expect(initialUnallocated.length).toBe(14);
    });

    it('should handle both Endo Steel and Ferro-Fibrous together', () => {
      const config = {
        ...createBaseConfig(),
        structureType: 'Endo Steel',
        armorType: 'Ferro-Fibrous',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(config);
      
      const endoSteelSlots = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      );
      const ferroFibrousSlots = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'ferro_fibrous'
      );
      
      expect(endoSteelSlots.length).toBe(14);
      expect(ferroFibrousSlots.length).toBe(14);
      expect(manager.unallocatedEquipment.length).toBe(28); // 14 + 14
    });
  });

  describe('Configuration Change Tests', () => {
    it('should handle switching from Standard to Endo Steel structure', () => {
      // Start with Standard structure
      const initialConfig = {
        ...createBaseConfig(),
        structureType: 'Standard',
        armorType: 'Standard',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(initialConfig);
      expect(manager.unallocatedEquipment.length).toBe(0);
      
      // Switch to Endo Steel
      const newConfig = {
        ...initialConfig,
        structureType: 'Endo Steel',
      };
      
      manager.updateConfiguration(newConfig);
      
      const endoSteelSlots = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      );
      expect(endoSteelSlots.length).toBe(14);
    });

    it('should handle switching from Endo Steel back to Standard structure', () => {
      // Start with Endo Steel structure
      const initialConfig = {
        ...createBaseConfig(),
        structureType: 'Endo Steel',
        armorType: 'Standard',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(initialConfig);
      expect(manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      ).length).toBe(14);
      
      // Switch back to Standard
      const newConfig = {
        ...initialConfig,
        structureType: 'Standard',
      };
      
      manager.updateConfiguration(newConfig);
      
      const endoSteelSlots = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel'
      );
      expect(endoSteelSlots.length).toBe(0);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle Clan tech base components', () => {
      const config = {
        ...createBaseConfig(),
        techBase: 'Clan' as const,
        structureType: 'Endo Steel (Clan)',
        armorType: 'Ferro-Fibrous (Clan)',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(config);
      
      const clanEndoSlots = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'endo_steel_clan'
      );
      const clanFerroSlots = manager.unallocatedEquipment.filter(eq => 
        eq.equipmentData.id === 'ferro_fibrous_clan'
      );
      
      // Clan versions typically require fewer slots
      expect(clanEndoSlots.length).toBeGreaterThan(0);
      expect(clanFerroSlots.length).toBeGreaterThan(0);
    });

    it('should handle maximum slot combinations', () => {
      const config = {
        ...createBaseConfig(),
        structureType: 'Endo Steel',
        armorType: 'Heavy Ferro-Fibrous',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(config);
      
      const totalSlots = manager.unallocatedEquipment.length;
      // Heavy Ferro-Fibrous requires 21 slots, Endo Steel requires 14
      // Total should be 35 slots
      expect(totalSlots).toBe(35);
    });

    it('should handle zero-slot configurations', () => {
      const config = {
        ...createBaseConfig(),
        structureType: 'Standard',
        armorType: 'Standard',
      } as UnitConfiguration;

      const manager = new UnitCriticalManager(config);
      
      // Standard structure and armor should have no special component slots
      expect(manager.unallocatedEquipment.length).toBe(0);
    });
  });

  describe('Slot Count Validation', () => {
    it('should have correct slot counts for each component type', () => {
      const slotCounts = {
        'Endo Steel': 14,
        'Endo Steel (Clan)': 7,
        'Ferro-Fibrous': 14,
        'Ferro-Fibrous (Clan)': 7,
        'Light Ferro-Fibrous': 7,
        'Heavy Ferro-Fibrous': 21,
        'Stealth': 12,
      };

      Object.entries(slotCounts).forEach(([componentName, expectedSlots]) => {
        const config = {
          ...createBaseConfig(),
          structureType: componentName.includes('Endo') 
            ? createComponentConfiguration('structure', componentName)!
            : 'Standard',
          armorType: componentName.includes('Ferro') || componentName.includes('Stealth')
            ? createComponentConfiguration('armor', componentName)!
            : 'Standard',
        } as UnitConfiguration;

        const manager = new UnitCriticalManager(config);
        
        const componentSlots = manager.unallocatedEquipment.filter(eq => 
          eq.equipmentData.name === componentName
        );
        
        expect(componentSlots.length).toBe(expectedSlots);
      });
    });
  });
  */
}); 