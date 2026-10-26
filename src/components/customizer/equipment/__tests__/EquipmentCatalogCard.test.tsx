import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import { EquipmentCatalogCard } from '../EquipmentCatalogCard';

jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  getEquipmentLoader: () => ({
    getAmmunitionById: (id: string) =>
      id === 'ac-2-ammo' ? { shotsPerTon: 45 } : null,
    getElectronicsById: (id: string) =>
      id === 'loaded-comms'
        ? { special: ['Variable weight', 'Variable critical slots'] }
        : null,
    getMiscEquipmentById: () => null,
  }),
}));

jest.mock('@/utils/equipment/weapons/utilities', () => ({
  getWeaponById: (id: string) =>
    id === 'ac-2'
      ? {
          damage: 2,
          heat: 1,
          ranges: { short: 8, medium: 16, long: 24, minimum: 4 },
        }
      : id === 'small-laser'
        ? {
            damage: 3,
            heat: 1,
            ranges: { short: 1, medium: 2, long: 3, minimum: 0 },
          }
        : undefined,
}));

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

it('shows mounted count as plain text and marks an overweight item in the Tons cells', async () => {
  const user = userEvent.setup();
  const { onAdd } = setup({ mountedCount: 3, remainingWeight: 0.25 });
  expect(screen.getByText('×3 mounted')).toBeInTheDocument();
  // Desktop Tons cell and phone stats line each carry the warning and a
  // description; no per-row "t over" chip remains.
  expect(screen.getAllByText(/exceeds free weight by 0\.3 t/)).toHaveLength(2);
  expect(screen.queryByText(/t over/)).not.toBeInTheDocument();
  const add = screen.getByRole('button', { name: 'Add Small Laser' });
  expect(add).toBeEnabled();
  await user.click(add);
  expect(onAdd).toHaveBeenCalledTimes(1);
});

it('adds no weight annotation when nothing is free, so the browser notice speaks once', () => {
  setup({ remainingWeight: 0 });
  expect(screen.queryByText(/exceeds free weight/)).not.toBeInTheDocument();
  expect(screen.queryByText(/t over/)).not.toBeInTheDocument();
});

it.each([
  ['ac-2', '4'],
  ['small-laser', '—'],
  ['unknown-equipment', '—'],
])(
  'shows existing minimum range for %s in both comparison layouts',
  (id, minimum) => {
    setup({ equipment: { ...laser, id } });
    const row = screen.getByTestId('equipment-catalog-row');
    expect(
      row.querySelector('[data-catalog-column="minimumRange"]'),
    ).toHaveTextContent(minimum);
    const stats = screen.getByTestId('equipment-catalog-stats');
    expect(stats).toHaveTextContent(`Min ${minimum}`);
    expect(stats.children).toHaveLength(6);
  },
);

it('keeps damage for weapons and shows ammunition capacity as its own field', () => {
  setup({
    equipment: {
      ...laser,
      id: 'ac-2-ammo',
      name: 'AC/2 Ammo',
      category: EquipmentCategory.AMMUNITION,
    },
  });
  const row = screen.getByTestId('equipment-catalog-row');
  expect(row.querySelector('[data-catalog-column="damage"]')).toHaveTextContent(
    '—',
  );
  expect(
    row.querySelector('[data-catalog-column="category"]'),
  ).toHaveTextContent('Ammunition · 45 shots/t');
  const stats = screen.getByTestId('equipment-catalog-stats');
  expect(stats).toHaveTextContent('Shots 45');
  expect(stats).not.toHaveTextContent('Dmg');
  expect(stats.children).toHaveLength(6);
});

it('shows variable-size placeholders instead of 0 for items flagged variable without a formula', () => {
  setup({
    expanded: true,
    equipment: {
      ...laser,
      id: 'communications-equipment',
      name: 'Communications Equipment',
      weight: 0,
      criticalSlots: 0,
      special: ['Variable weight', 'Variable critical slots'],
    },
  });
  const row = screen.getByTestId('equipment-catalog-row');
  expect(row.querySelector('[data-catalog-column="weight"]')).toHaveTextContent(
    'Variable',
  );
  expect(
    row.querySelector('[data-catalog-column="criticalSlots"]'),
  ).toHaveTextContent('Variable');
  expect(screen.getByTestId('equipment-catalog-stats')).toHaveTextContent(
    'Tons Variable',
  );
  expect(row).toHaveTextContent('depend on the size chosen');
});

it('reads variable-size notes from the loaded record when the catalog item omits them', () => {
  setup({
    equipment: {
      ...laser,
      id: 'loaded-comms',
      name: 'Communications Equipment',
      weight: 0,
      criticalSlots: 0,
    },
  });
  expect(screen.getByTestId('equipment-catalog-stats')).toHaveTextContent(
    'Slots Variable',
  );
});

it('repeats no column value in the expanded details', () => {
  setup({ expanded: true, equipment: { ...laser, id: 'ac-2' } });
  expect(screen.queryByText('Minimum range')).not.toBeInTheDocument();
  expect(screen.getByText('Battle value')).toBeInTheDocument();
});

it('omits mounted and weight annotations when the item is absent and fits exactly', () => {
  setup({ remainingWeight: 0.5 });
  expect(screen.queryByText(/mounted/)).not.toBeInTheDocument();
  expect(screen.queryByText(/exceeds free weight/)).not.toBeInTheDocument();
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
