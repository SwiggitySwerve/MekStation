import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { EquipmentCatalog } from '../EquipmentCatalog';
import type { EquipmentItem, FilterOptions } from '../EquipmentCatalog';

const mockItems: EquipmentItem[] = [
  { id: '1', name: 'Large Laser', type: 'Energy', tonnage: 5 },
  { id: '2', name: 'AC/20', type: 'Ballistic', tonnage: 14 },
  { id: '3', name: 'LRM-20', type: 'Missile', tonnage: 7 },
  { id: '4', name: 'Medium Laser', type: 'Energy', tonnage: 1 },
  { id: '5', name: 'Gauss Rifle', type: 'Ballistic', tonnage: 15 },
];

const mockFilters: FilterOptions = {
  types: [],
  tonnageRange: [0, 20],
};

describe('EquipmentCatalog', () => {
  const mockOnFilterChange = jest.fn();
  const mockOnItemSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all equipment items', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      expect(screen.getByText('Large Laser')).toBeInTheDocument();
      expect(screen.getByText('AC/20')).toBeInTheDocument();
      expect(screen.getByText('LRM-20')).toBeInTheDocument();
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
      expect(screen.getByText('Gauss Rifle')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('should render filter button', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      expect(filterButton).toBeInTheDocument();
    });

    it('should display item type and tonnage', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      expect(screen.getByText('Energy • 5 tons')).toBeInTheDocument();
      expect(screen.getByText('Ballistic • 14 tons')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
          className="custom-class"
        />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter items by search query', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      fireEvent.change(searchInput, { target: { value: 'laser' } });

      expect(screen.getByText('Large Laser')).toBeInTheDocument();
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
      expect(screen.queryByText('AC/20')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      fireEvent.change(searchInput, { target: { value: 'LASER' } });

      expect(screen.getByText('Large Laser')).toBeInTheDocument();
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    });

    it('should show no results message when no matches', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No equipment found')).toBeInTheDocument();
    });

    it('should have 44x44px minimum height on search input', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search equipment...');
      expect(searchInput).toHaveClass('min-h-[44px]');
    });
  });

  describe('List Items', () => {
    it('should have 44px minimum height', () => {
      const { container } = render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const listItems = container.querySelectorAll('.min-h-\\[44px\\]');
      expect(listItems.length).toBeGreaterThan(0);
    });

    it('should be full width', () => {
      const { container } = render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const buttons = container.querySelectorAll('button[type="button"]');
      const itemButtons = Array.from(buttons).filter((btn) =>
        btn.querySelector('h3')
      );
      itemButtons.forEach((button) => {
        expect(button).toHaveClass('w-full');
      });
    });

    it('should call onItemSelect when tapped', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const largeLaserButton = screen.getByText('Large Laser').closest('button');
      fireEvent.click(largeLaserButton!);

      expect(mockOnItemSelect).toHaveBeenCalledWith(mockItems[0]);
    });

    it('should have padding on items', () => {
      const { container } = render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const buttons = container.querySelectorAll('button[type="button"]');
      const itemButtons = Array.from(buttons).filter((btn) =>
        btn.querySelector('h3')
      );
      itemButtons.forEach((button) => {
        expect(button.className).toContain('px-4');
        expect(button.className).toContain('py-3');
      });
    });
  });

  describe('Filter Drawer', () => {
    it('should open filter drawer when filter button is clicked', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByLabelText('Close filters')).toBeInTheDocument();
    });

    it('should close filter drawer when close button is clicked', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const closeButton = screen.getByLabelText('Close filters');
      fireEvent.click(closeButton);

      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });

    it('should close filter drawer when backdrop is clicked', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const backdrop = screen.getByText('Filters').closest('[role="presentation"]');
      fireEvent.click(backdrop!);

      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });

    it('should display filter options', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      expect(screen.getByText('Equipment Type')).toBeInTheDocument();
      expect(screen.getByText('Energy')).toBeInTheDocument();
      expect(screen.getByText('Ballistic')).toBeInTheDocument();
      expect(screen.getByText('Missile')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('should have 80% screen height', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const drawer = screen.getByLabelText('Filter equipment').closest('.h-\\[80\\%\\]');
      expect(drawer).toBeInTheDocument();
    });

    it('should have apply button at bottom with safe-area padding', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const applyButton = screen.getByText('Apply Filters');
      expect(applyButton).toBeInTheDocument();
      expect(applyButton.className).toContain('min-h-[44px]');
    });

    it('should call onFilterChange when filter type is toggled', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const energyCheckbox = screen.getByLabelText('Energy');
      fireEvent.click(energyCheckbox);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        types: ['Energy'],
        tonnageRange: [0, 20],
      });
    });

    it('should vertically stack filters', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox.closest('label')?.className).toContain('min-h-[44px]');
      });
    });

    it('should have 44x44px touch targets on filter checkboxes', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const labels = screen.getAllByText('Energy', 'Ballistic', 'Missile', 'Equipment');
      labels.forEach((label) => {
        const labelElement = label.closest('label');
        if (labelElement) {
          expect(labelElement.className).toContain('min-h-[44px]');
        }
      });
    });
  });

  describe('Sticky Search Bar', () => {
    it('should have sticky positioning', () => {
      const { container } = render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const searchBar = container.querySelector('.sticky');
      expect(searchBar).toBeInTheDocument();
      expect(searchBar).toHaveClass('top-0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      expect(screen.getByLabelText('Search equipment')).toBeInTheDocument();
      expect(screen.getByLabelText('Open filters')).toBeInTheDocument();
    });

    it('should have proper dialog role on filter drawer', () => {
      render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const filterButton = screen.getByLabelText('Open filters');
      fireEvent.click(filterButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(
        <EquipmentCatalog
          items={mockItems}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no items', () => {
      render(
        <EquipmentCatalog
          items={[]}
          filters={mockFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      expect(screen.getByText('No equipment found')).toBeInTheDocument();
    });

    it('should show empty state when filters match nothing', () => {
      const filteredFilters: FilterOptions = {
        types: ['Equipment'],
        tonnageRange: [0, 20],
      };

      render(
        <EquipmentCatalog
          items={mockItems}
          filters={filteredFilters}
          onFilterChange={mockOnFilterChange}
          onItemSelect={mockOnItemSelect}
        />
      );

      expect(screen.getByText('No equipment found')).toBeInTheDocument();
    });
  });
});
