/**
 * HostMigration — campaign GM must not be promoted away from hostPlayerId.
 *
 * Predicted red before the product edit: GM-seat refusal and same-GM
 * projection. Control rows (non-GM host, co-op with no GM row) stay
 * green because they take the existing D4 successor path.
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { buildNetworkedTacticalAuthorityProjection } from '@/lib/command-screen/commandAuthorityProjection';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import type { IMatchMeta } from '../../IMatchStore';

import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { bindCampaignGmHostProbe } from '../campaignGmHostProbe';
import {
  migrateHostIfNeeded,
  type IHostMigrationContext,
} from '../HostMigration';

const MATCH_ID = 'match-gm-host';
const CAMPAIGN_ID = 'camp-gm-host';
const HOST_ID = 'pid_host';
const OPP_ID = 'pid_opp';

/** Occupied 1v1 seats so pickSuccessor has a surviving human. */
function occupiedSeats() {
  return defaultSeats('1v1').map((seat) => {
    if (seat.slotId === 'alpha-1') {
      return {
        ...seat,
        occupant: { playerId: HOST_ID, displayName: 'Host' },
        ready: true,
      };
    }
    if (seat.slotId === 'bravo-1') {
      return {
        ...seat,
        occupant: { playerId: OPP_ID, displayName: 'Opp' },
        ready: true,
      };
    }
    return seat;
  });
}

/** Active 1v1 meta. WHY: D4 only migrates in-flight matches. */
function baseMeta(coop: boolean): IMatchMeta {
  const now = '2026-09-03T00:00:00.000Z';
  return {
    matchId: MATCH_ID,
    hostPlayerId: HOST_ID,
    playerIds: [HOST_ID, OPP_ID],
    sideAssignments: [
      { playerId: HOST_ID, side: 'player' },
      { playerId: OPP_ID, side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: occupiedSeats(),
    ...(coop
      ? {
          coopCampaign: {
            campaignId: CAMPAIGN_ID,
            state: createEmptyCampaignState(CAMPAIGN_ID),
          },
        }
      : {}),
  };
}

/**
 * Build a migration context over an in-memory store.
 * WHY: unit tests pin persist + broadcast without standing up a host.
 */
async function makeCtx(options: {
  readonly coop: boolean;
  readonly bindGm: boolean;
}): Promise<{
  store: InMemoryMatchStore;
  ctx: IHostMigrationContext;
  broadcasts: IServerMessage[];
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  await store.createMatch(baseMeta(options.coop));
  if (options.bindGm) {
    store.bindCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: MATCH_ID,
      participantId: HOST_ID,
      seat: 'gm',
      boundAt: '2026-09-03T00:00:00.000Z',
    });
  }
  const broadcasts: IServerMessage[] = [];
  const ctx: IHostMigrationContext = {
    matchId: MATCH_ID,
    store,
    connectedSince: () => new Map([[OPP_ID, 1_000]]),
    broadcast: (message) => {
      broadcasts.push(message);
    },
    campaignGmHost: bindCampaignGmHostProbe(store),
  };
  return { store, ctx, broadcasts };
}

describe('HostMigration campaign GM refusal', () => {
  it('leaves hostPlayerId unchanged and broadcasts no HostMigrated when the dropped host is the campaign GM', async () => {
    const { store, ctx, broadcasts } = await makeCtx({
      coop: true,
      bindGm: true,
    });

    const result = await migrateHostIfNeeded(ctx, HOST_ID);
    const meta = await store.getMatchMeta(MATCH_ID);

    expect(result).toEqual({ migrated: false, reason: 'campaign-gm' });
    expect(meta.hostPlayerId).toBe(HOST_ID);
    expect(broadcasts.some((message) => message.kind === 'HostMigrated')).toBe(
      false,
    );
  });

  it('still supplies host-gm projection input when the same GM would reconnect', async () => {
    const { store, ctx } = await makeCtx({
      coop: true,
      bindGm: true,
    });

    await migrateHostIfNeeded(ctx, HOST_ID);
    const meta = await store.getMatchMeta(MATCH_ID);
    const projection = buildNetworkedTacticalAuthorityProjection({
      playerId: HOST_ID,
      hostPlayerId: meta.hostPlayerId,
      canAct: true,
    });

    expect(meta.hostPlayerId).toBe(HOST_ID);
    expect(projection.viewerRole).toBe('host-gm');
    expect(projection.authority).toBe('host-gm');
    expect(projection.enabledControls).toContain('approve');
    expect(projection.enabledControls).toContain('gm-correction');
  });

  it('still migrates a dropped host who is not a GM', async () => {
    const { store, ctx, broadcasts } = await makeCtx({
      coop: false,
      bindGm: false,
    });

    const result = await migrateHostIfNeeded(ctx, HOST_ID);
    const meta = await store.getMatchMeta(MATCH_ID);

    expect(result).toEqual({
      migrated: true,
      newHostPlayerId: OPP_ID,
      previousHostPlayerId: HOST_ID,
    });
    expect(meta.hostPlayerId).toBe(OPP_ID);
    expect(broadcasts.some((message) => message.kind === 'HostMigrated')).toBe(
      true,
    );
  });

  it('still migrates a co-op match with no GM row recorded', async () => {
    const { store, ctx, broadcasts } = await makeCtx({
      coop: true,
      bindGm: false,
    });

    const result = await migrateHostIfNeeded(ctx, HOST_ID);
    const meta = await store.getMatchMeta(MATCH_ID);

    expect(result.migrated).toBe(true);
    expect(meta.hostPlayerId).toBe(OPP_ID);
    expect(broadcasts.some((message) => message.kind === 'HostMigrated')).toBe(
      true,
    );
  });
});
