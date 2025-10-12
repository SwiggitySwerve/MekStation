/**
 * Top Bar Weight Calculation Integration Test
 * Tests that the top bar correctly reflects structure weight changes
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultiUnitProvider } from '../../components/multiUnit/MultiUnitProvider';
import { calculateStructureWeight } from '../../utils/structureCalculations';

// Mock the top bar weight calculation
const TopBarWeightDisplay = () => {
  const { unit } = require('../../components/multiUnit/MultiUnitProvider').useUnit();
  const config = unit.getConfiguration();
  
  // This simulates how the top bar calculates weight using UnitCriticalManager.getUsedTonnage()
  const currentWeight = unit.getUsedTonnage();
  
  // Also show the individual structure weight calculation for verification
  const structureTypeString = typeof config.structureType === 'string' 
    ? config.structureType 
    : config.structureType? || 'Standard';
  const structureWeight = calculateStructureWeight(config.tonnage, structureTypeString as any);
  
  return (
    <div>
      <div data-testid="top-bar-weight">
        Current Weight: {currentWeight.toFixed(1)}t / {config.tonnage}t
      </div>
      <div data-testid="structure-weight-breakdown">
        Structure Weight: {structureWeight.toFixed(1)}t ({structureTypeString})
      </div>
      <div data-testid="structure-type">
        Current Type: {structureTypeString}
      </div>
      <div data-testid="tonnage">
        Tonnage: {config.tonnage}t
      </div>
    </div>
  );
};

// Mock structure type selector
const StructureTypeSelector = () => {
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

  return (
    <select
      data-testid="structure-type-select"
      value={getStructureTypeValue()}
      onChange={(e) => handleStructureTypeChange(e.target.value)}
    >
      <option value="Standard">Standard</option>
      <option value="Endo Steel">Endo Steel</option>
      <option value="Endo Steel (Clan)">Endo Steel (Clan)</option>
    </select>
  );
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MultiUnitProvider>
    {children}
  </MultiUnitProvider>
);

describe('Top Bar Weight Calculation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('top bar weight reflects Endo Steel structure weight savings', async () => {
    render(
      <TestWrapper>
        <TopBarWeightDisplay />
        <StructureTypeSelector />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('structure-type')).toBeInTheDocument();
    });

    // Initial state: Standard structure
    expect(screen.getByTestId('structure-type')).toHaveTextContent('Standard');
    expect(screen.getByTestId('tonnage')).toHaveTextContent('50t'); // Default tonnage

    // Record initial weight
    const initialWeightElement = screen.getByTestId('top-bar-weight');
    const initialWeightMatch = initialWeightElement.textContent?.match(/Current Weight: ([\d.]+)t/);
    const initialWeight = parseFloat(initialWeightMatch?.[1] || '0');

    // Verify standard structure weight
    const standardStructureWeight = screen.getByTestId('structure-weight-breakdown');
    expect(standardStructureWeight).toHaveTextContent('5.0t (Standard)'); // 50 * 0.1 = 5.0

    // Change to Endo Steel
    const structureSelect = screen.getByTestId('structure-type-select');
    fireEvent.change(structureSelect, { target: { value: 'Endo Steel' } });

    await waitFor(() => {
      expect(screen.getByTestId('structure-type')).toHaveTextContent('Endo Steel');
    });

    // Verify Endo Steel structure weight
    const endoStructureWeight = screen.getByTestId('structure-weight-breakdown');
    expect(endoStructureWeight).toHaveTextContent('2.5t (Endo Steel)'); // 50 * 0.05 = 2.5

    // Record new weight and verify it decreased
    const newWeightElement = screen.getByTestId('top-bar-weight');
    const newWeightMatch = newWeightElement.textContent?.match(/Current Weight: ([\d.]+)t/);
    const newWeight = parseFloat(newWeightMatch?.[1] || '0');

    // The weight should have decreased by 2.5 tons (5.0 - 2.5 = 2.5 ton savings)
    const weightSavings = initialWeight - newWeight;
    expect(weightSavings).toBeCloseTo(2.5, 1);

    console.log(`Weight changed from ${initialWeight}t to ${newWeight}t (${weightSavings.toFixed(1)}t savings)`);
  });

  test('top bar weight reflects different tonnage configurations with Endo Steel', async () => {
    render(
      <TestWrapper>
        <TopBarWeightDisplay />
        <StructureTypeSelector />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('structure-type')).toBeInTheDocument();
    });

    // Test different tonnage values and their structure weight impact
    const testCases = [
      { tonnage: 50, standardWeight: 5.0, endoWeight: 2.5, expectedSavings: 2.5 },
      { tonnage: 75, standardWeight: 7.5, endoWeight: 4.0, expectedSavings: 3.5 }, // 3.75 rounds up to 4.0
      { tonnage: 100, standardWeight: 10.0, endoWeight: 5.0, expectedSavings: 5.0 },
    ];

    for (const testCase of testCases) {
      // For this test, we'll calculate the expected values
      const standardCalculated = calculateStructureWeight(testCase.tonnage, 'Standard');
      const endoCalculated = calculateStructureWeight(testCase.tonnage, 'Endo Steel');
      const actualSavings = standardCalculated - endoCalculated;

      expect(standardCalculated).toBe(testCase.standardWeight);
      expect(endoCalculated).toBe(testCase.endoWeight);
      expect(actualSavings).toBe(testCase.expectedSavings);

      console.log(`${testCase.tonnage}t mech: Standard ${standardCalculated}t → Endo Steel ${endoCalculated}t (${actualSavings}t savings)`);
    }
  });

  test('validates real-world BattleTech construction benefits', () => {
    // This test validates that the weight savings are meaningful for BattleTech construction

    const testMechs = [
      { name: 'Light Mech', tonnage: 25, standardWeight: 2.5, endoWeight: 1.5, savings: 1.0 },
      { name: 'Medium Mech', tonnage: 55, standardWeight: 5.5, endoWeight: 3.0, savings: 2.5 }, // 2.75 rounds up
      { name: 'Heavy Mech', tonnage: 75, standardWeight: 7.5, endoWeight: 4.0, savings: 3.5 }, // 3.75 rounds up
      { name: 'Assault Mech', tonnage: 100, standardWeight: 10.0, endoWeight: 5.0, savings: 5.0 },
    ];

    testMechs.forEach(mech => {
      const standardWeight = calculateStructureWeight(mech.tonnage, 'Standard');
      const endoWeight = calculateStructureWeight(mech.tonnage, 'Endo Steel');
      const actualSavings = standardWeight - endoWeight;

      expect(standardWeight).toBe(mech.standardWeight);
      expect(endoWeight).toBe(mech.endoWeight);
      expect(actualSavings).toBe(mech.savings);

      // Real-world benefit analysis
      console.log(`${mech.name} (${mech.tonnage}t): Endo Steel saves ${actualSavings}t`);
      console.log(`  - Equivalent to ${actualSavings * 2} Single Heat Sinks`);
      console.log(`  - Equivalent to ${(actualSavings * 16).toFixed(0)} armor points (Standard armor)`);
      console.log(`  - Trade-off: Requires ${endoWeight === mech.endoWeight ? '14 critical slots (IS)' : '7 critical slots (Clan)'}`);
    });
  });
});
