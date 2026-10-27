import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CleanTechDiagram } from '@/components/customizer/armor/variants/CleanTechDiagram';
import { ARMOR_STATUS } from '@/constants/armorStatus';
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

    // Check for location labels (torsos show the short name, then front and rear values)
    expect(screen.getByText('HD')).toBeInTheDocument();
    expect(screen.getByText('CT')).toBeInTheDocument();
    expect(screen.getByText('LT')).toBeInTheDocument();
    expect(screen.getByText('RT')).toBeInTheDocument();
    expect(screen.getByText('LA')).toBeInTheDocument();
    expect(screen.getByText('RA')).toBeInTheDocument();
    expect(screen.getByText('LL')).toBeInTheDocument();
    expect(screen.getByText('RL')).toBeInTheDocument();
  });

  it('should display armor values', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    // Check for armor values on the plates (the location table repeats them)
    const head = within(screen.getByRole('button', { name: /^Head armor/ }));
    const centerTorso = within(
      screen.getByRole('button', { name: /^Center Torso armor/ }),
    );
    expect(head.getByText('9')).toBeInTheDocument(); // Head
    expect(centerTorso.getByText('47')).toBeInTheDocument(); // CT 35 front + 12 rear
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
      screen.getByText(
        'Matches the record sheet · left side on the left · click a location to edit',
      ),
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
