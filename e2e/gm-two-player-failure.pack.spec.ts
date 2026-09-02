/**
 * GM + two-player FAILURE pack — the E2E-61..70 catalog (umbrella 22.2).
 *
 * Every row drives a real 1v1 match through production surfaces and then
 * attacks it: a malformed intent, a replayed command, a scoped store
 * fault at each of the three batch failure points, and a network
 * partition. Authority is asserted twice over, per design D9 — what the
 * browser rendered AND what the durable rows say — with durable reads on
 * a dedicated read-only connection (`readonly: true, fileMustExist: true`),
 * never a production store constructor.
 *
 * PROVEN HERE (letters quoted from
 * openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md):
 *
 * E2E-61: "WHEN a context sends an unknown command kind or malformed
 *   payload THEN the server SHALL return a typed validation error with no
 *   journal or publication row."
 *
 * E2E-62: "WHEN an attacker reuses command or idempotency identity before
 *   or after reconnect THEN the authority SHALL return the existing
 *   receipt or an integrity conflict and SHALL not repeat effects."
 *
 * E2E-63: "WHEN a scoped fault fails a middle event, head update, or
 *   outbox insert THEN no part of the batch SHALL remain and no client
 *   SHALL see success." All THREE failure points are exercised — the two
 *   batch-loop points exist because finding #75 recorded that only the
 *   head update did, which would have let this scenario be claimed on a
 *   third of its own text.
 *
 * E2E-66: "WHEN one player's network is partitioned while eligible
 *   events commit THEN reconnection SHALL apply every authorized event
 *   once from the durable viewer cursor." Carried as TWO rows because
 *   finding #90 measured two different delivery paths, not one. Reconnect
 *   IN PLACE (`context.setOffline(true)` then `false`) is the live
 *   outbox path: exactly one new `deliverySequence`, contiguous with the
 *   viewer's prior high-water, and ZERO `ReplayChunk` frames. Reconnect
 *   BY RELOAD (`page.reload()`) delivers the missed event as a live
 *   `Event` AND THEN replays from zero (`ReplayStart`, `ReplayChunk`
 *   with a plural `deliverySequences` array covering 0..N, `ReplayEnd`).
 *   A session-wide "no delivery number repeats anywhere" claim is FALSE
 *   against that correct reload behaviour — the letter is APPLY-side,
 *   keyed on `deliverySequence` (finding #89: `event.sequence` is
 *   undefined on the player wire). The shared flattener below reads BOTH
 *   the singular live field and the plural ReplayChunk array; a counter
 *   that read only the singular field was blind to every replay chunk,
 *   which is how a `resumeFrom = afterLastHeld` mutant survived.
 *
 * NOT CLAIMED HERE, and why:
 *
 * - E2E-64 (projection failure fails closed) and E2E-70 (socket send
 *   failure) have no seam. The lever's kinds are batch-lifecycle only;
 *   a projection fault and a post-commit send failure are separate
 *   seams, each its own decision.
 * - E2E-65 (GM loss pauses without migration) is a genuine ~75 s idle
 *   hold on HEARTBEAT_TIMEOUT_MS and belongs with the other long holds.
 * - E2E-67 (pre-rewind client cannot diverge) is double-gated: sections
 *   14/16 branch supersession is unbuilt, and finding #38 records that
 *   the combat wire carries no client-claimed expected head, so
 *   `admitStreamCommand`'s STALE_BRANCH arm is unreachable on the socket
 *   path without a new protocol field.
 * - E2E-68 (corruption quarantines one session) needs a WRITE-capable
 *   corruption fixture, which deliberately does not exist here — the
 *   evidence reader refuses anything but SELECT. Findings #83/#84 also
 *   predict it proves a GAP rather than a pass: the live server never
 *   populates a quarantine registry, and the WS upgrade path builds a
 *   fresh host for a blocked match without replaying the corrupt log.
 *   Carved out rather than faked.
 * - E2E-69 (large tail bounded) rides the performance fixture's
 *   1,000-event catch-up rather than a second implementation of it.
 *
 * THE FAULT LEVER carries an explicit session scope (finding #72): every
 * arm below names the match it belongs to, so these rows can arm several
 * faults across several tests without one landing on another's session.
 *
 * @tags @failure @E2E-61 @E2E-62 @E2E-63 @E2E-66
 */

