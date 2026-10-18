import { expect, test, type Page } from '@playwright/test';

async function loadUnit(page: Page, name = 'Atlas AS7-D', variant = 'AS7-D') {
  const open = page.getByRole('button', {
    name: 'Add unit (Ctrl+O)',
    exact: true,
  });
  if (await open.isVisible()) await open.click();
  else
    await page
      .getByRole('button', { name: 'Load from Library', exact: true })
      .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await page.getByPlaceholder('Search by chassis or variant...').fill(name);
  await page.getByText(variant, { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
}

async function readDraft(page: Page) {
  return page.evaluate(() => {
    const id = location.pathname.split('/')[2];
    return {
      id,
      ...JSON.parse(localStorage.getItem(`megamek-unit-${id}`)!).state,
    } as {
      id: string;
      name: string;
      techBaseMode: string;
      tonnage: number;
      equipment: {
        instanceId: string;
        equipmentId: string;
        location?: string;
        slots?: number[];
      }[];
    };
  });
}

async function bounds(page: Page) {
  return page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector)!;
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    return {
      metrics: read('[aria-label="Unit status"]'),
      section: read('[data-testid="customizer-section-bar"]'),
      workspace: read('[data-testid="customizer-workspace"]'),
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
}

test('workbench preserves readable metrics and a stable scrolling workspace @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await loadUnit(page);
  const equipmentTab = page.getByRole('tab', {
    name: 'Equipment',
    exact: true,
  });
  await equipmentTab.click();
  await expect(equipmentTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('equipment-catalog-scroll')).toBeVisible();
  const measured = [];
  for (const viewport of [
    { width: 1378, height: 912 },
    { width: 1180, height: 912 },
    { width: 1378, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const before = await bounds(page);
    expect(before.metrics.height).toBe(48);
    const editControls = await page
      .getByRole('group', { name: 'Edit history', exact: true })
      .boundingBox();
    expect(editControls?.height).toBe(44);
    expect(before.metrics.y).toBeGreaterThanOrEqual(
      editControls!.y + editControls!.height,
    );
    expect(before.workspace.y).toBe(before.section.y + before.section.height);
    expect(before.workspace.height).toBe(viewport.height - before.workspace.y);
    expect(before.documentOverflow).toBe(0);
    const readouts = page.locator('[data-testid^="unit-info-stat-"]');
    await expect(readouts).toHaveCount(10);
    for (const metric of await readouts.all()) {
      await expect(metric).toBeVisible();
      expect(
        await metric.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
    }
    const list = page.getByTestId('equipment-catalog-scroll');
    const footerBefore = await page
      .getByTestId('equipment-pagination')
      .boundingBox();
    await list.hover();
    await page.mouse.wheel(0, 700);
    await expect
      .poll(() => list.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    expect((await bounds(page)).metrics).toEqual(before.metrics);
    expect(
      await page.getByTestId('equipment-pagination').boundingBox(),
    ).toEqual(footerBefore);
    measured.push({ viewport, ...before, catalog: await list.boundingBox() });
  }
  await page.setViewportSize({ width: 1378, height: 912 });
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('ER PPC');
  await page.getByRole('button', { name: 'Add ER PPC', exact: true }).click();
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  const beforeSelection = await bounds(page);
  const gridBefore = await page
    .getByTestId('critical-slots-grid-desktop')
    .boundingBox();
  await page
    .getByRole('button', {
      name: 'Select ER PPC in unallocated loadout',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('region', { name: 'Equipment placement' }),
  ).toBeVisible();
  expect(
    await page.getByTestId('critical-slots-grid-desktop').boundingBox(),
  ).toEqual(gridBefore);
  expect(await bounds(page)).toEqual(beforeSelection);
  await page.screenshot({
    path: testInfo.outputPath('selected-equipment-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await bounds(page);
  expect(mobile.documentOverflow).toBe(0);
  for (const metric of await page
    .locator('[data-testid^="unit-info-stat-"]')
    .all())
    await expect(metric).toBeVisible();
  expect(mobile.metrics.height).toBeGreaterThan(48);
  await page.screenshot({
    path: testInfo.outputPath('complete-metrics-mobile.png'),
    fullPage: true,
  });
  await testInfo.attach('workbench-measurements.json', {
    body: JSON.stringify(
      { measured, beforeSelection, gridBefore, mobile },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});

test('unit commands preserve live tech identity, rename and unit isolation @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await loadUnit(page);
  const atlasId = (await readDraft(page)).id;
  const atlasTab = page.getByRole('tab', { name: 'Atlas AS7-D', exact: true });
  await expect(atlasTab.getByText('IS', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.getByText('Component technology', { exact: true }).click();
  await page
    .getByTitle('All components use Clan technology', { exact: true })
    .click();
  await expect(atlasTab.getByText('Clan', { exact: true })).toBeVisible();
  await atlasTab.dblclick();
  const rename = page
    .getByRole('tablist', { name: 'Open units' })
    .getByRole('textbox');
  await rename.fill('Layout Atlas');
  await rename.press('Enter');
  await expect(
    page.getByRole('tab', { name: 'Layout Atlas', exact: true }),
  ).toBeVisible();
  await loadUnit(page, 'Locust LCT-1V', 'LCT-1V');
  expect((await readDraft(page)).id).not.toBe(atlasId);
  expect((await readDraft(page)).tonnage).toBe(20);
  await expect(
    page
      .getByRole('tab', { name: 'Locust LCT-1V', exact: true })
      .getByText('IS', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Layout Atlas', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Layout Atlas', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await readDraft(page)).id).toBe(atlasId);
  expect((await readDraft(page)).tonnage).toBe(100);
  await page.reload();
  await expect(
    page
      .getByRole('tab', { name: 'Layout Atlas', exact: true })
      .getByText('Clan', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Unit actions', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Switch open unit' })
    .selectOption({ label: 'Locust LCT-1V' });
  expect((await readDraft(page)).tonnage).toBe(20);
  await page
    .getByRole('button', { name: 'Close Locust LCT-1V', exact: true })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath('unit-switching.png'),
    fullPage: true,
  });
});

test('validation keeps section badges, guidance and focused destinations @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await loadUnit(page);
  const id = (await readDraft(page)).id;
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('ER PPC');
  await page.getByRole('button', { name: 'Add ER PPC', exact: true }).click();
  const overall = page.locator('[aria-label="Unit validation"]');
  const errorButton = overall.getByRole('button', {
    name: /errors?, show issues$/,
  });
  const warningButton = overall.getByRole('button', {
    name: /warnings?, show issues$/,
  });
  await expect(errorButton).toBeVisible();
  await expect(warningButton).toBeVisible();
  await expect(
    page
      .getByRole('tab', { name: 'Structure', exact: true })
      .locator('[aria-label="1 error"]'),
  ).toBeVisible();
  await expect(
    page
      .getByRole('tab', { name: 'Critical Slots', exact: true })
      .locator('[aria-label="1 warning"]'),
  ).toBeVisible();
  expect(
    await errorButton.evaluate((element) => getComputedStyle(element).color),
  ).not.toBe(
    await warningButton.evaluate((element) => getComputedStyle(element).color),
  );
  await warningButton.focus();
  await warningButton.press('Enter');
  const issues = page.getByRole('dialog', { name: /Atlas AS7-D.*Warnings/ });
  await expect(issues).toBeVisible();
  const issue = issues
    .locator('[data-validation-issue]')
    .filter({ hasText: 'ER PPC' });
  await expect(issue).toContainText('Select the equipment in Critical Slots');
  await expect(issue).toContainText('Go to Critical Slots');
  await page.screenshot({
    path: testInfo.outputPath('warning-guidance.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(issues).toBeHidden();
  await expect(warningButton).toBeFocused();
  await warningButton.click();
  await issue.click();
  await expect(
    page.getByRole('tab', { name: 'Critical Slots', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const placement = page.getByRole('region', { name: 'Equipment placement' });
  await expect(placement).toBeFocused();
  await expect(placement).toContainText('ER PPC');
  expect((await readDraft(page)).id).toBe(id);
  await errorButton.click();
  const errorIssue = page
    .getByRole('dialog', { name: /Atlas AS7-D.*Errors/ })
    .locator('[data-validation-issue]')
    .filter({ hasText: /weight|tonnage/i })
    .first();
  await errorIssue.click();
  await expect(
    page.getByRole('tab', { name: 'Structure', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('tabpanel', { name: 'Structure', exact: true }),
  ).toBeFocused();
  expect((await readDraft(page)).id).toBe(id);
  await page
    .getByRole('button', { name: 'Wide workspace', exact: true })
    .click();
  await warningButton.click();
  await issue.click();
  const wideDrawer = page.getByRole('dialog', {
    name: 'Unit loadout',
    exact: true,
  });
  await expect(wideDrawer).toBeVisible();
  await expect(
    wideDrawer.getByRole('region', { name: 'Equipment placement' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(wideDrawer).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await warningButton.click();
  await issue.click();
  const mobileDrawer = page.getByRole('dialog', {
    name: 'Equipment Loadout',
    exact: true,
  });
  await expect(mobileDrawer).toBeVisible();
  await expect(
    mobileDrawer.getByRole('button', {
      name: 'Select ER PPC unassigned',
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(mobileDrawer).toBeHidden();
});

test('notifications leave pinned metrics unobstructed @customizer', async ({
  page,
}) => {
  await page.goto('/customizer');
  await loadUnit(page);
  const notifications = page.getByTestId('toast-container');
  await expect(notifications).toBeVisible();
  const toast = await notifications.boundingBox();
  const desktop = await bounds(page);
  expect(toast!.y).toBeGreaterThanOrEqual(
    desktop.section.y + desktop.section.height,
  );
});

test('active section remains visible after viewport resize @customizer', async ({
  page,
}) => {
  await page.goto('/customizer');
  await loadUnit(page);
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Critical Slots', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  const active = page.getByRole('tab', { name: 'Critical Slots', exact: true });
  await expect
    .poll(async () => {
      const tab = await active.boundingBox();
      const list = await page
        .getByRole('tablist', { name: 'Unit configuration tabs' })
        .boundingBox();
      return (
        tab!.x >= list!.x && tab!.x + tab!.width <= list!.x + list!.width + 1
      );
    })
    .toBe(true);
});

test('unit switching never attributes another draft validation to the selected unit @customizer', async ({
  page,
}) => {
  await page.goto('/customizer');
  await loadUnit(page);
  await loadUnit(page, 'Locust LCT-1V', 'LCT-1V');
  // Canonical Locust is valid. Deliberately move both arm guns onto the
  // shoulder slots through the existing fixture seam, without changing actuators.
  await page.waitForFunction(() => Boolean(window.__UNIT_REGISTRY__));
  const movedGuns = await page.evaluate(() => {
    type Equipment = {
      name: string;
      location?: string;
      slots?: readonly number[];
    };
    const registry = (
      window as unknown as {
        __UNIT_REGISTRY__: {
          getUnitStore: (id: string) => {
            getState: () => { equipment: Equipment[] };
            setState: (state: { equipment: Equipment[] }) => void;
          };
        };
      }
    ).__UNIT_REGISTRY__;
    const store = registry.getUnitStore(location.pathname.split('/')[2]);
    let moved = 0;
    store.setState({
      equipment: store.getState().equipment.map((item) => {
        if (item.name !== 'Machine Gun') return item;
        moved++;
        return { ...item, slots: [0] };
      }),
    });
    return moved;
  });
  expect(movedGuns).toBe(2);
  const locustErrors = page
    .locator('[aria-label="Unit validation"]')
    .getByRole('button', {
      name: 'Locust LCT-1V: 2 errors, show issues',
      exact: true,
    });
  await expect(locustErrors).toBeVisible();
  const baselineLabels = await page
    .locator('[aria-label="Unit validation"] button')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('aria-label')!),
    );
  await locustErrors.click();
  const baselineMessages = await page
    .locator('[data-validation-issue]')
    .allTextContents();
  expect(baselineMessages).toHaveLength(2);
  expect(
    baselineMessages.every((message) =>
      message.includes('Machine Gun overlaps a fixed system'),
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  const baselineDraft = await readDraft(page);
  const atlasTab = page.getByRole('tab', { name: 'Atlas AS7-D', exact: true });
  await atlasTab.click();
  await expect(atlasTab).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('ER PPC');
  await page.getByRole('button', { name: 'Add ER PPC', exact: true }).click();
  await expect(
    page
      .locator('[aria-label="Unit validation"]')
      .getByRole('button', { name: /errors?, show issues$/ }),
  ).toBeVisible();
  await page
    .locator('[aria-label="Unit validation"]')
    .getByRole('button', {
      name: /errors?, show issues$/,
    })
    .click();
  const atlasMessages = await page
    .locator('[data-validation-issue]')
    .allTextContents();
  expect(atlasMessages).not.toEqual(baselineMessages);
  expect(atlasMessages).toHaveLength(1);
  expect(atlasMessages[0]).toContain(
    'Unit exceeds maximum tonnage by 7.0 tons',
  );
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const auditWindow = window as typeof window & {
      layoutValidationSamples: string[];
      layoutValidationObserver: MutationObserver;
    };
    auditWindow.layoutValidationSamples = [];
    auditWindow.layoutValidationObserver = new MutationObserver(() => {
      for (const button of Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          '[aria-label="Unit validation"] button',
        ),
      )) {
        const label = button.getAttribute('aria-label') ?? '';
        if (label.startsWith('Locust LCT-1V:'))
          auditWindow.layoutValidationSamples.push(label);
      }
    });
    auditWindow.layoutValidationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    });
  });
  await page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }).click();
  await expect(
    page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page
      .getByRole('region', { name: 'Unit status' })
      .getByTestId('unit-info-stat-tonnage'),
  ).toContainText('20');
  await expect(locustErrors).toBeVisible();
  await locustErrors.click();
  expect(
    await page.locator('[data-validation-issue]').allTextContents(),
  ).toEqual(baselineMessages);
  expect((await readDraft(page)).equipment).toEqual(baselineDraft.equipment);
  const samples = await page.evaluate(() => {
    const auditWindow = window as typeof window & {
      layoutValidationSamples: string[];
      layoutValidationObserver: MutationObserver;
    };
    auditWindow.layoutValidationObserver.disconnect();
    return auditWindow.layoutValidationSamples;
  });
  expect(samples.length).toBeGreaterThan(0);
  expect(Array.from(new Set(samples))).toEqual(baselineLabels);
});
