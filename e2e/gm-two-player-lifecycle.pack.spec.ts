/**
 * Lifecycle posture pack - E2E-75 (umbrella 22.3), rows A and B.
 *
 * E2E-75: "WHEN the harness drives pending, sealed, finalized, syncing,
 * reconnecting, behind, rebuilding, rewound, and blocked states THEN each
 * SHALL have a stable locator, persistent text, non-color-only semantics,
 * correct command gating, and an assistive-technology announcement."
 *
 * Row A drives sealed, finalized, syncing and behind plus `live` as the
 * converged control, on ONE match, in the precedence order of `deriveState`
 * (tacticalLifecycleState.ts:188-208) so each step only adds a fault or
 * releases the one before it. `pending` and `blocked` are row B, held for
 * successor U1e which adds its row to this file under the same group; row A
 * pins that their sentences collide with none of the five driven here.
 *
 * Row B (unit U1e) drives those two, on its own match, through the same
 * harness, and asserts the same five obligations through the same
 * `capturePosture` - so the letter cannot be met one way in one row and
 * another way in the other. It does NOT re-drive row A's five: their
 * sentences enter the distinctness obligation through
 * `deriveTacticalLifecyclePosture`, the product's own message table, which
 * is the mirror image of the pin row A already carries for row B's two. What
 * licenses that is asserted here rather than assumed - for each posture row
 * B DOES drive, the sentence read off the banner is the sentence the product
 * derives for it.
 *
 * Row B's two levers are additions to the harness below, disarmed at
 * construction and never called by row A. `dropNextIntent` swallows the
 * guest's next outbound `Intent`, so no receipt can ever carry its intentId
 * (client.ts:349-352, :394, :1377-1380) and the posture is PERMANENT rather
 * than the single round trip a healthy command takes - which is what
 * separates a driven `pending` from one the product passes through on its
 * own. `collideNextDelivery` forwards a real delivered frame and then a twin
 * of it at the same sequence with a different `event.id`, which is exactly
 * the condition client.ts:897 turns into `blockedBySequenceCollision`, a
 * flag written in one place and cleared in none. Both faults are duplicates
 * or omissions of frames the server really sent.
 *
 * THREE NON-CLAIMS. `reconnecting`: `reconnectScheduled` is a real field
 * (client.ts:1125) that deriveState maps (:202), but no available lever
 * renders it - three were tried with a MutationObserver recording EVERY
 * transition (plain close; close plus one refused reopen; setOffline, inert
 * because routeWebSocket dials from Playwright's process) and the series
 * steps straight to `behind`; widening the outage is barred by
 * maxReconnectAttempts: 2 and the 60s seat grace. `rewound`:
 * PROJECTION_REWOUND is in no server vocabulary (Protocol.ts:741-787).
 * `rebuilding`: a pure function of a correction lease no in-paths lever
 * acquires (EventHistoryDurableRebuild.ts:45-59). Simulating either frame
 * would assert a behaviour the product does not have.
 *
 * THE GATE ASSERTED IS NOT `commandsEnabled`, which is true for exactly
 * live/finalized and rendered nowhere. The surface applies
 * `tacticalCommandAvailability` (tacticalCommandGate.ts:60-73), refusing the
 * six GATE_REASONS keys and reaching the player through `aria-describedby` ->
 * `#networked-action-refusal`. The divergence is deliberate (:11-21).
 *
 * FINDING, recorded in the unit ledger (fix owner unassigned): a launched
 * match leaves BOTH surfaces permanently at `pending`, masking
 * live/sealed/finalized all match, because the lobby Ready control sends a
 * real `SetReady` Intent (LobbyPanel.tsx:141-147) the server answers with
 * `LobbyUpdated` - neither an Event carrying payload.intentId nor an Error -
 * so it never settles (client.ts:349-352, :394, :1377-1380). This row reloads
 * once after launch because `pendingIntents` is per-client (client.ts:607).
 *
 * Full evidence, levers and mutants:
 * openspec/planning/2026-09-12-roadmap-completion/evidence/u1c-local-20260916.json
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md (E2E-75)
 * @tags @lifecycle-pack @E2E-75
 */

