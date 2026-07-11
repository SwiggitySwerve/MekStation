/**
 * Scenario Pack Loaders — front-door loading (design D3/D4, tasks 3.1).
 *
 * `loadCampaignPack` is the ONLY way a Playwright spec reaches a campaign
 * pack's target state: validate (fail-loud, before any network write) ->
 * stamp parallel-safe ids (design D4) -> PUT the envelope to the production
 * campaigns route -> `page.goto` the target route -> confirm the mount-time
 * load actually completed by inspecting the SAME signals the production
 * persistence store itself branches on (design D3's "post-goto load-outcome
 * check").
 *
 * This reads `useCampaignPersistenceStore` directly via the sanctioned
 * additive exposure (design D3 amendment, orchestrator ruling 2026-07-11,
 * the W3 D9 precedent): `campaignPersistence` on
 * `window.__ZUSTAND_STORES__` (`src/lib/e2e/storeExposure.ts`) — the ONE
 * production touch this change makes (proposal.md Impact). Success is
 * `saveState: 'saved'` with `campaignId` matching the stamped id; any
 * reported `errorMessage` (the catch-all `'error'` state or the not-found
 * `'idle'` path, `useCampaignPersistenceStore.ts:450-453/477-481`) throws
 * immediately naming the store's own message — never a bare Playwright
 * selector-timeout message (spec: "A client-side load failure surfaces loud
 * and named").
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D3, D4)
 */

