import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { MechLocation } from '@/types/construction';

import { SchematicLocation } from '../SchematicLocation';

describe('SchematicLocation', () => {
  const defaultProps = {
    location: MechLocation.CENTER_TORSO,
    current: 35,
    maximum: 47,
    rear: 12,
    rearMaximum: 23,
    isSelected: false,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render location label', () => {
    render(<SchematicLocation {...defaultProps} />);
    expect(screen.getByText('CT')).toBeInTheDocument();
  });

  it('should render front armor value', () => {
    render(<SchematicLocation {...defaultProps} />);
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('/ 47')).toBeInTheDocument();
  });

  it('should render rear armor for torso locations', () => {
    render(<SchematicLocation {...defaultProps} />);
    expect(screen.getByText('Rear')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should not render rear for non-torso locations', () => {
    render(
      <SchematicLocation
        {...defaultProps}
        location={MechLocation.HEAD}
        rear={undefined}
      />,
    );
    expect(screen.queryByText('Rear')).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    render(<SchematicLocation {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onClick).toHaveBeenCalledWith(
      MechLocation.CENTER_TORSO,
    );
  });

  it('should show selected state', () => {
    const { container } = render(
      <SchematicLocation {...defaultProps} isSelected={true} />,
    );
    expect(container.querySelector('.ring-2')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(<SchematicLocation {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Center Torso'),
    );
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
