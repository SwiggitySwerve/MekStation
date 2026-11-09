/**
 * Live Seed-Reproducibility E2E Proof
 *
 * Drives two fresh encounters prepared from one battle-input definition
 * with a fixed `?seed=N` through live pre-battle auto-resolve, via independent
 * page loads, and asserts the two runs land on an identical winner, turn
 * count, and event count. This is the live-route companion to the jest-level
 * determinism proofs (`src/engine/__tests__/interactiveSessionDeterminism.test.ts`)
 * — per design D6, equality is asserted only BETWEEN the two same-seed runs.
 * No literal winner/turn/event-count value is pinned anywhere in this spec
 * (an invariant proof, never a golden trace).
 *
 * @tags @game @determinism @smoke
 * @spec openspec/specs/game-engine-orchestration/spec.md#requirement-single-player-launch-seed-threading
 * @spec openspec/specs/encounter-system/spec.md#requirement-explicit-restart-and-visible-launch-refusal
 */

import { expect, test, type Page } from '@playwright/test';

import { createEncounterWithForces } from './fixtures/encounter';
import { assignPilotAndUnit, createTestLance } from './fixtures/force';
import { createRegularPilot } from './fixtures/pilot';

const PLAYER_UNIT_ID = 'atlas-as7-d';
const OPPONENT_UNIT_ID = 'marauder-mad-3r';

/**
 * Fixed seed driven through the pre-battle route twice. The value itself is
 * arbitrary — the proof is same-seed self-consistency, never a mapping from
 * this specific seed to a specific outcome (design D6).
 */
const SEED_UNDER_TEST = 424242;

test.setTimeout(120_000);

// =============================================================================
// Types
// =============================================================================

interface AssignmentSlot {
  readonly id: string;
}

/** One auto-resolved run's outcome, read straight from the gameplay store. */
interface SeedRunProof {
  readonly sessionId: string;
  readonly seed: number | null | undefined;
  readonly winner: string | null;
  readonly turn: number;
  readonly eventCount: number;
}

// =============================================================================
// Fixture setup — two fresh encounters, two assigned single-unit forces, no
// campaign linkage (the reproducibility proof only needs the pre-battle
// route's auto-resolve path, not the campaign outcome plumbing that
// encounter-combat-continuity.spec.ts exercises).
// =============================================================================

async function waitForE2EStores(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __E2E_MODE__?: boolean;
        __ZUSTAND_STORES__?: Record<string, unknown>;
      };
      const stores = win.__ZUSTAND_STORES__;
      return Boolean(
        win.__E2E_MODE__ &&
        stores?.force &&
        stores.pilot &&
        stores.encounter &&
        stores.gameplay,
      );
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function assignmentIdsForForce(
  page: Page,
  forceId: string,
  count: number,
): Promise<string[]> {
  return page.evaluate(
    ({ id, requestedCount }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: {
            force?: {
              getState: () => {
                forces: Array<{
                  id: string;
                  assignments: readonly AssignmentSlot[];
                }>;
              };
            };
          };
        }
      ).__ZUSTAND_STORES__;

      const force = stores?.force
        ?.getState()
        .forces.find((candidate) => candidate.id === id);
      const assignmentIds =
        force?.assignments.slice(0, requestedCount).map((slot) => slot.id) ??
        [];
      if (assignmentIds.length < requestedCount) {
        throw new Error(
          `Force ${id} only has ${assignmentIds.length} assignment slots; ${requestedCount} required`,
        );
      }
      return assignmentIds;
    },
    { id: forceId, requestedCount: count },
  );
}

async function createAssignedLance(
  page: Page,
  forceName: string,
  pilotName: string,
  unitId: string,
): Promise<string> {
  const forceId = await createTestLance(page, forceName, 'Mercenary');
  if (!forceId) {
    throw new Error(`Failed to create force "${forceName}"`);
  }

  const [assignmentId] = await assignmentIdsForForce(page, forceId, 1);
  const pilotId = await createRegularPilot(page, pilotName);
  if (!pilotId) {
    throw new Error(`Failed to create pilot "${pilotName}"`);
  }

  const assigned = await assignPilotAndUnit(
    page,
    assignmentId!,
    pilotId,
    unitId,
  );
  if (!assigned) {
    throw new Error(`Failed to assign pilot/unit to force "${forceName}"`);
  }

  return forceId;
}

async function createSeedProofEncounters(page: Page): Promise<
  ReadonlyArray<{
    readonly encounterId: string;
    readonly encounterName: string;
  }>
