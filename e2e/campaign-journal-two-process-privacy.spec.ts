/**
 * Revocation and redaction across two OS processes under journal
 * authority (R2.authority-live rows R and D; tasks 2.1/4.3 revocation,
 * 3.2/3.4/6.1 redaction).
 *
 * The acceptance line this answers: "Real isolated source and replica
 * processes, append/restart/catch-up/revocation/redaction". CO3
 * (`campaign-journal-two-process-convergence.spec.ts`) closed append and
 * restart on this topology and left two cells open, which its own
 * review recorded as F3: "'scoped' is proven for ONE seat. The
 * seesGmPrivateDetail filtering branch and the 403 stranger path are
 * not driven." These are those rows.
 *
 * THE TOPOLOGY IS CO3'S, UNCHANGED. Playwright's own webServer (3639)
 * creates the campaign and is thereafter the REPLICA READER; a source
 * process (3617) spawned by this spec takes the socket traffic and is
 * the one restarted; both hold ONE database file. The campaign reaches
 * journal authority the same flag-free way - the durable marker written
 * directly, `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED` false throughout and
 * `MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` never set, both asserted
 * out of a real Node process rather than claimed in a comment.
 *
 * WHY THE REMOVAL COMES FROM THE SOCKET AND NOT FROM `/commands`. It is
 * measured here rather than assumed: the HTTP command route refuses
 * `RemoveParticipant` from EVERY caller, the GM included, because
 * `campaignCommandPipeline.ts:503-508` calls `validateCampaignIntent`
 * with four arguments and its fifth - `hostPlayerId` - is what
 * `CampaignMatchHostIntent.ts:222` compares the author against. The
 * shipped removal path is the campaign socket's `CampaignHostIntent`,
 * where `applyHostIntentLocked` (`CampaignMatchHost.doors.ts:151-166`)
 * passes the host id twice. So the drive posts the HTTP form first and
 * asserts the 422, then does the real thing over the socket. Without
 * that control a reader could not tell a deliberate route choice from
 * an arbitrary one.
 *
 * ROW R - REVOCATION ACROSS PROCESSES. Two guests hold real tactical
 * seats, bound by the production room-code join. The GM removes ONE of
 * them. The removed guest's next scoped read THROUGH THE OTHER PROCESS
 * is 403 while the remaining guest's is 200, and an OS-level restart of
 * the source changes none of it: the refusal is durable on both
 * processes, and a rejoin attempt is answered `membership-revoked` by
 * name.
 *
 * ROW R ALSO FOUND A GAP, and states it rather than routing around it.
 * An ALREADY-BOUND live socket is NOT detached by the removal: the
 * revoked guest goes on receiving committed campaign facts for as long
 * as it stays connected. This drive measured it (the row's own comment
 * carries the file:line reasoning) and asserts it in the direction
 * production actually behaves, so the row is a pin on the real boundary
 * rather than a claim that revocation is total. What revocation closes
 * today is every DURABLE door - the scoped read and the rejoin - and
 * what it does not close is the socket already in the room.
 *
 * ROW D - REDACTION ACROSS PROCESSES. The same committed
 * `ParticipantRemoved` fact carries the GM's audited rationale.
 * `campaignActivityProjection.ts:186-193` appends that rationale only
 * when `seesGmPrivateDetail`, which `campaignActivityRead.ts:96,109`
 * sets from the durable seat. So the SAME journal fact, read through
 * the SAME route on the SAME process, must render two different
 * strings: the GM's with the rationale, the remaining guest's without.
 * Both are byte-compared against the literal the projection builds, not
 * merely scanned for absence - a `toContain` check passes for a feed
 * that lost the row entirely.
 *
 * THE STRANGER. A fourth principal holds a valid self-issued token and
 * no seat. `campaignActivityRead.ts:92-94` answers `not-a-participant`
 * and the route turns that into 403 rather than into the campaign-tier
 * feed, which is the fail-open form the tier boundary exists to close.
 *
 * WHAT IS NOT PROVEN HERE is stated at the bottom of the file.
 *
 * @tags @campaign @multiplayer @two-process @authority @privacy
 */

import { expect, test } from '@playwright/test';
import { rm } from 'node:fs/promises';

import {
  postIntentCommand,
  readActivity,
  requestActivity,
  type ActivityEntry,
} from './helpers/campaignJournalDrive';
import {
  bootPrivacyTopology,
  E2E_ARM_KEY,
  type IPrivacyTopology,
} from './helpers/campaignJournalPrivacyFixture';
import {
  openCampaignSyncSocket,
  settle,
  type ICampaignSyncClient,
} from './helpers/campaignJournalSocket';
import {
  readHighestSequence,
  readMarker,
  restartSourceServer,
  runAuthorityCli,
  stopSourceServer,
  type ISourceServer,
} from './helpers/campaignJournalTwoProcess';

