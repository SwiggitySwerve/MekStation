/**
 * useEquipmentCalculations Hook Tests
 *
 * Tests for equipment weight, slots, and heat calculations.
 */

import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, basePath: string) => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    return JSON.parse(
      await fs.readFile(
        path.join(process.cwd(), 'public', basePath, file),
        'utf8',
      ),
    );
  },
}));

// Mock the useEquipmentRegistry hook
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: true, recheckReady: jest.fn() }),
}));

describe('useEquipmentCalculations', () => {
  beforeAll(async () => {
    // Initialize equipment loader and registry
    const loader = getEquipmentLoader();
    if (!loader.getIsLoaded()) {
      await loader.loadOfficialEquipment();
    }
    await getEquipmentLookupService().initialize();
    const registry = getEquipmentRegistry();
    await registry.initialize();
  }, 30000);

  const createMockEquipment = (
    overrides: Partial<IMountedEquipmentInstance> = {},
  ): IMountedEquipmentInstance => ({
    instanceId: 'test-instance-1',
    equipmentId: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    heat: 3,
    techBase: TechBase.INNER_SPHERE,
    location: MechLocation.LEFT_ARM,
    slots: [0],
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: true,
    isOmniPodMounted: false,
    ...overrides,
  });

  test('recovers missing imported weapon heat from the loaded definition', () => {
    const equipment = [createMockEquipment({ heat: 0 })];
    const { result } = renderHook(() => useEquipmentCalculations(equipment));
    expect(result.current.totalHeat).toBe(3);
    expect(
      result.current.byCategory[EquipmentCategory.ENERGY_WEAPON].heat,
    ).toBe(3);
  });

  describe('Basic Calculations', () => {
    it('should calculate totals for empty equipment array', () => {
      const { result } = renderHook(() => useEquipmentCalculations([]));

      expect(result.current.totalWeight).toBe(0);
      expect(result.current.totalSlots).toBe(0);
      expect(result.current.totalHeat).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });

    it('should calculate totals for single item', () => {
      const equipment = [createMockEquipment()];
      const { result } = renderHook(() => useEquipmentCalculations(equipment));

      expect(result.current.totalWeight).toBe(1);
      expect(result.current.totalSlots).toBe(1);
      expect(result.current.totalHeat).toBe(3);
      expect(result.current.itemCount).toBe(1);
    });

    it('keeps configuration equipment physical weights without charging them as payload', () => {
      const equipment = [
        createMockEquipment({ instanceId: 'payload', weight: 5 }),
        createMockEquipment({
          instanceId: 'external-heat-sink',
          equipmentId: 'single-heat-sink',
          name: 'Single Heat Sink',
          category: EquipmentCategory.MISC_EQUIPMENT,
          weight: 1,
          heat: 0,
          isRemovable: false,
        }),
        createMockEquipment({
          instanceId: 'jump-jet',
          equipmentId: 'jump-jet-medium',
          name: 'Jump Jet (Medium)',
          category: EquipmentCategory.MOVEMENT,
          weight: 1,
          heat: 0,
          isRemovable: false,
        }),
      ];

      const { result } = renderHook(() => useEquipmentCalculations(equipment));

      expect(equipment.map((item) => item.weight)).toEqual([5, 1, 1]);
      expect(result.current.totalWeight).toBe(5);
    });

    it('reports the loaded Atlas at 100 tons without double-counting fixed heat sinks', () => {
      const serialized = parseUnit(
        JSON.parse(
          readFileSync(
            join(
              process.cwd(),
              'public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json',
            ),
            'utf8',
          ),
        ),
      );
      const state = new UnitLoaderService().mapToUnitState(serialized, true);
      const physicalEquipmentWeight = state.equipment.reduce(
        (total, item) => total + item.weight,
        0,
      );
      const componentSelections = {
        engineType: state.engineType,
        engineRating: state.engineRating,
        gyroType: state.gyroType,
        internalStructureType: state.internalStructureType,
        cockpitType: state.cockpitType,
        heatSinkType: state.heatSinkType,
        heatSinkCount: state.heatSinkCount,
        armorType: state.armorType,
        jumpMP: state.jumpMP,
        jumpJetType: state.jumpJetType,
      };

      const { result } = renderHook(() => {
        const equipment = useEquipmentCalculations(state.equipment);
        const structure = useUnitCalculations(
          state.tonnage,
          componentSelections,
          state.armorTonnage,
          state.configuration,
        );
        return {
          payloadWeight: equipment.totalWeight,
          structuralWeight: structure.totalStructuralWeight,
        };
      });

      expect(state.equipment).toHaveLength(20);
      expect(physicalEquipmentWeight).toBe(44);
      expect(result.current.payloadWeight).toBe(36);
      expect(result.current.structuralWeight).toBe(64);
      expect(
        result.current.structuralWeight + result.current.payloadWeight,
      ).toBe(100);
    });

    it('should sum heat from multiple weapons', () => {
      const equipment = [
        createMockEquipment({ instanceId: '1', heat: 3 }), // Medium Laser
        createMockEquipment({ instanceId: '2', heat: 3 }), // Medium Laser
        createMockEquipment({ instanceId: '3', heat: 10, weight: 6 }), // Large Pulse Laser
      ];
      const { result } = renderHook(() => useEquipmentCalculations(equipment));

      expect(result.current.totalHeat).toBe(16); // 3 + 3 + 10
    });
  });

  describe('Marauder C Equipment Heat', () => {
    // Marauder C loadout:
    // - 2x Clan Large Pulse Laser: 10 heat each = 20
    // - 2x Medium Laser: 3 heat each = 6
    // - 1x Clan UAC/5: 1 heat = 1
    // - 1x UAC/5 Ammo: 0 heat
    // Total: 27 heat

    it('should calculate correct heat for Marauder C loadout', () => {
      const marauderCEquipment: IMountedEquipmentInstance[] = [
        {
          instanceId: '1',
          equipmentId: 'clan-large-pulse-laser',
          name: 'Large Pulse Laser (Clan)',
          category: EquipmentCategory.ENERGY_WEAPON,
          weight: 6,
          criticalSlots: 2,
          heat: 10,
          techBase: TechBase.CLAN,
          location: MechLocation.LEFT_ARM,
          slots: [4, 5],
          isRearMounted: false,
          linkedAmmoId: undefined,
          isRemovable: true,
          isOmniPodMounted: false,
        },
        {
          instanceId: '2',
          equipmentId: 'medium-laser',
          name: 'Medium Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
          weight: 1,
          criticalSlots: 1,
          heat: 3,
          techBase: TechBase.INNER_SPHERE,
          location: MechLocation.LEFT_ARM,
          slots: [6],
          isRearMounted: false,
          linkedAmmoId: undefined,
          isRemovable: true,
          isOmniPodMounted: false,
        },
        {
          instanceId: '3',
          equipmentId: 'clan-large-pulse-laser',
          name: 'Large Pulse Laser (Clan)',
          category: EquipmentCategory.ENERGY_WEAPON,
          weight: 6,
          criticalSlots: 2,
          heat: 10,
          techBase: TechBase.CLAN,
          location: MechLocation.RIGHT_ARM,
          slots: [4, 5],
          isRearMounted: false,
          linkedAmmoId: undefined,
          isRemovable: true,
          isOmniPodMounted: false,
        },
        {
          instanceId: '4',
          equipmentId: 'medium-laser',
          name: 'Medium Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
          weight: 1,
          criticalSlots: 1,
          heat: 3,
          techBase: TechBase.INNER_SPHERE,
          location: MechLocation.RIGHT_ARM,
          slots: [6],
          isRearMounted: false,
          linkedAmmoId: undefined,
          isRemovable: true,
          isOmniPodMounted: false,
        },
        {
          instanceId: '5',
          equipmentId: 'clan-uac-5',
          name: 'Ultra AC/5 (Clan)',
          category: EquipmentCategory.BALLISTIC_WEAPON,
          weight: 7,
          criticalSlots: 3,
          heat: 1,
          techBase: TechBase.CLAN,
          location: MechLocation.RIGHT_TORSO,
          slots: [0, 1, 2],
          isRearMounted: false,
          linkedAmmoId: undefined,
          isRemovable: true,
          isOmniPodMounted: false,
        },
        {
          instanceId: '6',
          equipmentId: 'uac-5-ammo',
          name: 'Ultra AC/5 Ammo',
          category: EquipmentCategory.AMMUNITION,
          weight: 1,
          criticalSlots: 1,
          heat: 0, // Ammo doesn't generate heat
          techBase: TechBase.INNER_SPHERE,
          location: MechLocation.LEFT_TORSO,
          slots: [0],
          isRearMounted: false,
          linkedAmmoId: undefined,
          isRemovable: true,
          isOmniPodMounted: false,
        },
      ];

      const { result } = renderHook(() =>
        useEquipmentCalculations(marauderCEquipment),
      );

      // Total heat: 10 + 3 + 10 + 3 + 1 + 0 = 27
      expect(result.current.totalHeat).toBe(27);

      // Total weight: 6 + 1 + 6 + 1 + 7 + 1 = 22
      expect(result.current.totalWeight).toBe(22);

      // Total slots: 2 + 1 + 2 + 1 + 3 + 1 = 10
      expect(result.current.totalSlots).toBe(10);

      // Item count: 6
      expect(result.current.itemCount).toBe(6);
    });
  });

  describe('Category Breakdowns', () => {
    it('sums category critical-slot counts and keeps empty categories at zero', () => {
      const equipment = [
        createMockEquipment({ instanceId: 'energy-a', criticalSlots: 2 }),
        createMockEquipment({ instanceId: 'energy-b', criticalSlots: 3 }),
        createMockEquipment({
          instanceId: 'ballistic',
          category: EquipmentCategory.BALLISTIC_WEAPON,
          criticalSlots: 4,
        }),
      ];
      const { result } = renderHook(() => useEquipmentCalculations(equipment));
      const dump = {
        energyCriticalSlots:
          result.current.byCategory[EquipmentCategory.ENERGY_WEAPON]
            .criticalSlots,
        ballisticCriticalSlots:
          result.current.byCategory[EquipmentCategory.BALLISTIC_WEAPON]
            .criticalSlots,
        emptyCriticalSlots:
          result.current.byCategory[EquipmentCategory.AMMUNITION].criticalSlots,
        totalSlots: result.current.totalSlots,
      };
      expect(dump).toEqual({
        energyCriticalSlots: 5,
        ballisticCriticalSlots: 4,
        emptyCriticalSlots: 0,
        totalSlots: 9,
      });
      if (process.env.TERMINOLOGY_NUMERIC_DUMP === '1') {
        console.info('CATEGORY_NUMERIC_DUMP ' + JSON.stringify(dump));
      }
    });
    it('should group equipment by category', () => {
      const equipment: IMountedEquipmentInstance[] = [
        createMockEquipment({
          instanceId: '1',
          category: EquipmentCategory.ENERGY_WEAPON,
          heat: 10,
          weight: 6,
        }),
        createMockEquipment({
          instanceId: '2',
          category: EquipmentCategory.ENERGY_WEAPON,
          heat: 3,
          weight: 1,
        }),
        createMockEquipment({
          instanceId: '3',
          category: EquipmentCategory.BALLISTIC_WEAPON,
          heat: 1,
          weight: 7,
        }),
        createMockEquipment({
          instanceId: '4',
          category: EquipmentCategory.AMMUNITION,
          heat: 0,
          weight: 1,
        }),
      ];

      const { result } = renderHook(() => useEquipmentCalculations(equipment));

      // Energy: 2 items, 13 heat, 7 weight
      expect(
        result.current.byCategory[EquipmentCategory.ENERGY_WEAPON].count,
      ).toBe(2);
      expect(
        result.current.byCategory[EquipmentCategory.ENERGY_WEAPON].heat,
      ).toBe(13);
      expect(
        result.current.byCategory[EquipmentCategory.ENERGY_WEAPON].weight,
      ).toBe(7);

      // Ballistic: 1 item, 1 heat, 7 weight
      expect(
        result.current.byCategory[EquipmentCategory.BALLISTIC_WEAPON].count,
      ).toBe(1);
      expect(
        result.current.byCategory[EquipmentCategory.BALLISTIC_WEAPON].heat,
      ).toBe(1);
      expect(
        result.current.byCategory[EquipmentCategory.BALLISTIC_WEAPON].weight,
      ).toBe(7);

      // Ammunition: 1 item, 0 heat, 1 weight
      expect(
        result.current.byCategory[EquipmentCategory.AMMUNITION].count,
      ).toBe(1);
      expect(result.current.byCategory[EquipmentCategory.AMMUNITION].heat).toBe(
        0,
      );
      expect(
        result.current.byCategory[EquipmentCategory.AMMUNITION].weight,
      ).toBe(1);
    });
  });

  describe('Allocated vs Unallocated', () => {
    it('should separate allocated and unallocated equipment', () => {
      const equipment: IMountedEquipmentInstance[] = [
        createMockEquipment({
          instanceId: '1',
          location: MechLocation.LEFT_ARM,
        }),
        createMockEquipment({
          instanceId: '2',
          location: MechLocation.RIGHT_ARM,
        }),
        createMockEquipment({ instanceId: '3', location: undefined }),
        createMockEquipment({ instanceId: '4', location: undefined }),
        createMockEquipment({ instanceId: '5', location: undefined }),
      ];

      const { result } = renderHook(() => useEquipmentCalculations(equipment));

      expect(result.current.allocatedCount).toBe(2);
      expect(result.current.unallocatedCount).toBe(3);
      expect(result.current.allocatedEquipment.length).toBe(2);
      expect(result.current.unallocatedEquipment.length).toBe(3);
    });
  });
});