import {
  expect,
  request as playwrightRequest,
  test,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { MATCH_LOG_DB_VERSION } from '../../src/lib/p2p/matchLogStorageSchema';
import {
  campaignPackSchema,
  encounterPackSchema,
  type CampaignPackPayload,
  type EncounterPackPayload,
} from '../../src/lib/scenarioPacks/packSchemas';
import { stampPackIds } from '../../src/lib/scenarioPacks/packStamping';
import {
  getManifestEntry,
  type ScenarioPackManifestEntry,
} from '../scenario-packs/manifest';
import {
  seedMatchLog,
  type SeededGameEvent,
  type SeededMatchesRowFields,
} from './matchLogSeeding';
import { getStoreState } from './store';

/**
 * The standalone-pilot side-channel (design R10's "front-door pilot-row
 * creation plan", the experience pack's own resolution — see
 * `mint-scenario-pack`'s header comment for the full worked rationale): a
 * campaign pack MAY carry a `standalonePilot` field naming a real
 * `POST /api/pilots` request body. `campaignPackSchema`'s `.passthrough()`
 * lets this additive field ride through validation untyped, so it is read
 * here via a narrow local shape rather than a change to the committed
 * schema. Absent on every pack that has no standalone-pilot target route
 * (navigation, personnel, every encounter/fast-forward pack).
 */
interface StandalonePilotCreateRequest {
  readonly mode: 'template';
  readonly template: string;
  readonly identity: {
    readonly name: string;
    readonly callsign?: string;
    readonly affiliation?: string;
    readonly background?: string;
  };
}
interface PayloadWithStandalonePilot {
  readonly standalonePilot?: {
    readonly createRequest: StandalonePilotCreateRequest;
  };
}

// =============================================================================
// Teardown tracking (design: "the e2e/campaign-flow.spec.ts afterAll pattern")
// =============================================================================

/**
 * Every campaign row a pack load has PUT to the server, tracked at module
 * scope so a single `test.afterAll` (registered once, below) can delete
 * every row this file caused across an entire spec file's test run — the
 * same shape as `campaign-flow.spec.ts`'s `persistedCampaignIds` set, moved
 * into the shared loader so every pack-consuming spec gets the cleanup for
 * free instead of re-implementing it. Extended per the R10 verdict (task
 * 1.2's acceptance: "extended per 1.2's R10 verdict if pilot rows are
 * created") to also track front-door-created standalone pilot rows
 * (design R10 — the experience pack's `standalonePilot` side-channel).
 */
const createdCampaignIds = new Set<string>();
const createdPilotIds = new Set<string>();

// `page`/`context` fixtures are per-test and unavailable in `afterAll`
// (Playwright hard-rejects them there) — a standalone `APIRequestContext`
// against the shared base URL is the same escape hatch
// `campaign-flow.spec.ts`'s own afterAll uses.
test.afterAll(async ({}, testInfo) => {
  if (createdCampaignIds.size === 0 && createdPilotIds.size === 0) {
    return;
  }
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:3600';
  const ctx = await playwrightRequest.newContext({ baseURL });
  for (const campaignId of Array.from(createdCampaignIds)) {
    try {
      await ctx.delete(`/api/campaigns/${encodeURIComponent(campaignId)}`);
    } catch {
      // Best-effort cleanup — the row may already be gone (e.g. the
      // "forced client-side load failure" test scenario deletes it itself).
    }
  }
  for (const pilotId of Array.from(createdPilotIds)) {
    try {
      await ctx.delete(`/api/pilots/${encodeURIComponent(pilotId)}`);
    } catch {
      // Best-effort cleanup — same rationale as the campaign loop above.
    }
  }
  createdCampaignIds.clear();
  createdPilotIds.clear();
  await ctx.dispose();
});

// =============================================================================
// Payload loading (fail-loud, pre-PUT — design D3)
// =============================================================================

/** Reads and zod-parses a campaign pack payload off disk. Throws naming the offending path on any schema violation — never a soft skip. */
function readCampaignPackPayload(
  entry: ScenarioPackManifestEntry,
): CampaignPackPayload {
  const absolutePath = path.join(
    process.cwd(),
    'e2e',
    'scenario-packs',
    entry.payloadPath,
  );
  const raw: unknown = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  // `.parse` (not `.safeParse`) is deliberate: a schema violation throws a
  // `ZodError` whose message enumerates every offending path, satisfying
  // "throw naming the offending path... never soft-skip" before any PUT.
  return campaignPackSchema.parse(raw);
}

/**
 * Asserts the campaign-pack pin (design D3's "schemaVersion pin check"):
 * the payload's `schemaVersion` must equal the manifest's recorded pin, and
 * (already enforced by the zod schema itself) never exceed
 * `CURRENT_CAMPAIGN_SCHEMA_VERSION`. An older, migratable pack is allowed
 * through unchanged — the production migration ladder upgrades it on load,
 * never this loader.
 */
function assertCampaignPin(
  entry: ScenarioPackManifestEntry,
  payload: CampaignPackPayload,
): void {
  if (entry.kind !== 'campaign') {
    throw new Error(
      `loadCampaignPack: manifest entry "${entry.id}" is kind "${entry.kind}", not "campaign"`,
    );
  }
  if (payload.schemaVersion !== entry.pins.schemaVersion) {
    throw new Error(
      `loadCampaignPack: pack "${entry.id}" schemaVersion pin mismatch — payload carries ${payload.schemaVersion}, manifest pins ${entry.pins.schemaVersion}`,
    );
  }
}

// =============================================================================
// Post-goto load-outcome check (design D3's "client-side soft-fail defense")
// =============================================================================

/** The exact slice of `CampaignPersistenceStore` (`useCampaignPersistenceStore.ts:64-73`) this check branches on. */
interface ExposedCampaignPersistenceState {
  readonly campaignId: string | null;
  readonly saveState: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  readonly errorMessage: string | null;
}

/**
 * Determines whether the shell's mount-time load
 * (`useCampaignRouteLoader` -> `loadCampaignAction`,
 * `src/stores/campaign/useCampaignPersistenceStore.ts:441-483`) actually
 * completed, by reading `useCampaignPersistenceStore`'s OWN state directly
 * (design D3 amendment — the sanctioned `campaignPersistence` exposure) —
 * the exact same fields `loadCampaignAction` itself sets:
 * `saveState: 'saved'` + matching `campaignId` is success; any reported
 * `errorMessage` (the catch-all `'error'` state, or the not-found `'idle'`
 * path — `useCampaignPersistenceStore.ts:450-453/477-481`) throws
 * immediately naming the store's own message. Throws a named `Error` on
 * every failure path; never lets a bare Playwright locator/selector timeout
 * stand in for a reported error.
 */
async function assertCampaignPackMounted(
  page: Page,
  stampedCampaignId: string,
  packId: string,
): Promise<void> {
  const deadline = Date.now() + 20_000;
  for (;;) {
    const state = await getStoreState<ExposedCampaignPersistenceState>(
      page,
      'campaignPersistence',
    ).catch(() => null);

    if (state) {
      // Named-error paths first — these are terminal regardless of how
      // long the loop has been running, so they never wait out the
      // deadline before reporting the store's own message.
      if (state.saveState === 'error' && state.errorMessage) {
        throw new Error(
          `loadCampaignPack: pack "${packId}" load failed — ${state.errorMessage}`,
        );
      }
      if (state.saveState === 'idle' && state.errorMessage) {
        // The not-found branch resolves `saveState` back to `'idle'`
        // (`useCampaignPersistenceStore.ts:451`) rather than `'error'`, so
        // it needs its own check — `errorMessage` is still set and still
        // names the failure (`'campaign not found'`).
        throw new Error(
          `loadCampaignPack: pack "${packId}" load failed — ${state.errorMessage}`,
        );
      }
      if (
        state.saveState === 'saved' &&
        state.campaignId === stampedCampaignId
      ) {
        return;
      }
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `loadCampaignPack: pack "${packId}" client-side load did not complete within the mount deadline — the persistence store never reached "saved" with stamped id "${stampedCampaignId}" (last observed saveState=${state?.saveState ?? 'unexposed'}, errorMessage=${state?.errorMessage ?? 'none'}); this names an unreported hang, not a network error`,
      );
    }
    await page.waitForTimeout(250);
  }
}

