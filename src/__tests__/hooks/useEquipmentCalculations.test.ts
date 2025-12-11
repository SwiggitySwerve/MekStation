import { renderHook } from '@testing-library/react';
import { useEquipmentCalculations, useRemainingCapacity } from '@/hooks/useEquipmentCalculations';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { EquipmentCategory } from '@/types/equipment';
import { MechLocation } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';

describe('useEquipmentCalculations', () => {
  const createEquipment = (
    id: string,
    weight: number,
    slots: number,
    heat: number,
    category: EquipmentCategory,
    location?: MechLocation
  ): IMountedEquipmentInstance => ({
    equipmentId: id,
    name: id,
    weight,
    criticalSlots: slots,
    heat,
    category,
    location,
    instanceId: id,
    techBase: TechBase.INNER_SPHERE,
    isRearMounted: false,
    isRemovable: true,
  });

  it('should calculate totals for empty equipment', () => {
    const { result } = renderHook(() => useEquipmentCalculations([]));

    expect(result.current.totalWeight).toBe(0);
    expect(result.current.totalSlots).toBe(0);
    expect(result.current.totalHeat).toBe(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.allocatedCount).toBe(0);
    expect(result.current.unallocatedCount).toBe(0);
  });

  it('should calculate totals for equipment', () => {
    const equipment = [
      createEquipment('laser1', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON),
      createEquipment('laser2', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON),
      createEquipment('ammo', 1, 1, 0, EquipmentCategory.AMMUNITION),
    ];

    const { result } = renderHook(() => useEquipmentCalculations(equipment));

    expect(result.current.totalWeight).toBe(3);
    expect(result.current.totalSlots).toBe(3);
    expect(result.current.totalHeat).toBe(6);
    expect(result.current.itemCount).toBe(3);
  });

  it('should separate allocated and unallocated equipment', () => {
    const equipment = [
      createEquipment('laser1', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON, MechLocation.LEFT_ARM),
      createEquipment('laser2', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON),
      createEquipment('ammo', 1, 1, 0, EquipmentCategory.AMMUNITION, MechLocation.LEFT_TORSO),
    ];

    const { result } = renderHook(() => useEquipmentCalculations(equipment));

    expect(result.current.allocatedCount).toBe(2);
    expect(result.current.unallocatedCount).toBe(1);
    expect(result.current.allocatedEquipment).toHaveLength(2);
    expect(result.current.unallocatedEquipment).toHaveLength(1);
  });

  it('should calculate per-category summaries', () => {
    const equipment = [
      createEquipment('laser1', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON),
      createEquipment('laser2', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON),
      createEquipment('ammo', 1, 1, 0, EquipmentCategory.AMMUNITION),
    ];

    const { result } = renderHook(() => useEquipmentCalculations(equipment));

    const energySummary = result.current.byCategory[EquipmentCategory.ENERGY_WEAPON];
    expect(energySummary.count).toBe(2);
    expect(energySummary.weight).toBe(2);
    expect(energySummary.slots).toBe(2);
    expect(energySummary.heat).toBe(6);

    const ammoSummary = result.current.byCategory[EquipmentCategory.AMMUNITION];
    expect(ammoSummary.count).toBe(1);
    expect(ammoSummary.weight).toBe(1);
    expect(ammoSummary.slots).toBe(1);
    expect(ammoSummary.heat).toBe(0);
  });

  it('should initialize empty summaries for unused categories', () => {
    const equipment = [
      createEquipment('laser1', 1, 1, 3, EquipmentCategory.ENERGY_WEAPON),
    ];

    const { result } = renderHook(() => useEquipmentCalculations(equipment));

    const ballisticSummary = result.current.byCategory[EquipmentCategory.BALLISTIC_WEAPON];
    expect(ballisticSummary.count).toBe(0);
    expect(ballisticSummary.weight).toBe(0);
    expect(ballisticSummary.slots).toBe(0);
    expect(ballisticSummary.heat).toBe(0);
  });
});

describe('useRemainingCapacity', () => {
  const createEquipment = (
    id: string,
    weight: number,
    slots: number
  ): IMountedEquipmentInstance => ({
    equipmentId: id,
    name: id,
    weight,
    criticalSlots: slots,
    heat: 0,
    category: EquipmentCategory.ENERGY_WEAPON,
    instanceId: id,
    techBase: TechBase.INNER_SPHERE,
    isRearMounted: false,
    isRemovable: true,
  });

  it('should calculate remaining capacity', () => {
    const equipment = [
      createEquipment('laser1', 1, 1),
      createEquipment('laser2', 1, 1),
    ];

    const { result } = renderHook(() =>
      useRemainingCapacity(100, 50, equipment)
    );

    expect(result.current.remainingWeight).toBe(48); // 100 - 50 - 2
    expect(result.current.remainingSlots).toBeGreaterThan(0);
  });

  it('should not return negative values', () => {
    const equipment = [
      createEquipment('laser1', 100, 100),
    ];

    const { result } = renderHook(() =>
      useRemainingCapacity(100, 50, equipment)
    );

    expect(result.current.remainingWeight).toBe(0);
    expect(result.current.remainingSlots).toBe(0);
  });

  it('should handle empty equipment', () => {
    const { result } = renderHook(() =>
      useRemainingCapacity(100, 50, [])
    );

    expect(result.current.remainingWeight).toBe(50);
    expect(result.current.remainingSlots).toBeGreaterThan(0);
  });
});

