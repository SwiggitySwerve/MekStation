import { expect, test, type Locator, type Page } from '@playwright/test';

const styles = [
  ['Standard', 'clean-tech'],
  ['Glow', 'neon-operator'],
  ['HUD', 'tactical-hud'],
  ['Chromatic', 'premium-material'],
] as const;

async function loadAtlas(page: Page) {
  await page.goto('/customizer');
  await page
    .getByRole('button', { name: 'Load from Library', exact: true })
    .click();
  const library = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await library.getByRole('combobox').first().selectOption('canonical');
  await library
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await library.getByText('AS7-D', { exact: true }).click();
  await library.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await library.waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: 'Armor', exact: true }).click();
  await expect(page.getByTestId('armor-diagram')).toBeVisible();
}

async function storedDraft(page: Page) {
  return page.evaluate(() =>
    localStorage.getItem(`megamek-unit-${location.pathname.split('/')[2]}`),
  );
}

async function readGradient(owner: Locator) {
  return owner
    .locator('[data-armor-fill]')
    .first()
    .evaluate((node) => {
      const fill = node.getAttribute('fill')!;
      const id = fill.startsWith('url(#') ? fill.slice(5, -1) : '';
      const gradient = document.getElementById(id);
      return {
        ratio: Number(node.getAttribute('data-armor-fill-ratio')),
        gradient: gradient?.tagName,
        x1: gradient?.getAttribute('x1'),
        y1: gradient?.getAttribute('y1'),
        x2: gradient?.getAttribute('x2'),
        y2: gradient?.getAttribute('y2'),
        offsets: Array.from(gradient?.querySelectorAll('stop') ?? []).map(
          (stop) => Number(stop.getAttribute('offset')),
        ),
        colors: Array.from(gradient?.querySelectorAll('stop') ?? []).map(
          (stop) => getComputedStyle(stop).stopColor,
        ),
        sameSvg: gradient?.closest('svg') === node.closest('svg'),
      };
    });
}

async function expectCapacity(owner: Locator, ratio: number) {
  await expect
    .poll(async () => (await readGradient(owner)).ratio)
    .toBeCloseTo(ratio, 8);
  const rendered = await readGradient(owner);
  expect(rendered.gradient).toBe('linearGradient');
  expect(rendered.sameSvg).toBe(true);
  expect(rendered.x1).toBe(rendered.x2);
  expect(Number(rendered.y1)).toBeLessThan(Number(rendered.y2));
  expect(rendered.offsets).toHaveLength(4);
  expect(rendered.offsets[0]).toBe(0);
  expect(rendered.offsets[1]).toBeCloseTo(1 - ratio, 8);
  expect(rendered.offsets[2]).toBeCloseTo(1 - ratio, 8);
  expect(rendered.offsets[3]).toBe(1);
  expect(rendered.colors[1]).not.toBe(rendered.colors[2]);
  return rendered;
}

async function selectStyle(page: Page, name: string, id: string) {
  const before = await storedDraft(page);
  expect(before).not.toBeNull();
  await page.getByRole('button', { name: /^Silhouette:/ }).click();
  await expect(page.getByRole('listbox').getByRole('option')).toHaveText(
    styles.map(([label]) => label),
  );
  await page.getByRole('option', { name, exact: true }).click();
  await expect(page.locator('[data-armor-variant]')).toHaveAttribute(
    'data-armor-variant',
    id,
  );
  expect(await storedDraft(page)).toBe(before);
}

test('every silhouette style fills from the bottom and preserves armor while changing styles @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1180, height: 912 });
  await loadAtlas(page);
  const arm = page.getByRole('button', { name: /^Left Arm armor:/ });
  const editor = page.getByTestId('location-armor-editor');
  const evidence = [];
  for (const [name, id] of styles) {
    await selectStyle(page, name, id);
    await arm.press('Enter');
    const amount = editor.getByRole('spinbutton', {
      name: 'Left Arm front armor',
      exact: true,
    });
    await expect(amount).toHaveAttribute('max', '34');
    for (const value of [0, 17, 34]) {
      await amount.fill(String(value));
      await expect
        .poll(
          async () =>
            JSON.parse((await storedDraft(page))!).state.armorAllocation[
              'Left Arm'
            ],
        )
        .toBe(value);
      evidence.push({
        style: name,
        value,
        rendered: await expectCapacity(arm, value / 34),
      });
    }
    await amount.fill('17');
    await expectCapacity(arm, 0.5);
    await page
      .getByRole('button', { name: 'Close editor', exact: true })
      .click();
    const halfFilledDraft = await storedDraft(page);
    await arm.hover();
    await expectCapacity(arm, 0.5);
    await arm.press('Enter');
    await expect(editor).toBeVisible();
    await expectCapacity(arm, 0.5);
    await arm.press('Space');
    await expect(editor).toBeHidden();
    await arm.blur();
    await page.mouse.move(0, 0);
    expect(await storedDraft(page)).toBe(halfFilledDraft);
    await page
      .locator('[data-armor-variant]')
      .screenshot({ path: testInfo.outputPath(`capacity-${name}.png`) });
    await page.reload();
    await expect(
      page.getByRole('button', { name: /^Silhouette:/ }),
    ).toContainText(name);
    await expectCapacity(arm, 0.5);
    expect(await storedDraft(page)).toBe(halfFilledDraft);
  }
  // The torso plate represents the shared front-and-rear capacity.
  await expectCapacity(
    page.getByRole('button', { name: /^Center Torso armor:/ }),
    61 / 62,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await arm.press('Enter');
  await expect(editor).toBeInViewport();
  await expectCapacity(arm, 0.5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('capacity-phone.png'),
    fullPage: true,
  });
  await testInfo.attach('capacity-gradients.json', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
});

