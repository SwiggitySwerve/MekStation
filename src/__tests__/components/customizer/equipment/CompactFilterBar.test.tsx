import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CompactFilterBar } from '@/components/customizer/equipment/CompactFilterBar';
import { getCatalogCapacityNotice } from '@/components/customizer/equipment/EquipmentBrowser.model';
import { BUILD_STATE_TINT_CLASS } from '@/components/customizer/shared/BuildStatusLabel';
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
    it('offers a scroll cue only for overflow and can return to earlier categories', async () => {
      const user = userEvent.setup();
      const scrollWidth = jest
        .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
        .mockReturnValue(800);
      const clientWidth = jest
        .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
        .mockReturnValue(300);
      try {
        render(<CompactFilterBar {...defaultProps} />);
        const categories = screen.getByRole('group', {
          name: 'Equipment categories',
        });
        const scrollBy = jest.fn();
        Object.defineProperty(categories, 'scrollBy', { value: scrollBy });
        await user.click(
          screen.getByRole('button', { name: 'More equipment categories' }),
        );
        expect(scrollBy).toHaveBeenLastCalledWith({
          left: 240,
          behavior: 'auto',
        });
        categories.scrollLeft = 500;
        fireEvent.scroll(categories);
        await user.click(
          screen.getByRole('button', { name: 'Previous equipment categories' }),
        );
        expect(scrollBy).toHaveBeenLastCalledWith({
          left: -240,
          behavior: 'auto',
        });
        clientWidth.mockReturnValue(800);
        fireEvent.scroll(categories);
        expect(
          screen.queryByRole('button', { name: /equipment categories$/ }),
        ).not.toBeInTheDocument();
        expect(defaultProps.onSelectCategory).not.toHaveBeenCalled();
      } finally {
        scrollWidth.mockRestore();
        clientWidth.mockRestore();
      }
    });

    it('should render accessible category chips', () => {
      render(<CompactFilterBar {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: 'Energy' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Ballistic' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Missile' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Artillery' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Physical' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ammo' })).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Electronics' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Other' })).toBeInTheDocument();
    });

    it('should render All button', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('should highlight All button when showAll is true', () => {
      render(<CompactFilterBar {...defaultProps} showAll={true} />);
      const allButton = screen.getByText('All').closest('button');
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should call onSelectCategory when category is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} showAll={false} />);

      const energyButton = screen
        .getByRole('button', { name: 'Energy' })
        .closest('button');
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

      const energyButton = screen
        .getByRole('button', { name: 'Energy' })
        .closest('button');
      expect(energyButton).toHaveClass('border-accent', 'text-accent');
      expect(energyButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Hide Filters Toggle', () => {
    it('should render Hide button', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      ).toBeInTheDocument();
    });

    it('names the active visibility filters', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          hidePrototype={true}
          hideOneShot={true}
        />,
      );
      expect(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      ).toHaveTextContent('Filters · No prototypes, No one-shot');
    });

    it('includes the applied availability criteria in the Filters label', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          hideUnavailable={true}
          availabilitySummary="Inner Sphere · introduced ≤3028"
        />,
      );
      expect(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      ).toHaveTextContent('Filters · Inner Sphere · introduced ≤3028');
    });

    it('puts the result count and free capacity on one summary line', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          resultSummary="182 items"
          capacity={getCatalogCapacityNotice({
            remainingWeight: 4,
            remainingSlots: 16,
          })}
        />,
      );
      const capacity = screen.getByTestId('equipment-catalog-capacity');
      expect(capacity.parentElement).toHaveTextContent(
        '182 items · 4.0 t free · 16 slots free',
      );
    });

    it('shows a legal, exactly-full unit as neutral text without a callout', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          resultSummary="182 items"
          capacity={getCatalogCapacityNotice({
            remainingWeight: 0,
            remainingSlots: 12,
          })}
        />,
      );
      const capacity = screen.getByTestId('equipment-catalog-capacity');
      expect(capacity).toHaveTextContent(
        '0.0 t free \u00B7 unit is at its tonnage limit',
      );
      expect(capacity).toHaveAttribute('data-capacity-state', 'full');
      expect(capacity.className).toBe('');
      expect(capacity.querySelector('[data-icon-name]')).toBeNull();
    });

    it('warns in the error callout only when over the limit', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          resultSummary="182 items"
          capacity={getCatalogCapacityNotice({
            remainingWeight: -7,
            remainingSlots: 12,
          })}
        />,
      );
      const capacity = screen.getByTestId('equipment-catalog-capacity');
      expect(capacity).toHaveTextContent(
        'Over by 7.0 t \u2014 remove equipment or armor',
      );
      expect(capacity).toHaveClass(...BUILD_STATE_TINT_CLASS.error.split(' '));
      expect(
        capacity.querySelector('[data-icon-name="error"]'),
      ).toBeInTheDocument();
    });
    it('names the first active filter compactly for narrow screens and keeps the full text in the accessible name', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          hideUnavailable={true}
          hidePrototype={true}
          availabilitySummary="Inner Sphere · available in 3028"
          compactAvailabilitySummary="IS · 3028"
        />,
      );
      const button = screen.getByRole('button', {
        name: /^Visibility filters/,
      });
      expect(button).toHaveAccessibleName(
        'Visibility filters: Inner Sphere · available in 3028, No prototypes',
      );
      expect(button.querySelector('.sm\\:hidden')).toHaveTextContent(
        '· IS · 3028 +1',
      );
    });

    it('keeps the plain accessible name when no filter is active', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: 'Visibility filters' }),
      ).toBeInTheDocument();
    });
    it('labels the help popover in plain words', () => {
      render(<CompactFilterBar {...defaultProps} />);
      expect(
        screen.getByRole('button', { name: 'How to add equipment' }),
      ).toHaveTextContent('How to add');
    });

    it('should toggle hide filters when clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen
        .getByRole('button', { name: /^Visibility filters/ })
        .closest('button');
      await user.click(hideButton!);

      expect(screen.getByText('Prototype')).toBeInTheDocument();
      expect(screen.getByText('One-shot')).toBeInTheDocument();
      expect(screen.getByText('Ammo without weapon')).toBeInTheDocument();
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('should call onTogglePrototype when Proto is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen
        .getByRole('button', { name: /^Visibility filters/ })
        .closest('button');
      await user.click(hideButton!);

      const protoButton = screen.getByText('Prototype');
      await user.click(protoButton);

      expect(defaultProps.onTogglePrototype).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleOneShot when 1-Shot is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen
        .getByRole('button', { name: /^Visibility filters/ })
        .closest('button');
      await user.click(hideButton!);

      const oneShotButton = screen.getByText('One-shot');
      await user.click(oneShotButton);

      expect(defaultProps.onToggleOneShot).toHaveBeenCalledTimes(1);
    });

    it('should highlight active hide toggles', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} hidePrototype={true} />);

      const hideButton = screen
        .getByRole('button', { name: /^Visibility filters/ })
        .closest('button');
      await user.click(hideButton!);

      const protoButton = screen.getByText('Prototype').closest('button');
      expect(protoButton).toHaveAttribute('aria-pressed', 'true');
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
      fireEvent.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('should show Clear button when showAll is false', () => {
      render(<CompactFilterBar {...defaultProps} showAll={false} />);
      fireEvent.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('should show Clear button when hide filters are active', () => {
      render(<CompactFilterBar {...defaultProps} hidePrototype={true} />);
      fireEvent.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('keeps reset inside the closed filters menu', () => {
      render(<CompactFilterBar {...defaultProps} showAll={true} />);
      expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
    });

    it('should call onClearFilters when Clear is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} search="test" />);

      await user.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      const clearButton = screen.getByText('Clear filters');
      await user.click(clearButton);

      expect(defaultProps.onClearFilters).toHaveBeenCalledTimes(1);
    });
  });
});
