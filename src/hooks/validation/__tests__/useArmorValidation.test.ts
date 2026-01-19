/* eslint-disable no-restricted-syntax */
import { renderHook } from '@testing-library/react';
import { useArmorValidation } from '../useArmorValidation';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

// Mock the unit store
jest.mock('@/stores/useUnitStore');

describe('useArmorValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate total armor points for biped', () => {
    const mockAllocation = {
      [MechLocation.HEAD]: 9,
      [MechLocation.CENTER_TORSO]: 20,
      centerTorsoRear: 10,
      [MechLocation.LEFT_TORSO]: 15,
      leftTorsoRear: 8,
      [MechLocation.RIGHT_TORSO]: 15,
      rightTorsoRear: 8,
      [MechLocation.LEFT_ARM]: 12,
      [MechLocation.RIGHT_ARM]: 12,
      [MechLocation.LEFT_LEG]: 18,
      [MechLocation.RIGHT_LEG]: 18,
      [MechLocation.CENTER_LEG]: 0,
      [MechLocation.FRONT_LEFT_LEG]: 0,
      [MechLocation.FRONT_RIGHT_LEG]: 0,
      [MechLocation.REAR_LEFT_LEG]: 0,
      [MechLocation.REAR_RIGHT_LEG]: 0,
    };

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 50,
        armorAllocation: mockAllocation,
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useArmorValidation());

    const expectedTotal = 9 + 20 + 10 + 15 + 8 + 15 + 8 + 12 + 12 + 18 + 18;
    expect(result.current.totalArmorPoints).toBe(expectedTotal);
    expect(result.current.maxArmorPoints).toBeGreaterThan(0);
    expect(result.current.armorByLocation).toBeDefined();
  });

  it('should build per-location armor data with correct max values', () => {
    const mockAllocation = {
      [MechLocation.HEAD]: 9,
      [MechLocation.CENTER_TORSO]: 25,
      centerTorsoRear: 8,
      [MechLocation.LEFT_TORSO]: 20,
      leftTorsoRear: 6,
      [MechLocation.RIGHT_TORSO]: 20,
      rightTorsoRear: 6,
      [MechLocation.LEFT_ARM]: 16,
      [MechLocation.RIGHT_ARM]: 16,
      [MechLocation.LEFT_LEG]: 20,
      [MechLocation.RIGHT_LEG]: 20,
      [MechLocation.CENTER_LEG]: 0,
      [MechLocation.FRONT_LEFT_LEG]: 0,
      [MechLocation.FRONT_RIGHT_LEG]: 0,
      [MechLocation.REAR_LEFT_LEG]: 0,
      [MechLocation.REAR_RIGHT_LEG]: 0,
    };

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 50,
        armorAllocation: mockAllocation,
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useArmorValidation());

    // Head should have max 9
    expect(result.current.armorByLocation.head).toBeDefined();
    expect(result.current.armorByLocation.head.current).toBe(9);
    expect(result.current.armorByLocation.head.max).toBe(9);

    // All locations should have entries
    expect(result.current.armorByLocation.centerTorso).toBeDefined();
    expect(result.current.armorByLocation.leftArm).toBeDefined();
    expect(result.current.armorByLocation.leftLeg).toBeDefined();
  });

  it('should handle quad configuration', () => {
    const mockAllocation = {
      [MechLocation.HEAD]: 9,
      [MechLocation.CENTER_TORSO]: 20,
      centerTorsoRear: 10,
      [MechLocation.LEFT_TORSO]: 15,
      leftTorsoRear: 8,
      [MechLocation.RIGHT_TORSO]: 15,
      rightTorsoRear: 8,
      [MechLocation.LEFT_ARM]: 0,
      [MechLocation.RIGHT_ARM]: 0,
      [MechLocation.LEFT_LEG]: 0,
      [MechLocation.RIGHT_LEG]: 0,
      [MechLocation.CENTER_LEG]: 0,
      [MechLocation.FRONT_LEFT_LEG]: 15,
      [MechLocation.FRONT_RIGHT_LEG]: 15,
      [MechLocation.REAR_LEFT_LEG]: 15,
      [MechLocation.REAR_RIGHT_LEG]: 15,
    };

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 50,
        armorAllocation: mockAllocation,
        configuration: MechConfiguration.QUAD,
      })
    );

    const { result } = renderHook(() => useArmorValidation());

    // Should have quad leg locations
    expect(result.current.armorByLocation.frontLeftLeg).toBeDefined();
    expect(result.current.armorByLocation.frontRightLeg).toBeDefined();
    expect(result.current.armorByLocation.rearLeftLeg).toBeDefined();
    expect(result.current.armorByLocation.rearRightLeg).toBeDefined();
  });

  it('should use default tonnage if missing', () => {
    const mockAllocation = {
      [MechLocation.HEAD]: 9,
      [MechLocation.CENTER_TORSO]: 10,
      centerTorsoRear: 5,
      [MechLocation.LEFT_TORSO]: 8,
      leftTorsoRear: 4,
      [MechLocation.RIGHT_TORSO]: 8,
      rightTorsoRear: 4,
      [MechLocation.LEFT_ARM]: 6,
      [MechLocation.RIGHT_ARM]: 6,
      [MechLocation.LEFT_LEG]: 8,
      [MechLocation.RIGHT_LEG]: 8,
      [MechLocation.CENTER_LEG]: 0,
      [MechLocation.FRONT_LEFT_LEG]: 0,
      [MechLocation.FRONT_RIGHT_LEG]: 0,
      [MechLocation.REAR_LEFT_LEG]: 0,
      [MechLocation.REAR_RIGHT_LEG]: 0,
    };

    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 0,
        armorAllocation: mockAllocation,
        configuration: MechConfiguration.BIPED,
      })
    );

    const { result } = renderHook(() => useArmorValidation());

    // Should calculate max armor based on default 20-ton mech
    expect(result.current.maxArmorPoints).toBeGreaterThan(0);
  });
});
