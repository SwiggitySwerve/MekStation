/* eslint-disable no-restricted-syntax */
import { renderHook } from '@testing-library/react';
import { useEquipmentValidation } from '../useEquipmentValidation';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

// Mock the unit store
jest.mock('@/stores/useUnitStore');

describe('useEquipmentValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build slot usage for all locations', () => {
    const mockEquipment = [
      { location: MechLocation.RIGHT_ARM, slots: [0, 1, 2] },
      { location: MechLocation.RIGHT_TORSO, slots: [0, 1] },
      { location: MechLocation.LEFT_TORSO, slots: [5, 6, 7, 8] },
    ];

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        equipment: mockEquipment,
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useEquipmentValidation());

    expect(result.current.slotsByLocation[MechLocation.RIGHT_ARM]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.RIGHT_ARM].used).toBe(3);

    expect(result.current.slotsByLocation[MechLocation.RIGHT_TORSO]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.RIGHT_TORSO].used).toBe(2);

    expect(result.current.slotsByLocation[MechLocation.LEFT_TORSO]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.LEFT_TORSO].used).toBe(4);
  });

  it('should handle empty equipment list', () => {
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        equipment: [],
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useEquipmentValidation());

    // All locations should have 0 used slots
    Object.values(result.current.slotsByLocation).forEach((location) => {
      expect(location.used).toBe(0);
    });
  });

  it('should provide max slots for each location', () => {
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        equipment: [],
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useEquipmentValidation());

    // Head should have 6 slots
    expect(result.current.slotsByLocation[MechLocation.HEAD]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.HEAD].max).toBe(6);

    // Center Torso should have 12 slots
    expect(result.current.slotsByLocation[MechLocation.CENTER_TORSO]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.CENTER_TORSO].max).toBe(12);

    // Arms should have 12 slots
    expect(result.current.slotsByLocation[MechLocation.LEFT_ARM]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.LEFT_ARM].max).toBe(12);
  });

  it('should handle quad configuration locations', () => {
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        equipment: [],
        configuration: MechConfiguration.QUAD,
      })
    );

    const { result } = renderHook(() => useEquipmentValidation());

    // Quad should have leg locations instead of arms
    expect(result.current.slotsByLocation[MechLocation.FRONT_LEFT_LEG]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.FRONT_RIGHT_LEG]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.REAR_LEFT_LEG]).toBeDefined();
    expect(result.current.slotsByLocation[MechLocation.REAR_RIGHT_LEG]).toBeDefined();
  });

  it('should count multiple equipment in same location', () => {
    const mockEquipment = [
      { location: MechLocation.RIGHT_ARM, slots: [0, 1] },
      { location: MechLocation.RIGHT_ARM, slots: [2, 3, 4] },
      { location: MechLocation.RIGHT_ARM, slots: [5] },
    ];

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        equipment: mockEquipment,
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useEquipmentValidation());

    // Should sum all slots: 2 + 3 + 1 = 6
    expect(result.current.slotsByLocation[MechLocation.RIGHT_ARM].used).toBe(6);
  });

  it('should ignore unallocated equipment', () => {
    const mockEquipment = [
      { location: MechLocation.RIGHT_ARM, slots: [0, 1] },
      { location: undefined, slots: undefined }, // Unallocated
      { location: MechLocation.LEFT_TORSO, slots: [] }, // No slots
    ];

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        equipment: mockEquipment,
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useEquipmentValidation());

    expect(result.current.slotsByLocation[MechLocation.RIGHT_ARM].used).toBe(2);
    expect(result.current.slotsByLocation[MechLocation.LEFT_TORSO].used).toBe(0);
  });
});
