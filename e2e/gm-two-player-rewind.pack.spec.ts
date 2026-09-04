/**
 * Rewind pack (E2E-40 / 41 / 42 / 43 / 44 / 76).
 *
 * Strict expected failures until adopt-combat-journal-cutover-and-gm-rewind:
 * the combat stream is never journaled (finding #48), so preview/commit
 * answer 404 no-authoritative-history and STALE_BRANCH is unreachable.
 * Bare group name `rewind` stays free.
 *
 * @tags @rewind-pack @E2E-40 @E2E-41 @E2E-42 @E2E-43 @E2E-44 @E2E-76
 */

import { expect, test } from '@playwright/test';

import {
  deleteIdentities,
  launchOneVersusOne,
  openContextPage,
  seedIdentity,
} from './helpers/gmTwoPlayerMatchFlow';
import {
  REWIND_GUEST_PASSWORD,
  REWIND_HOST_PASSWORD,
  RESYNC_ACTION,
  intentFrame,
  parseError,
  postRewind,
  previewThenCommit,
  readLineage,
  rewindCas,
  storeCensus,
  tokenProjection,
  unitIdOnSide,
  withRewindMatch,
  type IMatchToken,
} from './helpers/gmTwoPlayerRewind';

const SPECTATOR_PASSWORD = 'RewindPackSpec123!';

test('E2E-40 combat rewind creates replacement branch @rewind-pack @E2E-40', async ({
  browser,
  request,
}) => {
  test.fail(
    true,
    'E2E-40 combat rewind creates replacement branch @until-journal-cutover',
  );
  test.setTimeout(240_000);
  await withRewindMatch(browser, request, async (match) => {
    const committed = await previewThenCommit(
      request,
      match.matchId,
      match.hostToken.token,
      rewindCas(match.matchId),
    );
    const lineage = await readLineage(
      request,
      match.matchId,
      match.hostToken.token,
    );
    expect(lineage.effectiveHead?.branchId).toBe(committed.activatedBranchId);
    expect(committed.activatedBranchId).not.toBe(committed.priorBranchId);
    expect(
      lineage.transitions.some(
        (row) =>
          row.fromBranchId === committed.priorBranchId &&
          row.toBranchId === committed.activatedBranchId,
      ),
    ).toBe(true);
  });
});

test('E2E-41 stale branch command rejects @rewind-pack @E2E-41', async ({
  browser,
  request,
}) => {
  test.fail(true, 'E2E-41 stale branch command rejects @until-journal-cutover');
  test.setTimeout(240_000);
  await withRewindMatch(browser, request, async (match) => {
    const cas = rewindCas(match.matchId);
    const committed = await previewThenCommit(
      request,
      match.matchId,
      match.hostToken.token,
      cas,
    );
    const unitId = await unitIdOnSide(match.hostPage, 'player');
    const eventsBefore = storeCensus(match.matchId).events;
    const intentId = `rewind-e2e41-${crypto.randomUUID()}`;
    match.hostTap.inject(
      intentFrame(
        match.matchId,
        match.hostToken.playerId,
        intentId,
        { kind: 'GoProne', unitId },
        { ...cas, expectedBranchId: committed.priorBranchId },
      ),
    );
    // WHAT: the refusal frame for this intent id. WHY: found after the
    // poll rather than assigned inside it, so the type stays narrow.
    const findRefusal = (): ReturnType<typeof parseError> =>
      match.hostTap.received
        .map((raw) => parseError(raw))
        .find((frame) => frame?.intentId === intentId) ?? null;
    await expect
      .poll(() => findRefusal() !== null, { timeout: 20_000 })
      .toBe(true);
    const refusal = findRefusal();
    expect(refusal?.code).toBe('STALE_BRANCH');
    expect(refusal?.branchId).toBe(committed.activatedBranchId);
    expect(refusal?.recoveryAction).toBe(RESYNC_ACTION);
    expect(storeCensus(match.matchId).events).toBe(eventsBefore);
  });
});

