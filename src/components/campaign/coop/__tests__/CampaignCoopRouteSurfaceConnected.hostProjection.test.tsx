/**
 * Host-view freshness for `CampaignCoopRouteSurfaceConnected`
 * (roadmap R2.authority-host, slices H0/H1/H2).
 *
 * The GM/host browser subscribes to the same campaign-sync frame stream
 * a guest does — with the all-scopes grant, so it sees strictly more —
 * yet it never folded those frames back into the campaign object the
 * rest of its own dashboard reads. `design-campaign-authority-and-sync`
 * tasks.md recorded the consequence verbatim on 2026-08-22: "the GM/host
 * browser does not see an approved co-op proposal in its OWN campaign
 * surfaces until a reload". These rows reproduce that, and design D9 —
 * "GM view is a grant property, not a hosting property ... same
 * mechanism, no special path" — is why the fix is the projection every
 * viewer already shares, not a second host-flavoured pipeline.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D9)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/coop-campaign-sync/spec.md
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaignAuthoritativeFold } from '@/lib/campaign/coop/campaignAuthoritativeFold';
import type {
  CampaignSyncFrameHandler,
  ICampaignSyncTransport,
  ICampaignSyncWebSocket,
  IConnectStoredCampaignSyncOptions,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type {
  ICampaignApplicationOffer,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD } from '@/lib/campaign/coop/campaignAuthoritativeFold';
import {
  _resetCampaignSyncTransportsForTest,
  APPLICATION_CONFIRMATION_TIMEOUT_MS,
  connectCampaignSyncTransport,
  connectStoredCampaignSyncTransport,
  getActiveCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';
import { FactionStandingLevel } from '@/types/campaign/factionStanding/IFactionStanding';

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';

// Only the connect factory is faked: every other transport export (the
// frame decoders the surface folds through) stays real, so these rows
// exercise the production parse path.
jest.mock('@/lib/campaign/coop/campaignSyncTransport', () => {
  const actual = jest.requireActual(
    '@/lib/campaign/coop/campaignSyncTransport',
  );
  return { ...actual, connectStoredCampaignSyncTransport: jest.fn() };
});

// The host effect opens a real runtime session (CampaignMatchHost +
// CampaignSyncSession). These rows are about the VIEW side, so the
// session is stubbed to keep them on the frame-stream-to-store path.
jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => {
  const actual = jest.requireActual('@/lib/campaign/coop/coopRuntimeSession');
  return {
    ...actual,
    openCoopRuntimeSession: jest.fn().mockResolvedValue(null),
    subscribeCoopPendingProposals: jest.fn(() => () => undefined),
  };
});

// The host fold is a ref inside the surface; the folds it is built from stay
// real and are recorded, so a row can read the GM's launch facts at the
// moment an ACK leaves. `mockDropLiveFact` injects an incorrect adjunct.
const mockHostFolds: ICampaignAuthoritativeFold[] = [];
/** The fold each hydration started from: EMPTY unless a lineage continued. */
const mockHydrationInputs: ICampaignAuthoritativeFold[] = [];
let mockDropLiveFact = false;
jest.mock('@/lib/campaign/coop/campaignAuthoritativeFold', () => {
  const actual = jest.requireActual(
    '@/lib/campaign/coop/campaignAuthoritativeFold',
  );
  const recorded =
    (name: 'foldCampaignHydration' | 'foldCampaignEvent') =>
    (...args: unknown[]) => {
      if (name === 'foldCampaignHydration') {
        mockHydrationInputs.push(args[0] as ICampaignAuthoritativeFold);
      }
      let fold = actual[name](...args) as ICampaignAuthoritativeFold | null;
      if (fold && name === 'foldCampaignEvent' && mockDropLiveFact) {
        fold = { ...fold, launchFacts: fold.launchFacts?.slice(0, -1) };
      }
      if (fold) mockHostFolds.push(fold);
      return fold;
    };
  return {
    ...actual,
    foldCampaignHydration: recorded('foldCampaignHydration'),
    foldCampaignEvent: recorded('foldCampaignEvent'),
  };
});

const connectMock = connectStoredCampaignSyncTransport as unknown as jest.Mock<
  ICampaignSyncTransport | null,
  [IConnectStoredCampaignSyncOptions]
>;

const MATCH_ID = 'match-host-fold';
const ROOM_CODE = 'ABC234';
const CAMPAIGN_ID = 'campaign-host-fold';
const START_BALANCE = 1_000_000;

interface IFakeSocket {
  readonly emit: (message: IServerMessage) => void;
  /** Every connect call the surface made, in order. */
  readonly connects: IConnectStoredCampaignSyncOptions[];
}

/**
 * Install a transport whose frames the test drives by hand, recording
 * each connect call so the reconnect cursor (H2) is observable.
 */
function installTransport(role: 'host' | 'guest'): IFakeSocket {
  const handlers = new Set<CampaignSyncFrameHandler>();
  const connects: IConnectStoredCampaignSyncOptions[] = [];
  const transport: ICampaignSyncTransport = {
    matchId: MATCH_ID,
    playerId: role === 'host' ? 'host-player' : 'guest-player',
    role,
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: jest.fn(),
    sendParticipation: jest.fn(),
    onFrame: (handler) => {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    onError: () => () => undefined,
    close: jest.fn(),
    lastSeq: () => -1,
  };
  connectMock.mockImplementation((input) => {
    connects.push(input);
    return transport;
  });
  return {
    emit: (message) => {
      handlers.forEach((handler) => handler(message));
    },
    connects,
  };
}

function hostCampaign(): ICampaign {
  return {
    ...createCampaign('GM Campaign', 'mercenary', {
      startingFunds: START_BALANCE,
    }),
    id: CAMPAIGN_ID,
    campaignStartDate: new Date('3025-01-01T00:00:00.000Z'),
    currentDate: new Date('3025-01-01T00:00:00.000Z'),
    coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID),
  };
}

function guestCampaign(): ICampaign {
  return {
    ...hostCampaign(),
    coopSession: createGuestCoopSession(MATCH_ID, ROOM_CODE),
  };
}

/** A committed `FundsChanged` — the shape an approved spend broadcasts. */
function fundsChangedFrame(sequence: number, balance: number): IServerMessage {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:00.000Z',
    event: {
      sequence,
      campaignId: CAMPAIGN_ID,
      ts: '3025-01-01T00:00:00.000Z',
      authorPlayerId: 'host-player',
      type: 'FundsChanged',
      scope: 'campaign',
      payload: { delta: balance - START_BALANCE, reason: 'Ammo', balance },
    },
  } as IServerMessage;
}

/** A committed `CampaignDayAdvanced`. */
function dayAdvancedFrame(sequence: number, newDay: number): IServerMessage {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:00.000Z',
    event: {
      sequence,
      campaignId: CAMPAIGN_ID,
      ts: '3025-01-01T00:00:00.000Z',
      authorPlayerId: 'host-player',
      type: 'CampaignDayAdvanced',
      scope: 'campaign',
      payload: { previousDay: newDay - 1, newDay },
    },
  } as IServerMessage;
}

/**
 * The baseline a (re)joining connection is hydrated with — the frame
 * `CampaignSyncSession.buildBaselineEvent` always sends the GM, carrying
 * whatever committed while that GM was away. It is stamped
 * `sequence: -1` and names the real head in `payload.revision`.
 */
