/**
 * Roster Materialization Handoff Trust Anchor — seam (b)
 *
 * `add-seam-trust-anchor-journeys` W2 group 3. Click-drives the live
 * campaign path (contract acceptance -> mission launch briefing -> full
 * roster selection -> the launch click) through
 * `materializeCampaignMissionEncounter` into the pre-battle route, and
 * hard-asserts the roster-parity invariants `campaign-combat-loop`
 * "Campaign-Linked Encounter Launch" promises, at the route-mounted layer
 * `ux-deep-play-audit.spec.ts`'s C4 soft-finding
 * (`playerUnitListCount === 1` / `0 Battle Value` -> `driver.finding`,
 * never a blocking `expect`) cannot enforce. A roster collapse here FAILS
 * the spec — no capture-tolerant recording (design D5).
 *
 * Entry mechanism deliberately does NOT seed past the seam: the seam IS
 * the client half of `launchSinglePlayerMissionFromPage` ->
 * `materializeCampaignMissionEncounter` -> `router.push(...)`. Every row
 * this spec creates (campaign, forces, encounter) is deleted in
 * `test.afterAll` (spec scenario "Handoff journey cleans up its
 * materialized rows").
 *
 * @tags @campaign @seam
 */

import { test, expect, type Page } from '@playwright/test';

import {
  createSeamMaterializedRowTracker,
  createUniqueSeamCampaign,
  deleteSeamMaterializedRows,
  launchSelectedRosterToPreBattle,
  openSeamMissionLaunchBriefing,
  selectAllRosterUnits,
  type SeamMaterializedRowIds,
} from './helpers/seamCampaign';

test.setTimeout(120_000);

// Minimal local shapes for the API responses this anchor cross-checks —
// mirrors the established e2e convention of not importing product `@/types`
// into spec files (see `campaign-flow.spec.ts`'s local snapshot
// interfaces); only the fields this anchor actually asserts are declared.
interface ForceReferenceShape {
  readonly forceId: string;
}

interface EncounterGetResponse {
  readonly encounter: {
    readonly playerForce?: ForceReferenceShape | null;
    readonly opponentForce?: ForceReferenceShape | null;
  };
}

interface AssignmentShape {
  readonly unitId: string | null;
  readonly pilotId: string | null;
}

interface ForceGetResponse {
  readonly force: {
    readonly assignments: readonly AssignmentShape[];
  };
}

const tracker: SeamMaterializedRowIds = createSeamMaterializedRowTracker();

// Runs once after the whole file (not afterEach): page/context fixtures are
// unavailable in `afterAll` on Playwright 1.57, so cleanup goes through a
// standalone `APIRequestContext` — same discipline as
// `e2e/campaign-flow.spec.ts:637-658`, extended here to forces and
// encounters and asserting 2xx per delete rather than swallowing failures.
test.afterAll(async ({}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:3600';
  await deleteSeamMaterializedRows(tracker, baseURL);
});

/** Reads the rendered `player-force-bv` text and parses its leading number. */
async function readPlayerForceBv(page: Page): Promise<number> {
  const text = (await page.getByTestId('player-force-bv').textContent()) ?? '';
  const digits = text.replace(/[^\d]/g, '');
  return digits.length > 0 ? Number.parseInt(digits, 10) : 0;
}

test.describe('Roster Materialization Handoff Trust Anchor', () => {
  test('full roster selection reaches pre-battle intact, verified at both the DOM and data layer', async ({
    page,
  }) => {
    // --- Materialize: wizard -> contract -> briefing -> select ALL roster -> launch ---
    const campaign = await createUniqueSeamCampaign(page);
    tracker.campaignIds.add(campaign.campaignId);

    await openSeamMissionLaunchBriefing(page, campaign.campaignId);

    const selectedUnitCount = await selectAllRosterUnits(page);
    expect(
      selectedUnitCount,
      'expected at least one ready roster unit',
    ).toBeGreaterThan(0);

    const launch = await launchSelectedRosterToPreBattle(page);
    tracker.encounterIds.add(launch.encounterId);

    // Resolve the materialized force ids as early as possible so a failure
    // in the assertions below still leaves both forces tracked for cleanup.
    const encounterResponse = await page.request.get(
      `/api/encounters/${encodeURIComponent(launch.encounterId)}`,
    );
    expect(
      encounterResponse.ok(),
      `GET encounter returned ${encounterResponse.status()}`,
    ).toBeTruthy();
    const encounterBody =
      (await encounterResponse.json()) as EncounterGetResponse;
    const playerForceId = encounterBody.encounter.playerForce?.forceId;
    const opponentForceId = encounterBody.encounter.opponentForce?.forceId;
    if (opponentForceId) tracker.forceIds.add(opponentForceId);
    if (!playerForceId) {
      throw new Error('Materialized encounter has no player force reference');
    }
    tracker.forceIds.add(playerForceId);

    // --- Hard DOM assertions (spec scenario "Full roster selection reaches pre-battle intact") ---
    const playerUnitListCount = await page
      .getByTestId('player-unit-list')
      .locator('> div')
      .count();
    expect(playerUnitListCount).toBe(selectedUnitCount);

    const playerForceBv = await readPlayerForceBv(page);
    expect(playerForceBv).toBeGreaterThan(0);

    const pilotAssignmentIndicatorCount = await page
      .getByTestId('player-unit-list')
      .getByTestId('pilot-assignment-indicator')
      .count();
    expect(pilotAssignmentIndicatorCount).toBe(selectedUnitCount);

    // --- Data-layer cross-check (spec scenario "Force assignments verified at the data layer") ---
    const forceResponse = await page.request.get(
      `/api/forces/${encodeURIComponent(playerForceId)}`,
    );
    expect(
      forceResponse.ok(),
      `GET force returned ${forceResponse.status()}`,
    ).toBeTruthy();
    const forceBody = (await forceResponse.json()) as ForceGetResponse;

    expect(forceBody.force.assignments.length).toBe(selectedUnitCount);
    const distinctUnitIds = new Set(
      forceBody.force.assignments.map((assignment) => assignment.unitId),
    );
    expect(distinctUnitIds.size).toBe(selectedUnitCount);
    expect(
      forceBody.force.assignments.every(
        (assignment) => assignment.pilotId !== null,
      ),
      'expected every materialized assignment to preserve its assigned pilot',
    ).toBe(true);
  });
});
