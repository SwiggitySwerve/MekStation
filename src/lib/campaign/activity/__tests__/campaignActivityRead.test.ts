/**
 * Durable, role-resolved campaign activity read (umbrella task 8.3).
 *
 * Real SQLite through the shipped service on a temp file, and the store
 * instance is DISCARDED and reopened between write and read, because the
 * claim under test is the spec's "GM activity survives restart": the
 * feed recovers from durable facts, not from a process that happened to
 * stay up. A mocked event store would prove none of it.
 *
 * Pins:
 *  - a GM reading after a cold reopen gets the whole feed back;
 *  - the seat is READ from the durable participant row, never asserted
 *    by the caller - a player claiming to be the GM still reads as a
 *    player;
 *  - a participant with no active membership, and one whose membership
 *    was revoked, are refused rather than quietly served campaign-scoped
 *    rows.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { readCampaignJournalEvents } from '@/lib/campaign/sync/campaignJournalReads';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { leakScan } from '@/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers';
import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
  revokeCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type { ICampaignActivityReadPorts } from '../campaignActivityRead';

import { readCampaignActivityForViewer } from '../campaignActivityRead';

const CAMPAIGN_ID = 'campaign-activity-durable';
const SESSION_ID = 'match-activity';
const GM_ID = 'gm-1';
const PLAYER_ID = 'player-1';

/** One committed fact, in the shape the journal stores. */
function event(
  sequence: number,
  type: ICampaignEvent['type'],
  payload: unknown,
  scope: ICampaignEvent['scope'] = 'campaign',
): ICampaignEvent {
  return {
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: `3025-02-0${sequence + 1}T00:00:00.000Z`,
    authorPlayerId: GM_ID,
    scope,
    type,
    payload,
  } as ICampaignEvent;
}

/** The production wiring, rebuilt per call so it reads the CURRENT db. */
function ports(): ICampaignActivityReadPorts {
  return {
    readMembership: activeCampaignSessionMembership,
    readEvents: (campaignId) =>
      readCampaignJournalEvents(
        new SQLiteEventJournal<ICampaignJournalEnvelope>(
          getSQLiteService().getDatabase(),
          () => new Date().toISOString(),
        ),
        campaignId,
      ),
  };
}

describe('readCampaignActivityForViewer', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-activity-'));
    dbPath = path.join(dir, 'activity.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();

    for (const seat of [
      { participantId: GM_ID, seat: 'gm' as const },
      { participantId: PLAYER_ID, seat: 'player' as const },
    ]) {
      bindCampaignSessionParticipant({
        campaignId: CAMPAIGN_ID,
        sessionId: SESSION_ID,
        participantId: seat.participantId,
        seat: seat.seat,
        boundAt: '3025-02-01T00:00:00.000Z',
      });
    }

    const store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(
        getSQLiteService().getDatabase(),
        () => new Date().toISOString(),
      ),
    );
    await store.appendEvent(
      CAMPAIGN_ID,
      event(0, 'CampaignDayAdvanced', { newDay: 2 }),
    );
    await store.appendEvent(
      CAMPAIGN_ID,
      event(1, 'FundsChanged', {
        delta: -1_000,
        reason: 'Ammunition',
        balance: 9_000,
      }),
    );
    await store.appendEvent(
      CAMPAIGN_ID,
      event(
        2,
        'FundsChanged',
        { delta: -500, reason: 'Informant', balance: 8_500 },
        'gm',
      ),
    );
    await store.appendEvent(
      CAMPAIGN_ID,
      event(3, 'ParticipantRemoved', {
        participantId: 'player-2',
        reason: 'Left the session mid-mission',
      }),
    );
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true });
  });

  /** Drop the write-side handles a restarted process would not inherit. */
  function restart(): void {
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
  }

  it('recovers the whole GM feed from durable facts after a restart', async () => {
    restart();

    const result = await readCampaignActivityForViewer(ports(), {
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: GM_ID,
    });

    expect(result.kind).toBe('activity');
    if (result.kind !== 'activity') return;
    expect(result.viewerSeat).toBe('gm');
    expect(result.entries.map((entry) => entry.message)).toEqual([
      expect.stringContaining('Ammunition'),
      expect.stringContaining('Informant'),
      expect.stringContaining('Left the session mid-mission'),
    ]);
    expect(result.entries.every((entry) => entry.campaignDay === 2)).toBe(true);
  });

  it('resolves the seat from the durable row, so a player reads as a player', async () => {
    restart();

    const result = await readCampaignActivityForViewer(ports(), {
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: PLAYER_ID,
    });

    expect(result.kind).toBe('activity');
    if (result.kind !== 'activity') return;
    expect(result.viewerSeat).toBe('player');
    // The gm-scoped spend is gone, and the removal's audited rationale
    // is withheld while the removal itself stays.
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((entry) => entry.ordinal)).toEqual([0, 1]);
    expect(
      result.entries.some((entry) => entry.message.includes('Informant')),
    ).toBe(false);
    expect(result.entries[1].message).toContain('player-2');
    expect(result.entries[1].message).not.toContain('Left the session');
    // Through the ONE scanner, over the bytes a player would actually be
    // handed: neither withheld text nor any journal-position key.
    expect(
      leakScan(result.entries, ['Informant', 'Left the session mid-mission']),
    ).toEqual([]);
  });

  it('refuses a participant this session has never bound', async () => {
    restart();

    const result = await readCampaignActivityForViewer(ports(), {
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: 'stranger',
    });

    expect(result).toEqual({ kind: 'not-a-participant' });
  });

  it('refuses a revoked participant rather than serving the shared feed', async () => {
    revokeCampaignSessionParticipant({
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: PLAYER_ID,
      revokedAt: '3025-02-05T00:00:00.000Z',
    });
    restart();

    const result = await readCampaignActivityForViewer(ports(), {
      campaignId: CAMPAIGN_ID,
      sessionId: SESSION_ID,
      participantId: PLAYER_ID,
    });

    expect(result).toEqual({ kind: 'not-a-participant' });
  });
});