import { expect, test, type Page } from '@playwright/test';
import crypto from 'node:crypto';

import type { IClientLifecycleState } from '@/lib/multiplayer/tacticalLifecycleState';

import { tacticalCommandAvailability } from '@/lib/multiplayer/tacticalCommandGate';
import { deriveTacticalLifecyclePosture } from '@/lib/multiplayer/tacticalLifecycleState';

import {
  advancePhase,
  deleteIdentities,
  launchOneVersusOne,
  openContextPage,
} from './helpers/gmTwoPlayerMatchFlow';
import { unitIdOnSide } from './helpers/gmTwoPlayerRewind';

const HOST_PASSWORD = 'LifecycleHost123!';
const GUEST_PASSWORD = 'LifecycleGuest123!';

/** The sr-only refusal node the gate renders, and controls point at. */
const REFUSAL_LOCATOR = '#networked-action-refusal';

/** The postures tacticalCommandGate.ts:37-48 refuses, named off its keys. */
const GATED_STATES: ReadonlySet<string> = new Set([
  'blocked',
  'rebuilding',
  'rewound',
  'syncing',
  'reconnecting',
  'behind',
]);

/** A healthy client: every fault field off, ready, nothing outstanding. */
const IDLE_CLIENT: IClientLifecycleState = {
  blockedBySequenceCollision: false,
  pendingIntentCount: 0,
  ready: true,
  reconnectScheduled: false,
  recoveringFromGap: false,
};

/** The five postures row A drives. Row B pins its two against them. */
const ROW_A_STATES = [
  'live',
  'sealed',
  'finalized',
  'syncing',
  'behind',
] as const;

/**
 * The one condition that makes `deriveState` (tacticalLifecycleState.ts
 * :188-208) answer each posture. Row B compares SENTENCES, so it needs the
 * product to produce them; naming the conditions rather than the strings is
 * what keeps this from becoming a second copy of the message table.
 */
const POSTURE_CONDITION: Readonly<
  Record<
    string,
    {
      readonly client?: Partial<IClientLifecycleState>;
      readonly sealedChoiceAwaitingReveal?: boolean;
      readonly finalizationLanded?: boolean;
    }
  >
> = {
  live: {},
  sealed: { sealedChoiceAwaitingReveal: true },
  finalized: { finalizationLanded: true },
  syncing: { client: { recoveringFromGap: true } },
  behind: { client: { ready: false } },
  pending: { client: { pendingIntentCount: 1 } },
  blocked: { client: { blockedBySequenceCollision: true } },
};

type WireFrame = Record<string, unknown>;

interface IPostureEvidence {
  readonly state: string;
  readonly text: string;
  readonly gateRefused: boolean;
  readonly refusalReason: string | null;
  readonly ariaSnapshot: string;
}

interface ILifecycleHarness {
  /** Envelope identity harvested from this page's own outbound frames. */
  readonly identity: {
    readonly matchId: string;
    readonly playerId: string;
  } | null;
  /** Send one raw client->server frame on the page's own socket. */
  send(frame: WireFrame): void;
  /** Swallow the next delivered frame once, opening a gap. */
  dropNextDelivery(): void;
  /** Swallow the page's next outbound `Intent` once, so it never settles. */
  dropNextIntent(): void;
  /** Deliver the next delivered frame, then a twin at the same sequence. */
  collideNextDelivery(): void;
  /** Withhold `ReplayEnd` until released. */
  holdReplayEnd(): void;
  /** Deliver every withheld `ReplayEnd`, oldest first. */
  releaseReplayEnd(): void;
  /** Kill the server side now, and refuse the next `count` reopens. */
  closeAndRefuse(count: number): void;
}