function baselineFrame(
  revision: number,
  state: ICampaignAuthoritativeState,
): IServerMessage {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:00.000Z',
    event: {
      sequence: -1,
      campaignId: CAMPAIGN_ID,
      ts: '3025-01-01T00:00:00.000Z',
      authorPlayerId: 'host-player',
      type: 'CampaignSnapshotPublished',
      scope: 'campaign',
      payload: { matchId: MATCH_ID, revision, state },
    },
  } as IServerMessage;
}

function storedBalance(): number | undefined {
  const campaign = useCampaignStore().getState().campaign;
  const balance = campaign?.finances.balance as unknown;
  return typeof balance === 'object' && balance !== null && 'amount' in balance
    ? (balance as { amount: number }).amount
    : undefined;
}

function storedDate(): string | undefined {
  return useCampaignStore().getState().campaign?.currentDate.toISOString();
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('CampaignCoopRouteSurfaceConnected — host view folds its own stream', () => {
  beforeEach(() => {
    connectMock.mockReset();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: 'host-player',
      wireToken: 'wire-token',
      displayName: 'GM',
    });
  });

  afterEach(() => {
    cleanup();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  it('advances the host campaign store when its own approved proposal commits', async () => {
    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const socket = installTransport('host');

    render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();

    await act(async () => {
      socket.emit(fundsChangedFrame(0, 950_000));
    });

    expect(storedBalance()).toBe(950_000);
  });

  it('advances the host campaign date when its own day advance commits', async () => {
    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const socket = installTransport('host');

    render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();

    await act(async () => {
      socket.emit(dayAdvancedFrame(0, 3));
    });

    expect(storedDate()).toBe('3025-01-04T00:00:00.000Z');
  });

  it('backfills the host view from the baseline a reconnect hydrates with', async () => {
    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const first = installTransport('host');

    const mounted = render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();
    await act(async () => {
      first.emit(fundsChangedFrame(0, 900_000));
    });
    mounted.unmount();

    // Committed while the GM's socket was down. The reconnect is
    // hydrated with the baseline carrying it, then the live tail.
    const missed: ICampaignAuthoritativeState = {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      day: 5,
      balance: 640_000,
    };
    const second = installTransport('host');
    render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();
    await act(async () => {
      second.emit(baselineFrame(4, missed));
      second.emit(fundsChangedFrame(5, 600_000));
    });

    expect(storedBalance()).toBe(600_000);
    expect(storedDate()).toBe('3025-01-06T00:00:00.000Z');
  });

  it('projects the same store state for the host and the guest from identical frames', async () => {
    const frames = [
      baselineFrame(0, createEmptyCampaignState(CAMPAIGN_ID)),
      fundsChangedFrame(1, 820_000),
      dayAdvancedFrame(2, 4),
    ];

    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const hostSocket = installTransport('host');
    const hostMount = render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();
    await act(async () => {
      frames.forEach(hostSocket.emit);
    });
    const hostBalance = storedBalance();
    const hostDate = storedDate();
    hostMount.unmount();

    resetCampaignStore();
    useCampaignMirrorStore.getState().reset();
    const guest = guestCampaign();
    useCampaignStore().getState().switchCampaign(guest);
    const guestSocket = installTransport('guest');
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={guest}
        routeId="dashboard"
      />,
    );
    await flush();
    await act(async () => {
      frames.forEach(guestSocket.emit);
    });

    expect(hostBalance).toBe(820_000);
    expect(hostBalance).toBe(storedBalance());
    expect(hostDate).toBe(storedDate());
  });

  it('keeps standing metadata the ledger cannot carry when it folds', async () => {
    const host: ICampaign = {
      ...hostCampaign(),
      factionStandings: {
        'faction-a': {
          factionId: 'faction-a',
          regard: 12,
          level: FactionStandingLevel.LEVEL_5,
          accoladeLevel: 2,
          censureLevel: 1,
          history: [
            {
              date: new Date('3025-01-01T00:00:00.000Z'),
              delta: 12,
              reason: 'Contract success',
              previousRegard: 0,
              newRegard: 12,
              previousLevel: FactionStandingLevel.LEVEL_4,
              newLevel: FactionStandingLevel.LEVEL_5,
            },
          ],
        },
      },
    };
    useCampaignStore().getState().switchCampaign(host);
    const socket = installTransport('host');

    render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();
    await act(async () => {
      socket.emit(
        baselineFrame(0, {
          ...createEmptyCampaignState(CAMPAIGN_ID),
          balance: START_BALANCE,
          factionStanding: { 'faction-a': 30 },
        }),
      );
    });

    const standing =
      useCampaignStore().getState().campaign?.factionStandings['faction-a'];
    expect(standing?.regard).toBe(30);
    expect(standing?.level).toBe(FactionStandingLevel.LEVEL_6);
    expect(standing?.accoladeLevel).toBe(2);
    expect(standing?.censureLevel).toBe(1);
    expect(standing?.history).toHaveLength(1);
  });

  it('starts every host binding from an empty fold, so a reconnect adopts the baseline it is hydrated with', async () => {
    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const socket = installTransport('host');

    const mounted = render(
      <CampaignCoopRouteSurfaceConnected campaign={host} routeId="dashboard" />,
    );
    await flush();
    // The first connect holds nothing, exactly like the guest's.
    expect(socket.connects).toHaveLength(1);
    expect(socket.connects[0]?.lastSeq).toBe(-1);

    await act(async () => {
      socket.emit(fundsChangedFrame(7, 700_000));
    });

    // A rotated invite re-runs the connect effect on a live surface. The
    // new binding holds nothing (P2CF2 closes the reconnect-at-zero
    // residual), so it quotes no cursor and adopts its hydration baseline
    // at 0 instead of refusing it against the cursor the old one reached.
    mounted.rerender(
      <CampaignCoopRouteSurfaceConnected
        campaign={{
          ...host,
          coopSession: createHostCoopSession('ZZZ999', MATCH_ID),
        }}
        routeId="dashboard"
      />,
    );
    await flush();
    await act(async () => {
      socket.emit(
        baselineFrame(9, {
          ...createEmptyCampaignState(CAMPAIGN_ID),
          balance: 640_000,
        }),
      );
    });

    expect(socket.connects).toHaveLength(2);
    expect(socket.connects[1]?.lastSeq).toBe(-1);
    expect(storedBalance()).toBe(640_000);
  });

  it('leaves a single-player campaign alone', async () => {
    const solo = {
      ...createCampaign('Solo', 'mercenary', { startingFunds: START_BALANCE }),
      id: 'campaign-solo',
    };
    useCampaignStore().getState().switchCampaign(solo);
    installTransport('host');

    render(
      <CampaignCoopRouteSurfaceConnected campaign={solo} routeId="dashboard" />,
    );
    await flush();

    expect(connectMock).not.toHaveBeenCalled();
    expect(storedBalance()).toBe(START_BALANCE);
  });
});

// --- P2CF2: application refusals stay off the refusal posture ---

/** A guest proposal the GM review surface lists with an Approve control. */
function proposalFrame(): IServerMessage {
  return {
    kind: 'CampaignProposal',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:00.000Z',
    playerId: 'guest-player',
    proposal: {
      proposalId: 'p-day',
      campaignId: CAMPAIGN_ID,
      proposingPlayerId: 'guest-player',
      ts: '3025-01-01T00:00:00.000Z',
      intent: {
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: 'intent-p-day',
        payload: { days: 1 },
      },
    },
  } as IServerMessage;
}

