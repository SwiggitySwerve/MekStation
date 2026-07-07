import {
  _resetActiveCoopHosts,
  getActiveCoopHost,
} from '@/lib/campaign/coop/coopHostRegistry';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { IMatchMeta } from '../IMatchStore';

import {
  _resetCampaignHostRegistry,
  CampaignHostRegistry,
  getCampaignHostRegistry,
} from '../CampaignHostRegistry';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

function snapshot() {
  return {
    campaignId: 'campaign-registry',
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    state: {
      ...createEmptyCampaignState('campaign-registry'),
      balance: 1_000_000,
      rosterUnits: {
        'unit-1': {
          unitId: 'unit-1',
          designation: 'Atlas AS7-D',
          status: 'operational' as const,
        },
      },
    },
  };
}

function matchMeta(): IMatchMeta {
  const now = '2026-07-06T00:00:00.000Z';
  const snap = snapshot();
  return {
    matchId: 'match-campaign',
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host'],
    sideAssignments: [{ playerId: 'pid_host', side: 'player' }],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1',
    roomCode: snap.roomCode,
    coopCampaign: {
      campaignId: snap.campaignId,
      state: snap.state,
      arbitrationMode: 'host-review',
    },
  };
}

describe('CampaignHostRegistry', () => {
  afterEach(() => {
    _resetCampaignHostRegistry();
    _resetActiveCoopHosts();
  });

  it('registers a server-resident campaign host by match id', async () => {
    const registry = new CampaignHostRegistry();

    const entry = await registry.register('match-campaign', snapshot());

    expect(entry.matchId).toBe('match-campaign');
    expect(entry.campaignId).toBe('campaign-registry');
    expect(entry.roomCode).toBe('ABC234');
    expect(entry.host.getState().balance).toBe(1_000_000);
    expect(registry.get('match-campaign')).toBe(entry);
    expect(getActiveCoopHost('campaign-registry')).toBe(entry.host);
    expect(registry.size()).toBe(1);
  });

  it('is idempotent for an already-open match registration', async () => {
    const registry = new CampaignHostRegistry();

    const first = await registry.register('match-campaign', snapshot());
    const second = await registry.register('match-campaign', {
      ...snapshot(),
      state: { ...snapshot().state, balance: 25 },
    });

    expect(second).toBe(first);
    expect(second.host.getState().balance).toBe(1_000_000);
    expect(registry.size()).toBe(1);
  });

  it('disposes the hosted campaign and removes the entry', async () => {
    const registry = new CampaignHostRegistry();
    const entry = await registry.register('match-campaign', snapshot());

    registry.dispose('match-campaign');

    expect(entry.host.isClosed()).toBe(true);
    expect(registry.get('match-campaign')).toBeNull();
    expect(getActiveCoopHost('campaign-registry')).toBeUndefined();
    expect(registry.size()).toBe(0);
  });

  it('lazily boots a server-resident campaign host from match metadata', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(matchMeta());
    const registry = new CampaignHostRegistry({ matchStore: store });

    const entry = await registry.getOrCreate('match-campaign');

    expect(entry).not.toBeNull();
    expect(entry?.campaignId).toBe('campaign-registry');
    expect(entry?.roomCode).toBe('ABC234');
    expect(entry?.host.getState().balance).toBe(1_000_000);
    expect(getActiveCoopHost('campaign-registry')).toBe(entry?.host);
  });

  it('exposes a resettable process singleton', async () => {
    const registry = getCampaignHostRegistry();
    await registry.register('match-campaign', snapshot());

    _resetCampaignHostRegistry();

    expect(getCampaignHostRegistry().size()).toBe(0);
    expect(getActiveCoopHost('campaign-registry')).toBeUndefined();
  });
});
