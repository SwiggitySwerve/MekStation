import { expect, test, type Locator } from '@playwright/test';

async function readSymbol(button: Locator) {
  return button.evaluate((element) => {
    const svg = element.querySelector('svg');
    if (!svg) return null;
    const symbol = svg.getBoundingClientRect();
    const drawing = svg.getBBox();
    const target = element.getBoundingClientRect();
    const style = getComputedStyle(svg);
    return {
      width: symbol.width,
      height: symbol.height,
      drawnWidth: (drawing.width * symbol.width) / svg.viewBox.baseVal.width,
      strokeWidth: Number.parseFloat(style.strokeWidth),
      targetWidth: target.width,
      targetHeight: target.height,
      color: style.color,
      name: svg.dataset.iconName,
      size: svg.dataset.iconSize,
      centerY: Math.abs(
        symbol.y + symbol.height / 2 - target.y - target.height / 2,
      ),
    };
  });
}

test('customizer header symbols stay legible and preserve their actions @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1351, height: 912 });
  await page.goto('/customizer');
  await page
    .getByRole('button', { name: 'Load from Library', exact: true })
    .click();
  const library = page.getByRole('dialog');
  await library.getByRole('combobox').first().selectOption('canonical');
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await library.waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  const unitUrl = page.url();
  const header = page.getByTestId('customizer-command-header');
  const toggle = header.getByRole('button', {
    name: 'Hide loadout panel',
    exact: true,
  });
  const sidebarBackground = await toggle.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  await expect(toggle.locator('svg')).toHaveAttribute(
    'data-icon-name',
    'panel-right-close',
  );
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle.locator('svg')).toHaveAttribute(
    'data-icon-name',
    'panel-right-open',
  );
  expect(
    await toggle.evaluate((button) => getComputedStyle(button).backgroundColor),
  ).not.toBe(sidebarBackground);
  const measurements = [];
  for (const name of [
    'MekStation menu',
    'Add unit (Ctrl+O)',
    'Unit actions',
    'Save active unit to library',
    'Open loadout drawer',
    'Hide loadout panel',
  ]) {
    const button = header.getByRole('button', { name, exact: true });
    const symbol = await readSymbol(button);
    expect(symbol).not.toBeNull();
    expect(symbol!.width).toBe(24);
    expect(symbol!.size).toBe('toolbar');
    expect(symbol!.name).toBeTruthy();
    expect(symbol!.centerY).toBeLessThanOrEqual(1);
    expect(symbol!.height).toEqual(symbol!.width);
    expect(symbol!.drawnWidth).toBeGreaterThanOrEqual(19);
    expect(symbol!.strokeWidth).toBe(2);
    // The menu, Add unit and Save show visible text labels on wide screens.
    if (
      [
        'MekStation menu',
        'Add unit (Ctrl+O)',
        'Save active unit to library',
      ].includes(name)
    ) {
      expect(symbol!.targetWidth).toBeGreaterThanOrEqual(44);
    } else {
      expect(symbol!.targetWidth).toBe(44);
    }
    expect(symbol!.targetHeight).toBe(44);
    measurements.push({ name, ...symbol });
  }
  // Save state is spelled out beside Save, never a bare dot on the button.
  await expect(header.getByTestId('unit-save-label')).toHaveText(
    /^Not in library(?:\s*\u00b7\s*draft saved)?$/,
  );
  await expect(
    header
      .getByRole('button', { name: 'Save active unit to library', exact: true })
      .getByText('Save to library', { exact: true }),
  ).toBeVisible();
  await expect(header.locator('[data-save-dot]')).toHaveCount(0);
  await header.screenshot({
    path: testInfo.outputPath('header-wide.png'),
    animations: 'disabled',
  });
  const open = header.getByRole('button', {
    name: 'Add unit (Ctrl+O)',
    exact: true,
  });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  const drawerButton = header.getByRole('button', {
    name: 'Open loadout drawer',
    exact: true,
  });
  await drawerButton.click();
  const drawer = page.getByRole('dialog', {
    name: 'Unit loadout',
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(drawerButton).toBeFocused();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(page.url()).toBe(unitUrl);
  await header.screenshot({
    path: testInfo.outputPath('header-sidebar.png'),
    animations: 'disabled',
  });
  for (const width of [1055, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of [
      'MekStation menu',
      'Add unit (Ctrl+O)',
      'Unit actions',
      'Save active unit to library',
    ]) {
      const symbol = await readSymbol(
        header.getByRole('button', { name, exact: true }),
      );
      // Phones keep the 24px symbols so drawn glyphs stay at least 20px; the
      // 44px targets, not the symbols, set the header width.
      expect(symbol!.width).toBe(24);
      expect(symbol!.strokeWidth).toBe(2);
      expect(symbol!.targetHeight).toBe(44);
      expect(symbol!.centerY).toBeLessThanOrEqual(1);
    }
    const close = header.getByRole('button', { name: /^Close / }).first();
    expect((await readSymbol(close))!.size).toBe('inline');
    expect((await readSymbol(close))!.width).toBe(16);
  }
  expect((await readSymbol(open))!.drawnWidth).toBeGreaterThanOrEqual(20);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBe(0);
  await header.screenshot({
    path: testInfo.outputPath('header-phone.png'),
    animations: 'disabled',
  });
  await testInfo.attach('header-symbols.json', {
    body: JSON.stringify(measurements, null, 2),
    contentType: 'application/json',
  });
});
