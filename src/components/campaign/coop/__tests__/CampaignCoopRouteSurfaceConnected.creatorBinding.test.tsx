/**
 * Creator binding for `CampaignCoopRouteSurfaceConnected` (P2CG1G2, CF9).
 *
 * Both surface creators bind `expectedCampaignId` to the mounted campaign,
 * whose id differs from the match id. A stored transport bound to another
 * campaign on the same match is never adopted (CF-H16), and a bound host
 * against a legacy server keeps one healthy socket across a remount
 * (CF-H6). Connections are real transports over in-file sockets.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/coop-campaign-sync/spec.md
 */

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import type {
  ICampaignSyncTransport,
  ICampaignSyncWebSocket,
  IConnectStoredCampaignSyncOptions,
} from '@/lib/campaign/coop/campaignSyncTransport';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  _resetCampaignSyncTransportsForTest,
  APPLICATION_CONFIRMATION_TIMEOUT_MS,
  connectCampaignSyncTransport,
  connectStoredCampaignSyncTransport,
  getActiveCampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
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

import { CampaignCoopRouteSurfaceConnected } from '../CampaignCoopRouteSurfaceConnected';

interface IBindSocket extends ICampaignSyncWebSocket {
  readonly sent: string[];
  inject(message: unknown): void;
}

const mockSockets: IBindSocket[] = [];

function mockSocket(): IBindSocket {
  const socket: IBindSocket = {
    readyState: 1,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    sent: [],
    send(data: string) {
      socket.sent.push(data);
    },
    close() {
      socket.readyState = 3;
      socket.onclose?.({});
    },
    inject(message: unknown) {
      socket.onmessage?.({ data: JSON.stringify(message) });
    },
  };
  mockSockets.push(socket);
  return socket;
}

// Only the stored connect is wrapped, to record its input and hand the real
// transport an in-file socket; the registry, the campaignId mismatch rule
// and every frame decoder stay real.
jest.mock('@/lib/campaign/coop/campaignSyncTransport', () => {
  const actual = jest.requireActual(
    '@/lib/campaign/coop/campaignSyncTransport',
  );
  return {
    ...actual,
    connectStoredCampaignSyncTransport: jest.fn(
      (options: IConnectStoredCampaignSyncOptions) =>
        actual.connectStoredCampaignSyncTransport({
          ...options,
          socketFactory: () => {
            const socket = mockSocket();
            Promise.resolve().then(() => socket.onopen?.({}));
            return socket;
          },
        }),
    ),
  };
});

jest.mock('@/lib/campaign/coop/coopRuntimeSession', () => {
  const actual = jest.requireActual('@/lib/campaign/coop/coopRuntimeSession');
  return {
    ...actual,
    openCoopRuntimeSession: jest.fn().mockResolvedValue(null),
    subscribeCoopPendingProposals: jest.fn(() => () => undefined),
  };
});

// useCampaignStore returns the module-scoped StoreApi; it is not a React
// hook, so the helpers below read it through a non-hook name.
const campaignStoreApi = useCampaignStore;

const connectSpy = connectStoredCampaignSyncTransport as unknown as jest.Mock<
  ICampaignSyncTransport | null,
  [IConnectStoredCampaignSyncOptions]
>;

const MATCH_ID = 'match-bind-3';
const CAMPAIGN_ID = 'campaign-bind-7';
const ROOM_CODE = 'ABC234';
const TS = '3025-01-01T00:00:00.000Z';

function campaignFor(role: 'host' | 'guest'): ICampaign {
  return {
    ...createCampaign('Bound Campaign', 'mercenary'),
    id: CAMPAIGN_ID,
    coopSession:
      role === 'host'
        ? createHostCoopSession(ROOM_CODE, MATCH_ID)
        : createGuestCoopSession(MATCH_ID, ROOM_CODE),
  };
}

function storeToken(playerId: string): void {
  storeCoopCampaignToken({
    matchId: MATCH_ID,
    playerId,
    wireToken: 'wire-token',
    displayName: playerId,
  });
}

