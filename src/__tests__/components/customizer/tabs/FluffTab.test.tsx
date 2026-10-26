import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { AutoSizeTextarea } from '@/components/customizer/fluff/FluffFields';
import { FluffTab } from '@/components/customizer/tabs/FluffTab';

describe('FluffTab', () => {
  it('lists all sections with current text status without changing field values', () => {
    const onFluffChange = jest.fn();
    const { rerender } = render(
      <FluffTab
        role="Fire Support"
        fluff={{
          overview: '  Two\nwords  ',
          manufacturer: 'Field Refit',
          primaryFactory: 'Field Refit',
        }}
        onFluffChange={onFluffChange}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      'Overview2 words',
      'CapabilitiesEmpty',
      'HistoryEmpty',
      'DeploymentEmpty',
      'VariantsEmpty',
      'Notable UnitsEmpty',
      'Battlefield Role2 words',
      'Manufacturing4 words',
    ]);
    expect(screen.getByLabelText('Manufacturer')).toHaveValue('Field Refit');
    expect(screen.getByLabelText('Primary Factory')).toHaveValue('Field Refit');
    expect(screen.getByLabelText('Jump to section')).toHaveValue('');
    expect(nav.parentElement).toBe(screen.getByTestId('fluff-side-column'));
    expect(nav.previousElementSibling).toBe(
      screen.getByRole('region', { name: 'Manufacturing' }),
    );
    rerender(
      <FluffTab fluff={{ history: 'Written' }} onFluffChange={onFluffChange} />,
    );
    expect(
      within(nav).getByRole('link', { name: 'History 1 word' }),
    ).toBeInTheDocument();
    expect(onFluffChange).not.toHaveBeenCalled();
  });

  it('scrolls and focuses the destination from links and the jump select', () => {
    render(<FluffTab onRoleChange={jest.fn()} onFluffChange={jest.fn()} />);
    const history = screen.getByRole('textbox', {
      name: 'History',
    });
    const role = screen.getByRole('combobox', {
      name: 'Combat Role',
    });
    const scrollHistory = jest.fn();
    const scrollRole = jest.fn();
    history.scrollIntoView = scrollHistory;
    role.scrollIntoView = scrollRole;
    fireEvent.click(screen.getByRole('link', { name: 'History Empty' }));
    expect(history).toHaveFocus();
    expect(scrollHistory).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
    fireEvent.change(screen.getByLabelText('Jump to section'), {
      target: { value: 'fluff-role' },
    });
    expect(role).toHaveFocus();
    expect(scrollRole).toHaveBeenCalled();
    expect(screen.getByLabelText('Jump to section')).toHaveValue('');
  });

  it('focuses the containing section when jumping to a disabled field', () => {
    render(<FluffTab readOnly fluff={{ history: 'Imported history' }} />);
    const history = screen.getByLabelText('History');
    history.scrollIntoView = jest.fn();
    fireEvent.click(screen.getByRole('link', { name: 'History 2 words' }));
    expect(screen.getByTestId('fluff-field-history')).toHaveFocus();
    expect(history).toHaveValue('Imported history');
  });

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

  it('stacks all six narrative fields in one column, in order', () => {
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
    const container = screen.getByTestId('fluff-narrative');
    expect(container).toHaveClass('flex-col');
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

  it('uses the small-caps section-label style for narrative labels', () => {
    render(<FluffTab fluff={{}} onFluffChange={jest.fn()} />);

    const overview = screen.getByText('Overview', { selector: 'label' });
    expect(overview).toHaveClass('uppercase', 'tracking-wider', 'text-xs');
  });

  it('places the narrative first, then role, then manufacturing, in a container-query grid', () => {
    render(
      <FluffTab
        fluff={{}}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const grid = screen.getByTestId('fluff-grid');
    expect(grid.className).toContain('@[64rem]:grid-cols-');
    const narrative = screen.getByRole('region', {
      name: 'Unit History and Description',
    });
    const side = screen.getByTestId('fluff-side-column');
    const role = screen.getByRole('region', { name: 'Battlefield Role' });
    const manufacturing = screen.getByRole('region', { name: 'Manufacturing' });
    expect(grid.firstElementChild).toBe(narrative);
    expect(grid.lastElementChild).toBe(side);
    expect(side.children[0]).toBe(role);
    expect(side.children[1]).toBe(manufacturing);
    expect(side.className).toContain('@[64rem]:sticky');
  });
  it('keeps the history card full width and left-aligned, 16px / 1.5, at least 3 rows', () => {
    render(
      <FluffTab
        fluff={{}}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const card = screen.getByRole('region', {
      name: 'Unit History and Description',
    });
    const manufacturing = screen.getByRole('region', { name: 'Manufacturing' });
    expect(card.className).not.toMatch(/mx-auto|max-w-/);
    expect(screen.getByTestId('fluff-grid').className).toContain('75ch');
    expect(card.className).toContain('p-4');
    expect(manufacturing.className).toContain('p-4');
    for (const label of ['Overview', 'History', 'Variants']) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveClass('w-full', 'text-base', 'leading-6');
      expect(field).toHaveAttribute('rows', '3');
      expect(field).not.toHaveClass('text-sm');
    }
    expect(screen.getByLabelText('Variants')).toHaveClass('min-h-[6.5rem]');
    expect(screen.getByLabelText('Notable Units')).toHaveClass(
      'min-h-[6.5rem]',
    );
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

  it('keeps the remove button inside the row, hidden until hover or focus on fine pointers, 44px', () => {
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
    const input = screen.getByLabelText('Engine');
    expect(remove).toHaveClass('h-11', 'w-11', 'absolute', 'right-0');
    expect(remove.parentElement).toBe(input.parentElement);
    expect(input).toHaveClass('pr-11');
    const fine = '[@media(hover:hover)_and_(pointer:fine)]';
    expect(remove).toHaveClass(`${fine}:opacity-0`);
    expect(remove).toHaveClass(`${fine}:group-hover/row:opacity-100`);
    expect(remove).toHaveClass(`${fine}:group-focus-within/row:opacity-100`);
    expect(remove).not.toHaveClass('opacity-0');
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

  it('lists manufacturer and systems as consistent name + value rows with no orphan', () => {
    render(
      <FluffTab
        fluff={{
          systemManufacturer: { Engine: 'Vlar', Targeting: 'Angst' },
        }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const side = screen.getByRole('region', { name: 'Manufacturing' });
    const rowOf = (label: string): HTMLElement =>
      screen.getByLabelText(label).closest('.group\\/row') as HTMLElement;
    const rows = ['Manufacturer', 'Primary Factory', 'Engine', 'Targeting'].map(
      rowOf,
    );
    rows.forEach((row) => {
      expect(side).toContainElement(row);
      expect(row.parentElement).toHaveClass('flex-col');
    });
    expect(rows[2].parentElement).toBe(rows[3].parentElement);
  });

  it('ends the system list with a normal secondary Add system action and its reason', () => {
    render(
      <FluffTab
        fluff={{ systemManufacturer: { Engine: 'Vlar' } }}
        onFluffChange={jest.fn()}
      />,
    );

    const add = screen.getByRole('button', { name: 'Add system' });
    expect(add).toBeDisabled();
    expect(add).toHaveClass('bg-surface-raised');
    expect(add).toHaveAccessibleDescription('Name a system and who makes it.');

    fireEvent.change(screen.getByLabelText('New System'), {
      target: { value: 'Engine' },
    });
    expect(add).toBeDisabled();
    expect(add).toHaveAccessibleDescription(/already has a manufacturer/);

    fireEvent.change(screen.getByLabelText('New System'), {
      target: { value: 'Armor' },
    });
    expect(add).toBeEnabled();
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
    expect(within(variants).getByText('Optional')).toHaveClass('text-sm');
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

  it('puts a full-width Combat Role select in the card body under the subtitle', () => {
    render(<FluffTab role="Scout" onRoleChange={jest.fn()} />);

    const card = screen.getByRole('region', { name: 'Battlefield Role' });
    const select = screen.getByLabelText('Combat Role');
    expect(card).toContainElement(select);
    expect(select).toHaveClass('w-full');
    expect(select.closest('label')).toHaveClass('block');
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

describe('Fluff textarea expansion', () => {
  it('caps long text, expands and collapses, then hides the toggle for short text', () => {
    const measure = jest
      .spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get')
      .mockImplementation(function (this: HTMLTextAreaElement) {
        return this.value.length > 100 ? 800 : 88;
      });
    const props = {
      id: 'fluff-history',
      fieldLabel: 'History',
      value: 'Long history '.repeat(100),
      readOnly: true,
      style: {
        lineHeight: '24px',
        paddingTop: '8px',
        paddingBottom: '8px',
        '--fluff-line-cap': '14',
      } as React.CSSProperties,
    };
    try {
      const { rerender } = render(<AutoSizeTextarea {...props} />);
      const field = screen.getByRole('textbox');
      expect(field.style.height).toBe('352px');
      const toggle = screen.getByRole('button', { name: 'Show all History' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveAttribute('aria-controls', 'fluff-history');
      fireEvent.click(toggle);
      expect(field.style.height).toBe('800px');
      expect(toggle).toHaveAccessibleName('Show less History');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(toggle);
      expect(field.style.height).toBe('352px');
      rerender(
        <AutoSizeTextarea
          {...props}
          style={
            { ...props.style, '--fluff-line-cap': '10' } as React.CSSProperties
          }
          value={`${props.value} changed`}
        />,
      );
      expect(field.style.height).toBe('256px');
      rerender(<AutoSizeTextarea {...props} value="Short" />);
      expect(field.style.height).toBe('88px');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(field).toHaveValue('Short');
    } finally {
      measure.mockRestore();
    }
  });
});
