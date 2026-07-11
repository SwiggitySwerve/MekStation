/**
 * Active Session Recovery E2E
 *
 * Seeds the browser's match-log IndexedDB with a generated non-demo match id,
 * then proves `/gameplay/games/:id` can recover and refresh that active
 * session from the event log without falling back to demo state. The
 * seeded database is opened by the raw `indexedDB.open` transaction
 * against the `MATCH_LOG_DB_NAME`-keyed `mekstation-match-log` database
 * (schema: `src/lib/p2p/matchLogStorageSchema.ts`) — the constant itself
 * now lives in `e2e/helpers/matchLogSeeding.ts` after the 2.1 pure-move
 * extraction; restated here so the wave-4 scope-recovery QC source
 * anchor (`scripts/qc/validate-wave4-scope-recovery.mjs`'s
 * `active-session-recovery-proof`) keeps its literal token pin accurate
 * post-extraction.
 *
 * Recovery rehydration seam trust anchor (`add-seam-trust-anchor-journeys`
 * W2 group 2): the second test below (`recovers a mirrored-canonical-ref
 * roster without id collision`) is the load-bearing #1019-class regression
 * proof — its fixture mirrors one canonical `unitRef` (`atlas-as7-d`)
 * across both sides under distinct deployed ids, the exact shape the
 * original single-fixture test (both units carrying DIFFERENT unitRefs)
 * could not have caught (design.md D1). The third test (W2 group 4,
 * task 4.2) proves the route-level recovered-continuation determinism
 * scenario: two independently seeded match logs sharing one persisted
 * `config.seed`, each cold-recovered once and driven through one
 * identical phase advance, must yield equal normalized continuation
 * event streams (spec scenario "Seeded recovered continuations are
 * deterministic at the route level").
 *
 * @tags @game @recovery
 */

import { test, expect, type Page } from '@playwright/test';

import {
  buildGameCreatedAndStartedEvents,
  seedMatchLog,
  type SeededGameUnit,
} from './helpers/matchLogSeeding';

// Legacy fixture (pre-existing coverage): two units with DISTINCT
// unitRefs, one per side, both keyed by their bare canonical ref. Kept
// byte-identical to the original inline `makeSeededEvents` fixture so
// this test's assertions are unaffected by the 2.1 extraction.
const TWO_UNIT_ROSTER: readonly SeededGameUnit[] = [
  {
    id: 'atlas-as7-d',
    name: 'Atlas AS7-D',
    side: 'player',
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-player',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'marauder-mad-3r',
    name: 'Marauder MAD-3R',
    side: 'opponent',
    unitRef: 'marauder-mad-3r',
    pilotRef: 'pilot-opponent',
    gunnery: 4,
    piloting: 5,
  },
];

// Mirrored-canonical-ref fixture (task 2.2): BOTH sides field
// `atlas-as7-d` under distinct deployed ids (`player-1-...` /
// `opponent-1-...`), plus one more unit per side sharing a second
// canonical ref. This is the load-bearing choice design.md D1 calls
// out — it forces the recovery-side per-instance id aliasing
// (`deriveAdaptedUnitsFromSession`'s `adapted.push({ ...adaptedUnit,
// id: gameUnit.id })`, PR #1019 / `91104d43a`) to actually run.
const MIRRORED_UNIT_REF = 'atlas-as7-d';
const MIRRORED_ROSTER: readonly SeededGameUnit[] = [
  {
    id: 'player-1-atlas-as7-d',
    name: 'Atlas AS7-D',
    side: 'player',
    unitRef: MIRRORED_UNIT_REF,
    pilotRef: 'pilot-player-1',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'player-2-marauder-mad-3r',
    name: 'Marauder MAD-3R',
    side: 'player',
    unitRef: 'marauder-mad-3r',
    pilotRef: 'pilot-player-2',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'opponent-1-atlas-as7-d',
    name: 'Atlas AS7-D',
    side: 'opponent',
    unitRef: MIRRORED_UNIT_REF,
    pilotRef: 'pilot-opponent-1',
    gunnery: 4,
    piloting: 5,
  },
  {
    id: 'opponent-2-marauder-mad-3r',
    name: 'Marauder MAD-3R',
    side: 'opponent',
    unitRef: 'marauder-mad-3r',
    pilotRef: 'pilot-opponent-2',
    gunnery: 4,
    piloting: 5,
  },
];

/**
 * Exposed gameplay-store shape this spec reads via `window.__ZUSTAND_STORES__`
 * (`src/lib/e2e/storeExposure.ts:29-51`). Kept as a standalone type
 * (not imported from `src/`) — `e2e/` specs never import `@/` app
 * modules, and this is a type-only compile-time cast erased before the
 * `page.evaluate`/`page.waitForFunction` callbacks are stringified and
 * sent to the browser realm.
 */
