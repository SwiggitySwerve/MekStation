import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KPICard } from '../KPICard';
import type { IKPICardProps } from '@/components/simulation-viewer/types';

const defaultProps: IKPICardProps = {
  label: 'Win Rate',
  value: '80%',
  comparison: '+5%',
  comparisonDirection: 'up',
  trend: [0.75, 0.76, 0.78, 0.80],
};

describe('KPICard', () => {
  describe('Rendering', () => {
    it('renders label, value, comparison, and sparkline', () => {
      render(<KPICard {...defaultProps} />);

      expect(screen.getByTestId('kpi-label')).toHaveTextContent('Win Rate');
      expect(screen.getByTestId('kpi-value')).toHaveTextContent('80%');
      expect(screen.getByTestId('kpi-comparison')).toHaveTextContent('+5%');
      expect(screen.getByTestId('kpi-trend')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline')).toBeInTheDocument();
    });

    it('renders numeric value', () => {
      render(<KPICard label="Damage" value={1500} />);

      expect(screen.getByTestId('kpi-value')).toHaveTextContent('1500');
    });

    it('renders without comparison', () => {
      render(<KPICard label="Win Rate" value="80%" />);

      expect(screen.getByTestId('kpi-label')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-value')).toBeInTheDocument();
      expect(screen.queryByTestId('kpi-comparison')).not.toBeInTheDocument();
    });

    it('renders without trend', () => {
      render(
        <KPICard
          label="Win Rate"
          value="80%"
          comparison="+5%"
          comparisonDirection="up"
        />
      );

      expect(screen.queryByTestId('kpi-trend')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sparkline')).not.toBeInTheDocument();
    });

    it('renders without comparison or trend (minimal props)', () => {
      render(<KPICard label="Total Games" value="42" />);

      expect(screen.getByTestId('kpi-label')).toHaveTextContent('Total Games');
      expect(screen.getByTestId('kpi-value')).toHaveTextContent('42');
      expect(screen.queryByTestId('kpi-comparison')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kpi-trend')).not.toBeInTheDocument();
    });

    it('does not render sparkline for empty trend array', () => {
      render(<KPICard label="Test" value="0" trend={[]} />);

      expect(screen.queryByTestId('kpi-trend')).not.toBeInTheDocument();
    });
  });

  describe('Comparison Direction Colors', () => {
    it('applies green color for up direction', () => {
      render(
        <KPICard
          label="Win Rate"
          value="80%"
          comparison="+5%"
          comparisonDirection="up"
        />
      );

      const comparison = screen.getByTestId('kpi-comparison');
      expect(comparison).toHaveClass('text-green-600');
      expect(comparison).toHaveTextContent('↑');
    });

    it('applies red color for down direction', () => {
      render(
        <KPICard
          label="Win Rate"
          value="60%"
          comparison="-10%"
          comparisonDirection="down"
        />
      );

      const comparison = screen.getByTestId('kpi-comparison');
      expect(comparison).toHaveClass('text-red-600');
      expect(comparison).toHaveTextContent('↓');
    });

    it('applies gray color for neutral direction', () => {
      render(
        <KPICard
          label="Win Rate"
          value="75%"
          comparison="0%"
          comparisonDirection="neutral"
        />
      );

      const comparison = screen.getByTestId('kpi-comparison');
      expect(comparison).toHaveClass('text-gray-600');
      expect(comparison).toHaveTextContent('→');
    });

    it('defaults to neutral when comparisonDirection is not provided', () => {
      render(
        <KPICard label="Win Rate" value="75%" comparison="0%" />
      );

      const comparison = screen.getByTestId('kpi-comparison');
      expect(comparison).toHaveClass('text-gray-600');
    });
  });

  describe('Sparkline', () => {
    it('renders SVG polyline with correct stroke color for up', () => {
      const { container } = render(
        <KPICard
          label="Metric"
          value="100"
          comparisonDirection="up"
          trend={[1, 2, 3, 4]}
        />
      );

      const polyline = container.querySelector('polyline');
      expect(polyline).toBeInTheDocument();
      expect(polyline).toHaveAttribute('stroke', '#16a34a');
    });

    it('renders SVG polyline with correct stroke color for down', () => {
      const { container } = render(
        <KPICard
          label="Metric"
          value="100"
          comparisonDirection="down"
          trend={[4, 3, 2, 1]}
        />
      );

      const polyline = container.querySelector('polyline');
      expect(polyline).toHaveAttribute('stroke', '#dc2626');
    });

    it('renders SVG polyline with correct stroke color for neutral', () => {
      const { container } = render(
        <KPICard
          label="Metric"
          value="100"
          comparisonDirection="neutral"
          trend={[2, 2, 2, 2]}
        />
      );

      const polyline = container.querySelector('polyline');
      expect(polyline).toHaveAttribute('stroke', '#4b5563');
    });

    it('has accessible role and label on SVG', () => {
      render(<KPICard {...defaultProps} />);

      const svg = screen.getByTestId('sparkline');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', 'Trend sparkline');
    });
  });

  describe('Click Handler', () => {
    it('invokes onClick when card is clicked', () => {
      const handleClick = jest.fn();
      render(<KPICard {...defaultProps} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('kpi-card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not crash when clicked without onClick handler', () => {
      render(<KPICard {...defaultProps} />);

      expect(() => {
        fireEvent.click(screen.getByTestId('kpi-card'));
      }).not.toThrow();
    });

    it('sets cursor-pointer when onClick is provided', () => {
      render(<KPICard {...defaultProps} onClick={() => {}} />);

      expect(screen.getByTestId('kpi-card')).toHaveClass('cursor-pointer');
    });

    it('sets cursor-default when onClick is not provided', () => {
      render(<KPICard {...defaultProps} />);

      expect(screen.getByTestId('kpi-card')).toHaveClass('cursor-default');
    });

    it('sets role=button and tabIndex=0 when clickable', () => {
      render(<KPICard {...defaultProps} onClick={() => {}} />);

      const card = screen.getByTestId('kpi-card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('does not set role or tabIndex when not clickable', () => {
      render(<KPICard {...defaultProps} />);

      const card = screen.getByTestId('kpi-card');
      expect(card).not.toHaveAttribute('role');
      expect(card).not.toHaveAttribute('tabindex');
    });
  });

  describe('Keyboard Accessibility', () => {
    it('invokes onClick on Enter key press', () => {
      const handleClick = jest.fn();
      render(<KPICard {...defaultProps} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByTestId('kpi-card'), { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('invokes onClick on Space key press', () => {
      const handleClick = jest.fn();
      render(<KPICard {...defaultProps} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByTestId('kpi-card'), { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not invoke on other keys', () => {
      const handleClick = jest.fn();
      render(<KPICard {...defaultProps} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByTestId('kpi-card'), { key: 'Escape' });
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not respond to keys when not clickable', () => {
      render(<KPICard {...defaultProps} />);

      expect(() => {
        fireEvent.keyDown(screen.getByTestId('kpi-card'), { key: 'Enter' });
      }).not.toThrow();
    });
  });

  describe('Hover and Focus States', () => {
    it('has shadow-md and hover:shadow-lg classes', () => {
      render(<KPICard {...defaultProps} />);

      const card = screen.getByTestId('kpi-card');
      expect(card).toHaveClass('shadow-md');
      expect(card).toHaveClass('hover:shadow-lg');
    });

    it('has transition-shadow class for smooth animation', () => {
      render(<KPICard {...defaultProps} />);

      expect(screen.getByTestId('kpi-card')).toHaveClass('transition-shadow');
    });

    it('has focus ring classes when clickable', () => {
      render(<KPICard {...defaultProps} onClick={() => {}} />);

      const card = screen.getByTestId('kpi-card');
      expect(card).toHaveClass('focus:ring-2');
      expect(card).toHaveClass('focus:ring-blue-500');
      expect(card).toHaveClass('focus:ring-offset-2');
    });

    it('does not have focus ring when not clickable', () => {
      render(<KPICard {...defaultProps} />);

      const card = screen.getByTestId('kpi-card');
      expect(card).not.toHaveClass('focus:ring-2');
    });
  });

  describe('Responsive Sizing', () => {
    it('has responsive padding classes', () => {
      render(<KPICard {...defaultProps} />);

      const card = screen.getByTestId('kpi-card');
      expect(card).toHaveClass('p-4');
      expect(card).toHaveClass('md:p-6');
    });

    it('has responsive text size classes for value', () => {
      render(<KPICard {...defaultProps} />);

      const value = screen.getByTestId('kpi-value');
      expect(value).toHaveClass('text-2xl');
      expect(value).toHaveClass('md:text-3xl');
    });

    it('has responsive sparkline container height', () => {
      render(<KPICard {...defaultProps} />);

      const trendContainer = screen.getByTestId('kpi-trend');
      expect(trendContainer).toHaveClass('h-8');
      expect(trendContainer).toHaveClass('md:h-10');
    });
  });

  describe('Dark Mode', () => {
    it('has dark mode background class', () => {
      render(<KPICard {...defaultProps} />);

      expect(screen.getByTestId('kpi-card')).toHaveClass('dark:bg-gray-800');
    });

    it('has dark mode label color', () => {
      render(<KPICard {...defaultProps} />);

      expect(screen.getByTestId('kpi-label')).toHaveClass('dark:text-gray-400');
    });

    it('has dark mode value color', () => {
      render(<KPICard {...defaultProps} />);

      expect(screen.getByTestId('kpi-value')).toHaveClass('dark:text-gray-100');
    });
  });

  describe('Custom className', () => {
    it('applies custom className to card', () => {
      render(<KPICard {...defaultProps} className="custom-class" />);

      expect(screen.getByTestId('kpi-card')).toHaveClass('custom-class');
    });
  });
});
