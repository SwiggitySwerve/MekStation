import { expect, test } from '@playwright/test';

for (const width of [1351, 1055, 768]) {
  test(`loadout actions stay readable and preserve equipment at ${width}px @customizer`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 912 });
    expect(await page.evaluate(() => [innerWidth, innerHeight])).toEqual([
      width,
      912,
    ]);
    const nativeDialogs: string[] = [];
    page.on('dialog', async (dialog) => {
      nativeDialogs.push(`${dialog.type()}: ${dialog.message()}`);
      await dialog.dismiss();
    });
    await page.goto('/customizer');
    await page
      .getByRole('button', { name: 'Load from Library', exact: true })
      .click();
    const library = page.getByRole('dialog', { name: 'Add Unit', exact: true });
    await library.getByRole('combobox').first().selectOption('canonical');
    await library
      .getByPlaceholder('Search by chassis or variant...')
      .fill('Enforcer ENF-4R');
    await library.getByText('ENF-4R', { exact: true }).click();
    await library
      .getByRole('button', { name: 'Load Unit', exact: true })
      .click();
    await library.waitFor({ state: 'hidden' });
    await page
      .getByRole('tab', { name: 'Critical Slots', exact: true })
      .click();
    const storedDraft = () =>
      page.evaluate(() =>
        localStorage.getItem(`megamek-unit-${location.pathname.split('/')[2]}`),
      );
    await expect.poll(storedDraft).not.toBeNull();
    const before = await storedDraft();
    const trigger = page.getByRole('button', {
      name: 'More loadout actions',
      exact: true,
    });
    if (!(await trigger.isVisible())) {
      await page
        .getByRole('button', { name: 'Open Loadout Drawer', exact: true })
        .click();
    }
    const fixedHeader = page.getByRole('button', { name: /^Fixed Systems/ });
    await fixedHeader.click();
    await trigger.click();
    const menu = page.locator('#loadout-actions');
    await expect(menu).toBeVisible();
    const measurements = await menu.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        const label = button.querySelector('span')!;
        const icon = button.querySelector('svg')!;
        const iconRect = icon.getBoundingClientRect();
        return {
          text: label.textContent,
          width: label.clientWidth,
          scrollWidth: label.scrollWidth,
          targetHeight: rect.height,
          left: rect.left,
          right: rect.right,
          iconWidth: iconRect.width,
          stroke: getComputedStyle(icon).strokeWidth,
        };
      }),
    );
    expect(measurements).toHaveLength(3);
    for (const row of measurements) {
      expect(row.scrollWidth, row.text!).toBeLessThanOrEqual(row.width);
      expect(row.targetHeight).toBeGreaterThanOrEqual(44);
      expect(row.left).toBeGreaterThanOrEqual(0);
      expect(row.right).toBeLessThanOrEqual(width);
      expect(row.iconWidth).toBe(20);
      expect(row.stroke).toBe('2px');
    }
    await menu.screenshot({ path: testInfo.outputPath('loadout-menu.png') });
    await page.screenshot({ path: testInfo.outputPath('loadout-context.png') });
    await menu.getByRole('button', { name: 'Location', exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(
      menu.getByRole('button', { name: 'Location', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await menu.getByRole('button', { name: 'Category', exact: true }).click();
    await trigger.click();
    await expect(
      menu.getByRole('button', { name: 'Category', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await trigger.click();
    await expect(menu).toBeHidden();
    const fixedGroups = fixedHeader.locator('..').getByRole('button', {
      name: /^Show \d+ instances/,
    });
    const fixedGroupCount = await fixedGroups.count();
    for (let group = 0; group < fixedGroupCount; group += 1) {
      await fixedGroups.first().click();
    }
    // Fixed systems are managed by configuration: each card's actions row
    // shows a lock instead of Remove. Open every card's actions to prove it,
    // then track the cards by name.
    const fixedSection = fixedHeader.locator('..');
    const fixedNames = () =>
      fixedSection
        .getByRole('button', { name: /^Select / })
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute('aria-label')).sort(),
        );
    const fixedBefore = await fixedNames();
    expect(fixedBefore.length).toBeGreaterThan(0);
    const closedActions = fixedSection.getByRole('button', {
      name: /^Show actions for /,
    });
    const closedCount = await closedActions.count();
    for (let card = 0; card < closedCount; card += 1)
      await closedActions.first().click();
    await expect(
      fixedSection.locator('[title="Managed by configuration"]'),
    ).toHaveCount(fixedBefore.length);
    await expect(
      fixedSection.getByRole('button', { name: /^Remove / }),
    ).toHaveCount(0);
    await trigger.click();
    await expect(menu).toBeVisible();
    const removeAll = menu.getByRole('button', {
      name: /^Remove All Removable/,
    });
    const removableCount = Number(
      (await removeAll.innerText()).match(/\d+/)![0],
    );
    expect(removableCount).toBeGreaterThan(0);
    await removeAll.click();
    const confirmation = page.getByRole('dialog', {
      name: 'Remove removable equipment?',
      exact: true,
    });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toHaveAttribute('aria-modal', 'true');
    await expect(confirmation).toContainText(
      `Remove all ${removableCount} removable equipment items?`,
    );
    await confirmation
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect(confirmation).toBeHidden();
    await expect(removeAll).toBeFocused();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    expect(await storedDraft()).toBe(before);
    await trigger.click();
    await removeAll.click();
    await expect(confirmation).toBeVisible();
    await confirmation.screenshot({
      path: testInfo.outputPath('remove-confirmation.png'),
    });
    await confirmation
      .getByRole('button', { name: 'Remove Equipment', exact: true })
      .click();
    await expect(confirmation).toBeHidden();
    await expect(menu).toBeHidden();
    await trigger.click();
    await expect(removeAll).toHaveText('Remove All Removable (0)');
    await expect(removeAll).toBeDisabled();
    expect(await fixedNames()).toEqual(fixedBefore);
    const after = await storedDraft();
    const beforeEquipment = JSON.parse(before!).state.equipment as {
      instanceId: string;
    }[];
    const afterEquipment = JSON.parse(after!).state.equipment as {
      instanceId: string;
    }[];
    expect(beforeEquipment.length - afterEquipment.length).toBe(removableCount);
    expect(
      afterEquipment.every((item) =>
        beforeEquipment.some(
          (previous) => previous.instanceId === item.instanceId,
        ),
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await page.reload();
    expect(await storedDraft()).toBe(after);
    expect(nativeDialogs).toEqual([]);
    await testInfo.attach('removal-state.json', {
      body: JSON.stringify(
        {
          removableCount,
          fixedBefore,
          beforeEquipment,
          afterEquipment,
          nativeDialogs,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
    await testInfo.attach('loadout-menu-measurements.json', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    });
  });
}
