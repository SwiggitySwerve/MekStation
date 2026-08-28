/**
 * The restart pair has to outlive the process that last advanced it.
 *
 * Readiness is computed; these two fields are what a rebuilt session
 * must remember so that computation is validated against the same
 * revision and branch the live session was using.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  readCampaignSessionState,
  writeCampaignSessionActiveBranch,
  writeCampaignSessionReadinessRevision,
  writeCampaignSessionState,
} from '../CampaignSessionStateStore';

const CAMPAIGN = 'camp-1';
const SESSION = 'match-1';

describe('campaign session restart state', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    dbPath = path.join(dir, 'session.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('starts a fresh session at revision 0 with no active branch', () => {
    getSQLiteService()
      .getDatabase()
      .prepare(
        `INSERT INTO campaign_session (campaign_id, session_id)
         VALUES (?, ?)`,
      )
      .run(CAMPAIGN, SESSION);

    expect(readCampaignSessionState(CAMPAIGN, SESSION)).toEqual({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 0,
      activeBranch: null,
    });
  });

  it('persists a readiness revision without clobbering the branch', () => {
    writeCampaignSessionActiveBranch({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      activeBranch: 'rewind-alpha',
    });
    writeCampaignSessionReadinessRevision({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 4,
    });

    expect(readCampaignSessionState(CAMPAIGN, SESSION)).toEqual({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 4,
      activeBranch: 'rewind-alpha',
    });
  });

  it('persists an active branch without clobbering the revision', () => {
    writeCampaignSessionReadinessRevision({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 7,
    });
    writeCampaignSessionActiveBranch({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      activeBranch: 'rewind-beta',
    });

    expect(readCampaignSessionState(CAMPAIGN, SESSION)).toEqual({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 7,
      activeBranch: 'rewind-beta',
    });
  });

  it('survives a process restart', () => {
    writeCampaignSessionState({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 4,
      activeBranch: 'rewind-alpha',
    });

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();

    expect(readCampaignSessionState(CAMPAIGN, SESSION)).toEqual({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      readinessRevision: 4,
      activeBranch: 'rewind-alpha',
    });
  });
});
