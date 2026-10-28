import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { AutoSizeTextarea } from '@/components/customizer/fluff/FluffFields';
import { FluffSideColumn } from '@/components/customizer/fluff/FluffSideColumn';
import { FluffTab } from '@/components/customizer/tabs/FluffTab';
import { disabledButtonClasses } from '@/components/ui/Button';

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
      'Overview2 wordsFilled',
      'Capabilities0 wordsEmpty',
      'History0 wordsEmpty',
      'Deployment0 wordsEmpty',
      'Variants0 wordsEmpty',
      'Notable Units0 wordsEmpty',
      'Battlefield RoleFire SupportFilled',
      'Manufacturing2 of 2 filledFilled',
    ]);
    expect(screen.getByLabelText('Manufacturer')).toHaveValue('Field Refit');
    expect(screen.getByLabelText('Primary Factory')).toHaveValue('Field Refit');
    expect(screen.getByLabelText('Jump to Section')).toHaveValue('');
    expect(nav.parentElement).toBe(screen.getByTestId('fluff-sections-slot'));
    expect(nav.nextElementSibling).toBeNull();
    rerender(
      <FluffTab fluff={{ history: 'Written' }} onFluffChange={onFluffChange} />,
    );
    expect(
      within(nav).getByRole('link', { name: 'History 1 word Filled' }),
    ).toBeInTheDocument();
    expect(onFluffChange).not.toHaveBeenCalled();
  });

  it('styles each Sections row as a link and dims Empty rows', () => {
    render(
      <FluffTab
        role="Juggernaut"
        fluff={{ overview: 'Two words' }}
        onFluffChange={jest.fn()}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const links = within(nav).getAllByRole('link');
    for (const link of links) {
      expect(link).toHaveClass('group', 'hover:bg-surface-raised');
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
    // One pattern on every row: the status ("Filled" or "Empty") plus a
    // secondary detail under the label (word count or the role value).
    expect(within(nav).getByText('Juggernaut')).toHaveClass(
      'text-text-theme-secondary',
      'text-xs',
    );
    expect(within(nav).getByText('2 words')).toHaveClass(
      'text-text-theme-secondary',
      'text-xs',
    );
    expect(within(nav).getAllByText('Filled')[0]).toHaveClass(
      'text-text-theme-secondary',
    );
    // Empty is dimmer: a muted status and a secondary (not primary) label.
    expect(within(nav).getAllByText('Empty')[0]).toHaveClass(
      'text-text-theme-muted',
    );
    const historyLink = within(nav).getByRole('link', {
      name: 'History 0 words Empty',
    });
    expect(historyLink).toHaveClass('text-text-theme-secondary');
    const overviewLink = within(nav).getByRole('link', {
      name: 'Overview 2 words Filled',
    });
    expect(overviewLink).toHaveClass('text-text-theme-primary');
    expect(
      within(nav).getByRole('link', {
        name: 'Battlefield Role Juggernaut Filled',
      }),
    ).toBeInTheDocument();
    // No row dividers in either column; every row has its two lines (an
    // empty one too) and ends in the same chevron, since every row does the
    // same thing (jump to its section).
    for (const item of within(nav).getAllByRole('listitem'))
      expect(item.className).not.toMatch(/border/);
    expect(historyLink.querySelectorAll('span.block')).toHaveLength(2);
    expect(historyLink.querySelector('svg path')?.getAttribute('d')).toBe(
      overviewLink.querySelector('svg path')?.getAttribute('d'),
    );
  });

  it('counts filled fields for the multi-field Manufacturing section', () => {
    render(
      <FluffTab
        fluff={{
          manufacturer: 'Defiance Industries',
          primaryFactory: '',
          systemManufacturer: { CHASSIS: 'Foundation', ENGINE: '' },
        }}
        onFluffChange={jest.fn()}
      />,
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Sections' })).getByRole(
        'link',
        { name: 'Manufacturing 2 of 4 filled Filled' },
      ),
    ).toBeInTheDocument();
  });

  it('shows Empty for an unset role row', () => {
    render(<FluffTab fluff={{}} onFluffChange={jest.fn()} />);
    expect(
      within(screen.getByRole('navigation', { name: 'Sections' })).getByRole(
        'link',
        { name: 'Battlefield Role Not set Empty' },
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Sections' })).getByRole(
        'link',
        { name: 'Manufacturing 0 of 2 filled Empty' },
      ),
    ).toBeInTheDocument();
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
    fireEvent.click(
      screen.getByRole('link', { name: 'History 0 words Empty' }),
    );
    expect(history).toHaveFocus();
    expect(scrollHistory).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
    fireEvent.change(screen.getByLabelText('Jump to Section'), {
      target: { value: 'fluff-role' },
    });
    expect(role).toHaveFocus();
    expect(scrollRole).toHaveBeenCalled();
    expect(screen.getByLabelText('Jump to Section')).toHaveValue('');
  });

  it('sizes the phone jump label like the field labels and lists each status', () => {
    render(
      <FluffTab
        role="Juggernaut"
        fluff={{ overview: 'Two words' }}
        onFluffChange={jest.fn()}
      />,
    );
    const label = screen.getByText('Jump to Section');
    expect(label).toHaveClass('text-sm', 'text-text-theme-secondary');
    expect(label).not.toHaveClass('text-base');
    const options = Array.from(
      (screen.getByLabelText('Jump to Section') as HTMLSelectElement).options,
      (option) => option.textContent,
    );
    expect(options).toContain('Overview · Filled, 2 words');
    expect(options).toContain('History · Empty');
    expect(options).toContain('Battlefield Role · Filled, Juggernaut');
  });

  it('focuses the containing section when jumping to a disabled field', () => {
    render(<FluffTab readOnly fluff={{ history: 'Imported history' }} />);
    const history = screen.getByLabelText('History');
    history.scrollIntoView = jest.fn();
    fireEvent.click(
      screen.getByRole('link', { name: 'History 2 words Filled' }),
    );
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

  it('stacks the history fields in one column, and Variants and Notable Units in the side card, in order', () => {
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
    const related = screen.getByTestId('fluff-related');
    expect(container).toHaveClass('flex-col');
    expect(related).toHaveClass('flex-col');
    fields.forEach((field, index) => {
      // textarea > frame > field wrapper > column
      expect(field.parentElement?.parentElement?.parentElement).toBe(
        index < 4 ? container : related,
      );
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

  it('places the narrative first, then Sections, Variants and Notable Units, role and manufacturing, in a container-query grid', () => {
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
    expect(side.children[0]).toBe(screen.getByTestId('fluff-sections-slot'));
    expect(side.children[0]).toContainElement(
      screen.getByRole('navigation', { name: 'Sections' }),
    );
    // Variants and Notable Units sit under Sections, so the side column ends
    // near the history column instead of 500px above it.
    expect(side.children[1]).toBe(
      screen.getByRole('region', { name: 'Variants and Notable Units' }),
    );
    expect(side.children[2]).toBe(role);
    expect(side.children[3]).toBe(manufacturing);
    expect(side.children).toHaveLength(4);
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
    expect(screen.getByLabelText('Variants')).toHaveClass('min-h-18');
    expect(screen.getByLabelText('Notable Units')).toHaveClass('min-h-18');
  });

  it('marks every placeholder as an example in the normal upright placeholder style', () => {
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
      expect(field).toHaveClass('placeholder:text-text-theme-muted');
      expect(field).not.toHaveClass('placeholder:italic');
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

  it('ends the system list with a normal secondary Add System action and its reason', () => {
    render(
      <FluffTab
        fluff={{ systemManufacturer: { Engine: 'Vlar' } }}
        onFluffChange={jest.fn()}
      />,
    );

    const add = screen.getByRole('button', { name: 'Add System' });
    expect(add).toBeDisabled();
    expect(add).toHaveClass('bg-surface-raised');
    // The shared disabled look (solid border, never dashed, no fill, dimmed
    // secondary text), read from the one shared definition.
    expect(add).toHaveClass('border', ...disabledButtonClasses.split(' '));
    expect(add.className).not.toMatch(/dashed/);
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
    // The same "(Optional)" marker as the Overview form.
    expect(variants).toHaveTextContent('(Optional)');
    expect(within(variants).getByText('(Optional)')).toHaveClass('text-sm');
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

    expect(screen.queryByText('(Optional)')).not.toBeInTheDocument();
  });

  it('puts the Combat Role select under the subtitle with the same side label as Manufacturing', () => {
    render(
      <FluffTab
        role="Scout"
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const card = screen.getByRole('region', { name: 'Battlefield Role' });
    const select = screen.getByLabelText('Combat Role');
    expect(card).toContainElement(select);
    expect(select).toHaveClass('w-full');
    // Side label, the one placement used across the right column.
    const row = screen.getByText('Combat Role').parentElement as HTMLElement;
    expect(row).toContainElement(select);
    expect(row).toHaveClass('grid');
    expect(
      screen.getByLabelText('Manufacturer').closest('.group\\/row'),
    ).toHaveClass(...row.className.split(' '));
    expect(
      screen.getByLabelText('New System').closest('.group\\/row'),
    ).toHaveClass(...row.className.split(' '));
    const subtitle = screen.getByText('Shown in the unit dossier and export.');
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
    fireEvent.click(screen.getByRole('button', { name: 'Add System' }));

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

describe('Fluff textarea sizing', () => {
  it('grows to its full content with no fade and no collapse control', () => {
    const measure = jest
      .spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get')
      .mockImplementation(function (this: HTMLTextAreaElement) {
        return this.value.length > 100 ? 800 : 88;
      });
    const props = {
      id: 'fluff-history',
      value: 'Long history '.repeat(100),
      readOnly: true,
    };
    try {
      const { rerender, container } = render(<AutoSizeTextarea {...props} />);
      const field = screen.getByRole('textbox');
      expect(field.style.height).toBe('800px');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(container.querySelector('.bg-linear-to-t')).toBeNull();
      rerender(<AutoSizeTextarea {...props} value={`${props.value} more`} />);
      expect(field.style.height).toBe('800px');
      rerender(<AutoSizeTextarea {...props} value="Short" />);
      expect(field.style.height).toBe('88px');
      expect(field).toHaveValue('Short');
    } finally {
      measure.mockRestore();
    }
  });

  it('shows every narrative field at full height with no Show all button', () => {
    render(
      <FluffTab
        fluff={{ history: 'Long history '.repeat(200) }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /show (all|less)/i }),
    ).toBeNull();
    expect(screen.getByLabelText('History')).toHaveClass('overflow-y-hidden');
    expect(document.querySelector('.bg-linear-to-t')).toBeNull();
  });
});

describe('Fluff narrative field treatment', () => {
  it('frames editable narrative text like the other inputs', () => {
    render(
      <FluffTab
        fluff={{ overview: 'A quoted line.' }}
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const frame = screen.getByLabelText('Overview').parentElement;
    // Same fill and calm border as the single-line inputs, strong border on
    // hover, accent border and ring on focus, plus the inset shadow and a text
    // cursor so a long paragraph does not read as a quote panel.
    expect(frame).toHaveClass(
      'border',
      'bg-[var(--field-surface,var(--surface-deep))]',
      'border-[var(--field-border,var(--border-default))]',
      'hover:border-border-theme-strong',
      'focus-within:border-accent',
      'focus-within:ring-2',
      'cursor-text',
    );
  });

  it('drops the editable cues when the field is disabled', () => {
    render(
      <FluffTab
        fluff={{ overview: 'A quoted line.' }}
        readOnly
        onRoleChange={jest.fn()}
        onFluffChange={jest.fn()}
      />,
    );

    const frame = screen.getByLabelText('Overview').parentElement;
    expect(frame).toHaveClass('cursor-not-allowed');
    expect(frame).not.toHaveClass('cursor-text');
    expect(frame).not.toHaveClass('hover:border-border-theme-strong');
  });
});
describe('Fluff side column', () => {
  /** Fake layout: cards are `cardHeight` tall, the Sections slot `slotHeight`. */
  const layout = (
    slotHeight: number,
    cardHeight: number,
    viewport: number,
  ): (() => void) => {
    const offset = jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.dataset.testid === 'fluff-sections-slot'
          ? slotHeight
          : cardHeight;
      });
    const client = jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockReturnValue(viewport);
    return () => {
      offset.mockRestore();
      client.mockRestore();
    };
  };

  const renderColumn = (): void => {
    render(
      <FluffSideColumn sections={<nav aria-label="Sections">Index</nav>}>
        <section>Role</section>
        <section>Manufacturing</section>
      </FluffSideColumn>,
    );
  };

  it('has no internal scroll or fade mask', () => {
    renderColumn();
    const column = screen.getByTestId('fluff-side-column');
    expect(column.className).not.toMatch(/overflow|max-h-/);
    expect(column.style.maskImage).toBeFalsy();
    expect(column).not.toHaveAttribute('data-scroll-more-below');
  });

  it('sticks the whole column when it fits the scroll area', () => {
    const restore = layout(100, 100, 900);
    try {
      renderColumn();
      const column = screen.getByTestId('fluff-side-column');
      expect(column).toHaveAttribute('data-sticky', 'column');
      expect(column.className).toContain('@[64rem]:sticky');
      expect(screen.getByTestId('fluff-sections-slot').className).not.toContain(
        'sticky',
      );
    } finally {
      restore();
    }
  });

  it('sticks only the Sections card when the column is taller than the scroll area', () => {
    const restore = layout(250, 400, 900);
    try {
      renderColumn();
      const column = screen.getByTestId('fluff-side-column');
      expect(column).toHaveAttribute('data-sticky', 'sections');
      expect(column.className).not.toContain('@[64rem]:sticky');
      expect(column.className).toContain('@[64rem]:self-stretch');
      const slot = screen.getByTestId('fluff-sections-slot');
      expect(slot.className).toContain('@[64rem]:sticky');
      expect(slot.className).toContain('@[64rem]:top-4');
    } finally {
      restore();
    }
  });

  it('pins nothing when the Sections card alone would cover half the scroll area', () => {
    const restore = layout(420, 400, 700);
    try {
      renderColumn();
      const column = screen.getByTestId('fluff-side-column');
      expect(column).toHaveAttribute('data-sticky', 'none');
      expect(column.className).not.toContain('sticky');
      expect(screen.getByTestId('fluff-sections-slot').className).not.toContain(
        'sticky',
      );
    } finally {
      restore();
    }
  });
});
