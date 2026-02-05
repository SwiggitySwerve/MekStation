import { render, screen } from '@testing-library/react';
import React from 'react';

import { ValidationBadge } from '@/components/customizer/shared/ValidationBadge';

describe('ValidationBadge', () => {
  it('should render valid status', () => {
    const { container } = render(<ValidationBadge status="valid" />);

    expect(screen.getByText('✓')).toBeInTheDocument();
    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('bg-green-900/50');
    expect(badge).toHaveClass('text-green-400');
  });

  it('should render warning status', () => {
    const { container } = render(<ValidationBadge status="warning" />);

    expect(screen.getByText('⚠')).toBeInTheDocument();
    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('bg-yellow-900/50');
  });

  it('should render error status', () => {
    const { container } = render(<ValidationBadge status="error" />);

    expect(screen.getByText('✕')).toBeInTheDocument();
    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('bg-red-900/50');
  });

  it('should render info status', () => {
    const { container } = render(<ValidationBadge status="info" />);

    expect(screen.getByText('ℹ')).toBeInTheDocument();
    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('bg-blue-900/50');
  });

  it('should display label when provided', () => {
    const { container } = render(
      <ValidationBadge status="valid" label="Valid Unit" />,
    );

    expect(screen.getByText('Valid Unit')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('bg-green-900/50');
  });

  it('should hide icon when showIcon is false', () => {
    render(<ValidationBadge status="valid" showIcon={false} />);

    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ValidationBadge status="valid" className="custom-class" />,
    );

    const badge = container.querySelector('span.inline-flex');
    expect(badge).toHaveClass('custom-class');
  });
});
