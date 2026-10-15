import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { ICampaignApplicationOffer } from '@/types/multiplayer/Protocol';
import type { IVaultIdentity } from '@/types/vault';

import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import {
  credentialProtocols,
  fromBase64Url,
  WS_CREDENTIAL_PREFIX,
} from '@/lib/multiplayer/socketCredentialProtocol';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { decodeTokenFromWire } from '@/types/multiplayer/Player';
import { HEARTBEAT_INTERVAL_MS } from '@/types/multiplayer/Protocol';

import type { ICampaignSyncWebSocket } from '../campaignSyncTransport';

import {
  campaignSnapshotFromMessage,
  connectCampaignSyncTransport,
  _resetCampaignSyncTransportsForTest,
  connectStoredCampaignSyncTransport,
} from '../campaignSyncTransport';

interface IMockSocket extends ICampaignSyncWebSocket {
  readonly sentRaw: string[];
  fireOpen(): void;
  inject(message: unknown): void;
}

function makeSocketFactory(): {
  readonly urls: string[];
  readonly offered: (string[] | undefined)[];
  factory: (url: string, protocols?: string[]) => ICampaignSyncWebSocket;
  lastSocket: () => IMockSocket;
} {
  const sockets: IMockSocket[] = [];
  const urls: string[] = [];
  const offered: (string[] | undefined)[] = [];
  return {
    urls,
    offered,
    factory: (url: string, protocols?: string[]) => {
      urls.push(url);
      offered.push(protocols);
      const socket: IMockSocket = {
        readyState: 1,
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        sentRaw: [],
        send(data: string) {
          socket.sentRaw.push(data);
        },
        close() {
          socket.readyState = 3;
          socket.onclose?.({});
        },
        fireOpen() {
          socket.onopen?.({});
        },
        inject(message: unknown) {
          socket.onmessage?.({ data: JSON.stringify(message) });
        },
      };
      sockets.push(socket);
      return socket;
    },
    lastSocket: () => sockets[sockets.length - 1],
  };
}

