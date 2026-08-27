/**
 * Force ownership has to outlive the process that learned it.
 *
 * The in-session rule — first claim on a mission owns the force — lived
 * only in the registry's in-memory participation records, so a restart
 * handed every force back to whoever asked first next.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  claimCampaignSessionForce,
  readCampaignSessionForceHolder,
} from '../CampaignSessionForceClaimStore';

const BASE = {
  campaignId: 'camp-1',
  sessionId: 'match-1',
  missionId: 'mission-1',
  forceId: 'force-a',
};

describe('campaign session force claims', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'force-claim-'));
    dbPath = path.join(dir, 'claims.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  const claim = (participantId: string) =>
    claimCampaignSessionForce({
      ...BASE,
      participantId,
      claimedAt: '2026-08-26T00:00:00.000Z',
    });

  it('gives the force to the first claimant', () => {
    expect(claim('pid_p1')).toEqual({ kind: 'claimed' });
    expect(readCampaignSessionForceHolder(BASE)).toBe('pid_p1');
  });

  it('refuses a second participant and names who holds it', () => {
    claim('pid_p1');

    expect(claim('pid_p2')).toEqual({
      kind: 'held-by-other',
      participantId: 'pid_p1',
    });
    // The refusal must not quietly reassign the force.
    expect(readCampaignSessionForceHolder(BASE)).toBe('pid_p1');
  });

  it('lets the holder re-send their own claim', () => {
    // Control: ownership must not make a participant a stranger to their
    // own force, or an idempotent resend becomes a refusal.
    claim('pid_p1');

    expect(claim('pid_p1')).toEqual({ kind: 'already-held' });
  });

  it('does not confuse two forces or two missions', () => {
    // Control: the rule is per force per mission, so a guard keyed too
    // broadly would refuse a player their SECOND force, or refuse the
    // same force on a later mission.
    claim('pid_p1');

    expect(
      claimCampaignSessionForce({
        ...BASE,
        forceId: 'force-b',
        participantId: 'pid_p2',
        claimedAt: '2026-08-26T00:00:00.000Z',
      }),
    ).toEqual({ kind: 'claimed' });
    expect(
      claimCampaignSessionForce({
        ...BASE,
        missionId: 'mission-2',
        participantId: 'pid_p2',
        claimedAt: '2026-08-26T00:00:00.000Z',
      }),
    ).toEqual({ kind: 'claimed' });
  });

  it('survives a process restart', () => {
    // The scenario this table exists for. Without it the claim is gone
    // and the force is free for the taking.
    claim('pid_p1');

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();

    expect(readCampaignSessionForceHolder(BASE)).toBe('pid_p1');
    expect(claim('pid_p2')).toEqual({
      kind: 'held-by-other',
      participantId: 'pid_p1',
    });
  });
});
