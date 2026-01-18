/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, no-restricted-syntax */
import { renderHook } from '@testing-library/react';
import { useWeightValidation } from '../useWeightValidation';
import { useUnitStore } from '@/stores/useUnitStore';

// Mock the unit store
jest.mock('@/stores/useUnitStore');

describe('useWeightValidation', () => {
  beforeEach(() => {
    // Reset mock
    jest.clearAllMocks();
  });

  it('should calculate structural and equipment weight correctly', () => {
    // Mock store values for a 50-ton mech
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 50,
        engineType: 'Standard',
        engineRating: 200,
        gyroType: 'Standard',
        internalStructureType: 'Standard',
        cockpitType: 'Standard',
        heatSinkType: 'Single',
        heatSinkCount: 10,
        armorTonnage: 8,
        equipment: [],
      })
    );

    const { result } = renderHook(() => useWeightValidation());

    expect(result.current.maxWeight).toBe(50);
    expect(result.current.structuralWeight).toBeGreaterThan(0);
    expect(result.current.equipmentWeight).toBe(0); // No equipment
    expect(result.current.allocatedWeight).toBe(result.current.structuralWeight);
    expect(result.current.remainingWeight).toBeGreaterThan(0);
    expect(result.current.isValid).toBe(true);
  });

  it('should detect weight overflow', () => {
    // Mock store with excessive weight
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 20,
        engineType: 'XL',
        engineRating: 400,
        gyroType: 'Heavy-Duty',
        internalStructureType: 'Standard',
        cockpitType: 'Standard',
        heatSinkType: 'Double',
        heatSinkCount: 20,
        armorTonnage: 10,
        equipment: [
          { weight: 5 },
          { weight: 10 },
        ],
      })
    );

    const { result } = renderHook(() => useWeightValidation());

    expect(result.current.maxWeight).toBe(20);
    expect(result.current.allocatedWeight).toBeGreaterThan(20);
    expect(result.current.remainingWeight).toBeLessThan(0);
    expect(result.current.isValid).toBe(false);
  });

  it('should handle missing tonnage with default value', () => {
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 0,
        engineType: 'Standard',
        engineRating: 100,
        gyroType: 'Standard',
        internalStructureType: 'Standard',
        cockpitType: 'Standard',
        heatSinkType: 'Single',
        heatSinkCount: 10,
        armorTonnage: 2,
        equipment: [],
      })
    );

    const { result } = renderHook(() => useWeightValidation());

    // Should default to 20 tons
    expect(result.current.maxWeight).toBe(20);
  });

  it('should calculate equipment weight from equipment array', () => {
    (useUnitStore as unknown as jest.Mock).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tonnage: 50,
        engineType: 'Standard',
        engineRating: 200,
        gyroType: 'Standard',
        internalStructureType: 'Standard',
        cockpitType: 'Standard',
        heatSinkType: 'Single',
        heatSinkCount: 10,
        armorTonnage: 5,
        equipment: [
          { weight: 2 },
          { weight: 3 },
          { weight: 1.5 },
        ],
      })
    );

    const { result } = renderHook(() => useWeightValidation());

    expect(result.current.equipmentWeight).toBe(6.5);
    expect(result.current.allocatedWeight).toBe(result.current.structuralWeight + 6.5);
  });
});
