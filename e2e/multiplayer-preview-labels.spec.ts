import { expect, test } from '@playwright/test';

import { assertPreviewAccessibility } from './helpers/multiplayerPreviewAccessibility';

const hosted =
  'You cannot yet select enemy targets, and some matches stop before they finish.';
const coop = 'Some campaign changes can be lost after saving or reloading.';
const p2p =
  "Match launch is unavailable because the two players' battles do not stay in sync.";

for (const [route, sentence] of [
  ['/multiplayer', hosted],
  ['/gameplay/games', p2p],
  ['/gameplay/campaigns', coop],
  ['/gameplay/lobby/LAYTXT?host=1', p2p],
] as const) {
  test(`release limitation on ${route} @game`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByText(sentence, { exact: true })).toBeVisible();
    await expect(
      page.getByText('Preview', { exact: true }).first(),
    ).toBeVisible();
    await assertPreviewAccessibility(page);
    if (route === '/gameplay/campaigns') {
      await page.getByTestId('join-coop-campaign-btn').click();
      await expect(
        page.getByRole('dialog').getByText(coop, { exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId('join-coop-submit-btn')).toBeInViewport();
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByTestId('join-coop-submit-btn')).toBeInViewport();
      await expect(page.getByRole('dialog')).toBeInViewport({ ratio: 1 });
      await assertPreviewAccessibility(page);
    }
  });
}

test('vault help separates sharing from disabled battles @game', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /^P2P Sync/ }).click();
  await expect(page.getByText(p2p, { exact: true })).toBeVisible();
  await expect(
    page.getByText('Share vault items with peers').first(),
  ).toBeVisible();
  await assertPreviewAccessibility(page);
});

test('mobile multiplayer entry carries a text label @game', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/multiplayer');
  await expect(
    page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: /Multiplayer.*Preview/ }),
  ).toBeVisible();
  await assertPreviewAccessibility(page);
});