> {
  const label = `Seed Reproducibility ${Date.now()}`;
  // Both rows reference these same unmodified source forces/pilots. Each
  // route mount constructs a fresh battle; neither consumes a prior session.
  const battleInput = {
    playerForceId: await createAssignedLance(
      page,
      `${label} Player Lance`,
      `${label} Player Pilot`,
      PLAYER_UNIT_ID,
    ),
    opponentForceId: await createAssignedLance(
      page,
      `${label} Opponent Lance`,
      `${label} Opponent Pilot`,
      OPPONENT_UNIT_ID,
    ),
    template: 'skirmish' as const,
  };

  const encounters = [];
  for (const run of ['A', 'B']) {
    const encounterName = `${label} Encounter ${run}`;
    const encounterId = await createEncounterWithForces(
      page,
      encounterName,
      battleInput.playerForceId,
      battleInput.opponentForceId,
      {
        template: battleInput.template,
        description: 'Seed-reproducibility auto-resolve proof encounter',
      },
    );
    if (!encounterId) {
      throw new Error(`Failed to create seed-reproducibility encounter ${run}`);
    }
    encounters.push({ encounterId, encounterName });
  }
  return encounters;
}

// =============================================================================
// Run driver — one independent page load through the pre-battle route,
// auto-resolved, proof read from the resulting session.
// =============================================================================

/**
 * Drives ONE independent auto-resolve run of the given encounter through the
 * live pre-battle route with `?seed=N`, then reads the resulting session's
 * winner/turn/event-count straight from the gameplay store. Each call starts
 * with a fresh `page.goto` — a genuinely separate page load, not a store
 * replay — so the proof exercises the same live route mount the design's
 * e2e obligation (D6) requires, not a jest-level shortcut.
 */
