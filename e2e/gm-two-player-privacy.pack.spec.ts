/**
 * Tactical pre-serialization privacy browser acceptance (privacy pack).
 *
 * Two isolated player browser contexts on the TACTICAL match channel,
 * with a raw-wire tap on each page that records EVERY server -> client
 * frame. The sealed choice is driven as a real `GoProne` intent through
 * the actor's own socket (see WHY A WIRE-LEVEL INTENT below), and every
 * negative assertion is absence-safe.
 *
 * PROVEN HERE (letters quoted from
 * openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md):
 *
 * E2E-20: "WHEN Player 1 submits a sealed choice THEN Player 1 and the
 *   GM MAY see it while Player 2 artifacts SHALL contain neither the
 *   choice nor an inferable sequence gap."
 * E2E-21: "WHEN Player 2 submits a sealed choice THEN Player 2 and the
 *   GM MAY see it while Player 1 artifacts SHALL contain neither the
 *   choice nor an inferable sequence gap."
 * E2E-23: "WHEN a normal public movement, attack, damage, or phase fact
 *   commits THEN eligible contexts SHALL render it without another GM
 *   approval step."
 * E2E-24: "WHEN one authoritative event has different visibility for
 *   Player 1 and Player 2 THEN the captured projector objects, frames,
 *   DOM, and projection digests SHALL prove distinct valid player
 *   views."
 * E2E-27: "WHEN the harness scans player projector objects, frames,
 *   recovery payloads, history, DOM, and export THEN no forbidden
 *   GM-private field, private identifier, authority sequence, or
 *   inferable hidden-event gap SHALL appear."
 *
 * E2E-22: "WHEN the authority finalizes the sealed phase THEN eligible
 *   contexts SHALL receive the authorized reveal from committed viewer
 *   delivery streams."
 * E2E-26: "WHEN a player reconnects and replays events previously
 *   delivered live THEN replay and live payload fields plus projection
 *   digests SHALL be equivalent for that player."
 *
 * THE DEFECT THOSE TWO MEASURED, AND THE FIX THEY NOW PIN: the sealed
 * reveal used to republish the SESSION's copy of the declaration rather
 * than the COMMITTED one. `ServerMatchHostIntent` stamps `intentId` into
 * the first event of an accepted batch via `stampIntentIdOnNewEvents`
 * and hands that STAMPED copy to `commitThenPublish`, which persists AND
 * live-broadcasts it; the stamp is a copy, so the engine's in-memory
 * event log keeps the pre-stamp original. `broadcastEventInMode` sourced
 * the reveal from `ctx.session.getSession().events`, so the
 * late-delivered frame was the unstamped one: measured live in Chromium,
 * the reveal Player 1 received for Player 2's declaration differed from
 * the copy Player 2 was delivered live by exactly `intentId`, and after
 * a Player 2 reconnect the REPLAYED copy carried `intentId` while the
 * live reveal had not - live and replay payloads were not equivalent for
 * that viewer, which is precisely what E2E-26 forbids.
 * `ServerMatchHostEvents.committedDeclarations` now resolves every
 * selected declaration to its committed store row before publishing it,
 * and fails closed (no reveal) on a row it cannot read rather than
 * revealing a payload no surface committed.
 *
 * NAMED, NOT CLAIMED - WHETHER A NON-ACTOR SHOULD SEE `intentId` AT ALL:
 * the two rows below assert that the reveal, the actor's live frame and
 * the viewer's replay all carry the SAME payload, which is the letter of
 * E2E-22/E2E-26. They deliberately do not assert what that payload may
 * contain. `intentId` is the actor's client-generated command id, echoed
 * so the ACTOR's client can settle its pending intent
 * (`src/lib/multiplayer/client.ts` `settlePendingIntent`), and today it
 * rides EVERY live frame to EVERY attached viewer - not just reveals -
 * because `commitThenPublish` broadcasts one stamped copy to all
 * sockets. Withholding it from non-issuers is therefore a systemic
 * projector rule, not a reveal-path rule, and `ViewerFrameProjector`
 * has no issuer identity to key it on today
 * (`AUTHORITY_ONLY_EVENT_FIELDS` is a top-level-field list; `intentId`
 * lives inside `payload`). Reported as its own finding rather than
 * half-implemented here.
 *
 * DEFERRED, with the exact reason each is not provable on this channel:
 *
 * E2E-19 ("WHEN the GM creates but does not finalize a correction or
 *   rewind preview THEN only the GM context and server-only private
 *   audit record SHALL contain the draft") and E2E-25 ("WHEN the GM
 *   finalizes a correction with a private reason and hidden metadata
 *   THEN player views SHALL show the authorized result while only the
 *   GM private record contains the private detail"): the production
 *   match route `src/pages/multiplayer/lobby/[roomCode].tsx` mounts
 *   `NetworkedGameSurface` WITHOUT `onPreviewHostGmCorrection` /
 *   `onApproveHostGmCorrection`, so the `networked-gm-preview-btn` /
 *   `networked-gm-approve-btn` controls the host does see fall through
 *   to the component's no-op defaults. Only `/e2e/networked-command-
 *   proof` wires them. There is therefore NO production draft or
 *   correction write surface on the tactical channel to seed a private
 *   reason with.
 * E2E-29 and E2E-30 have MOVED, not vanished: proposals, vetoes and GM
 *   review items are CAMPAIGN-channel frames (`CampaignProposal` /
 *   `CampaignDecision` in `@/types/multiplayer/Protocol`); no tactical
 *   frame carries a proposal, and this pack's fixture mints no GM
 *   context (see ROLE HONESTY below). E2E-30 is LIVE on the
 *   campaign-channel rig in `e2e/gm-two-player-proposals.pack.spec.ts`
 *   (runner group `proposal-pack`); E2E-29 is deferred THERE, with the
 *   product defect that blocks it recorded in that file's header - no
 *   production wiring arms `CampaignGmArbiter`'s proposal-timeout
 *   timer, so "another times out" has no behaviour to observe.
 * E2E-28 ("unauthorized access fails before fan-out"): the letter's
 *   WHEN spans WebSocket, API, export AND GM-command access. The export
 *   surface (`ViewerHistoryService.exportForViewer`) has no HTTP route,
 *   and there is no GM-command route on this channel (see E2E-19), so a
 *   tactical-only proof would cover one quarter of the letter while
 *   reporting the whole of it. Deferred rather than half-claimed.
 *
 * ROLE HONESTY (bounds every letter above): the tactical channel mints
 * NO `role: 'gm'` viewer. `MatchSeatMembershipSource.lookupMembership`
 * returns `role: 'player'` for every seat it can produce, spectator
 * seats included, so "the GM MAY see it" in E2E-20/21 has no tactical
 * counterpart to assert and the GM-private half of E2E-27 is not
 * reachable here. What IS asserted is the half this channel owns: the
 * authority `sequence`, `visibility` and `privateRecordRef` fields that
 * `ViewerFrameProjector` strips before serialization, and the
 * no-inferable-gap law that `ViewerDeliveryCursors` enforces.
 *
 * WHY A WIRE-LEVEL INTENT: declaring through the UI needs a unit
 * selection AND a hex selection before `declare-movement-button` leaves
 * its disabled state, and the hex cells that selection depends on carry
 * no stable per-hex click locator (only decorative
 * `hex-*-badge-<q>-<r>` overlays). The declaration is therefore issued
 * as a real `Intent` envelope through the actor page's own socket,
 * exactly as that page's client would send it - the server path under
 * test (ownership check, engine dispatch, audience catalog, delivery
 * numbering) is identical, and the run log shows it as an ordinary
 * `intent dispatched ... intent=GoProne`. Every assertion still reads
 * the OPPONENT's raw wire and rendered DOM.
 *
 * WHY `GoProne` AND NOT `Move`, and the product finding that forced it:
 * the tactical client does not know where any unit stands until that
 * unit's first movement event. `seedAccumulator`
 * (`src/hooks/replay/useHexMapStateFromEvents.tokens.ts`) seeds every
 * token at `{q: 0, r: 0}` because `IGameUnit` carries no coordinate,
 * while the authority derives real deploy hexes in `applyGameCreated`
 * (`src/utils/gameplay/gameState/lifecycle.ts`, rows +/-5). MEASURED in
 * this pack: a `Move` aimed one hex north of the RENDERED token was
 * refused `movement_invalid / InsufficientMP - "Destination is 6 hexes
 * away, but max range for walk is 3"` with `from: {q:-2, r:5}`. On a
 * radius-4 map those authoritative rows are off the grid entirely.
 * `GoProne` declares `to === from`, so it needs no coordinate the
 * client does not have, and the sealed secret becomes the actor's TRUE
 * hex - which the opponent's board genuinely does not hold. Reported
 * rather than fixed: this is a test-authoring seam.
 *
 * @tags @privacy-pack @tactical @E2E-20 @E2E-21 @E2E-22 @E2E-23
 * @tags @E2E-24 @E2E-26 @E2E-27
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
  type WebSocketRoute,
} from '@playwright/test';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';
const MOVEMENT_DECLARED = 'movement_declared';
const MOVEMENT_LOCKED = 'movement_locked';
const PHASE_CHANGED = 'phase_changed';
/** Fields `ViewerFrameProjector` removes before a player frame serializes. */
const AUTHORITY_ONLY_EVENT_FIELDS = [
  'sequence',
  'visibility',
  'privateRecordRef',
] as const;
/** Replay envelope members that are GM/authority projections only. */
const AUTHORITY_ONLY_REPLAY_FIELDS = ['fromSeq', 'toSeq'] as const;
/** A hold long enough for a leaked frame to have arrived if one existed. */
const WITHHOLD_HOLD_MS = 2_500;

