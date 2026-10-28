import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import {
  GlobalLoadoutTray,
  LoadoutEquipmentItem,
} from '@/components/customizer/equipment/GlobalLoadoutTray';
import { MechLocation } from '@/types/construction';
import { EquipmentCategory } from '@/types/equipment';

describe('GlobalLoadoutTray', () => {
  const createEquipment = (
    overrides?: Partial<LoadoutEquipmentItem>,
  ): LoadoutEquipmentItem => ({
    instanceId: 'equip-1',
    equipmentId: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    isAllocated: false,
    isRemovable: true,
    ...overrides,
  });

  const defaultProps = {
    equipment: [createEquipment()],
    equipmentCount: 1,
    onRemoveEquipment: jest.fn(),
    onRemoveAllEquipment: jest.fn(),
    isExpanded: true,
    onToggleExpand: jest.fn(),
    selectedEquipmentId: null,
    onSelectEquipment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const originalShow = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'showModal',
  );
  const originalClose = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    'close',
  );
  beforeAll(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      },
    });
  });
  afterAll(() => {
    for (const [key, descriptor] of [
      ['showModal', originalShow],
      ['close', originalClose],
    ] as const) {
      if (descriptor)
        Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
      else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
    }
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  function confirmedTray(
    props: React.ComponentProps<typeof GlobalLoadoutTray> = defaultProps,
    unitId = 'unit-a',
  ) {
    return (
      <CustomizerConfirmationProvider
        scope={{ unitId, unitType: 'BattleMech' }}
      >
        <GlobalLoadoutTray {...props} />
      </CustomizerConfirmationProvider>
    );
  }
  function requestRemoval() {
    fireEvent.click(
      screen.getByRole('button', { name: 'More loadout actions' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Remove All Removable/ }),
    );
    return screen.getByRole('dialog', { name: 'Remove removable equipment?' });
  }

  it('should render equipment tray', () => {
    render(<GlobalLoadoutTray {...defaultProps} />);

    expect(screen.getByText('Medium Laser')).toBeInTheDocument();
  });

  it('should display equipment count', () => {
    render(<GlobalLoadoutTray {...defaultProps} equipmentCount={5} />);

    // The badge names what it counts, so it reads as the sum of the
    // section counts below it.
    expect(screen.getByText('5 items')).toHaveAttribute(
      'title',
      '5 items in loadout',
    );
  });

  it('words a single loadout item in the singular', () => {
    render(<GlobalLoadoutTray {...defaultProps} equipmentCount={1} />);

    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('should have clickable section headers', async () => {
    const user = userEvent.setup();
    render(<GlobalLoadoutTray {...defaultProps} />);

    // Click on the "Unallocated" section header button
    const sectionButton = screen.getByRole('button', { name: /^Unassigned/i });
    await user.click(sectionButton);

    // Verify the section header was found and clicked (no error = success)
    expect(sectionButton).toBeInTheDocument();
  });

  it('should call onSelectEquipment when equipment is clicked', async () => {
    const user = userEvent.setup();
    render(<GlobalLoadoutTray {...defaultProps} />);

    const equipment = screen.getByText('Medium Laser');
    await user.click(equipment);

    expect(defaultProps.onSelectEquipment).toHaveBeenCalledWith('equip-1');
  });

  it('should call onRemoveEquipment when remove button is clicked twice (with confirmation)', async () => {
    const user = userEvent.setup();
    render(<GlobalLoadoutTray {...defaultProps} />);

    // The card's trailing chevron opens its actions, including Remove.
    await user.click(
      screen.getByRole('button', { name: /^Show actions for Medium Laser/ }),
    );
    const removeButton = screen.getByTitle('Remove from unit');

    // First click shows confirmation
    await user.click(removeButton);
    expect(defaultProps.onRemoveEquipment).not.toHaveBeenCalled();

    // Button should now show confirmation state
    const confirmButton = screen.getByTitle('Click again to confirm');
    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton.querySelector('svg')).toHaveAttribute(
      'data-icon-name',
      'check',
    );

    // Second click confirms and removes
    await user.click(confirmButton);
    expect(defaultProps.onRemoveEquipment).toHaveBeenCalledWith('equip-1');
  });

  it('keeps non-removable equipment in the collapsed fixed-systems group', async () => {
    const user = userEvent.setup();
    const equipment = createEquipment({ isRemovable: false });
    render(<GlobalLoadoutTray {...defaultProps} equipment={[equipment]} />);

    expect(screen.queryByTitle('Remove from unit')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fixed Systems 1' }));
    await user.click(
      screen.getByRole('button', { name: /^Show actions for Medium Laser/ }),
    );
    expect(screen.queryByTitle('Remove from unit')).not.toBeInTheDocument();
    expect(screen.getByTitle('Managed by configuration')).toBeInTheDocument();
  });

  it('should display mounted equipment in mounted section', () => {
    const allocated = createEquipment({
      instanceId: 'allocated-1',
      name: 'Allocated Laser',
      isAllocated: true,
      location: 'Right Torso',
    });

    render(<GlobalLoadoutTray {...defaultProps} equipment={[allocated]} />);

    expect(screen.getByText('Allocated Laser')).toBeInTheDocument();
    expect(screen.getByText(/RT/i)).toBeInTheDocument();
  });

  it('should display unallocated equipment in unallocated section', () => {
    const unallocated = createEquipment({
      instanceId: 'unallocated-1',
      name: 'Unallocated Laser',
      isAllocated: false,
    });

    render(<GlobalLoadoutTray {...defaultProps} equipment={[unallocated]} />);

    expect(screen.getByText('Unallocated Laser')).toBeInTheDocument();
  });

  it('should highlight selected equipment', () => {
    const { container } = render(
      <GlobalLoadoutTray {...defaultProps} selectedEquipmentId="equip-1" />,
    );

    // The ring-1 class is applied to the item row wrapper div
    const highlightedItem = container.querySelector('.ring-1');
    expect(highlightedItem).toBeInTheDocument();
  });

  it('uses per-instance availability in the desktop context menu', () => {
    const getAvailableLocationsForEquipment = jest.fn(() => [
      {
        location: MechLocation.LEFT_ARM,
        label: 'Left Arm',
        availableSlots: 4,
        canFit: true,
      },
    ]);
    render(
      <GlobalLoadoutTray
        {...defaultProps}
        getAvailableLocationsForEquipment={getAvailableLocationsForEquipment}
      />,
    );

    fireEvent.contextMenu(
      screen.getByRole('button', {
        name: 'Select Medium Laser in unallocated loadout',
      }),
    );

    expect(getAvailableLocationsForEquipment).toHaveBeenCalledWith('equip-1');
    expect(
      screen.getByRole('button', { name: /add to left arm/i }),
    ).toBeInTheDocument();
  });

  it('should accept available locations prop', () => {
    const availableLocations = [
      {
        location: MechLocation.RIGHT_TORSO,
        label: 'Right Torso',
        availableSlots: 5,
        canFit: true,
      },
    ];

    render(
      <GlobalLoadoutTray
        {...defaultProps}
        onQuickAssign={jest.fn()}
        availableLocations={availableLocations}
        selectedEquipmentId="equip-1"
      />,
    );

    // Equipment name appears in both the item row and the selection footer
    expect(screen.getAllByText('Medium Laser').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('should accept onUnassignEquipment prop', () => {
    const allocated = createEquipment({
      instanceId: 'allocated-1',
      name: 'Allocated Laser',
      isAllocated: true,
      location: 'Right Torso',
    });

    render(
      <GlobalLoadoutTray
        {...defaultProps}
        equipment={[allocated]}
        onUnassignEquipment={jest.fn()}
        selectedEquipmentId="allocated-1"
      />,
    );

    // Equipment name appears in both the item row and the selection footer
    expect(
      screen.getAllByText('Allocated Laser').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('should group equipment by category', () => {
    const equipment = [
      createEquipment({
        instanceId: 'e1',
        name: 'Laser',
        category: EquipmentCategory.ENERGY_WEAPON,
      }),
      createEquipment({
        instanceId: 'e2',
        name: 'AC/20',
        category: EquipmentCategory.BALLISTIC_WEAPON,
      }),
    ];

    render(<GlobalLoadoutTray {...defaultProps} equipment={equipment} />);

    expect(screen.getByText(/Energy/i)).toBeInTheDocument();
    expect(screen.getByText(/Ballistic/i)).toBeInTheDocument();
    // A category header leads with its colour dot only: no ≡ glyph that
    // would suggest the header can be dragged.
    const header = screen.getByText(/Energy/i).parentElement!;
    expect(header.querySelector('svg')).toBeNull();
    // It cannot be clicked, so it is a flat label: no row fill or hover.
    expect(header.className).not.toMatch(/(^|\s)(hover:)?bg-/);
    // The count reads as part of the label ("ENERGY · 1"), not as a
    // right-hand column like the Mounted section count.
    expect(header).toHaveTextContent(/^Energy· 1$/);
    expect(header.lastElementChild).toHaveTextContent('· 1');
  });

  it('should display empty state when no equipment', () => {
    render(
      <GlobalLoadoutTray {...defaultProps} equipment={[]} equipmentCount={0} />,
    );

    expect(screen.getByText(/No equipment/i)).toBeInTheDocument();
    // One line, and no "0 items" chip: the stat strip already says the
    // loadout is empty.
    expect(screen.queryByText('0 items')).toBeNull();
    expect(screen.queryByText(/Add equipment from/i)).toBeNull();
  });

  describe('Loadout grouping and actions', () => {
    it('uses category grouping by default and allows location grouping', async () => {
      const user = userEvent.setup();
      const equipment = [
        createEquipment({
          instanceId: 'energy-1',
          name: 'Medium Laser',
          category: EquipmentCategory.ENERGY_WEAPON,
        }),
        createEquipment({
          instanceId: 'ballistic-1',
          name: 'AC/10',
          category: EquipmentCategory.BALLISTIC_WEAPON,
          isAllocated: true,
          location: 'Right Torso',
        }),
      ];
      render(<GlobalLoadoutTray {...defaultProps} equipment={equipment} />);

      await user.click(
        screen.getByRole('button', { name: 'More loadout actions' }),
      );
      expect(
        screen.getByRole('button', { name: 'Category', pressed: true }),
      ).toBeInTheDocument();
      expect(screen.getByText('Energy')).toBeInTheDocument();
      expect(screen.getByText('Ballistic')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Location' }));

      expect(screen.getByText('By Location')).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: 'More loadout actions' }),
      );
      expect(
        screen.getByRole('button', { name: 'Location', pressed: true }),
      ).toBeInTheDocument();
      expect(screen.getByText('Right Torso')).toBeInTheDocument();
    });

    it('expands duplicate equipment into individual selectable and removable instances', async () => {
      const user = userEvent.setup();
      const equipment = [
        createEquipment({ instanceId: 'laser-1' }),
        createEquipment({ instanceId: 'laser-2' }),
      ];
      const getAvailableLocationsForEquipment = jest.fn(() => []);
      render(
        <GlobalLoadoutTray
          {...defaultProps}
          equipment={equipment}
          getAvailableLocationsForEquipment={getAvailableLocationsForEquipment}
        />,
      );

      const duplicateGroup = screen.getByRole('button', {
        name: 'Show 2 instances of Medium Laser in Unassigned',
      });
      expect(
        screen.queryByRole('button', {
          name: 'Select Medium Laser in unallocated loadout',
        }),
      ).not.toBeInTheDocument();

      await user.click(duplicateGroup);

      expect(
        screen.getAllByRole('button', {
          name: 'Select Medium Laser in unallocated loadout',
        }),
      ).toHaveLength(2);
      const instanceButtons = screen.getAllByRole('button', {
        name: 'Select Medium Laser in unallocated loadout',
      });
      await user.click(instanceButtons[1]);
      expect(defaultProps.onSelectEquipment).toHaveBeenCalledWith('laser-2');

      fireEvent.contextMenu(instanceButtons[1]);
      expect(getAvailableLocationsForEquipment).toHaveBeenCalledWith('laser-2');
    });

    it('keeps fixed systems collapsed until explicitly opened', async () => {
      const user = userEvent.setup();
      const fixedSystem = createEquipment({
        instanceId: 'fixed-case',
        name: 'CASE',
        isRemovable: false,
      });
      render(<GlobalLoadoutTray {...defaultProps} equipment={[fixedSystem]} />);

      const section = screen.getByRole('button', { name: 'Fixed Systems 1' });
      expect(section).toHaveAttribute('aria-expanded', 'false');
      expect(
        screen.queryByTitle('Managed by configuration'),
      ).not.toBeInTheDocument();

      await user.click(section);

      expect(section).toHaveAttribute('aria-expanded', 'true');
      await user.click(
        screen.getByRole('button', { name: /^Show actions for CASE/ }),
      );
      expect(screen.getByTitle('Managed by configuration')).toBeInTheDocument();
    });

    it('shows an empty Unassigned section as a quiet collapsed header', async () => {
      const user = userEvent.setup();
      const mounted = createEquipment({
        isAllocated: true,
        location: 'Left Arm',
      });
      render(<GlobalLoadoutTray {...defaultProps} equipment={[mounted]} />);

      const section = screen.getByRole('button', { name: /^Unassigned/ });
      expect(section).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(/Nothing unassigned/)).not.toBeInTheDocument();

      await user.click(section);

      expect(section).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText(/Nothing unassigned/)).toBeInTheDocument();
    });

    it('still accepts a drop on the collapsed Unassigned header', () => {
      const onUnassignEquipment = jest.fn();
      const mounted = createEquipment({
        instanceId: 'mounted-1',
        isAllocated: true,
        location: 'Left Arm',
      });
      render(
        <GlobalLoadoutTray
          {...defaultProps}
          equipment={[mounted]}
          onUnassignEquipment={onUnassignEquipment}
        />,
      );

      const section = screen.getByRole('button', { name: /^Unassigned/ });
      const dataTransfer = { getData: () => 'mounted-1' };
      fireEvent.dragOver(section, { dataTransfer });
      expect(
        screen.getByRole('button', { name: /Drop to unassign/ }),
      ).toBeInTheDocument();
      fireEvent.drop(section, { dataTransfer });

      expect(onUnassignEquipment).toHaveBeenCalledWith('mounted-1');
    });

    it('labels grouped duplicates with a count and tooltip', () => {
      render(
        <GlobalLoadoutTray
          {...defaultProps}
          equipment={[
            createEquipment({ instanceId: 'laser-1' }),
            createEquipment({ instanceId: 'laser-2' }),
            createEquipment({ instanceId: 'laser-3' }),
          ]}
        />,
      );

      const group = screen.getByRole('button', {
        name: 'Show 3 instances of Medium Laser in Unassigned',
      });
      expect(group).toHaveAttribute(
        'title',
        '3 identical items. Show each one.',
      );
      expect(within(group).getByText('3×')).toBeInTheDocument();
    });

    it('moves bulk removal into the loadout actions overflow', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      render(confirmedTray());

      expect(
        screen.queryByRole('button', { name: /remove all removable/i }),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: 'More loadout actions' }),
      );
      await user.click(
        screen.getByRole('button', { name: 'Remove All Removable (1)' }),
      );

      expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
      await user.click(
        within(
          screen.getByRole('dialog', { name: 'Remove removable equipment?' }),
        ).getByRole('button', { name: 'Remove Equipment' }),
      );
      expect(defaultProps.onRemoveAllEquipment).toHaveBeenCalledTimes(1);
      expect(confirmSpy).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });

  describe('bulk removal confirmation scope', () => {
    it('refuses a raw optional pod flag change with unchanged removable count', () => {
      const initial = {
        ...defaultProps,
        equipment: [createEquipment({ isOmniPodMounted: undefined })],
      };
      const view = render(confirmedTray(initial));
      const child = requestRemoval();
      view.rerender(
        confirmedTray({
          ...initial,
          equipment: [createEquipment({ isOmniPodMounted: true })],
        }),
      );
      fireEvent.click(
        within(child).getByRole('button', { name: 'Remove Equipment' }),
      );
      expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
    });
    it('Cancel leaves selection and the actions overflow unchanged', () => {
      render(confirmedTray());
      const dialog = requestRemoval();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
      expect(defaultProps.onSelectEquipment).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'More loadout actions' }),
      ).toHaveAttribute('aria-expanded', 'true');
    });
    it.each(['replacement', 'removable', 'pod', 'omni', 'collapsed'] as const)(
      'refuses changed %s policy even with unchanged count',
      (change) => {
        const initial = [
          createEquipment({ instanceId: 'one', isOmniPodMounted: true }),
          createEquipment({ instanceId: 'two', isRemovable: false }),
        ];
        const props = {
          ...defaultProps,
          equipment: initial,
          equipmentCount: 2,
        };
        const view = render(confirmedTray(props));
        const dialog = requestRemoval();
        let equipment = initial.map((item) => ({ ...item }));
        if (change === 'replacement')
          equipment[0] = { ...initial[0], instanceId: 'different' };
        if (change === 'removable')
          equipment = equipment.map((item) => ({
            ...item,
            isRemovable: !item.isRemovable,
          }));
        if (change === 'pod')
          equipment[0] = { ...initial[0], isOmniPodMounted: false };
        view.rerender(
          confirmedTray({
            ...props,
            equipment,
            isOmni: change === 'omni',
            isExpanded: change !== 'collapsed',
          }),
        );
        fireEvent.click(
          within(dialog).getByRole('button', { name: 'Remove Equipment' }),
        );
        expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
        expect(defaultProps.onSelectEquipment).not.toHaveBeenCalled();
      },
    );
    it('accepts copied reordered policy and invokes current callbacks once in original order', () => {
      const initial = [
        createEquipment({ instanceId: 'one' }),
        createEquipment({ instanceId: 'two' }),
      ];
      const props = { ...defaultProps, equipment: initial, equipmentCount: 2 };
      const view = render(confirmedTray(props));
      const dialog = requestRemoval();
      const calls: string[] = [];
      const remove = jest.fn(() => calls.push('remove'));
      const select = jest.fn(() => calls.push('select'));
      view.rerender(
        confirmedTray({
          ...props,
          equipment: [...initial]
            .reverse()
            .map((item) => ({ ...item, name: 'renamed' })),
          onRemoveAllEquipment: remove,
          onSelectEquipment: select,
        }),
      );
      const approve = within(dialog).getByRole('button', {
        name: 'Remove Equipment',
      });
      act(() => {
        approve.click();
        approve.click();
      });
      expect(calls).toEqual(['remove', 'select']);
      expect(select).toHaveBeenCalledWith(null);
      expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
      expect(
        screen.getByRole('button', { name: 'More loadout actions' }),
      ).toHaveAttribute('aria-expanded', 'false');
    });
    it('is a no-op when no item is removable', () => {
      render(
        confirmedTray({
          ...defaultProps,
          equipment: [createEquipment({ isRemovable: false })],
        }),
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'More loadout actions' }),
      );
      expect(
        screen.getByRole('button', { name: /Remove All Removable/ }),
      ).toBeDisabled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
    });
    it('disposes the request on rendered unit change', () => {
      const view = render(confirmedTray());
      requestRemoval();
      view.rerender(confirmedTray(defaultProps, 'unit-b'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(defaultProps.onRemoveAllEquipment).not.toHaveBeenCalled();
    });
  });
});
