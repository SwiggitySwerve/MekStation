import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

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

  it('should render all 8 mech locations, plus the rear torso inset', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    // Every location is labelled once in the front view and once in the
    // location list; the torsos appear again in the rear inset.
    const drawn = (code: string) =>
      screen.getAllByText(code).filter((node) => node.closest('svg'));
    for (const code of ['HD', 'LA', 'RA', 'LL', 'RL']) {
      expect(drawn(code)).toHaveLength(1);
      expect(screen.getAllByText(code)).toHaveLength(2);
    }
    for (const code of ['CT', 'LT', 'RT']) {
      expect(drawn(code)).toHaveLength(2);
      expect(screen.getAllByText(code)).toHaveLength(3);
    }
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
    expect(centerTorso.getByText('F 35')).toBeInTheDocument();
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

  it('should explain fill height in a one-line key instead of a status legend', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    expect(screen.getByText('Fill = Points of Max')).toBeInTheDocument();
    expect(screen.queryByText(/% of max:/)).not.toBeInTheDocument();
    expect(screen.queryByText('60%+')).not.toBeInTheDocument();
    expect(screen.queryByText(/F = front/)).not.toBeInTheDocument();
  });

  it('should label the views and keep the instructions for screen readers', () => {
    render(<CleanTechDiagram {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Front' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rear' })).toBeInTheDocument();
    expect(
      screen.queryByText(/click a location to edit/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Tab to a location or move between locations/),
    ).toHaveClass('sr-only');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CleanTechDiagram {...defaultProps} className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  // Note: Over-allocation button styling test moved to ArmorTab.test.tsx
});
