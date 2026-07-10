import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { ToastProvider } from '@/components/shared/Toast';
import {
  _resetCoopRuntimeSessions,
  getCoopRuntimeSessionByMatch,
  openCoopRuntimeSession,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { useCampaignMirrorStore } from '@/lib/p2p/campaignMirrorStore';
import { uninstallCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import {
  createGuestCoopSession,
  createHostCoopSession,
} from '@/types/campaign/CoopSession';

import CampaignDashboardPage from '../CampaignDashboardPage';

const ROOM_CODE = 'COOP12';
const MATCH_ID = 'match-dashboard-conflict';

const mockRouterPush = jest.fn();
let routeCampaignId = 'campaign-dashboard-conflict';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
    pathname: '/gameplay/campaigns/[id]',
    query: { id: routeCampaignId },
    asPath: `/gameplay/campaigns/${routeCampaignId}`,
    events: { on: jest.fn(), off: jest.fn() },
  }),
}));

interface ServerHarness {
  readonly putBodies: Array<{
    readonly envelope: SerializedCampaign;
    readonly baseVersion: number;
  }>;
  readonly fetchMock: jest.SpyInstance;
  forceConflictPuts: () => void;
  bumpExternalVersion: () => void;
  getRecord: () => SerializedCampaign;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function installCampaignServer(
  campaign: ICampaign,
  version = 0,
): ServerHarness {
  let serverRecord = buildSerializedCampaign(campaign, 'server', version);
  let forceConflict = false;
  const putBodies: ServerHarness['putBodies'] = [];
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockImplementation(async (_input, init) => {
      const requestInit = init as RequestInit | undefined;
      if ((requestInit?.method ?? 'GET') !== 'PUT') {
        return jsonResponse(200, serverRecord);
      }
      if (!requestInit?.body) {
        throw new Error('PUT request did not include a body');
      }
      const body = JSON.parse(String(requestInit.body)) as {
        readonly envelope: SerializedCampaign;
        readonly baseVersion: number;
      };
      putBodies.push(body);
      if (forceConflict || body.baseVersion !== serverRecord.version) {
        return jsonResponse(409, serverRecord);
      }
      serverRecord = {
        ...body.envelope,
        version: serverRecord.version + 1,
      };
      return jsonResponse(200, serverRecord);
    });
  return {
    putBodies,
    fetchMock,
    forceConflictPuts: () => {
      forceConflict = true;
    },
    bumpExternalVersion: () => {
      serverRecord = { ...serverRecord, version: serverRecord.version + 1 };
    },
    getRecord: () => serverRecord,
  };
}

function seedHostCampaign(): ICampaign {
  const store = useCampaignStore();
  store
    .getState()
    .createCampaign('Co-op Dashboard Conflict', 'mercenary', undefined, {
      coopSession: createHostCoopSession(ROOM_CODE, MATCH_ID),
    });
  const campaign = store.getState().campaign;
  if (!campaign) {
    throw new Error('campaign was not created');
  }
  const seeded = {
    ...campaign,
    currentDate: new Date('3025-07-09T00:00:00.000Z'),
    campaignStartDate: new Date('3025-07-01T00:00:00.000Z'),
  };
  store.setState({ campaign: seeded });
  routeCampaignId = seeded.id;
  return seeded;
}

async function connectGuestToRuntime(): Promise<readonly ICampaignEvent[]> {
  const campaign = useCampaignStore().getState().campaign;
  if (!campaign) {
    throw new Error('campaign missing before guest connection');
  }
  const runtime = await openCoopRuntimeSession(campaign);
  expect(runtime).not.toBeNull();
  if (!runtime) return [];

  const delivered: ICampaignEvent[] = [];
  const join = await runtime.syncSession.joinGuest(ROOM_CODE, (event) => {
    delivered.push(event);
  });
  expect(join.ok).toBe(true);
  return delivered;
}

describe('CampaignDashboardPage co-op persistence regression', () => {
  beforeEach(() => {
    uninstallCampaignPersistenceWiring();
    resetCampaignStore();
    _resetCoopRuntimeSessions();
    useCampaignMirrorStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    window.localStorage.clear();
    mockRouterPush.mockReset();
    routeCampaignId = 'campaign-dashboard-conflict';
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    uninstallCampaignPersistenceWiring();
    resetCampaignStore();
    _resetCoopRuntimeSessions();
    useCampaignMirrorStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    window.localStorage.clear();
  });

  it('keeps the host dashboard mounted when route-loaded co-op day advance conflicts and rolls back', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation((...args: readonly unknown[]) => {
        const message = args.map(String).join(' ');
        if (message.includes("reading 'finances'")) {
          throw new Error(message);
        }
      });
    const initialCampaign = seedHostCampaign();
    const server = installCampaignServer(initialCampaign, 1);
    uninstallCampaignPersistenceWiring();
    resetCampaignStore();
    useCampaignPersistenceStore.getState().reset();
    window.localStorage.clear();

    render(
      <ToastProvider>
        <CampaignDashboardPage />
      </ToastProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Co-op Dashboard Conflict',
      }),
    ).toBeInTheDocument();
    expect(useCampaignPersistenceStore.getState().baseVersion).toBe(1);

    await waitFor(() => {
      expect(getCoopRuntimeSessionByMatch(MATCH_ID)).not.toBeNull();
    });
    const delivered = await connectGuestToRuntime();
    server.bumpExternalVersion();
    server.forceConflictPuts();

    await userEvent.click(screen.getByTestId('advance-day-btn'));

    await waitFor(() => {
      expect(useCampaignPersistenceStore.getState().saveState).toBe('conflict');
    });

    expect(screen.getByTestId('page-title')).toHaveTextContent(
      'Co-op Dashboard Conflict',
    );
    expect(screen.queryByText(/Day Report/i)).not.toBeInTheDocument();
    expect(useCampaignStore().getState().campaign).toBeDefined();
    expect(
      useCampaignStore().getState().campaign?.currentDate.toISOString(),
    ).toBe('3025-07-09T00:00:00.000Z');
    expect(
      useCampaignPersistenceStore
        .getState()
        .lastPersistedCampaign?.currentDate.toISOString(),
    ).toBe('3025-07-09T00:00:00.000Z');
    expect(server.getRecord().body.currentDate).toBe(
      '3025-07-09T00:00:00.000Z',
    );
    expect(server.putBodies.map((body) => body.baseVersion)).toEqual([1, 2]);
    expect(
      delivered.some((event) => event.type === 'CampaignDayAdvanced'),
    ).toBe(false);
    expect(
      consoleError.mock.calls.some((call) =>
        call.map(String).join(' ').includes("reading 'finances'"),
      ),
    ).toBe(false);
  });

  it('refetches a same-id guest campaign on reload and preserves guest authority', async () => {
    const initial = seedHostCampaign();
    const freshServerCampaign = {
      ...initial,
      currentDate: new Date('3025-07-10T00:00:00.000Z'),
    };
    const staleGuestCampaign = {
      ...initial,
      currentDate: new Date('3025-07-09T00:00:00.000Z'),
      coopSession: createGuestCoopSession(MATCH_ID, ROOM_CODE),
    };
    useCampaignStore().setState({ campaign: staleGuestCampaign });
    const server = installCampaignServer(freshServerCampaign, 3);

    render(
      <ToastProvider>
        <CampaignDashboardPage />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(server.fetchMock).toHaveBeenCalledWith(
        `/api/campaigns/${encodeURIComponent(initial.id)}`,
        { cache: 'no-store' },
      );
    });
    await waitFor(() => {
      expect(
        useCampaignStore().getState().campaign?.currentDate.toISOString(),
      ).toBe('3025-07-10T00:00:00.000Z');
    });
    expect(useCampaignStore().getState().campaign?.coopSession).toMatchObject({
      mode: 'guest',
      hostMatchId: MATCH_ID,
      roomCode: ROOM_CODE,
    });
    expect(screen.getByTestId('day-advance-current-date')).toHaveTextContent(
      '3025-07-10',
    );
  });
});
