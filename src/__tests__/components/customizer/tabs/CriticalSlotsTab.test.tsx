import React from 'react';
import { render, screen } from '@testing-library/react';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { useUnitStore } from '@/stores/useUnitStore';
import { useCustomizerStore } from '@/stores/useCustomizerStore';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/stores/useCustomizerStore', () => ({
  useCustomizerStore: jest.fn(),
}));

jest.mock('@/components/customizer/critical-slots/CriticalSlotsDisplay', () => ({
  CriticalSlotsDisplay: () => <div data-testid="critical-slots-display" />,
}));

describe('CriticalSlotsTab', () => {
  const mockStoreValues = {
    tonnage: 50,
    engineType: 'Standard Fusion',
    gyroType: 'Standard',
    equipment: [],
    criticalSlots: [],
  };

  const mockCustomizerStore = {
    selectedEquipmentId: null,
    setSelectedEquipmentId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUnitStore as jest.Mock).mockImplementation((selector: unknown): unknown => {
      if (typeof selector === 'function') {
        return (selector as (state: typeof mockStoreValues) => unknown)(mockStoreValues);
      }
      return undefined;
    });
    (useCustomizerStore as jest.Mock).mockImplementation((selector: unknown): unknown => {
      if (typeof selector === 'function') {
        return (selector as (state: typeof mockCustomizerStore) => unknown)(mockCustomizerStore);
      }
      return undefined;
    });
  });

  it('should render critical slots tab', () => {
    render(<CriticalSlotsTab />);
    
    expect(screen.getByTestId('critical-slots-display')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<CriticalSlotsTab className="custom-class" />);
    
    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});

