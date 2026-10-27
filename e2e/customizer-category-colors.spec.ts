import { test, expect, type Locator } from '@playwright/test';

import { PROTECTED_SLOT_COLORS } from '../src/components/customizer/protected/protectedSlotColors';
import { EquipmentCategory } from '../src/types/equipment/EquipmentCategory';

const { tint, fixedSystems, equipment } = PROTECTED_SLOT_COLORS;

async function paint(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, text: style.color };
  });
}

async function textContrast(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const luminance = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(
        document.documentElement,
      ).getPropertyValue('--surface-base');
      context.fillRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map((channel) => channel / 255)
        .map((channel) =>
          channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4,
        )
        .reduce(
          (sum, channel, index) =>
            sum + channel * [0.2126, 0.7152, 0.0722][index],
          0,
        );
    };
    const background = luminance(style.backgroundColor);
    const text = luminance(style.color);
    return (
      (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05)
    );
  });
}

// Catalog rows and loadout cards are neutral surfaces; the category shows as
// the left accent bar.
async function accent(locator: Locator) {
  return locator.evaluate(
    (element) => getComputedStyle(element).borderLeftColor,
  );
}

/** The bar and tint a protected hue computes to, read from a probe in `locator`. */
async function hueValues(locator: Locator, hue: string) {
  return locator.evaluate(
    (element, [token, mix]) => {
      const probe = document.createElement('span');
      probe.style.borderLeft = `1px solid var(--color-${token})`;
      probe.style.backgroundColor = `color-mix(in oklab, var(--color-${token}) ${mix}, var(--surface-base))`;
      element.append(probe);
      const style = getComputedStyle(probe);
      const values = {
        bar: style.borderLeftColor,
        tint: style.backgroundColor,
      };
      probe.remove();
      return values;
    },
    [hue, tint.restMix] as const,
  );
}

test('equipment colors survive catalog, grouping, mounting and reload @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Add unit', exact: true }).click();
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
  // Every occupied slot is tinted, and its 4px bar coloured, in its owner hue
  // (approved values: protectedSlotColors.ts).
  const expectTinted = async (cell: Locator, hue: string) => {
    const expected = await hueValues(cell, hue);
    // Slots animate colour changes; wait for the settled paint before sampling.
    await expect.poll(() => accent(cell)).toBe(expected.bar);
    await expect
      .poll(async () => (await paint(cell)).background)
      .toBe(expected.tint);
    await expect(cell).toHaveCSS('border-left-style', 'solid');
    await expect(cell).toHaveCSS('border-left-width', tint.barWidth);
    expect(await textContrast(cell)).toBeGreaterThanOrEqual(4.5);
  };
  await expectTinted(mounted, equipment[EquipmentCategory.ENERGY_WEAPON]);
  const energyStripe = await accent(mounted);
  const mountedPaint = await paint(mounted);
  await mounted.hover();
  await expect.poll(() => textContrast(mounted)).toBeGreaterThanOrEqual(4.5);
  await page.mouse.move(0, 0);
  const engine = page
    .getByRole('gridcell', { name: /: .*Engine$|: Engine$/ })
    .first();
  const gyro = page.getByRole('gridcell', { name: /: Standard Gyro$/ }).first();
  await expect(engine).toBeVisible();
  // Fixed systems are tinted in their own family hue, so they differ at a glance.
  await expectTinted(engine, fixedSystems.engine);
  await expectTinted(gyro, fixedSystems.gyro);
  expect((await paint(engine)).background).not.toBe(
    (await paint(gyro)).background,
  );
  expect(await accent(engine)).not.toBe(await accent(gyro));
  expect(mountedPaint.background).not.toBe((await paint(engine)).background);
  const heatSink = page
    .getByRole('gridcell', { name: /: .*Heat Sink$/ })
    .first();
  await expectTinted(heatSink, equipment.heatsink);
  // Heat sinks share the electronics cyan, so they keep a faint hatch.
  await expect(heatSink).not.toHaveCSS('background-image', 'none');
  await expect(mounted).toHaveCSS('background-image', 'none');
  // Every row of a merged block is tinted in the category hue.
  const ac20Rows = page.getByRole('gridcell', { name: /^Slot \d+: AC\/20$/ });
  await expect(ac20Rows).toHaveCount(10);
  for (const row of await ac20Rows.all())
    await expectTinted(row, equipment[EquipmentCategory.BALLISTIC_WEAPON]);
  await page.reload();
  await expect(mounted).toBeVisible();
  await expect.poll(() => paint(mounted)).toEqual(mountedPaint);
  await expect.poll(() => accent(mounted)).toBe(energyStripe);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('navigation', { name: 'Critical slot location shortcuts' })
    .getByRole('tab', { name: /^Left Arm,/ })
    .click();
  await expect(mounted).toBeVisible();
  await expect.poll(() => paint(mounted)).toEqual(mountedPaint);
  await expect.poll(() => accent(mounted)).toBe(energyStripe);
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