function errorFrame(
  code: string,
  reason?: string,
  recoveryAction?: string,
): IServerMessage {
  return {
    kind: 'Error',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:01.000Z',
    code,
    ...(reason === undefined ? {} : { reason }),
    ...(recoveryAction === undefined ? {} : { recoveryAction }),
  } as IServerMessage;
}

const APPLICATION_REFUSALS: readonly IServerMessage[] = [
  errorFrame('INVALID_INTENT', 'campaign-application-head-drift'),
  errorFrame(
    'INVALID_INTENT',
    'campaign-application-unknown-receipt',
    'rejoin-campaign',
  ),
  errorFrame('INTERNAL_ERROR', 'campaign-application-unavailable'),
];

describe('CampaignCoopRouteSurfaceConnected - application refusals never set or clear the refusal posture', () => {
  beforeEach(() => {
    connectMock.mockReset();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: 'host-player',
      wireToken: 'wire-token',
      displayName: 'GM',
    });
  });

  afterEach(() => {
    cleanup();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  it('keeps the GM gated on the server refusal it holds', async () => {
    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const socket = installTransport('host');
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={host}
        routeId="dashboard"
        dashboardMount
      />,
    );
    await flush();
    await act(async () => {
      socket.emit(proposalFrame());
      socket.emit(
        errorFrame(
          'CAMPAIGN_STALE_HEAD',
          'expected revision 3, active head is revision 4',
          'resync-to-active-head',
        ),
      );
    });
    expect(screen.getByTestId('approve-p-day')).toBeDisabled();

    await act(async () => {
      APPLICATION_REFUSALS.forEach(socket.emit);
    });

    expect(screen.getByTestId('gm-lifecycle-state')).toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.getByTestId('approve-p-day')).toBeDisabled();
    expect(
      screen.getByText('Server instruction: resync-to-active-head'),
    ).toBeInTheDocument();
  });

  it('does not gate a GM who holds no refusal', async () => {
    const host = hostCampaign();
    useCampaignStore().getState().switchCampaign(host);
    const socket = installTransport('host');
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={host}
        routeId="dashboard"
        dashboardMount
      />,
    );
    await flush();
    await act(async () => {
      socket.emit(proposalFrame());
      socket.emit(
        errorFrame('INVALID_INTENT', 'campaign-application-head-drift', 'x'),
      );
    });

    expect(screen.getByTestId('gm-lifecycle-state')).not.toHaveAttribute(
      'data-state',
      'blocked',
    );
    expect(screen.queryByText('Server instruction: x')).toBeNull();
  });

  it('keeps the guest commands blocked on the server refusal it holds', async () => {
    const guest = guestCampaign();
    useCampaignStore().getState().switchCampaign(guest);
    const socket = installTransport('guest');
    render(
      <CampaignCoopRouteSurfaceConnected campaign={guest} routeId="finances" />,
    );
    await flush();
    await act(async () => {
      socket.emit(baselineFrame(0, createEmptyCampaignState(CAMPAIGN_ID)));
      socket.emit(errorFrame('PROJECTION_REBUILDING'));
    });
    const reason = screen.getByTestId(
      'guest-command-blocked-reason',
    ).textContent;

    await act(async () => {
      APPLICATION_REFUSALS.forEach(socket.emit);
    });

    expect(screen.getByTestId('guest-command-blocked-reason').textContent).toBe(
      reason,
    );
  });
});

// --- P2CF2: the mounted receipt consumer over a real bound transport ---

interface IMockSocket extends ICampaignSyncWebSocket {
  readonly sentRaw: string[];
  /** The projected campaign-store balance at the moment each frame was sent. */
  readonly balanceAtSend: (number | undefined)[];
  inject(message: unknown): void;
}

interface IBoundConnection {
  readonly sockets: IMockSocket[];
  readonly transports: ICampaignSyncTransport[];
  readonly connects: IConnectStoredCampaignSyncOptions[];
  /** Delivers a frame on the newest socket. */
  readonly inject: (message: unknown) => void;
  /** Receipt ids of every CampaignAck sent on socket `index`, in order. */
  readonly acks: (index?: number) => string[];
}

function mockSocket(): IMockSocket {
  const socket: IMockSocket = {
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    sentRaw: [],
    balanceAtSend: [],
    send(data: string) {
      socket.sentRaw.push(data);
      socket.balanceAtSend.push(storedBalance());
    },
    close() {
      socket.readyState = 3;
      socket.onclose?.({});
    },
    inject(message: unknown) {
      socket.onmessage?.({ data: JSON.stringify(message) });
    },
  };
  return socket;
}

/** Each sent receipt ACK with the store balance it left behind. */
function sentAcks(
  socket: IMockSocket,
): { readonly receiptId: string; readonly balance: number | undefined }[] {
  return socket.sentRaw.flatMap((raw, index) => {
    const frame = JSON.parse(raw) as {
      readonly kind: string;
      readonly appliedView?: { readonly receiptId: string };
    };
    return frame.kind === 'CampaignAck' && frame.appliedView
      ? [
          {
            receiptId: frame.appliedView.receiptId,
            balance: socket.balanceAtSend[index],
          },
        ]
      : [];
  });
}

/**
 * Every connect the surface makes gets a REAL transport bound to
 * `expectedCampaignId` over a mock socket: what Task 14 will do at every
 * creator. Production creators stay unbound in Task 13.
 */
function installBoundTransport(
  role: 'host' | 'guest',
  expectedCampaignId: string | null = CAMPAIGN_ID,
): IBoundConnection {
  const sockets: IMockSocket[] = [];
  const transports: ICampaignSyncTransport[] = [];
  const connects: IConnectStoredCampaignSyncOptions[] = [];
  connectMock.mockImplementation((input) => {
    connects.push(input);
    const transport = connectCampaignSyncTransport({
      expectedCampaignId:
        input.matchId === 'match-host-fold-other'
          ? 'campaign-host-fold-other'
          : (expectedCampaignId ?? undefined),
      matchId: input.matchId ?? MATCH_ID,
      role,
      playerId: role === 'host' ? 'host-player' : 'guest-player',
      wireToken: 'wire-token',
      roomCode: input.roomCode,
      lastSeq: input.lastSeq,
      socketFactory: () => {
        const socket = mockSocket();
        sockets.push(socket);
        return socket;
      },
    });
    sockets[sockets.length - 1].onopen?.({});
    transports.push(transport);
    return transport;
  });
  return {
    sockets,
    transports,
    connects,
    inject: (message) => sockets[sockets.length - 1].inject(message),
    acks: (index = sockets.length - 1) =>
      sentAcks(sockets[index]).map((ack) => ack.receiptId),
  };
}

function launchFact(sequence: number): ICampaignEvent {
  return {
    type: 'CampaignMissionLaunched',
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-01T00:00:00.000Z',
    authorPlayerId: 'host-player',
    scope: 'campaign',
    payload: {
      missionId: `mission-${sequence}`,
      missionMatchId: `tactical-${sequence}`,
      acceptedHead: {
        branchId: 'main',
        revision: sequence,
        effectiveGeneration: 1,
      },
      deployingPlayerIds: ['host-player'],
    },
  } as ICampaignEvent;
}