test('E2E-75 lifecycle postures are distinct, announced and correctly gated @lifecycle-pack @E2E-75', async ({
  browser,
  request,
}) => {
  test.setTimeout(300_000);
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  // Routes must be installed before any socket opens.
  const harness = await installLifecycleHarness(guestPage);
  const seenText = new Map<string, string>();
  const evidence: IPostureEvidence[] = [];
  let identityIds: readonly string[] = [];
  let matchId: string | null = null;
  let hostBearer: string | null = null;

  try {
    const live = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Lifecycle Host',
      guestName: 'Lifecycle Guest',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
      // Several phase advances are driven below; 5 would end the match.
      turnLimit: '20',
    });
    identityIds = live.identityIds;
    matchId = live.match.matchId;
    hostBearer = live.hostToken.token;

    // Clears the never-settled lobby `SetReady` intent - see the header
    // FINDING. Measured: both surfaces report `live` after this.
    await guestPage.reload();
    await hostPage.reload();
    // The GoProne below is refused while the host is still away; see
    // waitForRejoin.
    await waitForRejoin(hostPage, guestPage);

    await capturePosture(guestPage, 'live', seenText, evidence);

    // sealed: a real GoProne on the guest's socket - the UI path needs a hex
    // selection with no stable locator (privacy pack :117-143).
    sendGoProne(harness, await unitIdOnSide(guestPage, 'opponent'));
    await capturePosture(guestPage, 'sealed', seenText, evidence);

    // finalized: the phase the declaration was sealed in closes.
    await advancePhase(hostPage, guestPage);
    await capturePosture(guestPage, 'finalized', seenText, evidence);

    // syncing: one delivery withheld, answering ReplayEnd held so it holds.
    harness.holdReplayEnd();
    harness.dropNextDelivery();
    await advancePhase(hostPage, guestPage);
    await capturePosture(guestPage, 'syncing', seenText, evidence);
    // Released first: `syncing` outranks `behind` and would absorb it.
    harness.releaseReplayEnd();
    await expect
      .poll(() => postureState(guestPage), { timeout: 30_000 })
      .not.toBe('syncing');

    // behind: socket death plus ONE refused reopen (two abandons the session
    // at maxReconnectAttempts: 2), ReplayEnd held again - it is the only frame
    // clearing recoveringFromGap AND setting ready (client.ts:288-311).
    harness.holdReplayEnd();
    harness.closeAndRefuse(1);
    await capturePosture(guestPage, 'behind', seenText, evidence, 30_000);
    harness.releaseReplayEnd();

    // ---- the letter's cross-posture obligations ----
    expect(evidence.map((row) => row.state)).toEqual([
      'live',
      'sealed',
      'finalized',
      'syncing',
      'behind',
    ]);
    // Non-color-only as a property, not a class name: LIFECYCLE_TONE (:60-71)
    // gives behind/rewound/rebuilding one palette triple and
    // pending/syncing/reconnecting another, so colour cannot separate them.
    const drivenText = evidence.map((row) => row.text);
    expect(new Set(drivenText).size).toBe(drivenText.length);
    // Correct command gating, both ways, over the whole run.
    for (const row of evidence) {
      expect({ state: row.state, refused: row.gateRefused }).toEqual({
        state: row.state,
        refused: GATED_STATES.has(row.state),
      });
    }
    // syncing and behind are the gated pair here; each names its own posture.
    const reasons = evidence
      .filter((row) => row.refusalReason !== null)
      .map((row) => row.refusalReason);
    expect(reasons).toHaveLength(2);
    expect(new Set(reasons).size).toBe(2);
    // Row B's postures are not driven, but their sentences are pinned against
    // the five that are, read through the product's own derivation.
    const heldBack = [
      derivePosture({ pendingIntentCount: 1 }),
      derivePosture({ blockedBySequenceCollision: true }),
    ];
    expect(heldBack.map((posture) => posture.state)).toEqual([
      'pending',
      'blocked',
    ]);
    for (const posture of heldBack) {
      expect(drivenText).not.toContain(posture.message);
    }
    expect(heldBack[0]?.message).not.toBe(heldBack[1]?.message);
  } finally {
    // Always logged: on failure it names what the surface DID reach.
    console.log(
      `[lifecycle-pack] captured=${evidence.map((row) => row.state).join(',')}`,
    );
    if (matchId && hostBearer) {
      await request.delete(`/api/multiplayer/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${hostBearer}` },
      });
    }
    await deleteIdentities(request, identityIds);
    await hostPage.context().close();
    await guestPage.context().close();
  }
});

