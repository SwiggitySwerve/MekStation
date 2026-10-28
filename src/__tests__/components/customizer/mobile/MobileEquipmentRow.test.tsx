import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import {
  MobileEquipmentRow,
  MobileEquipmentItem,
} from '@/components/customizer/mobile/MobileEquipmentRow';
import { EquipmentCategory } from '@/types/equipment';

describe('MobileEquipmentRow', () => {
  const createItem = (
    overrides?: Partial<MobileEquipmentItem>,
  ): MobileEquipmentItem => ({
    instanceId: 'equip-1',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    isAllocated: false,
    isRemovable: true,
    ...overrides,
  });

  const defaultProps = {
    item: createItem(),
    onSelect: jest.fn(),
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render equipment name', () => {
      render(<MobileEquipmentRow {...defaultProps} />);
      expect(screen.getByText('Medium Laser')).toBeInTheDocument();
    });

    it('should render weight and crits', () => {
      // Default item has weight=1, criticalSlots=1, heat=0
      // Structure is: [Location] [Heat] [Crits] [Weight]
      render(<MobileEquipmentRow {...defaultProps} />);
      // Weight keeps one decimal while critical slots remain integers.
      expect(screen.getByText('1')).toBeInTheDocument(); // crits
      expect(screen.getByText('1.0')).toBeInTheDocument(); // weight
    });

    it('should render critical slots', () => {
      // Use different values for crits vs weight to distinguish them
      const item = createItem({ criticalSlots: 3, weight: 2 });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.getByText('3')).toBeInTheDocument(); // crits
      expect(screen.getByText('2.0')).toBeInTheDocument(); // weight
    });

    it('should show dashes for empty location and range columns', () => {
      render(<MobileEquipmentRow {...defaultProps} />);
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });

    it('should show location shorthand for allocated item', () => {
      const item = createItem({ isAllocated: true, location: 'Right Torso' });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.getByText('RT')).toBeInTheDocument();
    });
  });

  describe('Weapon Details', () => {
    it('should display damage for weapons', () => {
      const item = createItem({ damage: 5 });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.getByText('5d')).toBeInTheDocument();
    });

    it('should display range brackets in S/M/L format', () => {
      const item = createItem({
        ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
      });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.getByText('3/6/9')).toBeInTheDocument();
    });

    it('should display TC indicator for targeting computer compatible weapons', () => {
      const item = createItem({ targetingComputerCompatible: true, damage: 5 });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.getByText('TC')).toBeInTheDocument();
    });

    it('should display heat value', () => {
      const item = createItem({ heat: 7, weight: 2, criticalSlots: 3 });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  describe('OmniMech Indicators', () => {
    it('should show Pod indicator for pod-mounted equipment', () => {
      const item = createItem({ isOmniPodMounted: true });
      render(
        <MobileEquipmentRow {...defaultProps} item={item} isOmni={true} />,
      );
      expect(screen.getByText('P')).toBeInTheDocument();
    });

    it('should show Fixed indicator for fixed equipment', () => {
      const item = createItem({ isOmniPodMounted: false });
      render(
        <MobileEquipmentRow {...defaultProps} item={item} isOmni={true} />,
      );
      expect(screen.getByText('F')).toBeInTheDocument();
    });

    it('should reduce opacity for fixed equipment on OmniMech', () => {
      const item = createItem({ isOmniPodMounted: false });
      const { container } = render(
        <MobileEquipmentRow {...defaultProps} item={item} isOmni={true} />,
      );
      expect(container.firstChild).toHaveClass('opacity-60');
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicked', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<MobileEquipmentRow {...defaultProps} />);

      const row = screen.getByText('Medium Laser').closest('div');
      await user.click(row!);

      expect(defaultProps.onSelect).toHaveBeenCalled();
    });

    it('should highlight when selected', () => {
      const { container } = render(
        <MobileEquipmentRow {...defaultProps} isSelected={true} />,
      );
      expect(container.firstChild).toHaveClass('bg-accent/10');
    });
  });

  describe('Remove Button', () => {
    it('should show remove button for removable equipment', () => {
      render(<MobileEquipmentRow {...defaultProps} />);
      expect(screen.getByTitle('Remove from unit')).toBeInTheDocument();
    });

    it('should not show remove button for non-removable equipment', () => {
      const item = createItem({ isRemovable: false });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(screen.queryByTitle('Remove from unit')).not.toBeInTheDocument();
    });

    it('should require confirmation to remove', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<MobileEquipmentRow {...defaultProps} />);

      const removeButton = screen.getByTitle('Remove from unit');
      await user.click(removeButton);

      expect(defaultProps.onRemove).not.toHaveBeenCalled();
      expect(screen.getByTitle('Confirm remove')).toBeInTheDocument();
    });

    it('should call onRemove after confirmation click', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<MobileEquipmentRow {...defaultProps} />);

      const removeButton = screen.getByTitle('Remove from unit');
      await user.click(removeButton);

      const confirmButton = screen.getByTitle('Confirm remove');
      await user.click(confirmButton);

      expect(defaultProps.onRemove).toHaveBeenCalled();
    });

    it('should reset confirmation after timeout', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<MobileEquipmentRow {...defaultProps} />);

      const removeButton = screen.getByTitle('Remove from unit');
      await user.click(removeButton);

      expect(screen.getByTitle('Confirm remove')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3500);
      });

      expect(screen.getByTitle('Remove from unit')).toBeInTheDocument();
    });
  });

  describe('Unassign Button', () => {
    it('should show unassign button for allocated equipment', () => {
      const item = createItem({ isAllocated: true, location: 'Right Torso' });
      render(
        <MobileEquipmentRow
          {...defaultProps}
          item={item}
          onUnassign={jest.fn()}
        />,
      );
      expect(screen.getByTitle('Unassign from slot')).toBeInTheDocument();
    });

    it('should require confirmation to unassign', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onUnassign = jest.fn();
      const item = createItem({ isAllocated: true, location: 'Right Torso' });
      render(
        <MobileEquipmentRow
          {...defaultProps}
          item={item}
          onUnassign={onUnassign}
        />,
      );

      const unassignButton = screen.getByTitle('Unassign from slot');
      await user.click(unassignButton);

      expect(onUnassign).not.toHaveBeenCalled();
      expect(screen.getByTitle('Confirm unassign')).toBeInTheDocument();
    });

    it('should call onUnassign after confirmation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onUnassign = jest.fn();
      const item = createItem({ isAllocated: true, location: 'Right Torso' });
      render(
        <MobileEquipmentRow
          {...defaultProps}
          item={item}
          onUnassign={onUnassign}
        />,
      );

      const unassignButton = screen.getByTitle('Unassign from slot');
      await user.click(unassignButton);

      const confirmButton = screen.getByTitle('Confirm unassign');
      await user.click(confirmButton);

      expect(onUnassign).toHaveBeenCalled();
    });
  });

  describe('Quick Assign', () => {
    const availableLocations = [
      {
        location: 'Right Torso',
        label: 'Right Torso',
        availableSlots: 5,
        canFit: true,
      },
      {
        location: 'Left Torso',
        label: 'Left Torso',
        availableSlots: 3,
        canFit: true,
      },
    ];

    it('should show link button for unallocated equipment with available locations', () => {
      render(
        <MobileEquipmentRow
          {...defaultProps}
          onQuickAssign={jest.fn()}
          availableLocations={availableLocations}
        />,
      );
      expect(screen.getByTitle('Assign to location')).toBeInTheDocument();
    });

    it('should show location dropdown when link button is clicked', async () => {
      const _user = userEvent.setup({
        advanceTimers: jest.advanceTimersByTime,
      });
      render(
        <MobileEquipmentRow
          {...defaultProps}
          onQuickAssign={jest.fn()}
          availableLocations={availableLocations}
          isLocationMenuOpen={true}
          onToggleLocationMenu={jest.fn()}
        />,
      );

      expect(screen.getByText('Assign to Location')).toBeInTheDocument();
      expect(screen.getByText('Right Torso')).toBeInTheDocument();
      expect(screen.getByText('Left Torso')).toBeInTheDocument();
    });

    it('should show available slots in dropdown', () => {
      render(
        <MobileEquipmentRow
          {...defaultProps}
          onQuickAssign={jest.fn()}
          availableLocations={availableLocations}
          isLocationMenuOpen={true}
          onToggleLocationMenu={jest.fn()}
        />,
      );

      expect(screen.getByText('5 free')).toBeInTheDocument();
      expect(screen.getByText('3 free')).toBeInTheDocument();
    });

    it('should call onQuickAssign when location is selected', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const onQuickAssign = jest.fn();
      const onToggleLocationMenu = jest.fn();

      render(
        <MobileEquipmentRow
          {...defaultProps}
          onQuickAssign={onQuickAssign}
          availableLocations={availableLocations}
          isLocationMenuOpen={true}
          onToggleLocationMenu={onToggleLocationMenu}
        />,
      );

      const rtButton = screen.getByText('Right Torso').closest('button');
      await user.click(rtButton!);

      expect(onQuickAssign).toHaveBeenCalledWith('Right Torso');
    });
  });

  describe('Lock Icon', () => {
    it('should show lock icon for non-removable equipment', () => {
      const item = createItem({ isRemovable: false });
      render(<MobileEquipmentRow {...defaultProps} item={item} />);
      expect(
        document.querySelector('[data-icon-name="lock"]'),
      ).toBeInTheDocument();
    });
  });
});

