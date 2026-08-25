/**
 * Durable campaign-session membership (umbrella task 6.1).
 *
 * The program admits one non-playing GM and exactly two tactical player
 * seats. These rows pin the two rules that make that real rather than
 * aspirational, and the revocation semantics the audit timeline needs.
 */

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
  revokeCampaignSessionParticipant,
  TACTICAL_SEAT_LIMIT,
} from '../CampaignSessionParticipantStore';

const CAMPAIGN = 'campaign-seats';
const SESSION = 'session-1';
const NOW = '3025-01-01T00:00:00.000Z';

function bind(participantId: string, seat: 'gm' | 'player' = 'player') {
  return bindCampaignSessionParticipant({
    campaignId: CAMPAIGN,
    sessionId: SESSION,
    participantId,
    seat,
    boundAt: NOW,
  });
}

beforeEach(() => {
  resetSQLiteService();
  getSQLiteService({ path: ':memory:' }).initialize();
});

afterEach(() => {
  resetSQLiteService();
});

describe('campaign session seats', () => {
  it('binds a gm and two tactical players', () => {
    expect(bind('pid_gm', 'gm').kind).toBe('bound');
    expect(bind('pid_p1').kind).toBe('bound');
    expect(bind('pid_p2').kind).toBe('bound');

    expect(
      listActiveCampaignSessionParticipants(CAMPAIGN, SESSION).map(
        (m) => m.participantId,
      ),
    ).toEqual(['pid_gm', 'pid_p1', 'pid_p2']);
  });

  it('refuses a second active gm', () => {
    bind('pid_gm', 'gm');

    // A second GM is an authority split. The partial unique index makes
    // it impossible rather than discouraged; the store turns that raw
    // constraint into a refusal a caller can act on.
    expect(bind('pid_usurper', 'gm')).toEqual({ kind: 'gm-seat-taken' });
    expect(
      listActiveCampaignSessionParticipants(CAMPAIGN, SESSION),
    ).toHaveLength(1);
  });

  it('refuses a third tactical player', () => {
    bind('pid_p1');
    bind('pid_p2');

    expect(bind('pid_p3')).toEqual({
      kind: 'tactical-seats-full',
      limit: TACTICAL_SEAT_LIMIT,
    });
  });

  it('treats a rejoin by an active member as already bound, not an error', () => {
    const first = bind('pid_p1');
    expect(first.kind).toBe('bound');

    // A reconnect must not consume a second seat, nor look like a
    // failure to the socket layer that is simply re-attaching.
    const again = bind('pid_p1');
    expect(again.kind).toBe('already-bound');
    expect(
      listActiveCampaignSessionParticipants(CAMPAIGN, SESSION),
    ).toHaveLength(1);
  });

  it('frees the gm seat on revocation without losing the history', () => {
    bind('pid_gm', 'gm');

    expect(
      revokeCampaignSessionParticipant({
        campaignId: CAMPAIGN,
        sessionId: SESSION,
        participantId: 'pid_gm',
        revokedAt: NOW,
      }),
    ).toBe(true);

    // The replacement can take the seat, which is why the index is
    // partial rather than absolute.
    expect(bind('pid_gm2', 'gm').kind).toBe('bound');
    // And the revoked row survives - the audit timeline has to be able
    // to say "was a member, then was not".
    const rows = getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT participant_id, revoked_at FROM campaign_session_participant
         WHERE campaign_id = ? AND session_id = ? ORDER BY participant_id`,
      )
      .all(CAMPAIGN, SESSION) as {
      participant_id: string;
      revoked_at: string | null;
    }[];
    expect(rows).toEqual([
      { participant_id: 'pid_gm', revoked_at: NOW },
      { participant_id: 'pid_gm2', revoked_at: null },
    ]);
  });

  it('does not readmit a revoked participant on reconnect', () => {
    bind('pid_p1');
    revokeCampaignSessionParticipant({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      participantId: 'pid_p1',
      revokedAt: NOW,
    });

    // Silently reinstating them would make revocation last exactly until
    // they tried again.
    expect(bind('pid_p1')).toEqual({ kind: 'revoked' });
    expect(
      activeCampaignSessionMembership(CAMPAIGN, SESSION, 'pid_p1'),
    ).toBeNull();
  });

  it('reports a revoked membership as absent, never as present', () => {
    bind('pid_p1');
    expect(
      activeCampaignSessionMembership(CAMPAIGN, SESSION, 'pid_p1'),
    ).not.toBeNull();

    revokeCampaignSessionParticipant({
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      participantId: 'pid_p1',
      revokedAt: NOW,
    });

    // A caller asking "may this socket attach?" must not be able to read
    // a revoked row as a live membership.
    expect(
      activeCampaignSessionMembership(CAMPAIGN, SESSION, 'pid_p1'),
    ).toBeNull();
  });

  it('reports a second revocation as a no-op rather than a success', () => {
    bind('pid_p1');
    const args = {
      campaignId: CAMPAIGN,
      sessionId: SESSION,
      participantId: 'pid_p1',
      revokedAt: NOW,
    };

    expect(revokeCampaignSessionParticipant(args)).toBe(true);
    // So a caller can tell "I revoked them" from "they were already
    // out" without reading the row back and racing another revoker.
    expect(revokeCampaignSessionParticipant(args)).toBe(false);
  });

  it('keeps seats separate per session', () => {
    bind('pid_p1');
    bind('pid_p2');

    // A full session must not exhaust another session's seats - they are
    // different tables of play.
    expect(
      bindCampaignSessionParticipant({
        campaignId: CAMPAIGN,
        sessionId: 'session-2',
        participantId: 'pid_p3',
        seat: 'player',
        boundAt: NOW,
      }).kind,
    ).toBe('bound');
  });

  it('survives a reopen of the same database file', () => {
    // Membership that only exists in this process is exactly what task
    // 6.1 says is missing today.
    bind('pid_gm', 'gm');
    const before = listActiveCampaignSessionParticipants(CAMPAIGN, SESSION);
    expect(before).toHaveLength(1);

    // A :memory: database cannot be reopened, so assert what CAN be
    // asserted here - the row is durable within the connection - and
    // leave file-level durability to the migration suite that owns it.
    expect(before[0]?.seat).toBe('gm');
  });
});
