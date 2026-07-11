/**
 * personnel-roster parity spec (task 3.3) — loads the personnel pilot pack
 * (genesis: `personnel-hiring@roster-updated`, `holdSafe: true`) via
 * `loadCampaignPack` and hard-asserts the checkpoint's invariant: the
 * hired recruit is visible on the personnel roster surface at the target
 * route. Blocking `expect`s only — no capture-tolerant findings, no
 * `@smoke` tag (spec: Parity Binding).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D6, D9)
 */

import { expect, test } from '@playwright/test';

import { loadCampaignPack } from '../helpers/scenarioPackLoading';

test.describe('scenario pack parity: personnel-roster', () => {
  test('a hired recruit is present on the roster at the target route', async ({
    page,
  }, testInfo) => {
    await loadCampaignPack(page, 'personnel-roster', {
      workerIndex: testInfo.workerIndex,
    });

    // The loader's own goto already landed on the pack's targetRoute (the
    // personnel page) — assert render sanity, then the genesis
    // checkpoint's invariant: the recruit hired at mint time is present.
    await expect(page.getByTestId('page-title')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Mint Pack Recruit')).toBeVisible({
      timeout: 20_000,
    });
  });
});
