import { expect, type Page } from '@playwright/test';

// Follow-up PR: "allow page zoom" removes this existing viewport restriction.
const PREVIEW_A11Y_WAIVERS: readonly string[] = ['meta-viewport'];

/** WCAG A/AA through 2.2 plus landmarks, except the named waiver; local axe. */
export async function assertPreviewAccessibility(page: Page): Promise<void> {
  expect(PREVIEW_A11Y_WAIVERS).toEqual(['meta-viewport']);
  // Scan the loaded app after its transient startup overlay becomes hidden.
  await expect(page.locator('#__splash')).toBeHidden();
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const result = await page.evaluate(async (waivers) => {
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
      .map((rule) => rule.ruleId)
      .filter((rule) => !waivers.includes(rule));
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
  }, PREVIEW_A11Y_WAIVERS);
  expect(result.violations).toEqual([]);
}