/** A view's opening offer: the baseline plus its complete launch bundle. */
function baselineOffer(
  viewId: string,
  balance: number,
  hydrationFacts: readonly ICampaignEvent[] = [],
  campaignId: string = CAMPAIGN_ID,
): ICampaignApplicationOffer {
  return {
    kind: 'CampaignSnapshot',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:00.000Z',
    event: {
      sequence: -1,
      campaignId,
      ts: '3025-01-01T00:00:00.000Z',
      authorPlayerId: 'host-player',
      type: 'CampaignSnapshotPublished',
      scope: 'campaign',
      payload: {
        matchId: MATCH_ID,
        state: { ...createEmptyCampaignState(campaignId), balance },
      },
    },
    hydrationFacts: [...hydrationFacts],
    appliedView: {
      viewId,
      receiptId: `${viewId}-r0`,
      previousReceiptId: null,
    },
  } as ICampaignApplicationOffer;
}

/** A linked offer of one committed event, receipt `n` of `viewId`. */
function linkedOffer(
  viewId: string,
  n: number,
  event: ICampaignEvent,
): ICampaignApplicationOffer {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: '3025-01-01T00:00:00.000Z',
    event,
    appliedView: {
      viewId,
      receiptId: `${viewId}-r${n}`,
      previousReceiptId: `${viewId}-r${n - 1}`,
    },
  } as ICampaignApplicationOffer;
}

function fundsEvent(sequence: number, balance: number): ICampaignEvent {
  return (fundsChangedFrame(sequence, balance) as { event: ICampaignEvent })
    .event;
}

async function inject(
  connection: IBoundConnection,
  ...frames: unknown[]
): Promise<void> {
  await act(async () => {
    frames.forEach(connection.inject);
  });
}

describe('CampaignCoopRouteSurfaceConnected - a guest applies each offer before its exact ACK', () => {
  beforeEach(() => {
    connectMock.mockReset();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: 'guest-player',
      wireToken: 'wire-token',
      displayName: 'Guest',
    });
    useCampaignStore().getState().switchCampaign(guestCampaign());
  });

  afterEach(() => {
    cleanup();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  async function mountGuest(
    expectedCampaignId: string | null = CAMPAIGN_ID,
  ): Promise<IBoundConnection> {
    const connection = installBoundTransport('guest', expectedCampaignId);
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={guestCampaign()}
        routeId="dashboard"
      />,
    );
    await flush();
    return connection;
  }

  it('projects the baseline, a live fact and a visible no-op before one exact ACK each', async () => {
    const connection = await mountGuest();

    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await inject(
      connection,
      linkedOffer('v1', 1, fundsEvent(3, 750_000)),
      linkedOffer('v1', 1, fundsEvent(3, 750_000)),
    );
    await inject(connection, linkedOffer('v1', 2, launchFact(4)));

    // One ACK per offer, each sent only once its state was on the store.
    expect(sentAcks(connection.sockets[0])).toEqual([
      { receiptId: 'v1-r0', balance: 800_000 },
      { receiptId: 'v1-r1', balance: 750_000 },
      { receiptId: 'v1-r2', balance: 750_000 },
    ]);
    expect(useCampaignMirrorStore.getState().launchFacts).toEqual([
      launchFact(2),
      launchFact(4),
    ]);
    expect(connection.connects).toHaveLength(1);
  });

  it('HP caps a quiet guest seat at initial plus two sockets, closes them and shows the status', async () => {
    jest.useFakeTimers();
    try {
      const connection = await mountGuest();
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          jest.advanceTimersByTime(APPLICATION_CONFIRMATION_TIMEOUT_MS);
        });
        await flush();
      }
      expect(connection.sockets).toHaveLength(3);
      expect(connection.sockets.every((s) => s.readyState === 3)).toBe(true);
      const status = screen.getByText(
        'Campaign sync could not connect. Reload this campaign to try again.',
      );
      expect(status).toHaveAttribute('role', 'status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    [
      'an invalid launch bundle',
      () => undefined,
      [{ ...launchFact(2), payload: { missionId: 'm' } } as ICampaignEvent],
    ],
    [
      'a throwing campaign-store observer',
      () => {
        let thrown = false;
        useCampaignStore().subscribe(() => {
          if (thrown) return;
          thrown = true;
          throw new Error('observer failed');
        });
      },
      [],
    ],
    [
      'a campaign store that holds another campaign',
      () =>
        useCampaignStore()
          .getState()
          .switchCampaign({ ...guestCampaign(), id: 'campaign-other' }),
      [],
    ],
  ])(
    'never acknowledges a baseline it could not apply (%s) and rejoins',
    async (_label, arrange, facts) => {
      const connection = await mountGuest();
      arrange();

      await inject(connection, baselineOffer('v1', 800_000, facts));

      expect(connection.acks(0)).toEqual([]);
      expect(connection.sockets[0].readyState).toBe(3);
      expect(connection.connects).toHaveLength(2);
    },
  );

  it('leaves an offer unacknowledged when a later frame observer throws', async () => {
    const connection = await mountGuest();
    connection.transports[0].onFrame(() => {
      throw new Error('later observer failed');
    });

    await inject(connection, baselineOffer('v1', 800_000));

    expect(connection.acks(0)).toEqual([]);
    expect(connection.connects).toHaveLength(2);
  });

  it('re-sends on head-drift without a rejoin, and rejoins from EMPTY on unknown-receipt', async () => {
    const connection = await mountGuest();
    await inject(connection, baselineOffer('v1', 800_000));
    await inject(connection, linkedOffer('v1', 1, fundsEvent(5, 700_000)));
    expect(connection.acks(0)).toEqual(['v1-r0', 'v1-r1']);

    await inject(
      connection,
      errorFrame('INVALID_INTENT', 'campaign-application-head-drift'),
    );
    expect(connection.acks(0)).toEqual(['v1-r0', 'v1-r1', 'v1-r1']);
    expect(connection.connects).toHaveLength(1);

    await inject(
      connection,
      errorFrame('INVALID_INTENT', 'campaign-application-unknown-receipt'),
    );
    expect(connection.sockets[0].readyState).toBe(3);
    expect(connection.connects).toHaveLength(2);

    // The new view's baseline replaces the mirror that held cursor 5.
    await inject(connection, baselineOffer('v2', 300_000));
    expect(connection.acks(1)).toEqual(['v2-r0']);
    expect(storedBalance()).toBe(300_000);
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(300_000);
  });

  it('applies a first event at sequence 0 after the baseline', async () => {
    const connection = await mountGuest();
    await inject(connection, baselineOffer('v1', 800_000));

    await inject(connection, linkedOffer('v1', 1, fundsEvent(0, 790_000)));

    expect(connection.acks(0)).toEqual(['v1-r0', 'v1-r1']);
    expect(storedBalance()).toBe(790_000);
  });

  it('does not fold an unoffered campaign frame once offers flow', async () => {
    const connection = await mountGuest();
    await inject(connection, baselineOffer('v1', 800_000));

    await inject(connection, fundsChangedFrame(1, 100_000));

    expect(storedBalance()).toBe(800_000);
    expect(useCampaignMirrorStore.getState().campaign?.balance).toBe(800_000);
    expect(connection.acks(0)).toEqual(['v1-r0']);
  });

  it('leaves the shared transport alone once the surface unmounts', async () => {
    const connection = await mountGuest();
    await inject(connection, baselineOffer('v1', 800_000));

    cleanup();
    await inject(
      connection,
      errorFrame('INVALID_INTENT', 'campaign-application-unknown-receipt'),
    );

    expect(connection.sockets[0].readyState).toBe(1);
    expect(connection.connects).toHaveLength(1);
  });

  it('rejoins when the server ends the view with an application error', async () => {
    const connection = await mountGuest();
    await inject(connection, baselineOffer('v1', 800_000));

    await inject(
      connection,
      errorFrame('INTERNAL_ERROR', 'campaign-application-replaced'),
    );

    expect(connection.sockets[0].readyState).toBe(3);
    expect(connection.connects).toHaveLength(2);
  });

  it('never consumes a transport bound to another campaign', async () => {
    const connection = await mountGuest('campaign-other');

    await inject(
      connection,
      baselineOffer('v1', 800_000, [], 'campaign-other'),
    );

    expect(connection.acks(0)).toEqual([]);
    expect(useCampaignMirrorStore.getState().campaign).toBeNull();
    expect(storedBalance()).toBe(START_BALANCE);
  });

  it('keeps legacy traffic on an unbound transport: folded, numeric observation ACK, no receipt', async () => {
    const connection = await mountGuest(null);

    await inject(
      connection,
      baselineFrame(0, createEmptyCampaignState(CAMPAIGN_ID)),
      fundsChangedFrame(1, 900_000),
    );

    const acks = connection.sockets[0].sentRaw
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .filter((frame) => frame.kind === 'CampaignAck');
    expect(storedBalance()).toBe(900_000);
    expect(
      acks.map((frame) => ({
        revision: frame.revision,
        receipt: 'appliedView' in frame,
      })),
    ).toEqual([
      { revision: 0, receipt: false },
      { revision: 1, receipt: false },
    ]);
    expect(connection.connects).toHaveLength(1);
  });
});

