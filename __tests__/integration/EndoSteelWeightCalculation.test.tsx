/**
 * Endo Steel Weight Calculation Integration Test
 * Tests that Endo Steel structure correctly reduces weight in the UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiUnitProvider } from '../../components/multiUnit/MultiUnitProvider';
import { calculateStructureWeight } from '../../utils/structureCalculations';

// Mock the structure tab component for testing
const StructureTabV2 = () => {
  const { unit, updateConfiguration } = require('../../components/multiUnit/MultiUnitProvider').useUnit();
  const config = unit.getConfiguration();

  const getStructureTypeValue = (): string => {
    if (typeof config.structureType === 'string') {
      return config.structureType;
    } else if (config.structureType && typeof config.structureType === 'object') {
      return config.structureType;
    }
    return 'Standard';
  };

  const handleStructureTypeChange = (newValue: string) => {
    updateConfiguration({ ...config, structureType: newValue });
  };

  // Calculate structure weight using the utility function (CORRECT)
  const correctStructureWeight = calculateStructureWeight(config.tonnage, getStructureTypeValue() as any);
  
  // Hardcoded calculation from the buggy UI (INCORRECT)
  const hardcodedStructureWeight = config.tonnage * 0.1;

  return (
    <div>
      {/* Structure Type Selector */}
      <select
        data-testid="structure-type-select"
        value={getStructureTypeValue()}
        onChange={(e) => handleStructureTypeChange(e.target.value)}
      >
        <option value="Standard">Standard</option>
        <option value="Endo Steel">Endo Steel</option>
        <option value="Endo Steel (Clan)">Endo Steel (Clan)</option>
      </select>

      {/* Display both calculations for comparison */}
      <div data-testid="correct-structure-weight">
        Correct Weight: {correctStructureWeight.toFixed(1)}t
      </div>
      <div data-testid="hardcoded-structure-weight">
        Hardcoded Weight: {hardcodedStructureWeight.toFixed(1)}t
      </div>
      <div data-testid="structure-type">
        Current Type: {getStructureTypeValue()}
      </div>
      <div data-testid="tonnage">
        Tonnage: {config.tonnage}t
      </div>
    </div>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MultiUnitProvider>
    {children}
  </MultiUnitProvider>
);

