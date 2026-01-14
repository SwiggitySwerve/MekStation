import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EquipmentBrowser } from '@/components/customizer/equipment/EquipmentBrowser';
import { EquipmentCategory } from '@/types/equipment';
import { TechBase } from '@/types/enums/TechBase';
import type { CompactFilterBarProps } from '@/components/customizer/equipment/CompactFilterBar';

jest.mock('@/hooks/useEquipmentBrowser', () => ({
  useEquipmentBrowser: jest.fn(),
}));

jest.mock('@/components/customizer/equipment/CompactFilterBar', () => ({
  CompactFilterBar: ({ search, onSearchChange, onClearFilters }: CompactFilterBarProps) => (
    <div data-testid="compact-filter-bar">
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <button onClick={onClearFilters}>Clear</button>
    </div>
  ),
}));

// Mock EquipmentRow
jest.mock('@/components/customizer/equipment/EquipmentRow', () => ({
  EquipmentRow: ({ equipment, onAdd }: { equipment: { name: string }; onAdd: () => void }) => (
    <tr>
      <td>{equipment.name}</td>
      <td>
        <button onClick={onAdd}>Add</button>
      </td>
    </tr>
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

  it('should render equipment browser', () => {
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    
    expect(screen.getByText('Equipment Database')).toBeInTheDocument();
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
    
    const addButtons = screen.getAllByText('Add');
    await user.click(addButtons[0]);
    
    expect(onAddEquipment).toHaveBeenCalledWith(mockEquipment[0]);
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
    
    const weightHeader = screen.getByText('Wt');
    await user.click(weightHeader);

    expect(setSort).toHaveBeenCalled();
  });

  it('should display unit context when filtering by availability', () => {
    (useEquipmentBrowser as jest.Mock).mockReturnValue({
      ...defaultMockHook,
      hideUnavailable: true,
      unitYear: 3050,
      unitTechBase: TechBase.INNER_SPHERE,
    });
    
    render(<EquipmentBrowser onAddEquipment={jest.fn()} />);
    
    expect(screen.getByText(/Year ≤ 3050/i)).toBeInTheDocument();
    expect(screen.getByText(TechBase.INNER_SPHERE)).toBeInTheDocument();
  });
});

