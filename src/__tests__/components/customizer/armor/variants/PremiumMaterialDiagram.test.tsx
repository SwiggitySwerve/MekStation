import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { PremiumMaterialDiagram } from '@/components/customizer/armor/variants/PremiumMaterialDiagram';
import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

describe('PremiumMaterialDiagram', () => {
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

  it('should render the diagram with title', () => {
    render(<PremiumMaterialDiagram {...defaultProps} />);
    expect(screen.getByText('Armor Configuration')).toBeInTheDocument();
  });

  // Note: Auto-allocate button was moved to ArmorTab.tsx

  it('should display legend with status indicators', () => {
    render(<PremiumMaterialDiagram {...defaultProps} />);

    const healthyPct = Math.round(ARMOR_STATUS.HEALTHY.min * 100);
    const moderatePct = Math.round(ARMOR_STATUS.MODERATE.min * 100);
    const lowPct = Math.round(ARMOR_STATUS.LOW.min * 100);

    expect(screen.getByText(`${healthyPct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`${moderatePct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`${lowPct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`<${lowPct}%`)).toBeInTheDocument();
  });

  it('should display instruction text', () => {
    render(<PremiumMaterialDiagram {...defaultProps} />);

    expect(
      screen.getByText('Tap any plate to adjust armor values'),
    ).toBeInTheDocument();
  });

  it('should call onLocationClick when a location is clicked', async () => {
    const user = userEvent.setup();
    render(<PremiumMaterialDiagram {...defaultProps} />);

    const headGroup = screen.getByRole('button', { name: /Head armor/i });
    await user.click(headGroup);

    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(
      MechLocation.HEAD,
    );
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PremiumMaterialDiagram {...defaultProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render all 8 mech locations', () => {
    render(<PremiumMaterialDiagram {...defaultProps} />);

    // Check for location labels (torso locations show "X-F" format for front)
    expect(screen.getByText('HD')).toBeInTheDocument();
    expect(screen.getByText('CT-F')).toBeInTheDocument();
    expect(screen.getByText('LT-F')).toBeInTheDocument();
    expect(screen.getByText('RT-F')).toBeInTheDocument();
    expect(screen.getByText('LA')).toBeInTheDocument();
    expect(screen.getByText('RA')).toBeInTheDocument();
    expect(screen.getByText('LL')).toBeInTheDocument();
    expect(screen.getByText('RL')).toBeInTheDocument();
  });

  it('should display rear armor labels for torso locations', () => {
    render(<PremiumMaterialDiagram {...defaultProps} />);

    // Check for rear labels (3 torso locations have "R" labels)
    const rearLabels = screen.getAllByText('R');
    expect(rearLabels.length).toBe(3);
  });
});