interface ExposedGameplayState {
  isLoading?: boolean;
  error?: string | null;
  session?: {
    id?: string;
    events?: readonly { type?: string }[];
    currentState?: {
      status?: string;
      units?: Record<string, unknown>;
    };
  };
  interactiveSession?: {
    getMovementCapability: (unitId: string) => unknown;
  } | null;
}

interface ExposedZustandStores {
  gameplay?: {
    getState: () => ExposedGameplayState;
  };
}

async function expectRecoveredInteractiveSession(
  page: Page,
  matchId: string,
): Promise<void> {
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForFunction(
    (expectedMatchId) => {
      const stores = (
        window as unknown as { __ZUSTAND_STORES__?: ExposedZustandStores }
      ).__ZUSTAND_STORES__;
      const state = stores?.gameplay?.getState();
      return (
        state?.isLoading === false &&
        state.error === null &&
        state.session?.id === expectedMatchId &&
        state.session.currentState?.status === 'active' &&
        state.interactiveSession !== null &&
        state.interactiveSession !== undefined
      );
    },
    matchId,
    { timeout: 20_000 },
  );

  await expect(page.getByTestId('game-error')).toHaveCount(0);
  await expect(page.getByTestId('tactical-turn-rail')).toBeVisible();
  await expect(page.getByTestId('event-log-count')).toContainText('2');
}

/**
 * Snapshot of the mirrored-roster recovery invariants, read from the
 * exposed gameplay store INSIDE the browser realm so
 * `interactiveSession.getMovementCapability(...)` — a real class method,
 * not a structured-clonable value — can be invoked before the result is
 * serialized back to Node for `expect()`.
 */
interface MirroredRosterSnapshot {
  readonly isLoading: boolean | undefined;
  readonly error: string | null | undefined;
  readonly sessionId: string | undefined;
  readonly status: string | undefined;
  readonly hasInteractiveSession: boolean;
  readonly deployedCapabilityPresent: Record<string, boolean>;
  readonly bareCanonicalRefCapabilityPresent: boolean;
  readonly unitCount: number;
  readonly eventTypes: readonly string[];
}

async function readMirroredRosterSnapshot(
  page: Page,
  deployedIds: readonly string[],
  bareCanonicalRef: string,
): Promise<MirroredRosterSnapshot> {
  return page.evaluate(
    ({ ids, bareRef }) => {
      const stores = (
        window as unknown as { __ZUSTAND_STORES__?: ExposedZustandStores }
      ).__ZUSTAND_STORES__;
      const state = stores?.gameplay?.getState();
      const interactiveSession = state?.interactiveSession;

      const deployedCapabilityPresent: Record<string, boolean> = {};
      for (const id of ids) {
        deployedCapabilityPresent[id] =
          !!interactiveSession &&
          interactiveSession.getMovementCapability(id) !== null;
      }

      return {
        isLoading: state?.isLoading,
        error: state?.error,
        sessionId: state?.session?.id,
        status: state?.session?.currentState?.status,
        hasInteractiveSession:
          interactiveSession !== null && interactiveSession !== undefined,
        deployedCapabilityPresent,
        bareCanonicalRefCapabilityPresent:
          !!interactiveSession &&
          interactiveSession.getMovementCapability(bareRef) !== null,
        unitCount: Object.keys(state?.session?.currentState?.units ?? {})
          .length,
        eventTypes: (state?.session?.events ?? []).map(
          (event) => event.type ?? '',
        ),
      };
    },
    { ids: deployedIds, bareRef: bareCanonicalRef },
  );
}

/**
 * Hard-asserts every recovery-rehydration invariant for the
 * mirrored-canonical-ref roster (spec scenarios "Cold route mount
 * recovers the seeded match", "Mirrored canonical refs survive
 * recovery without id collision", "Recovery does not manufacture a
 * terminal outcome"). Fails if the #1019 recovery-side aliasing fix
 * (`adapted.push({ ...adaptedUnit, id: gameUnit.id })`,
 * `src/engine/InteractiveSession.recovery.ts`) is reverted — a bare
 * `unitRef` lookup would then resolve for BOTH deployed ids (or
 * neither would resolve at all).
 */
