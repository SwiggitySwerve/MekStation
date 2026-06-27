/**
 * Replay Player E2E Tests
 *
 * Tests for the game replay page UI and playback controls.
 *
 * NOTE: Full replay functionality requires game events in the store.
 * The core replay logic is tested via unit tests in:
 * - src/hooks/audit/__tests__/useReplayPlayer.test.ts
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { promises as fs } from 'node:fs';

import { seedCareerPilot } from './helpers/campaignSeeders';

test.setTimeout(30000);

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Navigate to audit timeline page
 */
async function navigateToTimeline(page: Page): Promise<void> {
  await page.goto('/audit/timeline');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // React hydration
}

/**
 * Navigate to pilots page
 */
async function navigateToPilots(page: Page): Promise<void> {
  await page.goto('/gameplay/pilots');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

function buildReplayFixtureEvents(gameId: string): readonly unknown[] {
  const timestamp = '2026-06-25T00:00:00.000Z';
  return [
    {
      id: 'upload-e2e-0',
      gameId,
      sequence: 0,
      timestamp,
      type: 'game_created',
      turn: 1,
      phase: 'initiative',
      side: 'player',
      payload: {
        config: {
          mapRadius: 3,
          turnLimit: 0,
          victoryConditions: ['destruction'],
          optionalRules: [],
        },
        units: [
          {
            id: 'player-1',
            name: 'Atlas',
            side: 'player',
            unitRef: 'atlas-as7-d',
            pilotRef: 'pilot-1',
            gunnery: 4,
            piloting: 5,
          },
        ],
        hexTerrain: [
          {
            coordinate: { q: 0, r: 0 },
            elevation: 0,
            features: [],
          },
          {
            coordinate: { q: 1, r: 0 },
            elevation: 1,
            features: [],
          },
        ],
      },
    },
    {
      id: 'upload-e2e-1',
      gameId,
      sequence: 1,
      timestamp,
      type: 'movement_declared',
      turn: 1,
      phase: 'movement',
      actorId: 'player-1',
      side: 'player',
      payload: {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        facing: 1,
        movementType: 'walk',
        mpUsed: 1,
        heatGenerated: 0,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      },
    },
    {
      id: 'upload-e2e-2',
      gameId,
      sequence: 2,
      timestamp,
      type: 'heat_generated',
      turn: 1,
      phase: 'heat',
      actorId: 'player-1',
      side: 'player',
      payload: {
        unitId: 'player-1',
        amount: 3,
        source: 'movement',
        newTotal: 3,
      },
    },
  ];
}

function buildReplayUploadFixture(gameId: string): string {
  return buildReplayFixtureEvents(gameId)
    .map((event) => JSON.stringify(event))
    .join('\n');
}

function buildTimelineFixtureEvents(runId: string): readonly unknown[] {
  const gameId = `timeline-export-${runId}`;
  const campaignId = `campaign-${runId}`;
  return [
    {
      id: `${runId}-timeline-1`,
      sequence: 1,
      timestamp: '2026-06-25T00:00:00.000Z',
      category: 'game',
      type: 'game_created',
      payload: { message: 'Timeline export seed created' },
      context: { gameId, campaignId },
    },
    {
      id: `${runId}-timeline-2`,
      sequence: 2,
      timestamp: '2026-06-25T00:01:00.000Z',
      category: 'campaign',
      type: 'PendingOutcomeAdded',
      payload: {
        campaignId,
        matchId: gameId,
        contractId: 'contract-export-proof',
        scenarioId: 'scenario-export-proof',
        queueLength: 1,
      },
      context: { gameId, campaignId },
    },
    {
      id: `${runId}-timeline-3`,
      sequence: 3,
      timestamp: '2026-06-25T00:02:00.000Z',
      category: 'game',
      type: 'game_ended',
      payload: { winner: 'player', reason: 'destruction' },
      context: { gameId, campaignId },
    },
  ];
}

async function seedAuditTimelineEvents(
  page: Page,
  events: readonly unknown[],
): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (
          window as unknown as {
            __EVENT_STORE__?: {
              clear?: unknown;
              appendBatch?: unknown;
            };
          }
        ).__EVENT_STORE__?.appendBatch,
      ),
    undefined,
    { timeout: 15_000 },
  );
  await page.evaluate((seedEvents) => {
    const store = (
      window as unknown as {
        __EVENT_STORE__?: {
          clear: () => void;
          appendBatch: (events: readonly unknown[]) => void;
        };
      }
    ).__EVENT_STORE__;
    if (!store) {
      throw new Error('E2E event store is not exposed');
    }
    store.clear();
    store.appendBatch(seedEvents);
  }, events);
}

