import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { CompactFilterBarProps } from '@/components/customizer/equipment/CompactFilterBar';

import { EquipmentBrowser } from '@/components/customizer/equipment/EquipmentBrowser';
import { EquipmentBrowserUnitContext } from '@/components/customizer/equipment/EquipmentBrowserUnitContext';
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

jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  getEquipmentLoader: () => ({
    getAmmunitionById: (id: string) =>
      id === 'ac10-ammo' ? { shotsPerTon: 10 } : null,
    getElectronicsById: () => null,
    getMiscEquipmentById: () => null,
  }),
}));

jest.mock('@/components/customizer/equipment/CompactFilterBar', () => ({
  CompactFilterBar: ({
    search,
    onSearchChange,
    onClearFilters,
    availabilitySummary,
    capacity,
    limitNoteId,
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
      {capacity && (
        <span data-testid="equipment-catalog-capacity">
          {capacity.weightText} · {capacity.slotsText}
        </span>
      )}
      {capacity?.limitText && (
        <span id={limitNoteId} data-testid="equipment-catalog-limit">
          {capacity.limitText}
        </span>
      )}
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

  it('puts the overflow cue of a single-page list outside rows and hides it at the end', () => {
    const height = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(200);
    const content = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(500);
    try {
      render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
      const scroll = screen.getByTestId('equipment-catalog-scroll');
      const cue = screen.getByTestId('more-below-cue');
      expect(cue).toHaveTextContent(/^More below$/);
      expect(scroll).not.toContainElement(cue);
      expect(scroll.parentElement).not.toContainElement(cue);
      fireEvent.scroll(scroll, { target: { scrollTop: 300 } });
      expect(screen.queryByTestId('more-below-cue')).not.toBeInTheDocument();
      fireEvent.scroll(scroll, { target: { scrollTop: 0 } });
      expect(screen.getByTestId('more-below-cue')).toBeInTheDocument();
    } finally {
      height.mockRestore();
      content.mockRestore();
    }
  });

  it('shows only the page line in the pager, never a scroll cue beside it', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      totalPages: 4,
    });
    const height = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(200);
    const content = jest
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(500);
    try {
      render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
      const pager = screen.getByTestId('equipment-pagination');
      expect(within(pager).getByText('Page 1 of 4')).toBeInTheDocument();
      expect(screen.queryByTestId('more-below-cue')).not.toBeInTheDocument();
      // The viewport still records the overflow for layout and tests.
      expect(
        screen.getByTestId('equipment-catalog-scroll').parentElement,
      ).toHaveAttribute('data-more-below', 'true');
    } finally {
      height.mockRestore();
      content.mockRestore();
    }
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

  it('presents calculated capacity and current loadout counts without blocking Add', async () => {
    const onAddEquipment = jest.fn();
    render(
      <EquipmentBrowserUnitContext.Provider
        value={{
          remainingWeight: 4,
          remainingSlots: 16,
          mountedCounts: new Map([['medium-laser', 3]]),
        }}
      >
        <EquipmentBrowser onAddEquipment={onAddEquipment} />
      </EquipmentBrowserUnitContext.Provider>,
    );
    expect(screen.getByTestId('equipment-catalog-capacity')).toHaveTextContent(
      '4.0 t free · 16 slots free',
    );
    // Desktop subtitle and phone name line each carry the count.
    expect(screen.getAllByText('×3 mounted')).toHaveLength(2);
    // Only the 5 t Large Laser exceeds the 4 t free; no per-row chip.
    expect(screen.getAllByText(/exceeds free weight by 1\.0 t/)).toHaveLength(
      2,
    );
    expect(screen.queryByText(/t over/)).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Add Large Laser' }));
    expect(onAddEquipment).toHaveBeenCalledWith(mockEquipment[1]);
  });

  it('says once that nothing is free instead of marking every row', () => {
    render(
      <EquipmentBrowserUnitContext.Provider
        value={{
          remainingWeight: 0,
          remainingSlots: 12,
          mountedCounts: new Map(),
        }}
      >
        <EquipmentBrowser onAddEquipment={jest.fn()} />
      </EquipmentBrowserUnitContext.Provider>,
    );
    expect(screen.getByTestId('equipment-catalog-capacity')).toHaveTextContent(
      '0.0 t free',
    );
    expect(screen.getByTestId('equipment-catalog-limit')).toHaveTextContent(
      'At tonnage limit',
    );
    expect(screen.queryByText(/exceeds free weight/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\+\d+\.\d t over/)).not.toBeInTheDocument();
    // Add stays enabled at the limit, in the quieter style, and is
    // described by the limit note.
    const add = screen.getByRole('button', { name: 'Add Large Laser' });
    expect(add).toBeEnabled();
    expect(add).toHaveAttribute('data-at-limit', 'true');
    expect(add).toHaveAccessibleDescription('At tonnage limit');
  });

  it('keeps the standard Add style while tonnage is free', () => {
    render(
      <EquipmentBrowserUnitContext.Provider
        value={{
          remainingWeight: 5,
          remainingSlots: 12,
          mountedCounts: new Map(),
        }}
      >
        <EquipmentBrowser onAddEquipment={jest.fn()} />
      </EquipmentBrowserUnitContext.Provider>,
    );
    const add = screen.getByRole('button', { name: 'Add Large Laser' });
    expect(add).not.toHaveAttribute('data-at-limit');
    expect(add).not.toHaveAttribute('aria-describedby');
  });

  it('should render equipment table', () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    expect(screen.getByText('Large Laser')).toBeInTheDocument();
  });

  it('ends the list on a whole row at desktop widths too, so the pager never cuts one', () => {
    const height = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(100);
    const offset = jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(100);
    const rect = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        // Rows are 60px tall from the top of the list: the second ends at
        // 120px, past the 100px viewport, so only the first fits whole.
        const row = this.matches('ul > li')
          ? Array.from(this.parentElement?.children ?? []).indexOf(this) + 1
          : 0;
        return { top: 0, bottom: row * 60 } as DOMRect;
      });
    try {
      render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
      expect(
        screen.getByTestId('equipment-catalog-scroll').style.maxHeight,
      ).toBe('60px');
    } finally {
      height.mockRestore();
      offset.mockRestore();
      rect.mockRestore();
    }
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
    const options = screen.getByRole('button', {
      name: 'Add options for Medium Laser',
    });
    expect(options).toHaveAttribute('title', 'More ways to add');
    expect(
      options.querySelector('[data-icon-name="more"]'),
    ).toBeInTheDocument();
    expect(
      options.querySelector('[data-icon-name="chevron-down"]'),
    ).not.toBeInTheDocument();
    await user.click(options);
    const quickPlace = screen.getByRole('menuitem', {
      name: 'Add and place Medium Laser',
    });
    expect(quickPlace).toHaveTextContent('Add and Choose Location');
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
    const stats = within(row).getByTestId('equipment-catalog-stats');
    for (const pair of ['Damage 5 · Range 3/6/9', 'Heat 3 · 1.0 t · 1 slot']) {
      expect(stats).toHaveTextContent(pair);
    }
    expect(stats).not.toHaveTextContent('Min');
    expect(
      row.querySelector('[data-catalog-column="minimumRange"]'),
    ).toHaveTextContent('—');
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
    for (const column of ['damage', 'range', 'minimumRange', 'heat']) {
      expect(
        screen
          .getByRole('listitem')
          .querySelector(`[data-catalog-column="${column}"]`),
      ).toHaveTextContent('—');
    }
  });

  it.each([
    ['ac10-ammo', '10 shots/t'],
    ['unknown-ammo', undefined],
  ])('shows only declared ammunition capacity for %s', (id, expected) => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      paginatedEquipment: [
        {
          ...mockEquipment[0],
          id,
          name: 'Ammo',
          category: EquipmentCategory.AMMUNITION,
        },
      ],
    });
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    const row = screen.getByRole('listitem');
    // Damage is reserved for weapons; capacity is its own field.
    expect(
      row.querySelector('[data-catalog-column="damage"]'),
    ).toHaveTextContent('—');
    const category = row.querySelector('[data-catalog-column="category"]');
    if (expected) expect(category).toHaveTextContent(expected);
    else expect(category).not.toHaveTextContent('shots');
    expect(
      row.querySelector('[data-catalog-column="range"]'),
    ).toHaveTextContent('—');
    const stats = within(row).getByTestId('equipment-catalog-stats');
    if (id === 'ac10-ammo') {
      expect(stats).toHaveTextContent('10 shots/t · 1.0 t · 1 slot');
      expect(stats).not.toHaveTextContent('Damage');
    } else {
      // Unknown ammunition has no capacity and no combat data to show.
      expect(stats).not.toHaveTextContent('shots/t');
      expect(stats).not.toHaveTextContent('Damage');
      expect(stats).toHaveTextContent('1.0 t · 1 slot');
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

  it('ends a single page with its result count and hides pagination', async () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);

    expect(
      screen.queryByTestId('equipment-pagination'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('End of results · 2 items')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add Medium Laser' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Medium Laser. Added to the unit.',
    );
  });

  it('keeps navigation on multiple pages and marks only the final page as the end', async () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      totalPages: 2,
      totalItems: 27,
    });
    const view = render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    // The count is said once, in the summary line, not again in the pager.
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('equipment-pagination')).queryByText(/items/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/End of results/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(defaultMockHook.setPage).toHaveBeenCalledWith(2);
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      currentPage: 2,
      totalPages: 2,
      totalItems: 27,
    });
    view.rerender(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    expect(screen.getByText('End of results · 27 items')).toBeInTheDocument();
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
      screen.getByText('Inner Sphere · Available in 3050'),
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
