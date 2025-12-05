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

jest.mock('@/components/customizer/critical-slots/LocationGrid', () => ({
  LocationGrid: () => <div data-testid="location-grid" />,
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
    autoModeSettings: {
      autoFillUnhittables: false,
      autoCompact: false,
      autoSort: false,
    },
    toggleAutoFillUnhittables: jest.fn(),
    toggleAutoCompact: jest.fn(),
    toggleAutoSort: jest.fn(),
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
    
    // The tab renders LocationGrid components for each location
    expect(screen.getAllByTestId('location-grid').length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    const { container } = render(<CriticalSlotsTab className="custom-class" />);
    
    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});