import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

import { openSqliteEvidenceReader } from './fixtures/sqliteEvidenceReader';
import {
  advancePhase,
  armScopedFault,
  deleteIdentities,
  e2eRunId,
  hostOwnedUnitId,
  launchOneVersusOne,
  openContextPage,
  tapErrorFrames,
} from './helpers/gmTwoPlayerMatchFlow';

const HOST_PASSWORD = 'FailureHost123!';
const GUEST_PASSWORD = 'FailureGuest123!';

/** This run's multiplayer database — the same file the server writes. */
function multiplayerDbPath(): string {
  return path.resolve(
    '.sisyphus/e2e-runtime',
    e2eRunId(),
    'multiplayer-matches.db',
  );
}

interface IDurableCounts {
  readonly events: number;
  readonly outbox: number;
  readonly receipts: number;
}

/**
 * The three durable counts for ONE match, on a read-only connection.
 *
 * Scoped to the match deliberately: a global count drifts with any other
 * activity on the shared per-run database, which would turn every
 * "unchanged" assertion here into a coin flip.
 */
function durableCounts(matchId: string): IDurableCounts {
  const reader = openSqliteEvidenceReader(multiplayerDbPath());
  try {
    const one = (table: string): number =>
      (
        reader.select<{ n: number }>(
          `SELECT COUNT(*) AS n FROM ${table} WHERE match_id = ?`,
          [matchId],
        )[0] ?? { n: 0 }
      ).n;
    return {
      events: one('mp_match_events'),
      outbox: one('mp_match_outbox'),
      receipts: one('mp_command_receipts'),
    };
  } finally {
    reader.close();
  }
}

/** Every durable event sequence for a match, ascending. */
function durableSequences(matchId: string): readonly number[] {
  const reader = openSqliteEvidenceReader(multiplayerDbPath());
  try {
    return reader
      .select<{ sequence: number }>(
        `SELECT sequence FROM mp_match_events WHERE match_id = ? ORDER BY sequence ASC`,
        [matchId],
      )
      .map((row) => row.sequence);
  } finally {
    reader.close();
  }
}

/** Launch a 1v1 with a tapped host socket, ready for attack. */
async function launchTappedMatch(input: {
  readonly browser: Parameters<typeof openContextPage>[0];
  readonly request: Parameters<typeof deleteIdentities>[0];
  readonly hostPage: Page;
  readonly guestPage: Page;
}) {
  const tap = tapErrorFrames(input.hostPage);
  await tap.install();
  const launched = await launchOneVersusOne({
    browser: input.browser,
    request: input.request,
    hostPage: input.hostPage,
    guestPage: input.guestPage,
    hostName: 'Failure Host',
    guestName: 'Failure Guest',
    hostPassword: HOST_PASSWORD,
    guestPassword: GUEST_PASSWORD,
  });
  return { ...launched, tap };
}

type ISocketTap = ReturnType<typeof tapErrorFrames>;

interface IWireFrame {
  readonly kind?: string;
  readonly deliverySequence?: number;
  readonly deliverySequences?: readonly number[];
}

