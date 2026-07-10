/**
 * Shared roster-materialization-handoff helpers for the seam (b) trust
 * anchor journeys (W2 groups 3 and 4 — `add-seam-trust-anchor-journeys`).
 *
 * WHY a separate module rather than importing from
 * `e2e/ux-deep-play-audit.spec.ts`: design D2 forbids importing from or
 * modifying that spec file — trust anchors (blocking depth) and the
 * deep-play audit (capture-tolerant breadth) are different instruments and
 * must not couple. This module instead composes the SAME verified action
 * primitives the audit spec already consumes from `./campaignFlow` (a
 * shared helper module, not a spec file) and adds the seam-specific pieces
 * those primitives do not provide: unique-per-run campaign naming,
 * selecting the FULL available roster (not a count capped at
 * `CAMPAIGN_ROSTER_SIZE`), a bare launch-to-pre-battle step that does not
 * assume a fixed selection count, and teardown for the two new
 * server-persisted row types (forces, encounters) the handoff anchor
 * materializes.
 */

import { expect, request, type Page } from '@playwright/test';

import {
  acceptContractAndOpenLaunch,
  createCampaignViaWizard,
  type CampaignFlowRecorder,
  type CampaignResult,
} from './campaignFlow';

export {
  acceptContractAndOpenLaunch,
  type CampaignResult,
  type CampaignFlowRecorder,
} from './campaignFlow';

/**
 * Minimal `CampaignFlowRecorder` for hard-assertion trust anchors: no
 * screenshot/console-buffer capture (that machinery belongs to the
 * capture-tolerant `WalkthroughRecorder` audit journeys use — design D5
 * forbids mixing capture-tolerant recording into an anchor). Just runs the
 * action against the bound page and returns an incrementing step index so
 * the shared `campaignFlow.ts` primitives (which expect a recorder) work
 * completely unmodified.
 */
export function createSilentStepRecorder(page: Page): CampaignFlowRecorder {
  let stepIndex = 0;
  return {
    async step(_title, action) {
      stepIndex += 1;
      await action(page);
      return stepIndex;
    },
  };
}

export interface SeamCampaignOptions {
  readonly namePrefix?: string;
  readonly description?: string;
  readonly rosterSize?: number;
}

/**
 * Create a campaign through the wizard with a unique `Date.now()`-suffixed
 * name — mirrors the uniquing pattern already used by
 * `campaignSeeders.ts:163` (`E2E Career Pilot ${Date.now()}`) so parallel
 * and repeated local runs never collide on campaign name.
 */
export async function createUniqueSeamCampaign(
  page: Page,
  options: SeamCampaignOptions = {},
): Promise<CampaignResult> {
  const recorder = createSilentStepRecorder(page);
  const namePrefix = options.namePrefix ?? 'Seam Roster Handoff';
  return createCampaignViaWizard(recorder, page, {
    name: `${namePrefix} ${Date.now()}`,
    description:
      options.description ??
      'Seam trust anchor campaign (roster materialization handoff)',
    rosterSize: options.rosterSize,
  });
}

/** Accept the first contract and open the mission launch briefing. */
export async function openSeamMissionLaunchBriefing(
  page: Page,
  campaignId: string,
): Promise<void> {
  const recorder = createSilentStepRecorder(page);
  await acceptContractAndOpenLaunch(recorder, page, { campaignId });
}

/**
 * Check EVERY enabled, unchecked roster unit in the mission readiness
 * panel — never a capped count — so the anchor's rendered/API counts are
 * asserted against the roster's actual size, not an assumed literal.
 * Returns the number of units left selected afterward.
 */
export async function selectAllRosterUnits(page: Page): Promise<number> {
  await expect(page.getByTestId('mission-readiness-panel')).toBeVisible({
    timeout: 20_000,
  });
  const checkboxes = page
    .getByTestId('mission-readiness-panel')
    .locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let index = 0; index < count; index += 1) {
    const checkbox = checkboxes.nth(index);
    if ((await checkbox.isEnabled()) && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }

  let selected = 0;
  for (let index = 0; index < count; index += 1) {
    if (await checkboxes.nth(index).isChecked()) {
      selected += 1;
    }
  }
  return selected;
}

export interface SeamLaunchResult {
  readonly encounterId: string;
  readonly preBattleUrl: string;
}

