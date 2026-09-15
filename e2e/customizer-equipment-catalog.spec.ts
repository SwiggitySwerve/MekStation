import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});
const CATALOG_COLUMNS = [
  'name',
  'category',
  'weight',
  'criticalSlots',
  'heat',
  'actions',
] as const;
const SORT_LABEL_COLUMNS = ['name', 'weight', 'criticalSlots'] as const;
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
async function loadAtlas(page: Page) {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Load from Library' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add unit', exact: true });
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await dialog.getByText('AS7-D', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
}
async function hideUnmatchedAmmo(page: Page, hidden: boolean) {
  await page
    .getByRole('button', { name: 'Visibility filters', exact: true })
    .click();
  const toggle = page.getByRole('button', {
    name: 'Ammo without weapon',
    exact: true,
  });
  if ((await toggle.getAttribute('aria-pressed')) !== String(hidden))
    await toggle.click();
  await page.keyboard.press('Escape');
}
const details = (page: Page, name: string) =>
  page.getByRole('button', { name: `Details for ${name}`, exact: true });
const catalogHeader = (page: Page) =>
  page.locator('[aria-label="Sort equipment columns"]');
async function columnCenters(root: Locator) {
  return root.evaluate(
    (element, columns) => {
      const centers: Record<string, number> = {};
      for (const column of columns) {
        const cell = element.querySelector(`[data-catalog-column="${column}"]`);
        if (!cell) throw new Error(`missing data-catalog-column=${column}`);
        const box = cell.getBoundingClientRect();
        centers[column] = box.x + box.width / 2;
      }
      return centers;
    },
    [...CATALOG_COLUMNS],
  );
}
async function expectColumnsAligned(page: Page, row: Locator) {
  const headerCenters = await columnCenters(catalogHeader(page));
  const rowCenters = await columnCenters(row);
  for (const column of CATALOG_COLUMNS) {
    expect(
      Math.abs(rowCenters[column] - headerCenters[column]),
      `${column} center`,
    ).toBeLessThanOrEqual(2);
  }
  const sortLabels = await catalogHeader(page).evaluate(
    (element, columns) => {
      const centers: Record<string, { span: number; cell: number }> = {};
      for (const column of columns) {
        const cell = element.querySelector(`[data-catalog-column="${column}"]`);
        if (!cell) throw new Error(`missing data-catalog-column=${column}`);
        const span = cell.querySelector('span');
        if (!span) throw new Error(`missing sort label span for ${column}`);
        const spanBox = span.getBoundingClientRect();
        const cellBox = cell.getBoundingClientRect();
        centers[column] = {
          span: spanBox.x + spanBox.width / 2,
          cell: cellBox.x + cellBox.width / 2,
        };
      }
      return centers;
    },
    [...SORT_LABEL_COLUMNS],
  );
  for (const column of SORT_LABEL_COLUMNS) {
    expect(
      Math.abs(sortLabels[column].span - sortLabels[column].cell),
      `${column} sort label`,
    ).toBeLessThanOrEqual(2);
    expect(
      Math.abs(sortLabels[column].span - rowCenters[column]),
      `${column} sort label to row`,
    ).toBeLessThanOrEqual(2);
  }
}
async function expectClickTarget(target: Locator) {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
}
async function noDocumentOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function rowName(row: Locator) {
  const label = await row
    .getByRole('button', { name: /^Details for / })
    .getAttribute('aria-label');
  return label?.slice('Details for '.length) ?? '';
}

