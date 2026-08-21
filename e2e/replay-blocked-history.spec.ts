/**
 * Truthful Replay Library blocked-state UI — live browser proof
 * (replay-safety PR 20).
 *
 * Seeds a REAL unsupported .jsonl into simulation-reports/quick/, lets
 * the REAL load API answer 422 REPLAY_HISTORY_BLOCKED (only the list
 * response is augmented so the entry appears), and proves the page
 * renders the persistent accessible blocked panel with the typed
 * evidence — never a partial replay — on desktop AND mobile viewports.
 * The API response is captured alongside each screenshot so the visual
 * evidence is paired with the pipeline evidence (task 20.3).
 *
 * @tags @replay @blocked-state
 */

import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const GAME_ID = 'e2e-blocked-history';
const FILE_PATH = path.join(
  process.cwd(),
  'simulation-reports',
  'quick',
  `${GAME_ID}.jsonl`,
);

const GOOD_LINE = JSON.stringify({
  id: 'evt-0',
  gameId: GAME_ID,
  sequence: 0,
  timestamp: '2026-08-21T00:00:00.000Z',
  type: 'turn_started',
  turn: 1,
  phase: 'initiative',
  payload: {},
});

const BAD_LINE = JSON.stringify({
  id: 'evt-1',
  gameId: GAME_ID,
  sequence: 1,
  timestamp: '2026-08-21T00:00:00.000Z',
  type: 'damage_applied',
  turn: 1,
  phase: 'weapon_attack',
  // Pre-armor-seed legacy shape: armorRemaining/structureRemaining absent.
  payload: {
    unitId: 'atlas-as7-d',
    location: 'center_torso',
    damage: 5,
    locationDestroyed: false,
  },
});

test.describe('Replay Library blocked-state UI @replay @blocked-state', () => {
  test.beforeAll(() => {
    fs.mkdirSync(path.dirname(FILE_PATH), { recursive: true });
    fs.writeFileSync(FILE_PATH, `${GOOD_LINE}\n${BAD_LINE}\n`, 'utf8');
  });

  test.afterAll(() => {
    fs.rmSync(FILE_PATH, { force: true });
  });

  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'mobile', width: 390, height: 844 },
  ] as const) {
    test(`renders the accessible blocked panel with typed evidence (${viewport.name})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      // Augment ONLY the list so the seeded entry appears; the load call
      // hits the REAL pipeline-backed API.
      await page.route('**/api/replay-library', async (route) => {
        const response = await route.fetch();
        const body = (await response.json()) as {
          entries: Record<string, unknown>[];
        };
        body.entries.unshift({
          id: GAME_ID,
          replaySource: 'quick',
          path: `quick/${GAME_ID}.jsonl`,
          createdAt: '2026-08-21T00:00:00.000Z',
          turns: 1,
          winner: 'draw',
          bvTotal: 0,
        });
        await route.fulfill({
          response,
          body: JSON.stringify(body),
        });
      });

      await page.goto('/replay-library', { waitUntil: 'domcontentloaded' });

      const apiResponsePromise = page.waitForResponse((response) =>
        response.url().includes(`/api/replay-library/quick/${GAME_ID}`),
      );
      await page.getByTestId(`replay-watch-${GAME_ID}`).click();

      // Pair the API evidence with the visual evidence.
      const apiResponse = await apiResponsePromise;
      expect(apiResponse.status()).toBe(422);
      const apiBody = (await apiResponse.json()) as {
        code: string;
        blocked: {
          sourceId: string;
          blockedLineCount: number;
          blockedLines: readonly { reason: string; eventType: string }[];
        };
      };
      expect(apiBody.code).toBe('REPLAY_HISTORY_BLOCKED');
      expect(apiBody.blocked.sourceId).toBe(`quick/${GAME_ID}`);
      expect(apiBody.blocked.blockedLines[0]).toMatchObject({
        reason: 'invalid-payload',
        eventType: 'damage_applied',
      });
      await testInfo.attach(`api-evidence-${viewport.name}`, {
        body: JSON.stringify(apiBody, null, 2),
        contentType: 'application/json',
      });

      // The persistent accessible panel, never a partial replay.
      const panel = page.getByTestId('replay-blocked-history');
      await expect(panel).toBeVisible();
      await expect(
        page.getByRole('heading', { name: /replay blocked/i }),
      ).toBeFocused();
      await expect(page.getByTestId('replay-blocked-reasons')).toContainText(
        'invalid-payload (damage_applied)',
      );
      await expect(panel).toContainText('What you can do');
      // The REAL player surfaces never mount for a blocked history.
      await expect(page.getByTestId('quickgame-replay-panel')).toHaveCount(0);
      await expect(page.getByTestId('replay-controls')).toHaveCount(0);
      await expect(page.getByRole('slider')).toHaveCount(0);
      await expect(page.locator('[role="alert"]').first()).toBeVisible();
      // Scope-safety on screen: payload contents never render.
      const pageText = await page.locator('main').innerText();
      expect(pageText).not.toContain('atlas-as7-d');
      expect(pageText).not.toContain('armorRemaining');

      await testInfo.attach(`blocked-panel-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });
  }
});