async function runAutoResolveOnce(
  page: Page,
  encounterId: string,
  encounterName: string,
  seed: number,
): Promise<SeedRunProof> {
  await page.goto(
    `/gameplay/encounters/${encounterId}/pre-battle?seed=${seed}`,
    { waitUntil: 'domcontentloaded' },
  );
  await waitForE2EStores(page);

  await expect(
    page.getByRole('heading', { name: `Pre-Battle: ${encounterName}` }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('mode-selection')).toBeVisible();
  await expect(page.getByTestId('auto-resolve-btn')).toBeEnabled();

  await page.getByTestId('auto-resolve-btn').click();

  await page.waitForURL(/\/gameplay\/games\/[^?]+$/, { timeout: 30_000 });
  // A finished game that is not campaign-bound redirects from the session
  // page to the victory screen; campaign-bound games stay on the completed
  // surface. Either is the completed state.
  await expect(
    page.getByTestId('game-completed').or(page.getByTestId('victory-screen')),
  ).toBeVisible({
    timeout: 30_000,
  });

  return page.evaluate(() => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          gameplay?: {
            getState: () => {
              session: {
                id: string;
                config: { seed?: number | null };
                events: readonly unknown[];
                currentState: {
                  turn: number;
                  result?: { winner?: string | null };
                };
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;
    const session = stores?.gameplay?.getState().session;
    if (!session) {
      throw new Error('Gameplay session not available after auto-resolve');
    }
    return {
      sessionId: session.id,
      seed: session.config.seed,
      winner: session.currentState.result?.winner ?? null,
      turn: session.currentState.turn,
      eventCount: session.events.length,
    };
  });
}

interface PersistedEncounter {
  readonly id: string;
  readonly status: string;
  readonly gameSessionId?: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly [field: string]: unknown;
}

interface LaunchPayload {
  readonly config: {
    readonly encounterId: string;
    readonly seed: number;
    readonly [field: string]: unknown;
  };
  readonly units: readonly {
    readonly unitRef: string;
    readonly gunnery: number;
    readonly piloting: number;
    readonly [field: string]: unknown;
  }[];
  readonly encounterMeta?: unknown;
  readonly [field: string]: unknown;
}

interface PersistedHistory {
  readonly gameId: string;
  readonly sourceDigest: string;
  readonly events: readonly {
    readonly type: string;
    readonly payload: unknown;
  }[];
}

async function readPersistedEncounter(
  page: Page,
  id: string,
): Promise<PersistedEncounter> {
  const response = await page.request.get(`/api/encounters/${id}`);
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { encounter: PersistedEncounter };
  expect(body.encounter.id).toBe(id);
  return body.encounter;
}

async function readPersistedHistory(
  page: Page,
  sessionId: string,
): Promise<PersistedHistory> {
  const url = `/api/replay-library/encounter/${sessionId}`;
  // The completed page persists through its real terminal-state effect.
  await expect
    .poll(async () => (await page.request.get(url)).status())
    .toBe(200);
  const response = await page.request.get(url);
  expect(response.ok()).toBe(true);
  const history = (await response.json()) as PersistedHistory;
  expect(history.gameId).toBe(sessionId);
  expect(history.events[0]?.type).toBe('game_created');
  expect(history.events.at(-1)?.type).toBe('game_ended');
  return history;
}

// =============================================================================
// Spec
// =============================================================================

test.describe(
  'live seed-reproducibility proof',
  { tag: ['@game', '@determinism', '@smoke'] },
  () => {
    test(
      'fresh encounters with the same ?seed=N and battle inputs yield identical winner, turn count, and event count',
      { tag: ['@game', '@determinism', '@smoke'] },
      async ({ page }, testInfo) => {
        await page.goto('/gameplay');
        await waitForE2EStores(page);

        // Prepare both before run A can mutate any battle state.
        const [first, second] = await createSeedProofEncounters(page);
        expect(second.encounterId).not.toBe(first.encounterId);
        const firstBefore = await readPersistedEncounter(
          page,
          first.encounterId,
        );
        const secondBefore = await readPersistedEncounter(
          page,
          second.encounterId,
        );
        expect(firstBefore.status).toBe('ready');
        expect(secondBefore.status).toBe('ready');
        expect(firstBefore.gameSessionId).toBeUndefined();
        expect(secondBefore.gameSessionId).toBeUndefined();

        // Compare every stored field, allowing only row identity, name and
        // timestamps to differ. Forces/map/deployment/rules/turn conditions
        // stay exact; no gameplay input is normalized.
        expect(secondBefore).toEqual({
          ...firstBefore,
          id: second.encounterId,
          name: second.encounterName,
          createdAt: secondBefore.createdAt,
          updatedAt: secondBefore.updatedAt,
        });

        const firstRun = await runAutoResolveOnce(
          page,
          first.encounterId,
          first.encounterName,
          SEED_UNDER_TEST,
        );
        const firstCompleted = await readPersistedEncounter(
          page,
          first.encounterId,
        );
        expect(firstCompleted.status).toBe('completed');
        expect(firstCompleted.gameSessionId).toBe(firstRun.sessionId);
        const firstHistory = await readPersistedHistory(
          page,
          firstRun.sessionId,
        );

        // Run A must not mutate run B's prepared configuration.
        expect(await readPersistedEncounter(page, second.encounterId)).toEqual(
          secondBefore,
        );
        const secondRun = await runAutoResolveOnce(
          page,
          second.encounterId,
          second.encounterName,
          SEED_UNDER_TEST,
        );
        const secondCompleted = await readPersistedEncounter(
          page,
          second.encounterId,
        );
        expect(secondCompleted.status).toBe('completed');
        expect(secondCompleted.gameSessionId).toBe(secondRun.sessionId);
        expect(secondRun.sessionId).not.toBe(firstRun.sessionId);
        const secondHistory = await readPersistedHistory(
          page,
          secondRun.sessionId,
        );

        // Check the actual saved GameCreated inputs, including all unit
        // fields and all config fields except the permitted encounter ID.
        const firstLaunch = firstHistory.events[0].payload as LaunchPayload;
        const secondLaunch = secondHistory.events[0].payload as LaunchPayload;
        expect(firstLaunch.config.encounterId).toBe(first.encounterId);
        expect(secondLaunch.config.encounterId).toBe(second.encounterId);
        expect(firstRun.seed).toBe(SEED_UNDER_TEST);
        expect(secondRun.seed).toBe(SEED_UNDER_TEST);
        expect(firstLaunch.config.seed).toBe(SEED_UNDER_TEST);
        expect(secondLaunch.config.seed).toBe(SEED_UNDER_TEST);
        expect(secondLaunch).toEqual({
          ...firstLaunch,
          config: { ...firstLaunch.config, encounterId: second.encounterId },
          encounterMeta: secondLaunch.encounterMeta,
        });
        expect(firstLaunch.units).toEqual([
          expect.objectContaining({
            unitRef: PLAYER_UNIT_ID,
            gunnery: 4,
            piloting: 5,
          }),
          expect.objectContaining({
            unitRef: OPPONENT_UNIT_ID,
            gunnery: 4,
            piloting: 5,
          }),
        ]);
        expect(firstHistory.events).toHaveLength(firstRun.eventCount);
        expect(secondHistory.events).toHaveLength(secondRun.eventCount);

        // Equality only BETWEEN runs: never pin a seed-to-outcome golden.
        expect(secondRun.winner).toBe(firstRun.winner);
        expect(secondRun.turn).toBe(firstRun.turn);
        expect(secondRun.eventCount).toBe(firstRun.eventCount);

        expect(await readPersistedEncounter(page, first.encounterId)).toEqual(
          firstCompleted,
        );
        expect(await readPersistedHistory(page, firstRun.sessionId)).toEqual(
          firstHistory,
        );
        await testInfo.attach('seed-reproducibility-proof', {
          contentType: 'application/json',
          body: JSON.stringify(
            {
              encounters: [first.encounterId, second.encounterId],
              runs: [firstRun, secondRun],
              launches: [firstLaunch, secondLaunch],
              firstCompleted,
              preservedHistoryDigest: firstHistory.sourceDigest,
            },
            null,
            2,
          ),
        });
      },
    );
  },
);