/**
 * Click the launch control and land on the pre-battle route. Assumes the
 * roster selection (e.g. `selectAllRosterUnits`) has already run — mirrors
 * the launch-click half of `campaignFlow.ts`'s `launchMissionToPreBattle`
 * without the capped-count selection baked in.
 */
export async function launchSelectedRosterToPreBattle(
  page: Page,
): Promise<SeamLaunchResult> {
  await page.getByTestId('launch-mission-direct').click();
  await expect(page).toHaveURL(/\/gameplay\/encounters\/[^/]+/, {
    timeout: 30_000,
  });
  const preBattlePage = page.getByTestId('pre-battle-page');
  if (
    (await preBattlePage.count()) === 0 ||
    !(await preBattlePage.isVisible())
  ) {
    await page.getByRole('button', { name: 'Launch Battle' }).click();
  }
  await expect(page).toHaveURL(/\/gameplay\/encounters\/[^/]+\/pre-battle/, {
    timeout: 30_000,
  });
  await expect(page.getByTestId('pre-battle-page')).toBeVisible({
    timeout: 20_000,
  });

  return {
    encounterId: encounterIdFromUrl(page),
    preBattleUrl: page.url(),
  };
}

function encounterIdFromUrl(page: Page): string {
  const match = page
    .url()
    .match(/\/gameplay\/encounters\/([^/?#]+)(?:\/pre-battle)?/);
  if (!match) {
    throw new Error(`Could not read encounter id from ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

/**
 * Mutable id trackers for rows a seam journey materializes through the live
 * API — module-level sets the caller adds to as ids become known, then
 * hands to `deleteSeamMaterializedRows` in `test.afterAll`.
 */
export interface SeamMaterializedRowIds {
  readonly campaignIds: Set<string>;
  readonly encounterIds: Set<string>;
  readonly forceIds: Set<string>;
}

export function createSeamMaterializedRowTracker(): SeamMaterializedRowIds {
  return {
    campaignIds: new Set<string>(),
    encounterIds: new Set<string>(),
    forceIds: new Set<string>(),
  };
}

/**
 * Delete every tracked row through a standalone `APIRequestContext`
 * (page/context fixtures are rejected in `afterAll` on Playwright 1.57 —
 * `e2e/campaign-flow.spec.ts:637-658` precedent). Unlike that precedent's
 * best-effort catch-and-continue, every delete here asserts 2xx: a seam
 * anchor's rows are always ones this run just created, so a failed delete
 * is a real regression (auth/route/handler) that must surface as a test
 * error, never be swallowed as "already gone" — extending the pattern to
 * the two new row types (forces, encounters) design D2 introduces.
 *
 * Deletion order is leaves-before-parent (forces, then the encounter that
 * references them, then the campaign) — not load-bearing for correctness
 * (no enforced FK constraints among these rows; `ForceRepository`'s
 * encounter-cascade hook only nulls out a still-live encounter's force
 * reference, it never blocks the delete), but it keeps the teardown from
 * momentarily leaving a dangling reference on rows that still exist.
 */
export async function deleteSeamMaterializedRows(
  tracker: SeamMaterializedRowIds,
  baseURL: string,
): Promise<void> {
  const ctx = await request.newContext({ baseURL });
  try {
    for (const forceId of Array.from(tracker.forceIds)) {
      const response = await ctx.delete(
        `/api/forces/${encodeURIComponent(forceId)}`,
      );
      expect(
        response.ok(),
        `DELETE /api/forces/${forceId} returned ${response.status()}`,
      ).toBeTruthy();
    }
    for (const encounterId of Array.from(tracker.encounterIds)) {
      const response = await ctx.delete(
        `/api/encounters/${encodeURIComponent(encounterId)}`,
      );
      expect(
        response.ok(),
        `DELETE /api/encounters/${encounterId} returned ${response.status()}`,
      ).toBeTruthy();
    }
    for (const campaignId of Array.from(tracker.campaignIds)) {
      const response = await ctx.delete(
        `/api/campaigns/${encodeURIComponent(campaignId)}`,
      );
      expect(
        response.ok(),
        `DELETE /api/campaigns/${campaignId} returned ${response.status()}`,
      ).toBeTruthy();
    }
  } finally {
    await ctx.dispose();
  }
}
