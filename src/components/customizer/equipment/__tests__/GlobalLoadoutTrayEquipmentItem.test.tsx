import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { EquipmentCategory } from '@/types/equipment';

import { LoadoutEquipmentItem } from '../GlobalLoadoutTray.types';
import { GlobalLoadoutTrayEquipmentItem } from '../GlobalLoadoutTrayEquipmentItem';

function createEquipment(
  overrides: Partial<LoadoutEquipmentItem> = {},
): LoadoutEquipmentItem {
  return {
    instanceId: 'laser-1',
    equipmentId: 'medium-laser',
    name: 'Medium Laser',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 1,
    criticalSlots: 1,
    isAllocated: false,
    isRemovable: true,
    ...overrides,
  };
}

function renderItem(
  item: LoadoutEquipmentItem = createEquipment(),
  props: Partial<
    React.ComponentProps<typeof GlobalLoadoutTrayEquipmentItem>
  > = {},
) {
  const onSelect = jest.fn();
  const onRemove = jest.fn();
  const onContextMenu = jest.fn();

  render(
    <GlobalLoadoutTrayEquipmentItem
      item={item}
      isSelected={false}
      onSelect={onSelect}
      onRemove={onRemove}
      onContextMenu={onContextMenu}
      {...props}
    />,
  );

  return { onSelect, onRemove, onContextMenu };
}

describe('GlobalLoadoutTrayEquipmentItem', () => {
  it('exposes separate keyboard controls for selection and two-step removal', async () => {
    const user = userEvent.setup();
    const item = createEquipment({
      isAllocated: true,
      location: 'Right Torso',
    });
    const { onSelect, onRemove } = renderItem(item, { isSelected: true });

    const selectButton = screen.getByRole('button', {
      name: 'Select Medium Laser in Right Torso',
    });
    expect(selectButton).toHaveAttribute('aria-pressed', 'true');
    expect(selectButton.querySelector('button')).not.toBeInTheDocument();

    selectButton.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Like a group card, the item ends in a chevron; it opens the actions.
    expect(
      screen.queryByRole('button', {
        name: 'Remove Medium Laser from Right Torso',
      }),
    ).not.toBeInTheDocument();
    const actions = screen.getByRole('button', {
      name: 'Show actions for Medium Laser in Right Torso',
    });
    expect(actions).toHaveAttribute('aria-expanded', 'false');
    expect(actions.querySelector('svg')).toHaveAttribute(
      'data-icon-name',
      'chevron-down',
    );
    expect(actions).toHaveClass('w-11', 'min-h-11');
    actions.focus();
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('button', {
        name: 'Hide actions for Medium Laser in Right Torso',
      }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(onSelect).toHaveBeenCalledTimes(1);

    const removeButton = screen.getByRole('button', {
      name: 'Remove Medium Laser from Right Torso',
    });
    expect(removeButton).toHaveTextContent('Remove');
    await user.click(removeButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();

    const confirmButton = screen.getByRole('button', {
      name: 'Confirm removal of Medium Laser from Right Torso',
    });
    expect(confirmButton).toHaveTextContent('Confirm Remove');
    confirmButton.focus();
    await user.keyboard('{Enter}');

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('keeps fixed Omni equipment selectable but blocks dragging and removal', async () => {
    const user = userEvent.setup();
    const item = createEquipment({
      isRemovable: false,
      isOmniPodMounted: false,
    });
    const { onSelect } = renderItem(item, { isOmni: true });

    const selectButton = screen.getByRole('button', {
      name: 'Select Medium Laser (Fixed) in unallocated loadout',
    });
    const row = selectButton.closest('[draggable]');

    expect(row).toHaveAttribute('draggable', 'false');
    await user.click(
      screen.getByRole('button', {
        name: 'Show actions for Medium Laser (Fixed) in unallocated loadout',
      }),
    );
    expect(
      screen.queryByRole('button', { name: /remove medium laser/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTitle('Managed by configuration')).toHaveTextContent(
      'Managed by Configuration',
    );

    selectButton.focus();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('preserves drag selection and the row context menu', () => {
    const { onSelect, onContextMenu } = renderItem();
    const selectButton = screen.getByRole('button', {
      name: 'Select Medium Laser in unallocated loadout',
    });
    const row = selectButton.closest('[draggable]');
    const dataTransfer = {
      setData: jest.fn(),
      effectAllowed: 'none',
    } as unknown as DataTransfer;

    expect(row).toHaveAttribute('draggable', 'true');
    fireEvent.dragStart(row as HTMLElement, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      'text/equipment-id',
      'laser-1',
    );
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.contextMenu(selectButton);
    expect(onContextMenu).toHaveBeenCalledTimes(1);
  });
});
