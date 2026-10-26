import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { TacticalHUDDiagram } from '@/components/customizer/armor/variants/TacticalHUDDiagram';
import { MechLocation } from '@/types/construction';

describe('TacticalHUDDiagram', () => {
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
    unallocatedPoints: 12,
    onLocationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the diagram with shared title', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);
    expect(screen.getByText('Armor Allocation')).toBeInTheDocument();
  });

  it('should display front and rear labels on torso locations', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);

    // Torso locations show the front value over a smaller "R" rear line
    expect(screen.getByText('CT')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-armor-face="rear"]')).toHaveLength(
      3,
    );
  });

  // Note: Auto-allocate button was moved to ArmorTab.tsx

  it('should display status readout', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);

    expect(screen.getByText('Unallocated:')).toBeInTheDocument();
    expect(screen.getByText('12 points')).toBeInTheDocument();
  });

  it('should show OVERALLOC status when negative points', () => {
    render(<TacticalHUDDiagram {...defaultProps} unallocatedPoints={-5} />);

    expect(screen.getByText('Over allocated')).toBeInTheDocument();
  });

  it('should display instruction text', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);

    expect(
      screen.getByText('Front view · click a location to edit'),
    ).toBeInTheDocument();
  });

  it('should call onLocationClick when a location is clicked', async () => {
    const user = userEvent.setup();
    render(<TacticalHUDDiagram {...defaultProps} />);

    const headGroup = screen.getByRole('button', { name: /Head armor/i });
    await user.click(headGroup);

    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(
      MechLocation.HEAD,
    );
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TacticalHUDDiagram {...defaultProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should retain the HUD line treatment', () => {
    const { container } = render(<TacticalHUDDiagram {...defaultProps} />);

    const plates = container.querySelectorAll('[data-armor-plate]');
    expect(plates).toHaveLength(8);
    plates.forEach((plate) =>
      expect(plate).toHaveAttribute('stroke-dasharray', '3 2'),
    );
  });
});
