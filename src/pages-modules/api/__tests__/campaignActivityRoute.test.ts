/**
 * The activity feed a viewer is allowed to read (umbrella task 8.3).
 *
 * Real SQLite, because the point of the route is that the feed comes
 * back from durable facts; a mocked read would prove only that the
 * handler forwards arguments.
 *
 * The rows that matter are the refusals: a request that cannot name a
 * participant, and a participant this session never bound, must not be
 * answered with the shared campaign-scoped feed.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import handler from '@/pages-modules/api/campaignActivityRoute';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CAMPAIGN_ID = 'campaign-activity-route';
const SESSION_ID = 'match-activity-route';

interface IResult {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
}

/** Minimal Next req/res pair capturing what the handler wrote. */
function mockReqRes(
  query: Record<string, unknown>,
  method = 'GET',
): { req: NextApiRequest; res: NextApiResponse; result: IResult } {
  const result: IResult = { statusCode: 0, body: undefined, headers: {} };
  const req = { method, headers: {}, query } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    setHeader(name: string, value: unknown) {
      result.headers[name] = value;
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

describe('GET /api/campaigns/:id/activity', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-activity-route-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'activity.db') }).initialize();
    bindCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: 'gm-1',
      seat: 'gm',
      boundAt: '3025-03-01T00:00:00.000Z',
    });
    const store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(
        getSQLiteService().getDatabase(),
        () => new Date().toISOString(),
      ),
    );
    await store.appendEvent(CAMPAIGN_ID, {
      sequence: 0,
      campaignId: CAMPAIGN_ID,
      ts: '3025-03-02T00:00:00.000Z',
      authorPlayerId: 'gm-1',
      scope: 'campaign',
      type: 'PilotHired',
      payload: { pilot: { pilotId: 'p-1', name: 'Rook' }, cost: 5_000 },
    } as ICampaignEvent);
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true });
  });

  it('returns the resolved seat and the viewer feed', async () => {
    const { req, res, result } = mockReqRes({
      id: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: 'gm-1',
    });

    await handler(req, res);

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ kind: 'activity', viewerSeat: 'gm' });
    const body = result.body as { entries: readonly { message: string }[] };
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].message).toContain('Rook');
  });

  it('refuses a participant this session never bound', async () => {
    const { req, res, result } = mockReqRes({
      id: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: 'stranger',
    });

    await handler(req, res);

    expect(result.statusCode).toBe(403);
    expect(result.body).toMatchObject({ error: expect.any(String) });
  });

  it('will not answer a request that names no participant', async () => {
    const { req, res, result } = mockReqRes({
      id: CAMPAIGN_ID,
      sessionId: SESSION_ID,
    });

    await handler(req, res);

    expect(result.statusCode).toBe(400);
  });

  it('rejects a write verb on a read-only surface', async () => {
    const { req, res, result } = mockReqRes(
      { id: CAMPAIGN_ID, sessionId: SESSION_ID, participantId: 'gm-1' },
      'POST',
    );

    await handler(req, res);

    expect(result.statusCode).toBe(405);
    expect(result.headers.Allow).toEqual(['GET']);
  });
});
