import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CompactFilterBar } from '@/components/customizer/equipment/CompactFilterBar';
import { EquipmentCategory } from '@/types/equipment';

describe('CompactFilterBar', () => {
  const defaultProps = {
    activeCategories: new Set<EquipmentCategory>(),
    showAll: true,
    hidePrototype: false,
    hideOneShot: false,
    hideUnavailable: false,
    hideAmmoWithoutWeapon: false,
    search: '',
    onSelectCategory: jest.fn(),
    onShowAll: jest.fn(),
    onTogglePrototype: jest.fn(),
    onToggleOneShot: jest.fn(),
    onToggleUnavailable: jest.fn(),
    onToggleAmmoWithoutWeapon: jest.fn(),
    onSearchChange: jest.fn(),
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Category Buttons', () => {
    it('should render all category buttons with icons', () => {
      render(<CompactFilterBar {...defaultProps} />);

      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('💥')).toBeInTheDocument();
      expect(screen.getByText('🔨')).toBeInTheDocument();
      expect(screen.getByText('📦')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should render All button', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should highlight All button when showAll is true', () => {
      render(<CompactFilterBar {...defaultProps} showAll={true} />);
      const allButton = screen.getByText('All').closest('button');
      expect(allButton).toHaveClass('bg-accent');
    });

    it('should call onSelectCategory when category is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} showAll={false} />);

      const energyButton = screen.getByText('⚡').closest('button');
      await user.click(energyButton!);

      expect(defaultProps.onSelectCategory).toHaveBeenCalledWith(
        EquipmentCategory.ENERGY_WEAPON,
        false,
      );
    });

    it('should call onShowAll when All is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const allButton = screen.getByText('All');
      await user.click(allButton);

      expect(defaultProps.onShowAll).toHaveBeenCalledTimes(1);
    });

    it('should highlight active category', () => {
      const activeCategories = new Set([EquipmentCategory.ENERGY_WEAPON]);
      render(
        <CompactFilterBar
          {...defaultProps}
          activeCategories={activeCategories}
          showAll={false}
        />,
      );

      const energyButton = screen.getByText('⚡').closest('button');
      expect(energyButton).toHaveClass('ring-1');
    });
  });

  describe('Hide Filters Toggle', () => {
    it('should render Hide button', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('should show active hide filter count badge', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          hidePrototype={true}
          hideOneShot={true}
        />,
      );
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should toggle hide filters when clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen.getByText('Hide').closest('button');
      await user.click(hideButton!);

      expect(screen.getByText('Proto')).toBeInTheDocument();
      expect(screen.getByText('1-Shot')).toBeInTheDocument();
      expect(screen.getByText('No Wpn')).toBeInTheDocument();
      expect(screen.getByText('Unavail')).toBeInTheDocument();
    });

    it('should call onTogglePrototype when Proto is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen.getByText('Hide').closest('button');
      await user.click(hideButton!);

      const protoButton = screen.getByText('Proto');
      await user.click(protoButton);

      expect(defaultProps.onTogglePrototype).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleOneShot when 1-Shot is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen.getByText('Hide').closest('button');
      await user.click(hideButton!);

      const oneShotButton = screen.getByText('1-Shot');
      await user.click(oneShotButton);

      expect(defaultProps.onToggleOneShot).toHaveBeenCalledTimes(1);
    });

    it('should highlight active hide toggles', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} hidePrototype={true} />);

      const hideButton = screen.getByText('Hide').closest('button');
      await user.click(hideButton!);

      const protoButton = screen.getByText('Proto').closest('button');
      expect(protoButton).toHaveClass('bg-red-900/50');
    });
  });

  describe('Search Input', () => {
    it('should render search input', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should display current search value', () => {
      render(<CompactFilterBar {...defaultProps} search="laser" />);
      expect(screen.getByDisplayValue('laser')).toBeInTheDocument();
    });

    it('should call onSearchChange when typing', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'ppc');

      expect(defaultProps.onSearchChange).toHaveBeenCalled();
    });

    it('should show clear button when search has value', () => {
      render(<CompactFilterBar {...defaultProps} search="laser" />);
      expect(screen.getByTitle('Clear search')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} search="laser" />);

      const clearButton = screen.getByTitle('Clear search');
      await user.click(clearButton);

      expect(defaultProps.onSearchChange).toHaveBeenCalledWith('');
    });
  });

  describe('Clear All Filters', () => {
    it('should show Clear button when filters are active', () => {
      render(<CompactFilterBar {...defaultProps} search="test" />);
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should show Clear button when showAll is false', () => {
      render(<CompactFilterBar {...defaultProps} showAll={false} />);
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should show Clear button when hide filters are active', () => {
      render(<CompactFilterBar {...defaultProps} hidePrototype={true} />);
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should not show Clear button when no filters active', () => {
      render(<CompactFilterBar {...defaultProps} showAll={true} />);
      expect(screen.queryByText('Clear')).not.toBeInTheDocument();
    });

    it('should call onClearFilters when Clear is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} search="test" />);

      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      expect(defaultProps.onClearFilters).toHaveBeenCalledTimes(1);
    });
  });
});
