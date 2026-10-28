import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ColorLegend } from '@/components/customizer/shared/ColorLegend';

describe('ColorLegend', () => {
  it('shows only the unit equipment categories plus fixed-system families and empty inline', () => {
    const view = render(
      <ColorLegend
        equipmentNames={[
          'Medium Laser',
          'Medium Laser',
          'Single Heat Sink',
          'AC/20',
          'AC/20 Ammo',
        ]}
      />,
    );
    const key = screen.getByRole('group', { name: 'Colour key' });
    expect(within(key).getAllByText('Energy')).toHaveLength(1);
    expect(within(key).getByText('Heat Sink')).toBeInTheDocument();
    expect(within(key).getByText('Ballistic')).toBeInTheDocument();
    expect(within(key).queryByText('Missile')).not.toBeInTheDocument();
    expect(within(key).queryByText('Fixed Systems')).not.toBeInTheDocument();
    for (const family of [
      'Engine',
      'Gyro',
      'Actuators',
      'Cockpit / Life Support / Sensors',
    ])
      expect(within(key).getByText(family)).toBeInTheDocument();
    expect(within(key).getByText('Empty')).toBeInTheDocument();
    // Chips are miniature slots: the same tile, accent and pattern classes.
    const energyChip = within(key).getByText('Energy').previousElementSibling;
    expect(energyChip).toHaveClass(
      'criticalLegendSlotChip',
      'criticalTintedSlot',
      'border-l-yellow-300',
    );
    const heatSinkChip = within(key).getByText('Heat Sink')
      .previousElementSibling as HTMLElement;
    expect(heatSinkChip).toHaveClass('border-l-cyan-400');
    expect(heatSinkChip.className).not.toMatch(/HeatSink|criticalAmmo/);
    // Ammunition takes its weapon's colour, so its key is the neutral striped chip.
    expect(
      within(key).getByText('Ammo (Striped)').previousElementSibling,
    ).toHaveClass('criticalAmmo', 'border-l-slate-300');
    const accentOf = (label: string) =>
      [...within(key).getByText(label).previousElementSibling!.classList].find(
        (name) => /^border-l-.+-\d/.test(name),
      );
    expect(new Set(['Engine', 'Gyro', 'Actuators'].map(accentOf)).size).toBe(3);
    expect(within(key).getByText('Empty').previousElementSibling).toHaveClass(
      'criticalLegendEmptyChip',
    );
    // Grouped as equipment, then systems, one balanced row each.
    const groupOf = (label: string) =>
      within(key)
        .getByText(label)
        .closest('[data-legend-group]')
        ?.getAttribute('data-legend-group');
    expect(['Energy', 'Ammo (Striped)', 'Heat Sink'].map(groupOf)).toEqual([
      'equipment',
      'equipment',
      'equipment',
    ]);
    expect(['Engine', 'Actuators', 'Empty'].map(groupOf)).toEqual([
      'systems',
      'systems',
      'systems',
    ]);
    // A full-width line break between the groups starts the second row.
    const rowBreak = within(key).getByTestId('colour-key-row-break');
    expect(rowBreak).toHaveClass('basis-full', 'h-0');
    const items = [...key.children];
    const breakAt = items.indexOf(rowBreak);
    expect(items.slice(0, breakAt).map((item) => item.textContent)).toEqual([
      'Energy',
      'Heat Sink',
      'Ballistic',
      'Ammo (Striped)',
    ]);
    expect(items.slice(breakAt + 1).map((item) => item.textContent)).toEqual([
      'Engine',
      'Gyro',
      'Actuators',
      'Cockpit / Life Support / Sensors',
      'Empty',
    ]);
    view.rerender(<ColorLegend equipmentNames={['LRM 20']} />);
    expect(within(key).getByText('Missile')).toBeInTheDocument();
    expect(within(key).queryByText('Energy')).not.toBeInTheDocument();
  });
  it('should render collapsed by default', () => {
    render(<ColorLegend />);

    expect(screen.getByText('Colour Key')).toBeInTheDocument();
    expect(screen.queryByText('System Components')).not.toBeInTheDocument();
  });

  it('should render expanded when defaultExpanded is true', () => {
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('System Components')).toBeInTheDocument();
    expect(screen.getByText('Equipment Types')).toBeInTheDocument();
    expect(screen.getByText('Tech Base')).toBeInTheDocument();
  });

  it('should expand when clicked', async () => {
    const user = userEvent.setup();
    render(<ColorLegend />);

    const button = screen.getByText('Colour Key').closest('button');
    expect(button).toBeInTheDocument();

    await user.click(button!);

    expect(screen.getByText('System Components')).toBeInTheDocument();
  });

  it('boxes the Colour Key disclosure like the toolbar buttons beside it', () => {
    render(<ColorLegend equipmentNames={['LRM 20']} />);
    const button = screen.getByRole('button', { name: 'Colour Key' });
    expect(button).toHaveClass(
      'rounded-lg',
      'border',
      'border-border-theme',
      'bg-surface-raised',
      'min-h-11',
      'text-text-theme-primary',
    );
  });

  it('should collapse when clicked again', async () => {
    const user = userEvent.setup();
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('System Components')).toBeInTheDocument();

    const button = screen.getByText('Colour Key').closest('button');
    await user.click(button!);

    expect(screen.queryByText('System Components')).not.toBeInTheDocument();
  });

  it('should display system component colors', () => {
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('Gyro')).toBeInTheDocument();
    expect(screen.getByText('Actuators')).toBeInTheDocument();
    expect(
      screen.getByText('Cockpit / Life Support / Sensors'),
    ).toBeInTheDocument();
    expect(screen.getByText('Empty Slot')).toBeInTheDocument();
  });

  it('should display equipment type colors', () => {
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByText('Ammo (Striped)')).toBeInTheDocument();
    expect(screen.getByText('Heat Sinks')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Physical')).toBeInTheDocument();
    expect(screen.getByText('Misc')).toBeInTheDocument();
  });

  it('should display tech base colors', () => {
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('Inner Sphere')).toBeInTheDocument();
    expect(screen.getByText('Clan')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ColorLegend className="custom-class" />);

    const legend = container.firstChild;
    expect(legend).toHaveClass('custom-class');
  });
});