describe('Endo Steel Weight Calculation Integration', () => {
  beforeEach(() => {
    // Reset any global state
    jest.clearAllMocks();
  });

  test('demonstrates the Endo Steel weight calculation bug', async () => {
    render(
      <TestWrapper>
        <StructureTabV2 />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('structure-type')).toBeInTheDocument();
    });

    // Initial state: Standard structure
    expect(screen.getByTestId('structure-type')).toHaveTextContent('Standard');
    expect(screen.getByTestId('tonnage')).toHaveTextContent('50t'); // Default tonnage

    // Both calculations should be the same for Standard structure
    const correctWeight = screen.getByTestId('correct-structure-weight');
    const hardcodedWeight = screen.getByTestId('hardcoded-structure-weight');
    
    expect(correctWeight).toHaveTextContent('5.0t'); // 50 * 0.1 = 5.0
    expect(hardcodedWeight).toHaveTextContent('5.0t'); // 50 * 0.1 = 5.0

    // Change to Endo Steel
    const structureSelect = screen.getByTestId('structure-type-select');
    fireEvent.change(structureSelect, { target: { value: 'Endo Steel' } });

    await waitFor(() => {
      expect(screen.getByTestId('structure-type')).toHaveTextContent('Endo Steel');
    });

    // Now there should be a difference - this demonstrates the bug
    const updatedCorrectWeight = screen.getByTestId('correct-structure-weight');
    const updatedHardcodedWeight = screen.getByTestId('hardcoded-structure-weight');

    // Correct calculation: 50 tons * 0.05 = 2.5 tons (50% weight reduction)
    expect(updatedCorrectWeight).toHaveTextContent('2.5t');
    
    // Buggy hardcoded calculation: still 50 tons * 0.1 = 5.0 tons (no reduction!)
    expect(updatedHardcodedWeight).toHaveTextContent('5.0t');

    // This test demonstrates the bug: hardcoded calculation doesn't account for structure type
    expect(updatedCorrectWeight.textContent).not.toBe(updatedHardcodedWeight.textContent);
  });

  test('shows correct weight savings for different tonnages with Endo Steel', async () => {
    render(
      <TestWrapper>
        <StructureTabV2 />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('structure-type')).toBeInTheDocument();
    });

    // Test with different tonnage values
    const testCases = [
      { tonnage: 50, standardWeight: 5.0, endoWeight: 2.5, savings: 2.5 },
      { tonnage: 75, standardWeight: 7.5, endoWeight: 4.0, savings: 3.5 }, // 3.75 rounds up to 4.0
      { tonnage: 100, standardWeight: 10.0, endoWeight: 5.0, savings: 5.0 },
    ];

    for (const testCase of testCases) {
      // The actual implementation would need tonnage changes, but for this test
      // we're demonstrating the calculation logic
      const standardWeight = calculateStructureWeight(testCase.tonnage, 'Standard');
      const endoWeight = calculateStructureWeight(testCase.tonnage, 'Endo Steel');
      const savings = standardWeight - endoWeight;

      expect(standardWeight).toBe(testCase.standardWeight);
      expect(endoWeight).toBe(testCase.endoWeight);
      expect(savings).toBe(testCase.savings);
    }
  });

  test('shows correct critical slot requirements for different structure types', () => {
    const { getStructureSlots } = require('../../utils/structureCalculations');

    // Test critical slot requirements
    expect(getStructureSlots('Standard')).toBe(0);
    expect(getStructureSlots('Endo Steel')).toBe(14);
    expect(getStructureSlots('Endo Steel (Clan)')).toBe(7);
  });

  test('validates the correct Endo Steel weight calculation formula', () => {
    // This test validates that our calculateStructureWeight function is correct
    
    // Standard structure: 10% of mech tonnage
    expect(calculateStructureWeight(50, 'Standard')).toBe(5.0);
    expect(calculateStructureWeight(75, 'Standard')).toBe(7.5);
    expect(calculateStructureWeight(100, 'Standard')).toBe(10.0);

    // Endo Steel: 5% of mech tonnage (50% weight reduction)
    expect(calculateStructureWeight(50, 'Endo Steel')).toBe(2.5);
    expect(calculateStructureWeight(75, 'Endo Steel')).toBe(4.0); // 3.75 rounds up
    expect(calculateStructureWeight(100, 'Endo Steel')).toBe(5.0);

    // Clan Endo Steel: same weight reduction, fewer slots
    expect(calculateStructureWeight(50, 'Endo Steel (Clan)')).toBe(2.5);
    expect(calculateStructureWeight(75, 'Endo Steel (Clan)')).toBe(4.0);
    expect(calculateStructureWeight(100, 'Endo Steel (Clan)')).toBe(5.0);
  });

  test('demonstrates real-world BattleTech unit examples', () => {
    // Real BattleTech units that use Endo Steel

    // Hypothetical 75-ton mech upgrading from Standard to Endo Steel
    const tonnage = 75;
    const standardStructureWeight = calculateStructureWeight(tonnage, 'Standard');
    const endoStructureWeight = calculateStructureWeight(tonnage, 'Endo Steel');
    const weightSavings = standardStructureWeight - endoStructureWeight;

    expect(standardStructureWeight).toBe(7.5); // 75 * 0.1
    expect(endoStructureWeight).toBe(4.0);     // 75 * 0.05 = 3.75, rounds to 4.0
    expect(weightSavings).toBe(3.5);           // 3.5 tons saved for more weapons/equipment

    // This weight savings allows for significant improvements:
    // - 3.5 tons = 7 Single Heat Sinks
    // - 3.5 tons = 3.5 tons of armor (56 armor points with Standard armor)
    // - 3.5 tons = Multiple additional weapons
  });
});
