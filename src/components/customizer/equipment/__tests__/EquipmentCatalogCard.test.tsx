import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import { EquipmentCatalogCard } from '../EquipmentCatalogCard';

const laser: IEquipmentItem = {
  id: 'small-laser',
  name: 'Small Laser',
  category: EquipmentCategory.ENERGY_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 0.5,
  criticalSlots: 1,
  costCBills: 11250,
  battleValue: 9,
  introductionYear: 2300,
};

it('shows mounted count and excess tonnage while keeping Add enabled', async () => {
  const user = userEvent.setup();
  const { onAdd } = setup({ mountedCount: 3, remainingWeight: -2.5 });
  expect(screen.getByText('×3 mounted')).toBeInTheDocument();
  expect(screen.getAllByText('+3.0 t over')).toHaveLength(2);
  const add = screen.getByRole('button', { name: 'Add Small Laser' });
  expect(add).toBeEnabled();
  await user.click(add);
  expect(onAdd).toHaveBeenCalledTimes(1);
});

it('omits mounted and over badges when the item is absent and fits exactly', () => {
  setup({ remainingWeight: 0.5 });
  expect(screen.queryByText(/mounted/)).not.toBeInTheDocument();
  expect(screen.queryByText(/t over/)).not.toBeInTheDocument();
});

function setup(
  props: Partial<React.ComponentProps<typeof EquipmentCatalogCard>> = {},
) {
  const onInspect = jest.fn();
  const onAdd = jest.fn();
  const onAddAndPlace = jest.fn();
  render(
    <EquipmentCatalogCard
      equipment={laser}
      expanded={false}
      readOnly={false}
      onInspect={onInspect}
      onAdd={onAdd}
      onAddAndPlace={onAddAndPlace}
      {...props}
    />,
  );
  return { onInspect, onAdd, onAddAndPlace };
}

it.each([false, true])(
  'keeps one split action with details expanded=%s',
  async (expanded) => {
    const user = userEvent.setup();
    const { onAdd, onAddAndPlace } = setup({ expanded });
    const row = screen.getByTestId('equipment-catalog-row');
    expect(within(row).getAllByRole('button')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Add Small Laser' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Add options for Small Laser' }),
    );
    const menu = screen.getByRole('menu');
    expect(row).not.toContainElement(menu);
    await user.click(
      within(menu).getByRole('menuitem', { name: 'Add and place Small Laser' }),
    );
    expect(onAddAndPlace).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  },
);

it('adds to unassigned from the menu and returns focus', async () => {
  const user = userEvent.setup();
  const { onAdd, onAddAndPlace } = setup();
  const trigger = screen.getByRole('button', {
    name: 'Add options for Small Laser',
  });
  await user.click(trigger);
  await user.click(screen.getByRole('menuitem', { name: 'Add to unassigned' }));
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAddAndPlace).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});

it('closes the menu when its caret is clicked again', async () => {
  const user = userEvent.setup();
  setup();
  const trigger = screen.getByRole('button', {
    name: 'Add options for Small Laser',
  });
  await user.click(trigger);
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('ignores queued scroll events but dismisses when its anchor moves', async () => {
  const user = userEvent.setup();
  setup();
  const trigger = screen.getByRole('button', {
    name: 'Add options for Small Laser',
  });
  const bounds = jest
    .spyOn(trigger, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(300, 600, 44, 44));
  await user.click(trigger);

  // Scrolling the row into view can deliver its event after the menu opens.
  fireEvent.scroll(window);
  expect(screen.getByRole('menu')).toBeVisible();
  expect(
    screen.getByRole('menuitem', { name: 'Add to unassigned' }),
  ).toHaveFocus();

  bounds.mockReturnValue(new DOMRect(300, 580, 44, 44));
  fireEvent.scroll(window);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  bounds.mockRestore();
});

it('supports arrow navigation, Escape, Tab and outside dismissal', async () => {
  const user = userEvent.setup();
  setup();
  const trigger = screen.getByRole('button', {
    name: 'Add options for Small Laser',
  });
  trigger.focus();
  await user.keyboard('{ArrowDown}');
  expect(
    screen.getByRole('menuitem', { name: 'Add to unassigned' }),
  ).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  expect(
    screen.getByRole('menuitem', { name: 'Add and place Small Laser' }),
  ).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  expect(
    screen.getByRole('menuitem', { name: 'Add to unassigned' }),
  ).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  await user.click(trigger);
  await user.tab();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  await user.click(trigger);
  await user.click(
    screen.getByRole('button', { name: 'Details for Small Laser' }),
  );
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('omits the caret without placement and disables both parts when readOnly', () => {
  setup({ onAddAndPlace: undefined });
  expect(
    screen.queryByRole('button', { name: 'Add options for Small Laser' }),
  ).not.toBeInTheDocument();
});

it('disables add actions when readOnly but keeps details available', () => {
  setup({ expanded: true, readOnly: true });
  expect(
    screen.getByRole('button', { name: 'Add Small Laser' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Add options for Small Laser' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Details for Small Laser' }),
  ).toBeEnabled();
});