test('E2E-75 lifecycle postures pending and blocked are distinct, announced and correctly gated @lifecycle-pack @E2E-75', async ({
  browser,
  request,
}) => {
  test.setTimeout(300_000);
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  // Routes must be installed before any socket opens.
  const harness = await installLifecycleHarness(guestPage);
  const seenText = new Map<string, string>();
  const evidence: IPostureEvidence[] = [];
  let identityIds: readonly string[] = [];
  let matchId: string | null = null;
  let hostBearer: string | null = null;

  try {
    const live = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Lifecycle B Host',
      guestName: 'Lifecycle B Guest',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
      // The drives below advance the phase repeatedly; 5 would end the match.
      turnLimit: '20',
    });
    identityIds = live.identityIds;
    matchId = live.match.matchId;
    hostBearer = live.hostToken.token;

    // Row A's reload, for the header's FINDING, and it matters MORE here:
    // without it the surface already sits at `pending` from the lobby's
    // never-settled `SetReady`, and the arm below would be reading that
    // defect instead of its own dropped intent. Asserting `live` first is
    // what makes the arm falsifiable rather than inherited.
    await guestPage.reload();
    await hostPage.reload();
    await waitForRejoin(hostPage, guestPage);
    await expect
      .poll(() => postureState(guestPage), { timeout: 60_000 })
      .toBe('live');

    // pending: one of the guest's own commands swallowed in flight. Armed
    // BEFORE the drive, because only this page is routed and the arm has to
    // wait for the guest's own next intent rather than be paired with a click.
    harness.dropNextIntent();
    await driveUntilPosture(guestPage, hostPage, 'pending');
    await capturePosture(guestPage, 'pending', seenText, evidence);
    // PERMANENT, not the one round trip a healthy command takes. Nothing
    // settles an intent the server never received, and this is the read that
    // says the posture was driven rather than caught in passing.
    await guestPage.waitForTimeout(2_000);
    expect(await postureState(guestPage)).toBe('pending');

    // blocked: two event identities claim one delivery sequence. Precedence 1
    // (tacticalLifecycleState.ts:189), so it outranks the pending still held
    // and the ladder stays additive - no fault is torn down to reach it.
    harness.collideNextDelivery();
    await driveUntilPosture(guestPage, hostPage, 'blocked');
    await capturePosture(guestPage, 'blocked', seenText, evidence);

    // ---- the letter's cross-posture obligations ----
    expect(evidence.map((row) => row.state)).toEqual(['pending', 'blocked']);
    // Each rendered sentence IS the product's own message for that posture.
    // This is what licenses comparing a DERIVED row-A message against a
    // RENDERED row-B one on the next assertion.
    for (const row of evidence) {
      expect(row.text).toBe(postureOf(row.state).message);
    }
    // Non-color-only across all SEVEN postures this pack drives, not just the
    // two driven here: LIFECYCLE_TONE (lifecycleState.ts:60-71) gives
    // pending/syncing/reconnecting one palette triple and behind another, so
    // colour cannot separate pending from syncing and the sentence must. Row
    // A's five arrive through the product's own derivation rather than being
    // re-driven - the mirror of the pin row A carries for these two.
    const allText = [
      ...ROW_A_STATES.map((state) => postureOf(state).message),
      ...evidence.map((row) => row.text),
    ];
    expect(new Set(allText).size).toBe(allText.length);
    // Correct command gating, both ways. The player's OWN in-flight command
    // stays playable and a collided stream refuses; tacticalCommandGate.ts
    // :11-24 is why those are different questions.
    expect(evidence.map((row) => row.gateRefused)).toEqual([false, true]);
    // The refusal a player is given is the GATE's own sentence, and it names
    // this posture rather than sharing one with the other gated states.
    const blockedRefusal = evidence[1]?.refusalReason ?? null;
    expect(blockedRefusal).toBe(refusalFor('blocked'));
    expect([refusalFor('syncing'), refusalFor('behind')]).not.toContain(
      blockedRefusal,
    );
  } finally {
    // Always logged: on failure it names what the surface DID reach.
    console.log(
      `[lifecycle-pack] rowB captured=${evidence
        .map((row) => row.state)
        .join(',')}`,
    );
    if (matchId && hostBearer) {
      await request.delete(`/api/multiplayer/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${hostBearer}` },
      });
    }
    await deleteIdentities(request, identityIds);
    await hostPage.context().close();
    await guestPage.context().close();
  }
});