test('electronics and compatible ammo update without changing unrelated filters @customizer', async ({
  page,
}, testInfo) => {
  expect(1, 'roadmap R1.ci task 5.4 negative probe: intentional failure, never merge').toBe(2);
  await loadAtlas(page);
  const search = page.getByRole('textbox', {
    name: 'Search equipment',
    exact: true,
  });
  await page.getByRole('button', { name: 'Electronics', exact: true }).click();
  const before = await page
    .getByTestId('equipment-catalog-row')
    .allTextContents();
  expect(before.length).toBeGreaterThan(0);
  await hideUnmatchedAmmo(page, true);
  expect(
    await page.getByTestId('equipment-catalog-row').allTextContents(),
  ).toEqual(before);
  await hideUnmatchedAmmo(page, false);
  expect(
    await page.getByTestId('equipment-catalog-row').allTextContents(),
  ).toEqual(before);
  await page.getByRole('button', { name: 'Ammo', exact: true }).click();
  await hideUnmatchedAmmo(page, true);
  await search.fill('SRM Ammo');
  await expect(details(page, 'SRM Ammo')).toBeVisible();
  await search.fill('LRM Ammo');
  await expect(details(page, 'LRM Ammo')).toBeVisible();
  await search.fill('Gauss Ammo');
  await expect(details(page, 'Gauss Ammo')).toBeHidden();
  await page.getByRole('button', { name: 'Ballistic', exact: true }).click();
  await search.fill('Gauss Rifle');
  await page
    .getByRole('button', { name: 'Add Gauss Rifle', exact: true })
    .click();
  await page.getByRole('button', { name: 'Ammo', exact: true }).click();
  await search.fill('Gauss Ammo');
  await expect(details(page, 'Gauss Ammo')).toBeVisible();
  await page.getByRole('button', { name: /^Undo(?::|$)/ }).click();
  await expect(details(page, 'Gauss Ammo')).toBeHidden();
  await page.getByRole('button', { name: /^Redo(?::|$)/ }).click();
  await expect(details(page, 'Gauss Ammo')).toBeVisible();
  await page.getByRole('button', { name: 'Electronics', exact: true }).click();
  await search.fill('');
  await page.screenshot({
    path: testInfo.outputPath('electronics-desktop.png'),
    animations: 'disabled',
  });
});

