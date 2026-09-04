/**
 * Combat pack 1 (E2E-31 / E2E-32 / E2E-34).
 *
 * Launch is `launchOneVersusOne` (vault, room-code join, ready, launch,
 * Movement). Required: `refuseForeignUnitCommand` returns null when
 * `meta.coopCampaign` is set, so the co-op fixture cannot prove ownership.
 *
 * GM-CONNECTION CAVEAT: the Strict Combat preamble asks for two tactical
 * seats plus a separate non-playing GM connection. `launchOneVersusOne`
 * seats the host as a player. These rows prove the three clauses between
 * the two players. The separate-GM-connection clause is named here and
 * is not exercised.
 *
 * `combat` stays reserved for E2E-31..45. This file is `combat-pack1`.
 *
 * @tags @combat-pack1 @E2E-31 @E2E-32 @E2E-34
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import path from 'node:path';

import { openSqliteEvidenceReader } from './fixtures/sqliteEvidenceReader';
import {
  advancePhase,
  deleteIdentities,
  e2eRunId,
  launchOneVersusOne,
  openContextPage,
  tapErrorFrames,
} from './helpers/gmTwoPlayerMatchFlow';

const HOST_PASSWORD = 'CombatPack1Host123!';
const GUEST_PASSWORD = 'CombatPack1Guest123!';
/** A roll no die in the game can produce: if it ever appears, the client chose it. */
const CLIENT_ROLL = 99;

type ISocketTap = ReturnType<typeof tapErrorFrames>;

interface IReceiptRow {
  readonly command_id: string;
  readonly first_revision: number;
  readonly last_revision: number;
}

interface IStoreSnapshot {
  readonly eventCount: number;
  readonly playerIds: readonly string[];
  readonly receipts: readonly IReceiptRow[];
  readonly sequences: readonly number[];
}

interface ILaunchedMatch {
  readonly matchId: string;
  readonly hostPlayerId: string;
  readonly guestPlayerId: string;
  readonly hostTap: ISocketTap;
  readonly guestTap: ISocketTap;
  readonly hostPage: Page;
  readonly guestPage: Page;
}