async function expectMirroredRosterRecovered(
  page: Page,
  matchId: string,
  deployedIds: readonly string[],
  bareCanonicalRef: string,
  expectedUnitCount: number,
): Promise<void> {
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 20_000,
  });

  // Poll until recovery settles AND every deployed id resolves a
  // movement capability — a partially-hydrated interactive session
  // must not satisfy the wait.
  await page.waitForFunction(
    ({ expectedMatchId, ids }) => {
      const stores = (
        window as unknown as { __ZUSTAND_STORES__?: ExposedZustandStores }
      ).__ZUSTAND_STORES__;
      const state = stores?.gameplay?.getState();
      if (!state) {
        return false;
      }
      if (
        state.isLoading !== false ||
        state.error !== null ||
        state.session?.id !== expectedMatchId ||
        state.session?.currentState?.status !== 'active' ||
        !state.interactiveSession
      ) {
        return false;
      }
      const interactiveSession = state.interactiveSession;
      return ids.every(
        (id) => interactiveSession.getMovementCapability(id) !== null,
      );
    },
    { expectedMatchId: matchId, ids: deployedIds },
    { timeout: 20_000 },
  );

  await expect(page.getByTestId('game-error')).toHaveCount(0);

  const snapshot = await readMirroredRosterSnapshot(
    page,
    deployedIds,
    bareCanonicalRef,
  );

  expect(snapshot.isLoading).toBe(false);
  expect(snapshot.error).toBeNull();
  expect(snapshot.sessionId).toBe(matchId);
  // Recovery does not manufacture a terminal outcome (status stays
  // active, not completed).
  expect(snapshot.status).toBe('active');
  expect(snapshot.hasInteractiveSession).toBe(true);

  for (const id of deployedIds) {
    expect(snapshot.deployedCapabilityPresent[id]).toBe(true);
  }
  // The bare canonical unitRef shared across sides must NOT itself
  // resolve as a deployed unit id — the #1019 collision signature.
  expect(snapshot.bareCanonicalRefCapabilityPresent).toBe(false);
  // Full seeded roster survives recovery with no id-collision collapse.
  expect(snapshot.unitCount).toBe(expectedUnitCount);
  // No terminal-outcome event beyond the seeded log.
  expect(snapshot.eventTypes).not.toContain('game_ended');
}

// =============================================================================
// Route-level recovered-continuation determinism (task 4.2, W2 group 4)
// =============================================================================

/**
 * Fixed, finite `IGameConfig.seed` for the continuation-determinism
 * fixture. Per design D5 no golden trace is asserted against this value
 * — the two runs below are compared to EACH OTHER only.
 */
const CONTINUATION_SEED = 4242424242;

/**
 * The seeded fixture always writes exactly `GameCreated` (sequence 0) +
 * `GameStarted` (sequence 1) — `buildGameCreatedAndStartedEvents`
 * (`e2e/helpers/matchLogSeeding.ts`). Continuation events start here.
 */
const SEEDED_PREFIX_LENGTH = 2;

/**
 * Minimal shape for the `InteractiveSession` methods this scenario
 * drives directly — `advancePhase()` (no unit declarations, mirrors
 * `e2e/seam-fresh-construction-no-instant-defeat.spec.ts`'s
 * `advanceInteractiveSessionPhaseOnce`) and `getSession()` to read back
 * the full event log the call just appended AND persisted (recovered
 * `InteractiveSession`s auto-persist every new event via
 * `appendAndPersistInteractiveSessionEvent`,
 * `src/engine/InteractiveSession.sessionEvents.ts`).
 */
interface ContinuationInteractiveSession {
  readonly advancePhase: () => void;
  readonly getSession: () => {
    readonly events: readonly Record<string, unknown>[];
  };
}

interface ContinuationGameplayState {
  readonly interactiveSession?: ContinuationInteractiveSession | null;
}

interface ContinuationZustandStores {
  gameplay?: {
    getState: () => ContinuationGameplayState;
    setState?: (partial: { session?: unknown }) => void;
  };
}

/**
 * Cold-recover `matchId`, drive exactly one `advancePhase()` (the
 * Initiative -> Movement transition, which rolls initiative — the
 * dice-consuming step the persisted `config.seed` re-seed exists to
 * make reproducible, design D4), and return the raw continuation events
 * appended after the seeded two-event prefix. Reuses
 * `expectRecoveredInteractiveSession` for the cold-mount wait/assert so
 * this scenario shares the exact recovery-settled gate the structural
 * anchor above already proves, rather than re-deriving its own.
 */