describe('Mobile equipment keyboard and ownership', () => {
  const item: MobileEquipmentItem = {
    instanceId: 'laser-mobile',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    isAllocated: true,
    location: 'Left Arm',
    isRemovable: true,
    isOmniPodMounted: false,
  };

  it('selects and confirms removal with named keyboard actions', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    render(
      <MobileEquipmentRow
        item={item}
        onSelect={onSelect}
        onRemove={onRemove}
      />,
    );
    const select = screen.getByRole('button', {
      name: 'Select Medium Laser in Left Arm',
    });
    select.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    screen
      .getByRole('button', { name: 'Remove Medium Laser from Left Arm' })
      .focus();
    await user.keyboard('{Enter}');
    expect(onRemove).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('keeps fixed Omni equipment selectable without offering remove or unassign', () => {
    render(
      <MobileEquipmentRow
        item={item}
        isOmni
        onSelect={jest.fn()}
        onRemove={jest.fn()}
        onUnassign={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Select Medium Laser in Left Arm' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: /^Remove/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Unassign/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByTitle('Fixed OmniMech equipment')).toBeInTheDocument();
  });

  it('retains initial fixed placement and explains unavailable locations', async () => {
    const onQuickAssign = jest.fn();
    const user = userEvent.setup();
    render(
      <MobileEquipmentRow
        item={{ ...item, isAllocated: false, location: undefined }}
        isOmni
        onQuickAssign={onQuickAssign}
        isLocationMenuOpen
        availableLocations={[
          {
            location: 'Head',
            label: 'Head',
            availableSlots: 0,
            canFit: false,
            reason: 'No free critical slots',
          },
          {
            location: 'Left Arm',
            label: 'Left Arm',
            availableSlots: 2,
            canFit: true,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Head No free critical slots/ }),
    ).toBeDisabled();
    const arm = screen.getByRole('button', { name: /Left Arm 2 free/ });
    arm.focus();
    await user.keyboard('{Enter}');
    expect(onQuickAssign).toHaveBeenCalledWith('Left Arm');
  });
});
