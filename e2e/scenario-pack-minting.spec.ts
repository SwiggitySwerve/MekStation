/**
 * Scenario Pack Minter — the ONLY way pack payloads are written (design D7
 * layer 1 "generator minting"; spec: "Generator-Minted Payloads"; tasks
 * 3.2/3.3). Drives the named flow-audit flow's UI actions (reusing the
 * SAME reusable helpers `e2e/flow-audits.spec.ts` itself calls —
 * `createCampaignViaWizard`/`openContractMarketAction`/
 * `acceptFirstContractAction`/`seedHiringHall`, `e2e/helpers/`) to reach a
 * `holdSafe: true` checkpoint, captures the campaign envelope via live
 * `GET /api/campaigns/:id`, runs `canonicalizePackPayload` (design D11 —
 * deterministic pack-scoped template ids, cross-store refs stripped), and
 * writes `e2e/scenario-packs/campaign/<id>.campaign.json` plus a
 * `<id>.provenance.json` sidecar (transcribed into `manifest.ts`'s
 * `provenance` field by hand — the registry stays a hand-maintained typed
 * TS module, the `e2e/flows/manifest.ts` precedent, never
 * generator-written).
 *
 * Env-gated (`MEKSTATION_MINT_PACK_ID`) and excluded from every default
 * project via `testIgnore` (`playwright.config.ts`) plus its own dedicated
 * `scenario-pack-mint` project — mirrors `flow-audits.spec.ts` /
 * `flow-audit`'s exact isolation pattern (design/tasks 3.4, R8) so a bare
 * `npm run test:e2e` never mints anything. Invoke via
 * `node scripts/qc/mint-scenario-pack.mjs <pack-id>`.
 *
 * **The experience pack's `standalonePilot` side-channel** (design R10's
 * "front-door pilot-row creation plan"): `pilot-xp-progression`'s genesis
 * checkpoint (`xp-surface-viewed`) creates a STANDALONE vault pilot with NO
 * campaign at all (`/gameplay/pilots/create` -> `POST /api/pilots`), but
 * every pack this loader can load is `kind: 'campaign'` (the only two
 * manifest kinds are `'campaign' | 'encounter'`,
 * `src/lib/scenarioPacks/packSchemas.ts`, already committed by task 2.1) —
 * loaded via `PUT /api/campaigns/:id` + `page.goto`. Reconciling this: the
 * experience pack's payload IS a (minimal, carrier) campaign envelope
 * satisfying `campaignPackSchema`, PLUS an additive `standalonePilot` field
 * (rides through the schema's `.passthrough()`, untyped by the committed
 * schema, read via a narrow local shape in `scenarioPackLoading.ts`) naming
 * the real `POST /api/pilots` request body. `loadCampaignPack` performs
 * that POST front-door on every load (a fresh server-minted pilot id per
 * load is inherently parallel-safe — no id-stamping of the pilot id family
 * needed, design D4's remap machinery is unaffected) and substitutes the
 * new pilot id into the manifest's `{pilotId}`-templated `targetRoute`. The
 * minter does not need to drive the pilot-creation wizard itself (the
 * created-per-load pilot is never captured/replayed, only its creation
 * PARAMETERS are), so the constant createRequest is defined directly here;
 * the real front-door pilot creation is exercised for real by
 * `loadCampaignPack` at LOAD time and hard-asserted by the pack's own
 * parity spec — this is where "front-door, fail-loud, parity-proven"
 * actually gets proven for the standalone pilot, not at mint time.
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7, D11, R10)
 */

