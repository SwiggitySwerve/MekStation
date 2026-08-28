import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  _resetActiveCoopHosts,
  getActiveCoopHost,
} from '@/lib/campaign/coop/coopHostRegistry';
import {
  readCampaignSessionState,
  writeCampaignSessionState,
} from '@/services/campaignPersistence/CampaignSessionStateStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';

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
          unitRef: 'atlas-as7-d',
          unitSource: 'canonical' as const,
        },
      },
      forceUnits: { 'force-alpha': ['unit-1'] },
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
    expect(entry.revision).toBe(0);
    expect(entry.host.getState().rosterUnits['unit-1']?.unitSource).toBe(
      'canonical',
    );
    expect(entry.host.getState().forceUnits).toEqual({
      'force-alpha': ['unit-1'],
    });
    expect(entry.roomCode).toBe('ABC234');
    expect(entry.host.getState().balance).toBe(1_000_000);
    expect(registry.get('match-campaign')).toBe(entry);
    expect(getActiveCoopHost('campaign-registry')).toBe(entry.host);
    expect(registry.size()).toBe(1);
  });

  it('rejects a roster unit without a catalog reference before advertising', async () => {
    const registry = new CampaignHostRegistry();
    const snap = snapshot();
    await expect(
      registry.register('match-campaign', {
        ...snap,
        state: {
          ...snap.state,
          rosterUnits: {
            'unit-1': {
              unitId: 'unit-1',
              designation: 'Atlas AS7-D',
              status: 'operational',
              unitSource: 'canonical',
            },
          },
        },
      }),
    ).rejects.toThrow('unit reference missing');
    expect(registry.size()).toBe(0);
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

  it('boots a LAUNCHED campaign whose invite the store already cleared', async () => {
    // Launching sets `clearRoomCode`, so an active co-op campaign has
    // no invite in the store. Requiring one to rehydrate made the
    // campaign unreachable the moment it launched - the members inside
    // could not cold-recover after a restart.
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch({
      ...matchMeta(),
      status: 'active',
      roomCode: undefined,
    });
    const registry = new CampaignHostRegistry({ matchStore: store });

    const entry = await registry.getOrCreate('match-campaign');

    expect(entry).not.toBeNull();
    expect(entry?.campaignId).toBe('campaign-registry');
    expect(entry?.host.getState().balance).toBe(1_000_000);
    // And it does NOT mint a replacement invite: rehydration must not
    // re-open the door that launching closed.
    expect(entry?.roomCode).toBeNull();
    expect(entry?.syncSession.getRoomCode()).toBeNull();
  });

  it('rebuilds a campaign PAUSED, because no GM is connected to it', async () => {
    // What carries the GM-loss pause across a process restart. A
    // rebuilt session has no GM connection attached, so the GM is
    // absent, so the campaign is paused - stated directly rather than
    // stored in a flag that could disagree with reality.
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(matchMeta());
    const registry = new CampaignHostRegistry({ matchStore: store });

    const entry = await registry.getOrCreate('match-campaign');

    expect(entry?.syncSession.isPaused()).toBe(true);
  });

  it('creates a fresh campaign UNPAUSED', async () => {
    // The control, and the reason the two paths are distinguished at
    // all. The GM is the one creating this and their socket follows
    // immediately; starting it paused would refuse a guest who arrives
    // in between.
    const registry = new CampaignHostRegistry();

    const entry = await registry.register('match-campaign', snapshot());

    expect(entry.syncSession.isPaused()).toBe(false);
  });

  it('lets the returning GM clear a rebuild pause', async () => {
    // A pause nothing can lift is an outage, not a pause.
    const store = new InMemoryMatchStore({ quiet: true });
    await store.createMatch(matchMeta());
    const registry = new CampaignHostRegistry({ matchStore: store });
    const entry = await registry.getOrCreate('match-campaign');

    entry?.syncSession.noteGmConnected();

    expect(entry?.syncSession.isPaused()).toBe(false);
  });

  it('returns only the mission choices whose units still stand', async () => {
    // The READ PATH, not just the predicate next door. Both players
    // chose; one of them has a destroyed mech in the force they picked,
    // so only the other is still readiness.
    //
    // The destroyed unit is in the registered state rather than mutated
    // afterwards, because `CampaignMatchHost` exposes no state setter -
    // real destruction arrives through battle reconciliation. What this
    // pins is that the filter reads AUTHORITATIVE HOST STATE, which is
    // the part that could regress.
    const registry = new CampaignHostRegistry();
    const base = snapshot();
    const entry = await registry.register('match-campaign', {
      ...base,
      state: {
        ...base.state,
        rosterUnits: {
          'unit-host': {
            unitId: 'unit-host',
            designation: 'Host Mech',
            status: 'destroyed' as const,
          },
          'unit-guest': {
            unitId: 'unit-guest',
            designation: 'Guest Mech',
            status: 'operational' as const,
          },
        },
        forceUnits: {
          'force-host': ['unit-host'],
          'force-guest': ['unit-guest'],
        },
      },
    });

    const choice = (playerId: string, forceId: string, unitId: string) => ({
      matchId: 'match-campaign',
      missionId: 'mission-1',
      playerId,
      role: playerId === 'pid_host' ? ('host' as const) : ('guest' as const),
      choice: 'deploy' as const,
      force: {
        id: forceId,
        name: forceId,
        subForceIds: [],
        unitIds: [unitId],
        forceType: ForceRole.STANDARD,
        formationLevel: FormationLevel.LANCE,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    entry.publishParticipation(choice('pid_host', 'force-host', 'unit-host'));
    entry.publishParticipation(
      choice('pid_guest', 'force-guest', 'unit-guest'),
    );

    const remaining = entry.getParticipationRecords('mission-1');

    // ONLY the affected player drops out. Both were published.
    expect(remaining).toHaveLength(1);
    expect(remaining[0].playerId).toBe('pid_guest');
  });

  it('exposes a resettable process singleton', async () => {
    const registry = getCampaignHostRegistry();
    await registry.register('match-campaign', snapshot());

    _resetCampaignHostRegistry();

    expect(getCampaignHostRegistry().size()).toBe(0);
    expect(getActiveCoopHost('campaign-registry')).toBeUndefined();
  });

  describe('durable readiness revision and active branch', () => {
    let dir: string;
    let dbPath: string;

    beforeEach(async () => {
      dir = await mkdtemp(path.join(tmpdir(), 'campaign-host-session-'));
      dbPath = path.join(dir, 'session.db');
      resetSQLiteService();
      getSQLiteService({ path: dbPath }).initialize();
    });

    afterEach(async () => {
      resetSQLiteService();
      await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    });

    it('recovers readiness revision and active branch after a process restart', async () => {
      // Set through the store, not through advance/set: this row is the
      // recovery path. A write-path defect must not be able to hide a
      // recovery that still defaults.
      writeCampaignSessionState({
        campaignId: 'campaign-registry',
        sessionId: 'match-campaign',
        readinessRevision: 4,
        activeBranch: 'rewind-alpha',
      });
      const store = new InMemoryMatchStore({ quiet: true });
      await store.createMatch(matchMeta());
      const registry = new CampaignHostRegistry({ matchStore: store });

      const rebuilt = await registry.getOrCreate('match-campaign');

      expect(rebuilt?.revision).toBe(4);
      expect(rebuilt?.activeBranch).toBe('rewind-alpha');
    });

    it('persists an advanced readiness revision', async () => {
      const registry = new CampaignHostRegistry();
      const entry = await registry.register('match-campaign', snapshot());

      entry.advanceRevision(3);

      expect(
        readCampaignSessionState('campaign-registry', 'match-campaign'),
      ).toEqual(
        expect.objectContaining({
          readinessRevision: 3,
        }),
      );
    });

    it('persists a changed active branch', async () => {
      const registry = new CampaignHostRegistry();
      const entry = await registry.register('match-campaign', snapshot());

      entry.setActiveBranch('rewind-alpha');

      expect(
        readCampaignSessionState('campaign-registry', 'match-campaign'),
      ).toEqual(
        expect.objectContaining({
          activeBranch: 'rewind-alpha',
        }),
      );
    });

    it('starts a fresh session at revision 0 with the genesis branch', async () => {
      const registry = new CampaignHostRegistry();

      const entry = await registry.register('match-campaign', snapshot());

      expect(entry.revision).toBe(0);
      expect(entry.activeBranch).toBeNull();
      expect(
        readCampaignSessionState('campaign-registry', 'match-campaign'),
      ).toBeNull();
    });
  });
});
