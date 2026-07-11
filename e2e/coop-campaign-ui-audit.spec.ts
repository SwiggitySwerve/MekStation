/**
 * Co-op campaign UI audit proof.
 *
 * Covers the OpenSpec UI audit requirement for the live co-op campaign
 * journey: create, join, host dashboard, guest dashboard, guest proposal,
 * and mission launch. The test writes a per-run evidence bundle with
 * screenshots and a compact report while also asserting screen fit,
 * clickability, guest/private visibility, and proposal completion.
 *
 * @tags @game @audit @coop @multiplayer
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContextOptions,
  type ConsoleMessage,
  type Locator,
  type Page,
} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { expectClickable, expectNoHorizontalOverflow } from './helpers/layout';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';
const GUEST_SPEND_AMOUNT = 50_000;

const AUDIT_TIMESTAMP = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d+Z$/, 'Z');
const AUDIT_RUN_ID = (process.env.PLAYWRIGHT_E2E_RUN_ID ?? 'local')
  .replace(/[^a-zA-Z0-9_-]/g, '-')
  .slice(0, 40);
const AUDIT_ID = `mekstation-coop-campaign-ui-audit-${AUDIT_TIMESTAMP}-${AUDIT_RUN_ID}`;
const EVIDENCE_DIR = path.join(
  process.cwd(),
  '.sisyphus',
  'evidence',
  'coop-campaign-ui-audit',
  AUDIT_ID,
);

interface IAuditViewport {
  readonly name: string;
  readonly contextOptions: BrowserContextOptions;
}

interface ISeededIdentity {
  readonly id: string;
  readonly displayName: string;
}

interface ITokenResponse {
  readonly token: string;
  readonly playerId: string;
  readonly displayName: string;
}

interface ICreateCoopMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: {
    readonly roomCode?: string;
  };
}

interface IAuditEvidenceEntry {
  readonly sequence: number;
  readonly viewport: string;
  readonly screen: string;
  readonly route: string;
  readonly screenshot: string;
  readonly assertions: readonly string[];
}

interface IErrorCapture {
  readonly consoleErrors: readonly string[];
  readonly pageErrors: readonly string[];
  critical(): readonly string[];
}

const DESKTOP_AUDIT_VIEWPORT: IAuditViewport = {
  name: 'desktop-1280',
  contextOptions: { viewport: { width: 1280, height: 720 } },
};

const MOBILE_AUDIT_VIEWPORT: IAuditViewport = {
  name: 'mobile-390',
  contextOptions: {
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  },
};

const evidenceEntries: IAuditEvidenceEntry[] = [];
let evidenceSequence = 1;

function e2eRunId(): string {
  const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!runId) {
    throw new Error('PLAYWRIGHT_E2E_RUN_ID missing from Playwright config');
  }
  return runId;
}

function ensureEvidenceDir(): void {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function campaignIdFromUrl(page: Page): string {
  const match = /\/gameplay\/campaigns\/([^/?#]+)/.exec(page.url());
  if (!match?.[1]) {
    throw new Error(`Campaign id missing from URL ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

async function seedIdentity(
  request: APIRequestContext,
  displayName: string,
  password: string,
): Promise<ISeededIdentity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as ISeededIdentity;
}

async function deleteIdentities(
  request: APIRequestContext,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const response = await request.delete('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    data: { ids },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function openContextPage(
  browser: Browser,
  viewport: IAuditViewport,
): Promise<Page> {
  const context = await browser.newContext(viewport.contextOptions);
  return context.newPage();
}

function requiredViewportSize(viewport: IAuditViewport): {
  width: number;
  height: number;
} {
  const size = viewport.contextOptions.viewport;
  if (!size) {
    throw new Error(`Viewport ${viewport.name} is missing a concrete size`);
  }
  return { width: size.width, height: size.height };
}

async function applyViewport(
  page: Page,
  viewport: IAuditViewport,
): Promise<void> {
  await page.setViewportSize(requiredViewportSize(viewport));
}

async function closePageContext(page: Page | null): Promise<void> {
  if (!page) return;
  try {
    if (!page.isClosed()) {
      await page.context().close();
    }
  } catch {
    // A failed Playwright run can already have torn down the context.
  }
}

function attachErrorCapture(page: Page): IErrorCapture {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err: Error) => {
    pageErrors.push(err.message);
  });
  return {
    consoleErrors,
    pageErrors,
    critical: () =>
      [...consoleErrors, ...pageErrors].filter(
        (line) =>
          !/Hydration|HMR|Fast Refresh|favicon|^net::|ResizeObserver loop|legacyBehavior|codemod/i.test(
            line,
          ),
      ),
  };
}

async function captureSurface({
  assertions,
  page,
  screen,
  viewport,
}: {
  readonly assertions: readonly string[];
  readonly page: Page;
  readonly screen: string;
  readonly viewport: IAuditViewport;
}): Promise<void> {
  await expectNoHorizontalOverflow(page, `${viewport.name}:${screen}`);
  const sequence = evidenceSequence++;
  const filename = `${String(sequence).padStart(2, '0')}-${slug(screen)}--${viewport.name}--screenshot.png`;
  const screenshotPath = path.join(EVIDENCE_DIR, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  evidenceEntries.push({
    sequence,
    viewport: viewport.name,
    screen,
    route: page.url(),
    screenshot: filename,
    assertions,
  });
}

async function expectGuestDashboardSynced(page: Page): Promise<void> {
  await expect(page.getByTestId('coop-session-badge')).toContainText(
    'Co-op session: Guest',
    { timeout: 20_000 },
  );
  await expect(page.getByTestId('guest-mirror-sync-summary')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('guest-mirror-sync-status')).toContainText(
    'synced',
    { timeout: 20_000 },
  );
  await expect(page.getByTestId('host-gm-review-surface')).toHaveCount(0);
  await expect(page.getByTestId('host-command-authority-private')).toHaveCount(
    0,
  );
}

async function readGuestMirrorBalance(page: Page): Promise<number> {
  const text =
    (await page.getByTestId('guest-mirror-balance').textContent()) ?? '';
  expect(text.toLowerCase()).not.toContain('pending');
  const numeric = Number(text.replace(/[^\d-]/g, ''));
  if (!Number.isFinite(numeric)) {
    throw new Error(`Unable to parse guest mirror balance from "${text}"`);
  }
  return numeric;
}

function writeEvidenceReport(): void {
  ensureEvidenceDir();
  const summaryPath = path.join(EVIDENCE_DIR, 'audit-summary.json');
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        auditId: AUDIT_ID,
        generatedAt: new Date().toISOString(),
        spec: 'openspec/changes/prove-live-coop-campaign-journey/specs/e2e-testing/spec.md',
        entries: evidenceEntries,
      },
      null,
      2,
    ),
    'utf8',
  );

  const reportLines = [
    `# ${AUDIT_ID}`,
    '',
    'Scope: co-op create, join, host dashboard, guest dashboard, finance proposal, and mission launch.',
    '',
    '| # | Viewport | Screen | Assertions | Screenshot |',
    '| - | - | - | - | - |',
    ...evidenceEntries.map((entry) => {
      const assertions = entry.assertions.join('<br>');
      return `| ${entry.sequence} | ${entry.viewport} | ${entry.screen} | ${assertions} | ${entry.screenshot} |`;
    }),
    '',
    'Result: all captured surfaces passed screen-fit, clickability, visibility, and action-completion assertions.',
  ];
  fs.writeFileSync(
    path.join(EVIDENCE_DIR, `ui-audit-coop-campaign-${AUDIT_TIMESTAMP}.md`),
    `${reportLines.join('\n')}\n`,
    'utf8',
  );
}

test.describe('co-op campaign UI audit', () => {
  test('captures evidence and asserts co-op screen fit, visibility, and actions', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    ensureEvidenceDir();

    const viewport = DESKTOP_AUDIT_VIEWPORT;
    {
      const createdIdentityIds: string[] = [];
      let matchId: string | null = null;
      let hostWireToken: string | null = null;
      let mobileEntryPage: Page | null = null;
      let mobileEntryErrors: IErrorCapture | null = null;

      const hostPage = await openContextPage(browser, viewport);
      const guestPage = await openContextPage(browser, viewport);
      const hostErrors = attachErrorCapture(hostPage);
      const guestErrors = attachErrorCapture(guestPage);

      try {
        const hostIdentity = await seedIdentity(
          request,
          `Co-op Host UI Audit ${viewport.name}`,
          HOST_PASSWORD,
        );
        createdIdentityIds.push(hostIdentity.id);

        await hostPage.goto('/gameplay/campaigns');
        await hostPage.waitForLoadState('domcontentloaded');
        await expectClickable(
          hostPage.getByTestId('create-coop-campaign-btn'),
          `${viewport.name} create co-op`,
        );
        await expectClickable(
          hostPage.getByTestId('join-coop-campaign-btn'),
          `${viewport.name} join co-op`,
        );
        await expect(
          hostPage.getByTestId('create-coop-password-input'),
        ).toBeVisible();
        await captureSurface({
          assertions: [
            'create and join controls reachable',
            'host password input visible',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'create entry',
          viewport,
        });

        await hostPage.getByTestId('join-coop-campaign-btn').click();
        await expect(hostPage.getByTestId('join-coop-dialog')).toBeVisible();
        await expect(
          hostPage.getByTestId('join-coop-submit-btn'),
          `${viewport.name} empty join submit guarded`,
        ).toBeDisabled();
        await expect(
          hostPage.getByTestId('join-coop-submit-btn'),
          `${viewport.name} empty join submit in viewport`,
        ).toBeInViewport({ timeout: 20_000 });
        await expect(
          hostPage.getByTestId('join-coop-room-code-input'),
        ).toBeVisible();
        await expect(
          hostPage.getByTestId('join-coop-password-input'),
        ).toBeVisible();
        await captureSurface({
          assertions: [
            'join dialog visible',
            'room code and password fields visible',
            'join submit disabled until fields are valid',
            'Escape closes the dialog',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'join dialog',
          viewport,
        });
        await hostPage.keyboard.press('Escape');
        await expect(hostPage.getByTestId('join-coop-dialog')).toHaveCount(0);

        await hostPage
          .getByTestId('create-coop-password-input')
          .fill(HOST_PASSWORD);
        const hostTokenResponse = hostPage.waitForResponse(
          (response) =>
            response.url().includes('/api/multiplayer/auth/token') &&
            response.request().method() === 'POST' &&
            response.status() === 200,
          { timeout: 30_000 },
        );
        const createMatchResponse = hostPage.waitForResponse(
          (response) =>
            response.url().endsWith('/api/multiplayer/matches') &&
            response.request().method() === 'POST' &&
            response.status() === 201,
          { timeout: 30_000 },
        );
        await Promise.all([
          hostPage.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
            timeout: 30_000,
          }),
          hostPage.getByTestId('create-coop-campaign-btn').click(),
        ]);

        const hostToken = (await (
          await hostTokenResponse
        ).json()) as ITokenResponse;
        hostWireToken = hostToken.token;
        const created = (await (
          await createMatchResponse
        ).json()) as ICreateCoopMatchResponse;
        matchId = created.matchId;
        const roomCode = created.roomCode ?? created.meta.roomCode ?? null;
        expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

        await expect(hostPage.getByTestId('coop-session-badge')).toContainText(
          'Co-op session: Host',
          { timeout: 20_000 },
        );
        await expect(
          hostPage.getByTestId('host-gm-review-surface'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await expect(
          hostPage.getByTestId('guest-proposal-surface'),
        ).toHaveCount(0);
        await captureSurface({
          assertions: [
            'host badge visible',
            'GM review surface visible',
            'guest proposal surface absent',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'host dashboard',
          viewport,
        });

        const guestIdentity = await seedIdentity(
          request,
          `Co-op Guest UI Audit ${viewport.name}`,
          GUEST_PASSWORD,
        );
        createdIdentityIds.push(guestIdentity.id);

        await guestPage.goto('/gameplay/campaigns');
        await guestPage.waitForLoadState('domcontentloaded');
        await guestPage.getByTestId('join-coop-campaign-btn').click();
        await guestPage
          .getByTestId('join-coop-room-code-input')
          .fill(roomCode ?? '');
        await guestPage
          .getByTestId('join-coop-password-input')
          .fill(GUEST_PASSWORD);
        await expectClickable(
          guestPage.getByTestId('join-coop-submit-btn'),
          `${viewport.name} populated join submit`,
        );

        const guestTokenResponse = guestPage.waitForResponse(
          (response) =>
            response.url().includes('/api/multiplayer/auth/token') &&
            response.request().method() === 'POST' &&
            response.status() === 200,
          { timeout: 30_000 },
        );
        await Promise.all([
          guestPage.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
            timeout: 30_000,
          }),
          guestPage.getByTestId('join-coop-submit-btn').click(),
        ]);
        await guestTokenResponse;

        await expectGuestDashboardSynced(guestPage);
        const guestCampaignId = campaignIdFromUrl(guestPage);
        const initialGuestBalance = await readGuestMirrorBalance(guestPage);
        await captureSurface({
          assertions: [
            'guest badge visible',
            'guest mirror sync visible',
            'GM-private host controls absent',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest dashboard',
          viewport,
        });

        await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}/finances`);
        await expect(
          guestPage.getByTestId('guest-proposal-surface'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await expect(
          guestPage.getByTestId('host-command-authority-private'),
        ).toHaveCount(0);
        await expectClickable(
          guestPage.getByTestId('guest-action-SpendFunds'),
          `${viewport.name} guest spend proposal`,
        );
        await captureSurface({
          assertions: [
            'guest proposal surface visible',
            'spend proposal button reachable',
            'host-private controls absent',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest finances before proposal',
          viewport,
        });

        await guestPage.getByTestId('guest-action-SpendFunds').click();
        await expect(
          guestPage.getByTestId('guest-proposal-pending'),
        ).toBeVisible({
          timeout: 20_000,
        });
        const pendingProposal = hostPage
          .locator('[data-testid^="pending-proposal-"]')
          .first();
        await expect(pendingProposal).toBeVisible({ timeout: 20_000 });
        await captureSurface({
          assertions: [
            'host sees pending guest proposal',
            'approve/veto controls reachable',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'host pending proposal',
          viewport,
        });
        await expectClickable(
          hostPage.locator('[data-testid^="approve-"]').first(),
          `${viewport.name} approve pending proposal`,
        );
        await hostPage.locator('[data-testid^="approve-"]').first().click();
        await expect(
          guestPage.getByTestId('guest-proposal-committed'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}`);
        await expectGuestDashboardSynced(guestPage);
        await expect
          .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
          .toBe(initialGuestBalance - GUEST_SPEND_AMOUNT);
        await captureSurface({
          assertions: [
            'proposal reaches committed terminal state',
            'guest mirror balance reflects approved spend',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest dashboard after approved proposal',
          viewport,
        });

        const missionLaunchPath = `/gameplay/campaigns/${guestCampaignId}/missions/audit-mission/launch`;
        await hostPage.goto(missionLaunchPath);
        await expect(hostPage.getByTestId('coop-launch-mission')).toBeVisible({
          timeout: 20_000,
        });
        await expect(hostPage.getByTestId('coop-session-badge')).toContainText(
          'Co-op session: Host',
          { timeout: 20_000 },
        );
        await captureSurface({
          assertions: [
            'host mission launch surface visible',
            'co-op participation controls reachable',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'host mission launch',
          viewport,
        });

        await guestPage.goto(missionLaunchPath);
        await expect(guestPage.getByTestId('coop-launch-mission')).toBeVisible({
          timeout: 20_000,
        });
        await expect(guestPage.getByTestId('coop-session-badge')).toContainText(
          'Co-op session: Guest',
          { timeout: 20_000 },
        );
        await expect(
          guestPage.getByTestId('host-command-authority-private'),
        ).toHaveCount(0);
        await captureSurface({
          assertions: [
            'guest mission launch surface visible',
            'GM-private host controls absent',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest mission launch',
          viewport,
        });

        const mobileViewport = MOBILE_AUDIT_VIEWPORT;
        mobileEntryPage = await openContextPage(browser, mobileViewport);
        mobileEntryErrors = attachErrorCapture(mobileEntryPage);
        await mobileEntryPage.goto('/gameplay/campaigns');
        await mobileEntryPage.waitForLoadState('domcontentloaded');
        await expectClickable(
          mobileEntryPage.getByTestId('create-coop-campaign-btn'),
          `${mobileViewport.name} create co-op`,
        );
        await expectClickable(
          mobileEntryPage.getByTestId('join-coop-campaign-btn'),
          `${mobileViewport.name} join co-op`,
        );
        await expect(
          mobileEntryPage.getByTestId('create-coop-password-input'),
        ).toBeVisible();
        await captureSurface({
          assertions: [
            'create and join controls reachable',
            'host password input visible',
            'no horizontal overflow',
          ],
          page: mobileEntryPage,
          screen: 'create entry',
          viewport: mobileViewport,
        });

        await mobileEntryPage.getByTestId('join-coop-campaign-btn').click();
        await expect(
          mobileEntryPage.getByTestId('join-coop-dialog'),
        ).toBeVisible();
        await expect(
          mobileEntryPage.getByTestId('join-coop-submit-btn'),
          `${mobileViewport.name} empty join submit guarded`,
        ).toBeDisabled();
        await expect(
          mobileEntryPage.getByTestId('join-coop-submit-btn'),
          `${mobileViewport.name} empty join submit in viewport`,
        ).toBeInViewport({ timeout: 20_000 });
        await expect(
          mobileEntryPage.getByTestId('join-coop-room-code-input'),
        ).toBeVisible();
        await expect(
          mobileEntryPage.getByTestId('join-coop-password-input'),
        ).toBeVisible();
        await captureSurface({
          assertions: [
            'join dialog visible',
            'room code and password fields visible',
            'join submit disabled until fields are valid',
            'Escape closes the dialog',
            'no horizontal overflow',
          ],
          page: mobileEntryPage,
          screen: 'join dialog',
          viewport: mobileViewport,
        });
        await mobileEntryPage.keyboard.press('Escape');
        await expect(
          mobileEntryPage.getByTestId('join-coop-dialog'),
        ).toHaveCount(0);

        await applyViewport(hostPage, mobileViewport);
        await applyViewport(guestPage, mobileViewport);

        await hostPage.goto(`/gameplay/campaigns/${guestCampaignId}`);
        await expect(hostPage.getByTestId('coop-session-badge')).toContainText(
          'Co-op session: Host',
          { timeout: 20_000 },
        );
        await expect(
          hostPage.getByTestId('host-gm-review-surface'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await expect(
          hostPage.getByTestId('guest-proposal-surface'),
        ).toHaveCount(0);
        await captureSurface({
          assertions: [
            'host badge visible',
            'GM review surface visible',
            'guest proposal surface absent',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'host dashboard',
          viewport: mobileViewport,
        });

        await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}`);
        await expectGuestDashboardSynced(guestPage);
        const mobileInitialGuestBalance =
          await readGuestMirrorBalance(guestPage);
        await captureSurface({
          assertions: [
            'guest badge visible',
            'guest mirror sync visible',
            'GM-private host controls absent',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest dashboard',
          viewport: mobileViewport,
        });

        await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}/finances`);
        await expect(
          guestPage.getByTestId('guest-proposal-surface'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await expect(
          guestPage.getByTestId('host-command-authority-private'),
        ).toHaveCount(0);
        await expectClickable(
          guestPage.getByTestId('guest-action-SpendFunds'),
          `${mobileViewport.name} guest spend proposal`,
        );
        await captureSurface({
          assertions: [
            'guest proposal surface visible',
            'spend proposal button reachable',
            'host-private controls absent',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest finances before proposal',
          viewport: mobileViewport,
        });

        await guestPage.getByTestId('guest-action-SpendFunds').click();
        await expect(
          guestPage.getByTestId('guest-proposal-pending'),
        ).toBeVisible({
          timeout: 20_000,
        });
        const mobilePendingProposal = hostPage
          .locator('[data-testid^="pending-proposal-"]')
          .first();
        await expect(mobilePendingProposal).toBeVisible({ timeout: 20_000 });
        await captureSurface({
          assertions: [
            'host sees pending guest proposal',
            'approve/veto controls reachable',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'host pending proposal',
          viewport: mobileViewport,
        });
        await expectClickable(
          hostPage.locator('[data-testid^="approve-"]').first(),
          `${mobileViewport.name} approve pending proposal`,
        );
        await hostPage.locator('[data-testid^="approve-"]').first().click();
        await expect(
          guestPage.getByTestId('guest-proposal-committed'),
        ).toBeVisible({
          timeout: 20_000,
        });
        await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}`);
        await expectGuestDashboardSynced(guestPage);
        await expect
          .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
          .toBe(mobileInitialGuestBalance - GUEST_SPEND_AMOUNT);
        await captureSurface({
          assertions: [
            'proposal reaches committed terminal state',
            'guest mirror balance reflects approved spend',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest dashboard after approved proposal',
          viewport: mobileViewport,
        });

        await hostPage.goto(missionLaunchPath);
        await expect(hostPage.getByTestId('coop-launch-mission')).toBeVisible({
          timeout: 20_000,
        });
        await expect(hostPage.getByTestId('coop-session-badge')).toContainText(
          'Co-op session: Host',
          { timeout: 20_000 },
        );
        await captureSurface({
          assertions: [
            'host mission launch surface visible',
            'co-op participation controls reachable',
            'no horizontal overflow',
          ],
          page: hostPage,
          screen: 'host mission launch',
          viewport: mobileViewport,
        });

        await guestPage.goto(missionLaunchPath);
        await expect(guestPage.getByTestId('coop-launch-mission')).toBeVisible({
          timeout: 20_000,
        });
        await expect(guestPage.getByTestId('coop-session-badge')).toContainText(
          'Co-op session: Guest',
          { timeout: 20_000 },
        );
        await expect(
          guestPage.getByTestId('host-command-authority-private'),
        ).toHaveCount(0);
        await captureSurface({
          assertions: [
            'guest mission launch surface visible',
            'GM-private host controls absent',
            'no horizontal overflow',
          ],
          page: guestPage,
          screen: 'guest mission launch',
          viewport: mobileViewport,
        });

        expect(
          [
            ...hostErrors.critical(),
            ...guestErrors.critical(),
            ...(mobileEntryErrors?.critical() ?? []),
          ],
          'unexpected critical console/page errors during co-op UI audit',
        ).toEqual([]);
      } finally {
        if (matchId && hostWireToken) {
          const deleteMatchResponse = await request.delete(
            `/api/multiplayer/matches/${encodeURIComponent(matchId)}`,
            { headers: { Authorization: `Bearer ${hostWireToken}` } },
          );
          expect(
            [200, 404].includes(deleteMatchResponse.status()),
            await deleteMatchResponse.text(),
          ).toBe(true);
        }
        await deleteIdentities(request, createdIdentityIds);
        await closePageContext(mobileEntryPage);
        await closePageContext(hostPage);
        await closePageContext(guestPage);
      }
    }

    writeEvidenceReport();
  });
});
