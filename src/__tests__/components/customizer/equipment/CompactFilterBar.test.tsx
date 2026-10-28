import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CompactFilterBar } from '@/components/customizer/equipment/CompactFilterBar';
import { getCatalogCapacityNotice } from '@/components/customizer/equipment/EquipmentBrowser.model';
import {
  BUILD_STATE_TINT_CLASS,
  BUILD_STATUS_KIND_TEXT_CLASS,
} from '@/components/customizer/shared/BuildStatusLabel';
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

    it('counts the categories cut off on the scroll button side', () => {
      const scrollWidth = jest
        .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
        .mockReturnValue(900);
      const clientWidth = jest
        .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
        .mockReturnValue(300);
      // The row spans x 0-300; its nine tabs are 100px apart, so the
      // fourth (300-400) and later ones are cut off: six of them.
      const rect = jest
        .spyOn(Element.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: Element) {
          const siblings = this.parentElement
            ? Array.from(this.parentElement.children)
            : [];
          const index =
            this.parentElement?.getAttribute('aria-label') ===
            'Equipment categories'
              ? siblings.indexOf(this)
              : -1;
          const left = index < 0 ? 0 : index * 100;
          const width = index < 0 ? 300 : 100;
          return {
            left,
            right: left + width,
            top: 0,
            bottom: 44,
            width,
            height: 44,
            x: left,
            y: 0,
            toJSON: () => ({}),
          } as DOMRect;
        });
      try {
        render(<CompactFilterBar {...defaultProps} />);
        const more = screen.getByRole('button', {
          name: '6 more equipment categories',
        });
        expect(more).toHaveTextContent(/^\+6$/);
      } finally {
        rect.mockRestore();
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
      ).toHaveTextContent('Filters · No Prototypes, No One-Shot');
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

    it('keeps the free tonnage neutral and adds a warning note when exactly full', () => {
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
      expect(capacity).toHaveTextContent('0.0 t free');
      expect(capacity).not.toHaveTextContent(/tonnage limit/);
      expect(capacity).toHaveAttribute('data-capacity-state', 'full');
      expect(capacity.className).toBe('');
      expect(capacity.querySelector('[data-icon-name]')).toBeNull();
      // The limit is a plain warning note: orange text and its triangle
      // icon, one wording on every width, and no bordered, tinted box, so it
      // never looks like the clickable status chip.
      const limit = screen.getByTestId('equipment-catalog-limit');
      expect(limit).toHaveTextContent(/^At tonnage limit$/);
      expect(
        screen.queryByTestId('equipment-catalog-limit-reason'),
      ).not.toBeInTheDocument();
      expect(limit).toHaveClass(BUILD_STATUS_KIND_TEXT_CLASS.warning);
      for (const tint of BUILD_STATE_TINT_CLASS.warning.split(' '))
        expect(limit).not.toHaveClass(tint);
      expect(
        limit.querySelector('[data-severity-icon="warning"]'),
      ).toBeInTheDocument();
    });

    it('says why the limit matters, visibly from 640px and to assistive tech on phones', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          resultSummary="182 items"
          capacity={getCatalogCapacityNotice({
            remainingWeight: 0,
            remainingSlots: 12,
            tonnage: 100,
          })}
        />,
      );
      expect(screen.getByTestId('equipment-catalog-limit')).toHaveTextContent(
        'At tonnage limit — adding equipment will exceed 100.0 t',
      );
      expect(screen.getByTestId('equipment-catalog-limit-reason')).toHaveClass(
        'sr-only',
        'sm:not-sr-only',
      );
    });

    it('leads the count line with the limit note, under the id Add buttons reference', () => {
      render(
        <CompactFilterBar
          {...defaultProps}
          resultSummary="182 items"
          limitNoteId="catalog-limit"
          capacity={getCatalogCapacityNotice({
            remainingWeight: 0,
            remainingSlots: 12,
            tonnage: 100,
          })}
        />,
      );
      const limit = screen.getByTestId('equipment-catalog-limit');
      expect(limit).toHaveAttribute('id', 'catalog-limit');
      // The cause reads before the counts.
      expect(limit.parentElement!.firstElementChild).toBe(limit);
      expect(
        limit.compareDocumentPosition(screen.getByText('182 items')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
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
          availabilitySummary="Inner Sphere · Available in 3028"
          compactAvailabilitySummary="IS · 3028"
        />,
      );
      const button = screen.getByRole('button', {
        name: /^Visibility filters/,
      });
      expect(button).toHaveAccessibleName(
        'Visibility filters: Inner Sphere · Available in 3028, No Prototypes',
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
        screen.getByRole('button', { name: 'How to Add Equipment' }),
      ).toHaveTextContent('How to Add');
    });

    it('should toggle hide filters when clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} />);

      const hideButton = screen
        .getByRole('button', { name: /^Visibility filters/ })
        .closest('button');
      await user.click(hideButton!);

      expect(screen.getByText('Prototype')).toBeInTheDocument();
      expect(screen.getByText('One-Shot')).toBeInTheDocument();
      expect(screen.getByText('Ammo Without Weapon')).toBeInTheDocument();
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

      const oneShotButton = screen.getByText('One-Shot');
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
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should show Clear button when showAll is false', () => {
      render(<CompactFilterBar {...defaultProps} showAll={false} />);
      fireEvent.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('should show Clear button when hide filters are active', () => {
      render(<CompactFilterBar {...defaultProps} hidePrototype={true} />);
      fireEvent.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('keeps reset inside the closed filters menu', () => {
      render(<CompactFilterBar {...defaultProps} showAll={true} />);
      expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
    });

    it('should call onClearFilters when Clear is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactFilterBar {...defaultProps} search="test" />);

      await user.click(
        screen.getByRole('button', { name: /^Visibility filters/ }),
      );
      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(defaultProps.onClearFilters).toHaveBeenCalledTimes(1);
    });
  });
});
