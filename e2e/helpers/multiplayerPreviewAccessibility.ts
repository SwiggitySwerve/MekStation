import { expect, type Page } from '@playwright/test';

/** Full WCAG A/AA through 2.2 plus page landmarks; use this tree's axe. */
export async function assertPreviewAccessibility(page: Page): Promise<void> {
  // Scan the loaded app after its transient startup overlay becomes hidden.
  await expect(page.locator('#__splash')).toBeHidden();
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(async () => {
    const axeWindow = window as typeof window & {
      axe: {
        getRules(tags: string[]): { ruleId: string }[];
        run(options: { runOnly: { type: string; values: string[] } }): Promise<{
          violations: { id: string; help: string; nodes: unknown[] }[];
        }>;
      };
    };
    const wcagRules = axeWindow.axe
      .getRules([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'wcag22a',
        'wcag22aa',
      ])
      .map((rule) => rule.ruleId);
    return axeWindow.axe.run({
      runOnly: {
        type: 'rule',
        values: [
          ...new Set([
            ...wcagRules,
            'region',
            'landmark-one-main',
            'page-has-heading-one',
          ]),
        ],
      },
    });
  });
  expect(result.violations).toEqual([]);
}
