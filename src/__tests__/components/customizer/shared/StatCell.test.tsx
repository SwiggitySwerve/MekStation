import { render, screen } from '@testing-library/react';
import React from 'react';

import { StatCell } from '@/components/customizer/shared/StatCell';

describe('StatCell', () => {
  it('should render label and value', () => {
    render(<StatCell label="Weight" value={50} />);

    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should render unit when provided', () => {
    render(<StatCell label="Weight" value={50} unit="t" />);

    expect(screen.getByText('t')).toBeInTheDocument();
  });

  it('should apply default variant styling', () => {
    const { container } = render(<StatCell label="Weight" value={50} />);

    const value = container.querySelector('.text-slate-100');
    expect(value).toBeInTheDocument();
  });

  it('should apply warning variant styling', () => {
    const { container } = render(
      <StatCell label="Weight" value={50} variant="warning" />,
    );

    const value = container.querySelector('.text-yellow-400');
    expect(value).toBeInTheDocument();
  });

  it('should apply error variant styling', () => {
    const { container } = render(
      <StatCell label="Weight" value={50} variant="error" />,
    );

    const value = container.querySelector('.text-red-400');
    expect(value).toBeInTheDocument();
  });

  it('should apply success variant styling', () => {
    const { container } = render(
      <StatCell label="Weight" value={50} variant="success" />,
    );

    const value = container.querySelector('.text-green-400');
    expect(value).toBeInTheDocument();
  });

  it('should render string values', () => {
    render(<StatCell label="Name" value="Atlas" />);

    expect(screen.getByText('Atlas')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StatCell label="Weight" value={50} className="custom-class" />,
    );

    const cell = container.firstChild;
    expect(cell).toHaveClass('custom-class');
  });
});