function parseWireFrame(raw: string): IWireFrame | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const kind = record.kind;
    const deliverySequence = record.deliverySequence;
    const deliverySequences = record.deliverySequences;
    return {
      kind: typeof kind === 'string' ? kind : undefined,
      deliverySequence:
        typeof deliverySequence === 'number' ? deliverySequence : undefined,
      deliverySequences: Array.isArray(deliverySequences)
        ? deliverySequences.filter(
            (value): value is number => typeof value === 'number',
          )
        : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Flatten BOTH the singular `deliverySequence` of live `Event` frames
 * and the plural `deliverySequences` of `ReplayChunk` frames into one
 * ordered number list.
 *
 * Finding #90: a counter that read only the singular field was blind to
 * every replay chunk. ReplayChunk never carries a top-level
 * `deliverySequence`; the numbers live in `deliverySequences[]`. That
 * blindness is how `resumeFrom = afterLastHeld` survived an orchestrator
 * live mutant — the row could not see the replayed copy at all.
 */
function flattenDeliveryNumbers(rawFrames: readonly string[]): number[] {
  const numbers: number[] = [];
  for (const raw of rawFrames) {
    const frame = parseWireFrame(raw);
    if (frame === null) continue;
    if (frame.kind === 'Event' && frame.deliverySequence !== undefined) {
      numbers.push(frame.deliverySequence);
    }
    if (frame.kind === 'ReplayChunk' && frame.deliverySequences !== undefined) {
      numbers.push(...frame.deliverySequences);
    }
  }
  return numbers;
}

function rawFramesOfKind(
  rawFrames: readonly string[],
  kind: string,
): readonly string[] {
  return rawFrames.filter((raw) => parseWireFrame(raw)?.kind === kind);
}

function highWater(numbers: readonly number[]): number {
  if (numbers.length === 0) return -1;
  return Math.max(...numbers);
}

/**
 * Same 1v1 as the 61-63 rows, plus a guest tap installed before the
 * socket exists. The host tap stays launchTappedMatch's; this does not
 * fork that helper.
 */
async function launchBothTapped(input: {
  readonly browser: Parameters<typeof openContextPage>[0];
  readonly request: Parameters<typeof deleteIdentities>[0];
  readonly hostPage: Page;
  readonly guestPage: Page;
}): Promise<
  Awaited<ReturnType<typeof launchTappedMatch>> & {
    readonly guestTap: ISocketTap;
  }
> {
  const guestTap = tapErrorFrames(input.guestPage);
  await guestTap.install();
  const launched = await launchTappedMatch(input);
  return { ...launched, guestTap };
}

/**
 * Partition the guest, then commit a host-owned GoProne. Ending a phase
 * needs both players, so AdvancePhase cannot be the partitioned commit
 * (finding #88). Returns the guest's held delivery high-water so catch-up
 * rows can key on deliverySequence, never on the durable log.
 */
async function partitionThenCommitGoProne(input: {
  readonly matchId: string;
  readonly hostPage: Page;
  readonly guestPage: Page;
  readonly hostTap: ISocketTap;
  readonly guestTap: ISocketTap;
  readonly hostPlayerId: string;
}): Promise<{
  readonly heldReceived: number;
  readonly heldNumbers: readonly number[];
  readonly priorHighWater: number;
}> {
  const unitId = await hostOwnedUnitId(input.hostPage);
  await input.guestPage.context().setOffline(true);
  // In-flight frames can still land as the socket FINs. Snapshot AFTER
  // that settles so "guest received nothing meanwhile" is about the
  // commit, not the disconnect itself.
  await input.guestPage.waitForTimeout(1_000);
  const heldNumbers = flattenDeliveryNumbers(input.guestTap.received);
  const heldReceived = input.guestTap.received.length;
  const priorHighWater = highWater(heldNumbers);
  const eventsBefore = durableCounts(input.matchId).events;

  input.hostTap.inject({
    kind: 'Intent',
    matchId: input.matchId,
    ts: new Date().toISOString(),
    playerId: input.hostPlayerId,
    intentId: `failure-e2e66-${crypto.randomUUID()}`,
    intent: { kind: 'GoProne', unitId },
  });

  await expect
    .poll(() => durableCounts(input.matchId).events, { timeout: 20_000 })
    .toBeGreaterThan(eventsBefore);

  // Heartbeats may still move the raw frame count if the TCP session
  // has not FINed; the letter keys on delivery numbers.
  expect(flattenDeliveryNumbers(input.guestTap.received)).toEqual([
    ...heldNumbers,
  ]);

  return { heldReceived, heldNumbers, priorHighWater };
}

test.describe('GM two-player failure pack', () => {
  test('E2E-61 a malformed intent is refused and writes nothing @failure @E2E-61', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);
    let identityIds: readonly string[] = [];

    try {
      const {
        match,
        tap,
        identityIds: launched,
      } = await launchTappedMatch({
        browser,
        request,
        hostPage,
        guestPage,
      });

      identityIds = launched;

      const before = durableCounts(match.matchId);
      const errorsBefore = tap.frames.length;

      // The letter names BOTH shapes, so both are sent: an unknown
      // command kind, and a structurally malformed payload.
      tap.inject({
        kind: 'ThisCommandKindDoesNotExist',
        matchId: match.matchId,
      });
      tap.inject({ kind: 'Intent', payload: 42 });

      // (a) A TYPED refusal came back — not silence, not a crash.
      await expect
        .poll(() => tap.frames.length, { timeout: 20_000 })
        .toBeGreaterThan(errorsBefore);
      for (const frame of tap.frames.slice(errorsBefore)) {
        expect(
          frame.code,
          `untyped refusal: ${JSON.stringify(frame)}`,
        ).toBeTruthy();
      }

      // (b) Nothing durable moved. This is the half a typed error does
      // NOT prove: a server can answer politely and still have written
      // the row, which is exactly the failure the letter forbids.
      expect(durableCounts(match.matchId)).toEqual(before);
    } finally {
      await deleteIdentities(request, identityIds);
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });

  test('E2E-62 a replayed command cannot duplicate an effect @failure @E2E-62', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);
    let identityIds: readonly string[] = [];

    try {
      const {
        match,
        tap,
        identityIds: launched,
      } = await launchTappedMatch({
        browser,
        request,
        hostPage,
        guestPage,
      });

      identityIds = launched;

      // Drive one real command so there is a genuine committed frame to
      // replay — a spec-authored frame would test the spec's idea of the
      // protocol rather than the protocol.
      await advancePhase(hostPage, guestPage);
      await expect
        .poll(() => durableCounts(match.matchId).receipts, { timeout: 20_000 })
        .toBeGreaterThan(0);

      const committed = durableCounts(match.matchId);
      const sequencesBefore = durableSequences(match.matchId);
      const replayable = tap.sent.filter((frame) => frame.includes('Intent'));
      expect(
        replayable.length,
        'no client Intent frame was recorded to replay',
      ).toBeGreaterThan(0);

      // The attack: resend the LAST real intent verbatim, twice.
      const attack = replayable[replayable.length - 1] as string;
      tap.inject(JSON.parse(attack));
      tap.inject(JSON.parse(attack));

      // Give the server room to have got it wrong before asserting it
      // did not — an immediate read would pass on latency alone.
      await hostPage.waitForTimeout(3_000);

      // Effects did not repeat: same events, same outbox rows, same
      // receipts, and the same sequence set (not merely the same count,
      // which a delete-plus-insert would also satisfy).
      expect(durableCounts(match.matchId)).toEqual(committed);
      expect(durableSequences(match.matchId)).toEqual(sequencesBefore);
    } finally {
      await deleteIdentities(request, identityIds);
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });

  // E2E-63's three failure points, one row each. The `middle event` and
  // `outbox insert` arms exist only because finding #75 added them; the
  // scenario could previously be claimed on the head update alone.
  for (const kind of [
    'append-event-insert',
    'append-outbox-insert',
    'append-head-update',
  ] as const) {
    test(`E2E-63 a scoped fault at ${kind} leaves no partial batch @failure @E2E-63`, async ({
      browser,
      request,
    }) => {
      test.setTimeout(180_000);
      const hostPage = await openContextPage(browser);
      const guestPage = await openContextPage(browser);
      let identityIds: readonly string[] = [];

      try {
        const {
          match,
          tap,
          identityIds: launched,
        } = await launchTappedMatch({
          browser,
          request,
          hostPage,
          guestPage,
        });

        identityIds = launched;

        const before = durableCounts(match.matchId);
        const sequencesBefore = durableSequences(match.matchId);

        // Scoped to THIS match (finding #72). An unscoped arm would be
        // refused 400 by the route.
        await armScopedFault(request, kind, match.matchId);

        // The next real command dies at the armed point.
        await advancePhase(hostPage, guestPage);

        // (a) The actor was told, in a typed frame.
        await expect
          .poll(() => tap.frames.length, { timeout: 25_000 })
          .toBeGreaterThan(0);

        // (b) No part of the batch remains. Sequence equality, not count
        // equality: a rolled-back-then-retried batch that landed
        // DIFFERENT sequences would keep the counts and still violate
        // the letter.
        expect(durableCounts(match.matchId)).toEqual(before);
        expect(durableSequences(match.matchId)).toEqual(sequencesBefore);

        // (c) No client saw success. The shipped contract closes the
        // match on append failure, so the absence-safe form is used:
        // closed-and-gone and still-on-Movement both satisfy the letter,
        // a rendered Weapon Attack does not.
        await expect(hostPage.getByText('Weapon Attack')).toHaveCount(0);
        await expect(guestPage.getByText('Weapon Attack')).toHaveCount(0);
      } finally {
        await deleteIdentities(request, identityIds);
        await hostPage.context().close();
        await guestPage.context().close();
      }
    });
  }

  test('R66a a partitioned player catches up in place, exactly once @failure @E2E-66', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);
    let identityIds: readonly string[] = [];

    try {
      const {
        match,
        tap,
        guestTap,
        hostToken,
        identityIds: launched,
      } = await launchBothTapped({
        browser,
        request,
        hostPage,
        guestPage,
      });
      identityIds = launched;

      const { heldReceived, priorHighWater } = await partitionThenCommitGoProne(
        {
          matchId: match.matchId,
          hostPage,
          guestPage,
          hostTap: tap,
          guestTap,
          hostPlayerId: hostToken.playerId,
        },
      );

      await guestPage.context().setOffline(false);

      await expect
        .poll(
          () =>
            flattenDeliveryNumbers(
              guestTap.received.slice(heldReceived),
            ).filter((value) => value > priorHighWater).length,
          { timeout: 30_000 },
        )
        .toBeGreaterThan(0);

      // A late ReplayChunk is exactly the path this row excludes, so
      // wait past the first poll success before asserting absence.
      await guestPage.waitForTimeout(2_500);

      const catchup = guestTap.received.slice(heldReceived);
      const newcomers = flattenDeliveryNumbers(catchup).filter(
        (value) => value > priorHighWater,
      );
      expect(newcomers).toEqual([priorHighWater + 1]);
      expect(rawFramesOfKind(catchup, 'ReplayChunk')).toHaveLength(0);
      expect(rawFramesOfKind(catchup, 'Event').length).toBeGreaterThan(0);
    } finally {
      await deleteIdentities(request, identityIds);
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });

  test('R66b a reloaded player rebuilds from zero and still applies the missed event once @failure @E2E-66', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);
    let identityIds: readonly string[] = [];

    try {
      const {
        match,
        tap,
        guestTap,
        hostToken,
        identityIds: launched,
      } = await launchBothTapped({
        browser,
        request,
        hostPage,
        guestPage,
      });
      identityIds = launched;

      const { heldReceived, priorHighWater } = await partitionThenCommitGoProne(
        {
          matchId: match.matchId,
          hostPage,
          guestPage,
          hostTap: tap,
          guestTap,
          hostPlayerId: hostToken.playerId,
        },
      );

      // Online first so the document can load; reload immediately so
      // this row takes the from-zero path rather than the in-place
      // outbox drain R66a already covers.
      await guestPage.context().setOffline(false);
      await guestPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible(
        {
          timeout: 60_000,
        },
      );
      // MatchResumed only fires if the disconnect paused the match.
      // A partition that leaves the server socket up (the case that lets
      // the unilateral GoProne commit) still replays from zero on reload,
      // and ReplayEnd is that path's measured resume signal.
      await expect
        .poll(
          () => {
            const slice = guestTap.received.slice(heldReceived);
            return (
              rawFramesOfKind(slice, 'MatchResumed').length +
              rawFramesOfKind(slice, 'ReplayEnd').length
            );
          },
          { timeout: 60_000 },
        )
        .toBeGreaterThan(0);
      await guestPage.waitForTimeout(2_500);

      const catchup = guestTap.received.slice(heldReceived);
      const replayRaw = rawFramesOfKind(catchup, 'ReplayChunk');
      expect(
        replayRaw.length,
        'reload path entered no replay code',
      ).toBeGreaterThan(0);

      // Through the flattener on ReplayChunk frames only, so a counter
      // that read the singular field again would see an empty list.
      const replayNumbers = flattenDeliveryNumbers(replayRaw);
      expect(new Set(replayNumbers).size).toBe(replayNumbers.length);
      expect(replayNumbers).toEqual(replayNumbers.map((_, index) => index));
      expect(replayNumbers[0]).toBe(0);

      const missed = priorHighWater + 1;
      expect(
        flattenDeliveryNumbers(rawFramesOfKind(catchup, 'Event')),
      ).toContain(missed);
      expect(replayNumbers).toContain(missed);
    } finally {
      await deleteIdentities(request, identityIds);
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });
});
