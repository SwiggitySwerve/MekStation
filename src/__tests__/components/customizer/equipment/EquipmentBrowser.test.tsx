import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { CompactFilterBarProps } from '@/components/customizer/equipment/CompactFilterBar';

import { EquipmentBrowser } from '@/components/customizer/equipment/EquipmentBrowser';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';

jest.mock('@/utils/equipment/weapons/utilities', () => ({
  getWeaponById: (id: string) =>
    id === 'medium-laser'
      ? {
          damage: 5,
          heat: 3,
          ranges: { short: 3, medium: 6, long: 9, minimum: 0 },
        }
      : undefined,
}));

jest.mock('@/hooks/useEquipmentBrowser', () => ({
  useEquipmentBrowser: jest.fn(),
}));

jest.mock('@/components/customizer/equipment/CompactFilterBar', () => ({
  CompactFilterBar: ({
    search,
    onSearchChange,
    onClearFilters,
    availabilitySummary,
  }: CompactFilterBarProps) => (
    <div data-testid="compact-filter-bar">
      <input
        aria-label="Search equipment"
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button onClick={onClearFilters}>Clear</button>
      <span>{availabilitySummary}</span>
    </div>
  ),
}));

import { useEquipmentBrowser } from '@/hooks/useEquipmentBrowser';