describe('P2CD explicit consumer completion', () => {
  const ts = '2026-10-16T00:00:00.000Z';
  const baseline = (): Extract<
    ICampaignApplicationOffer,
    { kind: 'CampaignSnapshot' }
  > => ({
    kind: 'CampaignSnapshot',
    matchId: 'm1',
    ts,
    event: {
      type: 'CampaignSnapshotPublished',
      campaignId: 'c1',
      sequence: -1,
      ts,
      authorPlayerId: 'host',
      scope: 'campaign',
      payload: {
        matchId: 'm1',
        revision: 0,
        state: createEmptyCampaignState('c1'),
      },
    },
    appliedView: { viewId: 'view', receiptId: 'r0', previousReceiptId: null },
    hydrationFacts: [],
  });
  const event = (
    n: number,
    previous = `r${n - 1}`,
  ): ICampaignApplicationOffer => ({
    kind: 'CampaignEvent',
    matchId: 'm1',
    ts,
    event: {
      type: 'CampaignDayAdvanced',
      campaignId: 'c1',
      sequence: n * 3,
      ts,
      authorPlayerId: 'host',
      scope: 'campaign',
      payload: { newDay: n },
    },
    appliedView: {
      viewId: 'view',
      receiptId: `r${n}`,
      previousReceiptId: previous,
    },
  });
  function setup(expectedCampaignId: string | undefined = 'c1', open = true) {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'm1',
      playerId: 'guest',
      role: 'guest',
      wireToken: 'token',
      expectedCampaignId,
      lastSeq: 99,
      socketFactory: sockets.factory,
    });
    const socket = sockets.lastSocket();
    const offers: ICampaignApplicationOffer[] = [];
    const errors: unknown[] = [];
    transport.onError((error) => errors.push(error));
    transport.onFrame((frame) => {
      if (
        (frame.kind === 'CampaignSnapshot' || frame.kind === 'CampaignEvent') &&
        frame.appliedView
      )
        offers.push(frame as ICampaignApplicationOffer);
    });
    if (open) socket.fireOpen();
    const acks = () =>
      socket.sentRaw
        .map((raw) => JSON.parse(raw))
        .filter((frame) => frame.kind === 'CampaignAck');
    const complete = (offer: ICampaignApplicationOffer) =>
      transport.confirmApplied!(offer, { status: 'applied' });
    return { transport, socket, offers, errors, acks, complete };
  }
  function apply(offer: ICampaignApplicationOffer) {
    const frame = offer.event as ICampaignEvent;
    return offer.kind === 'CampaignSnapshot'
      ? useCampaignMirrorStore
          .getState()
          .applySnapshot(
            frame,
            undefined,
            offer.appliedView.previousReceiptId === null,
          )
      : useCampaignMirrorStore.getState().applyEvent(frame);
  }
  beforeEach(() => {
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
  });
  afterEach(() => _resetCampaignSyncTransportsForTest());

  it.each([false, true])(
    'waits for actual baseline, projection and adjunct completion (bundle=%s)',
    async (withFacts) => {
      const s = setup();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const projected: unknown[] = [];
      const retained: unknown[] = [];
      const work: Promise<void>[] = [];
      s.transport.onFrame((frame) => {
        if (frame.kind !== 'CampaignSnapshot' || !frame.appliedView) return;
        work.push(
          (async () => {
            const offer = frame as ICampaignApplicationOffer;
            const accepted = apply(offer);
            expect(accepted).not.toBeNull();
            await gate;
            projected.push(accepted!.state);
            retained.push(...(frame.hydrationFacts ?? []));
            expect(s.complete(offer).status).toBe('ack-sent');
          })(),
        );
      });
      const offered = baseline();
      if (withFacts && offered.kind === 'CampaignSnapshot')
        offered.hydrationFacts = [
          {
            ...event(1).event,
            type: 'CampaignMissionLaunched',
            payload: {
              missionId: 'mission',
              missionMatchId: 'tactical-match',
              acceptedHead: {
                branchId: 'branch',
                revision: 1,
                effectiveGeneration: 1,
              },
              deployingPlayerIds: ['guest'],
            },
          },
        ];
      s.socket.inject(offered);
      expect(s.acks()).toEqual([]);
      expect(projected).toEqual([]);
      release();
      await Promise.all(work);
      expect(projected).toHaveLength(1);
      expect(retained).toHaveLength(withFacts ? 1 : 0);
      expect(s.acks()).toEqual([
        {
          kind: 'CampaignAck',
          matchId: 'm1',
          ts: expect.any(String),
          playerId: 'guest',
          campaignId: 'c1',
          appliedView: offered.appliedView,
        },
      ]);
      expect(s.socket.sentRaw[0]).not.toContain('lastSeq');
    },
  );

  it('requires every delivered predecessor, tolerates hidden sequence gaps and visible no-ops', () => {
    const s = setup();
    s.socket.inject(baseline());
    s.socket.inject(event(1));
    s.socket.inject(event(2));
    expect(apply(s.offers[0])).not.toBeNull();
    expect(apply(s.offers[1])).not.toBeNull();
    expect(apply(s.offers[2])).not.toBeNull();
    expect(s.complete(s.offers[2]).status).toBe('prefix-pending');
    expect(s.complete(s.offers[0]).status).toBe('prefix-pending');
    expect(s.acks()).toEqual([]);
    expect(s.complete(s.offers[1]).status).toBe('ack-sent');
    expect(s.acks()).toHaveLength(1);
    expect(s.acks()[0].appliedView.receiptId).toBe('r2');
    const noop = event(3);
    noop.event.payload = { newDay: 2 };
    s.socket.inject(noop);
    expect(apply(s.offers[3])).not.toBeNull();
    s.complete(s.offers[3]);
    expect(s.acks()[1].appliedView.receiptId).toBe('r3');
  });

  it('defers synchronous success until all observers return and cancels on a later throw', () => {
    const s = setup();
    s.transport.onFrame(() => {
      expect(apply(s.offers[0])).not.toBeNull();
      expect(s.complete(s.offers[0]).status).toBe('prefix-pending');
    });
    s.transport.onFrame(() => {
      throw new Error('projection failed');
    });
    expect(() => s.socket.inject(baseline())).not.toThrow();
    expect(s.acks()).toEqual([]);
    expect(s.errors.length).toBeGreaterThan(0);
    expect(s.complete(s.offers[0]).status).toBe('refused');
  });

  it.each(['fold-rejected', 'projection-failed', 'adjunct-failed'] as const)(
    'invalidates a rejected async consumer: %s',
    async (reason) => {
      const s = setup();
      s.socket.inject(baseline());
      await Promise.reject(new Error(reason)).catch(() => {
        expect(
          s.transport.confirmApplied!(s.offers[0], { status: 'failed', reason })
            .status,
        ).toBe('recovery-required');
      });
      expect(s.complete(s.offers[0]).status).toBe('refused');
      expect(s.acks()).toEqual([]);
    },
  );

  it('observer-only and delayed consumers provide no proof', () => {
    const s = setup();
    s.socket.inject(baseline());
    s.socket.inject(event(1));
    expect(s.acks()).toEqual([]);
    expect(useCampaignMirrorStore.getState().campaign).toBeNull();
  });

  it.each([
    'wrong-match',
    'wrong-campaign',
    'wrong-kind',
    'missing-bundle',
    'malformed',
    'no-join',
    'unbound',
  ] as const)('rejects invalid offers: %s', (mode) => {
    const s = setup(mode === 'unbound' ? '' : 'c1', mode !== 'no-join');
    const frame = baseline();
    if (mode === 'wrong-match') frame.matchId = 'other';
    if (mode === 'wrong-campaign') frame.event.campaignId = 'other';
    if (mode === 'missing-bundle') delete frame.hydrationFacts;
    s.socket.inject(
      mode === 'malformed'
        ? { ...frame, appliedView: null }
        : mode === 'wrong-kind'
          ? { ...frame, kind: 'CampaignEvent' }
          : frame,
    );
    expect(s.offers).toEqual([]);
    expect(s.acks()).toEqual([]);
  });

  it.each([
    'broken-link',
    'reused-receipt',
    'new-view',
    'spontaneous-replacement',
  ] as const)('refuses a bad visible prefix: %s', (mode) => {
    const s = setup();
    s.socket.inject(baseline());
    const next = mode === 'spontaneous-replacement' ? baseline() : event(1);
    if (mode === 'broken-link') next.appliedView.previousReceiptId = 'missing';
    if (mode === 'reused-receipt') next.appliedView.receiptId = 'r0';
    if (mode === 'new-view' || mode === 'spontaneous-replacement')
      next.appliedView.viewId = 'other';
    s.socket.inject(next);
    expect(s.offers).toHaveLength(1);
    expect(s.complete(s.offers[0]).status).toBe('refused');
    expect(s.acks()).toEqual([]);
  });

  it('accepts linked committed snapshots without granting another replacement', () => {
    const s = setup();
    s.socket.inject(baseline());
    apply(s.offers[0]);
    s.complete(s.offers[0]);
    const committed = { ...baseline(), appliedView: event(1).appliedView };
    committed.event.sequence = 3;
    committed.event.payload = {
      matchId: 'm1',
      revision: 3,
      state: { ...createEmptyCampaignState('c1'), balance: 20 },
    };
    s.socket.inject(committed);
    expect(apply(s.offers[1])).not.toBeNull();
    s.complete(s.offers[1]);
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(20);
    expect(s.acks()[1].appliedView.receiptId).toBe('r1');
  });

  it('freezes the whole offer, deduplicates exact delivery, and refuses copied or foreign completion', () => {
    const s = setup();
    const other = setup();
    s.socket.inject(baseline());
    other.socket.inject(baseline());
    const issued = s.offers[0];
    expect(Object.isFrozen(issued)).toBe(true);
    expect(Object.isFrozen(issued.event.payload)).toBe(true);
    expect(Object.isFrozen(issued.appliedView)).toBe(true);
    expect(Reflect.set(issued.appliedView, 'receiptId', 'forged')).toBe(false);
    expect(s.complete({ ...issued }).status).toBe('refused');
    expect(s.complete(other.offers[0]).status).toBe('refused');
    s.socket.inject(baseline());
    expect(s.offers).toHaveLength(1);
    apply(issued);
    s.complete(issued);
    expect(s.complete(issued).status).toBe('already-completed');
    s.socket.inject(baseline());
    expect(s.offers).toHaveLength(1);
    expect(s.acks()).toHaveLength(1);
  });

  it('invalidates a conflicting duplicate body', () => {
    const s = setup();
    s.socket.inject(baseline());
    const conflict = baseline();
    conflict.event.payload = {
      state: createEmptyCampaignState('c1'),
      revision: 10,
    };
    s.socket.inject(conflict);
    expect(s.complete(s.offers[0]).status).toBe('refused');
    expect(s.acks()).toEqual([]);
  });

  it('bounds pending work at 64 without evicting an unapplied predecessor', () => {
    const s = setup();
    s.socket.inject(baseline());
    for (let i = 1; i < 64; i++) s.socket.inject(event(i));
    expect(s.offers).toHaveLength(64);
    expect(s.errors).toEqual([]);
    s.socket.inject(event(64));
    expect(s.offers).toHaveLength(64);
    expect(s.errors).toHaveLength(1);
    expect(s.complete(s.offers[0]).status).toBe('refused');
    expect(s.acks()).toEqual([]);
  });

  it('completes all 64 offers and emits only the latest cumulative receipt', () => {
    const s = setup();
    s.socket.inject(baseline());
    for (let i = 1; i < 64; i++) s.socket.inject(event(i));
    s.offers.forEach((offer) => {
      expect(apply(offer)).not.toBeNull();
    });
    for (let i = 63; i > 0; i--)
      expect(s.complete(s.offers[i]).status).toBe('prefix-pending');
    expect(s.complete(s.offers[0]).status).toBe('ack-sent');
    expect(s.acks()).toHaveLength(1);
    expect(s.acks()[0].appliedView.receiptId).toBe('r63');
  });

  it('does not acknowledge an actual rejected snapshot adoption', () => {
    const s = setup();
    const invalid = baseline();
    invalid.event.payload = { state: null };
    s.socket.inject(invalid);
    expect(apply(s.offers[0])).toBeNull();
    s.transport.confirmApplied!(s.offers[0], {
      status: 'failed',
      reason: 'fold-rejected',
    });
    expect(s.acks()).toEqual([]);
    expect(useCampaignMirrorStore.getState().campaign).toBeNull();
  });

  it('does not authorize replacement when the join was not sent', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'm1',
      playerId: '',
      role: 'guest',
      wireToken: 'token',
      expectedCampaignId: 'c1',
      socketFactory: sockets.factory,
    });
    const frames = jest.fn();
    transport.onFrame(frames);
    sockets.lastSocket().fireOpen();
    sockets.lastSocket().inject(baseline());
    expect(sockets.lastSocket().sentRaw).toEqual([]);
    expect(frames).not.toHaveBeenCalled();
  });

  it('replaces a stale held mirror only on a fresh joined connection', () => {
    const old = setup();
    old.socket.inject(baseline());
    apply(old.offers[0]);
    old.complete(old.offers[0]);
    old.socket.inject(event(2, 'r0'));
    apply(old.offers[1]);
    old.complete(old.offers[1]);
    old.transport.close();
    const fresh = setup();
    fresh.socket.inject(baseline());
    expect(apply(fresh.offers[0])?.lastSequence).toBe(0);
    fresh.complete(fresh.offers[0]);
    expect(fresh.acks()).toHaveLength(1);
    expect(old.complete(old.offers[0]).status).toBe('refused');
  });

  it.each(['explicit', 'remote', 'not-open', 'send-throws'] as const)(
    'cannot send or queue a receipt after %s',
    (mode) => {
      const s = setup();
      s.socket.inject(baseline());
      apply(s.offers[0]);
      if (mode === 'explicit') s.transport.close();
      if (mode === 'remote') s.socket.onclose?.({});
      if (mode === 'not-open') s.socket.readyState = 0;
      if (mode === 'send-throws')
        s.socket.send = () => {
          throw new Error('failed send');
        };
      expect(['refused', 'recovery-required']).toContain(
        s.complete(s.offers[0]).status,
      );
      expect(s.acks()).toEqual([]);
      s.socket.readyState = 1;
      if (mode !== 'send-throws') s.socket.fireOpen();
      expect(s.acks()).toEqual([]);
    },
  );

  it('notifies only an exact current sent confirmation without acknowledging it', () => {
    const s = setup();
    const confirmed = jest.fn();
    s.transport.onAppliedViewConfirmed!(confirmed);
    s.socket.inject(baseline());
    const ack = {
      kind: 'CampaignAck',
      matchId: 'm1',
      ts,
      playerId: 'guest',
      campaignId: 'c1',
      appliedView: baseline().appliedView,
    };
    s.socket.inject(ack);
    expect(confirmed).not.toHaveBeenCalled();
    apply(s.offers[0]);
    s.complete(s.offers[0]);
    for (const bad of [
      { ...ack, playerId: 'other' },
      { ...ack, campaignId: 'other' },
      { ...ack, matchId: 'other' },
      { ...ack, revision: 1 },
    ])
      s.socket.inject(bad);
    expect(confirmed).not.toHaveBeenCalled();
    s.socket.inject(ack);
    expect(confirmed).toHaveBeenCalledWith(ack);
    expect(s.acks()).toHaveLength(1);
    s.socket.inject(event(1));
    s.socket.inject(ack);
    expect(confirmed).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    'latches out numeric fallback on any metadata presence (malformed=%s)',
    (malformed) => {
      const s = setup();
      s.socket.inject(
        malformed ? { ...baseline(), appliedView: {} } : baseline(),
      );
      const legacy = event(1);
      const { appliedView: _view, ...frame } = legacy;
      s.socket.inject(frame);
      expect(s.acks()).toEqual([]);
    },
  );

  it('acknowledges a completion confirmed while a non-offer frame is being dispatched', () => {
    const s = setup();
    s.socket.inject(baseline());
    s.socket.inject(event(1));
    expect(s.offers).toHaveLength(2);
    expect(apply(s.offers[0])).not.toBeNull();
    expect(apply(s.offers[1])).not.toBeNull();
    s.transport.onFrame((frame) => {
      if (frame.kind === 'CampaignEvent' && !frame.appliedView) {
        s.complete(s.offers[0]);
        s.complete(s.offers[1]);
      }
    });
    const plain = { ...event(2), appliedView: undefined };
    s.socket.inject(plain as unknown as ICampaignApplicationOffer);
    expect(s.acks()).toEqual([
      expect.objectContaining({ appliedView: s.offers[1].appliedView }),
    ]);
  });
  it('refuses retargeting a cached transport to another campaign binding', () => {
    const s = setup();
    expect(
      connectStoredCampaignSyncTransport({
        matchId: 'm1',
        role: 'guest',
        expectedCampaignId: 'other',
      }),
    ).toBeNull();
    expect(
      connectStoredCampaignSyncTransport({
        matchId: 'm1',
        role: 'guest',
        expectedCampaignId: 'c1',
      }),
    ).toBe(s.transport);
  });
});

