/**
 * Authority-order pack (E2E-04 / E2E-07).
 *
 * E2E-04 reads SQLite before any page is polled for the new phase because
 * appendCommandBatch writes identity, events, outbox, receipt, and head
 * in one transaction. Events-then-receipt would leave sequences with no
 * covering receipt on that first read.
 *
 * E2E-07 fires two GoProne intents without awaiting between them.
 * intentChain serializes validate/reduce/batch/publish per match, so the
 * two first/last ranges cannot weave.
 *
 * AdvancePhase is the E2E-04 door (Movement → Weapon Attack already
 * works in the exactly-once pack; resilience measured ~3 events per
 * command). Attack composer would be the fallback if event_count were 1.
 *
 * matchAuthorityEvidence.ts is not in this worktree — reader is local.
 *
 * @tags @authority-order @E2E-04 @E2E-07
 */

import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

import { openSqliteEvidenceReader } from './fixtures/sqliteEvidenceReader';
import {
  advancePhase,
  deleteIdentities,
  e2eRunId,
  launchOneVersusOne,
  openContextPage,
  seedIdentity,
  tapErrorFrames,
} from './helpers/gmTwoPlayerMatchFlow';

const HOST_PASSWORD = 'AuthorityOrderHost123!';
const GUEST_PASSWORD = 'AuthorityOrderGuest123!';
const SPECTATOR_PASSWORD = 'AuthorityOrderSpec123!';

interface IReceiptRow {
  readonly command_id: string;
  readonly actor_id: string;
  readonly first_revision: number;
  readonly last_revision: number;
  readonly event_count: number;
}

interface IStoreSnapshot {
  readonly hash: string;
  readonly eventCount: number;
  readonly playerIds: readonly string[];
  readonly receipts: readonly IReceiptRow[];
  readonly sequences: readonly number[];
}

