import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { MechLocation } from '@/types/construction';

import { SchematicDiagram } from '../SchematicDiagram';

describe('SchematicDiagram', () => {
  const mockArmorData = [
    { location: MechLocation.HEAD, current: 9, maximum: 9 },
    {
      location: MechLocation.CENTER_TORSO,
      current: 35,
      maximum: 47,
      rear: 12,
      rearMaximum: 23,
    },
    {
      location: MechLocation.LEFT_TORSO,
      current: 24,
      maximum: 32,
      rear: 8,
      rearMaximum: 16,
    },
    {
      location: MechLocation.RIGHT_TORSO,
      current: 24,
      maximum: 32,
      rear: 8,
      rearMaximum: 16,
    },
    { location: MechLocation.LEFT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.RIGHT_ARM, current: 20, maximum: 24 },
    { location: MechLocation.LEFT_LEG, current: 28, maximum: 32 },
    { location: MechLocation.RIGHT_LEG, current: 28, maximum: 32 },
  ];

  const defaultProps = {
    armorData: mockArmorData,
    selectedLocation: null,
    onLocationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all 8 mech locations', () => {
    render(<SchematicDiagram {...defaultProps} />);
    // Both desktop and mobile layouts render, so use getAllByText
    expect(screen.getAllByText('HD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('RL').length).toBeGreaterThan(0);
  });

  it('should use anatomically correct grid layout', () => {
    const { container } = render(<SchematicDiagram {...defaultProps} />);
    const grid = container.querySelector('[style*="grid-template-areas"]');
    expect(grid).toBeInTheDocument();
  });

  it('should call onLocationClick when a location is clicked', () => {
    render(<SchematicDiagram {...defaultProps} />);
    // Both desktop and mobile layouts render, so get all and click first
    const headButtons = screen.getAllByRole('button', {
      name: /Head armor: 9 of 9/i,
    });
    fireEvent.click(headButtons[0]);
    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(
      MechLocation.HEAD,
    );
  });

  it('should show selected state for selected location', () => {
    const { container } = render(
      <SchematicDiagram
        {...defaultProps}
        selectedLocation={MechLocation.HEAD}
      />,
    );
    const selectedButton = container.querySelector('.ring-2');
    expect(selectedButton).toBeInTheDocument();
  });

  // Note: Auto-allocate button was moved to ArmorTab.tsx
});
