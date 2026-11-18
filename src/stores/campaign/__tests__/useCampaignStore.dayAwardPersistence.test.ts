/**
 * T6: the auto-award grants of a day reach the server only once the day
 * stands.
 *
 * The awards processor writes the pilot vault inside the day pipeline. Its
 * REST PUT (`updatePilot`, then `reloadPilotsAfterMutation`) used to go out
 * from inside the pipeline as well, so a day that then failed - a later
 * processor threw, or the save was refused - was rolled back in memory while
 * the server kept the award, and the PUT's own reload brought it back into
 * the vault for a day that never happened.
 *
 * The processor here is the real one; only the pilot and campaign REST
 * endpoints are stubbed, with a server-side pilot record to read back.
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot';

import {
  DayPhase,
  getDayPipeline,
  _resetDayPipeline,
  type IDayProcessor,
} from '@/lib/campaign/dayPipeline';
import {
  autoAwardsProcessor,
  registerBuiltinProcessors,
  _resetBuiltinRegistration,
} from '@/lib/campaign/processors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createDefaultAutoAwardConfig } from '@/types/campaign/awards/autoAwardTypes';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toast } = require('@/components/shared/Toast') as {
  toast: jest.Mock;
};

const PILOT_ID = 'pilot-001';
const FIRST_OF_MONTH = new Date('3025-06-01T00:00:00Z');

const rosterEntry = (): ICampaignRosterEntry => ({
  pilotId: PILOT_ID,
  pilotName: 'Ace',
  status: CampaignPilotStatus.Active,
  wounds: 0,
  recoveryTime: 0,
  xp: 0,
  campaignXpEarned: 0,
  campaignKills: 10,
  campaignMissions: 0,
  hireDate: new Date('3020-01-01T00:00:00Z'),
  primaryRole: CampaignPersonnelRole.PILOT,
  rankIndex: 0,
});

const vaultPilot = (): IPilot => ({
  id: PILOT_ID,
  name: 'Ace',
  type: PilotType.Persistent,
  status: PilotStatus.Active,
  skills: { gunnery: 4, piloting: 5 },
  wounds: 0,
  abilities: [],
  awards: [],
  createdAt: '3020-01-01T00:00:00Z',
  updatedAt: '3025-05-01T00:00:00Z',
});

interface IPilotServer {
  /** The server-side pilot rows. */
  readonly pilots: Map<string, IPilot>;
  /** Every request, in order, as `METHOD url`. */
  readonly requests: string[];
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

/** Stub the pilot REST API (and accept campaign saves). */
function stubApi(): IPilotServer {
  const server: IPilotServer = {
    pilots: new Map([[PILOT_ID, vaultPilot()]]),
    requests: [],
  };
  let campaignVersion = 0;
  global.fetch = jest.fn(
    async (url: unknown, init?: { method?: string; body?: string }) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      const path = String(url);
      server.requests.push(`${method} ${path}`);
      if (path === '/api/pilots' && method === 'GET') {
        const pilots = [...server.pilots.values()];
        return jsonResponse(200, { pilots, count: pilots.length });
      }
      const pilotMatch = /^\/api\/pilots\/([^/]+)$/.exec(path);
      if (pilotMatch && method === 'PUT') {
        const current = server.pilots.get(pilotMatch[1]);
        if (!current) return jsonResponse(404, { success: false });
        const updates = JSON.parse(init?.body ?? '{}') as Partial<IPilot>;
        server.pilots.set(pilotMatch[1], { ...current, ...updates });
        return jsonResponse(200, { success: true });
      }
      if (path.startsWith('/api/campaigns/') && method === 'PUT') {
        const body = JSON.parse(init?.body ?? '{}') as {
          envelope: Record<string, unknown>;
        };
        campaignVersion += 1;
        return jsonResponse(200, {
          ...body.envelope,
          version: campaignVersion,
        });
      }
      return jsonResponse(404, {});
    },
  ) as unknown as typeof fetch;
  return server;
}

/** Let every fire-and-forget PUT and its reload settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

const throwing: IDayProcessor = {
  id: 't6-after-awards',
  phase: DayPhase.EVENTS,
  displayName: 'T6 after awards',
  process() {
    throw new Error('later processor exploded');
  },
};

function resetWorld(): void {
  jest.restoreAllMocks();
  resetCampaignStore();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.setState({ campaignId: null, units: [], pilots: [] });
  usePilotStore.setState({ pilots: [], error: null });
  clientSafeStorage.removeItem('campaign-store');
  toast.mockClear();
}

/**
 * A single-player campaign on the first of a month, whose one pilot
 * qualifies for a monthly kill award, with only the real awards processor
 * (and `extra`) registered.
 */
function buildWorld(extra: readonly IDayProcessor[] = []) {
  const server = stubApi();
  const store = getCampaignStore();
  store.getState().createCampaign('T6 Awards Co.', 'mercenary');
  const campaign = store.getState().campaign!;
  store.setState({
    campaign: {
      ...campaign,
      currentDate: FIRST_OF_MONTH,
      options: {
        ...campaign.options,
        autoAwardConfig: createDefaultAutoAwardConfig(),
      },
    },
  });
  useCampaignRosterStore.getState().initRoster(campaign.id);
  useCampaignRosterStore.getState().addPilot(rosterEntry());
  usePilotStore.setState({ pilots: [vaultPilot()] });
  registerBuiltinProcessors();
  const pipeline = getDayPipeline();
  pipeline.getProcessors().forEach((p) => pipeline.unregister(p.id));
  [autoAwardsProcessor, ...extra].forEach(pipeline.register);
  server.requests.length = 0;
  toast.mockClear();
  return { store, server };
}

const awardIds = (pilot: IPilot | undefined): string[] =>
  (pilot?.awards ?? []).map((a) => a.awardId);

describe('T6 auto-award persistence follows the day', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('a day that fails after the awards processor sends no award PUT, and the award does not come back', async () => {
    const { store, server } = buildWorld([throwing]);

    const report = store.getState().advanceDay();
    await settle();

    expect(report).toBeNull();
    expect(
      server.requests.filter((r) => r.startsWith('PUT /api/pilots/')),
    ).toEqual([]);
    expect(awardIds(server.pilots.get(PILOT_ID))).toEqual([]);
    expect(awardIds(usePilotStore.getState().pilots[0])).toEqual([]);
    expect(store.getState().campaign!.currentDate.toISOString()).toBe(
      FIRST_OF_MONTH.toISOString(),
    );
  });

  it('a day that stands sends the award PUT after its save, and the award survives the reload', async () => {
    const { store, server } = buildWorld();
    const original = store.getState().saveCampaign;
    let putsBeforeSave = -1;
    const save = jest.fn(() => {
      putsBeforeSave = server.requests.filter((r) =>
        r.startsWith('PUT /api/pilots/'),
      ).length;
      return original();
    });
    store.setState({ saveCampaign: save });

    const report = store.getState().advanceDay();
    await settle();

    expect(report).not.toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
    expect(putsBeforeSave).toBe(0);
    expect(
      server.requests.filter((r) => r.startsWith('PUT /api/pilots/')),
    ).toEqual([`PUT /api/pilots/${PILOT_ID}`]);
    expect(awardIds(server.pilots.get(PILOT_ID))).toContain('first-blood');
    expect(awardIds(usePilotStore.getState().pilots[0])).toContain(
      'first-blood',
    );
  });
});
