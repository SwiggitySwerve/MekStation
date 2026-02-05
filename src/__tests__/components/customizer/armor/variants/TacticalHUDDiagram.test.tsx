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

  it('should render the diagram with military title', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);
    expect(screen.getByText('ARMOR DIAGNOSTIC')).toBeInTheDocument();
  });

  it('should display front and rear labels on torso locations', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);

    // Torso locations show stacked front/rear with "-F" and "-R" labels
    expect(screen.getByText('CT-F')).toBeInTheDocument();
    expect(screen.getByText('CT-R')).toBeInTheDocument();
  });

  // Note: Auto-allocate button was moved to ArmorTab.tsx

  it('should display status readout', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);

    expect(screen.getByText('STATUS:')).toBeInTheDocument();
    expect(screen.getByText('NOMINAL')).toBeInTheDocument();
    expect(screen.getByText('AVAIL:')).toBeInTheDocument();
  });

  it('should show OVERALLOC status when negative points', () => {
    render(<TacticalHUDDiagram {...defaultProps} unallocatedPoints={-5} />);

    expect(screen.getByText('OVERALLOC')).toBeInTheDocument();
  });

  it('should display instruction text', () => {
    render(<TacticalHUDDiagram {...defaultProps} />);

    expect(screen.getByText('SELECT LOCATION TO MODIFY')).toBeInTheDocument();
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

  it('should show online indicator', () => {
    const { container } = render(<TacticalHUDDiagram {...defaultProps} />);

    // Check for the animated pulse indicator
    const indicator = container.querySelector('.animate-pulse');
    expect(indicator).toBeInTheDocument();
  });
});
