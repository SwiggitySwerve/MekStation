import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { TabNavigation } from '../TabNavigation';

const defaultProps = {
  activeTab: 'campaign-dashboard' as const,
  onTabChange: jest.fn(),
};

describe('TabNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all three tabs', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('tab-encounter-history')).toBeInTheDocument();
      expect(screen.getByTestId('tab-analysis-bugs')).toBeInTheDocument();
    });

    it('renders correct tab labels', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByText('Campaign Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Encounter History')).toBeInTheDocument();
      expect(screen.getByText('Analysis & Bugs')).toBeInTheDocument();
    });

    it('renders tablist container', () => {
      render(<TabNavigation {...defaultProps} />);

      const tablist = screen.getByTestId('tab-navigation');
      expect(tablist).toHaveAttribute('role', 'tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Simulation viewer tabs');
    });

    it('applies custom className', () => {
      render(<TabNavigation {...defaultProps} className="my-tabs" />);
      expect(screen.getByTestId('tab-navigation')).toHaveClass('my-tabs');
    });
  });

  describe('Active Tab Styling', () => {
    it('active tab has correct classes', () => {
      render(<TabNavigation {...defaultProps} />);

      const active = screen.getByTestId('tab-campaign-dashboard');
      expect(active).toHaveClass('bg-white');
      expect(active).toHaveClass('border-b-2');
      expect(active).toHaveClass('border-blue-600');
      expect(active).toHaveClass('text-blue-600');
    });

    it('inactive tabs have correct classes', () => {
      render(<TabNavigation {...defaultProps} />);

      const inactive = screen.getByTestId('tab-encounter-history');
      expect(inactive).toHaveClass('bg-gray-100');
      expect(inactive).toHaveClass('text-gray-600');
    });

    it('active tab changes when activeTab prop changes', () => {
      const { rerender } = render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveClass(
        'text-blue-600',
      );
      expect(screen.getByTestId('tab-encounter-history')).toHaveClass(
        'text-gray-600',
      );

      rerender(
        <TabNavigation {...defaultProps} activeTab="encounter-history" />,
      );

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveClass(
        'text-gray-600',
      );
      expect(screen.getByTestId('tab-encounter-history')).toHaveClass(
        'text-blue-600',
      );
    });

    it('hover class on inactive tabs', () => {
      render(<TabNavigation {...defaultProps} />);

      const inactive = screen.getByTestId('tab-encounter-history');
      expect(inactive).toHaveClass('hover:bg-gray-200');
    });

    it('active tab does not have hover:bg-gray-200', () => {
      render(<TabNavigation {...defaultProps} />);

      const active = screen.getByTestId('tab-campaign-dashboard');
      expect(active).not.toHaveClass('hover:bg-gray-200');
    });
  });

  describe('Click Handling', () => {
    it('calls onTabChange when tab is clicked', () => {
      const handleChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={handleChange} />);

      fireEvent.click(screen.getByTestId('tab-encounter-history'));
      expect(handleChange).toHaveBeenCalledWith('encounter-history');
    });

    it('calls onTabChange with analysis-bugs', () => {
      const handleChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={handleChange} />);

      fireEvent.click(screen.getByTestId('tab-analysis-bugs'));
      expect(handleChange).toHaveBeenCalledWith('analysis-bugs');
    });

    it('calls onTabChange when clicking already-active tab', () => {
      const handleChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={handleChange} />);

      fireEvent.click(screen.getByTestId('tab-campaign-dashboard'));
      expect(handleChange).toHaveBeenCalledWith('campaign-dashboard');
    });
  });

  describe('Keyboard Navigation', () => {
    it('ArrowRight moves to next tab', () => {
      const handleChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={handleChange} />);

      fireEvent.keyDown(screen.getByTestId('tab-navigation'), {
        key: 'ArrowRight',
      });

      expect(handleChange).toHaveBeenCalledWith('encounter-history');
    });

    it('ArrowLeft moves to previous tab', () => {
      const handleChange = jest.fn();
      render(
        <TabNavigation
          activeTab="encounter-history"
          onTabChange={handleChange}
        />,
      );

      fireEvent.keyDown(screen.getByTestId('tab-navigation'), {
        key: 'ArrowLeft',
      });

      expect(handleChange).toHaveBeenCalledWith('campaign-dashboard');
    });

    it('ArrowRight wraps from last to first tab', () => {
      const handleChange = jest.fn();
      render(
        <TabNavigation activeTab="analysis-bugs" onTabChange={handleChange} />,
      );

      fireEvent.keyDown(screen.getByTestId('tab-navigation'), {
        key: 'ArrowRight',
      });

      expect(handleChange).toHaveBeenCalledWith('campaign-dashboard');
    });

    it('ArrowLeft wraps from first to last tab', () => {
      const handleChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={handleChange} />);

      fireEvent.keyDown(screen.getByTestId('tab-navigation'), {
        key: 'ArrowLeft',
      });

      expect(handleChange).toHaveBeenCalledWith('analysis-bugs');
    });

    it('ignores other keys', () => {
      const handleChange = jest.fn();
      render(<TabNavigation {...defaultProps} onTabChange={handleChange} />);

      fireEvent.keyDown(screen.getByTestId('tab-navigation'), {
        key: 'Enter',
      });

      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('ARIA Attributes', () => {
    it('active tab has aria-selected=true', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('inactive tabs have aria-selected=false', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-encounter-history')).toHaveAttribute(
        'aria-selected',
        'false',
      );
      expect(screen.getByTestId('tab-analysis-bugs')).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    it('each tab has role=tab', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveAttribute(
        'role',
        'tab',
      );
      expect(screen.getByTestId('tab-encounter-history')).toHaveAttribute(
        'role',
        'tab',
      );
      expect(screen.getByTestId('tab-analysis-bugs')).toHaveAttribute(
        'role',
        'tab',
      );
    });

    it('active tab has tabIndex=0, inactive have tabIndex=-1', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveAttribute(
        'tabindex',
        '0',
      );
      expect(screen.getByTestId('tab-encounter-history')).toHaveAttribute(
        'tabindex',
        '-1',
      );
      expect(screen.getByTestId('tab-analysis-bugs')).toHaveAttribute(
        'tabindex',
        '-1',
      );
    });

    it('tabs have aria-controls pointing to panel ids', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveAttribute(
        'aria-controls',
        'panel-campaign-dashboard',
      );
      expect(screen.getByTestId('tab-encounter-history')).toHaveAttribute(
        'aria-controls',
        'panel-encounter-history',
      );
    });

    it('tabs have id attributes', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveAttribute(
        'id',
        'tab-campaign-dashboard',
      );
    });
  });

  describe('Responsive Layout', () => {
    it('tabs have flex-1 for mobile full-width', () => {
      render(<TabNavigation {...defaultProps} />);

      const tab = screen.getByTestId('tab-campaign-dashboard');
      expect(tab).toHaveClass('flex-1');
    });

    it('tabs have sm:flex-none for desktop auto-width', () => {
      render(<TabNavigation {...defaultProps} />);

      const tab = screen.getByTestId('tab-campaign-dashboard');
      expect(tab).toHaveClass('sm:flex-none');
    });
  });

  describe('Dark Mode', () => {
    it('container has dark mode border class', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-navigation')).toHaveClass(
        'dark:border-gray-700',
      );
    });

    it('active tab has dark mode background', () => {
      render(<TabNavigation {...defaultProps} />);

      expect(screen.getByTestId('tab-campaign-dashboard')).toHaveClass(
        'dark:bg-gray-800',
      );
    });

    it('inactive tab has dark mode classes', () => {
      render(<TabNavigation {...defaultProps} />);

      const inactive = screen.getByTestId('tab-encounter-history');
      expect(inactive).toHaveClass('dark:bg-gray-900');
      expect(inactive).toHaveClass('dark:text-gray-400');
      expect(inactive).toHaveClass('dark:hover:bg-gray-800');
    });
  });

  describe('Focus Management', () => {
    it('tabs have focus ring classes', () => {
      render(<TabNavigation {...defaultProps} />);

      const tab = screen.getByTestId('tab-campaign-dashboard');
      expect(tab).toHaveClass('focus:ring-2');
      expect(tab).toHaveClass('focus:ring-blue-500');
    });
  });
});
