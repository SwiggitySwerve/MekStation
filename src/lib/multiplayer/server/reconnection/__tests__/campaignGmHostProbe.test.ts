/**
 * The durable campaign-GM probe (umbrella 9.3 defect fix).
 *
 * The migration suite proves a refusal STOPS promotion, but it drives a
 * fake probe. These rows drive the REAL probe against a real store,
 * because the two properties that make it safe live here and nowhere
 * else: it answers true only for the `gm` seat, and it answers false
 * rather than throwing when the participant capability is absent.
 * Without them a probe that accepted any seat, or one that skipped its
 * readiness guard, passes every other suite in the repo.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import { DurableMatchStore } from '../../DurableMatchStore';
import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { bindCampaignGmHostProbe } from '../campaignGmHostProbe';

const CAMPAIGN_ID = 'campaign-gm-probe';
const MATCH_ID = 'match-gm-probe';
const GM_ID = 'pid_gm';
const PLAYER_ID = 'pid_player';
const NOW = '2026-09-03T00:00:00.000Z';

describe('bindCampaignGmHostProbe', () => {
  let dir: string;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'gm-probe-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'probe.db') }).initialize();
    store = new DurableMatchStore({ path: ':memory:' });
  });

  afterEach(async () => {
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function seat(participantId: string, kind: 'gm' | 'player'): void {
    bindCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: MATCH_ID,
      participantId,
      seat: kind,
      boundAt: NOW,
    });
  }

  // The port's contract admits a promise, so the suite awaits it even
  // though the durable implementation answers synchronously.
  async function ask(playerId: string): Promise<boolean> {
    return await bindCampaignGmHostProbe(store).isCampaignGmHost({
      matchId: MATCH_ID,
      campaignId: CAMPAIGN_ID,
      playerId,
    });
  }

  it('answers true for the participant holding the gm seat', async () => {
    seat(GM_ID, 'gm');
    await expect(ask(GM_ID)).resolves.toBe(true);
  });

  it('answers false for a participant holding a player seat', async () => {
    // The whole point of reading the seat rather than the host id: a
    // tactical player must never freeze host migration.
    seat(PLAYER_ID, 'player');
    await expect(ask(PLAYER_ID)).resolves.toBe(false);
  });

  it('answers false for a participant with no row at all', async () => {
    seat(GM_ID, 'gm');
    await expect(ask('pid_stranger')).resolves.toBe(false);
  });

  it('answers false for a store lacking the participant capability', async () => {
    // An in-memory store has no participant port. Migration must keep
    // its pre-change behaviour there rather than fail closed or throw.
    const probe = bindCampaignGmHostProbe(
      new InMemoryMatchStore({ quiet: true }),
    );
    await expect(
      probe.isCampaignGmHost({
        matchId: MATCH_ID,
        campaignId: CAMPAIGN_ID,
        playerId: GM_ID,
      }),
    ).resolves.toBe(false);
  });

  it('answers false when the capability database is not initialized', async () => {
    seat(GM_ID, 'gm');
    resetSQLiteService();
    await expect(ask(GM_ID)).resolves.toBe(false);
  });
});
