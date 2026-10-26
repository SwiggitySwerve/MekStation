import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { FluffTab } from '@/components/customizer/tabs/FluffTab';

describe('FluffTab', () => {
  it('renders the controlled role and serialized fluff fields', () => {
    render(
      <FluffTab
        role="Scout"
        fluff={{
          manufacturer: 'Defiance Industries',
          overview: 'A durable assault BattleMech.',
          systemManufacturer: { Engine: 'Vlar' },
        }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Combat Role')).toHaveValue('Scout');
    expect(screen.getByLabelText('Manufacturer')).toHaveValue(
      'Defiance Industries',
    );
    expect(screen.getByLabelText('Overview')).toHaveValue(
      'A durable assault BattleMech.',
    );
    expect(screen.getByLabelText('Engine')).toHaveValue('Vlar');
    expect(screen.queryByText('Introduction Year')).not.toBeInTheDocument();
    expect(screen.queryByText('Cost (C-Bills)')).not.toBeInTheDocument();
  });

  it('emits narrow controlled patches for role, narrative, and manufacturing', () => {
    const onRoleChange = jest.fn();
    const onFluffChange = jest.fn();
    render(
      <FluffTab
        fluff={{ history: 'Preserve me', variants: 'Also preserve me' }}
        onRoleChange={onRoleChange}
        onFluffChange={onFluffChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Combat Role'), {
      target: { value: 'Brawler' },
    });
    fireEvent.change(screen.getByLabelText('Manufacturer'), {
      target: { value: 'Earthwerks' },
    });
    fireEvent.change(screen.getByLabelText('Overview'), {
      target: { value: 'Front-line machine' },
    });

    expect(onRoleChange).toHaveBeenCalledWith('Brawler');
    expect(onFluffChange).toHaveBeenNthCalledWith(1, {
      manufacturer: 'Earthwerks',
    });
    expect(onFluffChange).toHaveBeenNthCalledWith(2, {
      overview: 'Front-line machine',
    });
  });

  it('adds a system manufacturer without dropping existing systems', () => {
    const onFluffChange = jest.fn();
    render(
      <FluffTab
        fluff={{ systemManufacturer: { Engine: 'Vlar' } }}
        onFluffChange={onFluffChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('New System'), {
      target: { value: 'Armor' },
    });
    fireEvent.change(screen.getByLabelText('New Manufacturer'), {
      target: { value: 'Durallex' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add system' }));

    expect(onFluffChange).toHaveBeenCalledWith({
      systemManufacturer: { Engine: 'Vlar', Armor: 'Durallex' },
    });
  });

  it('is visibly read only when no write callbacks are supplied', () => {
    render(<FluffTab role="Sniper" fluff={{ overview: 'Imported lore' }} />);

    expect(screen.getByRole('status')).toHaveTextContent('view only');
    expect(screen.getByLabelText('Combat Role')).toBeDisabled();
    expect(screen.getByLabelText('Overview')).toBeDisabled();
    expect(screen.getByLabelText('Manufacturer')).toBeDisabled();
  });

  it('shows all-caps system keys as plain field labels without changing the stored key', () => {
    const onFluffChange = jest.fn();
    render(
      <FluffTab
        fluff={{
          systemManufacturer: { CHASSIS: 'Foundation', ECM: 'Guardian' },
        }}
        onFluffChange={onFluffChange}
      />,
    );

    expect(screen.getByLabelText('Chassis')).toHaveValue('Foundation');
    expect(screen.getByLabelText('ECM')).toHaveValue('Guardian');
    fireEvent.change(screen.getByLabelText('Chassis'), {
      target: { value: 'Hild' },
    });
    expect(onFluffChange).toHaveBeenCalledWith({
      systemManufacturer: { CHASSIS: 'Hild', ECM: 'Guardian' },
    });
  });

  it('applies the custom root class', () => {
    const { container } = render(<FluffTab className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
