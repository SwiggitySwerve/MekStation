import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverviewTab } from '@/components/customizer/tabs/OverviewTab';
import { useUnitStore } from '@/stores/useUnitStore';
import { useTabManagerStore } from '@/stores/useTabManagerStore';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/stores/useTabManagerStore', () => ({
  useTabManagerStore: jest.fn(),
}));

jest.mock('@/components/customizer/shared/TechBaseConfiguration', () => ({
  TechBaseConfiguration: () => <div data-testid="tech-base-config" />,
}));

describe('OverviewTab', () => {
  const mockUseUnitStore = useUnitStore as jest.MockedFunction<typeof useUnitStore>;
  const mockUseTabManagerStore = useTabManagerStore as jest.MockedFunction<typeof useTabManagerStore>;
  const mockStoreValues = {
    id: 'unit-1',
    chassis: 'Atlas',
    clanName: '',
    model: 'AS7-D',
    mulId: '-1',
    year: 2750,
    rulesLevel: 'STANDARD',
    techBaseMode: 'INNER_SPHERE',
    componentTechBases: {},
    engineType: 'Standard Fusion',
    engineRating: 300,
    gyroType: 'Standard',
    internalStructureType: 'Standard',
    cockpitType: 'Standard',
    heatSinkType: 'Single',
    heatSinkCount: 10,
    armorType: 'Standard',
    enhancement: null,
    setChassis: jest.fn(),
    setClanName: jest.fn(),
    setModel: jest.fn(),
    setMulId: jest.fn(),
    setYear: jest.fn(),
    setRulesLevel: jest.fn(),
    setTechBaseMode: jest.fn(),
    setComponentTechBase: jest.fn(),
  };

  const mockTabManager = {
    renameTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // TS: the test uses a narrowed mock state; suppress strict selector typing
    // @ts-expect-error - mock store is partial for testing
    mockUseUnitStore.mockImplementation((selector) => selector(mockStoreValues));
    mockUseTabManagerStore.mockImplementation((selector: (state: typeof mockTabManager) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockTabManager);
      }
      return undefined;
    });
  });

  it('should render overview tab', () => {
    render(<OverviewTab />);
    
    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AS7-D')).toBeInTheDocument();
  });

  it('should display unit information', () => {
    render(<OverviewTab />);
    
    expect(screen.getByDisplayValue('Atlas')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2750')).toBeInTheDocument();
  });

  it('should render tech base configuration', () => {
    render(<OverviewTab />);
    
    expect(screen.getByTestId('tech-base-config')).toBeInTheDocument();
  });

  it('should call setChassis when chassis changes', async () => {
    const user = userEvent.setup();
    render(<OverviewTab />);
    
    const chassisInput = screen.getByDisplayValue('Atlas');
    await user.clear(chassisInput);
    await user.type(chassisInput, 'Marauder');
    
    expect(mockStoreValues.setChassis).toHaveBeenCalled();
  });

  it('should display read-only message when in read-only mode', () => {
    render(<OverviewTab readOnly={true} />);
    
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<OverviewTab className="custom-class" />);
    
    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});