test('E2E-42 all contexts converge on new head @rewind-pack @E2E-42', async ({
  browser,
  request,
}) => {
  test.fail(
    true,
    'E2E-42 all contexts converge on new head @until-journal-cutover',
  );
  test.setTimeout(240_000);
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const spectatorPage = await openContextPage(browser);
  const guestTokenWait = guestPage.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/auth/token') &&
      response.request().method() === 'POST' &&
      response.status() === 200,
    { timeout: 30_000 },
  );
  let identityIds: string[] = [];
  try {
    const launched = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Rewind Pack Host',
      guestName: 'Rewind Pack Guest',
      hostPassword: REWIND_HOST_PASSWORD,
      guestPassword: REWIND_GUEST_PASSWORD,
    });
    identityIds = [...launched.identityIds];
    const guestToken = (await (await guestTokenWait).json()) as IMatchToken;
    const spectator = await seedIdentity(
      request,
      'Rewind Pack Spectator',
      SPECTATOR_PASSWORD,
    );
    identityIds.push(spectator.id);
    const spectatorTokenWait = spectatorPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    );
    await spectatorPage.goto(`/multiplayer/spectate/${launched.match.matchId}`);
    await spectatorPage
      .getByPlaceholder('Vault password')
      .fill(SPECTATOR_PASSWORD);
    await spectatorPage.getByRole('button', { name: 'Watch match' }).click();
    await expect(
      spectatorPage.getByTestId('networked-game-surface'),
    ).toBeVisible({ timeout: 30_000 });
    const spectatorToken = (await (
      await spectatorTokenWait
    ).json()) as IMatchToken;
    const committed = await previewThenCommit(
      request,
      launched.match.matchId,
      launched.hostToken.token,
      rewindCas(launched.match.matchId),
    );
    const heads = await Promise.all(
      [launched.hostToken.token, guestToken.token, spectatorToken.token].map(
        (token) => readLineage(request, launched.match.matchId, token),
      ),
    );
    for (const lineage of heads) {
      expect(lineage.effectiveHead?.branchId).toBe(committed.activatedBranchId);
      expect(lineage.effectiveHead?.revision).toBe(
        heads[0]?.effectiveHead?.revision,
      );
    }
  } finally {
    await deleteIdentities(request, identityIds).catch(() => undefined);
    await hostPage.context().close();
    await guestPage.context().close();
    await spectatorPage.context().close();
  }
});

test('E2E-43 fog restores after rewind @rewind-pack @E2E-43', async ({
  browser,
  request,
}) => {
  test.fail(true, 'E2E-43 fog restores after rewind @until-journal-cutover');
  test.setTimeout(240_000);
  await withRewindMatch(browser, request, async (match) => {
    const hostUnitId = await unitIdOnSide(match.hostPage, 'player');
    const checkpointGuest = await tokenProjection(match.guestPage, hostUnitId);
    const hex = (checkpointGuest.position ?? '0,0').split(',');
    const originQ = Number(hex[0]);
    const originR = Number(hex[1]);
    const facing = Number(
      (await match.hostPage
        .getByTestId(`unit-token-${hostUnitId}`)
        .getAttribute('data-token-facing')) ?? '0',
    );
    match.hostTap.inject(
      intentFrame(
        match.matchId,
        match.hostToken.playerId,
        `rewind-e2e43-move-${crypto.randomUUID()}`,
        {
          kind: 'Move',
          unitId: hostUnitId,
          to: { q: originQ + 1, r: originR },
          facing: Number.isFinite(facing) ? facing : 0,
          movementType: 'walk',
        },
      ),
    );
    await match.hostPage.waitForTimeout(2_000);
    const revealed = `${originQ + 1},${originR}`;
    await previewThenCommit(
      request,
      match.matchId,
      match.hostToken.token,
      rewindCas(match.matchId),
    );
    const restoredHost = await tokenProjection(match.hostPage, hostUnitId);
    const restoredGuest = await tokenProjection(match.guestPage, hostUnitId);
    expect(restoredGuest.position).not.toBe(revealed);
    expect(restoredGuest.position).toBe(checkpointGuest.position);
    expect(restoredGuest.fogStatus).toBe(checkpointGuest.fogStatus);
    expect(restoredHost.fogStatus ?? restoredGuest.fogStatus).toBe(
      checkpointGuest.fogStatus,
    );
  });
});