describe('campaignSyncTransport', () => {
  beforeEach(() => {
    _resetCampaignSyncTransportsForTest();
  });

  it('keeps the quiet channel alive: heartbeats flow on the shared cadence', () => {
    // The campaign socket now participates in the same liveness policy
    // as the match socket (the server reaps idle connections), so a
    // client that never sends heartbeats would be reaped for reading
    // the screen quietly. RED before the transport scheduled them.
    jest.useFakeTimers();
    try {
      const sockets = makeSocketFactory();
      const transport = connectCampaignSyncTransport({
        matchId: 'match-hb',
        role: 'guest',
        playerId: 'pid_guest',
        wireToken: 'wire-token',
        roomCode: 'ABC234',
        url: 'ws://example.test/api/multiplayer/socket',
        socketFactory: sockets.factory,
      });
      sockets.lastSocket().fireOpen();
      const before = sockets.lastSocket().sentRaw.length;

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3 + 5);

      const beats = sockets
        .lastSocket()
        .sentRaw.slice(before)
        .map((raw) => JSON.parse(raw) as { kind: string; matchId?: string })
        .filter((frame) => frame.kind === 'Heartbeat');
      expect(beats.length).toBeGreaterThanOrEqual(3);
      expect(beats[0]).toMatchObject({ matchId: 'match-hb' });

      // close() stops the cadence - a closed transport must not tick.
      const closedAt = sockets.lastSocket().sentRaw.length;
      transport.close();
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
      expect(
        sockets
          .lastSocket()
          .sentRaw.slice(closedAt)
          .map((raw) => JSON.parse(raw) as { kind: string })
          .filter((frame) => frame.kind === 'Heartbeat'),
      ).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('opens the campaign channel and sends CampaignJoin', () => {
    const sockets = makeSocketFactory();
    connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      roomCode: 'ABC234',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    expect(sockets.urls[0]).toContain('channel=campaign');
    expect(sockets.urls[0]).toContain('matchId=match-1');
    // The credential is NOT in the URL - it travels in the subprotocol
    // header, so it never reaches an access or proxy log.
    expect(sockets.urls[0]).not.toContain('token=');
    expect(sockets.urls[0]).not.toContain('wire-token');
    expect(sockets.offered[0]).toEqual(credentialProtocols('wire-token'));
    sockets.lastSocket().fireOpen();

    const join = JSON.parse(sockets.lastSocket().sentRaw[0]) as {
      kind: string;
      matchId: string;
      playerId: string;
      role: string;
      roomCode: string;
      token: string;
    };
    expect(join).toMatchObject({
      kind: 'CampaignJoin',
      matchId: 'match-1',
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
      token: 'wire-token',
    });
  });

  it('puts a campaign-session-scoped token on the credential subprotocol', async () => {
    const kp = await generateKeyPair();
    const identity: IVaultIdentity = {
      id: 'identity-id',
      displayName: 'Campaign Pilot',
      publicKey: Buffer.from(kp.publicKey).toString('base64'),
      privateKey: Buffer.from(kp.privateKey).toString('base64'),
      friendCode: 'AAAA-BBBB-CCCC-DDDD',
      createdAt: new Date().toISOString(),
    };
    const token = await issuePlayerToken(identity, {
      scope: { kind: 'campaign-session', id: 'match-1' },
    });
    const sockets = makeSocketFactory();
    connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: token.playerId,
      wireToken: token,
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    const offered = sockets.offered[0] ?? [];
    const credential = offered.find((entry) =>
      entry.startsWith(WS_CREDENTIAL_PREFIX),
    );
    expect(credential).toBeDefined();
    const wire = fromBase64Url(
      (credential ?? '').slice(WS_CREDENTIAL_PREFIX.length),
    );
    expect(decodeTokenFromWire(wire)?.scope).toEqual({
      kind: 'campaign-session',
      id: 'match-1',
    });
  });

  it('accepts the sequence -1 baseline snapshot frame', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });
    const frames: unknown[] = [];
    transport.onFrame((message) => frames.push(message));

    sockets.lastSocket().inject({
      kind: 'CampaignSnapshot',
      matchId: 'match-1',
      ts: '2026-06-21T00:00:00.000Z',
      event: {
        type: 'CampaignSnapshotPublished',
        sequence: -1,
        campaignId: 'campaign-1',
        ts: '2026-06-21T00:00:00.000Z',
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: {
          state: {
            campaignId: 'campaign-1',
            day: 0,
            balance: 900_000,
            rosterUnits: {},
            pilots: {},
            contracts: {},
            factionStanding: {},
            salvagePool: 0,
          },
        },
      },
    });

    expect(frames).toHaveLength(1);
    const snapshot = campaignSnapshotFromMessage(frames[0] as never);
    expect(snapshot?.sequence).toBe(-1);
    expect(snapshot?.payload.state.balance).toBe(900_000);
  });

  it('sends guest proposals over the campaign frame contract', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    transport.sendProposal({
      proposalId: 'proposal-1',
      campaignId: 'campaign-1',
      proposingPlayerId: 'pid_guest',
      ts: '2026-06-21T00:00:00.000Z',
      intent: {
        kind: 'SpendFunds',
        campaignId: 'campaign-1',
        intentId: 'intent-1',
        payload: { amount: 1000, reason: 'Ammo' },
      },
    });

    const proposal = JSON.parse(sockets.lastSocket().sentRaw[0]) as {
      kind: string;
      proposal: { proposalId: string };
    };
    expect(proposal).toMatchObject({
      kind: 'CampaignProposal',
      proposal: { proposalId: 'proposal-1' },
    });
  });

  it('sends host campaign intents over the authenticated campaign channel', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'host',
      playerId: 'pid_host',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    transport.sendHostIntent({
      kind: 'AdvanceDay',
      campaignId: 'campaign-1',
      intentId: 'intent-advance-day',
      payload: { days: 1 },
    });

    expect(JSON.parse(sockets.lastSocket().sentRaw[0])).toMatchObject({
      kind: 'CampaignHostIntent',
      matchId: 'match-1',
      playerId: 'pid_host',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-1',
        intentId: 'intent-advance-day',
        payload: { days: 1 },
      },
    });
  });

  it('legacy compatibility: observes a resync snapshot revision without proving application', () => {
    // A large-gap resync delivers a CampaignSnapshotPublished baseline
    // stamped sequence -1 and nothing else. Acking only sequence >= 0
    // frames left the rejoiner permanently behind the gate: the server
    // raised their delivered watermark to the snapshot's revision, but
    // no ack could ever arrive until an UNRELATED live event landed -
    // so AdvanceDay stayed refused with nothing anyone could do. After
    // applying a snapshot the client genuinely holds the state at
    // payload.revision, so acking that revision is honest.
    const sockets = makeSocketFactory();
    connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });

    sockets.lastSocket().inject({
      kind: 'CampaignEvent',
      matchId: 'match-1',
      ts: '2026-06-21T00:00:00.000Z',
      event: {
        type: 'CampaignSnapshotPublished',
        sequence: -1,
        campaignId: 'campaign-1',
        ts: '2026-06-21T00:00:00.000Z',
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: { matchId: 'match-1', revision: 7 },
      },
    });

    expect(JSON.parse(sockets.lastSocket().sentRaw[0])).toMatchObject({
      kind: 'CampaignAck',
      revision: 7,
    });
  });

  it('legacy compatibility: observes each CampaignEvent sequence without proving application', () => {
    const sockets = makeSocketFactory();
    const transport = connectCampaignSyncTransport({
      matchId: 'match-1',
      role: 'guest',
      playerId: 'pid_guest',
      wireToken: 'wire-token',
      url: 'ws://example.test/api/multiplayer/socket',
      socketFactory: sockets.factory,
    });
    const applied: number[] = [];
    transport.onFrame((message) => {
      if (message.kind === 'CampaignEvent') {
        applied.push(message.event.sequence);
      }
    });

    sockets.lastSocket().inject({
      kind: 'CampaignEvent',
      matchId: 'match-1',
      ts: '2026-06-21T00:00:00.000Z',
      event: {
        type: 'FundsChanged',
        sequence: 4,
        campaignId: 'campaign-1',
        ts: '2026-06-21T00:00:00.000Z',
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: {},
      },
    });

    expect(applied).toEqual([4]);
    expect(JSON.parse(sockets.lastSocket().sentRaw[0])).toMatchObject({
      kind: 'CampaignAck',
      matchId: 'match-1',
      playerId: 'pid_guest',
      campaignId: 'campaign-1',
      revision: 4,
    });
  });
});