test('schematic capacity bars use the same bottom-up fill and preserve editing @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1180, height: 912 });
  await loadAtlas(page);
  const unitUrl = page.url();
  const before = await storedDraft(page);
  await page.goto('/settings#customizer');
  await page
    .locator('#section-customizer')
    .getByText('Schematic', { exact: true })
    .click();
  await page.goto(unitUrl);
  expect(await storedDraft(page)).toBe(before);
  const arm = page.getByRole('button', { name: /^Left Arm armor:/ });
  await arm.click();
  const amount = page
    .getByTestId('location-armor-editor')
    .getByRole('spinbutton', { name: 'Left Arm front armor', exact: true });
  for (const value of [0, 17, 34]) {
    await amount.fill(String(value));
    await expectCapacity(arm, value / 34);
  }
  await amount.fill('17');
  await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  await expectCapacity(arm, 0.5);
  await page.screenshot({
    path: testInfo.outputPath('capacity-schematic.png'),
    fullPage: true,
  });
  const halfFilledDraft = await storedDraft(page);
  await page.reload();
  await expectCapacity(arm, 0.5);
  expect(await storedDraft(page)).toBe(halfFilledDraft);
});

test('saved MegaMek appearance falls back safely and all configuration previews expose the retained styles @appearance', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem(
      'mekstation-customizer-settings',
      JSON.stringify({
        state: {
          armorDiagramMode: 'silhouette',
          armorDiagramVariant: 'megamek',
          showArmorDiagramSelector: true,
        },
        version: 0,
      }),
    ),
  );
  await loadAtlas(page);
  await expect(page.getByRole('button', { name: /^Silhouette:/ })).toHaveText(
    /Silhouette:\s*Standard/,
  );
  await expect(page.locator('[data-armor-variant]')).toHaveAttribute(
    'data-armor-variant',
    'clean-tech',
  );
  await selectStyle(page, 'Glow', 'neon-operator');
  const unitUrl = page.url();
  const before = await storedDraft(page);
  await page.goto('/settings#customizer');
  const section = page.locator('#section-customizer');
  await expect(section.getByText('MegaMek', { exact: true })).toHaveCount(0);
  const evidence = [];
  for (const [configuration, configId] of [
    ['Biped', 'biped'],
    ['Quad', 'quad'],
    ['Tripod', 'tripod'],
    ['LAM', 'lam'],
    ['QuadVee', 'quadvee'],
  ]) {
    await section
      .getByRole('button', { name: configuration, exact: true })
      .click();
    for (const [name, id] of styles) {
      await section
        .getByRole('button')
        .filter({ has: page.getByText(name, { exact: true }) })
        .click();
      const preview = section.locator(
        `[data-armor-preview="${id}"][data-mech-configuration="${configId}"]`,
      );
      await expect(preview).toBeVisible();
      const fills = await preview
        .locator('[data-armor-fill]')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            tag: node.tagName,
            ratio: Number(node.getAttribute('data-armor-fill-ratio')),
            fill: node.getAttribute('fill'),
            clip: node.getAttribute('clip-path'),
            width: node.getBoundingClientRect().width,
          })),
        );
      expect(fills.length).toBeGreaterThanOrEqual(8);
      expect(fills.some((fill) => fill.ratio > 0 && fill.ratio < 1)).toBe(true);
      for (const fill of fills) {
        expect(['path', 'rect']).toContain(fill.tag);
        expect(fill.ratio).toBeGreaterThanOrEqual(0);
        expect(fill.ratio).toBeLessThanOrEqual(1);
        expect(fill.fill).not.toBeNull();
        expect(fill.fill).not.toBe('none');
        expect(fill.width).toBeGreaterThan(0);
      }
      evidence.push({ configuration, style: name, fills });
      await preview.screenshot({
        path: testInfo.outputPath(`preview-${configId}-${name}.png`),
      });
    }
  }
  await section
    .getByRole('button', { name: 'Save Diagram Style', exact: true })
    .click();
  await page.goto(unitUrl);
  await expect(
    page.getByRole('button', { name: /^Silhouette:/ }),
  ).toContainText('Chromatic');
  expect(await storedDraft(page)).toBe(before);
  await page.reload();
  await expect(
    page.getByRole('button', { name: /^Silhouette:/ }),
  ).toContainText('Chromatic');
  await testInfo.attach('configuration-capacity-previews.json', {
    body: JSON.stringify(evidence, null, 2),
    contentType: 'application/json',
  });
});
