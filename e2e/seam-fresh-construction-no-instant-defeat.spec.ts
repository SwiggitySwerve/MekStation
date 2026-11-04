/**
 * Fresh Construction No-Instant-Defeat Trust Anchor — seam (c)
 *
 * `add-seam-trust-anchor-journeys` W2 group 4. Materializes ONE fresh NvN
 * encounter (design D3) whose player force fields >=2 units sharing one
 * canonical `unitRef`, then launches it from the pre-battle route with an
 * explicit `?seed=1337` query param TWICE — two independent page loads of
 * the SAME encounter — and hard-asserts, at the route-mounted layer, the
 * `campaign-combat-loop` "Launched Campaign Sessions Start Battle-Ready"
 * invariants: no id collapse on construction, no unjustified terminal
 * outcome while advancing through Initiative and further rounds, and
 * run-to-run-equal outcome markers between the two same-seed launches.
 *
 * W1 dependency (hard gate, task 4.0): `?seed=N` threading
 * (`IGameConfig.seed`, `pre-battle.tsx`'s `parseSeedOverride`,
 * `InteractiveSession.fromSessionAsync`'s recovery re-seed) only exists
 * once `add-sp-combat-determinism` (W1) has landed. This file must not be
 * added to the tree unless that gate passes.
 *
 * Mirrored-ref guarantee (design D3):
 * `createUniqueSeamCampaignWithMirroredRoster` (`e2e/helpers/seamCampaign.ts`)
 * explicitly clicks one wizard `add-unit-*` template button twice, so the
 * player roster fields exactly 2 units sharing one canonical `unitRef`
 * under this journey's own control — deliberately NOT via
 * `createCampaignViaWizard`'s generic round-robin roster step, whose
 * wraparound duplicate (once `rosterSize` exceeds the wizard's 4
 * templates) would exceed the mission-readiness launch cap
 * (`DEFAULT_MAX_UNITS = 4`, `missionReadinessProjection.ts`) and could
 * never be fully SELECTED for launch. The seeded OpFor mirrors the
 * player roster's SIZE only, never its composition
 * (`selectOpponentUnits`, `materializeCampaignMissionEncounter.ts:339-342`).
 *
 * Assertion doctrine (design D5): hard blocking assertions only, counted
 * by distinct unit ids (never DOM node totals), run-to-run equality
 * between the two same-seed launches (never a pinned literal outcome).
 *
 * Relaunch-navigation gotcha (task 4.1): the second same-seed load
 * navigates away from an active interactive battle —
 * `useGameSessionLifecycle` registers a `beforeunload` handler for active
 * battles (`GameSessionPage.lifecycle.ts`) that can hang the `goto` on the
 * unload confirmation dialog. Handled here exactly like
 * `e2e/active-session-recovery.spec.ts`: `page.on('dialog', ...)`
 * registered once, before any navigation.
 *
 * @tags @game @campaign @seam
 */

import { test, expect, type Page } from '@playwright/test';

import {
  createSeamMaterializedRowTracker,
  createUniqueSeamCampaignWithMirroredRoster,
  deleteSeamMaterializedRows,
  launchSelectedRosterToPreBattle,
  openSeamMissionLaunchBriefing,
  selectAllRosterUnits,
  type SeamMaterializedRowIds,
} from './helpers/seamCampaign';

test.setTimeout(180_000);

const SEED = 1337;

// `createUniqueSeamCampaignWithMirroredRoster` clicks one wizard
// `add-unit-*` template twice, guaranteeing exactly 2 roster units share
// one canonical `unitRef` (design D3) — the minimum needed to exercise
// the per-instance id path, and small enough to stay well inside the
// mission-readiness launch cap (`DEFAULT_MAX_UNITS = 4`,
// `missionReadinessProjection.ts`; a 5-unit roster could never be fully
// SELECTED for launch, so a wraparound-duplicate roster can never reach
// battle — see `addMirroredCanonicalRefRosterUnits`'s doc comment).
const MIRRORED_ROSTER_SIZE = 2;