/** Resilience-pack SELECT shape, opened read-only like the failure pack. */
function readStore(matchId: string): IStoreSnapshot {
  const reader = openSqliteEvidenceReader(
    path.resolve('.sisyphus/e2e-runtime', e2eRunId(), 'multiplayer-matches.db'),
  );
  try {
    const match = reader.select<{ metaJson: string }>(
      'SELECT status, room_code AS roomCode, meta_json AS metaJson FROM mp_matches WHERE match_id = ?',
      [matchId],
    )[0];
    const events = reader.select<{ n: number }>(
      'SELECT COUNT(*) AS n, COALESCE(MAX(sequence), -1) AS maxSeq FROM mp_match_events WHERE match_id = ?',
      [matchId],
    )[0];
    const receipts = reader.select<IReceiptRow>(
      'SELECT command_id, actor_id, first_revision, last_revision, event_count FROM mp_command_receipts WHERE match_id = ? ORDER BY first_revision',
      [matchId],
    );
    reader.select(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN published_at IS NULL THEN 1 ELSE 0 END) AS pending FROM mp_match_outbox WHERE match_id = ?`,
      [matchId],
    );
    reader.select(
      'SELECT player_id AS playerId, MAX(delivery_sequence) AS cursor FROM mp_viewer_delivery WHERE match_id = ? GROUP BY player_id',
      [matchId],
    );
    reader.select(
      'SELECT player_id AS playerId, MAX(delivery_sequence) AS cursor FROM mp_viewer_delivery_ack WHERE match_id = ? GROUP BY player_id',
      [matchId],
    );
    const parsed = match
      ? (JSON.parse(match.metaJson) as { playerIds?: unknown })
      : {};
    return {
      hash: reader.fileHash(),
      eventCount: events?.n ?? 0,
      playerIds: Array.isArray(parsed.playerIds)
        ? parsed.playerIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      receipts,
      sequences: reader
        .select<{ sequence: number }>(
          'SELECT sequence FROM mp_match_events WHERE match_id = ? ORDER BY sequence',
          [matchId],
        )
        .map((row) => row.sequence),
    };
  } finally {
    reader.close();
  }
}

function assertContiguousBatch(
  receipt: IReceiptRow,
  sequences: readonly number[],
): void {
  const inRange = sequences.filter(
    (sequence) =>
      sequence >= receipt.first_revision && sequence <= receipt.last_revision,
  );
  // Hardcoded event_count=1 fails here while first/last still span the batch.
  expect(receipt.last_revision).toBe(
    receipt.first_revision + receipt.event_count - 1,
  );
  expect(receipt.event_count).toBe(inRange.length);
  expect(receipt.event_count).toBeGreaterThan(1);
}

/** Sides are absolute: host force is `player`, guest force is `opponent`. */
async function unitIdOnSide(
  page: Page,
  side: 'player' | 'opponent',
): Promise<string> {
  const tokens = page.locator('[data-testid^="unit-token-"]');
  await expect
    .poll(() => tokens.count(), { timeout: 30_000 })
    .toBeGreaterThan(0);
  const total = await tokens.count();
  for (let index = 0; index < total; index += 1) {
    const token = tokens.nth(index);
    const label = (await token.getAttribute('aria-label')) ?? '';
    if (!label.includes(`side ${side}`)) continue;
    const testId = (await token.getAttribute('data-testid')) ?? '';
    if (testId.startsWith('unit-token-'))
      return testId.slice('unit-token-'.length);
  }
  throw new Error(`No rendered token on side ${side}`);
}

function goProneIntent(
  matchId: string,
  playerId: string,
  unitId: string,
  intentId: string,
): Record<string, unknown> {
  return {
    kind: 'Intent',
    matchId,
    ts: new Date().toISOString(),
    playerId,
    intentId,
    intent: { kind: 'GoProne', unitId },
  };
}

test('E2E-04 a multi-event combat batch is committed before any context renders it @authority-order @E2E-04', async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  let identityIds: readonly string[] = [];
  try {
    const launched = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Authority Order Host',
      guestName: 'Authority Order Guest',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
    });
    identityIds = launched.identityIds;
    const before = readStore(launched.match.matchId);
    // Helper clicks only — it does not wait for the phase text.
    await advancePhase(hostPage, guestPage);
    await expect
      .poll(() => readStore(launched.match.matchId).eventCount, {
        timeout: 20_000,
      })
      .toBeGreaterThan(before.eventCount);
    const first = readStore(launched.match.matchId);
    const created = first.receipts.filter(
      (row) =>
        !before.receipts.some((prior) => prior.command_id === row.command_id),
    );
    expect(created).toHaveLength(1);
    const receipt = created[0];
    if (!receipt)
      throw new Error('AdvancePhase wrote events without a receipt');
    expect(
      first.receipts.filter((row) => row.command_id === receipt.command_id),
    ).toHaveLength(1);
    assertContiguousBatch(receipt, first.sequences);
    const second = readStore(launched.match.matchId);
    expect(second.hash).toBe(first.hash);
    expect(
      second.receipts.find((row) => row.command_id === receipt.command_id),
    ).toEqual(receipt);
    await expect(hostPage.getByTestId('phase-name')).toContainText(
      /Weapon Attack/i,
      {
        timeout: 30_000,
      },
    );
    await expect(guestPage.getByTestId('phase-name')).toContainText(
      /Weapon Attack/i,
    );
  } finally {
    await deleteIdentities(request, identityIds).catch(() => undefined);
    await hostPage.context().close();
    await guestPage.context().close();
  }
});

test('E2E-07 concurrent owned commands serialize into two non-interleaved batches @authority-order @E2E-07', async ({
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const spectatorPage = await openContextPage(browser);
  const hostTap = tapErrorFrames(hostPage);
  const guestTap = tapErrorFrames(guestPage);
  await hostTap.install();
  await guestTap.install();
  let identityIds: string[] = [];
  try {
    const launched = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Authority Order P1',
      guestName: 'Authority Order P2',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
    });
    identityIds = [...launched.identityIds];
    // Seed last so mintToken on the spectate page unlocks this vault.
    const spectator = await seedIdentity(
      request,
      'Authority Order Spectator',
      SPECTATOR_PASSWORD,
    );
    identityIds.push(spectator.id);
    await spectatorPage.goto(`/multiplayer/spectate/${launched.match.matchId}`);
    await spectatorPage
      .getByPlaceholder('Vault password')
      .fill(SPECTATOR_PASSWORD);
    await spectatorPage.getByRole('button', { name: 'Watch match' }).click();
    await expect(
      spectatorPage.getByTestId('networked-game-surface'),
    ).toBeVisible({
      timeout: 30_000,
    });
    const guestPlayerId = readStore(launched.match.matchId).playerIds.find(
      (id) => id !== launched.hostToken.playerId,
    );
    if (!guestPlayerId)
      throw new Error('Match meta lacked the guest player id');
    const hostUnitId = await unitIdOnSide(hostPage, 'player');
    const guestUnitId = await unitIdOnSide(guestPage, 'opponent');
    const hostCommandId = `authority-order-p1-${crypto.randomUUID()}`;
    const guestCommandId = `authority-order-p2-${crypto.randomUUID()}`;
    await Promise.all([
      Promise.resolve(
        hostTap.inject(
          goProneIntent(
            launched.match.matchId,
            launched.hostToken.playerId,
            hostUnitId,
            hostCommandId,
          ),
        ),
      ),
      Promise.resolve(
        guestTap.inject(
          goProneIntent(
            launched.match.matchId,
            guestPlayerId,
            guestUnitId,
            guestCommandId,
          ),
        ),
      ),
    ]);
    await expect
      .poll(
        () => {
          const ids = new Set(
            readStore(launched.match.matchId).receipts.map(
              (row) => row.command_id,
            ),
          );
          return ids.has(hostCommandId) && ids.has(guestCommandId);
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    const after = readStore(launched.match.matchId);
    const batchA = after.receipts.find(
      (row) => row.command_id === hostCommandId,
    );
    const batchB = after.receipts.find(
      (row) => row.command_id === guestCommandId,
    );
    if (!batchA || !batchB) throw new Error('Missing concurrent receipts');
    expect(batchA.command_id).not.toBe(batchB.command_id);
    expect(batchA.actor_id).not.toBe(batchB.actor_id);
    expect(
      batchA.last_revision < batchB.first_revision ||
        batchB.last_revision < batchA.first_revision,
    ).toBe(true);
    for (const page of [hostPage, guestPage, spectatorPage]) {
      await expect(page.getByTestId('phase-name')).toContainText(/Movement/i, {
        timeout: 30_000,
      });
      await expect(page.getByTestId(`unit-token-${hostUnitId}`)).toHaveCount(1);
      await expect(page.getByTestId(`unit-token-${guestUnitId}`)).toHaveCount(
        1,
      );
    }
  } finally {
    await deleteIdentities(request, identityIds).catch(() => undefined);
    await hostPage.context().close();
    await guestPage.context().close();
    await spectatorPage.context().close();
  }
});