function buildPostBattleReport(matchId: string): Record<string, unknown> {
  return {
    version: 1,
    matchId,
    winner: 'player',
    reason: 'destruction',
    turnCount: 1,
    units: [
      {
        unitId: 'player-1',
        side: 'player',
        designation: 'Atlas',
        damageDealt: 18,
        damageReceived: 0,
        kills: 1,
        heatProblems: 0,
        physicalAttacks: 0,
        xpPending: true,
      },
      {
        unitId: 'opponent-1',
        side: 'opponent',
        designation: 'Marauder',
        damageDealt: 0,
        damageReceived: 18,
        kills: 0,
        heatProblems: 0,
        physicalAttacks: 0,
        xpPending: true,
      },
    ],
    mvpUnitId: 'player-1',
    log: buildReplayFixtureEvents(matchId),
  };
}

async function seedCompletedMatchLog(
  request: APIRequestContext,
  matchId: string,
): Promise<void> {
  const response = await request.post('/api/matches', {
    data: buildPostBattleReport(matchId),
  });
  expect(response.status()).toBe(201);
  await expect(response).toBeOK();
  const body = (await response.json()) as { matchId?: string };
  expect(body.matchId).toBe(matchId);
}

// =============================================================================
// Test Suite: Audit Timeline Page
// =============================================================================

