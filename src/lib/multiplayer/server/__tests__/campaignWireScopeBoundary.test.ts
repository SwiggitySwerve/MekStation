/**
 * Campaign wire scope boundary (umbrella 11.1, campaign half).
 *
 * The scope vocabulary has been stamped on every campaign event since
 * design D3, and the delivery side never read it - the first gm-scoped
 * producer would have broadcast to the whole session. The integration
 * rows drive the REAL commit, hydration, and live fan-out through
 * CampaignSyncSession and were red before the boundary was wired.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { CampaignSyncSession } from '@/lib/multiplayer/server/CampaignSyncSession';
import { campaignScopeAdmits } from '@/lib/multiplayer/server/campaignWireScopeBoundary';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-scope-boundary';
const GM_ID = 'gm-player';
const P1_ID = 'player-one';
const P2_ID = 'player-two';

function newSession(): {
  host: CampaignMatchHost;
  session: CampaignSyncSession;
} {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: GM_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: 500_000,
    },
  });
  return { host, session: new CampaignSyncSession(host) };
}

function gmFact(): Parameters<CampaignMatchHost['_commitEventsForTests']>[0] {
  return [
    {
      type: 'FundsChanged',
      campaignId: CAMPAIGN_ID,
      ts: new Date().toISOString(),
      authorPlayerId: GM_ID,
      scope: 'gm',
      payload: { delta: -1, reason: 'gm-hidden-opportunity', balance: 499_999 },
    },
  ];
}

function playerFact(
  playerId: string,
): Parameters<CampaignMatchHost['_commitEventsForTests']>[0] {
  return [
    {
      type: 'FundsChanged',
      campaignId: CAMPAIGN_ID,
      ts: new Date().toISOString(),
      authorPlayerId: GM_ID,
      scope: `player:${playerId}`,
      payload: { delta: -2, reason: 'private-briefing', balance: 499_998 },
    },
  ];
}

describe('campaignScopeAdmits - the pure matrix', () => {
  const gm = { participantId: GM_ID, isGm: true } as const;
  const p1 = { participantId: P1_ID, isGm: false } as const;
  const unproven = { participantId: null, isGm: false } as const;

  it.each([
    ['campaign', gm, true],
    ['campaign', p1, true],
    ['campaign', unproven, true],
    ['gm', gm, true],
    ['gm', p1, false],
    ['gm', unproven, false],
    [`player:${P1_ID}`, p1, true],
    [`player:${P2_ID}`, p1, false],
    [`player:${P1_ID}`, unproven, false],
    [`player:${P1_ID}`, gm, true],
    ['team:alpha', p1, false],
    ['team:alpha', gm, true],
  ] as const)('scope %s vs %o admits=%s', (scope, viewer, admits) => {
    // Falsification: flip any arm of campaignScopeAdmits and its rows red.
    expect(campaignScopeAdmits(scope as ICampaignEvent['scope'], viewer)).toBe(
      admits,
    );
  });
});

describe('CampaignSyncSession - scope-filtered fan-out (integration)', () => {
  it('a gm-scoped live event reaches the GM sink and never a player sink', async () => {
    const { host, session } = newSession();
    await session.open();

    const gmSeen: ICampaignEvent[] = [];
    const p1Seen: ICampaignEvent[] = [];
    const roomCode = session.getRoomCode();
    expect(roomCode).not.toBeNull();
    const gmJoin = await session.joinMember((e) => gmSeen.push(e), GM_ID);
    const p1Join = await session.joinGuest(
      roomCode ?? '',
      (e) => p1Seen.push(e),
      P1_ID,
    );
    expect(gmJoin.ok && p1Join.ok).toBe(true);

    await host._commitEventsForTests(gmFact());

    // Falsification: remove the guard from the live subscribe and the
    // player row reds.
    expect(gmSeen.some((e) => e.scope === 'gm')).toBe(true);
    expect(p1Seen.some((e) => e.scope === 'gm')).toBe(false);
    // Control: a campaign-scoped fact still reaches both.
    await host._commitEventsForTests([
      {
        type: 'FundsChanged',
        campaignId: CAMPAIGN_ID,
        ts: new Date().toISOString(),
        authorPlayerId: GM_ID,
        scope: 'campaign',
        payload: { delta: 5, reason: 'shared', balance: 500_005 },
      },
    ]);
    expect(
      p1Seen.some((e) => e.scope === 'campaign' && e.type === 'FundsChanged'),
    ).toBe(true);
  });

  it('a player-scoped event targets exactly its player plus the GM', async () => {
    const { host, session } = newSession();
    await session.open();
    const roomCode = session.getRoomCode() ?? '';

    const gmSeen: ICampaignEvent[] = [];
    const p1Seen: ICampaignEvent[] = [];
    const p2Seen: ICampaignEvent[] = [];
    await session.joinMember((e) => gmSeen.push(e), GM_ID);
    await session.joinGuest(roomCode, (e) => p1Seen.push(e), P1_ID);
    await session.joinGuest(roomCode, (e) => p2Seen.push(e), P2_ID);

    await host._commitEventsForTests(playerFact(P1_ID));

    const isPrivate = (e: ICampaignEvent) => e.scope === `player:${P1_ID}`;
    expect(gmSeen.some(isPrivate)).toBe(true);
    expect(p1Seen.some(isPrivate)).toBe(true);
    // Falsification: admit every player scope and this reds.
    expect(p2Seen.some(isPrivate)).toBe(false);
  });

  it('resync tails are scope-filtered the same as live fan-out', async () => {
    // Baselines always swallow prior events, so the replay-path probe is
    // resyncGuest's small-gap tail: the gm fact sits between the
    // player's lastSeq and the head, and must be withheld there too.
    const { host, session } = newSession();
    await session.open();

    const before = await host._commitEventsForTests([
      {
        type: 'FundsChanged',
        campaignId: CAMPAIGN_ID,
        ts: new Date().toISOString(),
        authorPlayerId: GM_ID,
        scope: 'campaign',
        payload: { delta: 1, reason: 'pre', balance: 500_001 },
      },
    ]);
    const lastSeq = before[before.length - 1].sequence;
    await host._commitEventsForTests(gmFact());

    const p1Seen: ICampaignEvent[] = [];
    const p1 = await session.resyncGuest(lastSeq, (e) => p1Seen.push(e), P1_ID);
    expect(p1.ok).toBe(true);
    // Falsification: guard only joinMember and this reds.
    expect(p1Seen.some((e) => e.scope === 'gm')).toBe(false);

    const gmSeen: ICampaignEvent[] = [];
    const gm = await session.resyncGuest(lastSeq, (e) => gmSeen.push(e), GM_ID);
    expect(gm.ok).toBe(true);
    expect(gmSeen.some((e) => e.scope === 'gm')).toBe(true);
  });

  it('a withheld event still advances the delivered watermark', async () => {
    // Convergence must not wait forever on a fact a player will never
    // receive - the concealment-arithmetic trade-off is recorded in the
    // 11.1 receipts and owned by the delegated delivery-epoch work.
    const { host, session } = newSession();
    await session.open();
    const roomCode = session.getRoomCode() ?? '';

    const p1Seen: ICampaignEvent[] = [];
    await session.joinGuest(roomCode, (e) => p1Seen.push(e), P1_ID);
    const committed = await host._commitEventsForTests(gmFact());
    const hidden = committed[committed.length - 1];

    // The player never saw it, yet acknowledging the head is accepted
    // because delivery was RECORDED at the boundary's withhold.
    const ack = session.noteParticipantAcknowledged(P1_ID, hidden.sequence);
    // "applied" IS the proof: had the withhold skipped delivery
    // recording, the guard would answer ahead-of-delivery.
    // Falsification: skip noteDelivered on withhold and this reds.
    expect(ack).toBe('applied');
  });
});
