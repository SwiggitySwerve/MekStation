import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DrillDownLink } from '../DrillDownLink';

describe('DrillDownLink', () => {
  describe('Rendering', () => {
    it('renders label text', () => {
      render(
        <DrillDownLink label="View All Anomalies" targetTab="analysis-bugs" />,
      );

      expect(screen.getByTestId('drill-down-label')).toHaveTextContent('View All Anomalies');
    });

    it('renders link container', () => {
      render(
        <DrillDownLink label="View Details" targetTab="encounter-history" />,
      );

      expect(screen.getByTestId('drill-down-link')).toBeInTheDocument();
    });

    it('renders without icon by default', () => {
      render(
        <DrillDownLink label="View Details" targetTab="encounter-history" />,
      );

      expect(screen.queryByTestId('drill-down-icon')).not.toBeInTheDocument();
    });

    it('renders with known icon', () => {
      render(
        <DrillDownLink
          label="View Details"
          targetTab="encounter-history"
          icon="arrow-right"
        />,
      );

      const icon = screen.getByTestId('drill-down-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveTextContent('→');
    });

    it('renders with external-link icon', () => {
      render(
        <DrillDownLink
          label="Open"
          targetTab="analysis-bugs"
          icon="external-link"
        />,
      );

      expect(screen.getByTestId('drill-down-icon')).toHaveTextContent('↗');
    });

    it('renders with chevron-right icon', () => {
      render(
        <DrillDownLink
          label="Next"
          targetTab="campaign-dashboard"
          icon="chevron-right"
        />,
      );

      expect(screen.getByTestId('drill-down-icon')).toHaveTextContent('›');
    });

    it('falls back to raw icon string for unknown icons', () => {
      render(
        <DrillDownLink
          label="Custom"
          targetTab="analysis-bugs"
          icon="★"
        />,
      );

      expect(screen.getByTestId('drill-down-icon')).toHaveTextContent('★');
    });

    it('icon has aria-hidden', () => {
      render(
        <DrillDownLink
          label="View"
          targetTab="encounter-history"
          icon="arrow-right"
        />,
      );

      expect(screen.getByTestId('drill-down-icon')).toHaveAttribute('aria-hidden', 'true');
    });

    it('stores targetTab as data attribute', () => {
      render(
        <DrillDownLink label="Go" targetTab="analysis-bugs" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveAttribute(
        'data-target-tab',
        'analysis-bugs',
      );
    });

    it('applies custom className', () => {
      render(
        <DrillDownLink
          label="Link"
          targetTab="campaign-dashboard"
          className="my-link"
        />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveClass('my-link');
    });
  });

  describe('Click Handler', () => {
    it('calls onClick with targetTab on click', () => {
      const handleClick = jest.fn();
      render(
        <DrillDownLink
          label="View Anomalies"
          targetTab="analysis-bugs"
          onClick={handleClick}
        />,
      );

      fireEvent.click(screen.getByTestId('drill-down-link'));
      expect(handleClick).toHaveBeenCalledWith('analysis-bugs', undefined);
    });

    it('calls onClick with targetTab and filter', () => {
      const handleClick = jest.fn();
      const filter = { severity: 'critical' };
      render(
        <DrillDownLink
          label="Critical Only"
          targetTab="analysis-bugs"
          filter={filter}
          onClick={handleClick}
        />,
      );

      fireEvent.click(screen.getByTestId('drill-down-link'));
      expect(handleClick).toHaveBeenCalledWith('analysis-bugs', filter);
    });

    it('does not throw when clicked without onClick', () => {
      render(
        <DrillDownLink label="Safe" targetTab="campaign-dashboard" />,
      );

      expect(() => {
        fireEvent.click(screen.getByTestId('drill-down-link'));
      }).not.toThrow();
    });
  });

  describe('Keyboard Navigation', () => {
    it('triggers onClick on Enter key', () => {
      const handleClick = jest.fn();
      render(
        <DrillDownLink
          label="Enter Test"
          targetTab="encounter-history"
          onClick={handleClick}
        />,
      );

      fireEvent.keyDown(screen.getByTestId('drill-down-link'), { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith('encounter-history', undefined);
    });

    it('triggers onClick on Space key', () => {
      const handleClick = jest.fn();
      render(
        <DrillDownLink
          label="Space Test"
          targetTab="encounter-history"
          onClick={handleClick}
        />,
      );

      fireEvent.keyDown(screen.getByTestId('drill-down-link'), { key: ' ' });
      expect(handleClick).toHaveBeenCalledWith('encounter-history', undefined);
    });

    it('does not trigger on other keys', () => {
      const handleClick = jest.fn();
      render(
        <DrillDownLink
          label="Other Key"
          targetTab="encounter-history"
          onClick={handleClick}
        />,
      );

      fireEvent.keyDown(screen.getByTestId('drill-down-link'), { key: 'Escape' });
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has role=link', () => {
      render(
        <DrillDownLink label="Accessible" targetTab="campaign-dashboard" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveAttribute('role', 'link');
    });

    it('has tabIndex=0 for keyboard focus', () => {
      render(
        <DrillDownLink label="Focusable" targetTab="campaign-dashboard" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Focus and Hover Styles', () => {
    it('has focus ring classes', () => {
      render(
        <DrillDownLink label="Focus" targetTab="campaign-dashboard" />,
      );

      const link = screen.getByTestId('drill-down-link');
      expect(link).toHaveClass('focus:ring-2');
      expect(link).toHaveClass('focus:ring-blue-500');
      expect(link).toHaveClass('focus:ring-offset-2');
      expect(link).toHaveClass('focus:outline-none');
    });

    it('has hover:underline class', () => {
      render(
        <DrillDownLink label="Hover" targetTab="campaign-dashboard" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveClass('hover:underline');
    });

    it('has cursor-pointer class', () => {
      render(
        <DrillDownLink label="Pointer" targetTab="campaign-dashboard" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveClass('cursor-pointer');
    });
  });

  describe('Dark Mode', () => {
    it('has dark mode text color', () => {
      render(
        <DrillDownLink label="Dark" targetTab="campaign-dashboard" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveClass('dark:text-blue-400');
    });

    it('has light mode text color', () => {
      render(
        <DrillDownLink label="Light" targetTab="campaign-dashboard" />,
      );

      expect(screen.getByTestId('drill-down-link')).toHaveClass('text-blue-600');
    });
  });

  describe('Layout', () => {
    it('has inline-flex items-center gap-2 layout', () => {
      render(
        <DrillDownLink label="Layout" targetTab="campaign-dashboard" />,
      );

      const link = screen.getByTestId('drill-down-link');
      expect(link).toHaveClass('inline-flex');
      expect(link).toHaveClass('items-center');
      expect(link).toHaveClass('gap-2');
    });
  });
});