describe('CampaignCoopRouteSurfaceConnected - a GM applies a fact-bearing baseline and a live launch before its exact ACK (m8)', () => {
  const realRefresh =
    useCampaignPersistenceStore.getState().refreshAfterCommittedCommand;
  /** What the GM held each time the consumer confirmed an offer. */
  let confirms: {
    readonly receiptId: string;
    readonly status: string;
    readonly launchFacts: readonly ICampaignEvent[] | undefined;
    readonly balance: number | undefined;
  }[];

  beforeEach(() => {
    connectMock.mockReset();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    mockHostFolds.length = 0;
    mockDropLiveFact = false;
    confirms = [];
    storeCoopCampaignToken({
      matchId: MATCH_ID,
      playerId: 'host-player',
      wireToken: 'wire-token',
      displayName: 'GM',
    });
    useCampaignStore().getState().switchCampaign(hostCampaign());
    // The saved-row refresh is the record suite's subject; here it adopts.
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: jest.fn(async () => true),
    });
  });

  afterEach(() => {
    cleanup();
    _resetCampaignSyncTransportsForTest();
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: realRefresh,
    });
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  async function mountHost(): Promise<IBoundConnection> {
    const connection = installBoundTransport('host');
    const connect = connectMock.getMockImplementation();
    if (!connect) throw new Error('no bound transport');
    connectMock.mockImplementation((input) => {
      const transport = connect(input);
      const confirm = transport?.confirmApplied;
      if (transport && confirm) {
        (transport as { confirmApplied: typeof confirm }).confirmApplied = (
          offer,
          outcome,
        ) => {
          confirms.push({
            receiptId: offer.appliedView.receiptId,
            status: outcome.status,
            launchFacts: mockHostFolds[mockHostFolds.length - 1]?.launchFacts,
            balance: storedBalance(),
          });
          return confirm(offer, outcome);
        };
      }
      return transport;
    });
    render(
      <CampaignCoopRouteSurfaceConnected
        campaign={hostCampaign()}
        routeId="dashboard"
      />,
    );
    await flush();
    return connection;
  }

  async function settled(): Promise<void> {
    await act(async () => {
      for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
    });
  }

  it('holds the baseline bundle, then the live launch, on the GM fold at each exact ACK', async () => {
    const connection = await mountHost();

    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await settled();
    await inject(connection, linkedOffer('v1', 1, launchFact(3)));
    await settled();

    expect(confirms).toEqual([
      {
        receiptId: 'v1-r0',
        status: 'applied',
        launchFacts: [launchFact(2)],
        balance: 800_000,
      },
      {
        receiptId: 'v1-r1',
        status: 'applied',
        launchFacts: [launchFact(2), launchFact(3)],
        balance: 800_000,
      },
    ]);
    expect(connection.acks(0)).toEqual(['v1-r0', 'v1-r1']);
    expect(connection.connects).toHaveLength(1);
  });

  it('sends no applied receipt for a live launch the GM fold did not retain, and rejoins', async () => {
    const connection = await mountHost();
    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await settled();

    mockDropLiveFact = true;
    await inject(connection, linkedOffer('v1', 1, launchFact(3)));
    await settled();

    expect(
      confirms.map(({ receiptId, status }) => [receiptId, status]),
    ).toEqual([
      ['v1-r0', 'applied'],
      ['v1-r1', 'failed'],
    ]);
    expect(connection.acks(0)).toEqual(['v1-r0']);
    expect(connection.sockets[0].readyState).toBe(3);
    expect(connection.connects).toHaveLength(2);
  });

  it('sends no applied receipt for a GM baseline whose bundle is malformed, and rejoins', async () => {
    const connection = await mountHost();

    await inject(
      connection,
      baselineOffer('v1', 800_000, [
        { ...launchFact(2), payload: { missionId: 'm' } } as ICampaignEvent,
      ]),
    );
    await settled();

    expect(confirms.map(({ status }) => status)).toEqual(['failed']);
    expect(connection.acks(0)).toEqual([]);
    expect(connection.sockets[0].readyState).toBe(3);
    expect(connection.connects).toHaveLength(2);
  });
});

