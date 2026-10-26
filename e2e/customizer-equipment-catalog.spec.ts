import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});
const CATALOG_COLUMNS = [
  'name',
  'damage',
  'range',
  'heat',
  'weight',
  'criticalSlots',
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
  // Name reads left-aligned; numeric columns read right-aligned, so each sort
  // label shares the edge its values align to.
  const edges = async (root: Locator) =>
    root.evaluate(
      (element, columns) => {
        const result: Record<string, { left: number; right: number }> = {};
        for (const column of columns) {
          const cell = element.querySelector(
            `[data-catalog-column="${column}"]`,
          );
          if (!cell) throw new Error(`missing data-catalog-column=${column}`);
          const text = cell.querySelector('span') ?? cell;
          const box = text.getBoundingClientRect();
          result[column] = { left: box.left, right: box.right };
        }
        return result;
      },
      [...SORT_LABEL_COLUMNS],
    );
  const labelEdges = await edges(catalogHeader(page));
  const rowEdges = await edges(row);
  expect(
    Math.abs(labelEdges.name.left - rowEdges.name.left),
    'name sort label to row',
  ).toBeLessThanOrEqual(2);
  for (const column of ['weight', 'criticalSlots'] as const) {
    expect(
      Math.abs(labelEdges[column].right - rowEdges[column].right),
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

async function expectInitialScrollBoundary(page: Page) {
  const scroll = page.getByTestId('equipment-catalog-scroll');
  await expect(scroll).toHaveJSProperty('scrollTop', 0);
  const list = (await scroll.boundingBox())!;
  const footer = (await page
    .getByTestId('equipment-pagination')
    .boundingBox())!;
  expect(
    footer.y - list.y - list.height,
    'visible separation above pagination',
  ).toBeGreaterThanOrEqual(8);
  await expect(scroll).toHaveCSS('overflow-y', 'auto');
  await expect(scroll.locator('..')).toHaveAttribute('data-more-below', 'true');
  const fade = await scroll.locator('..').evaluate((element) => {
    const style = getComputedStyle(element, '::after');
    return {
      height: style.height,
      background: style.backgroundImage,
      pointerEvents: style.pointerEvents,
    };
  });
  expect(fade.height).toBe('32px');
  expect(fade.background).toContain('linear-gradient');
  expect(fade.pointerEvents).toBe('none');
  const rowInGap = await page.evaluate(
    ({ x, y }) =>
      document
        .elementsFromPoint(x, y)
        .some((element) =>
          element.closest('[data-testid="equipment-catalog-row"]'),
        ),
    { x: list.x + list.width / 2, y: list.y + list.height + 4 },
  );
  expect(rowInGap, 'rows must be clipped before the pagination gap').toBe(
    false,
  );
}

test('short catalog results have an end marker without pagination @customizer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAtlas(page);
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('ER PPC');
  await expect(page.getByTestId('equipment-catalog-row')).toHaveCount(1);
  await expect(page.getByTestId('equipment-pagination')).toHaveCount(0);
  await expect(page.getByText('End of results · 1 item')).toBeVisible();
  await details(page, 'ER PPC').click();
  await expect(
    page.getByTestId('equipment-catalog-scroll').locator('..'),
  ).toHaveAttribute('data-more-below', 'false');
  await expect(page.getByText('End of results · 1 item')).toBeInViewport({
    ratio: 1,
  });
  await page.getByRole('button', { name: 'Add ER PPC', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'ER PPC.' }),
  ).toBeVisible();
});

test('electronics and compatible ammo update without changing unrelated filters @customizer', async ({
  page,
}, testInfo) => {
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
  const options = page.getByRole('button', {
    name: 'Add options for Small Laser',
    exact: true,
  });
  const add = page.getByRole('menuitem', {
    name: 'Add and place Small Laser',
    exact: true,
  });
  await options.click();
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
  await options.click();
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
  await expect(options).toBeVisible();
  expect((await draft(page)).equipment).toEqual(placed);
  await page.setViewportSize({ width: 390, height: 844 });
  await options.click();
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
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadAtlas(page);
  const search = page.getByRole('textbox', {
    name: 'Search equipment',
    exact: true,
  });
  await expect(page.getByTestId('equipment-catalog-row').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Add options for / }),
  ).toHaveCount(25);
  const rows = page.getByTestId('equipment-catalog-row');
  await expectInitialScrollBoundary(page);
  const rangeHeader = catalogHeader(page).locator(
    '[data-catalog-column="range"]',
  );
  await expect(rangeHeader).toHaveText('Range');
  await expect(rangeHeader).toHaveAttribute(
    'title',
    'Range (short / medium / long)',
  );
  expect((await rangeHeader.boundingBox())!.height).toBeLessThan(20);
  await expect(
    rows
      .filter({ has: details(page, 'AC/10 Ammo') })
      .locator('[data-catalog-column="damage"]'),
  ).toHaveText('10 shots');
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: testInfo.outputPath('catalog-initial-wide.png'),
    animations: 'disabled',
  });
  const visible = await rows.count();
  expect(visible).toBe(25);
  let longest = { name: '', length: 0, index: 0 };
  for (let index = 0; index < visible; index += 1) {
    const row = rows.nth(index);
    const box = await row.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height, `collapsed row ${index} height`).toBeLessThanOrEqual(
      48,
    );
    const nameCell = row.locator('[data-catalog-column="name"]');
    expect((await nameCell.boundingBox())!.width).toBeGreaterThanOrEqual(240);
    await expect(
      nameCell.locator('[data-icon-name="chevron-right"]'),
    ).toBeVisible();
    await expect(row.locator('[data-icon-name="chevron-down"]')).toHaveCount(0);
    await expect(row.locator('[data-icon-name="more"]')).toHaveCount(1);
    const name = await rowName(row);
    if (name.length > longest.length)
      longest = { name, length: name.length, index };
    await expectClickTarget(
      row.getByRole('button', { name: `Add ${name}`, exact: true }),
    );
    await expectClickTarget(
      row.getByRole('button', { name: `Add options for ${name}`, exact: true }),
    );
    await expectColumnsAligned(page, row);
  }
  const firstRow = rows.first();
  const rowBounds = (await firstRow.boundingBox())!;
  const actionBounds = (await firstRow
    .locator('[data-catalog-column="actions"]')
    .boundingBox())!;
  expect(
    rowBounds.x + rowBounds.width - actionBounds.x - actionBounds.width,
  ).toBeLessThanOrEqual(14);
  await page.mouse.move(0, 0);
  const sortButtons = catalogHeader(page).getByRole('button');
  for (const button of await sortButtons.all()) {
    const active = (await button.getAttribute('aria-pressed')) === 'true';
    await expect(button.locator('span[aria-hidden="true"]')).toHaveCSS(
      'opacity',
      active ? '1' : '0',
    );
  }
  const weightSort = catalogHeader(page).locator(
    '[data-catalog-column="weight"]',
  );
  await weightSort.focus();
  await expect(weightSort.locator('span[aria-hidden="true"]')).toHaveCSS(
    'opacity',
    '0.4',
  );
  await weightSort.click();
  await expect(weightSort).toHaveAttribute('aria-pressed', 'true');
  await expect(weightSort).toHaveAccessibleName('Sort by weight, ascending');
  await weightSort.click();
  await expect(weightSort).toHaveAccessibleName('Sort by weight, descending');
  await catalogHeader(page)
    .getByRole('button', { name: 'Sort by name', exact: true })
    .click();
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
  const lastBounds = (await scrolled.boundingBox())!;
  const footerBounds = (await page
    .getByTestId('equipment-pagination')
    .boundingBox())!;
  expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(
    footerBounds.y - 12,
  );
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
    page.getByRole('button', { name: /^Add options for / }),
  ).toHaveCount(25);
  const detailsBtn = first.getByRole('button', {
    name: `Details for ${name}`,
    exact: true,
  });
  const rowAdd = first.getByRole('button', {
    name: `Add ${name}`,
    exact: true,
  });
  const collapsedAction = (await rowAdd.boundingBox())!;
  await detailsBtn.focus();
  await page.keyboard.press('Enter');
  expect(await rowAdd.boundingBox()).toEqual(collapsedAction);
  expect(await first.getByRole('button').count()).toBe(3);
  await page.keyboard.press('Tab');
  await expect(rowAdd).toBeFocused();
  await page.keyboard.press('Tab');
  const options = first.getByRole('button', {
    name: `Add options for ${name}`,
    exact: true,
  });
  await expect(options).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(
    page.getByRole('menuitem', { name: 'Add to unassigned', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const place = page.getByRole('menuitem', {
    name: `Add and place ${name}`,
    exact: true,
  });
  await expect(place).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(options).toBeFocused();
  await expect(place).toBeHidden();
  await detailsBtn.click();
  expect(await rowAdd.boundingBox()).toEqual(collapsedAction);
  const wide = page.getByRole('button', {
    name: 'Hide loadout panel',
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
  await expectInitialScrollBoundary(page);
  const firstStats = page.getByTestId('equipment-catalog-stats').first();
  expect(
    (await firstStats.boundingBox())!.height,
    'AC/10 stats fit on one full-width line',
  ).toBeLessThanOrEqual(28);
  for (const pair of await firstStats.locator(':scope > span').all()) {
    await expect(pair).toHaveCSS('white-space', 'nowrap');
    await expect(pair).toHaveCSS('font-size', '13px');
    expect((await pair.boundingBox())!.height).toBeLessThanOrEqual(20);
  }
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: testInfo.outputPath('catalog-initial-phone.png'),
    animations: 'disabled',
  });
  const categories = page.getByTestId('equipment-category-controls');
  expect(
    await categories.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await categories.evaluate((element) => getComputedStyle(element).maskImage),
  ).not.toBe('none');
  const moreCategories = page.getByRole('button', {
    name: 'More equipment categories',
  });
  await expectClickTarget(moreCategories);
  await moreCategories.click();
  expect(
    await categories.evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(0);
  await categories
    .getByRole('button', { name: 'Other', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    categories.getByRole('button', { name: 'Other', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Add options for / }),
  ).toHaveCount(25);
  const mobileRows = page.getByTestId('equipment-catalog-row');
  const mobileCount = Math.min(await mobileRows.count(), 6);
  for (let index = 0; index < mobileCount; index += 1) {
    const row = mobileRows.nth(index);
    const mobileName = await rowName(row);
    await expectClickTarget(
      row.getByRole('button', { name: `Add ${mobileName}`, exact: true }),
    );
    await expectClickTarget(
      row.getByRole('button', {
        name: `Add options for ${mobileName}`,
        exact: true,
      }),
    );
    await expect(row.getByText(mobileName, { exact: true })).toHaveCSS(
      'font-size',
      '16px',
    );
  }
  const mobileFirst = mobileRows.first();
  const mobileName = await rowName(mobileFirst);
  await mobileFirst
    .getByRole('button', { name: `Details for ${mobileName}`, exact: true })
    .click();
  await mobileFirst
    .getByRole('button', { name: `Add options for ${mobileName}`, exact: true })
    .click();
  await expect(
    page.getByRole('menuitem', {
      name: `Add and place ${mobileName}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const mobileLast = (await mobileRows.last().boundingBox())!;
  const mobileFooter = (await page
    .getByTestId('equipment-pagination')
    .boundingBox())!;
  expect(mobileLast.y + mobileLast.height).toBeLessThanOrEqual(
    mobileFooter.y - 12,
  );
  await mobileRows
    .last()
    .getByRole('button', { name: /^Add options for / })
    .click();
  await expect(page.getByRole('menu')).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Escape');
  await noDocumentOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('density-mobile.png'),
    animations: 'disabled',
  });
});
