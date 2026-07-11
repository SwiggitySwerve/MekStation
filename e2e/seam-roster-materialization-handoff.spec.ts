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

import { test, expect, type APIResponse, type Page } from '@playwright/test';

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

// Roster-source shapes for the pilot-IDENTITY cross-check (spec.md:96
// "pilot identity itself SHALL be verified at the data layer"). Every
// campaign save persists a `rosterProjection` snapshot of the live
// roster store (`readLiveRosterSnapshot`,
// `src/stores/campaign/useCampaignPersistenceStore.ts`) whose units
// carry `unitRef` + `pilotId` — the SAME two fields
// `rosterUnitsToForceUnits` (`src/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits.ts`)
// reads to build each `PUT /api/forces/assignments/:id` body
// (`unitId: unit.unitRef, pilotId: unit.pilotRef`,
// `materializeCampaignMissionEncounter.ts:189-190`). Comparing the two
// is therefore a genuine identity check, not a presence check.
interface CampaignRosterUnitShape {
  readonly unitRef?: string;
  readonly pilotId?: string;
}

interface CampaignGetResponse {
  readonly body: {
    readonly rosterProjection?: {
      readonly units: readonly CampaignRosterUnitShape[];
    };
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

    // Pilot IDENTITY, not mere presence: resolve the campaign's roster
    // source of truth and assert each materialized assignment's pilotId
    // matches the SAME roster unit's pilotId — closing the swap-class
    // regression (e.g. an off-by-one slot shift, or every unit stamped
    // with the first roster pilot) that a `pilotId !== null` presence
    // check cannot see, and that the pre-battle DOM cannot assert either
    // (it renders only the assignment marker, never a pilot name —
    // design.md D2 / R5).
    //
    // Bounded poll, not a fixed sleep: the wizard's save is debounced
    // (`AUTO_SAVE_DEBOUNCE_MS`, `useCampaignPersistenceStore.ts`) and
    // `campaign-save-status-card` merely being visible does not mean
    // the autosave round-trip has reached the server yet — an immediate
    // GET can race a real 404.
    let campaignResponse: APIResponse | undefined;
    await expect
      .poll(
        async () => {
          campaignResponse = await page.request.get(
            `/api/campaigns/${encodeURIComponent(campaign.campaignId)}`,
          );
          return campaignResponse.status();
        },
        {
          timeout: 20_000,
          message: 'waiting for the campaign autosave to reach the server',
        },
      )
      .toBe(200);
    const campaignBody =
      (await campaignResponse!.json()) as CampaignGetResponse;
    const rosterUnits = campaignBody.body.rosterProjection?.units ?? [];
    const rosterPilotByUnitRef = new Map<string, string | null>(
      rosterUnits
        .filter(
          (unit): unit is CampaignRosterUnitShape & { unitRef: string } =>
            typeof unit.unitRef === 'string',
        )
        .map((unit) => [unit.unitRef, unit.pilotId ?? null]),
    );

    for (const assignment of forceBody.force.assignments) {
      expect(
        assignment.unitId,
        'expected every materialized assignment to reference a canonical unitRef',
      ).not.toBeNull();
      const unitId = assignment.unitId as string;
      expect(
        rosterPilotByUnitRef.has(unitId),
        `expected campaign roster to contain the materialized unit ${unitId}`,
      ).toBe(true);
      const rosterPilotId = rosterPilotByUnitRef.get(unitId) ?? null;
      expect(
        rosterPilotId,
        `expected campaign roster unit ${unitId} to have an assigned pilot`,
      ).not.toBeNull();
      expect(
        assignment.pilotId,
        `expected assignment for unit ${unitId} to preserve the roster's assigned pilot ${rosterPilotId}, not swap or drop it`,
      ).toBe(rosterPilotId);
    }
  });
});
