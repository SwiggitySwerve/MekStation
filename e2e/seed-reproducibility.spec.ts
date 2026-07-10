/**
 * Live Seed-Reproducibility E2E Proof
 *
 * Group 5 of `add-sp-combat-determinism`: drives the live pre-battle route
 * with a fixed `?seed=N` through auto-resolve TWICE, via two independent
 * page loads, and asserts the two runs land on an identical winner, turn
 * count, and event count. This is the live-route companion to the jest-level
 * determinism proofs (`src/engine/__tests__/interactiveSessionDeterminism.test.ts`)
 * — per design D6, equality is asserted only BETWEEN the two same-seed runs.
 * No literal winner/turn/event-count value is pinned anywhere in this spec
 * (an invariant proof, never a golden trace).
 *
 * @tags @game @determinism @smoke
 * @spec openspec/changes/add-sp-combat-determinism/specs/game-engine-orchestration/spec.md
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
  readonly winner: string | null;
  readonly turn: number;
  readonly eventCount: number;
}

// =============================================================================
// Fixture setup — one encounter, two assigned single-unit forces, no
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

async function createSeedProofEncounter(
  page: Page,
): Promise<{ readonly encounterId: string; readonly encounterName: string }> {
  const label = `Seed Reproducibility ${Date.now()}`;
  const playerForceId = await createAssignedLance(
    page,
    `${label} Player Lance`,
    `${label} Player Pilot`,
    PLAYER_UNIT_ID,
  );
  const opponentForceId = await createAssignedLance(
    page,
    `${label} Opponent Lance`,
    `${label} Opponent Pilot`,
    OPPONENT_UNIT_ID,
  );

  const encounterName = `${label} Encounter`;
  const encounterId = await createEncounterWithForces(
    page,
    encounterName,
    playerForceId,
    opponentForceId,
    { description: 'Seed-reproducibility auto-resolve proof encounter' },
  );
  if (!encounterId) {
    throw new Error('Failed to create seed-reproducibility encounter');
  }

  return { encounterId, encounterName };
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
  await expect(page.getByTestId('game-completed')).toBeVisible({
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
      winner: session.currentState.result?.winner ?? null,
      turn: session.currentState.turn,
      eventCount: session.events.length,
    };
  });
}

// =============================================================================
// Spec
// =============================================================================

test.describe(
  'live seed-reproducibility proof',
  { tag: ['@game', '@determinism', '@smoke'] },
  () => {
    test(
      'same ?seed=N auto-resolved twice via independent page loads yields identical winner, turn count, and event count',
      { tag: ['@game', '@determinism', '@smoke'] },
      async ({ page }) => {
        await page.goto('/gameplay');
        await waitForE2EStores(page);

        const { encounterId, encounterName } =
          await createSeedProofEncounter(page);

        const firstRun = await runAutoResolveOnce(
          page,
          encounterId,
          encounterName,
          SEED_UNDER_TEST,
        );
        const secondRun = await runAutoResolveOnce(
          page,
          encounterId,
          encounterName,
          SEED_UNDER_TEST,
        );

        // Two independent page loads of the same seed launch distinct
        // sessions (fresh GameEngine + generated session id each time) — a
        // sanity check that this is really two separate runs, not a cached
        // replay of the first.
        expect(secondRun.sessionId).not.toBe(firstRun.sessionId);

        // The reproducibility invariant under test: identical seed, identical
        // forces, identical outcome. Equality is asserted only BETWEEN the
        // two runs — no literal winner/turn/event-count value appears in
        // this spec for any seed (design D6).
        expect(secondRun.winner).toBe(firstRun.winner);
        expect(secondRun.turn).toBe(firstRun.turn);
        expect(secondRun.eventCount).toBe(firstRun.eventCount);
      },
    );
  },
);