// =============================================================================
// Post-load actions (design D8 — closed vocabulary, front-door only)
// =============================================================================

/** Count-guarded visibility check — `.isVisible()` on a zero-match locator throws in strict mode. */
async function isLocatorVisible(page: Page, testId: string): Promise<boolean> {
  const locator = page.getByTestId(testId);
  if ((await locator.count()) === 0) return false;
  return locator.first().isVisible();
}

/** Drives the production Advance Day control once (design D8's chosen `advance-day` post-load action — never writes `campaignInventory` directly). */
async function runAdvanceDayAction(page: Page): Promise<void> {
  const oneDayTestId = (await isLocatorVisible(page, 'day-advance-one-day'))
    ? 'day-advance-one-day'
    : 'advance-day-btn';
  const control = page.getByTestId(oneDayTestId);
  await expect(control).toBeVisible({ timeout: 20_000 });
  await control.click();
  await page.waitForTimeout(1_500);
}

async function runPostLoadActions(
  page: Page,
  postLoadActions: readonly string[],
  packId: string,
): Promise<void> {
  for (const action of postLoadActions) {
    switch (action) {
      case 'advance-day':
        await runAdvanceDayAction(page);
        break;
      default:
        // The manifest schema (design D2/2.1) already closes this
        // vocabulary to exactly `['advance-day']` — this branch only
        // fires if that guarantee is ever violated, and it must fail
        // loud rather than silently no-op an unrecognized action verb.
        throw new Error(
          `loadCampaignPack: pack "${packId}" declares unrecognized postLoadAction "${action}"`,
        );
    }
  }
}

// =============================================================================
// loadCampaignPack
// =============================================================================

export interface LoadCampaignPackOptions {
  readonly workerIndex: number;
}

export interface LoadedCampaignPack {
  readonly campaignId: string;
  /** Present only for packs carrying a `standalonePilot` side-channel (the experience pack — see the header comment above). */
  readonly pilotId?: string;
}