async function recoverAndDriveOneContinuation(
  page: Page,
  matchId: string,
): Promise<readonly Record<string, unknown>[]> {
  await page.goto(`/gameplay/games/${matchId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
  await expectRecoveredInteractiveSession(page, matchId);

  return page.evaluate((prefixLength) => {
    const stores = (
      window as unknown as { __ZUSTAND_STORES__?: ContinuationZustandStores }
    ).__ZUSTAND_STORES__;
    const gameplay = stores?.gameplay;
    const interactiveSession = gameplay?.getState().interactiveSession;
    if (!gameplay || !interactiveSession) {
      throw new Error('Interactive session not available on gameplay store');
    }
    interactiveSession.advancePhase();
    const session = interactiveSession.getSession();
    gameplay.setState?.({ session });
    return session.events.slice(prefixLength);
  }, SEEDED_PREFIX_LENGTH);
}

/**
 * Strip the fields that legitimately differ between the two independent
 * match logs this scenario seeds — `id` (uuidv4, per-event random) and
 * `timestamp` (wall-clock), exactly as
 * `interactiveSessionRecoveryDeterminism.test.ts`'s
 * `normalizeEventsForComparison` (the W1 D4 proof this scenario extends
 * to the route level) — PLUS `gameId`, which that jest suite never had
 * to strip because it recovers ONE match id twice. This scenario cannot
 * reuse a single match id for two independent recoveries: a recovered
 * `InteractiveSession` auto-persists every new event back to the SAME
 * match log (`InteractiveSession.sessionEvents.ts`), so a second cold
 * load of the SAME id would recover run #1's continuation as part of
 * its prefix rather than starting from the identical seeded state. Two
 * independently-seeded match ids (necessarily distinct primary keys)
 * are therefore the correct route-level shape — every other field
 * (sequence, turn, phase, type, actorId, visibility, side, payload,
 * including the dice-driven `InitiativeRolled` roll values) stays in
 * scope for the equality check.
 */
function normalizeContinuationEvents(
  events: readonly Record<string, unknown>[],
): readonly unknown[] {
  return events.map(
    ({ id: _id, gameId: _gameId, timestamp: _timestamp, ...rest }) => rest,
  );
}

test.describe('active game session recovery @game @recovery', () => {
  test('deep-links and refreshes a generated match from local match-log storage', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const matchId = `e2e-recovery-${Date.now()}`;
    page.on('dialog', (dialog) => dialog.accept());

    const events = buildGameCreatedAndStartedEvents(matchId, TWO_UNIT_ROSTER);
    await seedMatchLog(page, matchId, events);

    await page.goto(`/gameplay/games/${matchId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
    await expectRecoveredInteractiveSession(page, matchId);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
    await expectRecoveredInteractiveSession(page, matchId);
  });

  test('recovers a mirrored-canonical-ref roster without id collision', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const matchId = `e2e-recovery-mirrored-${Date.now()}`;
    page.on('dialog', (dialog) => dialog.accept());

    const deployedIds = MIRRORED_ROSTER.map((unit) => unit.id);
    const events = buildGameCreatedAndStartedEvents(matchId, MIRRORED_ROSTER);
    await seedMatchLog(page, matchId, events);

    await page.goto(`/gameplay/games/${matchId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
    await expectMirroredRosterRecovered(
      page,
      matchId,
      deployedIds,
      MIRRORED_UNIT_REF,
      MIRRORED_ROSTER.length,
    );

    // Reload re-recovers idempotently — every invariant re-holds.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(new RegExp(`/gameplay/games/${matchId}$`));
    await expectMirroredRosterRecovered(
      page,
      matchId,
      deployedIds,
      MIRRORED_UNIT_REF,
      MIRRORED_ROSTER.length,
    );
  });

  test('seeded recovered continuations are deterministic at the route level', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    page.on('dialog', (dialog) => dialog.accept());

    // Two independently-seeded match logs sharing one finite
    // `config.seed` and the same starting roster (task 4.2). Not the
    // same match id recovered twice — see `normalizeContinuationEvents`
    // for why a recovered session's auto-persisted continuation rules
    // that out at the route level.
    const matchIdA = `e2e-recovery-continuation-a-${Date.now()}`;
    const matchIdB = `e2e-recovery-continuation-b-${Date.now()}`;

    const eventsA = buildGameCreatedAndStartedEvents(
      matchIdA,
      TWO_UNIT_ROSTER,
      { seed: CONTINUATION_SEED },
    );
    const eventsB = buildGameCreatedAndStartedEvents(
      matchIdB,
      TWO_UNIT_ROSTER,
      { seed: CONTINUATION_SEED },
    );
    await seedMatchLog(page, matchIdA, eventsA);
    await seedMatchLog(page, matchIdB, eventsB);

    const continuationA = await recoverAndDriveOneContinuation(page, matchIdA);
    const continuationB = await recoverAndDriveOneContinuation(page, matchIdB);

    // A real dice-consuming step actually ran (the Initiative -> Movement
    // roll) — an empty continuation would make the equality check below
    // vacuous.
    expect(continuationA.length).toBeGreaterThan(0);

    // Run-to-run equality ONLY (design D6 / D5): no roll value, outcome,
    // or uninterrupted-run claim is pinned — a divergence here is a W1
    // re-seed wiring bug (a recovery-path RNG consumer not re-seeded
    // from `config.seed`), never a normalizer to widen.
    expect(normalizeContinuationEvents(continuationA)).toEqual(
      normalizeContinuationEvents(continuationB),
    );
  });
});
