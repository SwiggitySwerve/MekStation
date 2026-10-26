import { test, expect, type Page } from '@playwright/test';

async function draft(page: Page) {
  return page.evaluate(() => {
    const id = location.pathname.split('/')[2];
    return JSON.parse(localStorage.getItem(`megamek-unit-${id}`)!).state as {
      equipment: {
        instanceId: string;
        equipmentId: string;
        location?: string;
        slots?: number[];
      }[];
    };
  });
}

test('catalog copies mount, move and persist independently @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Load from Library' }).click();
  await page
    .getByRole('dialog')
    .getByRole('combobox')
    .first()
    .selectOption('canonical');
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const atlasId = new URL(page.url()).pathname.split('/')[2];
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  const search = page.getByRole('textbox', {
    name: 'Search equipment',
    exact: true,
  });
  await search.fill('Small Laser');
  await page
    .getByRole('button', { name: 'Details for Small Laser', exact: true })
    .click();
  await expect(
    page
      .getByRole('region', { name: 'Equipment catalog' })
      .getByText('1 / 2 / 3', { exact: true }),
  ).toBeVisible();
  const add = page.getByRole('button', {
    name: 'Add Small Laser',
    exact: true,
  });
  await add.click();
  await add.click();
  await expect
    .poll(
      async () =>
        (await draft(page)).equipment.filter(
          (e) => e.equipmentId === 'small-laser',
        ).length,
    )
    .toBe(2);
  const copies = (await draft(page)).equipment.filter(
    (e) => e.equipmentId === 'small-laser',
  );
  expect(new Set(copies.map((e) => e.instanceId)).size).toBe(2);
  expect(copies.every((e) => !e.location)).toBe(true);
  await expect(
    page.getByRole('status').filter({ hasText: 'Small Laser.' }),
  ).toContainText('unassigned');
  await page
    .getByRole('button', { name: 'Add unit (Ctrl+O)', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('combobox')
    .first()
    .selectOption('canonical');
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Locust LCT-1V');
  await page.getByText('LCT-1V', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await expect(search).toHaveValue('Small Laser');
  expect(
    (await draft(page)).equipment.some((e) =>
      copies.some((copy) => copy.instanceId === e.instanceId),
    ),
  ).toBe(false);
  const atlasTab = page.getByRole('tab', { name: 'Atlas AS7-D', exact: true });
  await atlasTab.click();
  await expect(atlasTab).toHaveAttribute('aria-selected', 'true');
  await expect
    .poll(() => new URL(page.url()).pathname.split('/')[2])
    .toBe(atlasId);
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await expect(search).toHaveValue('Small Laser');
  expect(
    (await draft(page)).equipment.filter(
      (e) => e.equipmentId === 'small-laser',
    ),
  ).toHaveLength(2);
  await page.screenshot({
    path: testInfo.outputPath('equipment-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Show 2 instances of Small Laser in Unassigned',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {
      name: 'Select Small Laser in unallocated loadout',
      exact: true,
    })
    .first()
    .click();
  const placement = page.getByRole('region', { name: 'Equipment placement' });
  await placement
    .getByRole('combobox', { name: 'Place selected equipment' })
    .selectOption('Left Arm');
  await expect
    .poll(
      async () =>
        (await draft(page)).equipment.find(
          (e) => e.instanceId === copies[0].instanceId,
        )?.slots,
    )
    .toEqual([6]);
  await page
    .getByRole('button', {
      name: 'Select Small Laser in unallocated loadout',
      exact: true,
    })
    .click();
  await placement
    .getByRole('combobox', { name: 'Place selected equipment' })
    .selectOption('Right Arm');
  await expect
    .poll(
      async () =>
        (await draft(page)).equipment.find(
          (e) => e.instanceId === copies[1].instanceId,
        )?.location,
    )
    .toBe('Right Arm');
  const leftArm = page.getByRole('group', {
    name: 'Left Arm critical slots',
    exact: true,
  });
  await leftArm
    .getByRole('gridcell', { name: 'Slot 7: Small Laser', exact: true })
    .click();
  await expect(placement.getByRole('option', { name: /^Head/ })).toBeDisabled();
  await placement
    .getByRole('combobox', { name: 'Place selected equipment' })
    .selectOption('Left Torso');
  await expect
    .poll(
      async () =>
        (await draft(page)).equipment.find(
          (e) => e.instanceId === copies[0].instanceId,
        )?.location,
    )
    .toBe('Left Torso');
  expect(
    (await draft(page)).equipment.find(
      (e) => e.instanceId === copies[1].instanceId,
    )?.location,
  ).toBe('Right Arm');
  await page
    .getByRole('group', { name: 'Left Torso critical slots', exact: true })
    .getByRole('gridcell', { name: 'Slot 12: Small Laser', exact: true })
    .click();
  await placement
    .getByRole('button', { name: 'Unassign selected equipment', exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await draft(page)).equipment.find(
          (e) => e.instanceId === copies[0].instanceId,
        )?.location,
    )
    .toBeUndefined();
  // Unassign preserves the active selection so it can be placed again directly.
  await placement
    .getByRole('combobox', { name: 'Place selected equipment' })
    .selectOption('Left Arm');
  await expect
    .poll(
      async () =>
        (await draft(page)).equipment.find(
          (e) => e.instanceId === copies[0].instanceId,
        )?.slots,
    )
    .toEqual([6]);
  await page.reload();
  await expect(
    page.getByRole('tab', { name: 'Critical Slots', exact: true }),
  ).toBeVisible();
  expect(
    (await draft(page)).equipment.find(
      (e) => e.instanceId === copies[0].instanceId,
    )?.location,
  ).toBe('Left Arm');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^Section:/ }).click();
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  // Catalog filters are session-global, not persisted across a page reload.
  await expect(search).toHaveValue('');
  await search.fill('NoSuchWeapon12345');
  await expect(
    page.getByText('No equipment found', { exact: true }),
  ).toBeVisible();
  await search.fill('Small Laser');
  await add.click();
  await page.getByRole('button', { name: /^Section:/ }).click();
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await page
    .getByRole('button', { name: 'Expand loadout', exact: true })
    .click();
  const mobileDrawer = page.getByRole('dialog', { name: 'Equipment Loadout' });
  await mobileDrawer
    .getByRole('button', {
      name: 'Assign Small Laser to location',
      exact: true,
    })
    .click();
  await mobileDrawer.getByRole('button', { name: /^Left Arm/ }).click();
  await mobileDrawer
    .getByRole('button', { name: 'Close loadout', exact: true })
    .click();
  const third = (await draft(page)).equipment
    .filter((e) => e.equipmentId === 'small-laser')
    .find((e) => !copies.some((copy) => copy.instanceId === e.instanceId))!;
  expect(third.slots).toEqual([7]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('criticals-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  const expand = page.getByTitle('Expand loadout', { exact: true });
  if (await expand.isVisible()) await expand.click();
  const select = page.getByRole('button', {
    name: 'Select Small Laser in Right Arm',
    exact: true,
  });
  await select.focus();
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  const remove = page.getByRole('button', {
    name: 'Remove Small Laser from Right Arm',
    exact: true,
  });
  await remove.focus();
  await page.keyboard.press('Enter');
  expect(
    (await draft(page)).equipment.some(
      (e) => e.instanceId === copies[1].instanceId,
    ),
  ).toBe(true);
  await page
    .getByRole('button', {
      name: 'Confirm removal of Small Laser from Right Arm',
      exact: true,
    })
    .press('Enter');
  await expect
    .poll(async () =>
      (await draft(page)).equipment.some(
        (e) => e.instanceId === copies[1].instanceId,
      ),
    )
    .toBe(false);
  expect(
    (await draft(page)).equipment.find(
      (e) => e.instanceId === copies[0].instanceId,
    )?.slots,
  ).toEqual([6]);
  await page.reload();
  expect(
    (await draft(page)).equipment.some(
      (e) => e.instanceId === copies[1].instanceId,
    ),
  ).toBe(false);
});
