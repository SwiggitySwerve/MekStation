/**
 * Unit Calculations Hook Tests
 *
 * Tests for weight and critical slot calculations, especially
 * verifying the differences between Inner Sphere and Clan components.
 *
 * Key Tech Base Differences:
 * - XL Engine: IS = 3 side slots, Clan = 2 side slots
 * - Endo Steel: IS = 14 slots, Clan = 7 slots
 * - Double Heat Sinks: IS = 3 slots, Clan = 2 slots
 * - Ferro-Fibrous: IS = 14 slots, Clan = 7 slots
 *
 * @spec openspec/specs/component-configuration/spec.md
 */

import { renderHook } from '@testing-library/react';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { IComponentSelections } from '@/stores/useMultiUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import {
  createISComponentSelections,
  createClanComponentSelections,
} from '../helpers/storeTestHelpers';

describe('useUnitCalculations', () => {
  // ===========================================================================
  // Engine Weight Calculations
  // ===========================================================================
  describe('Engine Weight Calculations', () => {
    it('should calculate standard engine weight correctly', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 200, // Walk 4
        }),
      );

      // Standard 200 engine = 8.5 tons (from engine weight table)
      expect(result.current.engineWeight).toBeGreaterThan(0);
    });

    it('should calculate XL IS engine weight (0.5x standard)', () => {
      const standardSelections: IComponentSelections = {
        ...createISComponentSelections(50),
        engineRating: 200,
        engineType: EngineType.STANDARD,
      };

      const xlSelections: IComponentSelections = {
        ...createISComponentSelections(50),
        engineRating: 200,
        engineType: EngineType.XL_IS,
      };

      const { result: standardResult } = renderHook(() =>
        useUnitCalculations(50, standardSelections),
      );
      const { result: xlResult } = renderHook(() =>
        useUnitCalculations(50, xlSelections),
      );

      // XL engine should be approximately half the weight
      expect(xlResult.current.engineWeight).toBeLessThan(
        standardResult.current.engineWeight,
      );
    });

    it('should calculate XL Clan engine weight (0.5x standard)', () => {
      const clanXLSelections: IComponentSelections = {
        ...createClanComponentSelections(50),
        engineRating: 200,
        engineType: EngineType.XL_CLAN,
      };

      const { result } = renderHook(() =>
        useUnitCalculations(50, clanXLSelections),
      );

      // XL Clan engine should have weight calculated
      expect(result.current.engineWeight).toBeGreaterThan(0);
    });

    it('should calculate light engine weight (0.75x standard)', () => {
      const standardSelections: IComponentSelections = {
        ...createISComponentSelections(50),
        engineRating: 200,
        engineType: EngineType.STANDARD,
      };

      const lightSelections: IComponentSelections = {
        ...createISComponentSelections(50),
        engineRating: 200,
        engineType: EngineType.LIGHT,
      };

      const { result: standardResult } = renderHook(() =>
        useUnitCalculations(50, standardSelections),
      );
      const { result: lightResult } = renderHook(() =>
        useUnitCalculations(50, lightSelections),
      );

      // Light engine should be between XL and Standard weight
      expect(lightResult.current.engineWeight).toBeLessThan(
        standardResult.current.engineWeight,
      );
    });
  });

  // ===========================================================================
  // Engine Critical Slot Calculations - KEY TECH BASE DIFFERENCE
  // ===========================================================================
  describe('Engine Critical Slot Calculations', () => {
    it('should calculate standard engine slots (CT only = 6)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineType: EngineType.STANDARD,
        }),
      );

      // Standard engine: 6 CT slots, no side torso
      expect(result.current.engineSlots).toBe(6);
    });

    it('should calculate XL IS engine slots (6 CT + 3+3 side = 12)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineType: EngineType.XL_IS,
        }),
      );

      // XL IS engine: 6 CT + 3 per side torso = 12 total
      expect(result.current.engineSlots).toBe(12);
    });

    it('should calculate XL Clan engine slots (6 CT + 2+2 side = 10)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createClanComponentSelections(50),
          engineType: EngineType.XL_CLAN,
        }),
      );

      // XL Clan engine: 6 CT + 2 per side torso = 10 total
      expect(result.current.engineSlots).toBe(10);
    });

    it('should show 2 fewer side torso slots for Clan XL vs IS XL', () => {
      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineType: EngineType.XL_IS,
        }),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, {
          ...createClanComponentSelections(50),
          engineType: EngineType.XL_CLAN,
        }),
      );

      // Clan XL should have 2 fewer slots than IS XL (10 vs 12)
      expect(clanResult.current.engineSlots).toBe(
        isResult.current.engineSlots - 2,
      );
    });

    it('should calculate Light engine slots (6 CT + 2+2 side = 10)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineType: EngineType.LIGHT,
        }),
      );

      // Light engine: 6 CT + 2 per side torso = 10 total
      expect(result.current.engineSlots).toBe(10);
    });

    it('should calculate Compact engine slots (3 CT only)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineType: EngineType.COMPACT,
        }),
      );

      // Compact engine: 3 CT slots, no side torso
      expect(result.current.engineSlots).toBe(3);
    });
  });

  // ===========================================================================
  // Gyro Calculations
  // ===========================================================================
  describe('Gyro Calculations', () => {
    it('should calculate standard gyro slots (4)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          gyroType: GyroType.STANDARD,
        }),
      );

      expect(result.current.gyroSlots).toBe(4);
    });

    it('should calculate XL gyro slots (6)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          gyroType: GyroType.XL,
        }),
      );

      expect(result.current.gyroSlots).toBe(6);
    });

    it('should calculate Compact gyro slots (2)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          gyroType: GyroType.COMPACT,
        }),
      );

      expect(result.current.gyroSlots).toBe(2);
    });

    it('should calculate Heavy-Duty gyro slots (4)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          gyroType: GyroType.HEAVY_DUTY,
        }),
      );

      expect(result.current.gyroSlots).toBe(4);
    });

    it('should calculate gyro weight based on engine rating', () => {
      const { result: lowRating } = renderHook(() =>
        useUnitCalculations(25, {
          ...createISComponentSelections(25),
          engineRating: 100,
        }),
      );

      const { result: highRating } = renderHook(() =>
        useUnitCalculations(100, {
          ...createISComponentSelections(100),
          engineRating: 400,
        }),
      );

      // Higher engine rating = heavier gyro
      expect(highRating.current.gyroWeight).toBeGreaterThan(
        lowRating.current.gyroWeight,
      );
    });
  });

  // ===========================================================================
  // Internal Structure Calculations - KEY TECH BASE DIFFERENCE
  // ===========================================================================
  describe('Internal Structure Calculations', () => {
    it('should calculate standard structure slots (0)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          internalStructureType: InternalStructureType.STANDARD,
        }),
      );

      expect(result.current.structureSlots).toBe(0);
    });

    it('should calculate IS Endo Steel slots (14)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        }),
      );

      expect(result.current.structureSlots).toBe(14);
    });

    it('should calculate Clan Endo Steel slots (7)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createClanComponentSelections(50),
          internalStructureType: InternalStructureType.ENDO_STEEL_CLAN,
        }),
      );

      expect(result.current.structureSlots).toBe(7);
    });

    it('should show 7 fewer slots for Clan Endo Steel vs IS Endo Steel', () => {
      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        }),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, {
          ...createClanComponentSelections(50),
          internalStructureType: InternalStructureType.ENDO_STEEL_CLAN,
        }),
      );

      // Clan Endo Steel = 7 slots, IS Endo Steel = 14 slots
      expect(clanResult.current.structureSlots).toBe(
        isResult.current.structureSlots / 2,
      );
    });

    it('should calculate standard structure weight (10% of tonnage)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          internalStructureType: InternalStructureType.STANDARD,
        }),
      );

      // 50 tons * 10% = 5 tons
      expect(result.current.structureWeight).toBe(5);
    });

    it('should calculate Endo Steel structure weight (5% of tonnage)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        }),
      );

      // 50 tons * 5% = 2.5 tons
      expect(result.current.structureWeight).toBe(2.5);
    });
  });

  // ===========================================================================
  // Heat Sink Calculations - KEY TECH BASE DIFFERENCE
  // ===========================================================================
  describe('Heat Sink Calculations', () => {
    it('should calculate integral heat sinks from engine rating', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 250, // 250/25 = 10 integral
          heatSinkType: HeatSinkType.SINGLE,
          heatSinkCount: 10,
        }),
      );

      // 250 rating / 25 = 10 integral heat sinks
      expect(result.current.integralHeatSinks).toBe(10);
    });

    it('should calculate external heat sinks correctly', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 200, // 200/25 = 8 integral
          heatSinkType: HeatSinkType.SINGLE,
          heatSinkCount: 12, // 12 total - 8 integral = 4 external
        }),
      );

      expect(result.current.integralHeatSinks).toBe(8);
      expect(result.current.externalHeatSinks).toBe(4);
    });

    it('should calculate single heat sink slots (1 per external)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 200, // 8 integral
          heatSinkType: HeatSinkType.SINGLE,
          heatSinkCount: 13, // 5 external
        }),
      );

      // 5 external singles = 5 slots
      expect(result.current.heatSinkSlots).toBe(5);
    });

    it('should calculate IS Double heat sink slots (3 per external)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 200, // 8 integral
          heatSinkType: HeatSinkType.DOUBLE_IS,
          heatSinkCount: 12, // 4 external
        }),
      );

      // 4 external IS doubles = 12 slots
      expect(result.current.heatSinkSlots).toBe(12);
    });

    it('should calculate Clan Double heat sink slots (2 per external)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createClanComponentSelections(50),
          engineRating: 200, // 8 integral
          heatSinkType: HeatSinkType.DOUBLE_CLAN,
          heatSinkCount: 12, // 4 external
        }),
      );

      // 4 external Clan doubles = 8 slots
      expect(result.current.heatSinkSlots).toBe(8);
    });

    it('should show 1 fewer slot per external heat sink for Clan vs IS Double', () => {
      const baseSelections = {
        engineRating: 200, // 8 integral
        heatSinkCount: 12, // 4 external
        engineType: EngineType.STANDARD,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.STANDARD,
        cockpitType: CockpitType.STANDARD,
        armorType: ArmorTypeEnum.STANDARD,
      };

      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, {
          ...baseSelections,
          heatSinkType: HeatSinkType.DOUBLE_IS,
        }),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, {
          ...baseSelections,
          heatSinkType: HeatSinkType.DOUBLE_CLAN,
        }),
      );

      // 4 external: IS = 12 slots (3 each), Clan = 8 slots (2 each)
      expect(clanResult.current.heatSinkSlots).toBe(
        isResult.current.heatSinkSlots - 4,
      );
    });

    it('should calculate total heat dissipation for doubles', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          heatSinkType: HeatSinkType.DOUBLE_IS,
          heatSinkCount: 10,
        }),
      );

      // 10 double heat sinks = 20 heat dissipation
      expect(result.current.totalHeatDissipation).toBe(20);
    });
  });

  // ===========================================================================
  // Armor Weight Calculations - Based on armorTonnage, NOT allocated points
  // ===========================================================================
  describe('Armor Weight Calculations', () => {
    it('should use armorTonnage directly for armor weight', () => {
      const armorTonnage = 10;

      const { result } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), armorTonnage),
      );

      // Armor weight should equal the armorTonnage parameter directly
      expect(result.current.armorWeight).toBe(armorTonnage);
    });

    it('should return 0 armor weight when armorTonnage is 0', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), 0),
      );

      expect(result.current.armorWeight).toBe(0);
    });

    it('should use armorTonnage regardless of armor type', () => {
      const armorTonnage = 8;

      // Standard armor
      const { result: standardResult } = renderHook(() =>
        useUnitCalculations(
          50,
          {
            ...createISComponentSelections(50),
            armorType: ArmorTypeEnum.STANDARD,
          },
          armorTonnage,
        ),
      );

      // Ferro-Fibrous armor (different points per ton, but weight is still armorTonnage)
      const { result: ferroResult } = renderHook(() =>
        useUnitCalculations(
          50,
          {
            ...createISComponentSelections(50),
            armorType: ArmorTypeEnum.FERRO_FIBROUS_IS,
          },
          armorTonnage,
        ),
      );

      // Both should have the same armor weight (armorTonnage)
      expect(standardResult.current.armorWeight).toBe(armorTonnage);
      expect(ferroResult.current.armorWeight).toBe(armorTonnage);
      expect(standardResult.current.armorWeight).toBe(
        ferroResult.current.armorWeight,
      );
    });

    it('should handle fractional armor tonnage (0.5 ton increments)', () => {
      const { result: halfTon } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), 5.5),
      );

      const { result: wholeTon } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), 6),
      );

      expect(halfTon.current.armorWeight).toBe(5.5);
      expect(wholeTon.current.armorWeight).toBe(6);
    });

    it('should include armor weight in total structural weight', () => {
      const armorTonnage = 10;

      const { result } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), armorTonnage),
      );

      const expectedTotal =
        result.current.engineWeight +
        result.current.gyroWeight +
        result.current.structureWeight +
        result.current.cockpitWeight +
        result.current.heatSinkWeight +
        result.current.armorWeight;

      expect(result.current.totalStructuralWeight).toBe(expectedTotal);
      // Also verify armor weight is included
      expect(result.current.armorWeight).toBe(armorTonnage);
    });

    it('should change total weight when armor tonnage changes', () => {
      const { result: noArmor } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), 0),
      );

      const { result: withArmor } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), 10),
      );

      // Total weight should differ by exactly the armor tonnage difference
      expect(
        withArmor.current.totalStructuralWeight -
          noArmor.current.totalStructuralWeight,
      ).toBe(10);
    });
  });

  // ===========================================================================
  // Movement Calculations
  // ===========================================================================
  describe('Movement Calculations', () => {
    it('should calculate walk MP from engine rating and tonnage', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 200, // 200/50 = 4
        }),
      );

      expect(result.current.walkMP).toBe(4);
    });

    it('should calculate run MP (1.5x walk, rounded up)', () => {
      const { result: walk4 } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 200, // Walk 4
        }),
      );

      const { result: walk5 } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 250, // Walk 5
        }),
      );

      // Walk 4 * 1.5 = 6
      expect(walk4.current.runMP).toBe(6);
      // Walk 5 * 1.5 = 7.5 -> 8
      expect(walk5.current.runMP).toBe(8);
    });
  });

  // ===========================================================================
  // Total Weight Calculations
  // ===========================================================================
  describe('Total Weight Calculations', () => {
    it('should calculate total structural weight (including armor)', () => {
      const armorTonnage = 8;

      const { result } = renderHook(() =>
        useUnitCalculations(50, createISComponentSelections(50), armorTonnage),
      );

      const expected =
        result.current.engineWeight +
        result.current.gyroWeight +
        result.current.structureWeight +
        result.current.cockpitWeight +
        result.current.heatSinkWeight +
        result.current.armorWeight;

      expect(result.current.totalStructuralWeight).toBe(expected);
      // Also verify armor weight is included correctly
      expect(result.current.armorWeight).toBe(armorTonnage);
    });

    it('should show weight savings with Endo Steel vs Standard', () => {
      const standardSelections = {
        ...createISComponentSelections(50),
        internalStructureType: InternalStructureType.STANDARD,
      };

      const endoSelections = {
        ...createISComponentSelections(50),
        internalStructureType: InternalStructureType.ENDO_STEEL_IS,
      };

      const { result: standardResult } = renderHook(() =>
        useUnitCalculations(50, standardSelections),
      );

      const { result: endoResult } = renderHook(() =>
        useUnitCalculations(50, endoSelections),
      );

      // Endo Steel should save weight
      expect(endoResult.current.structureWeight).toBeLessThan(
        standardResult.current.structureWeight,
      );
      expect(endoResult.current.totalStructuralWeight).toBeLessThan(
        standardResult.current.totalStructuralWeight,
      );
    });
  });

  // ===========================================================================
  // Complete Build Comparisons
  // ===========================================================================
  describe('Complete Build Comparisons', () => {
    it('should show significant slot savings for full Clan build vs IS build', () => {
      // Full IS XL build
      const isXLBuild: IComponentSelections = {
        engineType: EngineType.XL_IS,
        engineRating: 200,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.ENDO_STEEL_IS,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.DOUBLE_IS,
        heatSinkCount: 12, // 4 external with rating 200
        armorType: ArmorTypeEnum.STANDARD,
      };

      // Full Clan XL build
      const clanXLBuild: IComponentSelections = {
        engineType: EngineType.XL_CLAN,
        engineRating: 200,
        gyroType: GyroType.STANDARD,
        internalStructureType: InternalStructureType.ENDO_STEEL_CLAN,
        cockpitType: CockpitType.STANDARD,
        heatSinkType: HeatSinkType.DOUBLE_CLAN,
        heatSinkCount: 12, // 4 external with rating 200
        armorType: ArmorTypeEnum.STANDARD,
      };

      const { result: isResult } = renderHook(() =>
        useUnitCalculations(50, isXLBuild),
      );

      const { result: clanResult } = renderHook(() =>
        useUnitCalculations(50, clanXLBuild),
      );

      // Clan should use fewer slots in totalSystemSlots:
      // Engine: 10 vs 12 (2 fewer)
      // Note: Endo Steel and Heat Sinks are now tracked in equipment array, not totalSystemSlots
      // So totalSystemSlots only differs by engine slots (2 fewer for Clan XL)
      const expectedSlotSavings = 2; // Only engine difference
      expect(
        isResult.current.totalSystemSlots - clanResult.current.totalSystemSlots,
      ).toBe(expectedSlotSavings);

      // Heat sink slots still tracked for reference:
      // IS Double: 4 external × 3 slots = 12
      // Clan Double: 4 external × 2 slots = 8
      expect(isResult.current.heatSinkSlots).toBe(12);
      expect(clanResult.current.heatSinkSlots).toBe(8);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
  describe('Edge Cases', () => {
    it('should handle minimum tonnage (20 tons)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(20, {
          ...createISComponentSelections(20),
          engineRating: 160, // Walk 8
        }),
      );

      expect(result.current.structureWeight).toBe(2); // 20 * 0.10 = 2
      expect(result.current.walkMP).toBe(8);
    });

    it('should handle maximum tonnage (100 tons)', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(100, {
          ...createISComponentSelections(100),
          engineRating: 300, // Walk 3
        }),
      );

      expect(result.current.structureWeight).toBe(10); // 100 * 0.10 = 10
      expect(result.current.walkMP).toBe(3);
    });

    it('should handle zero external heat sinks', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 300, // 12 integral
          heatSinkType: HeatSinkType.SINGLE,
          heatSinkCount: 10, // 10 total, all integral
        }),
      );

      expect(result.current.externalHeatSinks).toBe(0);
      expect(result.current.heatSinkSlots).toBe(0);
      expect(result.current.heatSinkWeight).toBe(0);
    });

    it('should handle more heat sinks than integral capacity', () => {
      const { result } = renderHook(() =>
        useUnitCalculations(50, {
          ...createISComponentSelections(50),
          engineRating: 100, // 4 integral
          heatSinkType: HeatSinkType.SINGLE,
          heatSinkCount: 20, // 16 external
        }),
      );

      expect(result.current.integralHeatSinks).toBe(4);
      expect(result.current.externalHeatSinks).toBe(16);
      expect(result.current.heatSinkSlots).toBe(16);
    });
  });
});