/** WHAT: read-only match journal. WHY: durable claims must not use a writable store. */
function readStore(matchId: string): IStoreSnapshot {
  const reader = openSqliteEvidenceReader(
    path.resolve('.sisyphus/e2e-runtime', e2eRunId(), 'multiplayer-matches.db'),
  );
  try {
    const match = reader.select<{ metaJson: string }>(
      'SELECT meta_json AS metaJson FROM mp_matches WHERE match_id = ?',
      [matchId],
    )[0];
    const parsed = match
      ? (JSON.parse(match.metaJson) as { playerIds?: unknown })
      : {};
    return {
      eventCount:
        reader.select<{ n: number }>(
          'SELECT COUNT(*) AS n FROM mp_match_events WHERE match_id = ?',
          [matchId],
        )[0]?.n ?? 0,
      playerIds: Array.isArray(parsed.playerIds)
        ? parsed.playerIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
      receipts: reader.select<IReceiptRow>(
        'SELECT command_id, first_revision, last_revision FROM mp_command_receipts WHERE match_id = ? ORDER BY first_revision',
        [matchId],
      ),
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

/** WHAT: token id on an absolute side. WHY: host force is `player`, guest is `opponent`. */
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

/** WHAT: a raw Intent envelope. WHY: inject must match the product socket, not a second connection. */
function intentFrame(
  matchId: string,
  playerId: string,
  intentId: string,
  intent: Record<string, unknown>,
): Record<string, unknown> {
  return {
    kind: 'Intent',
    matchId,
    ts: new Date().toISOString(),
    playerId,
    intentId,
    intent,
  };
}

/** WHAT: parse one tap frame. WHY: delivery and roll live on Event, refusals on Error. */
function parseFrame(raw: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** WHAT: true when the tap recorded the door's client-rolls refusal for this id. WHY: the injected intentId is how the client correlates the Error. */
function sawClientRollsRefusal(tap: ISocketTap, intentId: string): boolean {
  return tap.frames.some(
    (frame) =>
      frame.reason === 'client-rolls-forbidden' && frame.intentId === intentId,
  );
}

/** WHAT: Event delivery numbers after a watermark. WHY: both viewers must see one order. */
function newEventDeliveries(
  tap: ISocketTap,
  afterCount: number,
): readonly number[] {
  const numbers: number[] = [];
  for (const raw of tap.received.slice(afterCount)) {
    const frame = parseFrame(raw);
    if (frame?.kind === 'Event' && typeof frame.deliverySequence === 'number') {
      numbers.push(frame.deliverySequence);
    }
  }
  return numbers;
}

/** WHAT: roll on an attack Event after a watermark. WHY: viewers must see the server's value. */
/**
 * WHAT: the initiative rolls (player then opponent) from initiative_rolled
 * events received after a watermark.
 * WHY: initiative is the random resolution this pack proves; the pair is
 * what both viewers must observe identically.
 */
function initiativeRollsSince(
  tap: ISocketTap,
  afterCount: number,
): readonly number[] {
  const rolls: number[] = [];
  for (const raw of tap.received.slice(afterCount)) {
    const frame = parseFrame(raw);
    if (frame?.kind !== 'Event') continue;
    const event =
      typeof frame.event === 'object' && frame.event !== null
        ? (frame.event as Record<string, unknown>)
        : null;
    if (event?.type !== 'initiative_rolled') continue;
    const payload =
      typeof event.payload === 'object' && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : null;
    if (typeof payload?.playerRoll === 'number') rolls.push(payload.playerRoll);
    if (typeof payload?.opponentRoll === 'number')
      rolls.push(payload.opponentRoll);
  }
  return rolls;
}

function attackRollsSince(
  tap: ISocketTap,
  afterCount: number,
): readonly number[] {
  const rolls: number[] = [];
  for (const raw of tap.received.slice(afterCount)) {
    const frame = parseFrame(raw);
    if (frame?.kind !== 'Event') continue;
    const event =
      typeof frame.event === 'object' && frame.event !== null
        ? (frame.event as Record<string, unknown>)
        : null;
    const type = event?.type;
    if (typeof type !== 'string' || !type.includes('attack')) continue;
    const payload =
      typeof event?.payload === 'object' && event.payload !== null
        ? (event.payload as Record<string, unknown>)
        : null;
    if (typeof payload?.roll === 'number') rolls.push(payload.roll);
  }
  return rolls;
}

/** WHAT: 1v1 with both sockets tapped. WHY: inject and observe must share the product sockets. */
async function launchTappedMatch(
  browser: Browser,
  request: APIRequestContext,
  hostPage: Page,
  guestPage: Page,
): Promise<{ launched: ILaunchedMatch; identityIds: readonly string[] }> {
  const hostTap = tapErrorFrames(hostPage);
  const guestTap = tapErrorFrames(guestPage);
  await hostTap.install();
  await guestTap.install();
  const opened = await launchOneVersusOne({
    browser,
    request,
    hostPage,
    guestPage,
    hostName: 'Combat Pack1 Host',
    guestName: 'Combat Pack1 Guest',
    hostPassword: HOST_PASSWORD,
    guestPassword: GUEST_PASSWORD,
  });
  const guestPlayerId = readStore(opened.match.matchId).playerIds.find(
    (id) => id !== opened.hostToken.playerId,
  );
  if (!guestPlayerId) throw new Error('Match meta lacked the guest player id');
  return {
    identityIds: opened.identityIds,
    launched: {
      matchId: opened.match.matchId,
      hostPlayerId: opened.hostToken.playerId,
      guestPlayerId,
      hostTap,
      guestTap,
      hostPage,
      guestPage,
    },
  };
}

async function withMatch(
  browser: Browser,
  request: APIRequestContext,
  body: (match: ILaunchedMatch) => Promise<void>,
): Promise<void> {
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  let identityIds: readonly string[] = [];
  try {
    const opened = await launchTappedMatch(
      browser,
      request,
      hostPage,
      guestPage,
    );
    identityIds = opened.identityIds;
    await body(opened.launched);
  } finally {
    await deleteIdentities(request, identityIds).catch(() => undefined);
    await hostPage.context().close();
    await guestPage.context().close();
  }
}

test('E2E-31 a foreign-unit command is refused typed and an owned command commits @combat-pack1 @E2E-31', async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  await withMatch(browser, request, async (match) => {
    const hostUnitId = await unitIdOnSide(match.hostPage, 'player');
    const guestUnitId = await unitIdOnSide(match.hostPage, 'opponent');
    const before = readStore(match.matchId);
    const errorsBefore = match.hostTap.frames.length;
    match.hostTap.inject(
      intentFrame(
        match.matchId,
        match.hostPlayerId,
        `combat-e2e31-foreign-${crypto.randomUUID()}`,
        {
          kind: 'GoProne',
          unitId: guestUnitId,
        },
      ),
    );
    await expect
      .poll(() => match.hostTap.frames.length, { timeout: 20_000 })
      .toBeGreaterThan(errorsBefore);
    const refusal = match.hostTap.frames.slice(errorsBefore);
    expect(
      refusal.some(
        (frame) =>
          frame.code === 'AUTH_REJECTED' && frame.reason === 'unit-not-owned',
      ),
      JSON.stringify(refusal),
    ).toBe(true);
    expect(readStore(match.matchId).eventCount).toBe(before.eventCount);
    const ownedId = `combat-e2e31-owned-${crypto.randomUUID()}`;
    match.hostTap.inject(
      intentFrame(match.matchId, match.hostPlayerId, ownedId, {
        kind: 'GoProne',
        unitId: hostUnitId,
      }),
    );
    await expect
      .poll(
        () =>
          readStore(match.matchId).receipts.some(
            (row) => row.command_id === ownedId,
          ),
        {
          timeout: 20_000,
        },
      )
      .toBe(true);
    expect(readStore(match.matchId).eventCount).toBeGreaterThan(
      before.eventCount,
    );
  });
});

test('E2E-32 two back-to-back intents resolve in one server order on both taps @combat-pack1 @E2E-32', async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  await withMatch(browser, request, async (match) => {
    const hostUnitId = await unitIdOnSide(match.hostPage, 'player');
    const guestUnitId = await unitIdOnSide(match.guestPage, 'opponent');
    const hostWatermark = match.hostTap.received.length;
    const guestWatermark = match.guestTap.received.length;
    const hostCommandId = `combat-e2e32-p1-${crypto.randomUUID()}`;
    const guestCommandId = `combat-e2e32-p2-${crypto.randomUUID()}`;
    match.hostTap.inject(
      intentFrame(match.matchId, match.hostPlayerId, hostCommandId, {
        kind: 'GoProne',
        unitId: hostUnitId,
      }),
    );
    match.guestTap.inject(
      intentFrame(match.matchId, match.guestPlayerId, guestCommandId, {
        kind: 'GoProne',
        unitId: guestUnitId,
      }),
    );
    await expect
      .poll(
        () => {
          const ids = new Set(
            readStore(match.matchId).receipts.map((row) => row.command_id),
          );
          return ids.has(hostCommandId) && ids.has(guestCommandId);
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    let hostPair: readonly number[] = [];
    let guestPair: readonly number[] = [];
    await expect
      .poll(
        () => {
          hostPair = newEventDeliveries(match.hostTap, hostWatermark);
          guestPair = newEventDeliveries(match.guestTap, guestWatermark);
          return hostPair.length >= 2 && guestPair.length >= 2;
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    expect(hostPair).toEqual(guestPair);
    const after = readStore(match.matchId);
    const batchA = after.receipts.find(
      (row) => row.command_id === hostCommandId,
    );
    const batchB = after.receipts.find(
      (row) => row.command_id === guestCommandId,
    );
    if (!batchA || !batchB) throw new Error('Missing concurrent receipts');
    const first =
      batchA.first_revision < batchB.first_revision ? batchA : batchB;
    const second = first === batchA ? batchB : batchA;
    expect(first.last_revision).toBeLessThan(second.first_revision);
    const journal = after.sequences.filter(
      (sequence) =>
        sequence >= first.first_revision && sequence <= second.last_revision,
    );
    expect(journal[0]).toBe(first.first_revision);
    expect(journal[journal.length - 1]).toBe(second.last_revision);
  });
});

test('E2E-34 a client-supplied roll cannot influence the result and viewers see one server roll @combat-pack1 @E2E-34', async ({
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  await withMatch(browser, request, async (match) => {
    const hostUnitId = await unitIdOnSide(match.hostPage, 'player');
    const before = readStore(match.matchId);
    const goProneIntentId = `combat-e2e34-client-roll-${crypto.randomUUID()}`;
    match.hostTap.inject(
      intentFrame(match.matchId, match.hostPlayerId, goProneIntentId, {
        kind: 'GoProne',
        unitId: hostUnitId,
        roll: CLIENT_ROLL,
      }),
    );
    // Refusal is enforced at the socket door on the raw envelope.
    await expect
      .poll(() => sawClientRollsRefusal(match.hostTap, goProneIntentId), {
        timeout: 20_000,
      })
      .toBe(true);
    expect(readStore(match.matchId).eventCount).toBe(before.eventCount);
    // Initiative is the random resolution this row proves. Host-held
    // AdvancePhase injections still carry a forbidden dice key and must
    // be refused at the door; the phase then walks through the UI path.
    const hostWatermark = match.hostTap.received.length;
    const guestWatermark = match.guestTap.received.length;
    let hostInitiative: readonly number[] = [];
    let guestInitiative: readonly number[] = [];
    for (let step = 0; step < 8; step += 1) {
      hostInitiative = initiativeRollsSince(match.hostTap, hostWatermark);
      guestInitiative = initiativeRollsSince(match.guestTap, guestWatermark);
      if (hostInitiative.length > 0 && guestInitiative.length > 0) break;
      const hostControl = match.hostPage.getByTestId('advance-phase-button');
      if (
        (await hostControl.count()) === 1 &&
        (await hostControl.isEnabled())
      ) {
        const advanceIntentId = `combat-e2e34-advance-${crypto.randomUUID()}`;
        match.hostTap.inject(
          intentFrame(match.matchId, match.hostPlayerId, advanceIntentId, {
            kind: 'AdvancePhase',
            rolls: [CLIENT_ROLL, CLIENT_ROLL, CLIENT_ROLL, CLIENT_ROLL],
          }),
        );
        await expect
          .poll(() => sawClientRollsRefusal(match.hostTap, advanceIntentId), {
            timeout: 20_000,
          })
          .toBe(true);
      }
      await advancePhase(match.guestPage, match.hostPage);
    }
    await expect
      .poll(
        () => {
          hostInitiative = initiativeRollsSince(match.hostTap, hostWatermark);
          guestInitiative = initiativeRollsSince(
            match.guestTap,
            guestWatermark,
          );
          return hostInitiative.length > 0 && guestInitiative.length > 0;
        },
        { timeout: 20_000 },
      )
      .toBe(true);
    // One server roll, identical for both viewers, and never the client's.
    expect(hostInitiative).toEqual(guestInitiative);
    expect(hostInitiative).not.toContain(CLIENT_ROLL);
    expect(guestInitiative).not.toContain(CLIENT_ROLL);
    expect(readStore(match.matchId).eventCount).toBeGreaterThan(
      before.eventCount,
    );
  });
});