/**
 * Advances the phase until the guest reaches `state`, or fails naming what it
 * actually reached.
 *
 * THE GUEST IS PASSED FIRST, and that is a measurement rather than a style.
 * `advancePhase` takes the FIRST page whose control is enabled
 * (helpers/gmTwoPlayerMatchFlow.ts:117-146); with the host first, eight
 * advances ran without the guest ever clicking and the drive failed `Guest
 * never reached pending; last posture finalized`. Both row-B faults are armed
 * on the guest's own socket, so the drive has to prefer the guest and fall
 * back to the host only when the turn gate has not opened the guest's control.
 *
 * A loop rather than a paired click, because the fault fires on the guest's
 * own next intent or next delivery whenever the rotation reaches it. The throw
 * is tolerated for the same reason the loop exists - a collided client
 * self-pauses and its phase control DETACHES, so the advance that DELIVERS the
 * collision can be the advance whose click loses its target. A lost click is
 * only a lost click; a genuinely stuck drive still runs out of attempts.
 */
async function driveUntilPosture(
  guestPage: Page,
  hostPage: Page,
  state: string,
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if ((await postureState(guestPage)) === state) return;
    try {
      await advancePhase(guestPage, hostPage);
    } catch {
      // See above.
    }
    if ((await postureState(guestPage)) === state) return;
    await guestPage.waitForTimeout(500);
  }
  if ((await postureState(guestPage)) === state) return;
  throw new Error(
    `Guest never reached ${state}; last posture ${await postureState(guestPage)}`,
  );
}

/**
 * The posture the product derives for one state name, checked to BE that
 * state so a wrong condition cannot silently pin the wrong sentence.
 */
function postureOf(
  state: string,
): ReturnType<typeof deriveTacticalLifecyclePosture> {
  const condition = POSTURE_CONDITION[state];
  if (condition === undefined) {
    throw new Error(`No derivation condition for ${state}`);
  }
  const posture = deriveTacticalLifecyclePosture({
    client: { ...IDLE_CLIENT, ...condition.client },
    sealedChoiceAwaitingReveal: condition.sealedChoiceAwaitingReveal ?? false,
    finalizationLanded: condition.finalizationLanded ?? false,
    projectionSignal: null,
  });
  expect(posture.state).toBe(state);
  return posture;
}

/** The gate's own refusal sentence for one posture, or null when it allows. */
function refusalFor(state: string): string | null {
  const availability = tacticalCommandAvailability(postureOf(state));
  return availability.available ? null : availability.reason;
}

/** The posture the product derives for one client-state override. */
function derivePosture(
  client: Partial<IClientLifecycleState>,
): ReturnType<typeof deriveTacticalLifecyclePosture> {
  return deriveTacticalLifecyclePosture({
    client: { ...IDLE_CLIENT, ...client },
    sealedChoiceAwaitingReveal: false,
    finalizationLanded: false,
    projectionSignal: null,
  });
}

/**
 * Waits for one posture and asserts the letter's five obligations on it. Read
 * live, because every posture row A drives is held stable by construction;
 * row B's are not, which is why its patch carries a recorder this row omits.
 * Program order plus the ordered list above is what makes the five a SEQUENCE.
 */
