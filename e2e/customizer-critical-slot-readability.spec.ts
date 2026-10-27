import { expect, test } from '@playwright/test';

import { PROTECTED_SLOT_COLORS } from '../src/components/customizer/protected/protectedSlotColors';

test('critical panels use the workspace and keep slot names readable @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Add unit', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  const measurements = [];
  for (const layout of [
    {
      name: 'desktop-sidebar',
      width: 1378,
      height: 912,
      minimumPanelWidth: 200,
      wide: false,
    },
    {
      name: 'desktop-wide',
      width: 1378,
      height: 912,
      minimumPanelWidth: 250,
      wide: true,
    },
    {
      name: 'small-desktop',
      width: 1180,
      height: 912,
      minimumPanelWidth: 160,
      wide: false,
    },
    {
      name: 'phone',
      width: 390,
      height: 844,
      minimumPanelWidth: 340,
      wide: false,
    },
  ]) {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    const toggle = page.getByRole('button', {
      name: 'Hide loadout panel',
      exact: true,
    });
    if (
      (await toggle.isVisible()) &&
      ((await toggle.getAttribute('aria-pressed')) === 'true') !== layout.wide
    )
      await toggle.click();
    let grid = page.getByTestId(
      layout.width >= 1024
        ? 'critical-slots-grid-desktop'
        : 'critical-slots-grid-mobile',
    );
    await expect(grid).toBeVisible();
    if (layout.width < 640) {
      grid = grid
        .getByRole('navigation', { name: 'Critical slot location shortcuts' })
        .locator('..');
      const selector = grid.getByRole('tablist', { name: 'Location' });
      for (const pill of await selector.getByRole('tab').all()) {
        await pill.click();
        const panel = grid.getByRole('group', { name: /critical slots$/ });
        await expect(panel).toHaveCount(1);
        expect((await panel.boundingBox())!.width).toBeGreaterThanOrEqual(
          layout.minimumPanelWidth,
        );
        expect(
          await panel
            .locator('span')
            .evaluateAll((spans) =>
              spans.every(
                (span) =>
                  span.scrollWidth <= span.clientWidth + 1 ||
                  !!span.getAttribute('title'),
              ),
            ),
        ).toBe(true);
      }
      await selector.getByRole('tab', { name: /^Right Torso,/ }).click();
    }
    await expect(
      grid.getByRole('group', { name: /critical slots$/ }),
    ).toHaveCount(layout.width < 640 ? 1 : 8);
    const actual = await grid.evaluate((element) => ({
      workspaceWidth: element.getBoundingClientRect().width,
      panels: Array.from(element.querySelectorAll('[role=group]'))
        .filter((panel) => panel.getBoundingClientRect().width > 0)
        .map((panel) => ({
          label: panel.getAttribute('aria-label'),
          width: panel.getBoundingClientRect().width,
        })),
      clippedLabels: Array.from(element.querySelectorAll('span'))
        .filter(
          (span) =>
            span.clientWidth > 0 &&
            span.scrollWidth > span.clientWidth + 1 &&
            !span.getAttribute('title'),
        )
        .map((span) => span.textContent),
      documentOverflow: document.documentElement.scrollWidth - innerWidth,
    }));
    for (const panel of actual.panels)
      expect(panel.width).toBeGreaterThanOrEqual(layout.minimumPanelWidth);
    expect(actual.clippedLabels).toEqual([]);
    expect(actual.documentOverflow).toBe(0);
    if (layout.width < 640) {
      const selector = grid.getByRole('tablist', { name: 'Location' });
      await selector.getByRole('tab', { name: /^Center Torso,/ }).click();
      await expect(
        grid.getByText('Standard Gyro', { exact: true }).first(),
      ).toBeVisible();
      await selector.getByRole('tab', { name: /^Head,/ }).click();
      await expect(
        grid.getByText('Standard Cockpit', { exact: true }),
      ).toBeVisible();
      await selector.getByRole('tab', { name: /^Right Torso,/ }).click();
    } else {
      await expect(
        grid.getByText('Standard Gyro', { exact: true }).first(),
      ).toBeVisible();
      await expect(
        grid.getByText('Standard Cockpit', { exact: true }),
      ).toBeVisible();
    }
    await expect(grid.getByText('Continuation', { exact: true })).toHaveCount(
      0,
    );
    await expect(grid.getByText('AC/20', { exact: true })).toHaveCount(1);
    const occupied = grid.getByRole('gridcell', { name: /^Slot \d+: AC\/20$/ });
    await expect(occupied).toHaveCount(10);
    await expect(grid.getByText('10 slots', { exact: true })).toHaveCount(1);
    await expect(grid.getByText('1–10', { exact: true })).toHaveCount(1);
    await expect(grid.getByText('HS', { exact: true })).toHaveCount(0);
    const sinks = grid.getByRole('gridcell', { name: /: .*Heat Sink$/ });
    if (await sinks.count())
      await expect(sinks.first()).toContainText('Heat Sink');
    await expect(grid.getByText('↳', { exact: true })).toHaveCount(0);
    const grouping = await occupied.evaluateAll((cells) =>
      cells.map((cell) => {
        const style = getComputedStyle(cell);
        const bounds = cell.getBoundingClientRect();
        return {
          top: bounds.top,
          bottom: bounds.bottom,
          background: style.backgroundColor,
          bar: style.borderLeftWidth,
          barColor: style.borderLeftColor,
          topBorder: style.borderTopWidth,
          bottomBorder: style.borderBottomWidth,
          tabIndex: (cell as HTMLElement).tabIndex,
          rowNumber: cell
            .querySelector(
              ':scope > span[aria-hidden="true"]:not([class*=criticalMergedLabel])',
            )
            ?.textContent?.trim(),
        };
      }),
    );
    for (let index = 0; index < grouping.length; index++) {
      const item = grouping[index];
      expect(item.tabIndex).toBe(0);
      expect(item.rowNumber ?? '').toBe('');
      expect(item.background).toBe(grouping[0].background);
      // Every row of the block keeps the category bar, not just the first.
      expect(item.bar).toBe(PROTECTED_SLOT_COLORS.tint.barWidth);
      expect(item.barColor).toBe(grouping[0].barColor);
      expect(item.topBorder).toBe(index === 0 ? '1px' : '0px');
      expect(item.bottomBorder).toBe(
        index === grouping.length - 1 ? '1px' : '0px',
      );
      if (index > 0)
        expect(item.top - grouping[index - 1].bottom).toBeLessThanOrEqual(1);
    }
    const cells = grid.getByRole('gridcell').filter({ visible: true });
    const heights = await cells.evaluateAll((rows) =>
      rows.map((row) => row.getBoundingClientRect().height),
    );
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(
      layout.width < 640 ? 44 : 30,
    );
    if (layout.width >= 1024)
      expect(Math.max(...heights)).toBeLessThanOrEqual(32);
    if (layout.width >= 1024) {
      const textSizes = await cells.evaluateAll((rows) =>
        rows.map((row) => getComputedStyle(row).fontSize),
      );
      expect(textSizes.every((size) => parseFloat(size) >= 14)).toBe(true);
    }
    measurements.push({ layout, ...actual, grouping });
    await page.screenshot({
      path: testInfo.outputPath(layout.name + '.png'),
      animations: 'disabled',
    });
  }
  await testInfo.attach('critical-slot-readability.json', {
    body: JSON.stringify(measurements, null, 2),
    contentType: 'application/json',
  });
});
