import { render, screen } from '@testing-library/react';
import React from 'react';

import { StructureTab } from '@/components/customizer/tabs/StructureTab';
import { useUnitStore } from '@/stores/useUnitStore';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/hooks/useTechBaseSync', () => ({
  useTechBaseSync: jest.fn(() => ({
    filteredOptions: {
      engines: [],
      gyros: [],
      structures: [],
      cockpits: [],
      heatSinks: [],
      armors: [],
    },
    defaults: {
      engineType: 'Standard Fusion',
      gyroType: 'Standard',
      structureType: 'Standard',
      cockpitType: 'Standard',
      heatSinkType: 'Single',
      armorType: 'Standard',
    },
    isEngineValid: () => true,
    isGyroValid: () => true,
    isStructureValid: () => true,
    isCockpitValid: () => true,
    isHeatSinkValid: () => true,
    isArmorValid: () => true,
    getValidatedSelections: (s: unknown) => s,
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
    (useUnitStore as jest.Mock).mockImplementation(
      (selector: (state: typeof mockStoreValues) => unknown) => {
        if (typeof selector === 'function') {
          return selector(mockStoreValues);
        }
        return undefined;
      },
    );
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

  it('should disable inputs in read-only mode', () => {
    render(<StructureTab readOnly={true} />);

    // In read-only mode, inputs should be disabled
    const tonnageInput = screen.getByDisplayValue('50');
    expect(tonnageInput).toBeDisabled();
  });

  it('labels the weight subtotal as structure, systems and armor out of tonnage', () => {
    render(<StructureTab />);

    const subtotal = screen.getByTestId('structure-subtotal');
    expect(subtotal).toHaveTextContent(/Structure, systems & armor/);
    expect(subtotal).toHaveTextContent(/of 50t/);
  });

  it('shows heat sink stats in the Cooling header, not as a separate row', () => {
    render(<StructureTab />);

    const heading = screen.getByRole('heading', { name: 'Cooling' });
    const stats = screen.getByTestId('structure-heat-sink-stats');
    expect(heading.parentElement).toContainElement(stats);
  });

  it('merges base and final mobility into one column with helper text', () => {
    render(<StructureTab />);

    expect(screen.queryByText('Base')).not.toBeInTheDocument();
    expect(screen.getByTitle('Final Walk MP')).toHaveTextContent('5');
    const walkInput = screen.getByRole('spinbutton', { name: 'Walk MP' });
    expect(walkInput).toHaveAccessibleDescription(/Range .* for a 50t mech/);
  });

  it('shows Run MP as plain derived text on the stepper column, not a field', () => {
    render(<StructureTab />);

    const run = screen.getByLabelText('Run MP');
    const stepper = screen.getByRole('spinbutton', { name: 'Walk MP' })
      .parentElement as HTMLElement;
    expect(run).toHaveTextContent('8');
    expect(run).not.toHaveClass('border');
    expect(run.tagName).toBe('OUTPUT');
    expect(run.parentElement).toHaveTextContent(/8\s*→\s*8\s*final/);
    expect(stepper).toHaveClass('w-[8.5rem]');
    expect(screen.getByTitle('Final Run MP')).toBeInTheDocument();
  });

  it('mutes Jump Type, but keeps it usable, while no jump jets are installed', () => {
    render(<StructureTab />);

    const jumpType = screen.getByLabelText('Jump type');
    expect(jumpType).toBeEnabled();
    expect(jumpType).toHaveClass('text-text-theme-secondary');
    expect(jumpType).toHaveAccessibleDescription(/No jump jets installed/);
  });

  it('puts every Chassis control on the same grid template', () => {
    render(<StructureTab />);

    const rowGrids = [
      screen.getByRole('spinbutton', { name: 'Tonnage' }),
      screen.getByLabelText('Engine'),
      screen.getByLabelText('Heat sink type'),
      screen.getByRole('spinbutton', { name: 'Heat sink count' }),
    ].map((control) => {
      let row: HTMLElement | null = control;
      while (row && !row.classList.contains('grid')) row = row.parentElement;
      return row?.className;
    });
    expect(new Set(rowGrids).size).toBe(1);
  });

  it('says plainly that mechanical jump boosters are not supported', () => {
    render(<StructureTab />);

    expect(
      screen.getByText('Mechanical jump boosters are not supported yet.'),
    ).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<StructureTab className="custom-class" />);

    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});
