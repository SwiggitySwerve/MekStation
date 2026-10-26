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

  it('lays the narrative out in reading order, two columns on wide editors', () => {
    render(
      <FluffTab
        fluff={{}}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const labels = [
      'Overview',
      'Capabilities',
      'History',
      'Deployment',
      'Variants',
      'Notable Units',
    ];
    const fields = labels.map((label) => screen.getByLabelText(label));
    const container = screen.getByTestId('fluff-narrative-grid');
    expect(container).toHaveClass('grid-cols-1', '@[70rem]:grid-cols-2');
    expect(container).not.toHaveClass('xl:columns-2');
    fields.forEach((field, index) => {
      expect(field.parentElement?.parentElement).toBe(container);
      if (index > 0) {
        expect(
          fields[index - 1].compareDocumentPosition(field) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    });
  });

  it('fills the column, caps wide-column lines near 75 characters, at 16px / 1.5', () => {
    render(
      <FluffTab
        fluff={{}}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    for (const label of ['Overview', 'History', 'Variants']) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveClass(
        'w-full',
        '@[70rem]:max-w-[75ch]',
        'text-base',
        'leading-6',
      );
      expect(field).toHaveAttribute('rows', '4');
      expect(field).not.toHaveClass('text-sm');
    }
  });

  it('marks every placeholder as an example in placeholder styling', () => {
    render(
      <FluffTab
        fluff={{}}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    for (const label of [
      'Variants',
      'Notable Units',
      'New System',
      'New Manufacturer',
    ]) {
      const field = screen.getByLabelText(label);
      expect(field.getAttribute('placeholder')).toMatch(/^e\.g\. /);
      expect(field).toHaveClass('placeholder:italic');
    }
  });

  it('keeps the remove button subtle but reachable at 44px', () => {
    render(
      <FluffTab
        fluff={{ systemManufacturer: { Engine: 'Vlar' } }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const remove = screen.getByRole('button', {
      name: 'Remove Engine manufacturer',
    });
    expect(remove).toHaveClass('h-11', 'w-11', 'text-text-theme-muted');
    expect(remove).not.toHaveClass('border');
    expect(remove).toHaveClass('hover:text-white', 'focus-visible:ring-2');
  });

  it('hints at what goes in the usually-empty Variants and Notable Units', () => {
    render(
      <FluffTab
        fluff={{}}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Variants')).toHaveAttribute('placeholder');
    expect(screen.getByLabelText('Notable Units')).toHaveAttribute(
      'placeholder',
    );
  });

  it('gives Manufacturer the full column width, like the system rows', () => {
    render(
      <FluffTab
        fluff={{ systemManufacturer: { Engine: 'Vlar' } }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const manufacturerCell =
      screen.getByLabelText('Manufacturer').parentElement?.parentElement;
    expect(manufacturerCell).not.toHaveClass('grid');
  });

  it('tags empty optional fields, and drops the tag once they are filled', () => {
    const { rerender } = render(
      <FluffTab
        fluff={{ history: 'Written' }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const variants = screen.getByTestId('fluff-field-variants');
    expect(variants).toHaveTextContent('Optional');
    expect(screen.getByTestId('fluff-field-history')).not.toHaveTextContent(
      'Optional',
    );
    // The tag is not part of the label, so the field name stays exact.
    expect(screen.getByLabelText('Variants')).toBeInTheDocument();

    rerender(
      <FluffTab
        fluff={{ variants: 'Now filled' }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );
    expect(screen.getByTestId('fluff-field-variants')).not.toHaveTextContent(
      'Optional',
    );
  });

  it('does not show Optional tags on a view-only unit', () => {
    render(<FluffTab fluff={{}} />);

    expect(screen.queryByText('Optional')).not.toBeInTheDocument();
  });

  it('puts the Combat Role select in the card body under the subtitle', () => {
    render(<FluffTab role="Scout" onRoleChange={jest.fn()} />);

    const card = screen.getByRole('region', { name: 'Battlefield Role' });
    const select = screen.getByLabelText('Combat Role');
    expect(card).toContainElement(select);
    expect(select.closest('label')).toHaveClass('max-w-80');
    const subtitle = screen.getByText(/quick classification/);
    expect(
      subtitle.compareDocumentPosition(select) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
