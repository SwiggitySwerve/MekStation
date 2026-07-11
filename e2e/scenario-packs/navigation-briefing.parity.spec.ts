/**
 * navigation-briefing parity spec (task 3.3) — loads the navigation pilot
 * pack (genesis: `campaign-create-to-launch@contract-accepted`,
 * `holdSafe: true`) via `loadCampaignPack` and hard-asserts the checkpoint's
 * invariant: a contract has been accepted, which the production flow
 * expresses as a mission now existing on the campaign (the SAME
 * precondition `campaign-create-to-launch`'s own next checkpoint,
 * `mission-launch-briefing`, relies on via `openMissionListAction` —
 * `e2e/flow-audits.spec.ts`). Blocking `expect`s only — no capture-tolerant
 * findings, no `@smoke` tag (spec: Parity Binding).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D6, D9)
 */

import { expect, test } from '@playwright/test';

import { loadCampaignPack } from '../helpers/scenarioPackLoading';

test.describe('scenario pack parity: navigation-briefing', () => {
  test('an accepted contract yields a launchable mission at the target route', async ({
    page,
  }, testInfo) => {
    const { campaignId } = await loadCampaignPack(page, 'navigation-briefing', {
      workerIndex: testInfo.workerIndex,
    });

    // The loader's own goto already landed on the pack's targetRoute
    // (the contract market) — assert its render is sane before moving on.
    await expect(page.getByTestId('contract-market-grid')).toBeVisible({
      timeout: 20_000,
    });

    // The genesis checkpoint's invariant: accepting a contract creates a
    // mission. This is the exact precondition the flow's own NEXT
    // checkpoint (`mission-launch-briefing`) depends on.
    await page.goto(`/gameplay/campaigns/${campaignId}/missions`);
    await expect(
      page.locator('[data-testid^="mission-card-"]').first(),
    ).toBeVisible({
      timeout: 20_000,
    });

    // The mission is launchable — the same launch-briefing affordance the
    // genesis flow opens next.
    const launch = page.locator('[data-testid^="mission-launch-"]').first();
    await expect(launch).toBeVisible({ timeout: 20_000 });
  });
});
