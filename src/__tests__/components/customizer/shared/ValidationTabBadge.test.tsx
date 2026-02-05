import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  ValidationTabBadge,
  ValidationTabBadgeCompact,
} from '@/components/customizer/shared/ValidationTabBadge';
import { TabValidationCounts } from '@/utils/validation/validationNavigation';

describe('ValidationTabBadge', () => {
  const zeroCounts: TabValidationCounts = { errors: 0, warnings: 0, infos: 0 };
  const errorCounts: TabValidationCounts = { errors: 3, warnings: 0, infos: 0 };
  const warningCounts: TabValidationCounts = {
    errors: 0,
    warnings: 5,
    infos: 0,
  };
  const mixedCounts: TabValidationCounts = { errors: 2, warnings: 3, infos: 1 };

  describe('with zero counts', () => {
    it('should return null when showZero is false (default)', () => {
      const { container } = render(<ValidationTabBadge counts={zeroCounts} />);
      expect(container.firstChild).toBeNull();
    });

    it('should still return null when showZero is true but counts are zero', () => {
      const { container } = render(
        <ValidationTabBadge counts={zeroCounts} showZero={true} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('with error counts', () => {
    it('should render red badge with error count', () => {
      render(<ValidationTabBadge counts={errorCounts} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      const badge = screen.getByText('3');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should have correct aria-label', () => {
      render(<ValidationTabBadge counts={errorCounts} />);

      expect(screen.getByLabelText('3 errors')).toBeInTheDocument();
    });

    it('should use singular form for 1 error', () => {
      render(
        <ValidationTabBadge counts={{ errors: 1, warnings: 0, infos: 0 }} />,
      );

      expect(screen.getByLabelText('1 error')).toBeInTheDocument();
    });
  });

  describe('with warning counts only', () => {
    it('should render amber badge with warning count', () => {
      render(<ValidationTabBadge counts={warningCounts} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      const badge = screen.getByText('5');
      expect(badge).toHaveClass('bg-amber-500');
    });

    it('should have correct aria-label', () => {
      render(<ValidationTabBadge counts={warningCounts} />);

      expect(screen.getByLabelText('5 warnings')).toBeInTheDocument();
    });
  });

  describe('with mixed counts', () => {
    it('should prioritize errors over warnings', () => {
      render(<ValidationTabBadge counts={mixedCounts} />);

      expect(screen.getByText('2')).toBeInTheDocument();
      const badge = screen.getByText('2');
      expect(badge).toHaveClass('bg-red-500');
    });
  });

  describe('with large numbers', () => {
    it('should cap display at 99+', () => {
      render(
        <ValidationTabBadge counts={{ errors: 150, warnings: 0, infos: 0 }} />,
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ValidationTabBadge counts={errorCounts} className="custom-class" />,
      );

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('custom-class');
    });
  });
});

describe('ValidationTabBadgeCompact', () => {
  it('should return null when both counts are zero', () => {
    const { container } = render(
      <ValidationTabBadgeCompact errorCount={0} warningCount={0} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('should show red dot for errors', () => {
    const { container } = render(
      <ValidationTabBadgeCompact errorCount={5} warningCount={0} />,
    );

    const dot = container.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();
  });

  it('should show amber dot for warnings only', () => {
    const { container } = render(
      <ValidationTabBadgeCompact errorCount={0} warningCount={3} />,
    );

    const dot = container.querySelector('.bg-amber-500');
    expect(dot).toBeInTheDocument();
  });

  it('should show only red dot when both errors and warnings exist', () => {
    const { container } = render(
      <ValidationTabBadgeCompact errorCount={2} warningCount={3} />,
    );

    const redDot = container.querySelector('.bg-red-500');
    const amberDot = container.querySelector('.bg-amber-500');

    expect(redDot).toBeInTheDocument();
    expect(amberDot).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ValidationTabBadgeCompact
        errorCount={1}
        warningCount={0}
        className="my-class"
      />,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('my-class');
  });
});
