/**
 * Tech Base Sync Hook Tests
 * 
 * Tests for component filtering based on tech base settings.
 * Verifies that the correct components are available for each tech base
 * and that invalid selections are replaced with defaults.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/component-configuration/spec.md
 */

import { renderHook } from '@testing-library/react';
import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { TechBase } from '@/types/enums/TechBase';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import {
  createISComponentTechBases,
  createClanComponentTechBases,
  createMixedComponentTechBases,
  createISComponentSelections,
  createISXLComponentSelections,
  createClanComponentSelections,
} from '../helpers/storeTestHelpers';

describe('useTechBaseSync', () => {
  // ===========================================================================
  // Inner Sphere Tech Base Filtering
  // ===========================================================================
  describe('Inner Sphere Tech Base Filtering', () => {
    it('should include IS-specific engines and exclude Clan engines', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const engineTypes = result.current.filteredOptions.engines.map(e => e.type);
      
      // Should include IS engines
      expect(engineTypes).toContain(EngineType.STANDARD);
      expect(engineTypes).toContain(EngineType.XL_IS);
      expect(engineTypes).toContain(EngineType.LIGHT);
      
      // Should NOT include Clan XL engine
      expect(engineTypes).not.toContain(EngineType.XL_CLAN);
    });
    
    it('should include IS Endo Steel and exclude Clan Endo Steel', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const structureTypes = result.current.filteredOptions.structures.map(s => s.type);
      
      // Should include standard and IS Endo Steel
      expect(structureTypes).toContain(InternalStructureType.STANDARD);
      expect(structureTypes).toContain(InternalStructureType.ENDO_STEEL_IS);
      
      // Should NOT include Clan Endo Steel
      expect(structureTypes).not.toContain(InternalStructureType.ENDO_STEEL_CLAN);
    });
    
    it('should include IS Double Heat Sinks and exclude Clan Double', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const heatSinkTypes = result.current.filteredOptions.heatSinks.map(h => h.type);
      
      // Should include Single and IS Double
      expect(heatSinkTypes).toContain(HeatSinkType.SINGLE);
      expect(heatSinkTypes).toContain(HeatSinkType.DOUBLE_IS);
      
      // Should NOT include Clan Double or Laser
      expect(heatSinkTypes).not.toContain(HeatSinkType.DOUBLE_CLAN);
      expect(heatSinkTypes).not.toContain(HeatSinkType.LASER);
    });
    
    it('should include IS Ferro-Fibrous and exclude Clan Ferro-Fibrous', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const armorTypes = result.current.filteredOptions.armors.map(a => a.type);
      
      // Should include Standard and IS Ferro-Fibrous
      expect(armorTypes).toContain(ArmorTypeEnum.STANDARD);
      expect(armorTypes).toContain(ArmorTypeEnum.FERRO_FIBROUS_IS);
      
      // Should NOT include Clan Ferro-Fibrous
      expect(armorTypes).not.toContain(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
    });
    
    it('should include all gyro types (available to both)', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const gyroTypes = result.current.filteredOptions.gyros.map(g => g.type);
      
      expect(gyroTypes).toContain(GyroType.STANDARD);
      expect(gyroTypes).toContain(GyroType.XL);
      expect(gyroTypes).toContain(GyroType.COMPACT);
      expect(gyroTypes).toContain(GyroType.HEAVY_DUTY);
    });
    
    it('should include all cockpit types (available to both)', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const cockpitTypes = result.current.filteredOptions.cockpits.map(c => c.type);
      
      expect(cockpitTypes).toContain(CockpitType.STANDARD);
      expect(cockpitTypes).toContain(CockpitType.SMALL);
    });
  });
  
  // ===========================================================================
  // Clan Tech Base Filtering
  // ===========================================================================
  describe('Clan Tech Base Filtering', () => {
    it('should include Clan XL engine and exclude IS XL engine', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      const engineTypes = result.current.filteredOptions.engines.map(e => e.type);
      
      // Should include Standard and Clan XL
      expect(engineTypes).toContain(EngineType.STANDARD);
      expect(engineTypes).toContain(EngineType.XL_CLAN);
      
      // Should NOT include IS-specific engines
      expect(engineTypes).not.toContain(EngineType.XL_IS);
      expect(engineTypes).not.toContain(EngineType.LIGHT);
    });
    
    it('should include Clan Endo Steel and exclude IS Endo Steel', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      const structureTypes = result.current.filteredOptions.structures.map(s => s.type);
      
      // Should include Standard and Clan Endo Steel
      expect(structureTypes).toContain(InternalStructureType.STANDARD);
      expect(structureTypes).toContain(InternalStructureType.ENDO_STEEL_CLAN);
      
      // Should NOT include IS Endo Steel
      expect(structureTypes).not.toContain(InternalStructureType.ENDO_STEEL_IS);
    });
    
    it('should include Clan Double Heat Sinks and exclude IS Double', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      const heatSinkTypes = result.current.filteredOptions.heatSinks.map(h => h.type);
      
      // Should include Single, Clan Double, and Laser
      expect(heatSinkTypes).toContain(HeatSinkType.SINGLE);
      expect(heatSinkTypes).toContain(HeatSinkType.DOUBLE_CLAN);
      expect(heatSinkTypes).toContain(HeatSinkType.LASER);
      
      // Should NOT include IS Double or Compact
      expect(heatSinkTypes).not.toContain(HeatSinkType.DOUBLE_IS);
      expect(heatSinkTypes).not.toContain(HeatSinkType.COMPACT);
    });
    
    it('should include Clan Ferro-Fibrous and exclude IS Ferro-Fibrous', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      const armorTypes = result.current.filteredOptions.armors.map(a => a.type);
      
      // Should include Standard and Clan Ferro-Fibrous
      expect(armorTypes).toContain(ArmorTypeEnum.STANDARD);
      expect(armorTypes).toContain(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
      
      // Should NOT include IS-specific armors
      expect(armorTypes).not.toContain(ArmorTypeEnum.FERRO_FIBROUS_IS);
      expect(armorTypes).not.toContain(ArmorTypeEnum.LIGHT_FERRO);
      expect(armorTypes).not.toContain(ArmorTypeEnum.STEALTH);
    });
  });
  
  // ===========================================================================
  // Default Values
  // ===========================================================================
  describe('Default Values', () => {
    it('should provide correct IS defaults', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      expect(result.current.defaults.engineType).toBe(EngineType.STANDARD);
      expect(result.current.defaults.gyroType).toBe(GyroType.STANDARD);
      expect(result.current.defaults.structureType).toBe(InternalStructureType.STANDARD);
      expect(result.current.defaults.cockpitType).toBe(CockpitType.STANDARD);
      expect(result.current.defaults.heatSinkType).toBe(HeatSinkType.SINGLE);
      expect(result.current.defaults.armorType).toBe(ArmorTypeEnum.STANDARD);
    });
    
    it('should provide correct Clan defaults', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      // Defaults should be the first available option for each category
      expect(result.current.defaults.engineType).toBe(EngineType.STANDARD);
      expect(result.current.defaults.structureType).toBe(InternalStructureType.STANDARD);
    });
  });
  
  // ===========================================================================
  // Validation Functions
  // ===========================================================================
  describe('Validation Functions', () => {
    describe('isEngineValid()', () => {
      it('should return true for valid IS engine on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isEngineValid(EngineType.STANDARD)).toBe(true);
        expect(result.current.isEngineValid(EngineType.XL_IS)).toBe(true);
        expect(result.current.isEngineValid(EngineType.LIGHT)).toBe(true);
      });
      
      it('should return false for Clan XL engine on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isEngineValid(EngineType.XL_CLAN)).toBe(false);
      });
      
      it('should return true for Clan XL engine on Clan tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createClanComponentTechBases())
        );
        
        expect(result.current.isEngineValid(EngineType.XL_CLAN)).toBe(true);
      });
      
      it('should return false for IS XL engine on Clan tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createClanComponentTechBases())
        );
        
        expect(result.current.isEngineValid(EngineType.XL_IS)).toBe(false);
      });
    });
    
    describe('isStructureValid()', () => {
      it('should return true for IS Endo Steel on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isStructureValid(InternalStructureType.ENDO_STEEL_IS)).toBe(true);
      });
      
      it('should return false for Clan Endo Steel on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isStructureValid(InternalStructureType.ENDO_STEEL_CLAN)).toBe(false);
      });
    });
    
    describe('isHeatSinkValid()', () => {
      it('should return true for IS Double on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isHeatSinkValid(HeatSinkType.DOUBLE_IS)).toBe(true);
      });
      
      it('should return false for Clan Double on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isHeatSinkValid(HeatSinkType.DOUBLE_CLAN)).toBe(false);
      });
    });
    
    describe('isArmorValid()', () => {
      it('should return true for IS Ferro-Fibrous on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isArmorValid(ArmorTypeEnum.FERRO_FIBROUS_IS)).toBe(true);
      });
      
      it('should return false for Clan Ferro-Fibrous on IS tech base', () => {
        const { result } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        
        expect(result.current.isArmorValid(ArmorTypeEnum.FERRO_FIBROUS_CLAN)).toBe(false);
      });
    });
    
    describe('isGyroValid()', () => {
      it('should return true for all gyro types on any tech base', () => {
        const { result: isResult } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        const { result: clanResult } = renderHook(() => 
          useTechBaseSync(createClanComponentTechBases())
        );
        
        // All gyros available to both
        expect(isResult.current.isGyroValid(GyroType.STANDARD)).toBe(true);
        expect(isResult.current.isGyroValid(GyroType.XL)).toBe(true);
        expect(clanResult.current.isGyroValid(GyroType.STANDARD)).toBe(true);
        expect(clanResult.current.isGyroValid(GyroType.XL)).toBe(true);
      });
    });
    
    describe('isCockpitValid()', () => {
      it('should return true for all cockpit types on any tech base', () => {
        const { result: isResult } = renderHook(() => 
          useTechBaseSync(createISComponentTechBases())
        );
        const { result: clanResult } = renderHook(() => 
          useTechBaseSync(createClanComponentTechBases())
        );
        
        // All cockpits available to both
        expect(isResult.current.isCockpitValid(CockpitType.STANDARD)).toBe(true);
        expect(isResult.current.isCockpitValid(CockpitType.SMALL)).toBe(true);
        expect(clanResult.current.isCockpitValid(CockpitType.STANDARD)).toBe(true);
        expect(clanResult.current.isCockpitValid(CockpitType.SMALL)).toBe(true);
      });
    });
  });
  
  // ===========================================================================
  // getValidatedSelections
  // ===========================================================================
  describe('getValidatedSelections()', () => {
    it('should keep valid IS selections unchanged', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const selections = createISXLComponentSelections(50);
      const validated = result.current.getValidatedSelections(selections);
      
      expect(validated.engineType).toBe(EngineType.XL_IS);
      expect(validated.internalStructureType).toBe(InternalStructureType.ENDO_STEEL_IS);
      expect(validated.heatSinkType).toBe(HeatSinkType.DOUBLE_IS);
      expect(validated.armorType).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
    });
    
    it('should replace invalid Clan selections with IS defaults', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      // Create Clan selections and try to validate for IS
      const clanSelections = createClanComponentSelections(50);
      const validated = result.current.getValidatedSelections(clanSelections);
      
      // Clan XL should be replaced with default (Standard)
      expect(validated.engineType).toBe(EngineType.STANDARD);
      // Clan Endo Steel should be replaced with default (Standard)
      expect(validated.internalStructureType).toBe(InternalStructureType.STANDARD);
      // Clan Double should be replaced with default (Single)
      expect(validated.heatSinkType).toBe(HeatSinkType.SINGLE);
      // Clan Ferro-Fibrous should be replaced with default (Standard)
      expect(validated.armorType).toBe(ArmorTypeEnum.STANDARD);
    });
    
    it('should replace invalid IS selections with Clan defaults', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      // Create IS XL selections and try to validate for Clan
      const isSelections = createISXLComponentSelections(50);
      const validated = result.current.getValidatedSelections(isSelections);
      
      // IS XL should be replaced with default (Standard)
      expect(validated.engineType).toBe(EngineType.STANDARD);
      // IS Endo Steel should be replaced with default (Standard)
      expect(validated.internalStructureType).toBe(InternalStructureType.STANDARD);
      // IS Double should be replaced with default (Single)
      expect(validated.heatSinkType).toBe(HeatSinkType.SINGLE);
      // IS Ferro-Fibrous should be replaced with default (Standard)
      expect(validated.armorType).toBe(ArmorTypeEnum.STANDARD);
    });
    
    it('should preserve non-component properties', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createISComponentTechBases())
      );
      
      const selections = {
        ...createISComponentSelections(50),
        engineRating: 300,
        heatSinkCount: 15,
      };
      
      const validated = result.current.getValidatedSelections(selections);
      
      // These should be preserved
      expect(validated.engineRating).toBe(300);
      expect(validated.heatSinkCount).toBe(15);
    });
    
    it('should keep gyro and cockpit types unchanged (available to both)', () => {
      const { result } = renderHook(() => 
        useTechBaseSync(createClanComponentTechBases())
      );
      
      const selections = {
        ...createISComponentSelections(50),
        gyroType: GyroType.XL,
        cockpitType: CockpitType.SMALL,
      };
      
      const validated = result.current.getValidatedSelections(selections);
      
      // Gyro and cockpit should remain unchanged
      expect(validated.gyroType).toBe(GyroType.XL);
      expect(validated.cockpitType).toBe(CockpitType.SMALL);
    });
  });
  
  // ===========================================================================
  // Per-Component Tech Base (Mixed Mode)
  // ===========================================================================
  describe('Per-Component Tech Base (Mixed Mode)', () => {
    it('should filter engines based on engine tech base only', () => {
      const mixedTechBases: IComponentTechBases = {
        ...createISComponentTechBases(),
        engine: TechBase.CLAN, // Only engine is Clan
      };
      
      const { result } = renderHook(() => 
        useTechBaseSync(mixedTechBases)
      );
      
      const engineTypes = result.current.filteredOptions.engines.map(e => e.type);
      
      // Should include Clan XL engine
      expect(engineTypes).toContain(EngineType.XL_CLAN);
      // Should NOT include IS XL engine
      expect(engineTypes).not.toContain(EngineType.XL_IS);
    });
    
    it('should filter structures based on chassis tech base', () => {
      const mixedTechBases: IComponentTechBases = {
        ...createISComponentTechBases(),
        chassis: TechBase.CLAN, // Only chassis is Clan
      };
      
      const { result } = renderHook(() => 
        useTechBaseSync(mixedTechBases)
      );
      
      const structureTypes = result.current.filteredOptions.structures.map(s => s.type);
      
      // Should include Clan Endo Steel
      expect(structureTypes).toContain(InternalStructureType.ENDO_STEEL_CLAN);
      // Should NOT include IS Endo Steel
      expect(structureTypes).not.toContain(InternalStructureType.ENDO_STEEL_IS);
    });
    
    it('should filter heat sinks based on heatsink tech base', () => {
      const mixedTechBases: IComponentTechBases = {
        ...createISComponentTechBases(),
        heatsink: TechBase.CLAN, // Only heatsink is Clan
      };
      
      const { result } = renderHook(() => 
        useTechBaseSync(mixedTechBases)
      );
      
      const heatSinkTypes = result.current.filteredOptions.heatSinks.map(h => h.type);
      
      // Should include Clan Double and Laser
      expect(heatSinkTypes).toContain(HeatSinkType.DOUBLE_CLAN);
      expect(heatSinkTypes).toContain(HeatSinkType.LASER);
      // Should NOT include IS Double
      expect(heatSinkTypes).not.toContain(HeatSinkType.DOUBLE_IS);
    });
    
    it('should filter armor based on armor tech base', () => {
      const mixedTechBases: IComponentTechBases = {
        ...createISComponentTechBases(),
        armor: TechBase.CLAN, // Only armor is Clan
      };
      
      const { result } = renderHook(() => 
        useTechBaseSync(mixedTechBases)
      );
      
      const armorTypes = result.current.filteredOptions.armors.map(a => a.type);
      
      // Should include Clan Ferro-Fibrous
      expect(armorTypes).toContain(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
      // Should NOT include IS Ferro-Fibrous
      expect(armorTypes).not.toContain(ArmorTypeEnum.FERRO_FIBROUS_IS);
    });
  });
  
  // ===========================================================================
  // Memoization Behavior
  // ===========================================================================
  describe('Memoization Behavior', () => {
    it('should return same references when tech bases unchanged', () => {
      const techBases = createISComponentTechBases();
      const { result, rerender } = renderHook(() => 
        useTechBaseSync(techBases)
      );
      
      const initialOptions = result.current.filteredOptions;
      const initialDefaults = result.current.defaults;
      
      rerender();
      
      // Same references due to memoization
      expect(result.current.filteredOptions).toBe(initialOptions);
      expect(result.current.defaults).toBe(initialDefaults);
    });
    
    it('should return new references when tech bases change', () => {
      let techBases = createISComponentTechBases();
      const { result, rerender } = renderHook(
        ({ tb }) => useTechBaseSync(tb),
        { initialProps: { tb: techBases } }
      );
      
      const initialOptions = result.current.filteredOptions;
      
      // Change tech bases
      techBases = createClanComponentTechBases();
      rerender({ tb: techBases });
      
      // New references due to tech base change
      expect(result.current.filteredOptions).not.toBe(initialOptions);
    });
  });
});

