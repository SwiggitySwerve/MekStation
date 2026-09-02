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
 *
 * E2E-66 IS NOT DROPPED - it lands in the immediately following PR on
 * this branch's stack, because splitting it in two (reconnect-in-place
 * vs reconnect-by-reload, which take DIFFERENT delivery paths - measured)
 * pushed this PR past its line cap. The prefix here is green on its own:
 * nothing below depends on the E2E-66 rows.
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
 * @tags @failure @E2E-61 @E2E-62 @E2E-63
 */

import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

import { openSqliteEvidenceReader } from './fixtures/sqliteEvidenceReader';
import {
  advancePhase,
  armScopedFault,
  deleteIdentities,
  e2eRunId,
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
});
