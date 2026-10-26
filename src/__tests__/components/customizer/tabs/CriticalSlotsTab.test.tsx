import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  getLocationsForConfig,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';
import { EquipmentCategory } from '@/types/equipment';

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

  it('explains placement and selects the first unassigned item without assigning it', () => {
    const onSelectEquipment = jest.fn();
    const updateEquipmentLocation = jest.fn();
    mockUseUnitStore.mockImplementation((selector: unknown): unknown =>
      typeof selector === 'function'
        ? selector({
            ...mockStoreValues,
            updateEquipmentLocation,
            equipment: [
              {
                instanceId: 'er-ppc-1',
                equipmentId: 'er-ppc',
                name: 'ER PPC',
                category: EquipmentCategory.ENERGY_WEAPON,
                weight: 7,
                criticalSlots: 3,
              },
            ],
          })
        : undefined,
    );
    const view = render(
      <CriticalSlotsTab
        hideLoadoutTray={false}
        onSelectEquipment={onSelectEquipment}
      />,
    );
    const banner = screen.getByRole('region', { name: 'Equipment to place' });
    expect(banner).toHaveTextContent('1 item to place: ER PPC');
    expect(banner).toHaveTextContent(
      'select, then tap a highlighted slot or drag.',
    );
    fireEvent.click(
      within(banner).getByRole('button', { name: 'Select ER PPC' }),
    );
    expect(onSelectEquipment).toHaveBeenCalledWith('er-ppc-1');
    expect(updateEquipmentLocation).not.toHaveBeenCalled();
    view.rerender(
      <CriticalSlotsTab readOnly onSelectEquipment={onSelectEquipment} />,
    );
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument();
    expect(banner).toHaveTextContent('read-only');
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
        name: 'Colour key',
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
