import { render, screen, within } from '@testing-library/react';
import React from 'react';

import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  getLocationsForConfig,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/stores/useCustomizerStore', () => ({
  useCustomizerStore: jest.fn(),
}));

jest.mock('@/components/customizer/critical-slots/LocationGrid', () => ({
  LocationGrid: ({ location }: { location: string }) => (
    <div data-testid="location-grid">{location}</div>
  ),
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
    configuration: MechConfiguration.BIPED,
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

  it('groups desktop locations in front-view columns with head above center torso', () => {
    render(<CriticalSlotsTab />);
    expect(
      screen.getByText('Front view · Right side on the left'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Scroll for more locations'),
    ).not.toBeInTheDocument();
    const grid = screen.getByTestId('critical-slots-grid-desktop');
    const columns = grid.firstElementChild!.children;
    expect(columns[0]).toHaveTextContent('Right Arm');
    expect(columns[1]).toHaveTextContent('Right TorsoRight Leg');
    expect(columns[2]).toHaveTextContent('HeadCenter Torso');
    expect(columns[3]).toHaveTextContent('Left TorsoLeft Leg');
    expect(columns[4]).toHaveTextContent('Left Arm');
    expect(within(grid).getAllByTestId('location-grid')).toHaveLength(8);
    const tools = screen.getByRole('button', { name: 'Critical slot tools' });
    expect(
      within(tools.parentElement!).getByRole('button', {
        name: 'Color Legend',
      }),
    ).toBeInTheDocument();
  });

  it.each([
    MechConfiguration.QUAD,
    MechConfiguration.TRIPOD,
    MechConfiguration.LAM,
    MechConfiguration.QUADVEE,
  ])('keeps every configuration location in the %s layout', (configuration) => {
    mockUseUnitStore.mockImplementation((selector: unknown): unknown =>
      typeof selector === 'function'
        ? selector({ ...mockStoreValues, configuration })
        : undefined,
    );
    render(<CriticalSlotsTab />);
    const region = screen.getByRole('region', {
      name: 'Critical slot locations',
    });
    expect(
      within(region)
        .getAllByTestId('location-grid')
        .map((grid) => grid.textContent),
    ).toEqual(getLocationsForConfig(configuration));
    expect(
      screen.queryByTestId('critical-slots-grid-desktop'),
    ).not.toBeInTheDocument();
  });
});
