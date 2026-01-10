import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArmorDiagram } from '@/components/customizer/armor/ArmorDiagram';
import { MechLocation } from '@/types/construction';

// Mock ArmorLocation
jest.mock('@/components/customizer/armor/ArmorLocation', () => ({
  ArmorLocation: ({ location, onClick }: { location: MechLocation; onClick?: () => void }) => (
    <div data-testid={`armor-location-${location}`} onClick={onClick}>
      {location}
    </div>
  ),
}));

// Mock ArmorLegend
jest.mock('@/components/customizer/armor/ArmorLegend', () => ({
  ArmorLegend: () => <div data-testid="armor-legend" />,
}));

describe('ArmorDiagram', () => {
  const defaultProps = {
    armorData: [
      {
        location: MechLocation.HEAD,
        current: 9,
        maximum: 9,
      },
      {
        location: MechLocation.CENTER_TORSO,
        current: 16,
        maximum: 20,
        rear: 5,
        rearMaximum: 4,
      },
    ],
    selectedLocation: null,
    unallocatedPoints: 0,
    onLocationClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render armor diagram', () => {
    render(<ArmorDiagram {...defaultProps} />);
    
    expect(screen.getByText('Armor Allocation')).toBeInTheDocument();
  });

  it('should render armor locations', () => {
    render(<ArmorDiagram {...defaultProps} />);
    
    // MechLocation enum values are like "Head", "Center Torso" etc.
    expect(screen.getByTestId(`armor-location-${MechLocation.HEAD}`)).toBeInTheDocument();
    expect(screen.getByTestId(`armor-location-${MechLocation.CENTER_TORSO}`)).toBeInTheDocument();
  });

  it('should call onLocationClick when location is clicked', async () => {
    const user = userEvent.setup();
    render(<ArmorDiagram {...defaultProps} />);
    
    const headLocation = screen.getByTestId(`armor-location-${MechLocation.HEAD}`);
    await user.click(headLocation);
    
    expect(defaultProps.onLocationClick).toHaveBeenCalledWith(MechLocation.HEAD);
  });

  it('should display auto-allocate button when onAutoAllocate is provided', () => {
    render(<ArmorDiagram {...defaultProps} onAutoAllocate={jest.fn()} />);
    
    expect(screen.getByText(/Auto Allocate/i)).toBeInTheDocument();
  });

  it('should call onAutoAllocate when button is clicked', async () => {
    const user = userEvent.setup();
    const onAutoAllocate = jest.fn();
    render(<ArmorDiagram {...defaultProps} onAutoAllocate={onAutoAllocate} />);
    
    const autoAllocateButton = screen.getByText(/Auto Allocate/i);
    await user.click(autoAllocateButton);
    
    expect(onAutoAllocate).toHaveBeenCalledTimes(1);
  });

  it('should display unallocated points in button', () => {
    render(<ArmorDiagram {...defaultProps} unallocatedPoints={10} onAutoAllocate={jest.fn()} />);
    
    expect(screen.getByText(/10 pts/i)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ArmorDiagram {...defaultProps} className="custom-class" />);
    
    const diagram = container.firstChild;
    expect(diagram).toHaveClass('custom-class');
  });
});