import { expect, test, type Page } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  MATCH_LOG_DB_NAME,
  MATCH_LOG_DB_VERSION,
  MATCH_LOG_STORES,
} from '../src/lib/p2p/matchLogStorageSchema';
import {
  campaignPackSchema,
  encounterPackSchema,
  type CampaignPackPayload,
  type EncounterPackPayload,
} from '../src/lib/scenarioPacks/packSchemas';
import { canonicalizePackPayload } from '../src/lib/scenarioPacks/packStamping';
import {
  acceptFirstContractAction,
  createCampaignViaWizard,
  openContractMarketAction,
  type CampaignFlowRecorder,
} from './helpers/campaignFlow';
import { seedHiringHall } from './helpers/campaignSeeders';
import {
  createUniqueSeamCampaignWithMirroredRoster,
  launchSelectedRosterToPreBattle,
  openSeamMissionLaunchBriefing,
  selectAllRosterUnits,
} from './helpers/seamCampaign';
import { assertNoMekStationLoading } from './helpers/wait';

// =============================================================================
// Env selection — mirrors flow-audits.spec.ts's MEKSTATION_FLOW_ID gate
// =============================================================================

function readEnv(name: string): string | null {
  const raw = process.env[name];
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

const MINT_PACK_ID = readEnv('MEKSTATION_MINT_PACK_ID');

/** A trivial recorder satisfying `CampaignFlowRecorder` — the minter has no checkpoint/finding machinery of its own, it just needs the shared UI-action helpers. */
class MintRecorder implements CampaignFlowRecorder {
  async step(
    _title: string,
    action: (page: Page) => Promise<void>,
  ): Promise<number> {
    await action(this.page);
    return 0;
  }
  constructor(private readonly page: Page) {}
}

/**
 * Save the current campaign to the server through the dashboard save card
 * (mirrors `flow-audits.spec.ts`'s own `saveCampaignToServer`, not exported
 * there — duplicated here as ~15 lines rather than exporting from a file
 * this change does not otherwise need to touch).
 */
async function saveCampaignToServer(
  page: Page,
  campaignId: string,
): Promise<void> {
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
  const saveNow = page.getByTestId('campaign-save-now-btn');
  if ((await saveNow.count()) > 0 && (await saveNow.first().isVisible())) {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/campaigns/${campaignId}`) &&
          response.status() === 200,
        { timeout: 30_000 },
      ),
      saveNow.click(),
    ]);
  }
  await expect(page.getByTestId('campaign-last-saved')).not.toContainText(
    'Never saved',
    {
      timeout: 5_000,
    },
  );
}

async function settleAutosave(page: Page): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: 5_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2_000);
}

// =============================================================================
// Capture + canonicalize + write (shared tail every mint mode uses)
// =============================================================================

const REPO_ROOT = path.resolve(__dirname, '..');

interface MintResult {
  readonly packId: string;
  readonly genesisSource: string;
  readonly extra?: Record<string, unknown>;
}

/**
 * Captures the live campaign envelope, validates it (fail-loud — a
 * malformed capture must never silently become a malformed committed
 * pack), canonicalizes the id graph (design D11), re-validates the
 * canonicalized output (task 3.2 acceptance: "round-trips 2.1's campaign
 * schema"), attaches any `extra` passthrough fields (the experience pack's
 * `standalonePilot`), and writes both the payload and a provenance
 * sidecar.
 */
async function captureCanonicalizeAndWrite(
  page: Page,
  result: MintResult,
): Promise<void> {
  const campaignId = campaignIdFromUrl(page);
  const getResponse = await page.request.get(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
  );
  if (!getResponse.ok()) {
    throw new Error(
      `mint-scenario-pack: capture GET failed for pack "${result.packId}" — server responded ${getResponse.status()}`,
    );
  }
  const raw: unknown = await getResponse.json();
  // Fail-loud on the raw capture BEFORE canonicalizing — a malformed
  // capture must never silently become a malformed committed pack.
  const captured = campaignPackSchema.parse(raw);

  const { payload: canonicalized } = canonicalizePackPayload(captured, {
    packId: result.packId,
  });

  const withExtra: CampaignPackPayload & Record<string, unknown> = {
    ...canonicalized,
    ...(result.extra ?? {}),
  };

  // Round-trip validation (task 3.2 acceptance): the canonicalized +
  // extra-attached payload must still satisfy the campaign pack schema.
  campaignPackSchema.parse(withExtra);

  const payloadDir = path.join(REPO_ROOT, 'e2e', 'scenario-packs', 'campaign');
  fs.mkdirSync(payloadDir, { recursive: true });
  const payloadPath = path.join(payloadDir, `${result.packId}.campaign.json`);
  fs.writeFileSync(
    payloadPath,
    `${JSON.stringify(withExtra, null, 2)}\n`,
    'utf8',
  );

  const baseCommit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT })
    .toString()
    .trim();
  const provenance = {
    genesisSource: result.genesisSource,
    mintedAt: new Date().toISOString(),
    baseCommit,
  };
  const provenancePath = path.join(
    payloadDir,
    `${result.packId}.provenance.json`,
  );
  fs.writeFileSync(
    provenancePath,
    `${JSON.stringify(provenance, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `[mint-scenario-pack] wrote ${path.relative(REPO_ROOT, payloadPath)}`,
  );
  console.log(`[mint-scenario-pack] provenance: ${JSON.stringify(provenance)}`);
}

function campaignIdFromUrl(page: Page): string {
  const match = page.url().match(/\/gameplay\/campaigns\/([^/?#]+)/);
  if (!match) {
    throw new Error(
      `mint-scenario-pack: could not read campaign id from ${page.url()}`,
    );
  }
  return decodeURIComponent(match[1]);
}

// =============================================================================
// Mint modes — one per pilot pack this group mints (task 3.3)
// =============================================================================

const MINT_CAMPAIGN_DESCRIPTION =
  'Scenario pack minter capture (generator-minted, never hand-authored).';

/** navigation-briefing: campaign-create-to-launch @ contract-accepted. */
async function mintNavigationBriefing(page: Page): Promise<void> {
  const recorder = new MintRecorder(page);
  const campaign = await createCampaignViaWizard(recorder, page, {
    name: `Mint navigation-briefing ${Date.now()}`,
    description: MINT_CAMPAIGN_DESCRIPTION,
  });
  await saveCampaignToServer(page, campaign.campaignId);
  await openContractMarketAction(page, campaign.campaignId);
  await acceptFirstContractAction(page);
  await settleAutosave(page);

  await captureCanonicalizeAndWrite(page, {
    packId: 'navigation-briefing',
    genesisSource: 'flow:campaign-create-to-launch@contract-accepted',
  });
}

/** personnel-roster: personnel-hiring @ roster-updated. */
async function mintPersonnelRoster(page: Page): Promise<void> {
  const recorder = new MintRecorder(page);
  const campaign = await createCampaignViaWizard(recorder, page, {
    name: `Mint personnel-roster ${Date.now()}`,
    description: MINT_CAMPAIGN_DESCRIPTION,
  });
  await saveCampaignToServer(page, campaign.campaignId);

  const offerId = `mint-hire-${Date.now()}`;
  await page.goto(`/gameplay/campaigns/${campaign.campaignId}/hiring`);
  await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 20_000 });
  await seedHiringHall(page, [
    { offerId, pilotName: 'Mint Pack Recruit', hireBonus: 25_000 },
  ]);
  await expect(page.getByTestId(`candidate-card-${offerId}`)).toBeVisible({
    timeout: 15_000,
  });

  const hireBtn = page.getByTestId(`candidate-hire-${offerId}`);
  await expect(hireBtn).toBeVisible({ timeout: 15_000 });
  await hireBtn.click();
  await page.waitForTimeout(1_000);
  await settleAutosave(page);

  // `campaign-save-status-card`/`campaign-save-now-btn` only render on the
  // dashboard route, not the hiring page — return there to force-flush the
  // hire through a real Save Now click before capturing (mirrors the
  // dashboard-only save-card contract every other mint mode also uses).
  await page.goto(`/gameplay/campaigns/${campaign.campaignId}`);
  await saveCampaignToServer(page, campaign.campaignId);

  await page.goto(`/gameplay/campaigns/${campaign.campaignId}/personnel`);
  await expect(page.getByTestId('page-title')).toBeVisible({ timeout: 20_000 });
  await assertNoMekStationLoading(page);

  await captureCanonicalizeAndWrite(page, {
    packId: 'personnel-roster',
    genesisSource: 'flow:personnel-hiring@roster-updated',
  });
}

/**
 * experience-pilot: a minimal carrier campaign (satisfies `campaignPackSchema`'s
 * required floor) plus the `standalonePilot` side-channel (design R10 — see
 * this file's header comment).
 */
async function mintExperiencePilot(page: Page): Promise<void> {
  const recorder = new MintRecorder(page);
  const campaign = await createCampaignViaWizard(recorder, page, {
    name: `Mint experience-pilot ${Date.now()}`,
    description: MINT_CAMPAIGN_DESCRIPTION,
  });
  await saveCampaignToServer(page, campaign.campaignId);

  await captureCanonicalizeAndWrite(page, {
    packId: 'experience-pilot',
    genesisSource: 'flow:pilot-xp-progression@xp-surface-viewed',
    extra: {
      standalonePilot: {
        createRequest: {
          mode: 'template',
          template: 'veteran',
          identity: {
            name: 'Scenario Pack Pilot',
            callsign: 'PACK-XP',
            background:
              'Minted by the scenario-pack experience-pilot generator.',
          },
        },
      },
    },
  });
}

// =============================================================================
// capture-matchlog minter mode (task 4.2, W2-gated) — combat-midbattle
// =============================================================================

/**
 * Initiative, Movement, WeaponAttack, PhysicalAttack, Heat, End
 * (`GamePhase` order) — one full cycle == one round. Mirrors
 * `e2e/seam-fresh-construction-no-instant-defeat.spec.ts`'s own
 * `PHASES_PER_ROUND` constant (kept local here rather than imported —
 * spec files are never imported from, matching this file's existing
 * `saveCampaignToServer` duplication rationale above).
 */
const PHASES_PER_ROUND = 6;

/**
 * One full round plus two phases into round 2 — solidly "mid-battle,
 * post-Initiative" (task 4.2) without the anchor spec's own 3-round
 * no-instant-defeat drive (this minter only needs ONE representative
 * mid-battle snapshot, not a stability proof).
 */
const ADVANCES_TO_MID_BATTLE = PHASES_PER_ROUND + 2;

/** Fixed seed mirroring the fresh-construction anchor's own fixture (`SEED = 1337`) — not load-bearing for the pack contract (design D7: matchlog packs assert seed-agnostic invariants only), just grounds the mint in the anchor's own recipe. */
const COMBAT_MIDBATTLE_SEED = 1337;

interface MintUnitGameState {
  readonly side?: string;
  readonly destroyed?: boolean;
}
interface MintGameSession {
  readonly currentState?: {
    readonly units?: Record<string, MintUnitGameState>;
  };
}
interface MintInteractiveSession {
  readonly advancePhase: () => void;
  readonly getSession: () => MintGameSession;
}
interface MintGameplayState {
  readonly interactiveSession?: MintInteractiveSession | null;
}
interface MintZustandStores {
  readonly gameplay?: {
    readonly getState: () => MintGameplayState;
    readonly setState?: (partial: { session?: MintGameSession }) => void;
  };
}

/**
 * Advances the just-launched production `InteractiveSession` by exactly
 * one phase, syncing the store's `session` snapshot so both the DOM and
 * subsequent reads observe the new state. Mirrors
 * `seam-fresh-construction-no-instant-defeat.spec.ts`'s
 * `advanceInteractiveSessionPhaseOnce` — duplicated locally (spec files
 * are never imported from) rather than exported from that anchor file.
 */
async function advanceMintedInteractiveSessionPhaseOnce(
  page: Page,
): Promise<void> {
  await page.evaluate(() => {
    const stores = (
      window as unknown as { __ZUSTAND_STORES__?: MintZustandStores }
    ).__ZUSTAND_STORES__;
    const gameplay = stores?.gameplay;
    const interactiveSession = gameplay?.getState().interactiveSession;
    if (!gameplay || !interactiveSession) {
      throw new Error('Interactive session not available on gameplay store');
    }
    interactiveSession.advancePhase();
    gameplay.setState?.({ session: interactiveSession.getSession() });
  });
}

/** Distinct per-instance unit identities under a `data-testid` prefix, counted by DISTINCT id suffix (mirrors the anchor's own `countDistinctTestIdSuffixes`). */
async function countMintedDistinctTestIdSuffixes(
  page: Page,
  prefix: string,
): Promise<number> {
  const testIds = await page
    .locator(`[data-testid^="${prefix}"]`)
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-testid') ?? ''),
    );
  const suffixes = new Set(
    testIds
      .filter((testId) => testId.startsWith(prefix))
      .map((testId) => testId.slice(prefix.length)),
  );
  return suffixes.size;
}

function matchIdFromGameUrl(page: Page): string {
  const match = page.url().match(/\/gameplay\/games\/([^/?#]+)/);
  if (!match) {
    throw new Error(
      `mint-scenario-pack: could not read match id from ${page.url()}`,
    );
  }
  return decodeURIComponent(match[1]);
}

/**
 * Backfills, then captures, the REAL IndexedDB `mekstation-match-log`
 * event stream (BOTH stores — `matchEvents` + `matches`) for `matchId`.
 *
 * **The backfill (verified, load-bearing):** a bare
 * `InteractiveSession.advancePhase()` call — the exact drive this
 * minter's `advanceMintedInteractiveSessionPhaseOnce` and the anchor
 * spec's own `advanceInteractiveSessionPhaseOnce` both use — mutates the
 * LIVE in-memory session (`context.setSession`,
 * `InteractiveSession.ts`'s `createRuntimeContext`) but does NOT call
 * `appendAndPersistInteractiveSessionEvent`
 * (`InteractiveSession.sessionEvents.ts`) for the events it generates
 * (`InitiativeRolled`/`PhaseChanged`/etc.) — only discrete commands that
 * explicitly route through that helper (AI-turn actions via
 * `runInteractiveSessionAI`, `ejectInteractiveSessionUnit`, the public
 * `appendEvent` method) persist incrementally. `usePreBattleLaunch.ts`'s
 * `persistInteractiveLaunchRecoveryLog` persists only the initial
 * `GameCreated`/`GameStarted` pair at launch. Confirmed by the jest
 * fixtures that drive phase advances + declared actions and then
 * EXPLICITLY persist the full `session.events` array afterward
 * (`useGameplayStore.recover.test.ts`'s `persistSessionLog`,
 * `fixBattlePhaseProgression.phaseAdvance.test.tsx`'s
 * `persistSessionLog`) — the SAME pattern this function follows, just
 * inside the browser realm via a raw IndexedDB `put` (the shared
 * `matchLogStorage` service is not exposed on
 * `window.__ZUSTAND_STORES__`, so this minter — NOT the loader —
 * re-creates its write shape directly, matching
 * `e2e/helpers/matchLogSeeding.ts`'s `seedMatchLog` transaction
 * structure). Without this backfill, the capture would carry only the 2
 * launch-time events regardless of how many phases were advanced — never
 * "mid-battle, post-Initiative" (task 4.2).
 *
 * The write and the read happen inside ONE `readwrite` transaction so the
 * cursor read observes the just-written events (IndexedDB serializes
 * requests on a transaction in request order — read-your-writes within a
 * single transaction).
 *
 * `loadEncounterPack` itself contains no `indexedDB.open` of its own
 * (task 4.1's acceptance) — this function is minter tooling, not that
 * file.
 *
 * The `matches` row's own `matchId` field is deliberately dropped from
 * the returned `matchesRow` (kept ONLY as the top-level `matchId` the
 * encounter pack schema expects) — leaving it in would plant an
 * un-remapped occurrence of the original id inside `matchesRow`, which
 * `packStamping.ts`'s zero-residue scan (design D4.3) would then
 * correctly trip at LOAD time (the stamper only remaps `matchId` +
 * every event's `gameId`, never `matchesRow` fields).
 */
async function backfillAndCaptureMatchLogFromIndexedDb(
  page: Page,
  matchId: string,
): Promise<{
  events: readonly Record<string, unknown>[];
  matchesRow?: Record<string, unknown>;
}> {
  const result = await page.evaluate(
    async ({
      dbName,
      dbVersion,
      eventStoreName,
      matchStoreName,
      matchId: id,
    }) => {
      function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
      function transactionToPromise(
        transaction: IDBTransaction,
      ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      }

      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            gameplay?: {
              getState: () => {
                interactiveSession?: {
                  getSession: () => {
                    events: readonly Record<string, unknown>[];
                  };
                } | null;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;
      const interactiveSession =
        stores?.gameplay?.getState().interactiveSession;
      if (!interactiveSession) {
        throw new Error(
          'backfillAndCaptureMatchLogFromIndexedDb: interactive session not available on gameplay store',
        );
      }
      const liveEvents = interactiveSession.getSession().events;
      const savedAt = new Date().toISOString();

      const openRequest = indexedDB.open(dbName, dbVersion);
      const db = await requestToPromise(openRequest);
      const tx = db.transaction([eventStoreName, matchStoreName], 'readwrite');
      const eventStore = tx.objectStore(eventStoreName);
      const matchStore = tx.objectStore(matchStoreName);

      // The backfill — see this function's header comment.
      for (const event of liveEvents) {
        eventStore.put({
          matchId: id,
          sequence: (event as { sequence: number }).sequence,
          event,
          savedAt,
        });
      }

      const events: Record<string, unknown>[] = [];
      const range = IDBKeyRange.bound(
        [id, Number.NEGATIVE_INFINITY],
        [id, Number.POSITIVE_INFINITY],
      );
      await new Promise<void>((resolve, reject) => {
        const cursorRequest = eventStore.openCursor(range);
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            resolve();
            return;
          }
          const record = cursor.value as { event: Record<string, unknown> };
          events.push(record.event);
          cursor.continue();
        };
        cursorRequest.onerror = () => reject(cursorRequest.error);
      });

      const matchRow = (await requestToPromise(matchStore.get(id))) as
        | Record<string, unknown>
        | undefined;

      await transactionToPromise(tx);
      db.close();

      return { events, matchRow: matchRow ?? null };
    },
    {
      dbName: MATCH_LOG_DB_NAME,
      dbVersion: MATCH_LOG_DB_VERSION,
      eventStoreName: MATCH_LOG_STORES.MATCH_EVENTS,
      matchStoreName: MATCH_LOG_STORES.MATCHES,
      matchId,
    },
  );

  if (!result.matchRow) {
    return { events: result.events };
  }
  // Drop `matchId` — see this function's header comment.
  const { matchId: _capturedMatchId, ...matchesRow } = result.matchRow;
  return { events: result.events, matchesRow };
}

/**
 * Captures + validates + canonicalizes + writes an encounter (matchlog)
 * pack — the encounter-side twin of `captureCanonicalizeAndWrite` above.
 * Fail-loud on the RAW capture before canonicalizing (a malformed capture
 * must never silently become a malformed committed pack), then
 * round-trip-validates the canonicalized output (task 4.2 acceptance:
 * "the capture is canonicalized... a re-capture run passes the matchlog
 * schema + pin").
 */
async function captureMatchlogCanonicalizeAndWrite(
  page: Page,
  matchId: string,
  packId: string,
  genesisSource: string,
): Promise<void> {
  const { events, matchesRow } = await backfillAndCaptureMatchLogFromIndexedDb(
    page,
    matchId,
  );
  const raw: unknown = {
    matchId,
    events,
    ...(matchesRow ? { matchesRow } : {}),
  };
  const captured: EncounterPackPayload = encounterPackSchema.parse(raw);

  const { payload: canonicalized } = canonicalizePackPayload(captured, {
    packId,
  });

  // Round-trip validation (task 4.2 acceptance).
  encounterPackSchema.parse(canonicalized);

  const payloadDir = path.join(REPO_ROOT, 'e2e', 'scenario-packs', 'encounter');
  fs.mkdirSync(payloadDir, { recursive: true });
  const payloadPath = path.join(payloadDir, `${packId}.matchlog.json`);
  fs.writeFileSync(
    payloadPath,
    `${JSON.stringify(canonicalized, null, 2)}\n`,
    'utf8',
  );

  const baseCommit = execSync('git rev-parse HEAD', { cwd: REPO_ROOT })
    .toString()
    .trim();
  const provenance = {
    genesisSource,
    mintedAt: new Date().toISOString(),
    baseCommit,
  };
  const provenancePath = path.join(payloadDir, `${packId}.provenance.json`);
  fs.writeFileSync(
    provenancePath,
    `${JSON.stringify(provenance, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `[mint-scenario-pack] wrote ${path.relative(REPO_ROOT, payloadPath)}`,
  );
  console.log(`[mint-scenario-pack] provenance: ${JSON.stringify(provenance)}`);
}

/**
 * combat-midbattle: captured from the fresh-construction anchor's own
 * recipe (`createUniqueSeamCampaignWithMirroredRoster` -> accept contract
 * -> launch briefing -> select ALL -> launch to pre-battle -> seeded
 * interactive launch), driven `ADVANCES_TO_MID_BATTLE` phases past
 * Initiative, then captured live from IndexedDB (never synthesized).
 */
async function mintCombatMidbattle(page: Page): Promise<void> {
  page.on('dialog', (dialog) => dialog.accept());

  const campaign = await createUniqueSeamCampaignWithMirroredRoster(page, {
    namePrefix: 'Mint combat-midbattle',
  });
  await openSeamMissionLaunchBriefing(page, campaign.campaignId);
  const selectedUnitCount = await selectAllRosterUnits(page);
  const launch = await launchSelectedRosterToPreBattle(page);

  await page.goto(
    `/gameplay/encounters/${encodeURIComponent(launch.encounterId)}/pre-battle?seed=${COMBAT_MIDBATTLE_SEED}`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  );
  await expect(page.getByTestId('pre-battle-page')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('play-manually-btn')).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId('play-manually-btn').click();

  await page.waitForURL(/\/gameplay\/games\/[^/?]+/, { timeout: 30_000 });
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('tactical-turn-rail')).toBeVisible({
    timeout: 20_000,
  });

  const expectedUnitIdentities = selectedUnitCount * 2;
  await expect
    .poll(() => countMintedDistinctTestIdSuffixes(page, 'unit-token-'), {
      timeout: 20_000,
      message: 'waiting for every unit token to mount on the battle map',
    })
    .toBe(expectedUnitIdentities);

  for (let advance = 0; advance < ADVANCES_TO_MID_BATTLE; advance += 1) {
    await advanceMintedInteractiveSessionPhaseOnce(page);
  }

  const matchId = matchIdFromGameUrl(page);
  await captureMatchlogCanonicalizeAndWrite(
    page,
    matchId,
    'combat-midbattle',
    'anchor:seam-fresh-construction-no-instant-defeat',
  );
}

const MINT_MODES: Record<string, (page: Page) => Promise<void>> = {
  'navigation-briefing': mintNavigationBriefing,
  'personnel-roster': mintPersonnelRoster,
  'experience-pilot': mintExperiencePilot,
  'combat-midbattle': mintCombatMidbattle,
};

// =============================================================================
// Test entry — one test per registered mint mode, env-selected
// =============================================================================

test.describe('scenario pack minting', () => {
  for (const packId of Object.keys(MINT_MODES)) {
    test(`mint ${packId}`, async ({ page }) => {
      test.skip(
        MINT_PACK_ID !== packId,
        `MEKSTATION_MINT_PACK_ID=${MINT_PACK_ID ?? ''} selected; skipping mint of ${packId}`,
      );
      test.setTimeout(180_000);
      await MINT_MODES[packId](page);
    });
  }
});