describe('EquipmentBrowser', () => {
  const mockEquipment = [
    {
      id: 'medium-laser',
      name: 'Medium Laser',
      category: EquipmentCategory.ENERGY_WEAPON,
      weight: 1,
      criticalSlots: 1,
      heat: 3,
      techBase: TechBase.INNER_SPHERE,
    },
    {
      id: 'large-laser',
      name: 'Large Laser',
      category: EquipmentCategory.ENERGY_WEAPON,
      weight: 5,
      criticalSlots: 2,
      heat: 8,
      techBase: TechBase.INNER_SPHERE,
    },
  ];

  const defaultMockHook = {
    paginatedEquipment: mockEquipment,
    isLoading: false,
    error: null,
    unitYear: null,
    unitTechBase: null,
    currentPage: 1,
    totalPages: 1,
    totalItems: 2,
    search: '',
    activeCategories: new Set([EquipmentCategory.ENERGY_WEAPON]),
    showAllCategories: false,
    hidePrototype: false,
    hideOneShot: false,
    hideUnavailable: false,
    hideAmmoWithoutWeapon: false,
    sortColumn: 'name' as const,
    sortDirection: 'asc' as const,
    setSearch: jest.fn(),
    selectCategory: jest.fn(),
    showAll: jest.fn(),
    toggleHidePrototype: jest.fn(),
    toggleHideOneShot: jest.fn(),
    toggleHideUnavailable: jest.fn(),
    toggleHideAmmoWithoutWeapon: jest.fn(),
    clearFilters: jest.fn(),
    setPage: jest.fn(),
    setSort: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEquipmentBrowser as jest.Mock).mockReturnValue(defaultMockHook);
  });

  it('keeps duplicate equipment IDs in different categories independent through filtering', async () => {
    const user = userEvent.setup();
    const ams = {
      ...mockEquipment[0],
      id: 'ams',
      name: 'Anti-Missile System',
      category: EquipmentCategory.BALLISTIC_WEAPON,
    };
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      paginatedEquipment: [
        ams,
        { ...ams, category: EquipmentCategory.MISC_EQUIPMENT },
        mockEquipment[0],
      ],
      totalItems: 3,
    });
    const onAddEquipment = jest.fn();
    const view = render(<EquipmentBrowser onAddEquipment={onAddEquipment} />);
    const details = screen.getAllByRole('button', {
      name: 'Details for Anti-Missile System',
    });
    await user.click(details[0]);
    expect(details[0]).toHaveAttribute('aria-expanded', 'true');
    expect(details[1]).toHaveAttribute('aria-expanded', 'false');
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      paginatedEquipment: [mockEquipment[0]],
      totalItems: 1,
      search: 'Medium Laser',
    });
    view.rerender(<EquipmentBrowser onAddEquipment={onAddEquipment} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Anti-Missile System')).not.toBeInTheDocument();
  });

  it('should render equipment browser', () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(
      screen.getByRole('textbox', { name: 'Search equipment' }),
    ).toBeInTheDocument();
  });

  it('should render equipment table', () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    expect(screen.getByText('Large Laser')).toBeInTheDocument();
  });

  it('should call onAddEquipment when equipment is added', async () => {
    const user = userEvent.setup();
    const onAddEquipment = jest.fn();

    render(<EquipmentBrowser onAddEquipment={onAddEquipment} />);

    await user.click(screen.getByRole('button', { name: 'Add Medium Laser' }));

    expect(onAddEquipment).toHaveBeenCalledWith(mockEquipment[0]);
  });

  it('explains the add destinations and keeps the two actions separate', async () => {
    const user = userEvent.setup();
    const onAddEquipment = jest.fn();
    const onAddAndPlace = jest.fn();
    render(
      <EquipmentBrowser
        onAddEquipment={onAddEquipment}
        onAddAndPlace={onAddAndPlace}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Add Medium Laser' }),
    ).toHaveAttribute('title', 'Add to unassigned');
    await user.click(
      screen.getByRole('button', { name: 'Add options for Medium Laser' }),
    );
    const quickPlace = screen.getByRole('menuitem', {
      name: 'Add and place Medium Laser',
    });
    expect(quickPlace).toHaveTextContent('Add and choose location');
    await user.click(quickPlace);
    expect(onAddAndPlace).toHaveBeenCalledWith(mockEquipment[0]);
    expect(onAddEquipment).not.toHaveBeenCalled();
    onAddAndPlace.mockClear();
    await user.click(
      screen.getByRole('button', { name: 'Details for Medium Laser' }),
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Add options for Medium Laser' }),
    );
    await user.click(
      screen.getByRole('menuitem', { name: 'Add and place Medium Laser' }),
    );
    expect(onAddAndPlace).toHaveBeenCalledWith(mockEquipment[0]);
    expect(onAddEquipment).not.toHaveBeenCalled();
  });

  it('disables both add destinations in read-only mode', async () => {
    const user = userEvent.setup();
    const onAddEquipment = jest.fn();
    const onAddAndPlace = jest.fn();
    render(
      <EquipmentBrowser
        readOnly
        onAddEquipment={onAddEquipment}
        onAddAndPlace={onAddAndPlace}
      />,
    );
    const add = screen.getByRole('button', {
      name: 'Add Medium Laser',
    });
    const place = screen.getByRole('button', {
      name: 'Add options for Medium Laser',
    });
    expect(add).toBeDisabled();
    expect(place).toBeDisabled();
    await user.click(add);
    await user.click(place);
    expect(onAddEquipment).not.toHaveBeenCalled();
    expect(onAddAndPlace).not.toHaveBeenCalled();
  });

  it('marks only the active sort and announces its direction', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      sortColumn: 'weight',
      sortDirection: 'desc',
    });
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    const active = screen.getByRole('button', {
      name: 'Sort by weight, descending',
    });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(active).toHaveTextContent('▼');
    expect(
      screen.getByRole('button', { name: 'Sort by name' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Sort by slots' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows weapon damage and ranges before expansion and leaves unsupported sorts plain', () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    const row = screen.getAllByRole('listitem')[0];
    expect(
      row.querySelector('[data-catalog-column="damage"]'),
    ).toHaveTextContent('5');
    expect(
      row.querySelector('[data-catalog-column="range"]'),
    ).toHaveTextContent('3 / 6 / 9');
    expect(row.querySelector('[data-catalog-column="heat"]')).toHaveTextContent(
      '3',
    );
    expect(
      within(row).getByText('Dmg 5 · Range 3/6/9 · Heat 3'),
    ).toBeInTheDocument();
    expect(within(row).getByText('1 t · 1 slot')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Sort by (heat|damage|range)/i }),
    ).not.toBeInTheDocument();
    expect(
      within(row).getByRole('button', { name: 'Details for Medium Laser' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows dashes for non-weapon combat statistics', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      paginatedEquipment: [
        {
          ...mockEquipment[0],
          id: 'non-weapon',
          name: 'Utility',
          category: EquipmentCategory.MISC_EQUIPMENT,
        },
      ],
    });
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    for (const column of ['damage', 'range', 'heat']) {
      expect(
        screen
          .getByRole('listitem')
          .querySelector(`[data-catalog-column="${column}"]`),
      ).toHaveTextContent('—');
    }
  });

  it('should display loading state', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      isLoading: true,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(screen.getByText('Loading equipment...')).toBeInTheDocument();
  });

  it('should display error state', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      error: 'Failed to load',
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(screen.getByText('Failed to load equipment')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should call refresh when retry button is clicked', async () => {
    const user = userEvent.setup();
    const refresh = jest.fn();

    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      error: 'Failed to load',
      refresh,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should display empty state when no equipment', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      paginatedEquipment: [],
      totalItems: 0,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(screen.getByText('No equipment found')).toBeInTheDocument();
  });

  it('should display pagination info', () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(screen.getByText('Page 1/1')).toBeInTheDocument();
  });

  it('should call setSearch when search input changes', async () => {
    const user = userEvent.setup();
    const setSearch = jest.fn();

    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      setSearch,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search...');
    await user.type(searchInput, 'laser');

    expect(setSearch).toHaveBeenCalled();
  });

  it('should call clearFilters when clear button is clicked', async () => {
    const user = userEvent.setup();
    const clearFilters = jest.fn();

    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      search: 'test',
      clearFilters,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    const clearButton = screen.getByText('Clear');
    await user.click(clearButton);

    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('should call setSort when sortable header is clicked', async () => {
    const user = userEvent.setup();
    const setSort = jest.fn();

    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      setSort,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    const weightHeader = screen.getByRole('button', { name: 'Sort by weight' });
    await user.click(weightHeader);

    expect(setSort).toHaveBeenCalledWith('weight');
  });

  it('should display unit context when filtering by availability', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      hideUnavailable: true,
      unitYear: 3050,
      unitTechBase: TechBase.INNER_SPHERE,
    });

    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(
      screen.getByText('Inner Sphere · introduced ≤3050'),
    ).toBeInTheDocument();
  });
  it('allows keyboard inspection in read-only mode but cannot add equipment', async () => {
    const user = userEvent.setup();
    const onAddEquipment = jest.fn();
    render(<EquipmentBrowser readOnly onAddEquipment={onAddEquipment} />);
    const details = screen.getByRole('button', {
      name: 'Details for Medium Laser',
    });
    details.focus();
    await user.keyboard('{Enter}');
    expect(details).toHaveAttribute('aria-expanded', 'true');
    const add = screen.getByRole('button', {
      name: 'Add Medium Laser',
    });
    expect(add).toBeDisabled();
    await user.click(add);
    expect(onAddEquipment).not.toHaveBeenCalled();
  });
});