// Initiative, Movement, WeaponAttack, PhysicalAttack, Heat, End
// (`GamePhase` order, `GameSessionCoreTypes.ts`). One full cycle == one
// round; `turn` increments only on the End -> Initiative rollover
// (`advancePhase`, `gameSessionCore.ts`).
const PHASES_PER_ROUND = 6;
// The initial round (already sitting in Initiative on session creation)
// plus >=2 further rounds (spec scenario "Initiative advance does not
// instant-defeat").
const ROUNDS_TO_DRIVE = 3;
const TOTAL_PHASE_ADVANCES = PHASES_PER_ROUND * ROUNDS_TO_DRIVE;

// Minimal local shapes for the API responses this anchor cross-checks and
// the exposed gameplay store this anchor drives — mirrors the established
// e2e convention of never importing product `@/types` into spec files
// (see `e2e/active-session-recovery.spec.ts`, `e2e/campaign-flow.spec.ts`);
// only the fields actually read/asserted are declared.
interface ForceReferenceShape {
  readonly forceId: string;
}

interface EncounterGetResponse {
  readonly encounter: {
    readonly playerForce?: ForceReferenceShape | null;
    readonly opponentForce?: ForceReferenceShape | null;
  };
}

interface ExposedUnitGameState {
  readonly side?: string;
  readonly destroyed?: boolean;
}

interface ExposedGameSession {
  readonly events?: readonly { readonly type?: string }[];
  readonly currentState?: {
    readonly phase?: string;
    readonly status?: string;
    readonly turn?: number;
    readonly units?: Record<string, ExposedUnitGameState>;
  };
}

interface ExposedInteractiveSession {
  readonly advancePhase: () => void;
  readonly getSession: () => ExposedGameSession;
}

interface ExposedGameplayState {
  readonly session?: ExposedGameSession | null;
  readonly interactiveSession?: ExposedInteractiveSession | null;
  readonly checkGameOver?: () => boolean;
}

interface ExposedGameplayStore {
  readonly getState: () => ExposedGameplayState;
  readonly setState?: (partial: { session?: ExposedGameSession }) => void;
}

interface ExposedZustandStores {
  readonly gameplay?: ExposedGameplayStore;
}

/** Per-side count of units still in the fight (not destroyed). */
interface AliveBySide {
  readonly player: number;
  readonly opponent: number;
}

/** Full diagnostic snapshot read after each phase advance. */
interface GameplaySnapshot {
  readonly turn: number | undefined;
  readonly phase: string | undefined;
  readonly status: string | undefined;
  readonly eventTypes: readonly string[];
  readonly aliveBySide: AliveBySide;
}

/**
 * The subset of a snapshot compared for run-to-run equality (spec
 * scenario "Same seed twice yields equal outcome markers": "phase,
 * status, alive-unit counts per side"). `turn` is included too — it is
 * still equality-only (never a pinned literal), and strengthens the
 * anchor's ability to catch a divergence that reorders phase/round
 * bookkeeping between the two same-seed runs.
 */
interface RoundMarker {
  readonly turn: number | undefined;
  readonly phase: string | undefined;
  readonly status: string | undefined;
  readonly aliveBySide: AliveBySide;
}

const tracker: SeamMaterializedRowIds = createSeamMaterializedRowTracker();

// Runs once after the whole file (not afterEach): page/context fixtures
// are unavailable in `afterAll` on Playwright 1.57, so cleanup goes
// through a standalone `APIRequestContext` — same discipline as
// `e2e/campaign-flow.spec.ts:637-658` / `e2e/seam-roster-materialization-handoff.spec.ts`.
// Materializing ONCE and launching twice (design D3) means exactly one
// campaign, one encounter, and two forces need teardown here — the two
// same-seed launches create no additional server-persisted rows.
test.afterAll(async ({}, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? 'http://localhost:3600';
  await deleteSeamMaterializedRows(tracker, baseURL);
});

/**
 * Distinct per-instance unit identities rendered under a `data-testid`
 * prefix, counted by the DISTINCT id suffix rather than DOM node totals
 * (spec scenario "Seeded launch constructs a full battle with distinct
 * unit identities" explicitly forbids the latter — the #1019 collapse
 * signature is N-not-2N, not a raw node count).
 */
