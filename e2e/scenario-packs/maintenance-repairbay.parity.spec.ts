/**
 * maintenance-repairbay parity spec (tasks 5.1/5.3) — loads the
 * fast-forward maintenance pilot pack (genesis:
 * `fast-forward:maintenance-repairbay`, W3 `fastForwardCampaign()` dump,
 * task 5.0 gate) via `loadCampaignPack` and hard-asserts, AFTER the
 * declared `advance-day` post-load action (design D8), the day-N+1 state:
 * repair tickets present in the repair bay (populated by the production
 * repair-progress processor, never written directly), damaged units
 * listed, and at least one ticket showing real progress beyond its minted
 * (untouched) state. A second test proves the assertion's dependency on
 * the post-load action by replicating the loader's PUT + `goto` steps
 * WITHOUT running `postLoadActions` and confirming every ticket is still
 * at its minted (`parts-needed`) status (task 5.3 acceptance: "removing
 * the post-load action makes the repair-bay assertion fail"). Blocking
 * `expect`s only — no capture-tolerant findings, no `@smoke` tag (spec:
 * Parity Binding).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D6, D8, D9)
 */

import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import {
  campaignPackSchema,
  type CampaignPackPayload,
} from '../../src/lib/scenarioPacks/packSchemas';
import { stampPackIds } from '../../src/lib/scenarioPacks/packStamping';
import { loadCampaignPack } from '../helpers/scenarioPackLoading';
import { getManifestEntry } from './manifest';

/** The unit whose damage the fixture deterministically produces tickets for (`ff-roster-unit-3` -> `hunchback-hbk-4g` -> `player-1-hunchback-hbk-4g`, mint-time verified against the committed payload). */
const DAMAGED_UNIT_SESSION_ID = 'player-1-hunchback-hbk-4g';

/** Every repair-ticket ROW testid — `repair-ticket-${ticketId}` where `ticketId` itself starts with the literal `ticket-` prefix, distinguishing the row from its `repair-ticket-hours-*`/`repair-ticket-parts-*`/`repair-ticket-up-*`/`repair-ticket-down-*` sibling testids (all of which ALSO start with `repair-ticket-` but never `repair-ticket-ticket-`). */
const REPAIR_TICKET_ROW_PREFIX = 'repair-ticket-ticket-';

test.describe('scenario pack parity: maintenance-repairbay', () => {
  test('after the post-load advance-day, repair tickets are queued, the damaged unit is listed, and real progress has posted (design D8)', async ({
    page,
  }, testInfo) => {
    await loadCampaignPack(page, 'maintenance-repairbay', {
      workerIndex: testInfo.workerIndex,
    });

    await expect(page.getByTestId('page-title')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('repair-bay-queue')).toBeVisible({
      timeout: 20_000,
    });

    // Damaged units listed — the fixture's `hunchback-hbk-4g` unit group.
    await expect(
      page.getByTestId(`repair-unit-group-${DAMAGED_UNIT_SESSION_ID}`),
    ).toBeVisible();

    const ticketRows = page.locator(
      `[data-testid^="${REPAIR_TICKET_ROW_PREFIX}"]`,
    );
    const ticketCount = await ticketRows.count();
    expect(ticketCount).toBeGreaterThan(0);

    // The documented day-N+1 state (design D8: "repair hours partially
    // applied") — AFTER the post-load advance-day action, at least one
    // ticket has moved off its minted `parts-needed` status (the
    // `partsInventory` stitched into the pack — see the minter's module
    // doc — is now available to `repairProgressProcessor` for the FIRST
    // time). Never asserted as "all tickets" — the daily repair-hours
    // budget (8h) may not clear every ticket in one day.
    const rowTexts = await ticketRows.allTextContents();
    const progressedCount = rowTexts.filter(
      (text) => !text.includes('parts-needed'),
    ).length;
    expect(progressedCount).toBeGreaterThan(0);
  });

  test('WITHOUT the post-load advance-day action, every ticket remains at its minted (untouched) status — proving the repair-bay assertion depends on the action', async ({
    page,
    request,
    baseURL,
  }, testInfo) => {
    // Replicates loadCampaignPack's validate -> stamp -> PUT -> goto steps
    // (design D3/D4) but deliberately STOPS before `runPostLoadActions` —
    // never imported from `scenarioPackLoading.ts` (this file is the
    // negative control FOR that function's post-load-action behavior, so
    // it must not delegate the very step under test).
    const entry = getManifestEntry('maintenance-repairbay');
    const absolutePath = path.join(
      process.cwd(),
      'e2e',
      'scenario-packs',
      entry.payloadPath,
    );
    const raw: unknown = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const payload: CampaignPackPayload = campaignPackSchema.parse(raw);
    const { payload: stamped, ids } = stampPackIds(payload, {
      packId: 'maintenance-repairbay-noaction',
      workerIndex: testInfo.workerIndex,
    });

    const putResponse = await request.put(
      `${baseURL}/api/campaigns/${encodeURIComponent(ids.campaignId)}`,
      { data: { envelope: stamped, baseVersion: 0 } },
    );
    expect(putResponse.ok()).toBe(true);

    try {
      await page.goto(
        `/gameplay/campaigns/${encodeURIComponent(ids.campaignId)}/repair-bay`,
      );
      await expect(page.getByTestId('page-title')).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByTestId('repair-bay-queue')).toBeVisible({
        timeout: 20_000,
      });

      const ticketRows = page.locator(
        `[data-testid^="${REPAIR_TICKET_ROW_PREFIX}"]`,
      );
      const ticketCount = await ticketRows.count();
      expect(ticketCount).toBeGreaterThan(0);

      // No advance-day ran — every ticket is exactly the minted,
      // untouched `parts-needed` status (the same tickets the main test
      // above asserts move OFF this status once the post-load action
      // runs).
      const rowTexts = await ticketRows.allTextContents();
      const progressedCount = rowTexts.filter(
        (text) => !text.includes('parts-needed'),
      ).length;
      expect(progressedCount).toBe(0);
    } finally {
      await request.delete(
        `${baseURL}/api/campaigns/${encodeURIComponent(ids.campaignId)}`,
      );
    }
  });
});
