import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ARMOR_STATUS } from '@/components/customizer/armor/shared/ArmorFills';
import { CleanTechDiagram } from '@/components/customizer/armor/variants/CleanTechDiagram';
import { MechLocation } from '@/types/construction';

describe('CleanTechDiagram', () => {
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
    render(<CleanTechDiagram {...defaultProps} />);
    expect(screen.getByText('Armor Allocation')).toBeInTheDocument();
  });

  it('should render all 8 mech locations', () => {
    render(<CleanTechDiagram {...defaultProps} />);

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

  it('should display armor values', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    // Check for armor values
    expect(screen.getByText('9')).toBeInTheDocument(); // Head
    expect(screen.getByText('35')).toBeInTheDocument(); // CT front
  });

  // Note: Auto-allocate button was moved to ArmorTab.tsx

  it('should call onLocationClick when a location is clicked', async () => {
    const user = userEvent.setup();
    render(<CleanTechDiagram {...defaultProps} />);

    // Click on Head location (the first button group)
    const headGroup = screen.getByRole('button', { name: /Head armor/i });
    await user.click(headGroup);

    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(
      MechLocation.HEAD,
    );
  });

  it('should display legend with status colors', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    const healthyPct = Math.round(ARMOR_STATUS.HEALTHY.min * 100);
    const moderatePct = Math.round(ARMOR_STATUS.MODERATE.min * 100);
    const lowPct = Math.round(ARMOR_STATUS.LOW.min * 100);

    expect(screen.getByText(`${healthyPct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`${moderatePct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`${lowPct}%+`)).toBeInTheDocument();
    expect(screen.getByText(`<${lowPct}%`)).toBeInTheDocument();
  });

  it('should display instructions text', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    expect(
      screen.getByText('Click a location to edit armor values'),
    ).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CleanTechDiagram {...defaultProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  // Note: Over-allocation button styling test moved to ArmorTab.test.tsx
});
