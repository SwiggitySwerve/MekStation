import React from 'react';
import { render, screen } from '@testing-library/react';
import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { useUnitStore } from '@/stores/useUnitStore';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/hooks/useTechBaseSync', () => ({
  useTechBaseSync: jest.fn(() => ({
    filteredOptions: {
      engine: [],
      gyro: [],
      structure: [],
      cockpit: [],
      heatSink: [],
    },
  })),
}));

jest.mock('@/hooks/useUnitCalculations', () => ({
  useUnitCalculations: jest.fn(() => ({
    engineWeight: 10,
    gyroWeight: 3,
    structureWeight: 5,
    cockpitWeight: 3,
    heatSinkWeight: 0,
    totalWeight: 21,
  })),
}));

describe('StructureTab', () => {
  const mockStoreValues = {
    tonnage: 50,
    walkMP: 5,
    runMP: 8,
    jumpMP: 0,
    engineType: 'Standard Fusion',
    engineRating: 250,
    gyroType: 'Standard',
    internalStructureType: 'Standard',
    cockpitType: 'Standard',
    heatSinkType: 'Single',
    heatSinkCount: 10,
    configuration: 'Biped',
    setTonnage: jest.fn(),
    setWalkMP: jest.fn(),
    setEngineType: jest.fn(),
    setGyroType: jest.fn(),
    setInternalStructureType: jest.fn(),
    setCockpitType: jest.fn(),
    setHeatSinkType: jest.fn(),
    setHeatSinkCount: jest.fn(),
    setConfiguration: jest.fn(),
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

  it('should render structure tab', () => {
    render(<StructureTab />);
    
    expect(screen.getByText(/Tonnage/i)).toBeInTheDocument();
  });

  it('should display unit tonnage', () => {
    render(<StructureTab />);
    
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('should display movement stats', () => {
    render(<StructureTab />);
    
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('should display read-only message when in read-only mode', () => {
    render(<StructureTab readOnly={true} />);
    
    expect(screen.getByText(/read-only mode/i)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<StructureTab className="custom-class" />);
    
    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});

