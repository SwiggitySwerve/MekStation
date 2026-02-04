import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrendChart } from '../TrendChart';
import type { ITrendChartProps } from '@/components/simulation-viewer/types';

const sampleData = [
  { date: '2026-01-20', value: 100 },
  { date: '2026-01-21', value: 120 },
  { date: '2026-01-22', value: 110 },
  { date: '2026-01-23', value: 140 },
  { date: '2026-01-24', value: 130 },
  { date: '2026-01-25', value: 150 },
  { date: '2026-01-26', value: 160 },
];

const defaultProps: ITrendChartProps = {
  data: sampleData,
  timeRange: '7d',
  onTimeRangeChange: jest.fn(),
};

describe('TrendChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the chart container', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
    });

    it('renders the SVG chart with data', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByTestId('trend-chart-svg')).toBeInTheDocument();
    });

    it('renders the chart line path', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByTestId('chart-line')).toBeInTheDocument();
    });

    it('renders data point circles for each data point', () => {
      render(<TrendChart {...defaultProps} />);
      const points = screen.getAllByTestId('data-point');
      expect(points).toHaveLength(sampleData.length);
    });

    it('renders grid lines', () => {
      render(<TrendChart {...defaultProps} />);
      const gridLines = screen.getAllByTestId('grid-line');
      expect(gridLines.length).toBeGreaterThan(0);
    });

    it('renders Y-axis labels', () => {
      render(<TrendChart {...defaultProps} />);
      const yLabels = screen.getAllByTestId('y-label');
      expect(yLabels.length).toBeGreaterThan(0);
    });

    it('renders X-axis date labels', () => {
      render(<TrendChart {...defaultProps} />);
      const xLabels = screen.getAllByTestId('x-label');
      expect(xLabels.length).toBeGreaterThan(0);
    });

    it('formats date labels as MMM DD', () => {
      render(<TrendChart {...defaultProps} />);
      const xLabels = screen.getAllByTestId('x-label');
      expect(xLabels[0].textContent).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it('applies custom className', () => {
      render(<TrendChart {...defaultProps} className="custom-chart" />);
      expect(screen.getByTestId('trend-chart')).toHaveClass('custom-chart');
    });

    it('applies custom height via style', () => {
      render(<TrendChart {...defaultProps} height={400} />);
      const container = screen.getByTestId('trend-chart');
      expect(container).toHaveStyle({ height: '400px' });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty array', () => {
      render(<TrendChart data={[]} />);
      expect(screen.getByTestId('trend-chart-empty')).toBeInTheDocument();
    });

    it('shows chart icon in empty state', () => {
      render(<TrendChart data={[]} />);
      expect(screen.getByText('📊')).toBeInTheDocument();
    });

    it('shows "No data available" message', () => {
      render(<TrendChart data={[]} />);
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('shows simulation hint in empty state', () => {
      render(<TrendChart data={[]} />);
      expect(screen.getByText('Data will appear after first simulation')).toBeInTheDocument();
    });

    it('does not render SVG in empty state', () => {
      render(<TrendChart data={[]} />);
      expect(screen.queryByTestId('trend-chart-svg')).not.toBeInTheDocument();
    });
  });

  describe('Time Range Dropdown', () => {
    it('renders time range select when onTimeRangeChange provided', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByTestId('time-range-select')).toBeInTheDocument();
    });

    it('does not render time range select when onTimeRangeChange not provided', () => {
      render(<TrendChart data={sampleData} />);
      expect(screen.queryByTestId('time-range-select')).not.toBeInTheDocument();
    });

    it('renders default time range options', () => {
      render(<TrendChart {...defaultProps} />);
      const select = screen.getByTestId('time-range-select');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(5);
      expect(options[0]).toHaveTextContent('7d');
      expect(options[1]).toHaveTextContent('14d');
      expect(options[2]).toHaveTextContent('30d');
      expect(options[3]).toHaveTextContent('60d');
      expect(options[4]).toHaveTextContent('90d');
    });

    it('renders custom time range options', () => {
      render(
        <TrendChart
          {...defaultProps}
          timeRangeOptions={['7d', '30d', '90d']}
        />,
      );
      const options = screen.getByTestId('time-range-select').querySelectorAll('option');
      expect(options).toHaveLength(3);
    });

    it('sets selected value from timeRange prop', () => {
      render(<TrendChart {...defaultProps} timeRange="30d" />);
      expect(screen.getByTestId('time-range-select')).toHaveValue('30d');
    });

    it('calls onTimeRangeChange when selection changes', () => {
      const handleChange = jest.fn();
      render(<TrendChart {...defaultProps} onTimeRangeChange={handleChange} />);

      fireEvent.change(screen.getByTestId('time-range-select'), {
        target: { value: '30d' },
      });

      expect(handleChange).toHaveBeenCalledWith('30d');
    });

    it('has accessible label on select', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByLabelText('Time range')).toBeInTheDocument();
    });
  });

  describe('Threshold Line', () => {
    it('renders threshold line when threshold prop provided', () => {
      render(<TrendChart {...defaultProps} threshold={130} />);
      expect(screen.getByTestId('threshold-line')).toBeInTheDocument();
    });

    it('does not render threshold line when threshold not provided', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.queryByTestId('threshold-line')).not.toBeInTheDocument();
    });

    it('renders threshold label when both threshold and thresholdLabel provided', () => {
      render(
        <TrendChart
          {...defaultProps}
          threshold={130}
          thresholdLabel="Target"
        />,
      );
      expect(screen.getByTestId('threshold-label')).toBeInTheDocument();
      expect(screen.getByTestId('threshold-label')).toHaveTextContent('Target');
    });

    it('does not render threshold label when only threshold provided', () => {
      render(<TrendChart {...defaultProps} threshold={130} />);
      expect(screen.queryByTestId('threshold-label')).not.toBeInTheDocument();
    });

    it('threshold line has dashed stroke', () => {
      render(<TrendChart {...defaultProps} threshold={130} />);
      const line = screen.getByTestId('threshold-line');
      expect(line).toHaveAttribute('stroke-dasharray', '4');
    });
  });

  describe('Tooltip', () => {
    function triggerMouseMove() {
      const svg = screen.getByTestId('trend-chart-svg');
      const rect = { left: 0, top: 0, width: 600, height: 300 };
      jest.spyOn(svg, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);

      fireEvent.mouseMove(svg, { clientX: 300, clientY: 150 });
    }

    it('shows tooltip on mouse move over chart', () => {
      render(<TrendChart {...defaultProps} />);
      triggerMouseMove();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('shows tooltip dot on hover', () => {
      render(<TrendChart {...defaultProps} />);
      triggerMouseMove();
      expect(screen.getByTestId('tooltip-dot')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', () => {
      render(<TrendChart {...defaultProps} />);
      triggerMouseMove();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(screen.getByTestId('trend-chart-svg'));
      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
    });

    it('tooltip has pointer-events-none', () => {
      render(<TrendChart {...defaultProps} />);
      triggerMouseMove();
      expect(screen.getByTestId('tooltip')).toHaveClass('pointer-events-none');
    });
  });

  describe('Dark Mode', () => {
    it('has dark mode background class on container', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByTestId('trend-chart')).toHaveClass('dark:bg-gray-800');
    });

    it('has dark mode border class on time range select', () => {
      render(<TrendChart {...defaultProps} />);
      expect(screen.getByTestId('time-range-select')).toHaveClass('dark:border-gray-600');
    });

    it('empty state has dark mode text classes', () => {
      render(<TrendChart data={[]} />);
      const noData = screen.getByText('No data available');
      expect(noData).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Accessibility', () => {
    it('SVG has role=img and aria-label', () => {
      render(<TrendChart {...defaultProps} />);
      const svg = screen.getByTestId('trend-chart-svg');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', 'Trend chart');
    });
  });

  describe('Value Formatting', () => {
    it('formats large values with K suffix', () => {
      const bigData = [
        { date: '2026-01-20', value: 1000 },
        { date: '2026-01-21', value: 5000 },
      ];
      render(<TrendChart data={bigData} />);
      const yLabels = screen.getAllByTestId('y-label');
      const hasKSuffix = yLabels.some((l) => l.textContent?.includes('K'));
      expect(hasKSuffix).toBe(true);
    });

    it('formats million values with M suffix', () => {
      const bigData = [
        { date: '2026-01-20', value: 1000000 },
        { date: '2026-01-21', value: 2000000 },
      ];
      render(<TrendChart data={bigData} />);
      const yLabels = screen.getAllByTestId('y-label');
      const hasMSuffix = yLabels.some((l) => l.textContent?.includes('M'));
      expect(hasMSuffix).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles single data point', () => {
      render(<TrendChart data={[{ date: '2026-01-20', value: 100 }]} />);
      expect(screen.getByTestId('trend-chart-svg')).toBeInTheDocument();
      expect(screen.getAllByTestId('data-point')).toHaveLength(1);
    });

    it('handles data where all values are the same', () => {
      const flatData = [
        { date: '2026-01-20', value: 50 },
        { date: '2026-01-21', value: 50 },
        { date: '2026-01-22', value: 50 },
      ];
      render(<TrendChart data={flatData} />);
      expect(screen.getByTestId('chart-line')).toBeInTheDocument();
    });

    it('handles threshold outside data range', () => {
      render(<TrendChart {...defaultProps} threshold={500} />);
      expect(screen.getByTestId('threshold-line')).toBeInTheDocument();
    });
  });
});