async function capturePosture(
  page: Page,
  state: string,
  seenText: Map<string, string>,
  evidence: IPostureEvidence[],
  timeout = 60_000,
): Promise<void> {
  const banner = page.getByTestId('tactical-lifecycle-state');
  // 1. Stable locator: `data-state`, never the wording. Bounded per step so a
  //    slow posture cannot run into the 60s seat grace and report "Match
  //    ended" in place of the posture that never arrived.
  await expect
    .poll(() => postureState(page), { timeout, intervals: [100] })
    .toBe(state);
  // 2. Persistent text: the banner renders on every posture (:19-25).
  const text = (await banner.innerText()).trim();
  expect(text.length).toBeGreaterThan(0);
  // 3. Announcement. `status` is not a name-from-content role, so the banner
  //    has no accessible NAME (measured: a name-filtered query resolves
  //    nothing); what is announced is the live region's CONTENT, atomically.
  await expect(banner).toHaveRole('status');
  await expect(banner).toHaveAttribute('aria-live', 'polite');
  await expect(banner).toHaveAttribute('aria-atomic', 'true');
  // 4. Non-color-only: no posture may reuse another's sentence.
  expect(seenText.get(text) ?? state).toBe(state);
  seenText.set(text, state);
  // 5. Command gating, read where a player feels it: the sr-only node
  //    `aria-describedby` points at, present exactly when the gate refuses.
  const refusal = page.locator(REFUSAL_LOCATOR);
  const gateRefused = (await refusal.count()) > 0;
  const refusalReason = gateRefused ? (await refusal.innerText()).trim() : null;
  expect(gateRefused).toBe(GATED_STATES.has(state));
  if (refusalReason !== null) expect(refusalReason.length).toBeGreaterThan(0);
  // Evidence: the platform's accessibility tree, asserted to carry this
  // posture's sentence. Never compared between postures - that would gate on
  // sibling chrome this row does not own.
  const ariaSnapshot = await banner.ariaSnapshot();
  expect(ariaSnapshot).toContain(text);
  evidence.push({ state, text, gateRefused, refusalReason, ariaSnapshot });
}

/**
 * The banner's posture, or '' when there is none. Absence must be a VALUE: a
 * timeout thrown inside `expect.poll` aborts the poll instead of retrying it.
 */
