/**
 * E2E-14 evidence: SQLite snapshots, bound assertions, and the
 * post-Movement inject loop. Launch/socket install stays in
 * `viewerUnackedBound.ts`. Bound is unacked frames (cap 64), not
 * `socket.bufferedAmount`.
 */

import { expect, type Page } from '@playwright/test';

import { e2eRunId, hostOwnedUnitId } from './gmTwoPlayerMatchFlow';

export interface IIntentTap {
  readonly inject: (frame: unknown) => void;
  readonly sent: readonly string[];
  readonly install: () => Promise<void>;
}

/** Lockstep with `ViewerDeliveryCursors.MAX_VIEWER_UNACKED`. */
export const VIEWER_UNACKED_CAP = 64;
export interface IViewerIssuedAck {
  readonly issued: number;
  readonly lastAcked: number | undefined;
}

export interface IViewerDeliveryRow {
  readonly playerId: string;
  readonly deliverySequence: number;
  readonly authoritySequence: number;
}

export interface IViewerBoundEvidence {
  readonly status: string | null;
  readonly maxSequence: number;
  readonly byPlayer: Readonly<Record<string, IViewerIssuedAck>>;
  readonly deliveryRows: readonly IViewerDeliveryRow[];
}

/**
 * Same window `ViewerDeliveryCursors.unacked` uses: issued when never
 * acked, otherwise issued - 1 - lastAcked (delivery numbers are 0-based).
 */
export function viewerUnacked(
  issued: number,
  lastAcked: number | undefined,
): number {
  if (lastAcked === undefined) return issued;
  const pending = issued - 1 - lastAcked;
  return pending > 0 ? pending : 0;
}

export function playerUnacked(
  evidence: IViewerBoundEvidence,
  playerId: string,
): number {
  const row = evidence.byPlayer[playerId];
  if (!row) return 0;
  return viewerUnacked(row.issued, row.lastAcked);
}

/**
 * One read-only snapshot. issued is COUNT(*) (the product's issued),
 * not MAX(delivery_sequence) — that max is the last 0-based index.
 */
export function readViewerBoundEvidence(matchId: string): IViewerBoundEvidence {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const db = new Database(
    `.sisyphus/e2e-runtime/${e2eRunId()}/multiplayer-matches.db`,
    { readonly: true, fileMustExist: true },
  );
  try {
    const match = db
      .prepare('SELECT status FROM mp_matches WHERE match_id = ?')
      .get(matchId) as { status: string } | undefined;
    const events = db
      .prepare(
        'SELECT COALESCE(MAX(sequence), -1) AS maxSeq FROM mp_match_events WHERE match_id = ?',
      )
      .get(matchId) as { maxSeq: number };
    const issuedRows = db
      .prepare(
        `SELECT player_id AS playerId, COUNT(*) AS issued
           FROM mp_viewer_delivery WHERE match_id = ? GROUP BY player_id`,
      )
      .all(matchId) as readonly { playerId: string; issued: number }[];
    const ackRows = db
      .prepare(
        `SELECT player_id AS playerId, MAX(delivery_sequence) AS lastAcked
           FROM mp_viewer_delivery_ack WHERE match_id = ? GROUP BY player_id`,
      )
      .all(matchId) as readonly { playerId: string; lastAcked: number }[];
    const lastAckedBy: Record<string, number> = {};
    for (const row of ackRows) lastAckedBy[row.playerId] = row.lastAcked;
    const byPlayer: Record<string, IViewerIssuedAck> = {};
    for (const row of issuedRows) {
      byPlayer[row.playerId] = {
        issued: row.issued,
        lastAcked: lastAckedBy[row.playerId],
      };
    }
    const deliveryRows = db
      .prepare(
        `SELECT player_id AS playerId,
                delivery_sequence AS deliverySequence,
                authority_sequence AS authoritySequence
           FROM mp_viewer_delivery WHERE match_id = ?
           ORDER BY player_id, delivery_sequence`,
      )
      .all(matchId) as IViewerDeliveryRow[];
    return {
      status: match?.status ?? null,
      maxSequence: events.maxSeq,
      byPlayer,
      deliveryRows,
    };
  } finally {
    db.close();
  }
}

export function deliveryRowsFor(
  evidence: IViewerBoundEvidence,
  playerId: string,
): readonly IViewerDeliveryRow[] {
  return evidence.deliveryRows.filter((row) => row.playerId === playerId);
}

/** Product persist is 0..n-1; a hole is a shifted cursor. */
export function assertContiguousFromZero(
  rows: readonly IViewerDeliveryRow[],
): void {
  expect(rows.length).toBeGreaterThan(0);
  for (let index = 0; index < rows.length; index += 1) {
    expect(rows[index]?.deliverySequence).toBe(index);
  }
}

export async function unitTokenIds(page: Page): Promise<readonly string[]> {
  const tokens = page.locator('[data-testid^="unit-token-"]');
  const total = await tokens.count();
  const ids: string[] = [];
  for (let index = 0; index < total; index += 1) {
    const testId = (await tokens.nth(index).getAttribute('data-testid')) ?? '';
    if (testId.startsWith('unit-token-')) {
      ids.push(testId.slice('unit-token-'.length));
    }
  }
  return ids;
}

