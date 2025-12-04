import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { useUnitStore } from '@/stores/useUnitStore';
import { ArmorDiagramProps } from '@/components/customizer/armor/ArmorDiagram';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/hooks/useTechBaseSync', () => ({
  useTechBaseSync: jest.fn(() => ({
    filteredOptions: { armor: [] },
  })),
}));

jest.mock('@/components/customizer/armor/ArmorDiagram', () => ({
  ArmorDiagram: ({ onLocationClick }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="armor-diagram">
      <button onClick={(): void => { (onLocationClick as (location: string) => void)('HEAD'); }}>Head</button>
    </div>
  ),
}));

jest.mock('@/components/customizer/armor/LocationArmorEditor', () => ({
  LocationArmorEditor: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="location-armor-editor">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('ArmorTab', () => {
  const mockStoreValues = {
    tonnage: 50,
    componentTechBases: {},
    armorType: 'Standard',
    armorTonnage: 10,
    armorAllocation: {
      head: 9,
      centerTorso: 16,
      centerTorsoRear: 5,
      leftTorso: 12,
      leftTorsoRear: 4,
      rightTorso: 12,
      rightTorsoRear: 4,
      leftArm: 8,
      rightArm: 8,
      leftLeg: 12,
      rightLeg: 12,
    },
    setArmorType: jest.fn(),
    setArmorTonnage: jest.fn(),
    setLocationArmor: jest.fn(),
    autoAllocateArmor: jest.fn(),
    maximizeArmor: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUnitStore as jest.Mock).mockImplementation((selector: (state: typeof mockStoreValues) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockStoreValues);
      }
      return undefined;
    });
  });

  it('should render armor tab', () => {
    render(<ArmorTab />);
    
    expect(screen.getByTestId('armor-diagram')).toBeInTheDocument();
  });

  it('should display armor type', () => {
    render(<ArmorTab />);
    
    expect(screen.getByText(/Type:/i)).toBeInTheDocument();
  });

  it('should display armor tonnage', () => {
    render(<ArmorTab />);
    
    expect(screen.getByText(/Points\/Ton/i)).toBeInTheDocument();
  });

  it('should render armor configuration', () => {
    render(<ArmorTab />);
    
    expect(screen.getByText(/Type:/i)).toBeInTheDocument();
    expect(screen.getByText(/Tonnage:/i)).toBeInTheDocument();
  });

  it('should display location editor when location is selected', async () => {
    const user = userEvent.setup();
    render(<ArmorTab />);
    
    const headButton = screen.getByText('Head');
    await user.click(headButton);
    
    expect(screen.getByTestId('location-armor-editor')).toBeInTheDocument();
  });

  it('should render armor diagram', () => {
    render(<ArmorTab />);
    
    expect(screen.getByTestId('armor-diagram')).toBeInTheDocument();
  });

  it('should display read-only message when in read-only mode', () => {
    render(<ArmorTab readOnly={true} />);
    
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ArmorTab className="custom-class" />);
    
    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});