async function postureState(page: Page): Promise<string> {
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
 * Polls, every 100 ms for up to 60 s, until the host's banner reads `live`
 * and neither page renders `match-pause-overlay`, all three read in the same
 * poll round. Throws on timeout naming the last values read.
 *
 * Why after a reload pair: a dropped seat pauses the match
 * (ServerMatchHostReconnectLifecycle.ts:31-51) and every engine intent is
 * refused MATCH_PAUSED until that seat rejoins (ServerMatchHostIntent.ts
 * :275-283), while the guest's banner keeps reading `live` - the pause is
 * the overlay's arm, not the banner's (NetworkedGameSurface.tsx:234-242).
 * The host's banner is the signal that carries the rejoin: it renders only
 * once the host's new socket has replayed. The overlay alone is not one -
 * MatchPaused is broadcast once, when the seat drops, so a guest that
 * rejoined after the host dropped never shows it (measured: the overlay
 * stayed absent for 30 s with the host held away).
 */
async function waitForRejoin(hostPage: Page, guestPage: Page): Promise<void> {
  await expect
    .poll(
      async () => ({
        host: await postureState(hostPage),
        hostPaused: await pauseOverlayShown(hostPage),
        guestPaused: await pauseOverlayShown(guestPage),
      }),
      { timeout: 60_000, intervals: [100] },
    )
    .toEqual({ host: 'live', hostPaused: false, guestPaused: false });
}

/** Whether the page currently renders the match-pause overlay. */
async function pauseOverlayShown(page: Page): Promise<boolean> {
  return (await page.getByTestId('match-pause-overlay').count()) > 0;
}

/** One real `GoProne`; the engine answers `MovementDeclared`, sealed. */
function sendGoProne(harness: ILifecycleHarness, unitId: string): void {
  const identity = harness.identity;
  if (identity === null) {
    throw new Error('No envelope identity was observed on this page socket');
  }
  harness.send({
    kind: 'Intent',
    matchId: identity.matchId,
    ts: new Date().toISOString(),
    playerId: identity.playerId,
    intentId: `lifecycle-pack-${crypto.randomUUID()}`,
    intent: { kind: 'GoProne', unitId },
  });
}

/**
 * A per-page transport harness that WITHHOLDS and CLOSES real frames. It never
 * invents a refusal code: every posture here is reached by a transport fault
 * the shipped client contract already specifies.
 */
async function installLifecycleHarness(page: Page): Promise<ILifecycleHarness> {
  let identity: { readonly matchId: string; readonly playerId: string } | null =
    null;
  let sendToServer: ((text: string) => void) | null = null;
  let closeServer: (() => void) | null = null;
  let dropDelivery = false;
  let dropIntent = false;
  let collide = false;
  let holdingReplayEnd = false;
  let refuseReopens = 0;
  const withheld: string[] = [];
  let release: (() => void) | null = null;

  await page.routeWebSocket(
    (url) => url.pathname === '/api/multiplayer/socket',
    (route) => {
      const server = route.connectToServer();
      sendToServer = (text) => server.send(text);
      closeServer = () => void server.close();
      // Withheld frames belong to the socket they came from.
      withheld.length = 0;
      route.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame !== null && identity === null) {
          const matchId = stringField(frame, 'matchId');
          const playerId = stringField(frame, 'playerId');
          if (matchId !== null && playerId !== null) {
            identity = { matchId, playerId };
          }
        }
        // Dropped on the way OUT, so the server never sees the command and
        // nothing can ever receipt it. The client keeps its pendingIntents
        // entry (client.ts:1336), which is the whole posture.
        if (
          dropIntent &&
          frame !== null &&
          stringField(frame, 'kind') === 'Intent'
        ) {
          dropIntent = false;
          return;
        }
        server.send(message);
      });
      server.onMessage((message) => {
        const frame = parseFrame(message);
        if (
          holdingReplayEnd &&
          frame !== null &&
          stringField(frame, 'kind') === 'ReplayEnd'
        ) {
          withheld.push(String(message));
          return;
        }
        const delivered =
          frame === null ? null : numberField(frame, 'deliverySequence');
        if (dropDelivery && delivered !== null) {
          dropDelivery = false;
          return;
        }
        // The real frame, then a duplicate of it at the SAME delivery
        // sequence carrying a different event identity - the one condition
        // admitByDelivery turns into blockedBySequenceCollision (:897).
        if (collide && delivered !== null) {
          collide = false;
          const twin = frame === null ? null : collidingFrame(frame);
          if (twin === null) {
            throw new Error('Delivered frame could not be collided');
          }
          route.send(message);
          route.send(twin);
          return;
        }
        route.send(message);
      });
      release = () => {
        while (withheld.length > 0) {
          const next = withheld.shift();
          if (next !== undefined) route.send(next);
        }
      };
      // Refuse only after both directions are wired, so the close reaches the
      // page as an ordinary socket death.
      if (refuseReopens > 0) {
        refuseReopens -= 1;
        void server.close();
      }
    },
  );

  return {
    get identity() {
      return identity;
    },
    send: (frame) => {
      if (sendToServer === null) throw new Error('No server handle yet');
      sendToServer(JSON.stringify(frame));
    },
    dropNextDelivery: () => {
      dropDelivery = true;
    },
    dropNextIntent: () => {
      dropIntent = true;
    },
    collideNextDelivery: () => {
      collide = true;
    },
    holdReplayEnd: () => {
      holdingReplayEnd = true;
    },
    releaseReplayEnd: () => {
      holdingReplayEnd = false;
      release?.();
    },
    closeAndRefuse: (count) => {
      refuseReopens = count;
      closeServer?.();
    },
  };
}

function parseFrame(message: unknown): WireFrame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(message));
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as WireFrame)
    : null;
}

/** A twin of one delivered frame: same sequence, different event identity. */
function collidingFrame(frame: WireFrame): string | null {
  const event = objectField(frame, 'event');
  const eventId = event === null ? null : stringField(event, 'id');
  return eventId === null
    ? null
    : JSON.stringify({
        ...frame,
        event: { ...event, id: `collision-${eventId}` },
      });
}

function objectField(value: WireFrame, key: string): WireFrame | null {
  const field = value[key];
  return typeof field === 'object' && field !== null && !Array.isArray(field)
    ? (field as WireFrame)
    : null;
}

function stringField(value: WireFrame, key: string): string | null {
  const field = value[key];
  return typeof field === 'string' && field.length > 0 ? field : null;
}

function numberField(value: WireFrame, key: string): number | null {
  const field = value[key];
  return typeof field === 'number' && Number.isFinite(field) ? field : null;
}
