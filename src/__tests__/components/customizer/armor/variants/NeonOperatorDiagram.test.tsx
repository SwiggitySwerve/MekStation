import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NeonOperatorDiagram } from '@/components/customizer/armor/variants/NeonOperatorDiagram';
import { MechLocation } from '@/types/construction';

describe('NeonOperatorDiagram', () => {
  const mockArmorData = [
    { location: MechLocation.HEAD, current: 9, maximum: 9 },
    { location: MechLocation.CENTER_TORSO, current: 35, maximum: 47, rear: 12, rearMaximum: 23 },
    { location: MechLocation.LEFT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
    { location: MechLocation.RIGHT_TORSO, current: 24, maximum: 32, rear: 8, rearMaximum: 16 },
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

  it('should render the diagram with sci-fi title', () => {
    render(<NeonOperatorDiagram {...defaultProps} />);
    expect(screen.getByText('ARMOR STATUS')).toBeInTheDocument();
  });

  it('should render front/rear toggle buttons', () => {
    render(<NeonOperatorDiagram {...defaultProps} />);

    expect(screen.getByText('FRONT')).toBeInTheDocument();
    expect(screen.getByText('REAR')).toBeInTheDocument();
  });

  it('should toggle between front and rear views', async () => {
    const user = userEvent.setup();
    render(<NeonOperatorDiagram {...defaultProps} />);

    // Initially in front view
    expect(screen.getByText('VIEW: FRONT')).toBeInTheDocument();

    // Click rear button
    await user.click(screen.getByText('REAR'));

    // Should now show rear view
    expect(screen.getByText('VIEW: REAR')).toBeInTheDocument();
  });

  it('should display auto button with unallocated points', () => {
    const onAutoAllocate = jest.fn();
    render(<NeonOperatorDiagram {...defaultProps} onAutoAllocate={onAutoAllocate} />);

    expect(screen.getByText(/AUTO \[12\]/i)).toBeInTheDocument();
  });

  it('should call onAutoAllocate when button is clicked', async () => {
    const user = userEvent.setup();
    const onAutoAllocate = jest.fn();
    render(<NeonOperatorDiagram {...defaultProps} onAutoAllocate={onAutoAllocate} />);

    await user.click(screen.getByText(/AUTO/i));
    expect(onAutoAllocate).toHaveBeenCalledTimes(1);
  });

  it('should call onLocationClick when a location is clicked', async () => {
    const user = userEvent.setup();
    render(<NeonOperatorDiagram {...defaultProps} />);

    const headGroup = screen.getByRole('button', { name: /Head armor/i });
    await user.click(headGroup);

    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(MechLocation.HEAD);
  });

  it('should display system status info', () => {
    render(<NeonOperatorDiagram {...defaultProps} />);

    expect(screen.getByText('SYS: ONLINE')).toBeInTheDocument();
    expect(screen.getByText('UNALLOC: 12')).toBeInTheDocument();
  });

  it('should display targeting instruction', () => {
    render(<NeonOperatorDiagram {...defaultProps} />);

    expect(screen.getByText('SELECT TARGET LOCATION')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<NeonOperatorDiagram {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show only torso locations in rear view', async () => {
    const user = userEvent.setup();
    render(<NeonOperatorDiagram {...defaultProps} />);

    // Switch to rear view
    await user.click(screen.getByText('REAR'));

    // Rear view should show torso locations with R suffix
    expect(screen.getByText('CTR')).toBeInTheDocument();
    expect(screen.getByText('LTR')).toBeInTheDocument();
    expect(screen.getByText('RTR')).toBeInTheDocument();
  });
});