/**
 * Front-door-creates the standalone vault pilot a `standalonePilot` pack
 * declares (design R10's resolution for the experience pack — a real
 * `/api/pilots` row, independent of the campaign envelope, which does not
 * carry pilot rows inline). A fresh POST per load is inherently
 * parallel-safe (the server mints its own id), so this needs no id-stamping
 * of its own the way the campaign/match id families do (design D4).
 */
async function createStandalonePilotIfDeclared(
  page: Page,
  payload: CampaignPackPayload,
  packId: string,
): Promise<string | undefined> {
  const declared = (payload as CampaignPackPayload & PayloadWithStandalonePilot)
    .standalonePilot;
  if (!declared) return undefined;

  const response = await page.request.post('/api/pilots', {
    data: declared.createRequest,
  });
  if (!response.ok()) {
    throw new Error(
      `loadCampaignPack: pack "${packId}" standalone-pilot POST failed — server responded ${response.status()}: ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { pilot?: { id?: string } };
  const pilotId = body.pilot?.id;
  if (!pilotId) {
    throw new Error(
      `loadCampaignPack: pack "${packId}" standalone-pilot POST succeeded but returned no pilot id`,
    );
  }
  // Tracked so the shared `test.afterAll` above also tears down front-door
  // standalone-pilot rows, not just campaign rows (design R10).
  createdPilotIds.add(pilotId);
  return pilotId;
}

/**
 * Loads a campaign pack through the front door (spec: "Front-Door Loading
 * Contract" / "Campaign packs ride the production load path"):
 *
 * 1. Resolve the manifest entry and read + zod-parse the payload
 *    (fail-loud, before any network write).
 * 2. Assert the campaign-pack schemaVersion pin (design D3).
 * 3. Stamp parallel-safe ids (design D4) — no store writes.
 * 4. PUT `{envelope, baseVersion: 0}` to the production campaigns route
 *    (a fresh stamped id is always an unseen row, so `baseVersion: 0`).
 * 5. Front-door-create any declared standalone pilot (design R10).
 * 6. `page.goto` the manifest's target route with the stamped campaign id
 *    (and, if created, the standalone pilot id) substituted in, riding the
 *    campaign shell's own auto-GET mount chain.
 * 7. Confirm the mount actually completed (this file's header comment).
 * 8. Run any declared `postLoadActions` as real front-door UI interactions.
 */
export async function loadCampaignPack(
  page: Page,
  packId: string,
  options: LoadCampaignPackOptions,
): Promise<LoadedCampaignPack> {
  const entry = getManifestEntry(packId);
  if (entry.kind !== 'campaign') {
    throw new Error(
      `loadCampaignPack: pack "${packId}" is kind "${entry.kind}", not "campaign"`,
    );
  }

  const payload = readCampaignPackPayload(entry);
  assertCampaignPin(entry, payload);

  const { payload: stamped, ids } = stampPackIds(payload, {
    packId,
    workerIndex: options.workerIndex,
  });

  // Tracked BEFORE the PUT resolves so a mid-request crash still leaves the
  // id in the teardown set — deleting a row that never landed is a no-op,
  // but failing to track a row that DID land would leak it.
  createdCampaignIds.add(ids.campaignId);

  const putResponse = await page.request.put(
    `/api/campaigns/${encodeURIComponent(ids.campaignId)}`,
    { data: { envelope: stamped, baseVersion: 0 } },
  );
  if (!putResponse.ok()) {
    throw new Error(
      `loadCampaignPack: pack "${packId}" PUT failed — server responded ${putResponse.status()}: ${await putResponse.text()}`,
    );
  }

  const pilotId = await createStandalonePilotIfDeclared(page, payload, packId);

  const targetRoute = entry.targetRoute
    .replace('{id}', ids.campaignId)
    .replace('{pilotId}', pilotId ?? '');

  // `{pilotId}`-bearing target routes (the experience pack, design R10) land
  // on `/gameplay/pilots/:id`, which the campaign shell never mounts on —
  // `useCampaignRouteLoader` only fires under `/gameplay/campaigns/[id]/*`.
  // The mount check below needs a page the shell DOES own to observe the
  // campaign-load outcome, so this always confirms on the campaign
  // dashboard first, then continues to the pack's real target route
  // (a no-op extra hop for every pack whose targetRoute is already under
  // `/gameplay/campaigns/[id]/*`, since the persistence store is global and
  // not route-scoped).
  await page.goto(`/gameplay/campaigns/${encodeURIComponent(ids.campaignId)}`);
  await assertCampaignPackMounted(page, ids.campaignId, packId);

  // Post-load actions run on the DASHBOARD, before the hop to the pack's
  // real `targetRoute` — the ONLY declared action's control
  // (`day-advance-one-day`/`advance-day-btn`, design D8's `advance-day`)
  // is a dashboard-only surface (`CampaignDashboardPage.sections.tsx`);
  // every other campaign page (repair-bay, finances, personnel, ...) never
  // mounts it. Groups 3/4's packs never exercised this ordering (every
  // pilot pack minted before group 5 declares `postLoadActions: []`) —
  // group 5's maintenance pack is the first non-empty declaration, and
  // running the action here (rather than after the targetRoute hop) is
  // what makes it findable at all.
  await runPostLoadActions(page, entry.postLoadActions, packId);

  if (targetRoute !== `/gameplay/campaigns/${ids.campaignId}`) {
    await page.goto(targetRoute);
  }

  return { campaignId: ids.campaignId, ...(pilotId ? { pilotId } : {}) };
}

// =============================================================================
// loadEncounterPack (task 4.1)
// =============================================================================

/**
 * Reads and zod-parses an encounter pack payload off disk. Enforces the
 * `GameCreated`-first + finite-seed rule (`encounterPackSchema`'s own
 * `superRefine`, task 1.3/2.1) and throws naming the offending path on any
 * violation — never a soft skip, and always before any IndexedDB write
 * (spec: "An unseeded or misordered match log is rejected").
 */
function readEncounterPackPayload(
  entry: ScenarioPackManifestEntry,
): EncounterPackPayload {
  const absolutePath = path.join(
    process.cwd(),
    'e2e',
    'scenario-packs',
    entry.payloadPath,
  );
  const raw: unknown = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  return encounterPackSchema.parse(raw);
}

/**
 * Asserts the encounter-pack pin (design D3's "`MATCH_LOG_DB_VERSION` pin
 * check"): the manifest's pin must STRICTLY equal the LIVE constant read
 * directly from `src/lib/p2p/matchLogStorageSchema.ts` — unlike the
 * campaign schemaVersion pin, no migration ladder exists for the
 * match-log store, so a mismatch in EITHER direction (older or newer) is
 * invalid and the only remedy is a re-capture, never a loader-side
 * tolerance (spec: "A stale encounter pack pin fails loud"). Consulted
 * before any IndexedDB write.
 */
function assertEncounterPin(entry: ScenarioPackManifestEntry): void {
  if (entry.kind !== 'encounter') {
    throw new Error(
      `loadEncounterPack: manifest entry "${entry.id}" is kind "${entry.kind}", not "encounter"`,
    );
  }
  if (entry.pins.matchLogDbVersion !== MATCH_LOG_DB_VERSION) {
    throw new Error(
      `loadEncounterPack: pack "${entry.id}" MATCH_LOG_DB_VERSION pin mismatch — manifest pins ${entry.pins.matchLogDbVersion}, live matchLogStorageSchema.ts constant is ${MATCH_LOG_DB_VERSION}; the match-log store has no migration ladder, so the only remedy is a re-capture of the pack`,
    );
  }
}

/**
 * The exact slice of the exposed `gameplay` store (`useGameplayStore`,
 * already on `window.__ZUSTAND_STORES__` pre-this-change — no additional
 * `storeExposure.ts` touch needed for group-4) this check branches on —
 * the SAME signals `e2e/active-session-recovery.spec.ts`'s
 * `expectRecoveredInteractiveSession`/`expectMirroredRosterRecovered`
 * (the recovery anchor's own assertion surface) branch on.
 */
interface ExposedEncounterGameplayState {
  readonly isLoading?: boolean;
  readonly error?: string | null;
  readonly session?: {
    readonly id?: string;
    readonly currentState?: {
      readonly status?: string;
    };
  } | null;
  readonly interactiveSession?: unknown;
}

/**
 * Determines whether the production recovery factory
 * (`hydrateRecoverableSessionFromMatchLog` -> the gameplay store's cold
 * mount chain) actually completed, by polling the exposed `gameplay`
 * store's own state — never a bare Playwright selector-timeout standing
 * in for a reported error. Mirrors `assertCampaignPackMounted`'s
 * polling shape above.
 */
async function assertEncounterPackMounted(
  page: Page,
  stampedMatchId: string,
  packId: string,
): Promise<void> {
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });

  const deadline = Date.now() + 20_000;
  for (;;) {
    const state = await getStoreState<ExposedEncounterGameplayState>(
      page,
      'gameplay',
    ).catch(() => null);

    if (state?.error) {
      throw new Error(
        `loadEncounterPack: pack "${packId}" recovery failed — ${state.error}`,
      );
    }
    if (
      state &&
      state.isLoading === false &&
      state.session?.id === stampedMatchId &&
      state.session.currentState?.status === 'active' &&
      state.interactiveSession
    ) {
      return;
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `loadEncounterPack: pack "${packId}" client-side recovery did not complete within the mount deadline — the gameplay store never reached an active session with matchId "${stampedMatchId}" (last observed isLoading=${state?.isLoading ?? 'unexposed'}, sessionId=${state?.session?.id ?? 'none'}, status=${state?.session?.currentState?.status ?? 'none'}); this names an unreported hang, not a network error`,
      );
    }
    await page.waitForTimeout(250);
  }
}

