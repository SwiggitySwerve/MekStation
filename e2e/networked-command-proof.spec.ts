import { expect, test } from '@playwright/test';

import { assertNoMekStationLoading } from './helpers/wait';

test.describe('Networked command browser proof', () => {
  test('keeps host GM intervention, guest intent, redacted result, reconnect, and replay consistent', async ({
    page,
  }) => {
    await page.goto('/e2e/networked-command-proof');
    await assertNoMekStationLoading(page);
    await page.getByTestId('network-proof-reset').click();

    await expect(page.getByTestId('networked-game-surface')).toBeVisible();
    await expect(
      page.getByTestId('network-command-authority-summary'),
    ).toContainText('Host tactical authority');
    await expect(
      page.getByTestId('network-command-authority-private'),
    ).toContainText('GM-private');
    await expect(page.getByTestId('networked-host-gm-controls')).toBeVisible();

    await page.getByTestId('networked-gm-preview-btn').click();
    await expect(
      page.getByTestId('network-proof-preview-status'),
    ).toContainText('Preview ready');

    await page.getByTestId('networked-gm-approve-btn').click();
    await expect(page.getByTestId('network-command-result-feed')).toContainText(
      'Atlas armor corrected by the host GM.',
    );
    const replayCountBefore = await page
      .getByTestId('network-proof-replay-event-count')
      .innerText();

    await page.getByTestId('network-proof-role-guest').click();
    await expect(
      page.getByTestId('network-command-authority-summary'),
    ).toContainText('Guest public mirror');
    await expect(
      page.getByTestId('network-command-authority-public-only'),
    ).toContainText('Public results');
    await expect(page.getByTestId('networked-host-gm-controls')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('GM-private');
    await expect(page.getByTestId('network-command-result-feed')).toContainText(
      'Atlas armor corrected by the host GM.',
    );
    await expect(
      page.getByTestId('network-command-result-feed'),
    ).not.toContainText('Hidden GM adjudication');
    await expect(
      page.getByTestId('network-command-result-feed'),
    ).not.toContainText('Secret objective');

    await page.getByTestId('concede-button').click();
    await expect(page.getByTestId('network-proof-intent-log')).toContainText(
      'pid_guest:concede',
    );

    await page.reload();
    await assertNoMekStationLoading(page);
    await expect(page.getByTestId('networked-game-surface')).toBeVisible();
    await expect(
      page.getByTestId('network-command-authority-summary'),
    ).toContainText('Guest public mirror');
    await expect(
      page.getByTestId('network-proof-replay-event-count'),
    ).toHaveText(replayCountBefore);
    await expect(page.getByTestId('network-command-result-feed')).toContainText(
      'Atlas armor corrected by the host GM.',
    );
    await expect(
      page.getByTestId('network-command-result-feed'),
    ).not.toContainText('Hidden GM adjudication');
    await expect(
      page.getByTestId('network-command-result-feed'),
    ).not.toContainText('Secret objective');
    await expect(page.getByTestId('network-proof-intent-log')).toContainText(
      'pid_guest:concede',
    );
  });
});
