import { expect, test, type Page } from '@playwright/test';

import { withBrowserDiagnostics } from './helpers';
import { expectNoHorizontalOverflow } from './helpers/layout';

interface StepperMetrics {
  readonly activeLeft: number;
  readonly activeRight: number;
  readonly clientWidth: number;
  readonly containerLeft: number;
  readonly containerRight: number;
  readonly documentScrollLeft: number;
  readonly scrollLeft: number;
  readonly scrollWidth: number;
}

async function waitForE2EHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
    undefined,
    { timeout: 15_000 },
  );
}

async function measureStepper(page: Page): Promise<StepperMetrics> {
  return page.getByTestId('campaign-step-indicator').evaluate((element) => {
    const activeStep = element.querySelector<HTMLElement>(
      '[aria-current="step"]',
    );
    if (!activeStep) {
      throw new Error('Expected exactly one current campaign step');
    }

    const container = element.getBoundingClientRect();
    const active = activeStep.getBoundingClientRect();

    return {
      activeLeft: active.left,
      activeRight: active.right,
      clientWidth: element.clientWidth,
      containerLeft: container.left,
      containerRight: container.right,
      documentScrollLeft: document.scrollingElement?.scrollLeft ?? 0,
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
    };
  });
}

function expectActiveStepVisible(metrics: StepperMetrics): void {
  expect(metrics.activeLeft).toBeGreaterThanOrEqual(metrics.containerLeft);
  expect(metrics.activeRight).toBeLessThanOrEqual(metrics.containerRight);
}

test.describe('campaign creation mobile stepper', () => {
  test(
    'keeps first and later current steps visible in the stepper after a reload',
    { tag: ['@campaign'] },
    async ({ page }, testInfo) =>
      withBrowserDiagnostics(page, testInfo, async () => {
        const observations: Record<
          number,
          {
            readonly first: StepperMetrics;
            readonly later: StepperMetrics;
            readonly reloaded: StepperMetrics;
          }
        > = {};

        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          await page.goto('/gameplay/campaigns/create');
          await waitForE2EHydration(page);

          const stepper = page.getByTestId('campaign-step-indicator');
          await expect(stepper).toBeVisible();
          await expect(stepper.locator('[aria-current="step"]')).toHaveCount(1);

          const first = await measureStepper(page);
          expect(first.scrollWidth).toBeGreaterThan(first.clientWidth);
          expect(first.scrollLeft).toBe(0);
          expect(first.documentScrollLeft).toBe(0);
          expectActiveStepVisible(first);
          await expectNoHorizontalOverflow(page, `${width}:first-step`);

          await page.getByTestId('campaign-name-input').fill('Mobile Stepper');
          await page.getByTestId('wizard-next-btn').click();
          await page.getByTestId('wizard-next-btn').click();
          await page.getByTestId('wizard-next-btn').click();
          await expect(stepper.locator('[aria-current="step"]')).toHaveText(
            '4',
          );

          const later = await measureStepper(page);
          expect(later.scrollLeft).toBeGreaterThan(0);
          expect(later.documentScrollLeft).toBe(0);
          expectActiveStepVisible(later);
          await expectNoHorizontalOverflow(page, `${width}:later-step`);

          await testInfo.attach(`campaign-stepper-${width}-later.png`, {
            body: await page.screenshot({ animations: 'disabled' }),
            contentType: 'image/png',
          });

          await page.reload({ waitUntil: 'networkidle' });
          await waitForE2EHydration(page);
          await expect(stepper.locator('[aria-current="step"]')).toHaveText(
            '1',
          );

          const reloaded = await measureStepper(page);
          expect(reloaded.scrollLeft).toBe(0);
          expect(reloaded.documentScrollLeft).toBe(0);
          expectActiveStepVisible(reloaded);
          await expectNoHorizontalOverflow(page, `${width}:reloaded-step`);

          observations[width] = { first, later, reloaded };
        }

        await testInfo.attach('campaign-stepper-mobile-metrics.json', {
          body: JSON.stringify(observations, null, 2),
          contentType: 'application/json',
        });
      }),
  );
});