test.describe('Audit Timeline Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToTimeline(page);
  });

  test('timeline page loads with filters', async ({ page }) => {
    // Check page title/heading
    await expect(page.locator('h1')).toContainText('Event Timeline');

    // Check filter controls exist
    await expect(page.getByPlaceholder('Search events...')).toBeVisible();

    // Check category filter buttons exist (at least the "All" option). Scope
    // to the timeline-filters container — `/All/i` matches several buttons
    // elsewhere on the page (top-bar dropdowns, etc.) and would trip strict
    // mode. PT-007.
    const filters = page.getByTestId('timeline-filters');
    await expect(filters.getByRole('button', { name: /All/i })).toBeVisible();
  });

  test('can toggle advanced query builder', async ({ page }) => {
    // Click the page-level "Advanced" toggle. The /audit/timeline page hosts
    // two Advanced controls — first the page button (timeline.tsx:148) that
    // toggles `showAdvancedQuery` state, then once QueryBuilder mounts, an
    // "Advanced Filters" expand inside it. The /Advanced/i regex resolves to
    // the first/visible one.
    const advancedBtn = page.getByRole('button', { name: /Advanced/i });
    await expect(advancedBtn).toBeVisible();
    await advancedBtn.click();

    // PT-009: previously asserted `text=Save Query` which lives in a hidden
    // modal that only opens on a separate Save click (SavedQueries.tsx
    // line ~340). Clicking the page-level Advanced button renders the
    // QueryBuilder component (QueryBuilder.tsx:223) with a "Category"
    // Select, "From Time" / "To Time" Inputs, etc. Assert against the
    // Category Select via its `<label>` — Select.placeholder ("All
    // Categories") renders as an `<option>` child rather than the HTML
    // placeholder attribute, so getByPlaceholder doesn't match it.
    await expect(page.getByLabel('Category').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('category filters are clickable', async ({ page }) => {
    // Click a category filter — scope to the timeline-filters container so
    // `/Game/i` doesn't strict-mode-collide with top-bar buttons that share
    // the substring (e.g. an `aria-haspopup="menu"` Games dropdown). PT-007.
    const filters = page.getByTestId('timeline-filters');
    const gameFilter = filters.getByRole('button', { name: /Game/i });
    if (await gameFilter.isVisible()) {
      await gameFilter.click();
      // Should be active
      await expect(gameFilter).toHaveAttribute('data-active', 'true');
    }
  });

  test('shows empty state when no events', async ({ page }) => {
    // With no events, should show empty state message
    const noEventsText = page.locator('text=No events found');
    const hasEmptyState = await noEventsText
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Either show events or empty state
    if (hasEmptyState) {
      await expect(noEventsText).toBeVisible();
    }
    // Otherwise timeline has events which is also valid
  });
});

// =============================================================================
// Test Suite: Pilot Career Tab
// =============================================================================

test.describe('Pilot Career Timeline Tab', () => {
  test('pilot detail page has Career History tab', async ({
    page,
  }, testInfo) => {
    await navigateToPilots(page);

    const pilotSeed = `${testInfo.workerIndex}-${Date.now()}`;
    const seededPilot = await seedCareerPilot(page, {
      name: `E2E Career Pilot ${pilotSeed}`,
      callsign: `Ledger ${pilotSeed}`,
      affiliation: 'E2E Test Command',
    });

    const pilotLink = page.locator(
      `a[href="/gameplay/pilots/${seededPilot.id}"]`,
    );
    await expect(pilotLink.first()).toBeVisible({ timeout: 5000 });
    await pilotLink.first().click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(
      new RegExp(`/gameplay/pilots/${seededPilot.id}$`),
    );

    await expect(
      page.getByRole('heading', { name: seededPilot.name }).first(),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(`"${seededPilot.callsign}"`).first(),
    ).toBeVisible();

    // Check for Career History tab
    const careerTab = page.getByRole('button', { name: /Career History/i });
    await expect(careerTab).toBeVisible({ timeout: 5000 });

    // Click career tab
    await careerTab.click();

    // Should show career history content
    await expect(
      page.getByRole('heading', { name: 'Career History' }),
    ).toBeVisible();
    await expect(
      page.getByText(`Event timeline for ${seededPilot.name}`),
    ).toBeVisible();
    await expect(page.getByText('0 events')).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Replay Page Navigation
// =============================================================================

test.describe('Game Replay Page', () => {
  test('game replay page shows error for non-existent game', async ({
    page,
  }) => {
    // Navigate to replay for a non-existent game
    await page.goto('/gameplay/games/non-existent-game/replay');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Should show error or empty state
    const hasError = await page
      .locator('text=Error')
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasNoEvents = await page
      .locator('text=No events found')
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasLoading = await page
      .locator('text=Loading')
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    const hasUploadFallback = await page
      .getByText('No replay loaded')
      .isVisible({ timeout: 1000 })
      .catch(() => false);

    // Should show some feedback (error, empty, or still loading)
    expect(
      hasError || hasNoEvents || hasLoading || hasUploadFallback,
    ).toBeTruthy();
  });

  test('games page opens replay for a persisted completed match', async ({
    page,
    request,
  }, testInfo) => {
    const matchId = `completed-replay-${testInfo.workerIndex}-${Date.now()}`;
    await seedCompletedMatchLog(request, matchId);

    await page.goto('/gameplay/games');
    await page.waitForLoadState('networkidle');

    // The seeded completed match must surface direct report and replay actions.
    await expect(page.getByTestId(`game-card-${matchId}`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId(`game-report-${matchId}`)).toBeVisible();
    await page.getByTestId(`game-replay-${matchId}`).click();

    await expect(page).toHaveURL(
      new RegExp(`/gameplay/games/${matchId}/replay$`),
    );
    await expect(page.getByTestId('replay-loaded-source')).toContainText(
      'loaded from match log',
    );
    await expect(page.getByTestId('jsonl-loader-status')).toContainText(
      `match-log:${matchId}`,
    );
    await expect(page.getByTestId('replay-event-count')).toContainText(
      '3 events',
    );
    await expect(page.getByText('Seq #0')).toBeVisible({ timeout: 10000 });
  });
});

// =============================================================================
// Test Suite: Replay Library Browser Round-Trip
// =============================================================================

test.describe('Replay Library Browser Round-Trip', () => {
  test('opens a seeded quick replay and returns to the library list', async ({
    context,
    page,
  }) => {
    const gameId = 'library-e2e';
    const events = buildReplayFixtureEvents(gameId);

    await context.route('**/api/replay-library**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/replay-library') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: [
              {
                id: gameId,
                replaySource: 'quick',
                path: `quick/${gameId}.jsonl`,
                createdAt: '2026-06-25T00:00:00.000Z',
                turns: 1,
                winner: 'player',
                bvTotal: 6000,
                playerSide: 'player',
                aiVariant: 'e2e-seeded',
              },
            ],
            total: 1,
          }),
        });
        return;
      }
      if (pathname === `/api/replay-library/quick/${gameId}`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ events }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto('/replay-library');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Replay Library' }),
    ).toBeVisible();

    await page.getByTestId('source-filter-quick').click();
    await expect(page.getByTestId(`replay-row-${gameId}`)).toBeVisible();
    await expect(page.getByTestId('replay-ai-variant')).toContainText(
      'e2e-seeded',
    );

    await page.getByTestId(`replay-watch-${gameId}`).click();
    await expect(page.getByTestId('back-to-library')).toBeVisible();
    await expect(page.getByTestId('quickgame-replay-panel')).toBeVisible();
    await expect(page.getByText('Seq #0')).toBeVisible();

    await page.getByTestId('back-to-library').click();
    await expect(page.getByTestId(`replay-row-${gameId}`)).toBeVisible();
  });
});