function mount(role: 'host' | 'guest') {
  const campaign = campaignFor(role);
  campaignStoreApi().getState().switchCampaign(campaign);
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

/** A legacy (pre-receipt) campaign frame: no appliedView, numeric ACKs. */
function legacyFrame(
  sequence: number,
  type: 'CampaignSnapshotPublished' | 'CampaignDayAdvanced',
): IServerMessage {
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: TS,
    event: {
      sequence,
      campaignId: CAMPAIGN_ID,
      ts: TS,
      authorPlayerId: 'host-player',
      type,
      scope: 'campaign',
      payload:
        type === 'CampaignSnapshotPublished'
          ? {
              matchId: MATCH_ID,
              revision: 0,
              state: createEmptyCampaignState(CAMPAIGN_ID),
            }
          : { previousDay: 1, newDay: 2 },
    },
  } as IServerMessage;
}

describe('CampaignCoopRouteSurfaceConnected creator binding (P2CG1G2)', () => {
  beforeEach(() => {
    connectSpy.mockClear();
    mockSockets.length = 0;
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    _resetCampaignSyncTransportsForTest();
    useCampaignMirrorStore.getState().reset();
    resetCampaignStore();
    window.sessionStorage.clear();
  });

  it.each<['host' | 'guest', string]>([
    ['host', 'host-player'],
    ['guest', 'guest-player'],
  ])(
    'binds the %s creator to the mounted campaign, not the match',
    async (role, playerId) => {
      storeToken(playerId);
      mount(role);
      await settled();

      const calls = connectSpy.mock.calls.filter(([o]) => o.role === role);
      expect(calls.length).toBeGreaterThan(0);
      expect(CAMPAIGN_ID).not.toBe(MATCH_ID);
      calls.forEach(([options]) => {
        expect(options.expectedCampaignId).toBe(CAMPAIGN_ID);
      });
      expect(getActiveCampaignSyncTransport(MATCH_ID)?.campaignId).toBe(
        CAMPAIGN_ID,
      );
    },
  );

  it.each<'host' | 'guest'>(['host', 'guest'])(
    'never adopts a %s transport bound to another campaign on the same match (CF-H16)',
    async (role) => {
      const foreignSocket = mockSocket();
      const foreign = connectCampaignSyncTransport({
        expectedCampaignId: 'campaign-other',
        matchId: MATCH_ID,
        role,
        playerId: `${role}-player`,
        wireToken: 'wire-token',
        socketFactory: () => foreignSocket,
      });
      storeToken(`${role}-player`);
      mount(role);
      await settled();

      const results = connectSpy.mock.results.map((result) => result.value);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((value) => value === null)).toBe(true);
      expect(getActiveCampaignSyncTransport(MATCH_ID)).toBe(foreign);
      expect(foreignSocket.readyState).toBe(1);
    },
  );

  it('keeps one healthy socket across a remount against a legacy server (CF-H6)', async () => {
    jest.useFakeTimers();
    storeToken('host-player');
    const first = mount('host');
    await settled();
    expect(mockSockets).toHaveLength(1);
    const socket = mockSockets[0];
    // Precondition: the pin is about a BOUND transport (F's consumer active).
    expect(getActiveCampaignSyncTransport(MATCH_ID)?.campaignId).toBe(
      CAMPAIGN_ID,
    );

    await act(async () => {
      socket.inject(legacyFrame(-1, 'CampaignSnapshotPublished'));
      socket.inject(legacyFrame(1, 'CampaignDayAdvanced'));
    });
    await settled();
    first.unmount();
    mount('host');
    await settled();
    await act(async () => {
      jest.advanceTimersByTime(2 * APPLICATION_CONFIRMATION_TIMEOUT_MS);
    });
    await settled();

    expect(mockSockets).toHaveLength(1);
    expect(socket.readyState).toBe(1);
  });
});
