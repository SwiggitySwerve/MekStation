import { test, expect, type Page, type Locator } from '@playwright/test';

const nativeDialogs = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const events: string[] = [];
  nativeDialogs.set(page, events);
  page.on('dialog', async (dialog) => {
    events.push(`${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });
});
test.afterEach(async ({ page }, testInfo) => {
  const events = nativeDialogs.get(page) ?? [];
  await testInfo.attach('native-dialogs.json', {
    body: JSON.stringify(events),
    contentType: 'application/json',
  });
  expect(events).toEqual([]);
});

async function assertViewport(page: Page, width = 390, height = 844) {
  expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([
    width,
    height,
  ]);
}

async function loadStock(
  page: Page,
  search = 'Atlas AS7-D',
  variant = 'AS7-D',
  fromCurrentUnit = false,
) {
  if (!fromCurrentUnit) await page.goto('/customizer');
  const previousUnitId = new URL(page.url()).pathname.split('/')[2];
  await page
    .getByRole('button', {
      name: fromCurrentUnit ? 'Add Unit (Ctrl+O)' : 'Load from Library',
      exact: true,
    })
    .click();
  const library = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await library.getByRole('combobox').first().selectOption('canonical');
  await library
    .getByPlaceholder('Search by chassis or variant...')
    .fill(search);
  await library.getByText(variant, { exact: true }).click();
  await library.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(library).toBeHidden();
  await expect(page).toHaveURL(/\/customizer\/[0-9a-f-]{36}(?:\/[^/]+)?$/);
  await expect
    .poll(() => new URL(page.url()).pathname.split('/')[2])
    .not.toBe(previousUnitId);
  return new URL(page.url()).pathname;
}

async function storedEquipment(page: Page, route?: string) {
  return page.evaluate((pathname) => {
    const id = (pathname ?? location.pathname).split('/')[2];
    const raw = localStorage.getItem(`megamek-unit-${id}`);
    if (!raw) throw new Error(`No saved draft for ${id}`);
    return JSON.parse(raw).state.equipment as { instanceId: string }[];
  }, route);
}

async function openMobile(page: Page) {
  await page
    .getByRole('button', { name: 'Expand loadout', exact: true })
    .click();
  const drawer = page.getByRole('dialog', {
    name: 'Equipment Loadout',
    exact: true,
  });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveAttribute('open', '');
  return drawer;
}

async function openClear(page: Page, drawer: Locator) {
  await drawer.getByRole('button', { name: 'Clear All', exact: true }).click();
  const child = page.getByRole('dialog', {
    name: 'Clear equipment loadout?',
    exact: true,
  });
  await expect(child).toBeVisible();
  await expect(child).toHaveAttribute('open', '');
  await expect(child).toHaveAttribute('aria-modal', 'true');
  return child;
}

async function pointerHits(button: Locator) {
  await expect
    .poll(() =>
      button.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    )
    .toBe(true);
}

test('mobile loadout is a keyboard modal above navigation @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertViewport(page);
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
  const trigger = page.getByRole('button', {
    name: 'Expand loadout',
    exact: true,
  });
  await trigger.focus();
  await trigger.press('Enter');
  const drawer = page.getByRole('dialog', {
    name: 'Equipment Loadout',
    exact: true,
  });
  await expect(drawer).toBeVisible();
  const close = drawer.getByRole('button', {
    name: 'Close loadout',
    exact: true,
  });
  await expect(close).toBeFocused();
  const footer = drawer.getByRole('button', { name: 'Close', exact: true });
  await expect
    .poll(() =>
      footer.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    )
    .toBe(true);
  await close.press('Shift+Tab');
  await expect(footer).toBeFocused();
  await footer.press('Tab');
  await expect(close).toBeFocused();
  await close.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await footer.click();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await close.click();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await page.screenshot({
    path: testInfo.outputPath('mobile-loadout-modal.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await assertViewport(page, 1280, 900);
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole('tab', { name: 'Equipment', exact: true }),
  ).toBeVisible();
});

test('mobile equipment actions retain identity and focus through mounting and removal @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertViewport(page);
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
  await page.getByRole('button', { name: /^Section:/ }).click();
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('Small Laser');
  await page
    .getByRole('button', { name: 'Add Small Laser', exact: true })
    .click();
  const equipment = () =>
    page.evaluate(() => {
      const id = location.pathname.split('/')[2];
      return JSON.parse(localStorage.getItem(`megamek-unit-${id}`)!).state
        .equipment as {
        instanceId: string;
        equipmentId: string;
        location?: string;
        slots?: number[];
      }[];
    });
  const instance = (await equipment()).find(
    (item) => item.equipmentId === 'small-laser',
  )!;
  expect(instance).toBeTruthy();
  await page
    .getByRole('button', { name: 'Expand loadout', exact: true })
    .press('Enter');
  const drawer = page.getByRole('dialog', { name: 'Equipment Loadout' });
  const assign = drawer.getByRole('button', {
    name: 'Assign Small Laser to location',
    exact: true,
  });
  await assign.focus();
  await assign.press('Enter');
  await expect(drawer.getByRole('button', { name: /^Head/ })).toBeDisabled();
  await drawer.getByRole('button', { name: /^Left Arm/ }).press('Enter');
  const selection = drawer.getByRole('button', {
    name: 'Select Small Laser in Left Arm',
    exact: true,
  });
  await expect(selection).toBeFocused();
  await expect
    .poll(
      async () =>
        (await equipment()).find(
          (item) => item.instanceId === instance.instanceId,
        )?.slots,
    )
    .toEqual([6]);
  for (const button of await drawer.getByRole('button').all()) {
    if (!(await button.isVisible())) continue;
    const bounds = await button.boundingBox();
    expect(
      bounds?.height,
      (await button.getAttribute('aria-label')) ?? (await button.innerText()),
    ).toBeGreaterThanOrEqual(44);
    expect(
      bounds?.width,
      (await button.getAttribute('aria-label')) ?? (await button.innerText()),
    ).toBeGreaterThanOrEqual(44);
  }
  await drawer
    .getByRole('button', {
      name: 'Unassign Small Laser from Left Arm',
      exact: true,
    })
    .press('Enter');
  expect(
    (await equipment()).find((item) => item.instanceId === instance.instanceId)
      ?.location,
  ).toBe('Left Arm');
  await drawer
    .getByRole('button', {
      name: 'Confirm unassign Small Laser from Left Arm',
      exact: true,
    })
    .press('Enter');
  await expect(
    drawer.getByRole('button', {
      name: 'Select Small Laser unassigned',
      exact: true,
    }),
  ).toBeFocused();
  await expect
    .poll(
      async () =>
        (await equipment()).find(
          (item) => item.instanceId === instance.instanceId,
        )?.location,
    )
    .toBeUndefined();
  await page.screenshot({
    path: testInfo.outputPath('mobile-equipment-unassigned.png'),
    fullPage: true,
  });
  await drawer
    .getByRole('button', { name: 'Remove Small Laser', exact: true })
    .press('Enter');
  expect(
    (await equipment()).some((item) => item.instanceId === instance.instanceId),
  ).toBe(true);
  await drawer
    .getByRole('button', {
      name: 'Confirm removal of Small Laser',
      exact: true,
    })
    .press('Enter');
  await expect
    .poll(() => drawer.evaluate((el) => el.contains(document.activeElement)))
    .toBe(true);
  await expect
    .poll(async () =>
      (await equipment()).some(
        (item) => item.instanceId === instance.instanceId,
      ),
    )
    .toBe(false);
  await drawer.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Section: Equipment, 4 of 7' }),
  ).toBeVisible();
  expect(
    (await equipment()).some((item) => item.instanceId === instance.instanceId),
  ).toBe(false);
});

test('mobile bulk confirmation is centered above its parent and persists only approval @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertViewport(page);
  await loadStock(page);
  const before = await storedEquipment(page);
  const baselineOverflow = await page.evaluate(
    () => document.body.style.overflow,
  );
  expect(baselineOverflow).not.toBe('hidden');
  const drawer = await openMobile(page);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  const clear = drawer.getByRole('button', { name: 'Clear All', exact: true });
  let child = await openClear(page, drawer);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  const geometry = await child.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      centerX: r.x + r.width / 2,
      centerY: r.y + r.height / 2,
      position: getComputedStyle(el).position,
    };
  });
  expect(Math.abs(geometry.centerX - 195)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.centerY - 422)).toBeLessThanOrEqual(1);
  expect(geometry.position).toBe('fixed');
  const cancel = child.getByRole('button', { name: 'Cancel', exact: true });
  const approve = child.getByRole('button', {
    name: 'Clear Equipment',
    exact: true,
  });
  await pointerHits(cancel);
  await pointerHits(approve);
  const first = child.getByRole('button', {
    name: 'Close dialog',
    exact: true,
  });
  await expect(first).toBeFocused();
  await first.press('Shift+Tab');
  await expect(approve).toBeFocused();
  await approve.press('Tab');
  await expect(first).toBeFocused();
  await first.press('Tab');
  await expect(cancel).toBeFocused();
  await cancel.press('Escape');
  await expect(child).toBeHidden();
  await expect(drawer).toBeVisible();
  await expect(clear).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  expect(await storedEquipment(page)).toEqual(before);
  child = await openClear(page, drawer);
  await pointerHits(child.getByRole('button', { name: 'Cancel', exact: true }));
  await child.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(child).toBeHidden();
  await expect(clear).toBeFocused();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  expect(await storedEquipment(page)).toEqual(before);
  child = await openClear(page, drawer);
  const count = Number(
    (await child.innerText()).match(/Remove all (\d+) equipment/)![1],
  );
  expect(count).toBeGreaterThan(0);
  await child.screenshot({
    path: testInfo.outputPath('mobile-bulk-confirmation.png'),
  });
  await pointerHits(
    child.getByRole('button', { name: 'Clear Equipment', exact: true }),
  );
  await child
    .getByRole('button', { name: 'Clear Equipment', exact: true })
    .click();
  await expect(child).toBeHidden();
  await expect(drawer).toBeVisible();
  await expect(clear).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  const after = await storedEquipment(page);
  expect(before.length - after.length).toBe(count);
  expect(
    after.every((item) =>
      before.some((old) => old.instanceId === item.instanceId),
    ),
  ).toBe(true);
  await expect(
    drawer.getByRole('button', { name: /^Select /, pressed: true }),
  ).toHaveCount(0);
  await drawer.getByRole('button', { name: 'Close', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe(baselineOverflow);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Expand loadout', exact: true }),
  ).toBeVisible();
  expect(await storedEquipment(page)).toEqual(after);
  await testInfo.attach('bulk-state.json', {
    body: JSON.stringify(
      { before, after, count, geometry, baselineOverflow },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});

test('mobile pending confirmation is discarded when its parent disappears on the same unit @customizer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertViewport(page);
  const route = await loadStock(page);
  const before = await storedEquipment(page);
  const initialOverflow = await page.evaluate(
    () => document.body.style.overflow,
  );
  expect(initialOverflow).not.toBe('hidden');
  const drawer = await openMobile(page);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  const child = await openClear(page, drawer);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe('hidden');
  await page.setViewportSize({ width: 1280, height: 900 });
  await assertViewport(page, 1280, 900);
  await expect(drawer).toBeHidden();
  await expect(child).toBeHidden();
  expect(new URL(page.url()).pathname).toBe(route);
  expect(await storedEquipment(page)).toEqual(before);
  await expect
    .poll(() => page.evaluate(() => document.body.style.overflow))
    .toBe(initialOverflow);
  expect(await page.evaluate(() => document.activeElement?.isConnected)).toBe(
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await assertViewport(page);
  const reopened = drawer;
  await expect(reopened).toBeVisible();
  await expect(reopened).toHaveAttribute('open', '');
  const fresh = await openClear(page, reopened);
  await fresh.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await storedEquipment(page)).toEqual(before);
});

test('mobile pending confirmation is discarded across same-document unit history @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await assertViewport(page);
  const atlas = await loadStock(page);
  const atlasBefore = await storedEquipment(page);
  const timeOrigin = await page.evaluate(() => performance.timeOrigin);
  expect(new URL(page.url()).pathname.endsWith('/armor')).toBe(false);
  await page.getByRole('button', { name: /^Section:/ }).click();
  await page.getByRole('tab', { name: 'Armor', exact: true }).click();
  await expect(page).toHaveURL(/\/armor$/);
  const enforcer = await loadStock(page, 'Enforcer ENF-4R', 'ENF-4R', true);
  const enforcerBefore = await storedEquipment(page);
  expect(enforcer).not.toBe(atlas);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  const drawer = await openMobile(page);
  const pending = await openClear(page, drawer);
  await page.goBack();
  await expect
    .poll(() => new URL(page.url()).pathname.split('/')[2])
    .toBe(atlas.split('/')[2]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await expect(
    page.locator('[aria-label="Open units"] [aria-selected="true"]'),
  ).toHaveAttribute('aria-label', /Atlas/);
  await expect(pending).toBeHidden();
  expect(await storedEquipment(page, atlas)).toEqual(atlasBefore);
  expect(await storedEquipment(page, enforcer)).toEqual(enforcerBefore);
  await page.goForward();
  await expect
    .poll(() => new URL(page.url()).pathname.split('/')[2])
    .toBe(enforcer.split('/')[2]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin);
  await expect(
    page.locator('[aria-label="Open units"] [aria-selected="true"]'),
  ).toHaveAttribute('aria-label', /Enforcer/);
  await expect(pending).toBeHidden();
  const returned = (await drawer.isVisible()) ? drawer : await openMobile(page);
  const fresh = await openClear(page, returned);
  await fresh.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await storedEquipment(page, atlas)).toEqual(atlasBefore);
  expect(await storedEquipment(page, enforcer)).toEqual(enforcerBefore);
  await testInfo.attach('same-document-history.json', {
    body: JSON.stringify(
      {
        atlas,
        enforcer,
        timeOrigin,
        afterTimeOrigin: await page.evaluate(() => performance.timeOrigin),
        atlasBefore,
        enforcerBefore,
      },
      null,
      2,
    ),
    contentType: 'application/json',
  });
});