type WireFrame = Record<string, unknown>;
type Identity = { readonly id: string; readonly displayName: string };
type Token = { readonly token: string; readonly playerId: string };
type Match = { readonly matchId: string; readonly roomCode: string };
type Side = 'player' | 'opponent';
type Hex = { readonly q: number; readonly r: number };

interface IWireTap {
  /** Every server -> client frame this page received, in arrival order. */
  readonly frames: readonly WireFrame[];
  /** Envelope identity harvested from the page's own outbound frames. */
  readonly identity: {
    readonly matchId: string;
    readonly playerId: string;
  } | null;
  /** Sends one envelope to the server through this page's own socket. */
  send(envelope: Record<string, unknown>): void;
}

interface IFixture {
  readonly hostPage: Page;
  readonly guestPage: Page;
  readonly hostTap: IWireTap;
  readonly guestTap: IWireTap;
  readonly cleanup: () => Promise<void>;
}

test.describe('tactical pre-serialization privacy', () => {
  test('E2E-20 Player 1 sealed choice reaches neither Player 2 wire nor board @E2E-20 @E2E-23 @E2E-24', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const fixture = await openPrivacyFixture(browser, request, 'Privacy A');
    try {
      const actorUnitId = await unitIdOnSide(fixture.hostPage, 'player');
      const publicFactsBefore = frameCountOfType(
        fixture.guestTap,
        MOVEMENT_LOCKED,
      );

      declareSealedChoice(fixture.hostTap, actorUnitId);
      const declaration = await awaitEventOfType(
        fixture.hostTap,
        MOVEMENT_DECLARED,
      );
      const sealedHex = declaredHex(declaration);

      // E2E-20 (a): the opponent's raw wire never carried the sealed
      // original - neither by event identity nor by its declared hex.
      await fixture.guestPage.waitForTimeout(WITHHOLD_HOLD_MS);
      expect(eventIds(fixture.guestTap.frames)).not.toContain(
        eventId(declaration),
      );
      expect(JSON.stringify(fixture.guestTap.frames)).not.toContain(
        hexNeedle(sealedHex),
      );

      // E2E-20 (b): withholding consumed no delivery number, so the
      // opponent cannot count the hidden event from a hole.
      expectGaplessDelivery(fixture.guestTap);

      // E2E-20 (c): the opponent's rendered board does not show the
      // sealed hex. Asserted as a present-element attribute mismatch,
      // never as missing text, so a vanished token cannot pass it.
      const opponentView = fixture.guestPage.getByTestId(
        `unit-token-${actorUnitId}`,
      );
      await expect(opponentView).toHaveCount(1);
      await expect(opponentView).not.toHaveAttribute(
        'data-token-map-position',
        hexText(sealedHex),
      );

      // E2E-23: the PUBLIC facts of the very same command published to
      // the opponent immediately, with no approval step - the opponent
      // surface mounts no GM approval control at all, and nothing in
      // this test clicked one.
      await expect
        .poll(() => frameCountOfType(fixture.guestTap, MOVEMENT_LOCKED), {
          timeout: 15_000,
        })
        .toBeGreaterThan(publicFactsBefore);
      await expect(
        fixture.guestPage.getByTestId('networked-host-gm-controls'),
      ).toHaveCount(0);
      await expect(
        fixture.guestPage.getByTestId('networked-gm-approve-btn'),
      ).toHaveCount(0);

      // E2E-24: one authoritative event, two valid views. The actor's
      // stream carries it, the opponent's does not, BOTH streams are
      // internally gapless and non-empty, the harness digest over each
      // viewer's ordered delivery record differs, and the actor's own
      // board does show what the opponent's does not.
      expectGaplessDelivery(fixture.hostTap);
      expect(eventIds(fixture.hostTap.frames)).toContain(eventId(declaration));
      expect(viewerDigest(fixture.hostTap)).not.toEqual(
        viewerDigest(fixture.guestTap),
      );
      await expect(
        fixture.hostPage.getByTestId(`unit-token-${actorUnitId}`),
      ).toHaveAttribute('data-token-map-position', hexText(sealedHex), {
        timeout: 15_000,
      });

      // E2E-23, the phase half of the letter, asserted last so it
      // cannot disturb the sealed-window evidence above: a committed
      // public phase fact renders on the opponent with no approval
      // interaction anywhere in this test.
      await advancePhase(fixture.hostPage, fixture.guestPage);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
        { timeout: 30_000 },
      );
      expect(frameCountOfType(fixture.guestTap, PHASE_CHANGED)).toBeGreaterThan(
        0,
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-21 Player 2 sealed choice reaches neither Player 1 wire nor board @E2E-21', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const fixture = await openPrivacyFixture(browser, request, 'Privacy B');
    try {
      const hostUnitId = await unitIdOnSide(fixture.hostPage, 'player');
      const guestUnitId = await unitIdOnSide(fixture.guestPage, 'opponent');

      declareSealedChoice(fixture.hostTap, hostUnitId);
      const hostDeclaration = await awaitEventOfType(
        fixture.hostTap,
        MOVEMENT_DECLARED,
      );
      declareSealedChoice(fixture.guestTap, guestUnitId);
      const guestDeclaration = await awaitEventOfType(
        fixture.guestTap,
        MOVEMENT_DECLARED,
      );
      expect(eventId(hostDeclaration)).not.toEqual(eventId(guestDeclaration));
      const guestHex = declaredHex(guestDeclaration);

      // E2E-21: Player 1's artifacts carry neither Player 2's choice
      // nor an inferable gap while the phase is still sealed.
      await fixture.hostPage.waitForTimeout(WITHHOLD_HOLD_MS);
      expect(eventIds(fixture.hostTap.frames)).not.toContain(
        eventId(guestDeclaration),
      );
      expect(JSON.stringify(fixture.hostTap.frames)).not.toContain(
        hexNeedle(guestHex),
      );
      expectGaplessDelivery(fixture.hostTap);
      const player1View = fixture.hostPage.getByTestId(
        `unit-token-${guestUnitId}`,
      );
      await expect(player1View).toHaveCount(1);
      await expect(player1View).not.toHaveAttribute(
        'data-token-map-position',
        hexText(guestHex),
      );

      // Player 2's OWN artifacts do carry it, so the withholding above
      // is an audience decision and not a lost frame - and Player 2's
      // own delivery run stays contiguous while it declares.
      expect(eventIds(fixture.guestTap.frames)).toContain(
        eventId(guestDeclaration),
      );
      expectGaplessDelivery(fixture.guestTap);
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-27 no player surface carries an authority identifier or an inferable gap @E2E-27', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const fixture = await openPrivacyFixture(browser, request, 'Privacy D');
    try {
      const hostUnitId = await unitIdOnSide(fixture.hostPage, 'player');
      const guestUnitId = await unitIdOnSide(fixture.guestPage, 'opponent');
      declareSealedChoice(fixture.hostTap, hostUnitId);
      await awaitEventOfType(fixture.hostTap, MOVEMENT_DECLARED);
      declareSealedChoice(fixture.guestTap, guestUnitId);
      await awaitEventOfType(fixture.guestTap, MOVEMENT_DECLARED);
      await advancePhase(fixture.hostPage, fixture.guestPage);
      await expect(fixture.hostPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
        { timeout: 30_000 },
      );

      for (const tap of [fixture.hostTap, fixture.guestTap]) {
        expect(tap.frames.length).toBeGreaterThan(0);
        expectNoAuthorityFields(tap);
        expectGaplessDelivery(tap);
      }

      // Rendered DOM and browser history state are scanned for the same
      // forbidden names. `page.content()` is the serialized surface a
      // viewer could read out of their own browser.
      for (const page of [fixture.hostPage, fixture.guestPage]) {
        const rendered = await page.content();
        for (const field of AUTHORITY_ONLY_EVENT_FIELDS) {
          expect(rendered).not.toContain(`"${field}"`);
        }
        const historyState = await page.evaluate(() =>
          JSON.stringify(window.history.state ?? null),
        );
        for (const field of AUTHORITY_ONLY_EVENT_FIELDS) {
          expect(historyState).not.toContain(field);
        }
      }
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-22 finalization reveals the COMMITTED declaration on the opponent delivery stream @E2E-22', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const fixture = await openPrivacyFixture(browser, request, 'Privacy E');
    try {
      const actorUnitId = await unitIdOnSide(fixture.hostPage, 'player');
      const opponentUnitId = await unitIdOnSide(fixture.guestPage, 'opponent');
      declareSealedChoice(fixture.hostTap, actorUnitId);
      const declaration = await awaitEventOfType(
        fixture.hostTap,
        MOVEMENT_DECLARED,
      );
      const declarationId = eventId(declaration);
      // Both sides declare, so the phase finalizes with a sealed choice
      // from each and the reveal is not a one-sided special case.
      declareSealedChoice(fixture.guestTap, opponentUnitId);
      await awaitEventOfType(fixture.guestTap, MOVEMENT_DECLARED);

      // Precondition, held long enough for a leaked frame to arrive:
      // before finalization the opponent has no copy at all, so what
      // arrives below is the reveal and not an earlier delivery.
      await fixture.guestPage.waitForTimeout(WITHHOLD_HOLD_MS);
      expect(countEventId(fixture.guestTap.frames, declarationId)).toBe(0);

      await advancePhase(fixture.hostPage, fixture.guestPage);
      await expect(fixture.guestPage.getByTestId('phase-name')).toContainText(
        /Weapon Attack/i,
        { timeout: 30_000 },
      );

      // (a) the authorized reveal reaches the eligible context.
      await expect
        .poll(() => countEventId(fixture.guestTap.frames, declarationId), {
          timeout: 30_000,
        })
        .toBe(1);
      // `expect.poll` stops at its first success, so the exactly-once
      // half is a real wait followed by a re-read.
      await fixture.guestPage.waitForTimeout(WITHHOLD_HOLD_MS);
      expect(countEventId(fixture.guestTap.frames, declarationId)).toBe(1);

      // (b) "from committed viewer delivery streams": what the opponent
      // is handed is the COMMITTED event - byte-identical to the copy
      // the authority delivered to the actor at commit time. Before the
      // reveal read committed rows this differed by exactly the fields
      // the commit path stamps onto its own copy.
      const actorCopy = payloadOfEventId(fixture.hostTap.frames, declarationId);
      expect(actorCopy).toBeDefined();
      expect(payloadOfEventId(fixture.guestTap.frames, declarationId)).toEqual(
        actorCopy,
      );

      // (c) it rode the opponent's OWN delivery stream: their numbers
      // are still one contiguous run, so the reveal was numbered where
      // it was delivered and nothing was skipped to make room for it.
      expect(fixture.guestTap.frames.length).toBeGreaterThan(0);
      expectGaplessDelivery(fixture.guestTap);
    } finally {
      await fixture.cleanup();
    }
  });

  test('E2E-26 a reconnecting player replays exactly what it was delivered live @E2E-26', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);
    const fixture = await openPrivacyFixture(browser, request, 'Privacy F');
    try {
      const actorUnitId = await unitIdOnSide(fixture.hostPage, 'player');
      declareSealedChoice(fixture.hostTap, actorUnitId);
      const declaration = await awaitEventOfType(
        fixture.hostTap,
        MOVEMENT_DECLARED,
      );
      const declarationId = eventId(declaration);
      await advancePhase(fixture.hostPage, fixture.guestPage);
      await expect
        .poll(() => countEventId(fixture.guestTap.frames, declarationId), {
          timeout: 30_000,
        })
        .toBe(1);

      // Everything this viewer HELD from live delivery, captured before
      // the reconnect so the two windows cannot contaminate each other.
      const livePayloads = payloadsByEventId(fixture.guestTap.frames);
      const liveFrameCount = fixture.guestTap.frames.length;

      // A hard reload is a real reconnect: the client keeps no lastSeq
      // across it, so the authority answers SessionJoin with a full
      // replay of what this viewer may hold. MEASURED: the active match
      // route recovers by durable session identity without a second
      // vault unlock (E2E-17's letter), so this waits for the surface
      // itself rather than driving the unlock form - a re-introduced
      // unlock step would fail this wait loudly instead of being
      // papered over by a conditional.
      await fixture.guestPage.reload({ waitUntil: 'domcontentloaded' });
      await expect(
        fixture.guestPage.getByTestId('networked-game-surface'),
      ).toBeVisible({ timeout: 60_000 });
      await expect
        .poll(
          () =>
            countEventId(
              fixture.guestTap.frames.slice(liveFrameCount),
              declarationId,
            ),
          { timeout: 60_000 },
        )
        .toBeGreaterThan(0);
      await fixture.guestPage.waitForTimeout(WITHHOLD_HOLD_MS);

      const replayPayloads = payloadsByEventId(
        fixture.guestTap.frames.slice(liveFrameCount),
      );
      // The revealed declaration is in BOTH windows, so the comparison
      // below is not vacuously true over an empty intersection.
      expect(Object.keys(livePayloads)).toContain(declarationId);
      expect(Object.keys(replayPayloads)).toContain(declarationId);

      // "replay and live payload fields ... SHALL be equivalent": every
      // event this viewer holds twice carries identical payload fields.
      const shared = Object.keys(livePayloads).filter((id) =>
        Object.hasOwn(replayPayloads, id),
      );
      expect(shared.length).toBeGreaterThan(1);
      for (const id of shared) {
        expect(replayPayloads[id]).toEqual(livePayloads[id]);
      }

      // "... plus projection digests": one digest over the whole shared
      // slice, so a single differing field anywhere fails the row even
      // if the per-event loop above were ever narrowed.
      expect(payloadDigest(replayPayloads, shared)).toEqual(
        payloadDigest(livePayloads, shared),
      );
    } finally {
      await fixture.cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * The no-inferable-gap law: this viewer's delivery numbers form one
 * contiguous run. Absence-safe by construction - an empty run would
 * pass, so callers that need frames assert the count separately.
 */
function expectGaplessDelivery(tap: IWireTap): void {
  const seen = deliveryNumbers(tap.frames);
  const numbers = seen
    .filter((value, index) => seen.indexOf(value) === index)
    .sort((left, right) => left - right);
  const contiguous = numbers.map((_value, index) => (numbers[0] ?? 0) + index);
  expect(numbers).toEqual(contiguous);
}

/**
 * No player frame carries an authority-only event field or an
 * authority-only replay bound. `privateRecordRef` is searched over the
 * whole serialized frame because the projector strips it recursively.
 */
function expectNoAuthorityFields(tap: IWireTap): void {
  for (const frame of tap.frames) {
    for (const event of eventsOfFrame(frame)) {
      for (const field of AUTHORITY_ONLY_EVENT_FIELDS) {
        expect(
          Object.hasOwn(event, field),
          `frame ${frameKind(frame)} event carried ${field}`,
        ).toBe(false);
      }
    }
    const kind = frameKind(frame);
    if (kind !== 'ReplayStart' && kind !== 'ReplayEnd') continue;
    for (const field of AUTHORITY_ONLY_REPLAY_FIELDS) {
      expect(Object.hasOwn(frame, field), `${kind} carried ${field}`).toBe(
        false,
      );
    }
  }
  expect(JSON.stringify(tap.frames)).not.toContain('privateRecordRef');
}

// ---------------------------------------------------------------------------
// Wire reading
// ---------------------------------------------------------------------------

/**
 * A stable harness-side digest of one viewer's projection: the ordered
 * list of (delivery number, event id, event type). The wire carries no
 * server-computed projection digest, so this is computed from the
 * captured frames and is only ever compared against another viewer's.
 */
function viewerDigest(tap: IWireTap): string {
  const rows: string[] = [];
  for (const frame of tap.frames) {
    if (frameKind(frame) !== 'Event') continue;
    const event = objectField(frame, 'event');
    if (event === null) continue;
    rows.push(
      [
        numberField(frame, 'deliverySequence') ?? -1,
        stringField(event, 'id') ?? '',
        stringField(event, 'type') ?? '',
      ].join('|'),
    );
  }
  return rows.join('\n');
}

/**
 * A stable digest over one viewer's payloads for a fixed id list.
 * Ordered by id so two capture windows that saw the same events in a
 * different frame order still compare equal - the claim is about
 * payload equivalence, not about arrival order.
 */
function payloadDigest(
  payloads: Readonly<Record<string, unknown>>,
  ids: readonly string[],
): string {
  return [...ids]
    .sort()
    .map((id) => `${id}|${JSON.stringify(payloads[id] ?? null)}`)
    .join('\n');
}

function deliveryNumbers(frames: readonly WireFrame[]): number[] {
  const numbers: number[] = [];
  for (const frame of frames) {
    if (frameKind(frame) === 'Event') {
      const value = numberField(frame, 'deliverySequence');
      if (value !== null) numbers.push(value);
      continue;
    }
    if (frameKind(frame) !== 'ReplayChunk') continue;
    const chunk = frame['deliverySequences'];
    if (!Array.isArray(chunk)) continue;
    for (const value of chunk) {
      if (typeof value === 'number') numbers.push(value);
    }
  }
  return numbers;
}

/** Every event object a frame carries, live or replayed. */
function eventsOfFrame(frame: WireFrame): readonly WireFrame[] {
  if (frameKind(frame) === 'Event') {
    const event = objectField(frame, 'event');
    return event === null ? [] : [event];
  }
  if (frameKind(frame) !== 'ReplayChunk') return [];
  const events = frame['events'];
  if (!Array.isArray(events)) return [];
  return events.filter(isRecord);
}

function eventIds(frames: readonly WireFrame[]): readonly string[] {
  const ids: string[] = [];
  for (const frame of frames) {
    for (const event of eventsOfFrame(frame)) {
      const id = stringField(event, 'id');
      if (id !== null) ids.push(id);
    }
  }
  return ids;
}

function countEventId(frames: readonly WireFrame[], id: string): number {
  return eventIds(frames).filter((candidate) => candidate === id).length;
}

function payloadsByEventId(
  frames: readonly WireFrame[],
): Readonly<Record<string, unknown>> {
  const payloads: Record<string, unknown> = {};
  for (const frame of frames) {
    for (const event of eventsOfFrame(frame)) {
      const id = stringField(event, 'id');
      if (id === null || Object.hasOwn(payloads, id)) continue;
      payloads[id] = event['payload'];
    }
  }
  return payloads;
}

function payloadOfEventId(frames: readonly WireFrame[], id: string): unknown {
  return payloadsByEventId(frames)[id];
}

function payloadOfEvent(event: WireFrame): unknown {
  return event['payload'];
}

function eventId(event: WireFrame): string {
  const id = stringField(event, 'id');
  if (id === null) throw new Error('Captured event carried no id');
  return id;
}

/** The hex a sealed declaration commits to - the sealed secret itself. */
function declaredHex(declaration: WireFrame): Hex {
  const payload = objectField(declaration, 'payload');
  const to = payload === null ? null : objectField(payload, 'to');
  const q = to === null ? null : numberField(to, 'q');
  const r = to === null ? null : numberField(to, 'r');
  if (q === null || r === null) {
    throw new Error('Sealed declaration carried no destination hex');
  }
  return { q, r };
}

/** The exact JSON spelling a leaked hex would take on the wire. */
function hexNeedle(hex: Hex): string {
  return `"q":${hex.q},"r":${hex.r}`;
}

/** The `data-token-map-position` spelling of a hex. */
function hexText(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

function frameCountOfType(tap: IWireTap, type: string): number {
  let count = 0;
  for (const frame of tap.frames) {
    for (const event of eventsOfFrame(frame)) {
      if (stringField(event, 'type') === type) count += 1;
    }
  }
  return count;
}

/**
 * Waits for the first event of `type` on this tap and returns it. On
 * timeout the poll reports what the wire DID carry, so a refused intent
 * names its own typed refusal instead of a bare boolean.
 */
async function awaitEventOfType(
  tap: IWireTap,
  type: string,
): Promise<WireFrame> {
  await expect
    .poll(
      () => (firstEventOfType(tap, type) === null ? wireSummary(tap) : type),
      { timeout: 30_000 },
    )
    .toBe(type);
  const event = firstEventOfType(tap, type);
  if (event === null) throw new Error(`No ${type} event reached the wire`);
  return event;
}

/** Compact description of everything one tap has seen, for failures. */
function wireSummary(tap: IWireTap): string {
  const types: string[] = [];
  const refusals: string[] = [];
  for (const frame of tap.frames) {
    if (frameKind(frame) === 'Error') {
      refusals.push(
        `${stringField(frame, 'code')}/${stringField(frame, 'reason')}`,
      );
    }
    for (const event of eventsOfFrame(frame)) {
      const eventType = stringField(event, 'type');
      if (eventType === null) continue;
      types.push(
        eventType === 'movement_invalid'
          ? `movement_invalid${JSON.stringify(event['payload'])}`
          : eventType,
      );
    }
  }
  return `events=[${types.join(',')}] errors=[${refusals.join(',')}]`;
}

function firstEventOfType(tap: IWireTap, type: string): WireFrame | null {
  for (const frame of tap.frames) {
    for (const event of eventsOfFrame(frame)) {
      if (stringField(event, 'type') === type) return event;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Driving the sealed declaration
// ---------------------------------------------------------------------------

/**
 * Issues one real `GoProne` intent through the actor page's own socket.
 * The engine answers it with `MovementDeclared` (sealed to the actor
 * until the phase finalizes) plus `MovementLocked` (public).
 */
function declareSealedChoice(tap: IWireTap, unitId: string): void {
  const identity = tap.identity;
  if (identity === null) {
    throw new Error('No envelope identity was observed on this page socket');
  }
  tap.send({
    kind: 'Intent',
    matchId: identity.matchId,
    ts: new Date().toISOString(),
    playerId: identity.playerId,
    intentId: `privacy-pack-${crypto.randomUUID()}`,
    intent: { kind: 'GoProne', unitId },
  });
}

/** Reads the id of one rendered token on `side` from this page's board. */
async function unitIdOnSide(page: Page, side: Side): Promise<string> {
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
    if (!testId.startsWith('unit-token-')) continue;
    return testId.slice('unit-token-'.length);
  }
  throw new Error(`No rendered token on side ${side}`);
}

// ---------------------------------------------------------------------------
// Fixture (helpers copied from e2e/gm-two-player-exactly-once.pack.spec.ts;
// consolidating the tactical packs onto one module is its own seam)
// ---------------------------------------------------------------------------

async function openPrivacyFixture(
  browser: Browser,
  request: APIRequestContext,
  label: string,
): Promise<IFixture> {
  const identities: string[] = [];
  let match: Match | null = null;
  let hostToken: Token | null = null;
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const hostTap = await tapWire(hostPage);
  const guestTap = await tapWire(guestPage);
  try {
    const hostName = `${label} Host`;
    const guestName = `${label} Guest`;
    const host = await seedIdentity(request, hostName, HOST_PASSWORD);
    identities.push(host.id);
    await hostPage.goto('/multiplayer');
    await hostPage.getByPlaceholder('Vault password').fill(HOST_PASSWORD);
    await hostPage.getByLabel('Display name').fill(hostName);
    await hostPage.getByLabel('Map radius').fill('4');
    await hostPage.getByLabel('Turn limit').fill('5');
    const created = hostPage.waitForResponse(
      (response) =>
        response.url().endsWith('/api/multiplayer/matches') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
      { timeout: 30_000 },
    );
    const token = hostPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    );
    await Promise.all([
      hostPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      hostPage.getByRole('button', { name: 'Create match' }).click(),
    ]);
    hostToken = await readToken(token);
    match = await readMatch(created);
    await connectLobby(hostPage, HOST_PASSWORD);

    const guest = await seedIdentity(request, guestName, GUEST_PASSWORD);
    identities.push(guest.id);
    await guestPage.goto('/multiplayer');
    await guestPage.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
    await guestPage.getByLabel('Room code').fill(match.roomCode);
    await Promise.all([
      guestPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      guestPage.getByRole('button', { name: 'Join match' }).click(),
    ]);
    await connectLobby(guestPage, GUEST_PASSWORD);
    await markReady(hostPage, 'alpha-1');
    await markReady(guestPage, 'bravo-1');
    await hostPage.getByRole('button', { name: 'Launch match' }).click();
    await expect(hostPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 60_000,
    });
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 60_000,
    });
    await advancePhase(hostPage, guestPage);
    await expect(hostPage.getByTestId('phase-name')).toContainText(
      /Movement/i,
      {
        timeout: 30_000,
      },
    );
    await expect(guestPage.getByTestId('phase-name')).toContainText(
      /Movement/i,
      { timeout: 30_000 },
    );
    return {
      hostPage,
      guestPage,
      hostTap,
      guestTap,
      cleanup: async () => {
        if (match && hostToken) {
          await request.delete(`/api/multiplayer/matches/${match.matchId}`, {
            headers: { Authorization: `Bearer ${hostToken.token}` },
          });
        }
        await deleteIdentities(request, identities);
        await hostPage.context().close();
        await guestPage.context().close();
      },
    };
  } catch (error) {
    await hostPage.context().close();
    await guestPage.context().close();
    await deleteIdentities(request, identities);
    throw error;
  }
}

/**
 * Observer-and-injector tap: every frame in both directions is passed
 * through untouched and recorded. `send` reuses the live server-side
 * route so an injected envelope travels the page's own socket.
 */
async function tapWire(page: Page): Promise<IWireTap> {
  const frames: WireFrame[] = [];
  let upstream: WebSocketRoute | null = null;
  let identity: { readonly matchId: string; readonly playerId: string } | null =
    null;
  await page.routeWebSocket(
    (url) => url.pathname === '/api/multiplayer/socket',
    (route) => {
      const server = route.connectToServer();
      upstream = server;
      route.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame !== null && identity === null) {
          const matchId = stringField(frame, 'matchId');
          const playerId = stringField(frame, 'playerId');
          if (matchId !== null && playerId !== null) {
            identity = { matchId, playerId };
          }
        }
        server.send(message);
      });
      server.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame !== null) frames.push(frame);
        route.send(message);
      });
    },
  );
  return {
    frames,
    get identity() {
      return identity;
    },
    send: (envelope) => {
      if (upstream === null) throw new Error('Page socket is not connected');
      upstream.send(JSON.stringify(envelope));
    },
  };
}

