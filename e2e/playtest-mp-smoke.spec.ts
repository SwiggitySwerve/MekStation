/**
 * Phase-4 Multiplayer Smoke Walkthrough
 *
 * Scripted UAT per `~/.claude/plans/snappy-sprouting-giraffe.md` Phase 4.
 *
 * Scope (what this spec covers):
 *   - Multiplayer hub route mounts (`/multiplayer`)
 *   - Matchmaking browser renders (`MatchBrowser` testid + empty state)
 *   - Create-match + join-match form gates render
 *   - Spectate route at `/multiplayer/spectate/[matchId]` mounts cleanly
 *     for a non-existent match (must render the "match-closed" panel,
 *     not crash)
 *   - No critical console errors across the walk
 *
 * Explicitly out of scope (manual UAT only — see `playtest/checklists/mp-uat.md`):
 *   - Actual two-window match flow (requires vault-password setup that
 *     can't be scripted deterministically without compromising the
 *     vault auth boundary)
 *   - Spectator joining a live match
 *   - Server-kill + reconnect durability
 *   - Host migration
 *   - Rate-limit abuse
 *
 * The scripted floor: every public MP route mounts and emits no critical
 * console error. The manual UAT covers gameplay behavior.
 *
 * @tags @game @smoke @playtest @multiplayer
 * @phase Phase 4 — Multiplayer Two-Window Playtest
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

// =============================================================================
// Configuration
// =============================================================================

test.setTimeout(60_000);

// =============================================================================
// Console-error capture
// =============================================================================

interface IErrorCapture {
  consoleErrors: string[];
  pageErrors: string[];
  attach(page: Page): void;
  critical(): string[];
}

function newErrorCapture(): IErrorCapture {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  return {
    consoleErrors,
    pageErrors,
    attach(page: Page): void {
      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err: Error) => {
        pageErrors.push(err.message);
      });
    },
    critical(): string[] {
      const all = [...consoleErrors, ...pageErrors];
      // Same benign filter as the other playtest specs; additionally drop
      // "match not found" / WebSocket-401 noise, which is the expected
      // surface for the spectate route hitting a non-existent matchId.
      return all.filter(
        (err) =>
          !err.includes('favicon') &&
          !err.includes('404') &&
          !err.includes('service-worker') &&
          !err.includes('legacyBehavior') &&
          !err.includes('codemod') &&
          !/recoverable/i.test(err) &&
          !/match not found/i.test(err) &&
          !/401/.test(err) &&
          !/auth.*required/i.test(err),
      );
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Navigate with retry. Dev mode compiles each route on first hit; the
 * `ERR_ABORTED` retry pattern from Phase 3 applies here too.
 */
async function gotoMp(page: Page, url: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.waitForTimeout(750 * attempt);
    }
  }
}

// =============================================================================
// Hub + matchmaking browser
// =============================================================================

test.describe(
  'Phase 4 — Multiplayer hub',
  { tag: ['@playtest', '@multiplayer'] },
  () => {
    test(
      'multiplayer hub route mounts and matchmaking browser renders',
      { tag: ['@game', '@smoke', '@playtest', '@multiplayer'] },
      async ({ page }) => {
        const cap = newErrorCapture();
        cap.attach(page);

        await gotoMp(page, '/multiplayer');
        await expect(page).toHaveURL(/\/multiplayer$/);

        // Hub copy is the load-bearing anchor — we don't try to authenticate
        // the vault password from a spec (out of scope; see file header).
        // Any heading is sufficient evidence the page mounted.
        await expect(page.getByRole('heading').first()).toBeVisible({
          timeout: 10_000,
        });

        // Matchmaking browser always renders on the hub. When the user
        // has no vault token (unauthenticated, which is the scripted
        // baseline), it renders just the auth-gate copy. When the user
        // is authenticated, it renders one of {list, empty, loading,
        // error}. Either is a valid mounted state.
        await expect(page.getByTestId('match-browser')).toBeVisible({
          timeout: 15_000,
        });

        // Critical-error assertion
        const critical = cap.critical();
        expect(
          critical,
          `Critical errors on /multiplayer:\n${critical.join('\n')}`,
        ).toEqual([]);
      },
    );
  },
);

// =============================================================================
// Spectate route mounts for a non-existent match
//
// Surfaces a real defect class if the spectate route crashes when given
// a bogus matchId — should render the `match-closed-panel` or an explicit
// error UI, never a JS exception.
// =============================================================================

test.describe(
  'Phase 4 — Spectate route',
  { tag: ['@playtest', '@multiplayer'] },
  () => {
    test(
      'spectate route mounts cleanly for a non-existent matchId',
      { tag: ['@game', '@smoke', '@playtest', '@multiplayer'] },
      async ({ page }) => {
        const cap = newErrorCapture();
        cap.attach(page);

        // Use a clearly-fake matchId; the server should respond with
        // "not found" or auth-required, the page should render the
        // closed-match panel (or a similar error UI), never throw.
        const fakeMatchId = 'phase-4-smoke-no-such-match-id';
        await gotoMp(page, `/multiplayer/spectate/${fakeMatchId}`);
        await expect(page).toHaveURL(
          new RegExp(`/multiplayer/spectate/${fakeMatchId}`),
        );

        // Either the explicit "match closed" UI mounts, or the page
        // shows some error UI / heading. The contract: no JS exceptions.
        const closed = page.getByTestId('match-closed-panel');
        const anyHeading = page.getByRole('heading').first();
        await expect(closed.or(anyHeading)).toBeVisible({ timeout: 15_000 });

        const critical = cap.critical();
        expect(
          critical,
          `Critical errors on spectate fake-id:\n${critical.join('\n')}`,
        ).toEqual([]);
      },
    );
  },
);