test('E2E-44 offline player catches up after rewind @rewind-pack @E2E-44', async ({
  browser,
  request,
}) => {
  test.fail(
    true,
    'E2E-44 offline player catches up after rewind @until-journal-cutover',
  );
  test.setTimeout(240_000);
  await withRewindMatch(browser, request, async (match) => {
    const cas = rewindCas(match.matchId);
    const preview = await postRewind(
      request,
      match.matchId,
      match.hostToken.token,
      'rewind-preview',
      cas,
    );
    expect(preview.status(), await preview.text()).toBe(200);
    const commitStarted = postRewind(
      request,
      match.matchId,
      match.hostToken.token,
      'rewind-commit',
      cas,
    );
    await match.guestPage.reload({ waitUntil: 'domcontentloaded' });
    const commit = await commitStarted;
    expect(commit.status(), await commit.text()).toBe(200);
    const body = (await commit.json()) as {
      readonly kind?: string;
      readonly activatedBranchId?: string;
      readonly priorBranchId?: string;
    };
    expect(body.kind).toBe('committed');
    await expect(
      match.guestPage.getByTestId('networked-game-surface'),
    ).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(
        () =>
          match.guestTap.received.some((raw) => {
            try {
              const parsed: unknown = JSON.parse(raw);
              if (typeof parsed !== 'object' || parsed === null) return false;
              const kind = (parsed as { kind?: unknown }).kind;
              return kind === 'ReplayEnd' || kind === 'MatchResumed';
            } catch {
              return false;
            }
          }),
        { timeout: 60_000 },
      )
      .toBe(true);
    const lineage = await readLineage(
      request,
      match.matchId,
      match.hostToken.token,
    );
    expect(lineage.effectiveHead?.branchId).toBe(body.activatedBranchId);
    expect(lineage.effectiveHead?.branchId).not.toBe(body.priorBranchId);
  });
});

test('E2E-76 rewind confirmation prevents accidental invalidation @rewind-pack @E2E-76', async ({
  browser,
  request,
}) => {
  test.fail(
    true,
    'E2E-76 rewind confirmation prevents accidental invalidation @until-journal-cutover',
  );
  test.setTimeout(240_000);
  await withRewindMatch(browser, request, async (match) => {
    const eventsBefore = storeCensus(match.matchId).events;
    const previewBtn = match.hostPage.getByTestId(
      'networked-gm-rewind-preview-btn',
    );
    await expect(previewBtn).toBeVisible({ timeout: 20_000 });
    await expect(previewBtn).toBeEnabled();
    await previewBtn.click();
    const dialog = match.hostPage.getByTestId('gm-rewind-preview-dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    const assertChrome = async (): Promise<void> => {
      await expect(
        match.hostPage.getByTestId('gm-rewind-preview-blast-radius'),
      ).toBeVisible();
      await expect(
        match.hostPage.getByTestId('gm-rewind-preview-actions'),
      ).toBeVisible();
      const confirm = match.hostPage.getByTestId('gm-rewind-confirm');
      const cancel = match.hostPage.getByTestId('gm-rewind-cancel');
      await expect(confirm).toBeVisible();
      await expect(cancel).toBeVisible();
      await expect(confirm).toBeFocused();
      await match.hostPage.keyboard.press('Tab');
      await expect(cancel).toBeFocused();
      await match.hostPage.keyboard.press('Tab');
      await expect(confirm).toBeFocused();
    };
    await assertChrome();
    await match.hostPage.setViewportSize({ width: 375, height: 812 });
    await assertChrome();
    await match.hostPage.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(storeCensus(match.matchId).events).toBe(eventsBefore);
    await expect(previewBtn).toBeVisible();
    await expect(previewBtn).toBeEnabled();
  });
});