export async function lifecycleState(page: Page): Promise<string> {
  try {
    return (
      (await page
        .getByTestId('tactical-lifecycle-state')
        .getAttribute('data-state', { timeout: 1_000 })) ?? ''
    );
  } catch {
    return '';
  }
}

/**
 * Smallest authority after the last frame Player 2 held. That is the
 * firstMissed pointer admit() remembered; resuming from the live head
 * skips it.
 */
export function firstAuthorityAfter(
  evidence: IViewerBoundEvidence,
  lastHeldAuth: number,
  healthyPlayerIds: readonly string[],
): number {
  let first: number | null = null;
  const allowed = new Set(healthyPlayerIds);
  for (const row of evidence.deliveryRows) {
    if (!allowed.has(row.playerId)) continue;
    if (row.authoritySequence < 0) continue;
    if (row.authoritySequence <= lastHeldAuth) continue;
    if (first === null || row.authoritySequence < first) {
      first = row.authoritySequence;
    }
  }
  if (first === null) {
    throw new Error(
      `no authority after ${String(lastHeldAuth)}; isolation never opened a gap`,
    );
  }
  return first;
}

function identityFromSent(sent: readonly string[]): {
  matchId: string;
  playerId: string;
} {
  for (const raw of sent) {
    try {
      const frame = JSON.parse(raw) as {
        matchId?: unknown;
        playerId?: unknown;
      };
      if (
        typeof frame.matchId === 'string' &&
        typeof frame.playerId === 'string'
      ) {
        return { matchId: frame.matchId, playerId: frame.playerId };
      }
    } catch {
      // Non-JSON frames are not identity.
    }
  }
  throw new Error('No match/player identity on the GM tap yet');
}

function intentEnvelope(
  identity: { matchId: string; playerId: string },
  intent: Record<string, unknown>,
): Record<string, unknown> {
  return {
    kind: 'Intent',
    matchId: identity.matchId,
    ts: new Date().toISOString(),
    playerId: identity.playerId,
    intentId: `e2e-14-${crypto.randomUUID()}`,
    intent,
  };
}

/**
 * Alternate GoProne/Stand (Move needs a hex the client does not know)
 * with AdvancePhase on the GM socket so the waiting-for-opponent bar
 * cannot hide the drive. Pauses keep the 20-burst / 5-per-second
 * connection bucket from freezing issued.
 */
export async function driveUntilPlayer2Capped(input: {
  readonly gmPage: Page;
  readonly p2PlayerId: string;
  readonly gmTap: IIntentTap;
}): Promise<IViewerBoundEvidence> {
  const identity = identityFromSent(input.gmTap.sent);
  const unitId = await hostOwnedUnitId(input.gmPage);
  let prone = false;
  let stagnant = 0;
  let lastIssued = -1;
  for (let step = 0; step < 400; step += 1) {
    const before = readViewerBoundEvidence(identity.matchId);
    if (playerUnacked(before, input.p2PlayerId) >= VIEWER_UNACKED_CAP) {
      return before;
    }
    if (before.status !== 'active') {
      throw new Error(
        `match left active before the unacked cap; status=${String(before.status)} step=${String(step)}`,
      );
    }
    const phase = (
      await input.gmPage.getByTestId('phase-name').innerText()
    ).toLowerCase();
    if (phase.includes('movement')) {
      input.gmTap.inject(
        intentEnvelope(identity, {
          kind: prone ? 'Stand' : 'GoProne',
          unitId,
        }),
      );
      prone = !prone;
      await input.gmPage.waitForTimeout(250);
    }
    input.gmTap.inject(intentEnvelope(identity, { kind: 'AdvancePhase' }));
    await input.gmPage.waitForTimeout(250);
    const after = readViewerBoundEvidence(identity.matchId);
    const issued = after.byPlayer[input.p2PlayerId]?.issued ?? 0;
    if (issued === lastIssued) {
      stagnant += 1;
      if (stagnant >= 8) await input.gmPage.waitForTimeout(1_000);
      if (stagnant >= 20) {
        throw new Error(
          `drive stopped issuing after ${String(step)} steps; p2 issued=${String(issued)}`,
        );
      }
    } else {
      stagnant = 0;
      lastIssued = issued;
    }
  }
  throw new Error('Player 2 unacked never reached the cap');
}

/** Two AdvancePhase injects so "issued froze" is a hold, not one sample. */
export async function driveTwoMoreAdvances(
  gmTap: IIntentTap,
  gmPage: Page,
): Promise<void> {
  const identity = identityFromSent(gmTap.sent);
  gmTap.inject(intentEnvelope(identity, { kind: 'AdvancePhase' }));
  await gmPage.waitForTimeout(400);
  gmTap.inject(intentEnvelope(identity, { kind: 'AdvancePhase' }));
  await gmPage.waitForTimeout(400);
}