test('add and place cancels cleanly and persists with one undo on desktop and mobile @customizer', async ({
  page,
}, testInfo) => {
  await loadAtlas(page);
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('Small Laser');
  const before = (await draft(page)).equipment;
  await details(page, 'Small Laser').click();
  const add = page.getByRole('button', {
    name: 'Add and place Small Laser',
    exact: true,
  });
  await add.click();
  const dialog = page.getByRole('dialog', {
    name: 'Add and place equipment',
    exact: true,
  });
  await expect(dialog.getByRole('option', { name: /^Head / })).toHaveJSProperty(
    'disabled',
    true,
  );
  await expect(
    dialog.getByRole('button', { name: 'Add and place', exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole('combobox', { name: 'Equipment location' })
    .selectOption('Left Arm');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await draft(page)).equipment).toEqual(before);
  await add.click();
  await dialog
    .getByRole('combobox', { name: 'Equipment location' })
    .selectOption('Left Arm');
  await dialog
    .getByRole('button', { name: 'Add and place', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const placed = (await draft(page)).equipment;
  expect(placed).toHaveLength(before.length + 1);
  expect(placed.find((e) => e.equipmentId === 'small-laser')).toMatchObject({
    location: 'Left Arm',
    slots: [6],
  });
  await page.getByRole('button', { name: /^Undo(?::|$)/ }).click();
  expect((await draft(page)).equipment).toEqual(before);
  await page.getByRole('button', { name: /^Redo(?::|$)/ }).click();
  expect((await draft(page)).equipment).toEqual(placed);
  await page.screenshot({
    path: testInfo.outputPath('catalog-desktop.png'),
    animations: 'disabled',
  });
  await page.reload();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('Small Laser');
  await details(page, 'Small Laser').click();
  await expect(add).toBeVisible();
  expect((await draft(page)).equipment).toEqual(placed);
  await page.setViewportSize({ width: 390, height: 844 });
  await add.click();
  await expect(dialog).toBeInViewport();
  await dialog
    .getByRole('combobox', { name: 'Equipment location' })
    .selectOption('Right Arm');
  await page.screenshot({
    path: testInfo.outputPath('placement-mobile.png'),
    animations: 'disabled',
  });
  await dialog
    .getByRole('button', { name: 'Add and place', exact: true })
    .click();
  await expect(dialog).toBeHidden();
  expect(
    (await draft(page)).equipment.filter(
      (e) => e.equipmentId === 'small-laser',
    ),
  ).toHaveLength(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const row = page.getByTestId('equipment-catalog-row').first();
  expect(await row.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  expect(
    Number(
      await row
        .getByTestId('equipment-catalog-row-fill')
        .evaluate((e) => getComputedStyle(e).opacity),
    ),
  ).toBeLessThanOrEqual(0.4);
  await page.screenshot({
    path: testInfo.outputPath('catalog-mobile.png'),
    animations: 'disabled',
  });
});

test('catalog rows stay dense and column-aligned on desktop and mobile @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1318, height: 912 });
  await loadAtlas(page);
  const search = page.getByRole('textbox', {
    name: 'Search equipment',
    exact: true,
  });
  await expect(page.getByTestId('equipment-catalog-row').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Add and place / }),
  ).toHaveCount(0);
  const rows = page.getByTestId('equipment-catalog-row');
  const visible = await rows.count();
  expect(visible).toBeGreaterThan(0);
  let longest = { name: '', length: 0, index: 0 };
  for (let index = 0; index < visible; index += 1) {
    const row = rows.nth(index);
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, `collapsed row ${index} height`).toBeLessThanOrEqual(
      48,
    );
    const name = await rowName(row);
    if (name.length > longest.length)
      longest = { name, length: name.length, index };
    await expectClickTarget(
      row.getByRole('button', { name: `Add ${name}`, exact: true }),
    );
    await expectColumnsAligned(page, row);
  }
  expect(longest.length).toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath('density-desktop-sidebar.png'),
    animations: 'disabled',
  });
  const scroll = page.getByTestId('equipment-catalog-scroll');
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const scrolled = rows.last();
  await expect(scrolled).toBeVisible();
  await expectColumnsAligned(page, scrolled);
  await page.screenshot({
    path: testInfo.outputPath('density-desktop-scrolled.png'),
    animations: 'disabled',
  });
  await scroll.evaluate((element) => {
    element.scrollTop = 0;
  });
  const first = rows.first();
  const name = await rowName(first);
  const before = (await draft(page)).equipment;
  await first.getByRole('button', { name: `Add ${name}`, exact: true }).click();
  const afterAdd = (await draft(page)).equipment;
  expect(afterAdd).toHaveLength(before.length + 1);
  await expect(
    page.getByRole('button', { name: /^Add and place / }),
  ).toHaveCount(0);
  const detailsBtn = first.getByRole('button', {
    name: `Details for ${name}`,
    exact: true,
  });
  await detailsBtn.focus();
  await page.keyboard.press('Enter');
  const place = page.getByRole('button', {
    name: `Add and place ${name}`,
    exact: true,
  });
  await expect(place).toBeVisible();
  let reachedPlace = false;
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press('Tab');
    if (await place.evaluate((element) => element === document.activeElement)) {
      reachedPlace = true;
      break;
    }
  }
  expect(reachedPlace).toBe(true);
  await detailsBtn.click();
  await expect(place).toHaveCount(0);
  const wide = page.getByRole('button', {
    name: 'Wide workspace',
    exact: true,
  });
  await expect(wide).toBeVisible();
  await wide.click();
  await expect(wide).toHaveAttribute('aria-pressed', 'true');
  await expectColumnsAligned(page, rows.first());
  await page.screenshot({
    path: testInfo.outputPath('density-desktop-wide.png'),
    animations: 'disabled',
  });
  await wide.click();
  await expect(wide).toHaveAttribute('aria-pressed', 'false');
  await expectColumnsAligned(page, rows.first());
  await noDocumentOverflow(page);
  await search.fill(longest.name);
  const longRow = page.getByTestId('equipment-catalog-row').first();
  await expect(
    longRow.getByRole('button', {
      name: `Details for ${longest.name}`,
      exact: true,
    }),
  ).toBeVisible();
  const longBox = await longRow.boundingBox();
  expect(longBox).not.toBeNull();
  expect(longBox!.height).toBeLessThanOrEqual(48);
  await expectColumnsAligned(page, longRow);
  await search.fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('equipment-catalog-row').first()).toBeVisible();
  await expect(catalogHeader(page)).toBeHidden();
  await expect(
    page.getByRole('button', { name: /^Add and place / }),
  ).toHaveCount(0);
  const mobileRows = page.getByTestId('equipment-catalog-row');
  const mobileCount = Math.min(await mobileRows.count(), 6);
  for (let index = 0; index < mobileCount; index += 1) {
    const row = mobileRows.nth(index);
    const mobileName = await rowName(row);
    await expectClickTarget(
      row.getByRole('button', { name: `Add ${mobileName}`, exact: true }),
    );
  }
  const mobileFirst = mobileRows.first();
  const mobileName = await rowName(mobileFirst);
  await mobileFirst
    .getByRole('button', { name: `Details for ${mobileName}`, exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: `Add and place ${mobileName}`,
      exact: true,
    }),
  ).toBeVisible();
  await noDocumentOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('density-mobile.png'),
    animations: 'disabled',
  });
});
