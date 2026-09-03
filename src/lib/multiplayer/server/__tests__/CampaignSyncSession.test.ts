/**
 * Tests for `CampaignSyncSession` — campaign sync session lifecycle
 * (CO1, task 5.5).
 *
 * Covers: host open issues a room code; join receives a snapshot + the
 * full log; resync streams only the missing tail; large-gap resync
 * receives a fresh snapshot; host disconnect pauses the session.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
} from '@/lib/events/journal/EventHistoryBranchContract';
import type { ICampaignProgressionReaders } from '@/lib/multiplayer/server/CampaignProgressionGate';
import type { ICoordinatedCorrectionSaga } from '@/lib/multiplayer/server/history/CoordinatedOutcomeCorrectionSaga';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  CampaignSyncSession,
  RESYNC_SNAPSHOT_GAP,
} from '@/lib/multiplayer/server/CampaignSyncSession';
import { isValidRoomCode } from '@/lib/p2p/roomCodes';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-session';
const HOST_ID = 'host-player';

function newSession(
  balance = 600_000,
  progressionReaders?: ICampaignProgressionReaders,
): {
  host: CampaignMatchHost;
  session: CampaignSyncSession;
} {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
  });
  return {
    host,
    session: new CampaignSyncSession(
      host,
      progressionReaders === undefined ? {} : { progressionReaders },
    ),
  };
}

describe('CampaignSyncSession — host opens a shared campaign', () => {
  it('opens with the invite already expired without minting a new one', async () => {
    // The state a campaign is in after its match launched: the store
    // cleared the code, so rehydrating must NOT hand out a fresh one.
    const { session } = newSession();
    await session.openWithoutInvite();

    expect(session.getRoomCode()).toBeNull();

    const refused = await session.joinGuest('ABC234', () => {});
    expect(refused.ok).toBe(false);
    expect(refused.delivered).toHaveLength(0);
  });

  it('admits a durable member into a session whose invite expired', async () => {
    // The other half. Expiry exists to stop NEWCOMERS; the people
    // already inside must still be able to come back.
    const { session } = newSession();
    await session.openWithoutInvite();

    const received: ICampaignEvent[] = [];
    const joined = await session.joinMember((e) => received.push(e));

    expect(joined.ok).toBe(true);
    expect(received[0]?.type).toBe('CampaignSnapshotPublished');
    joined.disconnect();
  });

  it('refuses a member on a session paused by the host leaving', async () => {
    // "No live campaign to hydrate from" is a different answer from
    // "you are not a member", and it must not be silently conflated
    // with the expired-invite case above, which stays joinable.
    const { session } = newSession();
    await session.open('ABC234');
    session.hostDisconnected();

    const refused = await session.joinMember(() => {});
    expect(refused.ok).toBe(false);
    expect(refused.delivered).toHaveLength(0);
  });

  it('issues a valid 6-char room code excluding I/O/0/1', async () => {
    const { session } = newSession();
    const code = await session.open();
    expect(isValidRoomCode(code)).toBe(true);
    expect(code).toHaveLength(6);
    expect(code).not.toMatch(/[IO01]/);
  });

  it('adopts a server-issued room code for invite-backed co-op sessions', async () => {
    const { session } = newSession();
    const code = await session.open('abc-234');
    expect(code).toBe('ABC234');
    expect(session.getRoomCode()).toBe('ABC234');
  });

  it('open is idempotent — the same code is returned', async () => {
    const { session } = newSession();
    const first = await session.open();
    const second = await session.open();
    expect(first).toBe(second);
  });
});

describe('CampaignSyncSession — guest join', () => {
  it('delivers a CampaignSnapshotPublished baseline then the log', async () => {
    const { host, session } = newSession();
    const code = await session.open();
    // Commit a couple of log events before the guest joins.
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'i1',
      payload: {},
    });

    const received: ICampaignEvent[] = [];
    const result = await session.joinGuest(code, (e) => received.push(e));

    expect(result.ok).toBe(true);
    // The FIRST delivered event is a baseline snapshot.
    expect(result.delivered[0].type).toBe('CampaignSnapshotPublished');
    const baseline = result.delivered[0];
    if (baseline.type === 'CampaignSnapshotPublished') {
      expect(baseline.payload.matchId).toBe(CAMPAIGN_ID);
      expect(baseline.payload.revision).toBe(1);
      expect(baseline.payload.state.day).toBe(host.getState().day);
    }
    const logTypes = result.delivered.slice(1).map((e) => e.type);
    expect(logTypes).toEqual([]);
    result.disconnect();
  });

  it('delivers live events committed after the join', async () => {
    const { host, session } = newSession();
    const code = await session.open();
    const received: ICampaignEvent[] = [];
    const result = await session.joinGuest(code, (e) => received.push(e));
    received.length = 0;

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'live-1',
      payload: {},
    });
    expect(received.map((e) => e.type)).toEqual(['CampaignDayAdvanced']);
    result.disconnect();
  });

  it('rejects a join with a wrong room code', async () => {
    const { session } = newSession();
    await session.open();
    const received: ICampaignEvent[] = [];
    const result = await session.joinGuest('WRONGX', (e) => received.push(e));
    expect(result.ok).toBe(false);
    expect(received).toHaveLength(0);
  });
});

describe('CampaignSyncSession — guest resync', () => {
  it('streams only the missing tail after a brief disconnect', async () => {
    const { host, session } = newSession();
    await session.open();
    // Commit 4 day-advance events (sequences 1..4, snapshot is 0).
    for (let i = 0; i < 4; i++) {
      await host.handleIntent({
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: `seq-${i}`,
        payload: {},
      });
    }
    // The guest disconnected after sequence 2; reconnect from 2.
    const received: ICampaignEvent[] = [];
    const result = await session.resyncGuest(2, (e) => received.push(e));

    expect(result.ok).toBe(true);
    expect(result.snapshotted).toBe(false);
    // Only sequences 3 and 4 stream.
    expect(result.delivered.map((e) => e.sequence)).toEqual([3, 4]);
    result.disconnect();
  });

  it('a large-gap resync receives a fresh snapshot', async () => {
    const { host, session } = newSession();
    await session.open();
    // Commit enough events that a guest stuck at sequence 0 is past
    // the snapshot gap threshold.
    for (let i = 0; i < RESYNC_SNAPSHOT_GAP + 5; i++) {
      await host.handleIntent({
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: `big-${i}`,
        payload: {},
      });
    }
    const received: ICampaignEvent[] = [];
    const result = await session.resyncGuest(0, (e) => received.push(e));

    expect(result.ok).toBe(true);
    expect(result.snapshotted).toBe(true);
    expect(result.delivered[0].type).toBe('CampaignSnapshotPublished');
    result.disconnect();
  });
});

describe('CampaignSyncSession — host disconnect', () => {
  it('pauses the session and closes the host', async () => {
    const { host, session } = newSession();
    await session.open();
    expect(session.isPaused()).toBe(false);

    session.hostDisconnected();

    expect(session.isPaused()).toBe(true);
    expect(host.isClosed()).toBe(true);
    expect(session.getRoomCode()).toBeNull();

    // An intent after disconnect is rejected — the session is frozen.
    const result = await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'after-disconnect',
      payload: {},
    });
    expect(result.ok).toBe(false);
  });
});

describe('CampaignSyncSession — scenario progression requires convergence', () => {
  /**
   * Two retained members hydrated at the same revision, then one campaign
   * event committed on top so both are one revision behind. That is the
   * shape the spec scenario describes: a campaign that moved on while a
   * participant has not said they applied the move.
   */
  async function twoMembersOneEventBehind(
    progressionReaders?: ICampaignProgressionReaders,
  ): Promise<{
    host: CampaignMatchHost;
    session: CampaignSyncSession;
    playerOneSaw: ICampaignEvent[];
    playerTwoSaw: ICampaignEvent[];
    stop: () => void;
  }> {
    const { host, session } = newSession(600_000, progressionReaders);
    await session.open();
    const playerOneSaw: ICampaignEvent[] = [];
    const playerTwoSaw: ICampaignEvent[] = [];
    const one = await session.joinMember(
      (e) => playerOneSaw.push(e),
      'player-1',
    );
    const two = await session.joinMember(
      (e) => playerTwoSaw.push(e),
      'player-2',
    );
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'advance-1',
      payload: {},
    });
    return {
      host,
      session,
      playerOneSaw,
      playerTwoSaw,
      stop: () => {
        one.disconnect();
        two.disconnect();
      },
    };
  }

  it('blocks the next scenario while a retained participant is behind', async () => {
    const { session, stop } = await twoMembersOneEventBehind();
    session.noteParticipantAcknowledged('player-1', 1);

    const gate = await session.evaluateScenarioLaunch();

    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      // The refusal has to be SHOWABLE — a bare false tells the GM
      // nothing about who they are waiting for.
      expect(gate.reason).toBe('participants-behind');
      expect(gate.requiredRevision).toBe(1);
      expect(gate.behind).toEqual([
        { participantId: 'player-2', acknowledgedRevision: 0 },
      ]);
    }
    stop();
  });

  it('allows the launch once every retained participant has converged', async () => {
    // CONTROL: a gate that refused everything would fail here.
    const { session, stop } = await twoMembersOneEventBehind();
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 1,
    });
    stop();
  });

  it('keeps delivering committed events to healthy clients while blocked', async () => {
    // The other half of the requirement: being behind blocks PROGRESSION,
    // never DELIVERY. A gate that froze the stream would fail here.
    const { host, session, playerOneSaw, playerTwoSaw, stop } =
      await twoMembersOneEventBehind();
    session.noteParticipantAcknowledged('player-1', 1);
    playerOneSaw.length = 0;
    playerTwoSaw.length = 0;

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'advance-2',
      payload: {},
    });

    expect(playerOneSaw.map((e) => e.type)).toEqual(['CampaignDayAdvanced']);
    expect(playerTwoSaw.map((e) => e.type)).toEqual(['CampaignDayAdvanced']);
    // Joining is delivery too — a blocked launch must not lock people out.
    const late = await session.joinMember(() => {}, 'player-3');
    expect(late.ok).toBe(true);
    expect((await session.evaluateScenarioLaunch()).ok).toBe(false);
    late.disconnect();
    stop();
  });

  it('refuses an acknowledgement past the highest delivered revision', async () => {
    // Otherwise the slowest client converges itself by claiming a number
    // and the gate becomes advisory.
    const { session, stop } = await twoMembersOneEventBehind();

    expect(session.noteParticipantAcknowledged('player-2', 99)).toBe(
      'ahead-of-delivery',
    );

    const gate = await session.evaluateScenarioLaunch();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.behind.map((entry) => entry.participantId)).toEqual([
        'player-1',
        'player-2',
      ]);
    }
    stop();
  });

  it('refuses an acknowledgement of a revision the participant was never sent', async () => {
    // The whole point of the watermark. Against the commit head, a
    // participant who received literally nothing converged by naming the
    // head — a number every client knows.
    const { host, session } = newSession();
    await session.open();
    const playerTwoSaw: ICampaignEvent[] = [];
    const one = await session.joinMember(() => {}, 'player-1');
    const two = await session.joinMember(
      (e) => playerTwoSaw.push(e),
      'player-2',
    );
    two.disconnect();
    playerTwoSaw.length = 0;

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'unseen-1',
      payload: {},
    });
    expect(playerTwoSaw).toHaveLength(0);

    expect(session.noteParticipantAcknowledged('player-2', 1)).toBe(
      'ahead-of-delivery',
    );

    session.noteParticipantAcknowledged('player-1', 1);
    const gate = await session.evaluateScenarioLaunch();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.behind).toEqual([
        { participantId: 'player-2', acknowledgedRevision: 0 },
      ]);
    }
    one.disconnect();
  });

  it('accepts an acknowledgement of a revision that was actually streamed', async () => {
    // CONTROL for the row above: the watermark must RISE as the session
    // pushes frames, or the guard is a refuse-everything that would block
    // every launch forever.
    const { host, session } = newSession();
    await session.open();
    const playerTwoSaw: ICampaignEvent[] = [];
    const one = await session.joinMember(() => {}, 'player-1');
    const two = await session.joinMember(
      (e) => playerTwoSaw.push(e),
      'player-2',
    );
    // Drop the hydration frames; only what arrives LIVE is under test.
    playerTwoSaw.length = 0;

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'seen-1',
      payload: {},
    });
    expect(playerTwoSaw.map((e) => e.sequence)).toEqual([1]);

    expect(session.noteParticipantAcknowledged('player-2', 1)).toBe('applied');
    session.noteParticipantAcknowledged('player-1', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 1,
    });
    one.disconnect();
    two.disconnect();
  });

  it('counts a frame committed DURING hydration as delivered', async () => {
    // The join reads the head, then reads the tail. A commit landing
    // between the two is buffered and streamed to this participant, so it
    // was delivered — and if the watermark stopped at the head instead,
    // acknowledging that frame would be refused 'ahead-of-delivery' and
    // the launch would be blocked by a player who is not behind at all.
    const { host, session } = newSession();
    await session.open();

    const log = host.getEventLog();
    const realRead = log.getCampaignEvents.bind(log);
    let raced = false;
    const spy = jest
      .spyOn(log, 'getCampaignEvents')
      .mockImplementation(async (from?: number) => {
        if (!raced) {
          raced = true;
          // Commits while the join is mid-hydration: the live
          // subscription is already attached, so this is buffered.
          await host.handleIntent({
            kind: 'AdvanceDay',
            campaignId: CAMPAIGN_ID,
            intentId: 'raced-in',
            payload: {},
          });
        }
        return realRead(from);
      });

    const saw: ICampaignEvent[] = [];
    const joined = await session.joinMember((e) => saw.push(e), 'racer');
    spy.mockRestore();

    expect(joined.ok).toBe(true);
    expect(saw.map((e) => e.sequence)).toEqual([-1, 1]);

    expect(session.noteParticipantAcknowledged('racer', 1)).toBe('applied');
    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 1,
    });
    joined.disconnect();
  });

  it('ignores an acknowledgement from a participant who is not retained', async () => {
    // A stranger must not be able to add themselves to the set the launch
    // is waiting on. The stranger names a BEHIND revision on purpose: an
    // ack at the head would leave the gate open even if the stranger WERE
    // admitted, so it would prove nothing about the guard.
    const { session, stop } = await twoMembersOneEventBehind();
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(session.noteParticipantAcknowledged('stranger', 0)).toBe(
      'unknown-participant',
    );

    // Admitting the stranger at revision 0 would have made them the
    // thing this launch waits on, so the gate answer is the assertion.
    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 1,
    });
    stop();
  });

  it('never moves an acknowledgement backwards', async () => {
    // A late frame from a superseded connection must not un-converge a
    // participant who has already caught up.
    const { session, stop } = await twoMembersOneEventBehind();
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(session.noteParticipantAcknowledged('player-1', 0)).toBe('stale');

    expect((await session.evaluateScenarioLaunch()).ok).toBe(true);
    stop();
  });

  it('refuses a revision that is not a revision number at all', async () => {
    // NaN is strictly worse than the big number the guards were built
    // for: every comparison against it is false, so it slipped the
    // ceiling AND the staleness guard, was stored, and then compared
    // false against the required revision for the life of the session.
    const { session, stop } = await twoMembersOneEventBehind();

    expect(session.noteParticipantAcknowledged('player-2', Number.NaN)).toBe(
      'invalid-revision',
    );
    expect(session.noteParticipantAcknowledged('player-2', 1.5)).toBe(
      'invalid-revision',
    );
    expect(session.noteParticipantAcknowledged('player-2', -1)).toBe(
      'invalid-revision',
    );

    // The gate is the real assertion — a refused outcome string that
    // still poisoned the ledger would be no better than accepting it.
    session.noteParticipantAcknowledged('player-1', 1);
    const gate = await session.evaluateScenarioLaunch();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.behind).toEqual([
        { participantId: 'player-2', acknowledgedRevision: 0 },
      ]);
    }
    stop();
  });

  it('retains a newcomer who joined by room code, not only a durable member', async () => {
    // joinGuest forwards the id to joinMember. Without a row passing
    // one, dropping the forward is invisible — and joinGuest is the
    // path a first-time tactical player arrives on.
    const { host, session } = newSession();
    const code = await session.open();
    const joined = await session.joinGuest(code, () => {}, 'newcomer');
    expect(joined.ok).toBe(true);
    joined.disconnect();

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'after-newcomer',
      payload: {},
    });

    const gate = await session.evaluateScenarioLaunch();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.behind).toEqual([
        { participantId: 'newcomer', acknowledgedRevision: 0 },
      ]);
    }
  });

  it('leaves nobody retained when a hydration never finishes', async () => {
    // The seed runs AFTER the frames: a sink that throws part-way leaves
    // a join that did not complete, and a participant recorded converged
    // for it would be a launch permission nobody earned.
    const { host, session } = newSession();
    await session.open();
    await expect(
      session.joinMember(() => {
        throw new Error('socket died mid-baseline');
      }, 'half-joined'),
    ).rejects.toThrow('socket died mid-baseline');

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'after-failed-join',
      payload: {},
    });

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 1,
    });
    expect(session.noteParticipantAcknowledged('half-joined', 1)).toBe(
      'unknown-participant',
    );
  });

  it('converges a member at the revision they were hydrated at, not at zero', async () => {
    // "Hydration is convergence" is why the seed exists. Seeded below
    // the head, a player who walked in AFTER the campaign moved on would
    // block the launch they just arrived for — behind on frames that
    // predate them and that they will never be sent.
    const { host, session } = newSession();
    await session.open();
    for (const id of ['pre-1', 'pre-2', 'pre-3']) {
      await host.handleIntent({
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: id,
        payload: {},
      });
    }

    const latecomer = await session.joinMember(() => {}, 'latecomer');
    expect(latecomer.ok).toBe(true);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 3,
    });
    // And they are genuinely at 3, not merely absent from the ledger.
    expect(session.noteParticipantAcknowledged('latecomer', 3)).toBe('stale');
    latecomer.disconnect();
  });

  function branchRecord(
    branchId: string,
    status: EventHistoryBranchStatus,
  ): IEventHistoryBranch {
    const isRoot = branchId === 'root';
    return {
      streamType: 'campaign',
      streamId: CAMPAIGN_ID,
      branchId,
      parentBranchId: isRoot ? null : 'root',
      ancestorDepth: isRoot ? 0 : 1,
      baseRevision: isRoot ? 0 : 1,
      baseEventId: isRoot ? null : 'evt-1',
      baseDigest: 'digest',
      status,
      createdBy: 'gm',
      reason: 'test',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
  }

  function sagaRecord(
    state: ICoordinatedCorrectionSaga['state'],
  ): ICoordinatedCorrectionSaga {
    return {
      matchId: 'match-1',
      outcomeId: 'outcome-1',
      outcomeVersion: 2,
      targetRevision: 4,
      state,
      blockedReason: null,
      sourceRecordedAt: '2026-01-01T00:00:00.000Z',
      manifestSealedAt: '2026-01-01T00:00:01.000Z',
      targetRecordedAt:
        state === 'target-pending' || state === 'completed'
          ? '2026-01-01T00:00:02.000Z'
          : null,
      updatedAt: '2026-01-01T00:00:03.000Z',
      candidateBranchId: 'candidate-1',
    };
  }

  function readers(
    overrides: Partial<ICampaignProgressionReaders>,
  ): ICampaignProgressionReaders {
    return {
      readEffectiveHead: () => null,
      readBranch: () => null,
      readSagaForCampaign: () => null,
      readManifestVerdict: () => null,
      ...overrides,
    };
  }

  it('refuses branch-not-active when the effective head is still a candidate', async () => {
    const { session, stop } = await twoMembersOneEventBehind(
      readers({
        readEffectiveHead: () => ({
          streamType: 'campaign',
          streamId: CAMPAIGN_ID,
          branchId: 'candidate-1',
          effectiveGeneration: 1,
          installedAt: '2026-01-01T00:00:00.000Z',
        }),
        readBranch: () => branchRecord('candidate-1', 'building'),
      }),
    );
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: false,
      reason: 'branch-not-active',
      requiredRevision: 1,
      branchId: 'candidate-1',
      status: 'building',
      behind: [],
    });
    stop();
  });

  it('refuses correction-pending when the saga is still at target-pending', async () => {
    const pending = sagaRecord('target-pending');
    const { session, stop } = await twoMembersOneEventBehind(
      readers({ readSagaForCampaign: () => pending }),
    );
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: false,
      reason: 'correction-pending',
      requiredRevision: 1,
      sagaKey: {
        matchId: pending.matchId,
        outcomeId: pending.outcomeId,
        outcomeVersion: pending.outcomeVersion,
      },
      state: 'target-pending',
      behind: [],
    });
    stop();
  });

  it('does not refuse correction-pending when the saga is completed', async () => {
    const { session, stop } = await twoMembersOneEventBehind(
      readers({
        readSagaForCampaign: () => sagaRecord('completed'),
        readManifestVerdict: () => ({ kind: 'verified' }),
      }),
    );
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: true,
      requiredRevision: 1,
    });
    stop();
  });

  it('refuses replacement-artifacts-unverified when the sealed manifest fails verify', async () => {
    const { session, stop } = await twoMembersOneEventBehind(
      readers({
        readSagaForCampaign: () => sagaRecord('completed'),
        readManifestVerdict: () => ({ kind: 'unverified' }),
      }),
    );
    session.noteParticipantAcknowledged('player-1', 1);
    session.noteParticipantAcknowledged('player-2', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: false,
      reason: 'replacement-artifacts-unverified',
      requiredRevision: 1,
      branchId: 'candidate-1',
      behind: [],
    });
    stop();
  });

  it('with every extra clause satisfied still refuses participants who are behind', async () => {
    const { session, stop } = await twoMembersOneEventBehind(
      readers({
        readEffectiveHead: () => ({
          streamType: 'campaign',
          streamId: CAMPAIGN_ID,
          branchId: 'root',
          effectiveGeneration: 1,
          installedAt: '2026-01-01T00:00:00.000Z',
        }),
        readBranch: () => branchRecord('root', 'effective'),
        readSagaForCampaign: () => sagaRecord('completed'),
        readManifestVerdict: () => ({ kind: 'verified' }),
      }),
    );
    session.noteParticipantAcknowledged('player-1', 1);

    const gate = await session.evaluateScenarioLaunch();
    expect(gate.ok).toBe(false);
    if (!gate.ok) {
      expect(gate.reason).toBe('participants-behind');
      expect(gate.requiredRevision).toBe(1);
      expect(gate.behind).toEqual([
        { participantId: 'player-2', acknowledgedRevision: 0 },
      ]);
    }
    stop();
  });

  it('with no readers injected and SQLite uninitialized answers exactly the convergence-only gate', async () => {
    expect(getSQLiteService().isInitialized()).toBe(false);
    const { session, stop } = await twoMembersOneEventBehind();
    session.noteParticipantAcknowledged('player-1', 1);

    expect(await session.evaluateScenarioLaunch()).toEqual({
      ok: false,
      reason: 'participants-behind',
      requiredRevision: 1,
      behind: [{ participantId: 'player-2', acknowledgedRevision: 0 }],
    });
    stop();
  });
});
