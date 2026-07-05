import { expect, test, type Page } from '@playwright/test';

async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
    undefined,
    { timeout: 15_000 },
  );
}

function collectNextAssetFailures(page: Page): string[] {
  const failures: string[] = [];

  page.on('requestfailed', (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? 'request failed';
    if (url.includes('/_next/') && !failure.includes('ERR_ABORTED')) {
      failures.push(`${failure}: ${url}`);
    }
  });

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/_next/') && response.status() >= 400) {
      failures.push(`${response.status()}: ${url}`);
    }
  });

  return failures;
}

async function expectNoNextAssetFailures(failures: string[]): Promise<void> {
  expect(failures, 'Next client route assets should load cleanly').toEqual([]);
}

test.describe('production client route transitions', () => {
  test('dashboard Gameplay link renders the Gameplay route, not only its URL', async ({
    page,
  }) => {
    const assetFailures = collectNextAssetFailures(page);

    await page.goto('/');
    await waitForHydration(page);

    await page.locator('a[href="/gameplay"]').first().click();

    await expect(page).toHaveURL('/gameplay');
    await expect(page.getByTestId('page-title')).toHaveText('Gameplay');
    await expectNoNextAssetFailures(assetFailures);
  });

  test('Campaigns create action renders the campaign wizard after client routing', async ({
    page,
  }) => {
    const assetFailures = collectNextAssetFailures(page);

    await page.goto('/gameplay/campaigns');
    await waitForHydration(page);

    await page.getByTestId('create-campaign-btn').click();

    await expect(page).toHaveURL('/gameplay/campaigns/create');
    await expect(page.getByTestId('campaign-name-input')).toBeVisible();
    await expectNoNextAssetFailures(assetFailures);
  });

  test('mobile menu Quick Game link renders Quick Game content after client routing', async ({
    page,
  }) => {
    const assetFailures = collectNextAssetFailures(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForHydration(page);

    await page.getByRole('button', { name: /open menu/i }).click();
    await page
      .locator('[data-testid="mobile-menu"] a[href="/gameplay/quick"]')
      .click();

    await expect(page).toHaveURL('/gameplay/quick');
    await expect(page.getByTestId('start-quick-game-btn')).toBeVisible();
    await expectNoNextAssetFailures(assetFailures);
  });
});
