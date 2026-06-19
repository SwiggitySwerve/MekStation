import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { MegaMekDiagram } from '@/components/customizer/armor/variants/MegaMekDiagram';
import { ARMOR_STATUS } from '@/constants/armorStatus';
import { MechLocation } from '@/types/construction';

describe('MegaMekDiagram', () => {
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
    render(<MegaMekDiagram {...defaultProps} />);

    expect(screen.getByText('Armor Allocation')).toBeInTheDocument();
  });

  it('should render all 8 mech locations', () => {
    render(<MegaMekDiagram {...defaultProps} />);

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
    render(<MegaMekDiagram {...defaultProps} />);

    expect(screen.getAllByText('R')).toHaveLength(3);
  });

  it('should call onLocationClick when a location is clicked', async () => {
    const user = userEvent.setup();
    render(<MegaMekDiagram {...defaultProps} />);

    const headGroup = screen.getByRole('button', { name: /Head armor/i });
    await user.click(headGroup);

    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(
      MechLocation.HEAD,
    );
  });

  it('should display legend with status colors', () => {
    render(<MegaMekDiagram {...defaultProps} />);

    const healthyPct = Math.round(ARMOR_STATUS.HEALTHY.min * 100);
    const moderatePct = Math.round(ARMOR_STATUS.MODERATE.min * 100);
    const lowPct = Math.round(ARMOR_STATUS.LOW.min * 100);

    expect(screen.getByText(`${healthyPct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`${moderatePct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`${lowPct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`<${lowPct}%`)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MegaMekDiagram {...defaultProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
