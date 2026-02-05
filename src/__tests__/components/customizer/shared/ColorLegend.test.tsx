import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ColorLegend } from '@/components/customizer/shared/ColorLegend';

describe('ColorLegend', () => {
  it('should render collapsed by default', () => {
    render(<ColorLegend />);

    expect(screen.getByText('Color Legend')).toBeInTheDocument();
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

    const button = screen.getByText('Color Legend').closest('button');
    expect(button).toBeInTheDocument();

    await user.click(button!);

    expect(screen.getByText('System Components')).toBeInTheDocument();
  });

  it('should collapse when clicked again', async () => {
    const user = userEvent.setup();
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('System Components')).toBeInTheDocument();

    const button = screen.getByText('Color Legend').closest('button');
    await user.click(button!);

    expect(screen.queryByText('System Components')).not.toBeInTheDocument();
  });

  it('should display system component colors', () => {
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('Engine')).toBeInTheDocument();
    expect(screen.getByText('Gyro')).toBeInTheDocument();
    expect(screen.getByText('Actuators')).toBeInTheDocument();
    expect(screen.getByText('Cockpit/Sensors')).toBeInTheDocument();
    expect(screen.getByText('Empty Slot')).toBeInTheDocument();
  });

  it('should display equipment type colors', () => {
    render(<ColorLegend defaultExpanded={true} />);

    expect(screen.getByText('Weapons')).toBeInTheDocument();
    expect(screen.getByText('Ammunition')).toBeInTheDocument();
    expect(screen.getByText('Heat Sinks')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Physical Weapons')).toBeInTheDocument();
    expect(screen.getByText('Other Equipment')).toBeInTheDocument();
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
