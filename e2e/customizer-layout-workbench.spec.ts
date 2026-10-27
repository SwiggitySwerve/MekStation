import { expect, test, type Page } from '@playwright/test';

async function loadUnit(page: Page, name = 'Atlas AS7-D', variant = 'AS7-D') {
  const open = page.getByRole('button', {
    name: 'Add unit (Ctrl+O)',
    exact: true,
  });
  if (await open.isVisible()) await open.click();
  else
    await page.getByRole('button', { name: 'Add unit', exact: true }).click();
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
    // The section tabs fill the bar: no empty band before the edit controls.
    const lastSection = await page
      .getByTestId('customizer-section-bar')
      .getByRole('tab', { name: 'Preview', exact: true })
      .boundingBox();
    expect(
      editControls!.x - (lastSection!.x + lastSection!.width),
    ).toBeLessThanOrEqual(24);
    // Edit history shares the section bar instead of adding its own band.
    expect(editControls!.y).toBeGreaterThanOrEqual(before.section.y);
    expect(editControls!.y + editControls!.height).toBeLessThanOrEqual(
      before.section.y + before.section.height,
    );
    expect(before.workspace.y).toBe(before.section.y + before.section.height);
    expect(before.workspace.height).toBe(viewport.height - before.workspace.y);
    expect(before.documentOverflow).toBe(0);
    // Seven cells; Movement retains separate walk/run/jump value spans.
    const readouts = page.locator('div[data-testid^="unit-info-stat-"]');
    await expect(readouts).toHaveCount(7);
    const movement = page.getByTestId('unit-info-stat-movement');
    await expect(movement).toHaveAccessibleName(
      'Movement: walk 3, run 5, jump 0 MP',
    );
    for (const stat of ['walk', 'run', 'jump']) {
      await expect(
        movement.getByTestId(`unit-info-stat-${stat}`),
      ).toBeVisible();
    }
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
  const collapsed = await bounds(page);
  expect(collapsed.documentOverflow).toBe(0);
  // Phone keeps one row of key capacity readouts; the rest open on demand.
  expect(collapsed.metrics.height).toBe(48);
  for (const id of ['weight', 'slots', 'heat'])
    await expect(page.getByTestId(`unit-info-stat-${id}`)).toBeVisible();
  await expect(page.getByTestId('unit-info-stat-walk')).toBeHidden();
  await page
    .getByRole('button', {
      name: 'More stats (Armor, Movement, BV)',
      exact: true,
    })
    .click();
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
  await page.getByText('Change tech base', { exact: true }).click();
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
  // One build-status button names every group, in the shared wording, and
  // opens one panel.
  const statusButton = overall.getByRole('button', {
    name: /Not legal · \d+ errors? · \d+ warnings?.*, show issues$/,
  });
  await expect(statusButton).toBeVisible();
  await expect(statusButton).toHaveAttribute('data-build-status', 'error');
  // Weight and unplaced equipment are errors; running hot stays a warning.
  await expect(statusButton).toContainText(/2 errors\s*·\s*1 warning/);
  // Section dots mark where the fix happens: overweight is fixed on Equipment.
  await expect(
    page
      .getByRole('tab', { name: 'Equipment', exact: true })
      .locator('[aria-label="Equipment: 1 error"]'),
  ).toBeVisible();
  await expect(
    page
      .getByRole('tab', { name: 'Structure', exact: true })
      .locator('[aria-label="Structure: 1 error"]'),
  ).toHaveCount(0);
  // Running hot is fixed on Structure, so its warning badge sits there.
  await expect(
    page
      .getByRole('tab', { name: 'Structure', exact: true })
      .locator('[aria-label="Structure: 1 warning"]'),
  ).toBeVisible();
  await expect(
    page
      .getByRole('tab', { name: 'Critical Slots', exact: true })
      .locator('[aria-label="Critical Slots: 1 error"]'),
  ).toBeVisible();
  await statusButton.focus();
  await statusButton.press('Enter');
  const issues = page.getByRole('dialog', {
    name: /Atlas AS7-D.*Build status.*Not legal/,
  });
  await expect(issues).toBeVisible();
  const railBox = (await page
    .getByRole('complementary', { name: 'Unit loadout', exact: true })
    .boundingBox())!;
  const drawerBox = (await issues.boundingBox())!;
  expect(drawerBox.width).toBe(Math.max(railBox.width, 320));
  expect(drawerBox.x + drawerBox.width).toBeCloseTo(
    railBox.x + railBox.width,
    0,
  );
  const issue = issues
    .getByRole('region', { name: 'Errors' })
    .locator('[data-validation-issue]')
    .filter({ hasText: 'ER PPC' });
  await expect(issue).toContainText('Select the equipment in Critical Slots');
  const placeIssue = issue.getByRole('button', {
    name: 'Go to Critical Slots',
    exact: true,
  });
  await expect(placeIssue).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('placement-error-guidance.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(issues).toBeHidden();
  await expect(statusButton).toBeFocused();
  await statusButton.click();
  await placeIssue.click();
  await expect(
    page.getByRole('tab', { name: 'Critical Slots', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const placement = page.getByRole('region', { name: 'Equipment placement' });
  await expect(placement).toBeFocused();
  await expect(placement).toContainText('ER PPC');
  expect((await readDraft(page)).id).toBe(id);
  await statusButton.click();
  // Overweight names its cause and offers the tabs that change carried weight.
  const errorIssue = issues
    .getByRole('region', { name: 'Errors' })
    .locator('[data-validation-issue]')
    .filter({ hasText: /Overweight by/ })
    .first();
  await expect(errorIssue.locator('[data-validation-fix]')).toHaveText([
    /Go to Equipment/,
    /Go to Armor/,
  ]);
  await errorIssue
    .getByRole('button', { name: 'Go to Armor', exact: true })
    .click();
  await expect(
    page.getByRole('tab', { name: 'Armor', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('tabpanel', { name: 'Armor', exact: true }),
  ).toBeFocused();
  expect((await readDraft(page)).id).toBe(id);
  await page
    .getByRole('button', { name: 'Hide loadout panel', exact: true })
    .click();
  await statusButton.click();
  await placeIssue.click();
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
  await statusButton.click();
  await placeIssue.click();
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

test('critical locations fit below pinned tools and offer one phone location pill tablist @customizer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/customizer');
  await loadUnit(page);
  const desktop = page.getByTestId('critical-slots-grid-desktop');
  const checkDesktop = async () => {
    await expect(desktop).toBeVisible();
    const key = page.getByRole('group', { name: 'Colour key', exact: true });
    await expect(key).toBeVisible();
    for (const label of [
      'Energy',
      'Ballistic',
      'Missile',
      'Heat Sink',
      'Engine',
      'Gyro',
      'Actuators',
      'Cockpit / life support / sensors',
      'Empty',
    ])
      await expect(key.getByText(label, { exact: true })).toBeVisible();
    // Fixed systems show their family accents, not one grey chip.
    await expect(key.getByText('Fixed systems', { exact: true })).toHaveCount(
      0,
    );
    for (const swatch of await key.locator('[aria-hidden="true"]').all()) {
      const box = (await swatch.boundingBox())!;
      expect(box.width).toBe(12);
      expect(box.height).toBeGreaterThanOrEqual(12);
      expect(box.height).toBe(12);
    }
    for (const label of await key.locator('span').all()) {
      expect(
        await label.evaluate((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBe(13);
    }
    await expect(
      page.getByRole('button', { name: 'Colour key', exact: true }),
    ).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Auto-arrange', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        desktop.evaluate(
          (element) => element.scrollHeight - element.clientHeight,
        ),
      )
      .toBeLessThanOrEqual(2);
    await expect(page.getByText('Scroll for more locations')).toBeHidden();
    const tops = await desktop
      .locator(':scope > div > :nth-child(-n + 5)')
      .evaluateAll((columns) =>
        columns.map((column) => column.getBoundingClientRect().top),
      );
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    const toolbarTop = (await key.boundingBox())!.y;
    await desktop.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const locations = desktop.getByRole('group', { name: /critical slots$/ });
    await expect(locations).toHaveCount(8);
    const rightTorso = (await locations
      .filter({ hasText: 'Right Torso' })
      .boundingBox())!;
    const leftTorso = (await locations
      .filter({ hasText: 'Left Torso' })
      .boundingBox())!;
    const rightLeg = (await desktop
      .getByRole('group', { name: 'Right Leg critical slots', exact: true })
      .boundingBox())!;
    const leftLeg = (await desktop
      .getByRole('group', { name: 'Left Leg critical slots', exact: true })
      .boundingBox())!;
    expect(rightLeg.y).toBe(leftLeg.y);
    expect(rightLeg.x).toBe(rightTorso.x);
    expect(leftLeg.x).toBe(leftTorso.x);
    expect(rightLeg.width).toBe(rightTorso.width);
    expect(leftLeg.width).toBe(leftTorso.width);

    for (const location of await locations.all())
      await expect(location).toBeInViewport({ ratio: 1 });
    expect((await key.boundingBox())!.y).toBe(toolbarTop);
    await expect(
      page.getByRole('button', { name: 'Auto-arrange', exact: true }),
    ).toBeInViewport({ ratio: 1 });
    const banner = page.getByRole('region', { name: 'Equipment to place' });
    if (await banner.isVisible()) {
      await expect(banner).toBeInViewport({ ratio: 1 });
      // The banner already states the issue, so the tab notice stays out.
      await expect(page.getByTestId('tab-issue-notice')).toBeHidden();
    }
    await desktop.evaluate((element) => {
      element.scrollTop = 0;
    });
  };
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await checkDesktop();
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('ER PPC');
  await page.getByRole('button', { name: 'Add ER PPC', exact: true }).click();
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Equipment to place' }),
  ).toBeVisible();
  await checkDesktop();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('group', { name: 'Colour key', exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Colour key', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBe(0);
  await expect(
    page.getByText('Matches the record sheet · left side on the left'),
  ).toBeHidden();
  const phone = page.getByTestId('critical-slots-grid-mobile');
  const shortcuts = phone.getByRole('navigation', {
    name: 'Critical slot location shortcuts',
  });
  const locationTabs = shortcuts.getByRole('tablist', { name: 'Location' });
  const pills = locationTabs.getByRole('tab');
  await expect(shortcuts.getByRole('combobox')).toHaveCount(0);
  await expect(pills).toHaveCount(8);
  // All eight locations show at once as a 4x2 grid in record-sheet order.
  const pillBoxes = await pills.evaluateAll((items) =>
    items.map((pill) => {
      const rect = pill.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top };
    }),
  );
  const strip = (await locationTabs.boundingBox())!;
  for (const box of pillBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(strip.x - 1);
    expect(box.right).toBeLessThanOrEqual(strip.x + strip.width + 1);
  }
  expect(new Set(pillBoxes.map((box) => Math.round(box.top))).size).toBe(2);
  expect(
    pillBoxes.slice(0, 4).every((box) => box.top === pillBoxes[0].top),
  ).toBe(true);
  expect(pillBoxes.slice(4).every((box) => box.top === pillBoxes[4].top)).toBe(
    true,
  );
  await expect(pills.nth(4)).toHaveAccessibleName(
    /^Right Torso, \d+ of 12 used$/,
  );
  await expect(
    phone.getByRole('heading', { name: /^Left Arm \u2014 \d+ of 12 used$/ }),
  ).toBeVisible();
  expect(await pills.allTextContents()).toEqual(
    [
      /^LA \d+\/12$/,
      /^LT \d+\/12$/,
      /^HD \d+\/6$/,
      /^CT \d+\/12$/,
      /^RT \d+\/12$/,
      /^RA \d+\/12$/,
      /^LL \d+\/6$/,
      /^RL \d+\/6$/,
    ].map((pattern) => expect.stringMatching(pattern)),
  );
  const sizes = await pills.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().height),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
  await locationTabs.getByRole('tab', { name: /^Head,/ }).click();
  await expect(
    phone.getByRole('group', { name: 'Head critical slots', exact: true }),
  ).toBeVisible();
  const legTab = locationTabs.getByRole('tab', { name: /^Left Leg,/ });
  await legTab.click();
  await expect(legTab).toHaveAttribute('aria-selected', 'true');
  await expect(legTab).toBeInViewport({ ratio: 1 });
  await expect(
    phone.getByRole('group', { name: 'Left Leg critical slots', exact: true }),
  ).toBeVisible();
  await expect(
    phone.getByRole('group', { name: /critical slots$/ }),
  ).toHaveCount(1);
  await expect(shortcuts).toBeInViewport({ ratio: 1 });
  await page
    .getByRole('button', { name: 'Select ER PPC', exact: true })
    .click();
  const arm = phone.getByRole('group', {
    name: 'Left Arm critical slots',
    exact: true,
  });
  await expect(arm).toBeVisible();
  const slot = arm.getByRole('gridcell', { name: /empty/i }).first();
  expect((await slot.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(
    await slot.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeGreaterThanOrEqual(14);
  await slot.click();
  await expect(
    page.getByRole('region', { name: 'Equipment to place' }),
  ).toBeHidden();
  await expect(
    arm.getByRole('gridcell', { name: /ER PPC/ }).first(),
  ).toBeVisible();
  // The unit name shows once on phones, inside its tab on one line; a
  // name this short fits without its ellipsis.
  await expect(page.getByTestId('phone-unit-name')).toHaveCount(0);
  const unitName = page
    .getByRole('tab', { name: 'Atlas AS7-D', exact: true })
    .locator('[data-unit-tab-name]');
  await expect(unitName).toHaveText('Atlas AS7-D');
  expect(
    await unitName.evaluate(
      (element) =>
        element.scrollHeight <= element.clientHeight &&
        element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test('phone issue card stays compact and orders errors before warnings @customizer', async ({
  page,
}) => {
  await page.goto('/customizer');
  await loadUnit(page);
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('ER PPC');
  await page.getByRole('button', { name: 'Add ER PPC', exact: true }).click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const card = page.getByTestId('overview-issue-summary');
  await expect(card).toBeVisible();
  expect(
    await card
      .locator('li')
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute('data-severity')),
      ),
  ).toEqual(['error', 'error', 'warning']);
  expect((await card.boundingBox())!.height).toBeLessThanOrEqual(240);
  const action = card.getByRole('button', { name: 'Weight: go to Equipment' });
  await expect(action).toContainText('Go to Equipment');
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const chip = page.locator('[data-build-status="error"]');
  await expect(chip).toContainText('Issues');
  await expect(chip.locator('[data-icon-name="chevron-right"]')).toBeVisible();
  expect((await chip.boundingBox())!.height).toBe(44);
  const sizes = await page
    .getByRole('region', { name: 'Unit status' })
    .locator('[data-testid^="unit-info-stat-"] span')
    .evaluateAll((spans) =>
      spans
        .filter(
          (span) =>
            span.children.length === 0 &&
            /\d/.test(span.textContent ?? '') &&
            span.getBoundingClientRect().width > 0,
        )
        .map((span) => parseFloat(getComputedStyle(span).fontSize)),
    );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13);
});

test('heat explanations reconcile and phone navigation keeps issue badges @customizer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/customizer');
  await loadUnit(page);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  const heat = page.getByTestId('overview-stat-heat');
  await expect(heat).toContainText(/\d+ from weapons \+ \d+ from running/);
  const sources = (await heat.innerText()).match(
    /\d+ from weapons \+ \d+ from running/,
  )![0];
  await expect(page.getByTestId('unit-info-stat-heat')).toHaveAttribute(
    'title',
    expect.stringContaining(sources),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const selector = page.getByRole('button', { name: /^Section:/ });
  // The trigger badges only what the current section owns: Overview owns no
  // issue, so the heat warning on Structure does not show here.
  await expect(selector.getByRole('img')).toHaveCount(0);
  await selector.click();
  const structure = page.getByRole('tab', { name: 'Structure', exact: true });
  await expect(
    structure.getByRole('img', { name: 'Structure: 1 warning' }),
  ).toBeVisible();
  await expect(structure.locator('[data-section-badge="warning"]')).toHaveText(
    '1',
  );
  await structure.click();
  await expect(
    selector.getByRole('img', { name: 'Structure: 1 warning' }),
  ).toBeVisible();
  await expect(page.getByTestId('tab-issue-notice')).toBeHidden();
  await expect(
    page.getByTestId('structure-heat-sink-weight-help'),
  ).toContainText(
    /\d+ heat sinks · \d+ fit inside the engine, \d+ mounted outside · first 10 weigh nothing; \d+ add \d+ t/,
  );
  await expect(
    page.getByRole('button', {
      name: 'More stats (Armor, Movement, BV)',
      exact: true,
    }),
  ).toBeVisible();
  await selector.click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  const legendEnd = page
    .getByTestId('overview-tonnage-breakdown')
    .locator('li')
    .last();
  await legendEnd.scrollIntoViewIfNeeded();
  const legendBox = (await legendEnd.boundingBox())!;
  const loadoutBox = (await page
    .getByRole('button', { name: 'Expand loadout', exact: true })
    .boundingBox())!;
  expect(legendBox.y + legendBox.height).toBeLessThanOrEqual(loadoutBox.y);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  await expect(page.getByTestId('tab-issue-notice')).toBeVisible();
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
  const selector = page.getByRole('button', {
    name: 'Section: Critical Slots, 5 of 7',
  });
  await expect(selector).toBeInViewport({ ratio: 1 });
  const selectorBox = (await selector.boundingBox())!;
  const history = page.getByRole('group', {
    name: 'Edit history',
    exact: true,
  });
  await expect(history).toBeInViewport({ ratio: 1 });
  const historyBox = (await history.boundingBox())!;
  // The selector fills the phone row beside the 44px undo/redo controls.
  expect(selectorBox.width).toBeGreaterThanOrEqual(260);
  expect(selectorBox.height).toBe(44);
  expect(historyBox.y).toBe(selectorBox.y);
  expect(historyBox.x).toBeGreaterThanOrEqual(
    selectorBox.x + selectorBox.width,
  );
  expect(historyBox.x - selectorBox.x - selectorBox.width).toBeLessThanOrEqual(
    12,
  );
  await selector.click();
  const active = page.getByRole('tab', { name: 'Critical Slots', exact: true });
  await expect(active).toBeInViewport({ ratio: 1 });
  await expect(active).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(selector).toBeFocused();
  await expect(selector).toHaveAttribute('aria-expanded', 'false');
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
      name: 'Locust LCT-1V: Not legal · 2 errors, show issues',
      exact: true,
    });
  await expect(locustErrors).toBeVisible();
  const baselineLabels = await page
    .locator('[aria-label="Unit validation"] button')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('aria-label')!),
    );
  const errorItems = page
    .getByRole('dialog')
    .getByRole('region', { name: 'Errors' })
    .locator('[data-validation-issue]');
  await locustErrors.click();
  const baselineMessages = await errorItems.allTextContents();
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
      .getByRole('button', { name: /errors?.*, show issues$/ }),
  ).toBeVisible();
  await page
    .locator('[aria-label="Unit validation"]')
    .getByRole('button', {
      name: /errors?.*, show issues$/,
    })
    .click();
  const atlasMessages = await errorItems.allTextContents();
  expect(atlasMessages).not.toEqual(baselineMessages);
  // Overweight, plus the unplaced ER PPC: unplaced equipment is an error.
  expect(atlasMessages).toHaveLength(2);
  expect(atlasMessages[0]).toContain(
    'Unit exceeds maximum tonnage by 7.0 tons',
  );
  expect(atlasMessages[1]).toContain('ER PPC needs a location');
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
      .getByTestId('unit-info-stat-weight'),
  ).toContainText('/20t');
  await expect(locustErrors).toBeVisible();
  await locustErrors.click();
  expect(await errorItems.allTextContents()).toEqual(baselineMessages);
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
