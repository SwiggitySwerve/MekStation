import { render, screen } from '@testing-library/react';
import React from 'react';

import { ArmorLegend } from '@/components/customizer/armor/ArmorLegend';

describe('ArmorLegend', () => {
  it('should render legend items', () => {
    render(<ArmorLegend />);

    expect(screen.getByText('Head')).toBeInTheDocument();
    expect(screen.getByText('Torso/Limbs')).toBeInTheDocument();
    expect(screen.getByText('Rear Armor')).toBeInTheDocument();
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ArmorLegend className="custom-class" />);

    const legend = container.firstChild;
    expect(legend).toHaveClass('custom-class');
  });
});
