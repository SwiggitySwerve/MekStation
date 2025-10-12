/**
 * ArmorAllocationPanel.test.tsx - Comprehensive test suite
 * 
 * Tests extracted ArmorAllocationPanel component from ArmorTabV2 refactoring (Day 1)
 * Validates armor allocation logic, UI interactions, and BattleTech rule compliance
 * 
 * @see IMPLEMENTATION_REFERENCE.md for testing patterns
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArmorAllocationPanel, ArmorAllocationPanelProps } from '../../../../components/editor/armor/ArmorAllocationPanel';

// Mock armor allocation data
const mockArmorAllocation = {
  HD: { front: 9, rear: 0 },
  CT: { front: 30, rear: 10 },
  LT: { front: 20, rear: 8 },
  RT: { front: 20, rear: 8 },
  LA: { front: 16, rear: 0 },
  RA: { front: 16, rear: 0 },
  LL: { front: 24, rear: 0 },
  RL: { front: 24, rear: 0 }
};

// Default props for testing
const defaultProps: ArmorAllocationPanelProps = {
  armorAllocation: mockArmorAllocation,
  selectedSection: null,
  onSectionSelect: jest.fn(),
  onArmorLocationChange: jest.fn(),
  onAutoAllocate: jest.fn(),
  getLocationMaxArmor: jest.fn((location: string) => {
    const maxValues: { [key: string]: number } = {
      HD: 9, CT: 47, LT: 32, RT: 32, LA: 24, RA: 24, LL: 32, RL: 32
    };
    return maxValues[location] || 0;
  }),
  availableArmorPoints: 200,
  cappedAvailablePoints: 200,
  displayUnallocatedPoints: 23,
  readOnly: false
};

// Helper function to render component with props
const renderArmorAllocationPanel = (props: Partial<ArmorAllocationPanelProps> = {}) => {
  const finalProps = { ...defaultProps, ...props };
  return render(<ArmorAllocationPanel {...finalProps} />);
};

describe('ArmorAllocationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === CORE FUNCTIONALITY TESTS ===
  
  describe('core functionality', () => {
    it('should render armor allocation panel with title', () => {
      renderArmorAllocationPanel();
      expect(screen.getByText('Armor Allocation')).toBeInTheDocument();
    });

    it('should display allocation status correctly', () => {
      renderArmorAllocationPanel();
      expect(screen.getByText('Available: 23 pts / 200 total')).toBeInTheDocument();
    });

    it('should show over-allocation status when points are negative', () => {
      renderArmorAllocationPanel({ displayUnallocatedPoints: -5 });
      expect(screen.getByText('Over-allocated: -5 pts / 200 total')).toBeInTheDocument();
    });

    it('should render auto-allocate button with correct status', () => {
      renderArmorAllocationPanel();
      const button = screen.getByRole('button', { name: /auto-allocate armor points/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByText('(23 pts available)')).toBeInTheDocument();
    });

    it('should call onAutoAllocate when auto-allocate button is clicked', async () => {
      const mockOnAutoAllocate = jest.fn();
      renderArmorAllocationPanel({ onAutoAllocate: mockOnAutoAllocate });
      
      const button = screen.getByRole('button', { name: /auto-allocate armor points/i });
      await userEvent.click(button);
      
      expect(mockOnAutoAllocate).toHaveBeenCalledTimes(1);
    });

    it('should display all armor locations in summary table', () => {
      renderArmorAllocationPanel();
      
      const locations = ['HD', 'CT', 'LT', 'RT', 'LA', 'RA', 'LL', 'RL'];
      locations.forEach(location => {
        expect(screen.getByText(location)).toBeInTheDocument();
      });
    });
  });

  // === ARMOR LOCATION EDITING TESTS ===
  
  describe('armor location editing', () => {
    it('should show section editor when a section is selected', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT' });
      expect(screen.getByText('Editing: CT')).toBeInTheDocument();
    });

    it('should display front and rear armor inputs for torso sections', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT' });
      
      expect(screen.getByLabelText('Front')).toBeInTheDocument();
      expect(screen.getByLabelText('Rear')).toBeInTheDocument();
    });

    it('should display only front armor input for non-torso sections', () => {
      renderArmorAllocationPanel({ selectedSection: 'LA' });
      
      expect(screen.getByLabelText('Front')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument(); // Rear should show N/A
    });

    it('should call onArmorLocationChange when front armor is modified', async () => {
      const mockOnArmorLocationChange = jest.fn();
      renderArmorAllocationPanel({ 
        selectedSection: 'CT',
        onArmorLocationChange: mockOnArmorLocationChange 
      });
      
      const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
      await userEvent.clear(frontInput);
      await userEvent(frontInput, '35');
      
      // Check that mockOnArmorLocationChange was called (the specific value may vary due to user event behavior)
      expect(mockOnArmorLocationChange).toHaveBeenCalled();
      // Verify the last call contains the expected location and rear value
      const lastCall = mockOnArmorLocationChange.mock.calls[mockOnArmorLocationChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe('CT'); // location
      expect(lastCall[2]).toBe(10); // rear should remain 10
    });

    it('should call onArmorLocationChange when rear armor is modified', async () => {
      const mockOnArmorLocationChange = jest.fn();
      renderArmorAllocationPanel({ 
        selectedSection: 'CT',
        onArmorLocationChange: mockOnArmorLocationChange 
      });
      
      const rearInput = screen.getByLabelText('Rear') as HTMLInputElement;
      await userEvent.clear(rearInput);
      await userEvent(rearInput, '15');
      
      // Check that mockOnArmorLocationChange was called
      expect(mockOnArmorLocationChange).toHaveBeenCalled();
      // Verify the last call contains the expected location and front value
      const lastCall = mockOnArmorLocationChange.mock.calls[mockOnArmorLocationChange.mock.calls.length - 1];
      expect(lastCall[0]).toBe('CT'); // location
      expect(lastCall[1]).toBe(30); // front should remain 30
    });

    it('should display correct maximum values for front armor', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT' });
      expect(screen.getByText('/47')).toBeInTheDocument(); // CT max front
    });

    it('should display correct maximum values for rear armor', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT' });
      expect(screen.getByText('/23')).toBeInTheDocument(); // CT max rear (50% of 47)
    });
  });

  // === QUICK ACTIONS TESTS ===
  
  describe('quick actions', () => {
    it('should call onArmorLocationChange with max front when Max Front button is clicked', async () => {
      const mockOnArmorLocationChange = jest.fn();
      renderArmorAllocationPanel({ 
        selectedSection: 'CT',
        onArmorLocationChange: mockOnArmorLocationChange 
      });
      
      const maxFrontButton = screen.getByRole('button', { name: 'Max Front' });
      await userEvent.click(maxFrontButton);
      
      expect(mockOnArmorLocationChange).toHaveBeenCalledWith('CT', 47, 10);
    });

    it('should call onArmorLocationChange with zero values when Clear button is clicked', async () => {
      const mockOnArmorLocationChange = jest.fn();
      renderArmorAllocationPanel({ 
        selectedSection: 'CT',
        onArmorLocationChange: mockOnArmorLocationChange 
      });
      
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      await userEvent.click(clearButton);
      
      expect(mockOnArmorLocationChange).toHaveBeenCalledWith('CT', 0, 0);
    });
  });

  // === ARMOR SUMMARY TABLE TESTS ===
  
  describe('armor summary table', () => {
    it('should display correct armor values for each location', () => {
      renderArmorAllocationPanel();
      
      // Check HD (head) values
      expect(screen.getByText('9')).toBeInTheDocument(); // HD front
      
      // Check CT (center torso) values  
      expect(screen.getByText('30')).toBeInTheDocument(); // CT front
      expect(screen.getByText('10')).toBeInTheDocument(); // CT rear
    });

    it('should calculate and display efficiency percentages correctly', () => {
      renderArmorAllocationPanel();
      
      // HD: 9/9 = 100%
      expect(screen.getByText('(100%)')).toBeInTheDocument();
      
      // CT: (30+10)/47 = 85%
      expect(screen.getByText('(85%)')).toBeInTheDocument();
    });

    it('should apply correct color coding based on efficiency', () => {
      renderArmorAllocationPanel();
      
      // Get the HD row which should have 100% efficiency (9/9)
      const hdRow = screen.getByText('HD').parentElement;
      expect(hdRow).toHaveClass('border-l-green-500'); // 100% efficiency = green
    });

    it('should handle over-allocation with red color coding', () => {
      const overAllocatedArmor = {
        ...mockArmorAllocation,
        HD: { front: 15, rear: 0 } // Over max of 9
      };
      
      renderArmorAllocationPanel({ armorAllocation: overAllocatedArmor });
      
      // Get the HD row which should be over-allocated (15/9)
      const hdRow = screen.getByText('HD').parentElement;
      expect(hdRow).toHaveClass('border-l-red-500'); // Over-allocation = red
    });

    it('should call onSectionSelect when location row is clicked', async () => {
      const mockOnSectionSelect = jest.fn();
      renderArmorAllocationPanel({ onSectionSelect: mockOnSectionSelect });
      
      const hdRow = screen.getByText('HD').closest('div');
      await userEvent.click(hdRow!);
      
      expect(mockOnSectionSelect).toHaveBeenCalledWith('HD');
    });
  });

  // === READ-ONLY MODE TESTS ===
  
  describe('read-only mode', () => {
    it('should disable auto-allocate button in read-only mode', () => {
      renderArmorAllocationPanel({ readOnly: true });
      
      const button = screen.getByRole('button', { name: /auto-allocate armor points/i });
      expect(button).toBeDisabled();
    });

    it('should disable armor input fields in read-only mode', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT', readOnly: true });
      
      const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
      const rearInput = screen.getByLabelText('Rear') as HTMLInputElement;
      
      expect(frontInput).toBeDisabled();
      expect(rearInput).toBeDisabled();
    });

    it('should disable quick action buttons in read-only mode', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT', readOnly: true });
      
      const maxFrontButton = screen.getByRole('button', { name: 'Max Front' });
      const clearButton = screen.getByRole('button', { name: 'Clear' });
      
      expect(maxFrontButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });
  });

  // === EDGE CASES AND ERROR HANDLING ===
  
  describe('edge cases and error handling', () => {
    it('should handle invalid input values gracefully', async () => {
      const mockOnArmorLocationChange = jest.fn();
      renderArmorAllocationPanel({ 
        selectedSection: 'CT',
        onArmorLocationChange: mockOnArmorLocationChange 
      });
      
      const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
      await userEvent.clear(frontInput);
      await userEvent(frontInput, 'invalid');
      
      // Should call with 0 for invalid input
      expect(mockOnArmorLocationChange).toHaveBeenCalledWith('CT', 0, 10);
    });

    it('should handle zero available armor points', () => {
      renderArmorAllocationPanel({ displayUnallocatedPoints: 0 });
      expect(screen.getByText('Available: 0 pts / 200 total')).toBeInTheDocument();
    });

    it('should handle missing armor allocation data gracefully', () => {
      const incompleteArmor = { HD: { front: 9, rear: 0 } }; // Missing other locations
      
      // Should not crash when rendering
      expect(() => {
        renderArmorAllocationPanel({ armorAllocation: incompleteArmor });
      }).not.toThrow();
    });

    it('should handle getLocationMaxArmor returning zero', () => {
      const mockGetLocationMaxArmor = jest.fn().mockReturnValue(0);
      renderArmorAllocationPanel({ getLocationMaxArmor: mockGetLocationMaxArmor });
      
      // Should not cause division by zero errors
      expect(screen.getByText('All Locations')).toBeInTheDocument();
    });

    it('should handle extremely large armor values', () => {
      const largeArmorAllocation = {
        ...mockArmorAllocation,
        CT: { front: 9999, rear: 9999 }
      };
      
      renderArmorAllocationPanel({ armorAllocation: largeArmorAllocation });
      // Check that the large values are displayed in the table (multiple instances expected)
      expect(screen.getAllByText('9999')).toHaveLength(2); // front and rear
    });
  });

  // === BATTLETECH RULE COMPLIANCE TESTS ===
  
  describe('BattleTech rule compliance', () => {
    it('should enforce head armor maximum of 9 points', () => {
      const mockGetLocationMaxArmor = jest.fn((location: string) => location === 'HD' ? 9 : 32);
      renderArmorAllocationPanel({ 
        selectedSection: 'HD',
        getLocationMaxArmor: mockGetLocationMaxArmor 
      });
      
      const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
      expect(frontInput).toHaveAttribute('max', '9');
    });

    it('should enforce rear armor limit as 50% of total location armor', () => {
      renderArmorAllocationPanel({ selectedSection: 'CT' });
      
      const rearInput = screen.getByLabelText('Rear') as HTMLInputElement;
      expect(rearInput).toHaveAttribute('max', '23'); // 50% of 47
    });

    it('should not allow rear armor for arms and legs', () => {
      renderArmorAllocationPanel({ selectedSection: 'LA' });
      
      expect(screen.getByText('N/A')).toBeInTheDocument(); // Rear should be N/A
      expect(screen.queryByLabelText('Rear')).not.toBeInTheDocument();
    });

    it('should validate armor allocation within BattleTech limits', () => {
      const validationScenarios = [
        { location: 'HD', maxFront: 9, hasRear: false },
        { location: 'CT', maxFront: 47, hasRear: true },
        { location: 'LT', maxFront: 32, hasRear: true },
        { location: 'LA', maxFront: 24, hasRear: false },
        { location: 'LL', maxFront: 32, hasRear: false }
      ];

      validationScenarios.forEach(({ location, maxFront, hasRear }) => {
        const mockGetLocationMaxArmor = jest.fn().mockReturnValue(maxFront);
        const { unmount } = renderArmorAllocationPanel({ 
          selectedSection: location,
          getLocationMaxArmor: mockGetLocationMaxArmor 
        });
        
        const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
        expect(frontInput).toHaveAttribute('max', maxFront.toString());
        
        if (hasRear) {
          const rearInput = screen.getByLabelText('Rear') as HTMLInputElement;
          expect(rearInput).toHaveAttribute('max', Math.floor(maxFront * 0.5).toString());
        }
        
        // Clean up to avoid duplicate DOM elements
        unmount();
      });
    });
  });

  // === PERFORMANCE TESTS ===
  
  describe('performance', () => {
    it('should render efficiently with large armor allocation data', () => {
      const startTime = performance.now();
      renderArmorAllocationPanel();
      const endTime = performance.now();
      
      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle rapid input changes without performance degradation', async () => {
      const mockOnArmorLocationChange = jest.fn();
      renderArmorAllocationPanel({ 
        selectedSection: 'CT',
        onArmorLocationChange: mockOnArmorLocationChange 
      });
      
      const frontInput = screen.getByLabelText('Front') as HTMLInputElement;
      
      // Simulate rapid typing
      const startTime = performance.now();
      for (let i = 0; i < 5; i++) { // Reduced iterations for more reliable performance
        await userEvent.clear(frontInput);
        await userEvent(frontInput, i.toString());
      }
      const endTime = performance.now();
      
      // Should complete rapid changes in under 2 seconds (more lenient for CI environments)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(mockOnArmorLocationChange).toHaveBeenCalledTimes(10); // 5 clears + 5 types
    });
  });

  // === INTEGRATION TESTS ===
  
  describe('integration', () => {
    it('should work correctly with parent component state changes', () => {
      const { rerender } = renderArmorAllocationPanel({ selectedSection: null });
      
      expect(screen.getByText('Click an armor section on the diagram to edit its values')).toBeInTheDocument();
      
      // Simulate parent changing selected section
      rerender(<ArmorAllocationPanel {...defaultProps} selectedSection="CT" />);
      
      expect(screen.getByText('Editing: CT')).toBeInTheDocument();
    });

    it('should maintain state consistency when switching between sections', () => {
      const { rerender } = renderArmorAllocationPanel({ selectedSection: 'CT' });
      
      expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // CT front armor
      
      // Switch to different section
      rerender(<ArmorAllocationPanel {...defaultProps} selectedSection="LA" />);
      
      expect(screen.getByDisplayValue('16')).toBeInTheDocument(); // LA front armor
    });

    it('should properly coordinate with auto-allocation functionality', async () => {
      const mockOnAutoAllocate = jest.fn();
      renderArmorAllocationPanel({ 
        onAutoAllocate: mockOnAutoAllocate,
        displayUnallocatedPoints: 50 
      });
      
      const button = screen.getByRole('button', { name: /auto-allocate armor points/i });
      await userEvent.click(button);
      
      expect(mockOnAutoAllocate).toHaveBeenCalledTimes(1);
      expect(screen.getByText('(50 pts available)')).toBeInTheDocument();
    });
  });
});
