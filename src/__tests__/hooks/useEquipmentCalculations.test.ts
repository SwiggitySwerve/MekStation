/**
 * useEquipmentCalculations Hook Tests
 *
 * Tests for equipment weight, slots, and heat calculations.
 */

import { renderHook } from '@testing-library/react';

import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { useEquipmentCalculations } from '@/hooks/useEquipmentCalculations';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

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
