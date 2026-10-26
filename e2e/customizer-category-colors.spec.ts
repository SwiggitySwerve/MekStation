import { test, expect, type Locator } from '@playwright/test';

async function paint(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, text: style.color };
  });
}

// Catalog rows and loadout cards are neutral surfaces; the category shows as
// the left accent bar.
async function accent(locator: Locator) {
  return locator.evaluate(
    (element) => getComputedStyle(element).borderLeftColor,
  );
}

test('equipment colors survive catalog, grouping, mounting and reload @customizer', async ({
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
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  const search = page.getByRole('textbox', {
    name: 'Search equipment',
    exact: true,
  });
  const colors: Record<string, string> = {};
  let neutralFill = '';
  for (const name of ['Small Laser', 'AC/20', 'LRM 20', 'AC/20 Ammo']) {
    await search.fill(name);
    const details = page.getByRole('button', {
      name: `Details for ${name}`,
      exact: true,
    });
    await expect(details).toBeVisible();
    const row = details.locator('xpath=ancestor::li');
    const fill = row.getByTestId('equipment-catalog-row-fill');
    await page.mouse.move(0, 0);
    colors[name] = await accent(row);
    const { background } = await paint(fill);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    // Every category shares the same neutral fill.
    if (neutralFill) expect(background).toBe(neutralFill);
    neutralFill = background;
    await expect(fill).toHaveCSS('opacity', '0.1');
    await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(row).toHaveCSS('opacity', '1');
    await expect(details).toHaveCSS('opacity', '1');
    const content = details.locator('span').first();
    await expect(content).toHaveCSS('opacity', '1');
    // The catalog keeps theme-colored, opaque content over a translucent fill.
    expect(
      await content.evaluate((element) => {
        const probe = document.createElement('span');
        probe.style.color = 'var(--text-primary)';
        element.append(probe);
        const matches =
          getComputedStyle(element).color === getComputedStyle(probe).color;
        probe.remove();
        return matches;
      }),
    ).toBe(true);
    await details.hover();
    await expect(fill).toHaveCSS('opacity', '0.3');
    await expect(content).toHaveCSS('opacity', '1');
  }
  expect(new Set(Object.values(colors)).size).toBe(4);
  await search.fill('Small Laser');
  await expect(
    page.getByRole('region', { name: 'Equipment catalog' }).locator('li'),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Add Small Laser', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Add Small Laser', exact: true })
    .click();
  const expand = page.getByTitle('Expand loadout', { exact: true });
  if (await expand.isVisible()) await expand.click();
  const group = page.getByRole('button', {
    name: 'Show 2 instances of Small Laser in Unassigned',
    exact: true,
  });
  await expect(group).toBeVisible();
  expect(await accent(group.locator('..'))).toBe(colors['Small Laser']);
  await group.click();
  await page.mouse.move(0, 0);
  const item = page
    .getByRole('button', {
      name: 'Select Small Laser in unallocated loadout',
      exact: true,
    })
    .first();
  expect(await accent(item.locator('..'))).toBe(colors['Small Laser']);
  await page.screenshot({
    path: testInfo.outputPath('equipment-restored.png'),
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await item.click();
  await page
    .getByRole('region', { name: 'Equipment placement' })
    .getByRole('combobox', { name: 'Place selected equipment' })
    .selectOption('Left Arm');
  const mounted = page
    .getByRole('group', { name: 'Left Arm critical slots', exact: true })
    .getByRole('gridcell', { name: 'Slot 7: Small Laser', exact: true });
  await expect(mounted).toBeVisible();
  await page.mouse.move(0, 0);
  // Mounted slots keep the category edge used by the catalog and loadout.
  // Slots animate colour changes; wait for the settled accent before sampling.
  await expect.poll(() => accent(mounted)).toBe(colors['Small Laser']);
  const mountedPaint = await paint(mounted);
  expect(mountedPaint.background).not.toBe('rgba(0, 0, 0, 0)');
  const engine = page
    .getByRole('gridcell', { name: /: .*Engine$|: Engine$/ })
    .first();
  const gyro = page.getByRole('gridcell', { name: /: Standard Gyro$/ }).first();
  await expect(engine).toBeVisible();
  expect((await paint(engine)).background).toBe((await paint(gyro)).background);
  expect(await accent(engine)).not.toBe(await accent(gyro));
  await expect(engine).toHaveCSS('border-left-width', '2px');
  await expect(mounted).toHaveCSS('border-left-width', '4px');
  await page.reload();
  await expect(mounted).toBeVisible();
  await expect.poll(() => paint(mounted)).toEqual(mountedPaint);
  await expect.poll(() => accent(mounted)).toBe(colors['Small Laser']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('navigation', { name: 'Critical slot location shortcuts' })
    .getByRole('combobox', { name: 'Location', exact: true })
    .selectOption('Left Arm');
  await expect(mounted).toBeVisible();
  await expect.poll(() => paint(mounted)).toEqual(mountedPaint);
  await expect.poll(() => accent(mounted)).toBe(colors['Small Laser']);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('criticals-restored-mobile.png'),
    fullPage: true,
  });
  await testInfo.attach('category-colors.json', {
    body: JSON.stringify(colors, null, 2),
    contentType: 'application/json',
  });
});
