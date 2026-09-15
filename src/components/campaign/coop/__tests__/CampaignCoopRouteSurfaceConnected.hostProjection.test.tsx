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

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import type {
  CampaignSyncFrameHandler,
  ICampaignSyncTransport,
  IConnectStoredCampaignSyncOptions,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { connectStoredCampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import { storeCoopCampaignToken } from '@/lib/campaign/coop/coopCampaignAuthTokenStore';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
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

  it('quotes the cursor it holds when the host surface reconnects', async () => {
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

    // A rotated invite re-runs the connect effect on a live surface: the
    // reconnect quotes the sequence the fold reached.
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

    expect(socket.connects).toHaveLength(2);
    expect(socket.connects[1]?.lastSeq).toBe(7);
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
