import { render, screen, within } from '@testing-library/react';
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
    heatSinkWeight: 12,
    freeHeatSinks: 10,
    heatSinksRequiringWeight: 12,
    integralHeatSinks: 12,
    externalHeatSinks: 10,
    totalHeatDissipation: 22,
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
    heatSinkCount: 22,
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
    expect(stats).toHaveTextContent(/22\s*dissipation/);
    expect(
      screen.getByTestId('structure-heat-sink-weight-help'),
    ).toHaveTextContent(
      '22 heat sinks \u00b7 10 free with engine, 12 weigh 12 t',
    );
  });

  it('merges base and final mobility into one column with helper text', () => {
    render(<StructureTab />);

    expect(screen.queryByText('Base')).not.toBeInTheDocument();
    expect(screen.getByTitle('Final Walk MP')).toHaveTextContent('5');
    const walkInput = screen.getByRole('spinbutton', { name: 'Walk MP' });
    expect(walkInput).toHaveAccessibleDescription(/Range .* for a 50t mech/);
  });

  it('shows Run MP as a locked read-only field as wide as a stepper', () => {
    render(<StructureTab />);

    const run = screen.getByLabelText('Run MP');
    const walk = screen.getByRole('spinbutton', { name: 'Walk MP' });
    const rowOf = (control: HTMLElement) =>
      control.closest('.grid') as HTMLElement;
    expect(run.tagName).toBe('OUTPUT');
    expect(run).toHaveTextContent('8');
    expect(run).toHaveClass('min-h-11', 'border', 'w-full', 'max-w-[22.5rem]');
    expect(run).not.toHaveAttribute('tabindex');
    expect(run.querySelector('svg')).not.toBeNull();
    expect(within(rowOf(run)).queryAllByRole('button')).toHaveLength(0);
    expect(rowOf(run)).toHaveTextContent(/8\s*→\s*8\s*final/);
    expect(rowOf(run).className).toBe(rowOf(walk).className);
    // Same width class as the stepper group, so both share one right edge.
    expect(walk.parentElement).toHaveClass('w-full', 'max-w-[22.5rem]');
    expect(screen.getByTitle('Final Run MP')).toBeInTheDocument();
  });

  it('shows the locked Run MP value in the primary text colour, like other values', () => {
    render(<StructureTab />);

    const run = screen.getByLabelText('Run MP');
    expect(run).toHaveClass('text-text-theme-primary');
    expect(run).not.toHaveClass('text-text-theme-secondary');
    // The lock icon and the helper line still say it is derived.
    expect(run.querySelector('svg')).not.toBeNull();
    expect(run).toHaveAccessibleDescription(
      'Follows Walk MP; it is not set directly.',
    );
  });

  it('right-aligns each cost meta in the 88px column after its control as "weight · slots" with tabular numerals', () => {
    render(<StructureTab />);

    const row = screen.getByLabelText('Engine').closest('.grid') as HTMLElement;
    const meta = within(row).getByText(/^\d+t · .+ slots?$/);
    expect(meta).toHaveClass('tabular-nums');
    expect(meta.className).toContain('@[32rem]:text-right');
    expect(meta.className).toContain('@[32rem]:justify-self-end');
    expect(meta.className).toContain('@[32rem]:col-start-3');
    expect(meta).toHaveClass('whitespace-nowrap');
    // "-> n final" readouts stay beside their control.
    expect(screen.getByTitle('Final Walk MP').parentElement).not.toHaveClass(
      'text-right',
    );
  });

  it('makes every stepper span the full control column', () => {
    render(<StructureTab />);

    for (const name of ['Tonnage', 'Walk MP', 'Jump MP', 'Heat sink count']) {
      const input = screen.getByRole('spinbutton', { name });
      expect(input.parentElement).toHaveClass('w-full', 'max-w-[22.5rem]');
      expect(input).toHaveClass('flex-1');
    }
  });

  it('puts the tonnage range under the control as helper text', () => {
    render(<StructureTab />);

    const tonnage = screen.getByRole('spinbutton', { name: 'Tonnage' });
    expect(tonnage).toHaveAccessibleDescription(/20–200t/);
  });

  it('moves Cooling into its own card below Mobility', () => {
    render(<StructureTab />);

    const cardOf = (name: string) =>
      screen.getByRole('heading', { name, level: 3 }).closest('.\\@container');
    const cooling = cardOf('Cooling') as HTMLElement;
    const mobility = cardOf('Mobility') as HTMLElement;
    const chassis = cardOf('Chassis') as HTMLElement;
    expect(cooling).not.toBe(chassis);
    expect(cooling.parentElement).toBe(mobility.parentElement);
    expect(mobility.nextElementSibling).toBe(cooling);
    expect(
      within(cooling).getByRole('combobox', { name: 'Heat sink type' }),
    ).toBeInTheDocument();
    expect(
      within(cooling).getByRole('spinbutton', { name: 'Heat sink count' }),
    ).toBeInTheDocument();
    expect(
      within(chassis).queryByRole('combobox', { name: 'Heat sink type' }),
    ).toBeNull();
    expect(chassis.parentElement).toHaveClass('items-start');
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

  it('keeps Motive Type with the chassis, with its warning attached', () => {
    render(<StructureTab />);

    const motive = screen.getByRole('combobox', { name: 'Motive type' });
    expect(motive).toHaveAccessibleDescription(/clears armor in removed/);
    const mobility = screen
      .getByRole('heading', { name: 'Mobility' })
      .closest('div')?.parentElement as HTMLElement;
    expect(
      within(mobility).queryByRole('combobox', { name: 'Motive type' }),
    ).toBeNull();
    // Same row template as Tonnage, directly below it in the Chassis card.
    const rowOf = (control: HTMLElement) => {
      let row: HTMLElement | null = control;
      while (row && !row.classList.contains('grid')) row = row.parentElement;
      return row;
    };
    const tonnageRow = rowOf(
      screen.getByRole('spinbutton', { name: 'Tonnage' }),
    );
    const motiveRow = rowOf(motive);
    expect(motiveRow?.className).toBe(tonnageRow?.className);
    expect(tonnageRow?.nextElementSibling).toBe(motiveRow);
  });

  it('gives Run MP the same helper line the other Mobility rows have', () => {
    render(<StructureTab />);

    expect(screen.getByLabelText('Run MP')).toHaveAccessibleDescription(
      'Follows Walk MP; it is not set directly.',
    );
  });

  it('keeps Enhancement as an ordinary Mobility row under Jump Type', () => {
    render(<StructureTab />);

    const select = screen.getByRole('combobox', {
      name: 'Movement enhancement',
    });
    expect(
      screen.getByText('Enhancement', { selector: 'label' }),
    ).toHaveAttribute('for', 'movement-enhancement');
    expect(
      screen.queryByRole('heading', { name: 'Enhancement', level: 4 }),
    ).toBeNull();
    const rowOf = (control: HTMLElement) =>
      control.closest('.grid') as HTMLElement;
    expect(rowOf(select).previousElementSibling).toBe(
      rowOf(screen.getByLabelText('Jump type')),
    );
  });

  it('puts the Mobility and Cooling subtitles on the title line', () => {
    render(<StructureTab />);

    for (const [title, subtitle] of [
      ['Mobility', /Base settings and derived movement limits/],
      ['Cooling', /Heat sink type and count/],
    ] as const) {
      const heading = screen.getByRole('heading', { name: title, level: 3 });
      expect(heading.parentElement).toHaveClass('flex', 'items-baseline');
      expect(heading.parentElement).toHaveTextContent(subtitle);
    }
  });

  it('does not show developer copy about unsupported jump boosters', () => {
    render(<StructureTab />);

    expect(screen.queryByText(/not supported yet/i)).not.toBeInTheDocument();
  });

  it('uses one 140px / 240-360px / 88px label, control, meta grid in all three cards', () => {
    render(<StructureTab />);

    const rowOf = (control: HTMLElement) =>
      control.closest('.grid') as HTMLElement;
    const controls = [
      screen.getByRole('spinbutton', { name: 'Tonnage' }),
      screen.getByRole('combobox', { name: 'Motive type' }),
      screen.getByRole('combobox', { name: 'Engine' }),
      screen.getByRole('combobox', { name: 'Heat sink type' }),
      screen.getByRole('spinbutton', { name: 'Walk MP' }),
      screen.getByRole('spinbutton', { name: 'Jump MP' }),
      screen.getByRole('combobox', { name: 'Jump type' }),
      screen.getByRole('combobox', { name: 'Movement enhancement' }),
    ];
    expect(new Set(controls.map((c) => rowOf(c).className)).size).toBe(1);
    expect(rowOf(controls[0]).className).toContain(
      '@[32rem]:grid-cols-[8.75rem_minmax(15rem,22.5rem)_5.5rem]',
    );
    for (const select of controls.filter((c) => c.tagName === 'SELECT')) {
      expect(select).toHaveClass('w-full', 'max-w-[22.5rem]');
    }
    expect(screen.getByLabelText('Jump type')).toBeEnabled();
  });

  it('should apply custom className', () => {
    const { container } = render(<StructureTab className="custom-class" />);

    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });
});