async function countDistinctTestIdSuffixes(
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

/**
 * Navigate to the pre-battle route for `encounterId` carrying the fixed
 * `?seed=1337` override, launch interactive mode (`play-manually-btn`),
 * and hard-assert the mounted battle exposes exactly `expectedIdentities`
 * distinct per-instance unit ids on BOTH the hex map (`unit-token-${id}`)
 * and the turn rail (`rail-unit-${id}`) — a real route-mounted `?seed=N`
 * pre-battle mount and a real launch click, never store injection past
 * this seam (design D5).
 */
async function launchSeededInteractiveBattle(
  page: Page,
  encounterId: string,
  expectedIdentities: number,
): Promise<void> {
  await page.goto(
    `/gameplay/encounters/${encodeURIComponent(encounterId)}/pre-battle?seed=${SEED}`,
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

  await expect
    .poll(() => countDistinctTestIdSuffixes(page, 'unit-token-'), {
      timeout: 20_000,
      message: 'waiting for every unit token to mount on the battle map',
    })
    .toBe(expectedIdentities);
  const railIdentityCount = await countDistinctTestIdSuffixes(
    page,
    'rail-unit-',
  );
  expect(
    railIdentityCount,
    'tactical turn rail did not expose the full 2N per-instance roster',
  ).toBe(expectedIdentities);
}

/**
 * Advance the SAME production `InteractiveSession` the live launch just
 * created by exactly one phase, then sync the store's `session` snapshot
 * so both the DOM and subsequent `page.evaluate` reads observe the new
 * state. Mirrors the established direct-drive pattern in
 * `e2e/encounter-combat-continuity.spec.ts`'s `advanceSessionPhase` —
 * calling the real `InteractiveSession.advancePhase()` bypasses no seam
 * (the session was constructed via the real launch click); it only
 * avoids simulating per-unit movement/attack declarations no unit ever
 * makes in this anchor, exactly like the #1019 regression jest's single
 * `advancePhase()` call, run repeatedly here to cover >=2 further rounds.
 */
async function advanceInteractiveSessionPhaseOnce(page: Page): Promise<void> {
  await page.evaluate(() => {
    const stores = (
      window as unknown as { __ZUSTAND_STORES__?: ExposedZustandStores }
    ).__ZUSTAND_STORES__;
    const gameplay = stores?.gameplay;
    const interactiveSession = gameplay?.getState().interactiveSession;
    if (!gameplay || !interactiveSession) {
      throw new Error('Interactive session not available on gameplay store');
    }
    interactiveSession.advancePhase();
    gameplay.setState?.({ session: interactiveSession.getSession() });
    gameplay.getState().checkGameOver?.();
  });
}

/** Read the current gameplay-store snapshot this anchor asserts against. */
async function readGameplaySnapshot(page: Page): Promise<GameplaySnapshot> {
  return page.evaluate(() => {
    const stores = (
      window as unknown as { __ZUSTAND_STORES__?: ExposedZustandStores }
    ).__ZUSTAND_STORES__;
    const session = stores?.gameplay?.getState().session;
    const units = Object.values(session?.currentState?.units ?? {});
    const aliveBySide = { player: 0, opponent: 0 };
    for (const unit of units) {
      if (unit.destroyed) continue;
      if (unit.side === 'player') aliveBySide.player += 1;
      if (unit.side === 'opponent') aliveBySide.opponent += 1;
    }
    return {
      turn: session?.currentState?.turn,
      phase: session?.currentState?.phase,
      status: session?.currentState?.status,
      eventTypes: (session?.events ?? []).map((event) => event.type ?? ''),
      aliveBySide,
    };
  });
}

/**
 * Drive `TOTAL_PHASE_ADVANCES` phase advances on the currently-mounted
 * battle, hard-asserting after EVERY advance (spec scenario "Initiative
 * advance does not instant-defeat"): no terminal outcome is presented
 * (neither the store status nor the `game-completed` DOM surface), no
 * `game_ended` event was manufactured, and both sides retain >=1 alive
 * unit. Returns the per-advance `RoundMarker` sequence for the run-to-run
 * equality check (spec scenario "Same seed twice yields equal outcome
 * markers").
 */
async function driveAdvancesAndCaptureMarkers(
  page: Page,
): Promise<readonly RoundMarker[]> {
  const markers: RoundMarker[] = [];
  for (
    let advanceIndex = 0;
    advanceIndex < TOTAL_PHASE_ADVANCES;
    advanceIndex += 1
  ) {
    await advanceInteractiveSessionPhaseOnce(page);
    const snapshot = await readGameplaySnapshot(page);
    const diagnostic = `advance ${advanceIndex + 1}/${TOTAL_PHASE_ADVANCES}: ${JSON.stringify(snapshot)}`;

    expect(snapshot.status, `unjustified completion — ${diagnostic}`).not.toBe(
      'completed',
    );
    expect(
      snapshot.eventTypes,
      `unjustified game_ended event — ${diagnostic}`,
    ).not.toContain('game_ended');
    expect(
      await page.getByTestId('game-completed').count(),
      `game-completed surface presented — ${diagnostic}`,
    ).toBe(0);
    expect(
      snapshot.aliveBySide.player,
      `player side lost all units — ${diagnostic}`,
    ).toBeGreaterThanOrEqual(1);
    expect(
      snapshot.aliveBySide.opponent,
      `opponent side lost all units — ${diagnostic}`,
    ).toBeGreaterThanOrEqual(1);

    markers.push({
      turn: snapshot.turn,
      phase: snapshot.phase,
      status: snapshot.status,
      aliveBySide: snapshot.aliveBySide,
    });
  }
  return markers;
}

test.describe('Fresh Construction No-Instant-Defeat Trust Anchor', () => {
  test('seeded construction yields distinct identities, no instant defeat, and same-seed marker equality', async ({
    page,
  }) => {
    // Relaunch-navigation gotcha (task 4.1): the second same-seed load
    // navigates away from an active interactive battle, which trips
    // `useGameSessionLifecycle`'s `beforeunload` warning. Registered once,
    // before any navigation — precedent: `e2e/active-session-recovery.spec.ts`.
    page.on('dialog', (dialog) => dialog.accept());

    // --- Materialize ONCE: wizard (mirrored roster) -> contract -> briefing -> select ALL -> launch to pre-battle ---
    const campaign = await createUniqueSeamCampaignWithMirroredRoster(page);
    tracker.campaignIds.add(campaign.campaignId);

    await openSeamMissionLaunchBriefing(page, campaign.campaignId);

    const selectedUnitCount = await selectAllRosterUnits(page);
    expect(
      selectedUnitCount,
      'expected the full mirrored-ref roster to be ready and selectable',
    ).toBe(MIRRORED_ROSTER_SIZE);

    const launch = await launchSelectedRosterToPreBattle(page);
    tracker.encounterIds.add(launch.encounterId);

    // Resolve the materialized force ids for cleanup as early as possible,
    // mirroring `e2e/seam-roster-materialization-handoff.spec.ts` — a
    // failure below still leaves both forces tracked.
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
    if (playerForceId) tracker.forceIds.add(playerForceId);
    if (opponentForceId) tracker.forceIds.add(opponentForceId);

    // OpFor selection mirrors the player roster's SIZE only
    // (`selectOpponentUnits({ count: rosterUnits.length, ... })`), so the
    // mounted battle carries exactly 2N per-instance unit identities.
    const expectedUnitIdentities = selectedUnitCount * 2;

    // --- Seeded launch #1: independent page load of the pre-battle route with ?seed=1337 ---
    // (spec scenario "Seeded launch constructs a full battle with distinct unit identities")
    await launchSeededInteractiveBattle(
      page,
      launch.encounterId,
      expectedUnitIdentities,
    );
    const firstRunMarkers = await driveAdvancesAndCaptureMarkers(page);

    // --- Seeded launch #2: a SECOND independent page load of the SAME encounter, same seed ---
    // (spec scenario "Same seed twice yields equal outcome markers")
    await launchSeededInteractiveBattle(
      page,
      launch.encounterId,
      expectedUnitIdentities,
    );
    const secondRunMarkers = await driveAdvancesAndCaptureMarkers(page);

    // Run-to-run equality only — never a pinned literal value (design D5).
    expect(secondRunMarkers).toEqual(firstRunMarkers);
  });
});
