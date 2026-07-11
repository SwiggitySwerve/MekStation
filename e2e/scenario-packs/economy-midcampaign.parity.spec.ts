/**
 * economy-midcampaign parity spec (tasks 5.1/5.2) — loads the fast-forward
 * economy pilot pack (genesis: `fast-forward:economy-midcampaign`, W3
 * `fastForwardCampaign()` dump, task 5.0 gate) via `loadCampaignPack` and
 * hard-asserts the invariant summary recorded at mint (design D9's fast-
 * forward parity binding): the route-rendered finances surface agrees with
 * the balance and mixed transaction-type ledger the mint captured. Blocking
 * `expect`s only — no capture-tolerant findings, no `@smoke` tag (spec:
 * Parity Binding).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D6, D9)
 */

import { expect, test } from '@playwright/test';

import { loadCampaignPack } from '../helpers/scenarioPackLoading';

test.describe('scenario pack parity: economy-midcampaign', () => {
  test('the finances surface agrees with the mint-time invariant summary: balance, transaction-type presence, contract status', async ({
    page,
  }, testInfo) => {
    await loadCampaignPack(page, 'economy-midcampaign', {
      workerIndex: testInfo.workerIndex,
    });

    await expect(page.getByTestId('page-title')).toBeVisible({
      timeout: 20_000,
    });

    // Balance (design D9: "the route-rendered economy surfaces agree with
    // the mint-time invariant summary" — the payload's committed
    // `body.finances.balance` is `1299600` C-bills: starting 1,000,000 +
    // the paid contract's 300,000 closure payout - two 200 C-bill daily
    // salary postings).
    await expect(page.getByTestId('finances-balance')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('finances-balance')).toContainText(
      '1,299,600.00 C-bills',
    );

    // Mixed transaction types (design D6: "≥1 contract paid, mixed-type
    // ledger") — exactly the three transactions the mint captured: two
    // salary (expense) postings and one contract-closure (income) payout.
    const ledger = page.getByTestId('finances-ledger');
    await expect(ledger).toBeVisible({ timeout: 20_000 });
    const rows = page.locator('[data-testid^="ledger-row-"]');
    await expect(rows).toHaveCount(3);
    await expect(ledger).toContainText('income');
    await expect(ledger).toContainText('expense');

    // Contract status (design D9's invariant summary includes
    // `contractStatuses`) — the mint's committed provenance records the
    // fixture's single contract closed `Failed` (the fixture's
    // deterministic seed/combat outcome), still paying its (nonzero)
    // failurePayment — proving "a contract paid" never implies "a
    // contract won".
    await expect(ledger).toContainText('Failed');
  });
});