export interface LoadEncounterPackOptions {
  readonly workerIndex: number;
}

export interface LoadedEncounterPack {
  readonly matchId: string;
}

/**
 * Loads an encounter pack through the front door (spec: "Front-Door
 * Loading Contract" / "Encounter packs ride the production recovery
 * factory"):
 *
 * 1. Resolve the manifest entry and read + zod-parse the payload
 *    (fail-loud — `GameCreated`-first + finite seed, before any write).
 * 2. Assert the `MATCH_LOG_DB_VERSION` pin (design D3) — before any write.
 * 3. Stamp parallel-safe ids (design D4) — no store writes.
 * 4. Seed the browser IndexedDB match log through the shared
 *    `matchLogSeeding` helper (never a private re-implementation — this
 *    file contains no `indexedDB.open` of its own).
 * 5. Cold `page.goto` the manifest's target route with the stamped match
 *    id substituted in, riding the production recovery factory chain.
 * 6. Confirm the recovery actually completed (this file's header comment).
 *
 * IndexedDB is per-browser-context — no server rows are created, so
 * unlike `loadCampaignPack` there is no row to track for `test.afterAll`
 * teardown (tasks 4.1's acceptance).
 */
export async function loadEncounterPack(
  page: Page,
  packId: string,
  options: LoadEncounterPackOptions,
): Promise<LoadedEncounterPack> {
  const entry = getManifestEntry(packId);
  if (entry.kind !== 'encounter') {
    throw new Error(
      `loadEncounterPack: pack "${packId}" is kind "${entry.kind}", not "encounter"`,
    );
  }

  const payload = readEncounterPackPayload(entry);
  assertEncounterPin(entry);

  const { payload: stamped, ids } = stampPackIds(payload, {
    packId,
    workerIndex: options.workerIndex,
  });

  await seedMatchLog(
    page,
    ids.matchId,
    stamped.events as unknown as readonly SeededGameEvent[],
    (stamped.matchesRow ?? {}) as SeededMatchesRowFields,
  );

  const targetRoute = entry.targetRoute.replace('{id}', ids.matchId);
  await page.goto(targetRoute, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  await assertEncounterPackMounted(page, ids.matchId, packId);

  return { matchId: ids.matchId };
}
