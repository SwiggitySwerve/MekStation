import { render, screen } from '@testing-library/react';
import React from 'react';

import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitStore } from '@/stores/useUnitStore';

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
  const mockUseUnitStore = useUnitStore as jest.MockedFunction<
    typeof useUnitStore
  >;
  const mockUseCustomizerStore = useCustomizerStore as jest.MockedFunction<
    typeof useCustomizerStore
  >;
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
    mockUseUnitStore.mockImplementation((selector: unknown): unknown => {
      if (typeof selector === 'function') {
        return (selector as (state: typeof mockStoreValues) => unknown)(
          mockStoreValues,
        );
      }
      return undefined;
    });
    mockUseCustomizerStore.mockImplementation((selector: unknown): unknown => {
      if (typeof selector === 'function') {
        return (selector as (state: typeof mockCustomizerStore) => unknown)(
          mockCustomizerStore,
        );
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
