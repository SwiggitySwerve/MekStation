import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterPanel } from '../FilterPanel';
import type { IFilterPanelProps, IFilterDefinition } from '@/components/simulation-viewer/types';

const severityFilter: IFilterDefinition = {
  id: 'severity',
  label: 'Severity',
  options: ['critical', 'warning', 'info'],
  optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' },
};

const typeFilter: IFilterDefinition = {
  id: 'type',
  label: 'Anomaly Type',
  options: ['heat-suicide', 'passive-unit', 'no-progress'],
  optionLabels: {
    'heat-suicide': 'Heat Suicide',
    'passive-unit': 'Passive Unit',
    'no-progress': 'No Progress',
  },
};

const defaultProps: IFilterPanelProps = {
  filters: [severityFilter, typeFilter],
  activeFilters: {},
  onFilterChange: jest.fn(),
};

const activeProps: IFilterPanelProps = {
  ...defaultProps,
  activeFilters: {
    severity: ['critical', 'warning'],
    type: ['heat-suicide'],
  },
};

describe('FilterPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the filter panel container', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('renders the header with "Filters" title', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('filter-header')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('renders all filter sections', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('filter-section-severity')).toBeInTheDocument();
      expect(screen.getByTestId('filter-section-type')).toBeInTheDocument();
    });

    it('renders filter labels in summaries', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Anomaly Type')).toBeInTheDocument();
    });

    it('renders all checkbox options with labels', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
      expect(screen.getByText('Heat Suicide')).toBeInTheDocument();
      expect(screen.getByText('Passive Unit')).toBeInTheDocument();
      expect(screen.getByText('No Progress')).toBeInTheDocument();
    });

    it('renders checkboxes for each option', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('checkbox-severity-critical')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-severity-warning')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-severity-info')).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-type-heat-suicide')).toBeInTheDocument();
    });

    it('renders option as raw value when optionLabels not provided', () => {
      const filterNoLabels: IFilterDefinition = {
        id: 'status',
        label: 'Status',
        options: ['active', 'inactive'],
      };
      render(<FilterPanel {...defaultProps} filters={[filterNoLabels]} />);

      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<FilterPanel {...defaultProps} className="my-custom-class" />);

      expect(screen.getByTestId('filter-panel')).toHaveClass('my-custom-class');
    });

    it('renders details elements as open by default', () => {
      render(<FilterPanel {...defaultProps} />);

      const section = screen.getByTestId('filter-section-severity');
      expect(section).toHaveAttribute('open');
    });
  });

  describe('Active Filters', () => {
    it('shows active filter count in header', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('active-filter-count')).toHaveTextContent('(3)');
    });

    it('does not show active count when no filters active', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.queryByTestId('active-filter-count')).not.toBeInTheDocument();
    });

    it('renders active filter badges', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('active-badges')).toBeInTheDocument();
      expect(screen.getByTestId('badge-severity-critical')).toHaveTextContent('Critical');
      expect(screen.getByTestId('badge-severity-warning')).toHaveTextContent('Warning');
      expect(screen.getByTestId('badge-type-heat-suicide')).toHaveTextContent('Heat Suicide');
    });

    it('does not render badges container when no active filters', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.queryByTestId('active-badges')).not.toBeInTheDocument();
    });

    it('checks active checkboxes', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('checkbox-severity-critical')).toBeChecked();
      expect(screen.getByTestId('checkbox-severity-warning')).toBeChecked();
      expect(screen.getByTestId('checkbox-severity-info')).not.toBeChecked();
      expect(screen.getByTestId('checkbox-type-heat-suicide')).toBeChecked();
    });

    it('shows per-section active count', () => {
      render(<FilterPanel {...activeProps} />);

      const severitySummary = screen.getByTestId('filter-summary-severity');
      expect(severitySummary).toHaveTextContent('(2)');
    });
  });

  describe('Checkbox Interaction', () => {
    it('calls onFilterChange when checkbox is toggled on', () => {
      const onFilterChange = jest.fn();
      render(<FilterPanel {...defaultProps} onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByTestId('checkbox-severity-critical'));

      expect(onFilterChange).toHaveBeenCalledWith({ severity: ['critical'] });
    });

    it('calls onFilterChange when checkbox is toggled off', () => {
      const onFilterChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ severity: ['critical', 'warning'] }}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-severity-critical'));

      expect(onFilterChange).toHaveBeenCalledWith({ severity: ['warning'] });
    });

    it('removes filter key when last option is deselected', () => {
      const onFilterChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ severity: ['critical'] }}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-severity-critical'));

      expect(onFilterChange).toHaveBeenCalledWith({});
    });

    it('supports multi-select within same filter', () => {
      const onFilterChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ severity: ['critical'] }}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-severity-warning'));

      expect(onFilterChange).toHaveBeenCalledWith({
        severity: ['critical', 'warning'],
      });
    });

    it('preserves other filter groups when toggling', () => {
      const onFilterChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ severity: ['critical'], type: ['heat-suicide'] }}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('checkbox-severity-warning'));

      expect(onFilterChange).toHaveBeenCalledWith({
        severity: ['critical', 'warning'],
        type: ['heat-suicide'],
      });
    });
  });

  describe('Badge Close', () => {
    it('removes filter when badge close button is clicked', () => {
      const onFilterChange = jest.fn();
      render(
        <FilterPanel
          {...activeProps}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('badge-close-severity-critical'));

      expect(onFilterChange).toHaveBeenCalledWith({
        severity: ['warning'],
        type: ['heat-suicide'],
      });
    });

    it('removes filter key when last badge is closed', () => {
      const onFilterChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ severity: ['critical'] }}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByTestId('badge-close-severity-critical'));

      expect(onFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('Clear All', () => {
    it('shows Clear All button when filters are active', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('clear-all-button')).toBeInTheDocument();
    });

    it('does not show Clear All button when no filters active', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.queryByTestId('clear-all-button')).not.toBeInTheDocument();
    });

    it('calls onFilterChange with empty object when Clear All clicked', () => {
      const onFilterChange = jest.fn();
      render(<FilterPanel {...activeProps} onFilterChange={onFilterChange} />);

      fireEvent.click(screen.getByTestId('clear-all-button'));

      expect(onFilterChange).toHaveBeenCalledWith({});
    });

    it('has accessible aria-label on Clear All button', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('clear-all-button')).toHaveAttribute(
        'aria-label',
        'Clear all filters'
      );
    });
  });

  describe('Search', () => {
    it('does not render search input when enableSearch is false', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.queryByTestId('filter-search-input')).not.toBeInTheDocument();
    });

    it('renders search input when enableSearch is true', () => {
      render(<FilterPanel {...defaultProps} enableSearch />);

      expect(screen.getByTestId('filter-search-input')).toBeInTheDocument();
    });

    it('shows search query value in input', () => {
      render(<FilterPanel {...defaultProps} enableSearch searchQuery="test" />);

      expect(screen.getByTestId('filter-search-input')).toHaveValue('test');
    });

    it('debounces search callback by 300ms', () => {
      const onSearchChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          enableSearch
          onSearchChange={onSearchChange}
        />
      );

      fireEvent.change(screen.getByTestId('filter-search-input'), {
        target: { value: 'heat' },
      });

      expect(onSearchChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(onSearchChange).toHaveBeenCalledWith('heat');
    });

    it('resets debounce timer on subsequent input', () => {
      const onSearchChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          enableSearch
          onSearchChange={onSearchChange}
        />
      );

      fireEvent.change(screen.getByTestId('filter-search-input'), {
        target: { value: 'he' },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      fireEvent.change(screen.getByTestId('filter-search-input'), {
        target: { value: 'heat' },
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(onSearchChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith('heat');
    });

    it('does not call onSearchChange when enableSearch is false', () => {
      const onSearchChange = jest.fn();
      render(
        <FilterPanel
          {...defaultProps}
          enableSearch={false}
          onSearchChange={onSearchChange}
        />
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onSearchChange).not.toHaveBeenCalled();
    });

    it('has accessible aria-label on search input', () => {
      render(<FilterPanel {...defaultProps} enableSearch />);

      expect(screen.getByTestId('filter-search-input')).toHaveAttribute(
        'aria-label',
        'Search filters'
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('checkboxes are accessible via keyboard (native checkbox behavior)', () => {
      render(<FilterPanel {...defaultProps} />);

      const checkbox = screen.getByTestId('checkbox-severity-critical');
      expect(checkbox.tagName).toBe('INPUT');
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('Clear All button is keyboard focusable', () => {
      render(<FilterPanel {...activeProps} />);

      const clearBtn = screen.getByTestId('clear-all-button');
      expect(clearBtn.tagName).toBe('BUTTON');
      expect(clearBtn).toHaveAttribute('type', 'button');
    });

    it('badge close buttons are keyboard focusable', () => {
      render(<FilterPanel {...activeProps} />);

      const closeBtn = screen.getByTestId('badge-close-severity-critical');
      expect(closeBtn.tagName).toBe('BUTTON');
      expect(closeBtn).toHaveAttribute('type', 'button');
    });

    it('summary elements have aria-label for screen readers', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('filter-summary-severity')).toHaveAttribute(
        'aria-label',
        'Severity filter section'
      );
      expect(screen.getByTestId('filter-summary-type')).toHaveAttribute(
        'aria-label',
        'Anomaly Type filter section'
      );
    });

    it('badge close buttons have accessible aria-label', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('badge-close-severity-critical')).toHaveAttribute(
        'aria-label',
        'Remove Critical filter'
      );
    });
  });

  describe('Dark Mode', () => {
    it('has dark mode background class on container', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('filter-panel')).toHaveClass('dark:bg-gray-800');
    });

    it('has dark mode border class on container', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(screen.getByTestId('filter-panel')).toHaveClass('dark:border-gray-700');
    });

    it('has dark mode text classes on header', () => {
      render(<FilterPanel {...defaultProps} />);

      const header = screen.getByTestId('filter-header').querySelector('h3');
      expect(header).toHaveClass('dark:text-gray-300');
    });

    it('has dark mode classes on active badges', () => {
      render(<FilterPanel {...activeProps} />);

      const badge = screen.getByTestId('badge-severity-critical');
      expect(badge).toHaveClass('dark:bg-blue-900/30');
      expect(badge).toHaveClass('dark:text-blue-200');
    });

    it('has dark mode classes on search input', () => {
      render(<FilterPanel {...defaultProps} enableSearch />);

      const input = screen.getByTestId('filter-search-input');
      expect(input).toHaveClass('dark:bg-gray-700');
      expect(input).toHaveClass('dark:text-gray-100');
      expect(input).toHaveClass('dark:border-gray-600');
    });

    it('has dark mode classes on Clear All button', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('clear-all-button')).toHaveClass('dark:text-red-400');
    });
  });

  describe('Responsive', () => {
    it('uses details elements for collapsible sections', () => {
      render(<FilterPanel {...defaultProps} />);

      const section = screen.getByTestId('filter-section-severity');
      expect(section.tagName).toBe('DETAILS');
    });

    it('uses summary elements for section headers', () => {
      render(<FilterPanel {...defaultProps} />);

      const summary = screen.getByTestId('filter-summary-severity');
      expect(summary.tagName).toBe('SUMMARY');
    });

    it('details can be toggled via click on summary', () => {
      render(<FilterPanel {...defaultProps} />);

      const details = screen.getByTestId('filter-section-severity');
      const summary = screen.getByTestId('filter-summary-severity');

      expect(details).toHaveAttribute('open');
      fireEvent.click(summary);
      expect(details).not.toHaveAttribute('open');
    });
  });

  describe('Edge Cases', () => {
    it('renders empty state when no filters provided', () => {
      render(<FilterPanel {...defaultProps} filters={[]} />);

      expect(screen.getByTestId('empty-filters-message')).toHaveTextContent(
        'No filters available'
      );
    });

    it('renders single filter correctly', () => {
      render(<FilterPanel {...defaultProps} filters={[severityFilter]} />);

      expect(screen.getByTestId('filter-section-severity')).toBeInTheDocument();
      expect(screen.queryByTestId('filter-section-type')).not.toBeInTheDocument();
    });

    it('handles activeFilters with keys not matching any filter definition', () => {
      render(
        <FilterPanel
          {...defaultProps}
          activeFilters={{ unknown: ['value'] }}
        />
      );

      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('active-badges')).not.toBeInTheDocument();
    });

    it('handles filter with empty options array', () => {
      const emptyFilter: IFilterDefinition = {
        id: 'empty',
        label: 'Empty',
        options: [],
      };
      render(<FilterPanel {...defaultProps} filters={[emptyFilter]} />);

      expect(screen.getByTestId('filter-section-empty')).toBeInTheDocument();
      expect(screen.getByTestId('filter-options-empty')).toBeInTheDocument();
    });

    it('syncs local search when searchQuery prop changes', () => {
      const { rerender } = render(
        <FilterPanel {...defaultProps} enableSearch searchQuery="initial" />
      );

      expect(screen.getByTestId('filter-search-input')).toHaveValue('initial');

      rerender(
        <FilterPanel {...defaultProps} enableSearch searchQuery="updated" />
      );

      expect(screen.getByTestId('filter-search-input')).toHaveValue('updated');
    });
  });

  describe('Styling', () => {
    it('has correct container classes', () => {
      render(<FilterPanel {...defaultProps} />);

      const panel = screen.getByTestId('filter-panel');
      expect(panel).toHaveClass('bg-white');
      expect(panel).toHaveClass('rounded-lg');
      expect(panel).toHaveClass('p-4');
      expect(panel).toHaveClass('border');
      expect(panel).toHaveClass('border-gray-200');
    });

    it('has correct badge styling classes', () => {
      render(<FilterPanel {...activeProps} />);

      const badge = screen.getByTestId('badge-severity-critical');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveClass('text-blue-800');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1');
      expect(badge).toHaveClass('text-sm');
      expect(badge).toHaveClass('font-medium');
    });

    it('has correct search input styling', () => {
      render(<FilterPanel {...defaultProps} enableSearch />);

      const input = screen.getByTestId('filter-search-input');
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('px-4');
      expect(input).toHaveClass('py-2');
      expect(input).toHaveClass('rounded-md');
      expect(input).toHaveClass('focus:ring-2');
      expect(input).toHaveClass('focus:ring-blue-500');
    });

    it('has correct Clear All button styling', () => {
      render(<FilterPanel {...activeProps} />);

      const btn = screen.getByTestId('clear-all-button');
      expect(btn).toHaveClass('text-sm');
      expect(btn).toHaveClass('text-red-600');
      expect(btn).toHaveClass('hover:underline');
      expect(btn).toHaveClass('focus:ring-2');
      expect(btn).toHaveClass('focus:ring-blue-500');
    });

    it('has correct checkbox styling', () => {
      render(<FilterPanel {...defaultProps} />);

      const checkbox = screen.getByTestId('checkbox-severity-critical');
      expect(checkbox).toHaveClass('accent-blue-600');
      expect(checkbox).toHaveClass('h-4');
      expect(checkbox).toHaveClass('w-4');
    });
  });
});
