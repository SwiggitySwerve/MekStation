/**
 * experience-pilot parity spec (task 3.3) — loads the experience pilot
 * pack (genesis: `pilot-xp-progression@xp-surface-viewed`, `holdSafe:
 * true`) via `loadCampaignPack` and hard-asserts the SAME invariants
 * `e2e/flow-audits.spec.ts`'s own `xp-surface-viewed` checkpoint asserts —
 * the "Career History" heading and the "Event timeline for ..." copy — on
 * the front-door-created standalone pilot (design R10; see
 * `scenarioPackLoading.ts`'s header comment for the full mechanism).
 * Blocking `expect`s only — no capture-tolerant findings, no `@smoke` tag
 * (spec: Parity Binding).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D6, D9, R10)
 */

import { expect, test } from '@playwright/test';

import { loadCampaignPack } from '../helpers/scenarioPackLoading';

test.describe('scenario pack parity: experience-pilot', () => {
  test('the front-door-created pilot renders its career/XP surface', async ({
    page,
  }, testInfo) => {
    const { pilotId } = await loadCampaignPack(page, 'experience-pilot', {
      workerIndex: testInfo.workerIndex,
    });

    expect(
      pilotId,
      'loadCampaignPack must front-door-create the standalone pilot (design R10)',
    ).toBeTruthy();

    // The loader's own goto already landed on `/gameplay/pilots/{pilotId}?tab=career`.
    await expect(
      page.getByRole('heading', { name: 'Career History' }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Event timeline for/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});
