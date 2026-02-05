/**
 * Tech Base Switching Integration Tests
 *
 * End-to-end tests for tech base switching scenarios, verifying that
 * switching between Inner Sphere and Clan correctly:
 * - Filters available components
 * - Replaces incompatible selections
 * - Updates critical slot calculations
 * - Maintains state integrity across stores
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

import { useTechBaseSync } from '@/hooks/useTechBaseSync';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import {
  clearAllStores,
  getUnitStore,
  createAndRegisterUnit,
  duplicateUnit,
} from '@/stores/unitStoreRegistry';
import { IComponentSelections } from '@/stores/useMultiUnitStore';
import {
  useTabManagerStore,
  UNIT_TEMPLATES,
} from '@/stores/useTabManagerStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  TechBaseComponent,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import {
  setupMockLocalStorage,
  expectAllComponentTechBases,
} from '../helpers/storeTestHelpers';

describe('Tech Base Switching Integration', () => {
  let mockStorage: ReturnType<typeof setupMockLocalStorage>;

  beforeEach(() => {
    mockStorage = setupMockLocalStorage();
    clearAllStores(true);
    useTabManagerStore.setState({
      tabs: [],
      activeTabId: null,
      isLoading: false,
      isNewTabModalOpen: false,
    });
  });

  afterEach(() => {
    clearAllStores(true);
    mockStorage.cleanup();
  });

  // ===========================================================================
  // Scenario 1: Create IS Unit -> Switch to Clan
  // ===========================================================================
  describe('Scenario: IS Unit Switches to Clan', () => {
    it('should reset all componentTechBases to Clan', () => {
      // Create IS unit
      const store = createAndRegisterUnit({
        name: 'IS Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      // Verify initial IS state
      expectAllComponentTechBases(
        store.getState().componentTechBases,
        TechBase.INNER_SPHERE,
      );
      expect(store.getState().techBaseMode).toBe(TechBaseMode.INNER_SPHERE);

      // Switch to Clan
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.CLAN);
      });

      // Verify Clan state
      expectAllComponentTechBases(
        store.getState().componentTechBases,
        TechBase.CLAN,
      );
      expect(store.getState().techBaseMode).toBe(TechBaseMode.CLAN);
    });

    it('should invalidate IS-only engine selection when switching to Clan', () => {
      const store = createAndRegisterUnit({
        name: 'IS Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      // Set IS-only XL engine
      act(() => {
        store.getState().setEngineType(EngineType.XL_IS);
      });

      expect(store.getState().engineType).toBe(EngineType.XL_IS);

      // Switch to Clan mode
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.CLAN);
      });

      // Use tech base sync to validate
      const { result } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      // XL_IS should no longer be valid
      expect(result.current.isEngineValid(EngineType.XL_IS)).toBe(false);
      expect(result.current.isEngineValid(EngineType.XL_CLAN)).toBe(true);
    });

    it('should invalidate IS Endo Steel when switching to Clan', () => {
      const store = createAndRegisterUnit({
        name: 'IS Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      // Set IS Endo Steel
      act(() => {
        store
          .getState()
          .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
      });

      // Switch to Clan mode
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.CLAN);
      });

      const { result } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      expect(
        result.current.isStructureValid(InternalStructureType.ENDO_STEEL_IS),
      ).toBe(false);
      expect(
        result.current.isStructureValid(InternalStructureType.ENDO_STEEL_CLAN),
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Scenario 2: Create Clan Unit -> Add Clan XL -> Switch to IS
  // ===========================================================================
  describe('Scenario: Clan Unit with XL Engine Switches to IS', () => {
    it('should invalidate Clan XL engine when switching to IS', () => {
      const store = createAndRegisterUnit({
        name: 'Clan Mech',
        tonnage: 50,
        techBase: TechBase.CLAN,
      });

      // Set Clan XL engine
      act(() => {
        store.getState().setEngineType(EngineType.XL_CLAN);
      });

      expect(store.getState().engineType).toBe(EngineType.XL_CLAN);

      // Switch to IS mode
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.INNER_SPHERE);
      });

      const { result } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      // Clan XL should no longer be valid
      expect(result.current.isEngineValid(EngineType.XL_CLAN)).toBe(false);
      expect(result.current.isEngineValid(EngineType.XL_IS)).toBe(true);
    });

    it('should provide validated selections replacing Clan components with IS defaults', () => {
      const store = createAndRegisterUnit({
        name: 'Clan Mech',
        tonnage: 50,
        techBase: TechBase.CLAN,
      });

      // Set full Clan build
      act(() => {
        store.getState().setEngineType(EngineType.XL_CLAN);
        store
          .getState()
          .setInternalStructureType(InternalStructureType.ENDO_STEEL_CLAN);
        store.getState().setHeatSinkType(HeatSinkType.DOUBLE_CLAN);
        store.getState().setArmorType(ArmorTypeEnum.FERRO_FIBROUS_CLAN);
      });

      // Switch to IS mode
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.INNER_SPHERE);
      });

      const { result } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      const currentSelections: IComponentSelections = {
        engineType: store.getState().engineType,
        engineRating: store.getState().engineRating,
        gyroType: store.getState().gyroType,
        internalStructureType: store.getState().internalStructureType,
        cockpitType: store.getState().cockpitType,
        heatSinkType: store.getState().heatSinkType,
        heatSinkCount: store.getState().heatSinkCount,
        armorType: store.getState().armorType,
      };

      const validated =
        result.current.getValidatedSelections(currentSelections);

      // All Clan-specific components should be replaced with defaults
      expect(validated.engineType).toBe(EngineType.STANDARD);
      expect(validated.internalStructureType).toBe(
        InternalStructureType.STANDARD,
      );
      expect(validated.heatSinkType).toBe(HeatSinkType.SINGLE);
      expect(validated.armorType).toBe(ArmorTypeEnum.STANDARD);
    });
  });

  // ===========================================================================
  // Scenario 3: Mixed Mode Configuration
  // ===========================================================================
  describe('Scenario: Mixed Tech Mode', () => {
    it('should allow individual component tech bases in mixed mode', () => {
      const store = createAndRegisterUnit({
        name: 'Mixed Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      // Switch to mixed mode
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.MIXED);
      });

      // Set engine to Clan, armor to IS
      act(() => {
        store
          .getState()
          .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
        store
          .getState()
          .setComponentTechBase(TechBaseComponent.ARMOR, TechBase.INNER_SPHERE);
      });

      expect(store.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      expect(store.getState().componentTechBases.armor).toBe(
        TechBase.INNER_SPHERE,
      );
      expect(store.getState().techBaseMode).toBe(TechBaseMode.MIXED);
    });

    it('should filter engines based on engine tech base in mixed mode', () => {
      const store = createAndRegisterUnit({
        name: 'Mixed Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.MIXED);
        store
          .getState()
          .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
      });

      const { result } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      // With engine set to Clan, should have Clan XL available
      expect(result.current.isEngineValid(EngineType.XL_CLAN)).toBe(true);
      expect(result.current.isEngineValid(EngineType.XL_IS)).toBe(false);
    });

    it('should filter heat sinks based on heatsink tech base in mixed mode', () => {
      const store = createAndRegisterUnit({
        name: 'Mixed Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.MIXED);
        store
          .getState()
          .setComponentTechBase(TechBaseComponent.HEATSINK, TechBase.CLAN);
      });

      const { result } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      // With heatsink set to Clan, should have Clan Double available
      expect(result.current.isHeatSinkValid(HeatSinkType.DOUBLE_CLAN)).toBe(
        true,
      );
      expect(result.current.isHeatSinkValid(HeatSinkType.DOUBLE_IS)).toBe(
        false,
      );
    });

    it('should preserve mixed settings when switching to mixed mode', () => {
      const store = createAndRegisterUnit({
        name: 'Mixed Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      // Set specific components before switching to mixed
      act(() => {
        store
          .getState()
          .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
        store
          .getState()
          .setComponentTechBase(TechBaseComponent.HEATSINK, TechBase.CLAN);
      });

      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.MIXED);
      });

      // Settings should be preserved
      expect(store.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      expect(store.getState().componentTechBases.heatsink).toBe(TechBase.CLAN);
      expect(store.getState().componentTechBases.chassis).toBe(
        TechBase.INNER_SPHERE,
      );
    });
  });

  // ===========================================================================
  // Scenario 4: Tab Switching with Different Tech Bases
  // ===========================================================================
  describe('Scenario: Tab Switching with Different Tech Bases', () => {
    it('should maintain separate tech base configurations per tab', () => {
      // Create IS tab
      let isTabId: string = '';
      act(() => {
        isTabId = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]); // Medium IS
      });

      // Create Clan tab
      const clanTemplate = { ...UNIT_TEMPLATES[1], techBase: TechBase.CLAN };
      let clanTabId: string = '';
      act(() => {
        clanTabId = useTabManagerStore.getState().createTab(clanTemplate);
      });

      // Modify Clan tab
      const clanStore = getUnitStore(clanTabId);
      act(() => {
        clanStore?.getState().setEngineType(EngineType.XL_CLAN);
      });

      // Switch to IS tab
      act(() => {
        useTabManagerStore.getState().selectTab(isTabId);
      });

      // IS store should be unchanged
      const isStore = getUnitStore(isTabId);
      expect(isStore?.getState().engineType).toBe(EngineType.STANDARD);
      expectAllComponentTechBases(
        isStore!.getState().componentTechBases,
        TechBase.INNER_SPHERE,
      );

      // Switch back to Clan tab - should have changes preserved
      act(() => {
        useTabManagerStore.getState().selectTab(clanTabId);
      });

      expect(clanStore?.getState().engineType).toBe(EngineType.XL_CLAN);
    });

    it('should correctly hydrate tab stores on selection', () => {
      // Create two tabs
      let tab1Id: string = '';
      let tab2Id: string = '';

      act(() => {
        tab1Id = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[0]);
        tab2Id = useTabManagerStore.getState().createTab(UNIT_TEMPLATES[1]);
      });

      // Modify tab1
      const store1 = getUnitStore(tab1Id);
      act(() => {
        store1?.getState().setGyroType(GyroType.COMPACT);
        store1?.getState().setTechBaseMode(TechBaseMode.MIXED);
      });

      // Switch to tab2
      act(() => {
        useTabManagerStore.getState().selectTab(tab2Id);
      });

      // Switch back to tab1
      act(() => {
        useTabManagerStore.getState().selectTab(tab1Id);
      });

      // tab1 should have preserved state
      const rehydratedStore = getUnitStore(tab1Id);
      expect(rehydratedStore?.getState().gyroType).toBe(GyroType.COMPACT);
      expect(rehydratedStore?.getState().techBaseMode).toBe(TechBaseMode.MIXED);
    });
  });

  // ===========================================================================
  // Scenario 5: Duplicate Unit with Tech Base Configuration
  // ===========================================================================
  describe('Scenario: Duplicate Unit with Tech Base Configuration', () => {
    it('should copy all tech base configuration to duplicate', () => {
      const original = createAndRegisterUnit({
        name: 'Original',
        tonnage: 75,
        techBase: TechBase.CLAN,
      });

      // Configure original
      act(() => {
        original.getState().setTechBaseMode(TechBaseMode.MIXED);
        original
          .getState()
          .setComponentTechBase(TechBaseComponent.ARMOR, TechBase.INNER_SPHERE);
        original.getState().setEngineType(EngineType.XL_CLAN);
        original.getState().setHeatSinkType(HeatSinkType.DOUBLE_CLAN);
      });

      const duplicate = duplicateUnit(original.getState().id);

      expect(duplicate).not.toBeNull();
      expect(duplicate!.getState().techBaseMode).toBe(TechBaseMode.MIXED);
      expect(duplicate!.getState().componentTechBases.armor).toBe(
        TechBase.INNER_SPHERE,
      );
      expect(duplicate!.getState().componentTechBases.engine).toBe(
        TechBase.CLAN,
      );
      expect(duplicate!.getState().engineType).toBe(EngineType.XL_CLAN);
      expect(duplicate!.getState().heatSinkType).toBe(HeatSinkType.DOUBLE_CLAN);
    });

    it('should create independent copy that can be modified separately', () => {
      const original = createAndRegisterUnit({
        name: 'Original',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      act(() => {
        original.getState().setEngineType(EngineType.XL_IS);
      });

      const duplicate = duplicateUnit(original.getState().id);

      // Modify duplicate to Clan
      act(() => {
        duplicate!.getState().setTechBaseMode(TechBaseMode.CLAN);
        duplicate!.getState().setEngineType(EngineType.XL_CLAN);
      });

      // Original should be unchanged
      expect(original.getState().techBaseMode).toBe(TechBaseMode.INNER_SPHERE);
      expect(original.getState().engineType).toBe(EngineType.XL_IS);

      // Duplicate should have changes
      expect(duplicate!.getState().techBaseMode).toBe(TechBaseMode.CLAN);
      expect(duplicate!.getState().engineType).toBe(EngineType.XL_CLAN);
    });
  });

  // ===========================================================================
  // Scenario 6: Critical Slot Changes on Tech Base Switch
  // ===========================================================================
  describe('Scenario: Critical Slot Changes on Tech Base Switch', () => {
    it('should calculate different slots for IS vs Clan XL engines', () => {
      const isSelections: IComponentSelections = {
        engineType: EngineType.XL_IS,
        engineRating: 200,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        armorType: ArmorTypeEnum.STANDARD,
      };

      const clanSelections: IComponentSelections = {
        ...isSelections,
        engineType: EngineType.XL_CLAN,
      };

      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, isSelections),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, clanSelections),
      );

      // IS XL = 12 slots (6 CT + 3 per side)
      // Clan XL = 10 slots (6 CT + 2 per side)
      expect(isResult.current.engineSlots).toBe(12);
      expect(clanResult.current.engineSlots).toBe(10);
    });

    it('should calculate different slots for IS vs Clan Endo Steel', () => {
      const isSelections: IComponentSelections = {
        engineType: EngineType.STANDARD,
        engineRating: 200,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.SINGLE,
        heatSinkCount: 10,
        armorType: ArmorTypeEnum.STANDARD,
      };

      const clanSelections: IComponentSelections = {
        ...isSelections,
        internalStructureType: InternalStructureType.ENDO_STEEL_CLAN,
      };

      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, isSelections),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, clanSelections),
      );

      // IS Endo Steel = 14 slots
      // Clan Endo Steel = 7 slots
      expect(isResult.current.structureSlots).toBe(14);
      expect(clanResult.current.structureSlots).toBe(7);
    });

    it('should calculate different slots for IS vs Clan Double Heat Sinks', () => {
      const baseSelections: IComponentSelections = {
        engineType: EngineType.STANDARD,
        engineRating: 200, // 8 integral
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 12, // 4 external
        armorType: ArmorTypeEnum.STANDARD,
      };

      const clanSelections: IComponentSelections = {
        ...baseSelections,
        heatSinkType: HeatSinkType.DOUBLE_CLAN,
      };

      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, baseSelections),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, clanSelections),
      );

      // 4 external IS Doubles = 12 slots (3 each)
      // 4 external Clan Doubles = 8 slots (2 each)
      expect(isResult.current.heatSinkSlots).toBe(12);
      expect(clanResult.current.heatSinkSlots).toBe(8);
    });

    it('should show significant slot savings for full Clan build', () => {
      // Full IS XL build with all tech-specific components
      const isFullBuild: IComponentSelections = {
        engineType: EngineType.XL_IS,
        engineRating: 200,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 12, // 4 external
        armorType: ArmorTypeEnum.STANDARD,
      };

      // Equivalent Clan build
      const clanFullBuild: IComponentSelections = {
        engineType: EngineType.XL_CLAN,
        engineRating: 200,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.ENDO_STEEL_CLAN,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.DOUBLE_CLAN,
        heatSinkCount: 12, // 4 external
        armorType: ArmorTypeEnum.STANDARD,
      };

      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, isFullBuild),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, clanFullBuild),
      );

      // Calculate slot difference
      const slotDifference =
        isResult.current.engineSlots -
        clanResult.current.engineSlots +
        (isResult.current.structureSlots - clanResult.current.structureSlots) +
        (isResult.current.heatSinkSlots - clanResult.current.heatSinkSlots);

      // Engine: 2 fewer slots (12 vs 10)
      // Structure: 7 fewer slots (14 vs 7)
      // Heat Sinks: 4 fewer slots (12 vs 8)
      // Total: 13 fewer slots
      expect(slotDifference).toBe(13);
    });
  });

  // ===========================================================================
  // Scenario 7: Complete Workflow Test
  // ===========================================================================
  describe('Scenario: Complete Workflow', () => {
    it('should handle complete IS -> Clan -> Mixed workflow', () => {
      // Step 1: Create IS unit with IS XL engine
      const store = createAndRegisterUnit({
        name: 'Workflow Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });

      act(() => {
        store.getState().setEngineType(EngineType.XL_IS);
        store
          .getState()
          .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
      });

      expect(store.getState().techBaseMode).toBe(TechBaseMode.INNER_SPHERE);
      expect(store.getState().engineType).toBe(EngineType.XL_IS);

      // Step 2: Switch to Clan - verify selections become invalid
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.CLAN);
      });

      const { result: clanCheck } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      expect(clanCheck.current.isEngineValid(EngineType.XL_IS)).toBe(false);
      expect(
        clanCheck.current.isStructureValid(InternalStructureType.ENDO_STEEL_IS),
      ).toBe(false);

      // Step 3: Update to valid Clan components
      act(() => {
        store.getState().setEngineType(EngineType.XL_CLAN);
        store
          .getState()
          .setInternalStructureType(InternalStructureType.ENDO_STEEL_CLAN);
      });

      expect(clanCheck.current.isEngineValid(EngineType.XL_CLAN)).toBe(true);

      // Step 4: Switch to mixed mode
      act(() => {
        store.getState().setTechBaseMode(TechBaseMode.MIXED);
        store
          .getState()
          .setComponentTechBase(
            TechBaseComponent.HEATSINK,
            TechBase.INNER_SPHERE,
          );
      });

      const { result: mixedCheck } = renderHook(() =>
        useTechBaseSync(store.getState().componentTechBases),
      );

      // Engine still Clan, heat sinks now IS
      expect(mixedCheck.current.isEngineValid(EngineType.XL_CLAN)).toBe(true);
      expect(mixedCheck.current.isHeatSinkValid(HeatSinkType.DOUBLE_IS)).toBe(
        true,
      );
      expect(mixedCheck.current.isHeatSinkValid(HeatSinkType.DOUBLE_CLAN)).toBe(
        false,
      );

      // Step 5: Verify final state
      expect(store.getState().techBaseMode).toBe(TechBaseMode.MIXED);
      expect(store.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      expect(store.getState().componentTechBases.heatsink).toBe(
        TechBase.INNER_SPHERE,
      );
    });
  });
});