/**
 * The GM's audited rationale. Distinctive enough that finding it
 * anywhere in a player's feed is unambiguous, and never a substring of
 * any other string this drive builds.
 */
const GM_PRIVATE_REASON = 'Repeatedly stalled the turn timer';

test.describe('campaign journal authority: revocation and redaction across two processes', () => {
  test.describe.configure({ mode: 'serial' });

  let topology: IPrivacyTopology | null = null;
  /** The source is respawned mid-drive, so teardown reads the latest. */
  let liveSource: ISourceServer | null = null;

  test.afterAll(async () => {
    if (topology) {
      for (const socket of topology.sockets) socket.close();
      await stopSourceServer(liveSource ?? topology.source);
      await rm(topology.multiplayerDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
      }).catch(() => undefined);
    }
  });

  test('a revoked seat is refused by the other process and a GM rationale never reaches a player', async ({
    request,
    baseURL,
  }) => {
    test.setTimeout(420_000);
    const replicaOrigin =
      baseURL ?? `http://localhost:${process.env.MEKSTATION_E2E_PORT ?? 3600}`;
    const campaignId = `live-privacy-${Date.now()}`;

    // Two processes on one file, a campaign on journal authority with no
    // flag touched, three seats bound by the server. Every assertion in
    // there is a PRECONDITION; the rows this spec argues start below.
    topology = await bootPrivacyTopology({
      request,
      replicaOrigin,
      campaignId,
    });
    const {
      databasePath,
      env,
      matchId,
      roomCode,
      seededSequence,
      gm,
      guestA,
      guestB,
      stranger,
      gmSocket,
      guestASocket,
      guestBSocket,
      sockets,
    } = topology;
    let source: ISourceServer = topology.source;

    // The seats the SERVER bound, read back through the OTHER process.
    // Read rather than asserted: a drive that declared the seats would
    // be testing its own bookkeeping.
    const seatOf = async (participantId: string): Promise<string | undefined> =>
      (
        await readActivity(
          request,
          replicaOrigin,
          campaignId,
          matchId,
          participantId,
        )
      ).viewerSeat;
    expect(await seatOf(gm.playerId)).toBe('gm');
    expect(await seatOf(guestA.playerId)).toBe('player');
    expect(await seatOf(guestB.playerId)).toBe('player');

    // --- the 403 stranger path (CO3 review finding F3, second half) ---
    // A valid token and no seat. Refused rather than served the
    // campaign-tier feed, which is what keeps that tier meaning "every
    // participant in this session" instead of "everyone".
    const strangerBefore = await requestActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      stranger.playerId,
    );
    expect(strangerBefore.status).toBe(403);
    expect(strangerBefore.body).toEqual({
      error: 'not a participant in this session',
    });

    // --- CONTROL: the HTTP command route is NOT the removal path ------
    const httpRemoval = await postIntentCommand(
      request,
      source.origin,
      campaignId,
      gm.wireToken,
      `${campaignId}-http-removal`,
      {
        campaignId,
        intentId: `${campaignId}-http-removal-intent`,
        kind: 'RemoveParticipant',
        payload: { participantId: guestA.playerId, reason: GM_PRIVATE_REASON },
      },
    );
    expect(httpRemoval.status).toBe(422);
    expect(httpRemoval.body).toMatchObject({
      kind: 'rejected',
      reason: 'host-only',
    });
    // Nothing was appended by the refusal, so the rows below cannot be
    // reading a removal this control accidentally committed.
    expect(readHighestSequence(databasePath, campaignId)).toBe(seededSequence);

    // --- the removal, through the shipped socket path -----------------
    guestASocket.drain();
    guestBSocket.drain();
    gmSocket.sendHostIntent(
      'RemoveParticipant',
      `${campaignId}-removal-intent`,
      { participantId: guestA.playerId, reason: GM_PRIVATE_REASON },
      campaignId,
    );
    await gmSocket.waitForFrame(
      (frame) => frame.eventType === 'ParticipantRemoved',
      'the committed ParticipantRemoved fact',
    );
    const removalSequence = readHighestSequence(databasePath, campaignId);
    expect(removalSequence).toBe(seededSequence + 1);

    // =================================================================
    // ROW R - revocation, seen by the process that did not commit it
    // =================================================================

    // (R1) The removed guest's next scoped read through the REPLICA is
    // refused. The replica has no live connection to the source's
    // application state; it shares the file, so this is the durable
    // revocation reaching a second OS process.
    const revokedRead = await requestActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      guestA.playerId,
    );
    expect(revokedRead.status).toBe(403);
    expect(revokedRead.body).toEqual({
      error: 'not a participant in this session',
    });

    // (R2) The remaining guest is NOT refused - the revocation is
    // targeted, not a session-wide shutdown.
    const survivorRead = await requestActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      guestB.playerId,
    );
    expect(survivorRead.status).toBe(200);

    // (R3) THE LIVE SOCKET IS NOT DETACHED. Measured, not assumed, and
    // recorded here as the boundary of what seat revocation does.
    //
    // The expectation going in was that an already-bound socket goes
    // quiet, mirroring task 4.3's in-process row. It does not, and the
    // reason is structural: `applyCommittedParticipantRemoval`
    // (`CampaignSyncSession.ts:641-645`) deletes the participant from
    // `this.retained` - the CONVERGENCE set the launch gate reads - and
    // nothing else. The live sink is the unsubscribe returned by
    // `attachLiveParticipant` (`CampaignSyncSession.ts:362-376`), which
    // lives in the socket's own `cleanupFns` and runs on DISCONNECT. No
    // committed removal reaches it, so a removed player who simply does
    // not close their socket keeps receiving campaign-scoped facts.
    //
    // Task 4.3's row is not contradicted: it revokes a GRANT and asserts
    // about the grant delivery channel. This revokes a SEAT, which is
    // what `/activity` and the rejoin gate read. The two revocations are
    // different subsystems, and the seat one has no live-detach half.
    //
    // Asserted in the direction production actually behaves so this is a
    // pin rather than a wish: if the detach is ever implemented, this row
    // goes red and whoever closed the gap updates it deliberately.
    guestASocket.drain();
    guestBSocket.drain();
    gmSocket.sendHostIntent(
      'SpendFunds',
      `${campaignId}-post-revoke-spend`,
      { amount: 2_500, reason: 'post-revocation control' },
      campaignId,
    );
    await guestBSocket.waitForFrame(
      (frame) => frame.eventType === 'FundsChanged',
      'the post-revocation control fact',
    );
    await settle();
    const eventTypes = (client: ICampaignSyncClient): readonly string[] =>
      client
        .drain()
        .filter((frame) => frame.kind === 'CampaignEvent')
        .map((frame) => frame.eventType ?? '');
    // The seated guest receives it - the channel is live, so silence on
    // the other socket would have meant something.
    expect(eventTypes(guestBSocket)).toEqual(['FundsChanged']);
    // ...and so does the REVOKED guest. This is the gap.
    expect(
      eventTypes(guestASocket),
      'seat revocation does not detach an already-bound live socket',
    ).toEqual(['FundsChanged']);

    // (R4) DURABLE: an OS-level restart of the source changes nothing.
    // The seat table is the record, not the process's memory of it.
    for (const socket of sockets) socket.close();
    const priorPid = source.pid;
    source = await restartSourceServer(request, source, env);
    // Handed to teardown as well, so a failure after this point still
    // stops the process this drive actually spawned.
    liveSource = source;
    expect(source.pid).not.toBe(priorPid);

    const revokedAfterRestart = await requestActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      guestA.playerId,
    );
    expect(revokedAfterRestart.status).toBe(403);
    // ...and on the restarted process itself, which rebuilt its
    // registry from the file rather than inheriting it.
    expect(
      (
        await requestActivity(
          request,
          source.origin,
          campaignId,
          matchId,
          guestA.playerId,
        )
      ).status,
    ).toBe(403);

    // (R5) A rejoin attempt is refused BY NAME. `bindCampaignSyncConnection`
    // checks `isRevoked` before the room code is even consulted, so a
    // revoked member holding a live invite is still out.
    const rejoin = await openCampaignSyncSocket({
      origin: source.origin,
      matchId,
      playerId: guestA.playerId,
      wireToken: guestA.wireToken,
      role: 'guest',
      ...(roomCode ? { roomCode } : {}),
    });
    sockets.push(rejoin);
    expect(rejoin.terminal, JSON.stringify(rejoin.frames)).toBe('refusal');
    expect(
      rejoin.frames.some(
        (frame) =>
          frame.kind === 'Error' && frame.reason === 'membership-revoked',
      ),
      JSON.stringify(rejoin.frames),
    ).toBe(true);

    // =================================================================
    // ROW D - redaction, the same fact rendered two ways
    // =================================================================

    // Both reads go through the REPLICA process, which committed none of
    // this and holds no session state - so any difference between them
    // comes from the durable seat and the projection, not from who the
    // reader was talking to.
    const gmFeed = await readActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      gm.playerId,
    );
    const playerFeed = await readActivity(
      request,
      replicaOrigin,
      campaignId,
      matchId,
      guestB.playerId,
    );
    expect(gmFeed.viewerSeat).toBe('gm');
    expect(playerFeed.viewerSeat).toBe('player');

    const removalRow = (feed: { entries?: readonly ActivityEntry[] }) => {
      const found = (feed.entries ?? []).filter((entry) =>
        entry.message.startsWith('Removed participant '),
      );
      expect(found, 'exactly one removal row per feed').toHaveLength(1);
      return found[0];
    };
    const gmRow = removalRow(gmFeed);
    const playerRow = removalRow(playerFeed);

    // (D1) BYTE COMPARISON, both directions. The literals are the two
    // arms `campaignActivityProjection.ts:186-193` builds: the rationale
    // is appended after a space and an em dash when - and only when -
    // the viewer sees GM-private detail. Compared whole rather than
    // scanned, because `not.toContain(reason)` also passes for a feed
    // that dropped the row.
    expect(playerRow.message).toBe(`Removed participant ${guestA.playerId}`);
    expect(gmRow.message).toBe(
      `Removed participant ${guestA.playerId} — ${GM_PRIVATE_REASON}`,
    );

    // (D2) The two renderings differ, and the rationale is nowhere in
    // the player's WHOLE feed - not merely absent from the one row.
    expect(playerRow.message).not.toBe(gmRow.message);
    expect(JSON.stringify(playerFeed)).not.toContain(GM_PRIVATE_REASON);
    expect(JSON.stringify(gmFeed)).toContain(GM_PRIVATE_REASON);

    // (D3) Redaction is not concealment of the FACT. The removal itself
    // is campaign-scoped and both viewers see it at the same ordinal
    // with the same actor and day - so what differs is exactly the
    // GM-private rationale and nothing else.
    expect(playerRow.ordinal).toBe(gmRow.ordinal);
    expect(playerRow.actorPlayerId).toBe(gmRow.actorPlayerId);
    expect(playerRow.campaignDay).toBe(gmRow.campaignDay);
    expect(playerRow.category).toBe(gmRow.category);
    expect(playerRow.occurredAt).toBe(gmRow.occurredAt);

    // (D4) The stranger is still 403 after everything above, so the
    // refusal is a property of having no seat rather than of the moment
    // it was first asked.
    expect(
      (
        await requestActivity(
          request,
          replicaOrigin,
          campaignId,
          matchId,
          stranger.playerId,
        )
      ).status,
    ).toBe(403);

    // --- the gate stayed shut for the whole drive ---------------------
    const flagsAfter = runAuthorityCli('flags');
    expect(flagsAfter.cutoverFlag).toBe(false);
    expect(flagsAfter.effective).toBe(false);
    expect(process.env[E2E_ARM_KEY]).toBeUndefined();
    expect(env[E2E_ARM_KEY]).toBeUndefined();
    expect(readMarker(databasePath, campaignId)?.state).toBe('journal');
  });
});

/*
 * NOT DRIVEN HERE, deliberately:
 *
 * - The production cutover flag. `CAMPAIGN_JOURNAL_AUTHORITY_ENABLED`
 *   stays false; this campaign is cut over per-campaign by its durable
 *   marker, and no shipped path puts a production campaign there.
 * - The single-player path. `/commands` and the seat gate both refuse a
 *   campaign with no co-op session (finding #29); every principal here
 *   holds a real seat bound by a shipped route.
 * - GRANT revocation. `DELETE /api/campaigns/[id]/grants` withdraws a
 *   SHARE grant, which gates the replica-sync dial - a different
 *   subsystem from the `campaign_session_participant` seat the scoped
 *   read resolves. This row revokes the seat, because the seat is what
 *   `/activity` reads.
 * - Redaction of a WITHHELD event. Both viewers here are admitted to the
 *   removal fact and differ only in its GM-private rationale; a fact
 *   concealed from a player entirely (the `admits` half of the same
 *   projection) stays with the in-process scope tests.
 * - CI wiring. No workflow file is touched; this spec carries tags but
 *   no lane selects it, exactly as CO3 and `campaign-two-device-drive`
 *   have none today.
 */