async function seedIdentity(
  request: APIRequestContext,
  displayName: string,
  password: string,
): Promise<Identity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as Identity;
}

async function deleteIdentities(
  request: APIRequestContext,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const response = await request.delete('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId() },
    data: { ids },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function openContextPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function connectLobby(page: Page, password: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Unlock vault' })).toBeVisible(
    {
      timeout: 20_000,
    },
  );
  await page.getByPlaceholder('Vault password').fill(password);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    ),
    page.getByRole('button', { name: 'Connect to lobby' }).click(),
  ]);
}

async function markReady(page: Page, slotId: string): Promise<void> {
  const row = page.locator(`[data-slot-id="${slotId}"]`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button', { name: 'Ready' }).click();
  await expect(row).toContainText('Ready', { timeout: 15_000 });
}

async function advancePhase(...pages: readonly Page[]): Promise<void> {
  let activeIndex = -1;
  await expect
    .poll(
      async () => {
        for (let index = 0; index < pages.length; index += 1) {
          const page = pages[index];
          if (!page) continue;
          const control = page.getByTestId('advance-phase-button');
          if ((await control.count()) === 1 && (await control.isEnabled())) {
            activeIndex = index;
            return true;
          }
        }
        return false;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  const activePage = pages[activeIndex];
  if (!activePage) throw new Error('No player can advance the phase');
  await activePage.getByTestId('advance-phase-button').click();
}

async function readToken(
  response: Promise<import('@playwright/test').Response>,
): Promise<Token> {
  return (await (await response).json()) as Token;
}

async function readMatch(
  response: Promise<import('@playwright/test').Response>,
): Promise<Match> {
  const body = (await (await response).json()) as {
    readonly matchId: string;
    readonly roomCode?: string;
    readonly meta: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta.roomCode;
  if (!roomCode) throw new Error('Match response lacked a room code');
  return { matchId: body.matchId, roomCode };
}

function parseFrame(message: string | Buffer): WireFrame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return isRecord(parsed) ? parsed : null;
}

function frameKind(frame: WireFrame): string | null {
  return stringField(frame, 'kind');
}

function stringField(value: WireFrame, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' ? field : null;
}

function numberField(value: WireFrame, key: string): number | null {
  const field = value[key];
  return typeof field === 'number' ? field : null;
}

function objectField(value: WireFrame, key: string): WireFrame | null {
  const field = value[key];
  return isRecord(field) ? field : null;
}

function isRecord(value: unknown): value is WireFrame {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runId(): string {
  const value = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!value) throw new Error('PLAYWRIGHT_E2E_RUN_ID missing');
  return value;
}
