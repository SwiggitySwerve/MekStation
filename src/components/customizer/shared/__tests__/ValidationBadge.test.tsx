/**
 * ValidationBadge Component Tests
 *
 * Tests rendering of validation status badges.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { ValidationStatus } from '@/utils/colors/statusColors';

import { ValidationBadge } from '../ValidationBadge';

// =============================================================================
// Tests
// =============================================================================

describe('ValidationBadge', () => {
  describe('status rendering', () => {
    it('should render valid status with checkmark', () => {
      render(<ValidationBadge status="valid" label="Valid" />);

      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    it('should render warning status with warning icon', () => {
      render(<ValidationBadge status="warning" label="Warning" />);

      expect(screen.getByText('⚠')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should render error status with X icon', () => {
      render(<ValidationBadge status="error" label="Error" />);

      expect(screen.getByText('✕')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render info status with info icon', () => {
      render(<ValidationBadge status="info" label="Info" />);

      expect(screen.getByText('ℹ')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });
  });

  describe('icon visibility', () => {
    it('should show icon by default', () => {
      render(<ValidationBadge status="valid" />);

      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should hide icon when showIcon is false', () => {
      render(<ValidationBadge status="valid" showIcon={false} label="Valid" />);

      expect(screen.queryByText('✓')).not.toBeInTheDocument();
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });
  });

  describe('label', () => {
    it('should render without label', () => {
      render(<ValidationBadge status="valid" />);

      // Should still render the icon
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(<ValidationBadge status="error" label="3 Errors" />);

      expect(screen.getByText('3 Errors')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ValidationBadge status="valid" className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should have appropriate color classes for valid status', () => {
      const { container } = render(<ValidationBadge status="valid" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-green');
      expect(badge.className).toContain('text-green');
    });

    it('should have appropriate color classes for error status', () => {
      const { container } = render(<ValidationBadge status="error" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-red');
      expect(badge.className).toContain('text-red');
    });

    it('should have appropriate color classes for warning status', () => {
      const { container } = render(<ValidationBadge status="warning" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-yellow');
      expect(badge.className).toContain('text-yellow');
    });

    it('should have appropriate color classes for info status', () => {
      const { container } = render(<ValidationBadge status="info" />);

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bg-blue');
      expect(badge.className).toContain('text-blue');
    });
  });

  describe('all statuses render correctly', () => {
    const statuses: ValidationStatus[] = ['valid', 'warning', 'error', 'info'];

    statuses.forEach((status) => {
      it(`should render ${status} status without errors`, () => {
        expect(() => {
          render(
            <ValidationBadge status={status} label={`Status: ${status}`} />,
          );
        }).not.toThrow();
      });
    });
  });
});
