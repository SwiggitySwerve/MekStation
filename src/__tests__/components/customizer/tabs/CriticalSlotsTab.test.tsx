import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { useCriticalSlotOverflow } from '@/components/customizer/critical-slots/useCriticalSlotOverflow';
import { CriticalSlotsTab } from '@/components/customizer/tabs/CriticalSlotsTab';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  getLocationsForConfig,
  MechConfiguration,
} from '@/types/construction/MechConfigurationSystem';
import { EquipmentCategory } from '@/types/equipment';

// Mock dependencies
jest.mock(
  '@/components/customizer/critical-slots/useCriticalSlotOverflow',
  () => ({
    useCriticalSlotOverflow: jest.fn(),
  }),
);
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
    jest
      .mocked(useCriticalSlotOverflow)
      .mockReturnValue({ rootRef: { current: null }, hasMoreBelow: false });
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

  it('puts the phone overflow hint below the scrolling locations', () => {
    jest
      .mocked(useCriticalSlotOverflow)
      .mockReturnValue({ rootRef: { current: null }, hasMoreBelow: true });
    render(<CriticalSlotsTab />);
    const cue = screen.getByTestId('more-below-cue');
    const scroll = screen.getByTestId('critical-slots-grid-mobile');
    expect(cue).toHaveTextContent('Scroll for more slots');
    expect(scroll).not.toContainElement(cue);
    expect(scroll.nextElementSibling).toContainElement(cue);
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
    // Nothing is highlighted before a selection, so the hint starts there.
    expect(banner).toHaveTextContent(
      'select it in the Loadout, then tap a highlighted slot.',
    );
    expect(banner).not.toHaveTextContent('or drag');
    fireEvent.click(
      within(banner).getByRole('button', { name: 'Select ER PPC' }),
    );
    expect(onSelectEquipment).toHaveBeenCalledWith('er-ppc-1');
    expect(updateEquipmentLocation).not.toHaveBeenCalled();
    view.rerender(
      <CriticalSlotsTab
        hideLoadoutTray={false}
        selectedEquipmentId="er-ppc-1"
        onSelectEquipment={onSelectEquipment}
      />,
    );
    expect(banner).toHaveTextContent(
      'select, then tap a highlighted slot or drag.',
    );
    view.rerender(
      <CriticalSlotsTab readOnly onSelectEquipment={onSelectEquipment} />,
    );
    expect(within(banner).queryByRole('button')).not.toBeInTheDocument();
    expect(banner).toHaveTextContent('read-only');
  });

  it('groups desktop locations in record-sheet columns with head above center torso', () => {
    render(<CriticalSlotsTab />);
    expect(
      screen.getByText('Matches the record sheet · left side on the left'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Scroll for more locations'),
    ).not.toBeInTheDocument();
    const grid = screen.getByTestId('critical-slots-grid-desktop');
    const columns = grid.firstElementChild!.children;
    // The unit's left side is on the viewer's left, as on the record sheet.
    expect(columns[0]).toHaveTextContent('Left Arm');
    expect(columns[1]).toHaveTextContent('Left Torso');
    expect(columns[2]).toHaveTextContent('HeadCenter Torso');
    expect(columns[3]).toHaveTextContent('Right Torso');
    expect(columns[4]).toHaveTextContent('Right Arm');
    expect(columns[5]).toHaveTextContent('Left Leg');
    expect(columns[6]).toHaveTextContent('Right Leg');
    expect(columns).toHaveLength(7);
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
