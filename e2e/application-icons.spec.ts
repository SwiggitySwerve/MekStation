import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/units',
  '/compendium',
  '/compendium/units',
  '/compendium/equipment',
  '/compendium/rules',
  '/gameplay',
  '/gameplay/campaigns',
  '/gameplay/forces',
  '/gameplay/pilots',
  '/gameplay/encounters',
  '/gameplay/quick',
  '/gameplay/games',
  '/multiplayer',
  '/contacts',
  '/shared',
  '/share',
  '/compare',
  '/replay-library',
  '/audit/timeline',
  '/e2e/simulation-viewer',
  '/e2e/tactical-map',
];

for (const width of [1351, 390]) {
  test(`shared icons keep their size and stroke across application surfaces at ${width}px @appearance`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 912 });
    const evidence = [];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.ok(), route).toBe(true);
      // Wait for paint, not just markup: the dev server keeps <body> at
      // display:none until its styles load, which can land after `load`.
      await expect(
        page.locator('svg[data-ui-icon]').filter({ visible: true }).first(),
      ).toBeVisible();
      const icons = await page
        .locator('svg[data-ui-icon]')
        .evaluateAll((nodes) =>
          nodes.flatMap((node) => {
            const rect = node.getBoundingClientRect();
            if (!rect.width || !rect.height) return [];
            const style = getComputedStyle(node);
            return [
              {
                name: node.getAttribute('data-icon-name'),
                size: node.getAttribute('data-icon-size'),
                width: parseFloat(style.width),
                height: parseFloat(style.height),
                strokeWidth: style.strokeWidth,
                linecap: style.strokeLinecap,
                linejoin: style.strokeLinejoin,
                accessible:
                  node.getAttribute('aria-hidden') === 'true' ||
                  !!node.getAttribute('aria-label') ||
                  !!node.getAttribute('aria-labelledby'),
                shrink: style.flexShrink,
              },
            ];
          }),
        );
      expect(icons.length, route).toBeGreaterThan(0);
      for (const icon of icons) {
        const sizes: Record<string, number> = {
          inline: 16,
          control: 20,
          toolbar: 24,
          feature: 32,
          hero: 48,
        };
        expect(icon.width, `${route} ${icon.name}`).toBe(sizes[icon.size!]);
        expect(icon.height).toBe(icon.width);
        expect(icon.strokeWidth).toBe('2px');
        expect(icon.linecap).toBe('round');
        expect(icon.linejoin).toBe('round');
        expect(icon.shrink).toBe('0');
        expect(icon.accessible).toBe(true);
      }
      evidence.push({ route, iconCount: icons.length, icons });
      if (
        [
          '/',
          '/gameplay',
          '/e2e/simulation-viewer',
          '/e2e/tactical-map',
        ].includes(route)
      ) {
        await page.screenshot({
          path: testInfo.outputPath(route.replaceAll('/', '-') + '.png'),
        });
      }
    }
    await testInfo.attach('application-icon-measurements.json', {
      body: JSON.stringify(evidence, null, 2),
      contentType: 'application/json',
    });
  });
}

test('shared icon styles preserve visibility and large-icon centering utilities @appearance', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.locator('svg[data-ui-icon]').filter({ visible: true }).first(),
  ).toBeVisible();
  const geometry = await page.evaluate(() => {
    const original =
      document.querySelector<SVGSVGElement>('svg[data-ui-icon]')!;
    const icon = original.cloneNode(true) as SVGSVGElement;
    icon.setAttribute('class', 'ui-icon mx-auto');
    icon.setAttribute('data-icon-size', 'hero');
    icon.style.width = '48px';
    icon.style.height = '48px';
    const frame = document.createElement('div');
    frame.style.width = '200px';
    frame.append(icon);
    document.body.append(frame);
    const a = icon.getBoundingClientRect();
    const b = frame.getBoundingClientRect();
    const centerError = Math.abs(a.left + a.width / 2 - b.left - b.width / 2);
    icon.classList.add('hidden');
    const hiddenDisplay = getComputedStyle(icon).display;
    frame.remove();
    return { centerError, hiddenDisplay };
  });
  expect(geometry.centerError).toBeLessThanOrEqual(0.5);
  expect(geometry.hiddenDisplay).toBe('none');
});