describe('CampaignCoopRouteSurfaceConnected - a GM remount on its live bound transport continues the fold lineage (P2CG1G1, m8 P1)', () => {
  const realRefresh =
    useCampaignPersistenceStore.getState().refreshAfterCommittedCommand;
  const OTHER_MATCH_ID = 'match-host-fold-other';
  const OTHER_CAMPAIGN_ID = 'campaign-host-fold-other';
  let refresh: jest.Mock<Promise<boolean>, []>;
  /** What the GM held each time the consumer confirmed an offer. */
  let confirms: {
    readonly receiptId: string;
    readonly status: string;
    readonly launchFacts: readonly ICampaignEvent[] | undefined;
    readonly balance: number | undefined;
  }[];

  beforeEach(() => {
    connectMock.mockReset();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
    mockHostFolds.length = 0;
    mockHydrationInputs.length = 0;
    mockDropLiveFact = false;
    confirms = [];
    for (const matchId of [MATCH_ID, OTHER_MATCH_ID]) {
      storeCoopCampaignToken({
        matchId,
        playerId: 'host-player',
        wireToken: 'wire-token',
        displayName: 'GM',
      });
    }
    useCampaignStore().getState().switchCampaign(hostCampaign());
    refresh = jest.fn(async () => true);
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: refresh,
    });
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    _resetCampaignSyncTransportsForTest();
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: realRefresh,
    });
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  /**
   * Bound real transports over mock sockets that, like the real stored
   * connect, hand back the live registered transport for the match instead
   * of opening another socket, recording each confirmation with the GM's
   * launch facts and projected balance at that moment.
   */
  function installReusedBoundTransport(): IBoundConnection {
    const connection = installBoundTransport('host');
    const open = connectMock.getMockImplementation();
    if (!open) throw new Error('no bound transport');
    connectMock.mockImplementation((input) => {
      const live = getActiveCampaignSyncTransport(input.matchId);
      if (live) {
        connection.connects.push(input);
        return live;
      }
      const transport = open(input);
      const confirm = transport?.confirmApplied;
      if (transport && confirm) {
        (transport as { confirmApplied: typeof confirm }).confirmApplied = (
          offer,
          outcome,
        ) => {
          confirms.push({
            receiptId: offer.appliedView.receiptId,
            status: outcome.status,
            launchFacts: mockHostFolds[mockHostFolds.length - 1]?.launchFacts,
            balance: storedBalance(),
          });
          return confirm(offer, outcome);
        };
      }
      return transport;
    });
    return connection;
  }

  async function mountHost(campaign: ICampaign = hostCampaign()) {
    return render(
      <CampaignCoopRouteSurfaceConnected
        campaign={campaign}
        routeId="dashboard"
      />,
    );
  }

  async function settled(): Promise<void> {
    await act(async () => {
      for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
    });
  }

  it('applies the next linked launch onto the retained fold and facts after a remount, before its exact ACK', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await settled();
    await inject(connection, linkedOffer('v1', 1, launchFact(3)));
    await settled();

    first.unmount();
    await mountHost();
    await settled();
    await inject(connection, linkedOffer('v1', 2, launchFact(4)));
    await settled();

    expect(confirms).toEqual([
      {
        receiptId: 'v1-r0',
        status: 'applied',
        launchFacts: [launchFact(2)],
        balance: 800_000,
      },
      {
        receiptId: 'v1-r1',
        status: 'applied',
        launchFacts: [launchFact(2), launchFact(3)],
        balance: 800_000,
      },
      {
        receiptId: 'v1-r2',
        status: 'applied',
        launchFacts: [launchFact(2), launchFact(3), launchFact(4)],
        balance: 800_000,
      },
    ]);
    expect(connection.acks(0)).toEqual(['v1-r0', 'v1-r1', 'v1-r2']);
    // No second socket and no second baseline: the remount reused the
    // live transport and continued the receipt chain it was building.
    expect(connection.sockets).toHaveLength(1);
    expect(connection.connects).toHaveLength(2);
    expect(connection.sockets[0].readyState).toBe(1);
  });

  it('re-projects the retained fold when the remount binds, before any new frame', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await settled();
    first.unmount();

    // The next page reloads the saved record over the projected view.
    resetCampaignStore();
    useCampaignStore().getState().switchCampaign(hostCampaign());
    expect(storedBalance()).toBe(START_BALANCE);
    await mountHost();
    await settled();

    expect(storedBalance()).toBe(800_000);
    expect(connection.sockets).toHaveLength(1);
  });

  it('starts from EMPTY on the replacement transport a rejoin opens', async () => {
    const connection = installReusedBoundTransport();
    await mountHost();
    await settled();
    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await settled();
    await inject(connection, linkedOffer('v1', 1, launchFact(3)));
    await settled();

    await inject(
      connection,
      errorFrame('INTERNAL_ERROR', 'campaign-application-replaced'),
    );
    await settled();
    expect(connection.sockets).toHaveLength(2);
    expect(connection.sockets[0].readyState).toBe(3);

    mockHydrationInputs.length = 0;
    await inject(connection, baselineOffer('v2', 600_000, [launchFact(5)]));
    await settled();

    // The new view's baseline is adopted onto a fresh EMPTY cell, never
    // onto the closed transport's lineage.
    expect(mockHydrationInputs).toEqual([EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD]);
    expect(confirms[confirms.length - 1]).toEqual({
      receiptId: 'v2-r0',
      status: 'applied',
      launchFacts: [launchFact(5)],
      balance: 600_000,
    });
    expect(connection.acks(1)).toEqual(['v2-r0']);
  });

  it('gives another campaign a fresh fold that holds none of the first campaign facts', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await settled();
    first.unmount();

    const other = installBoundTransport('host', OTHER_CAMPAIGN_ID);
    const otherCampaign: ICampaign = {
      ...hostCampaign(),
      id: OTHER_CAMPAIGN_ID,
      coopSession: createHostCoopSession(ROOM_CODE, OTHER_MATCH_ID),
    };
    useCampaignStore().getState().switchCampaign(otherCampaign);
    mockHydrationInputs.length = 0;
    await mountHost(otherCampaign);
    await settled();
    await inject(other, {
      ...baselineOffer('v9', 500_000, [], OTHER_CAMPAIGN_ID),
      matchId: OTHER_MATCH_ID,
    });
    await settled();

    expect(mockHydrationInputs).toEqual([EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD]);
    expect(other.acks(0)).toEqual(['v9-r0']);
    expect(useCampaignStore().getState().campaign?.id).toBe(OTHER_CAMPAIGN_ID);
    expect(storedBalance()).toBe(500_000);
  });

  it('lets neither binding certify an offer whose refresh is held across the remount, and rejoins at the remount (CF-H1)', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await inject(connection, baselineOffer('v1', 800_000));
    await settled();

    let release: (adopted: boolean) => void = () => undefined;
    refresh.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    await inject(connection, linkedOffer('v1', 1, fundsEvent(1, 750_000)));
    await settled();
    first.unmount();
    await mountHost();
    await settled();
    await act(async () => {
      release(true);
    });
    await settled();
    // The server keeps publishing on the connection the GM came back to.
    await act(async () => {
      connection.sockets[0].inject(
        linkedOffer('v1', 2, fundsEvent(2, 700_000)),
      );
    });
    await settled();

    // Nobody can confirm r1 any more, so the old receipt chain is dead: the
    // remount rejoins at once instead of withholding every later ACK.
    expect(confirms.map(({ receiptId }) => receiptId)).toEqual(['v1-r0']);
    expect(connection.acks(0)).toEqual(['v1-r0']);
    expect(connection.sockets).toHaveLength(2);
    expect(connection.sockets[0].readyState).toBe(3);

    // The replacement view starts from EMPTY and is applied and ACKed.
    mockHydrationInputs.length = 0;
    await inject(connection, baselineOffer('v2', 600_000));
    await settled();
    expect(mockHydrationInputs).toEqual([EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD]);
    expect(connection.acks(1)).toEqual(['v2-r0']);
    expect(storedBalance()).toBe(600_000);
  });

  it('HP caps quiet replacement sockets at initial plus two, closes exhausted socket and renders status', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await mountHost();
    await settled();
    // One persistent live region, present and empty before exhaustion.
    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    for (let i = 0; i < 5; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets).toHaveLength(3);
    expect(connection.sockets.every((s) => s.readyState === 3)).toBe(true);
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toHaveTextContent(
      'Campaign sync could not connect. Reload this campaign to try again.',
    );
  });
  it('HP heartbeat and rebind do not replenish retry budget; route reload explicitly resets it', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    const first = await mountHost();
    await settled();
    for (let i = 0; i < 3; i++) {
      await inject(connection, {
        kind: 'Heartbeat',
        matchId: MATCH_ID,
        ts: '3025-01-01T00:00:00.000Z',
      });
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets).toHaveLength(3);
    first.unmount();
    await mountHost();
    await settled();
    for (let i = 0; i < 3; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets).toHaveLength(6);
  });
  it('HP healthy application resets budget after two quiet retries', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await mountHost();
    await settled();
    for (let i = 0; i < 2; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    await applied(connection, baselineOffer('reset', 800_000));
    await inject(
      connection,
      errorFrame('INTERNAL_ERROR', 'campaign-application-unknown-receipt'),
    );
    await settled();
    const before = connection.sockets.length;
    for (let i = 0; i < 3; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets.length - before).toBe(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Campaign sync could not connect. Reload this campaign to try again.',
    );
  });
  it('HP releases settling before confirm schedules microtask disposal (CF-H14)', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await applied(connection, baselineOffer('h14', 800_000));
    const transport = connection.transports[0];
    const confirm = transport.confirmApplied;
    if (!confirm) throw new Error('unbound transport');
    first.unmount();
    // A binding captures confirmApplied, so wrap it before the remount binds.
    const remounted: { current?: ReturnType<typeof render> } = {};
    transport.confirmApplied = (offer, outcome) => {
      const result = confirm(offer, outcome);
      // The linked offer's confirm disposes in its next microtask.
      if (offer.appliedView.previousReceiptId !== null)
        void Promise.resolve().then(() => remounted.current?.unmount());
      return result;
    };
    remounted.current = await mountHost();
    await settled();
    await inject(connection, linkedOffer('h14', 1, fundsEvent(1, 750_000)));
    await settled();
    await mountHost();
    await settled();
    expect(connection.sockets).toHaveLength(1);
    expect(connection.acks(0)).toEqual(['h14-r0', 'h14-r1']);
  });
  it('HP counts queued consume immediately for same-tick dispose (CF-H15)', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await applied(connection, baselineOffer('h15', 800_000));
    refresh.mockClear();
    act(() => {
      connection.inject(linkedOffer('h15', 1, fundsEvent(1, 750_000)));
      first.unmount();
    });
    await settled();
    await mountHost();
    await settled();
    expect(connection.sockets).toHaveLength(2);
    expect(connection.acks(0)).toEqual(['h15-r0']);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('HP identity switch starts a fresh mounted-seat episode; stale sockets cannot revive exhausted episode', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    const mounted = await mountHost();
    await settled();
    for (let i = 0; i < 3; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets).toHaveLength(3);
    const stale = connection.sockets[0];
    await act(async () => {
      stale.inject(
        errorFrame('INTERNAL_ERROR', 'campaign-application-unknown-receipt'),
      );
    });
    await settled();
    expect(connection.sockets).toHaveLength(3);
    const other = {
      ...hostCampaign(),
      id: OTHER_CAMPAIGN_ID,
      coopSession: createHostCoopSession(ROOM_CODE, OTHER_MATCH_ID),
    };
    useCampaignStore().getState().switchCampaign(other);
    mounted.rerender(
      <CampaignCoopRouteSurfaceConnected
        campaign={other}
        routeId="dashboard"
      />,
    );
    await settled();
    expect(
      screen.queryByText(
        'Campaign sync could not connect. Reload this campaign to try again.',
      ),
    ).toBeNull();
    expect(connection.sockets).toHaveLength(4);
    for (let i = 0; i < 3; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets).toHaveLength(6);
  });
  it('HP dispose cancels the quiet timer and ignores late dead callbacks', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    const mounted = await mountHost();
    await settled();
    mounted.unmount();
    await elapse(4 * APPLICATION_CONFIRMATION_TIMEOUT_MS);
    connection.sockets[0].inject(
      errorFrame('INTERNAL_ERROR', 'campaign-application-unknown-receipt'),
    );
    await settled();
    expect(connection.sockets).toHaveLength(1);
    expect(connection.sockets[0].readyState).toBe(1);
  });
  it('HP a rotated seat on the same campaign and match starts its own episode', async () => {
    const connection = installReusedBoundTransport();
    const reused = connectMock.getMockImplementation();
    if (!reused) throw new Error('no reused transport');
    let seat: string | null = null;
    // The stored token rotated: the replacement transport carries the new seat.
    connectMock.mockImplementation((input) => {
      const transport = reused(input);
      if (transport && seat !== null && transport.playerId !== seat)
        Object.defineProperty(transport, 'playerId', { value: seat });
      return transport;
    });
    jest.useFakeTimers();
    await mountHost();
    await settled();
    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
    await settled();
    expect(connection.sockets).toHaveLength(2);
    seat = 'host-player-rotated';
    for (let i = 0; i < 4; i++) {
      await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);
      await settled();
    }
    expect(connection.sockets).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Campaign sync could not connect. Reload this campaign to try again.',
    );
  });
  // --- The pre-receipt quiet window under fake timers (CF-G1..CF-G3, CF-G8, CF-G11) ---

  async function elapse(ms: number): Promise<void> {
    await act(async () => {
      jest.advanceTimersByTime(ms);
    });
  }

  /** The server's confirmation of the GM's ACK, so the view stops waiting. */
  async function confirmed(
    connection: IBoundConnection,
    offer: ICampaignApplicationOffer,
  ): Promise<void> {
    await inject(connection, {
      kind: 'CampaignAck',
      matchId: offer.matchId,
      ts: '3025-01-01T00:00:00.000Z',
      playerId: 'host-player',
      campaignId: offer.event.campaignId,
      appliedView: offer.appliedView,
    });
  }

  async function applied(
    connection: IBoundConnection,
    offer: ICampaignApplicationOffer,
  ): Promise<void> {
    await inject(connection, offer);
    await settled();
    await confirmed(connection, offer);
  }

  it('keeps the continued lineage through a quiet confirmation window after the remount (CF-G3)', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    const first = await mountHost();
    await settled();
    await applied(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await applied(connection, linkedOffer('v1', 1, launchFact(3)));

    first.unmount();
    await mountHost();
    await settled();
    // A GM reading the screen: the latched view hears nothing for a while.
    await elapse(2 * APPLICATION_CONFIRMATION_TIMEOUT_MS);
    await applied(connection, linkedOffer('v1', 2, launchFact(4)));

    expect(confirms[confirms.length - 1]).toEqual({
      receiptId: 'v1-r2',
      status: 'applied',
      launchFacts: [launchFact(2), launchFact(3), launchFact(4)],
      balance: 800_000,
    });
    expect(connection.acks(0)).toEqual(['v1-r0', 'v1-r1', 'v1-r2']);
    expect(connection.sockets).toHaveLength(1);
    expect(connection.sockets[0].readyState).toBe(1);
  });

  /** Timers the binding held: what disposing it clears (React's stay). */
  async function windowsDisposed(): Promise<number> {
    const live = jest.getTimerCount();
    cleanup();
    return live - jest.getTimerCount();
  }

  it('ends the quiet window on the first offer, so a quiet receipt-mode view never rejoins (CF-G1)', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await mountHost();
    await settled();

    await applied(connection, baselineOffer('v1', 800_000));
    await elapse(2 * APPLICATION_CONFIRMATION_TIMEOUT_MS);

    expect(connection.connects).toHaveLength(1);
    expect(connection.sockets[0].readyState).toBe(1);
    // The offer cleared the window, so disposing the binding clears none.
    expect(await windowsDisposed()).toBe(0);
  });

  it('does not end the quiet window on a heartbeat, a proposal or a command refusal (CF-G2)', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await mountHost();
    await settled();

    await inject(
      connection,
      { kind: 'Heartbeat', matchId: MATCH_ID, ts: '3025-01-01T00:00:00.000Z' },
      proposalFrame(),
      errorFrame('PROGRESSION_BLOCKED', 'campaign-progression-blocked'),
    );
    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS - 1);
    const withinWindow = connection.connects.length;
    await elapse(1);

    expect(withinWindow).toBe(1);
    expect(connection.connects).toHaveLength(2);
    expect(connection.sockets[0].readyState).toBe(3);
  });

  it('trades the old window for the new one across a rejoin (CF-G8)', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await mountHost();
    await settled();
    const before = jest.getTimerCount();

    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);

    expect(connection.connects).toHaveLength(2);
    expect(jest.getTimerCount()).toBe(before);
    // Exactly one window is armed, the new binding's.
    expect(await windowsDisposed()).toBe(1);
  });

  it('arms no window on an unbound transport (CF-G8)', async () => {
    const connection = installBoundTransport('host', null);
    jest.useFakeTimers();
    await mountHost();
    await settled();

    await elapse(2 * APPLICATION_CONFIRMATION_TIMEOUT_MS);

    expect(connection.connects).toHaveLength(1);
    expect(connection.sockets[0].readyState).toBe(1);
    expect(await windowsDisposed()).toBe(0);
  });

  it('arms no window on a fixture fake that carries only the mounted campaignId (CF-G11)', async () => {
    const socket = installTransport('host');
    const fake = connectMock.getMockImplementation();
    if (!fake) throw new Error('no fake transport');
    const close = jest.fn();
    connectMock.mockImplementation((input) => {
      const transport = fake(input);
      return transport
        ? { ...transport, campaignId: CAMPAIGN_ID, close }
        : null;
    });
    jest.useFakeTimers();
    await mountHost();
    await settled();

    // No confirmApplied, so the consumer stays inactive and arms nothing.
    await elapse(2 * APPLICATION_CONFIRMATION_TIMEOUT_MS);
    expect(socket.connects).toHaveLength(1);
    expect(close).not.toHaveBeenCalled();
    expect(await windowsDisposed()).toBe(0);
  });

  // --- What "already delivered a campaign frame" means (#2236 review note 2) ---
  // A transport counts as heard only while every campaign frame it has
  // dispatched reached an active binding. A frame that arrives while no
  // surface is mounted was never folded into the continued lineage, so the
  // remount keeps P2CG1F's pre-receipt window and recovers through it.

  it('does not remember a first campaign frame that arrives while no surface is mounted', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    const first = await mountHost();
    await settled();
    first.unmount();

    await inject(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await mountHost();
    await settled();
    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS - 1);
    const withinWindow = connection.sockets.length;
    await elapse(1);

    expect(withinWindow).toBe(1);
    expect(connection.sockets).toHaveLength(2);
    expect(connection.sockets[0].readyState).toBe(3);
    expect(confirms).toEqual([]);
  });

  it('re-arms the window when a sequenced campaign frame arrives while no surface is mounted', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    const first = await mountHost();
    await settled();
    await applied(connection, baselineOffer('v1', 800_000, [launchFact(2)]));
    await applied(connection, linkedOffer('v1', 1, launchFact(3)));
    first.unmount();

    await inject(connection, linkedOffer('v1', 2, launchFact(4)));
    await mountHost();
    await settled();
    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS - 1);
    const withinWindow = connection.sockets.length;
    await elapse(1);

    // The lineage never folded r2, so the remount must not trust it.
    expect(withinWindow).toBe(1);
    expect(connection.sockets).toHaveLength(2);
    expect(connection.sockets[0].readyState).toBe(3);
    expect(confirms.map(({ receiptId }) => receiptId)).toEqual([
      'v1-r0',
      'v1-r1',
    ]);
  });

  // --- A settle cut by the unmount (CF-H1, P2CG1G1 review) ---

  /** Baseline applied, linked r1 held on its refresh, unmount, remount, release. */
  async function cutAcrossRemount(connection: IBoundConnection): Promise<void> {
    const first = await mountHost();
    await settled();
    await applied(connection, baselineOffer('v1', 800_000));
    let release: (adopted: boolean) => void = () => undefined;
    refresh.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          release = resolve;
        }),
    );
    await inject(connection, linkedOffer('v1', 1, fundsEvent(1, 750_000)));
    await settled();
    first.unmount();
    await mountHost();
    await settled();
    await act(async () => {
      release(true);
    });
    await settled();
  }

  it('recovers within one window when the remount stays quiet after a cut settle (CF-H1)', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await cutAcrossRemount(connection);

    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS);

    expect(connection.connects.length).toBeGreaterThanOrEqual(3);
    expect(connection.sockets[0].readyState).toBe(3);
    expect(connection.acks(0)).toEqual(['v1-r0']);
    expect(confirms.map(({ receiptId }) => receiptId)).toEqual(['v1-r0']);
  });

  it('recovers within one window even when the next offer arrives first after a cut settle (CF-H1)', async () => {
    const connection = installReusedBoundTransport();
    jest.useFakeTimers();
    await cutAcrossRemount(connection);

    // A campaign frame inside the window must not leave r1 unconfirmable.
    await act(async () => {
      connection.sockets[0].inject(
        linkedOffer('v1', 2, fundsEvent(2, 700_000)),
      );
    });
    await settled();
    await elapse(APPLICATION_CONFIRMATION_TIMEOUT_MS - 1);

    expect(connection.sockets[0].readyState).toBe(3);
    expect(connection.acks(0)).toEqual(['v1-r0']);
    expect(confirms.map(({ receiptId }) => receiptId)).toEqual(['v1-r0']);
  });

  // --- Continue only a current lineage (CF-H3) and never an unbound one (CF-H4) ---

  it('does not re-show a lineage that missed a frame while no surface was mounted (CF-H3)', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await inject(connection, baselineOffer('v1', 800_000));
    await settled();
    await inject(connection, linkedOffer('v1', 1, fundsEvent(1, 750_000)));
    await settled();
    first.unmount();

    await inject(connection, linkedOffer('v1', 2, fundsEvent(2, 700_000)));
    resetCampaignStore();
    useCampaignStore().getState().switchCampaign(hostCampaign());
    await mountHost();
    await settled();

    // The held fold stops at r1 while the transport is at r2: not current.
    expect(storedBalance()).toBe(START_BALANCE);
  });

  it('continues a bound lineage whose legacy baseline is adopted ahead of the transport cursor (CF-H3)', async () => {
    const connection = installReusedBoundTransport();
    const first = await mountHost();
    await settled();
    await inject(
      connection,
      baselineFrame(4, {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 640_000,
      }),
    );
    first.unmount();

    // A legacy baseline is adopted at 0 while the transport cursor stays -1.
    resetCampaignStore();
    useCampaignStore().getState().switchCampaign(hostCampaign());
    await mountHost();
    await settled();
    expect(storedBalance()).toBe(640_000);
    await inject(connection, fundsChangedFrame(5, 600_000));
    expect(storedBalance()).toBe(600_000);
    expect(connection.sockets).toHaveLength(1);
  });

  it('starts a remount on the same unbound transport from EMPTY (CF-H4)', async () => {
    const connection = installBoundTransport('host', null);
    const open = connectMock.getMockImplementation();
    if (!open) throw new Error('no unbound transport');
    connectMock.mockImplementation((input) => {
      const live = getActiveCampaignSyncTransport(input.matchId);
      if (!live) return open(input);
      connection.connects.push(input);
      return live;
    });
    const first = await mountHost();
    await settled();
    await inject(
      connection,
      baselineFrame(4, {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: 640_000,
      }),
    );
    expect(storedBalance()).toBe(640_000);
    first.unmount();

    resetCampaignStore();
    useCampaignStore().getState().switchCampaign(hostCampaign());
    await mountHost();
    await settled();

    // Same transport object, but unbound: nothing is retained or re-shown.
    expect(connection.sockets).toHaveLength(1);
    expect(connection.connects).toHaveLength(2);
    expect(storedBalance()).toBe(START_BALANCE);
  });
});