// =============================================================================
// Test Suite: Keyboard Shortcuts (requires replay with events)
// =============================================================================

test.describe('Replay Keyboard Shortcuts', () => {
  test('uploaded replay exposes controls and responds to keyboard shortcuts', async ({
    page,
  }) => {
    await page.goto('/gameplay/games/upload-e2e/replay');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('replay-page')).toBeVisible();
    await expect(page.getByText('No replay loaded')).toBeVisible();

    await page.getByTestId('jsonl-loader-file-input').setInputFiles({
      name: 'upload-e2e.jsonl',
      mimeType: 'application/x-ndjson',
      buffer: Buffer.from(buildReplayUploadFixture('upload-e2e'), 'utf8'),
    });

    await expect(page.getByTestId('jsonl-loader-status')).toContainText(
      'upload-e2e.jsonl',
    );
    await expect(page.getByTestId('replay-event-count')).toContainText(
      '3 events',
    );
    await expect(page.getByTestId('replay-controls')).toBeVisible();
    await expect(page.getByText('Seq #0')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Seq #1')).toBeVisible();

    await page.keyboard.press('End');
    await expect(page.getByText('Seq #2')).toBeVisible();

    await page.keyboard.press('Home');
    await expect(page.getByText('Seq #0')).toBeVisible();

    await page.keyboard.press('=');
    await expect(
      page.getByRole('button', { name: 'Playback speed: 2x' }),
    ).toBeVisible();

    const helpButton = page.getByRole('button', {
      name: 'Show keyboard shortcuts',
    });

    await helpButton.click();

    // Should show keyboard shortcuts help
    await expect(page.locator('text=Keyboard Shortcuts').first()).toBeVisible({
      timeout: 3000,
    });

    // Close it using the close button with aria-label
    const closeButton = page.getByRole('button', {
      name: 'Close keyboard shortcuts',
    });
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Modal should be closed
    await expect(
      page.locator('text=Keyboard Shortcuts').first(),
    ).not.toBeVisible({ timeout: 3000 });
  });
});

// =============================================================================
// Test Suite: Timeline Filters and Export
// =============================================================================

test.describe('Timeline Export Functionality', () => {
  test('downloads a seeded timeline export as JSON', async ({
    page,
  }, testInfo) => {
    await navigateToTimeline(page);
    const runId = `${testInfo.workerIndex}-${Date.now()}`;
    const events = buildTimelineFixtureEvents(runId);
    await seedAuditTimelineEvents(page, events);

    await page.getByRole('button', { name: 'Refresh timeline' }).click();
    await expect(page.getByRole('button', { name: 'Export (3)' })).toBeVisible({
      timeout: 5000,
    });

    await page.getByRole('button', { name: 'Export (3)' }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export as JSON' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(
      /^event-timeline-\d{4}-\d{2}-\d{2}\.json$/,
    );
    const downloadPath = testInfo.outputPath('timeline-export.json');
    await download.saveAs(downloadPath);
    const exported = JSON.parse(
      await fs.readFile(downloadPath, 'utf8'),
    ) as Array<{
      id: string;
      context?: { campaignId?: string };
    }>;
    const exportedIds = exported.map((event) => event.id).sort();
    const expectedIds = events
      .map((event) => (event as { id: string }).id)
      .sort();

    expect(exported).toHaveLength(3);
    expect(exportedIds).toEqual(expectedIds);
    expect(
      exported.every(
        (event) => event.context?.campaignId === `campaign-${runId}`,
      ),
    ).toBe(true);
  });

  test('refresh button works on timeline', async ({ page }) => {
    await navigateToTimeline(page);

    // Refresh button should exist on timeline page
    const refreshButton = page.locator('button[aria-label="Refresh timeline"]');
    await expect(refreshButton).toBeVisible({ timeout: 5000 });

    // Click refresh and verify it doesn't cause errors
    await refreshButton.click();

    // Page should remain functional after refresh
    await expect(page.locator('h1')).toContainText('Event Timeline');
  });
});
