import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import type {
  IFilterPanelProps,
  IFilterDefinition,
} from '@/components/simulation-viewer/types';

import { FilterPanel } from '../FilterPanel';

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

      expect(
        screen.getByTestId('checkbox-severity-critical'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('checkbox-severity-warning'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('checkbox-severity-info')).toBeInTheDocument();
      expect(
        screen.getByTestId('checkbox-type-heat-suicide'),
      ).toBeInTheDocument();
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

      expect(screen.getByTestId('active-filter-count')).toHaveTextContent(
        '(3)',
      );
    });

    it('does not show active count when no filters active', () => {
      render(<FilterPanel {...defaultProps} />);

      expect(
        screen.queryByTestId('active-filter-count'),
      ).not.toBeInTheDocument();
    });

    it('renders active filter badges', () => {
      render(<FilterPanel {...activeProps} />);

      expect(screen.getByTestId('active-badges')).toBeInTheDocument();
      expect(screen.getByTestId('badge-severity-critical')).toHaveTextContent(
        'Critical',
      );
      expect(screen.getByTestId('badge-severity-warning')).toHaveTextContent(
        'Warning',
      );
      expect(screen.getByTestId('badge-type-heat-suicide')).toHaveTextContent(
        'Heat Suicide',
      );
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
        />,
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
        />,
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
        />,
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
        />,
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
      render(<FilterPanel {...activeProps} onFilterChange={onFilterChange} />);

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
        />,
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
        'Clear all filters',
      );
    });
  });
});
