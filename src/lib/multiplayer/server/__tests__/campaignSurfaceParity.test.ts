/**
 * Per-viewer projection digests across surfaces (umbrella 12.2).
 *
 * `Visibility Is Equivalent Across Surfaces` asks that live, replay,
 * snapshot, cold recovery, timeline, and export expose equivalent
 * authorized fields AND projection digest for one participant. These
 * rows drive ONE committed stream through the real host and the real
 * session, then compute the shared contract's digest on each surface for
 * the GM, Player 1, and Player 2, and assert the equalities that must
 * hold - and the inequalities that prove the digests are not constants.
 *
 * The surfaces do not all carry the same THING, and the parity is stated
 * per family rather than pretended away:
 *
 *   facts family (carries events): live fan-out, resync replay tail.
 *     Compared on factsDigest.
 *   state family (carries a fold, no events): the join baseline, the
 *     large-gap resync baseline, cold recovery. Compared on stateDigest,
 *     because a snapshot HAS no events to digest - that is the surface
 *     intentionally differing, not a gap in the proof.
 *
 * The two families are bound at their ends: the fold of the facts family
 * is asserted equal to the state family's digest, so a surface cannot
 * satisfy one half while diverging on the other.
 *
 * The timeline and export arms are audit-row shaped and share the hash
 * law rather than the event vocabulary; their parity lives with them, in
 * ViewerHistoryService.test.ts.
 */

import type { UnsequencedCampaignEvent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import {
  campaignViewerFactsDigest,
  campaignViewerStateDigest,
  projectCampaignForViewer,
} from '@/lib/campaign/sync/campaignViewerProjection';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  CampaignSyncSession,
  RESYNC_SNAPSHOT_GAP,
} from '@/lib/multiplayer/server/CampaignSyncSession';
import { campaignScopeAdmits } from '@/lib/multiplayer/server/campaignWireScopeBoundary';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-surface-parity';
const GM_ID = 'gm-player';
const P1_ID = 'player-one';
const P2_ID = 'player-two';
const OPENING_BALANCE = 500_000;

/** The three viewers every surface is measured for. */
const VIEWERS = [
  { label: 'GM', id: GM_ID },
  { label: 'Player 1', id: P1_ID },
  { label: 'Player 2', id: P2_ID },
] as const;

/**
 * The committed stream: shared facts, a GM-only fact, and one fact
 * private to each player. Every viewer therefore has a DIFFERENT
 * visibility set, which is what makes the cross-viewer inequalities
 * meaningful rather than accidental.
 */
function script(): readonly UnsequencedCampaignEvent[] {
  const base = {
    campaignId: CAMPAIGN_ID,
    ts: '2026-08-22T16:30:00.000Z',
    authorPlayerId: GM_ID,
  } as const;
  return [
    {
      ...base,
      type: 'FundsChanged',
      scope: 'campaign',
      payload: { delta: -1, reason: 'shared-spend', balance: 499_999 },
    },
    {
      ...base,
      type: 'PilotHired',
      scope: 'gm',
      payload: { pilot: { pilotId: 'pilot-gm-only', name: 'Ghost' }, cost: 1 },
    },
    {
      ...base,
      type: 'PilotHired',
      scope: `player:${P1_ID}`,
      payload: { pilot: { pilotId: 'pilot-p1-only', name: 'Aleph' }, cost: 1 },
    },
    {
      ...base,
      type: 'PilotHired',
      scope: `player:${P2_ID}`,
      payload: { pilot: { pilotId: 'pilot-p2-only', name: 'Beth' }, cost: 1 },
    },
    {
      ...base,
      type: 'CampaignDayAdvanced',
      scope: 'campaign',
      payload: { newDay: 4 },
    },
  ];
}

/** A real opened host+session carrying the committed stream. */
async function openWorld(): Promise<{
  host: CampaignMatchHost;
  session: CampaignSyncSession;
  roomCode: string;
  store: InMemoryCampaignEventStore;
}> {
  const store = new InMemoryCampaignEventStore();
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: GM_ID,
    eventStore: store,
    initialState: {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: OPENING_BALANCE,
    },
  });
  const session = new CampaignSyncSession(host);
  const roomCode = await session.open();
  return { host, session, roomCode, store };
}

/** The one baseline frame in a hydration stream. */
function baselineState(
  delivered: readonly ICampaignEvent[],
): ICampaignAuthoritativeState {
  const baseline = delivered.find(
    (event) => event.type === 'CampaignSnapshotPublished',
  ) as ICampaignEvent<'CampaignSnapshotPublished'> | undefined;
  if (baseline === undefined) throw new Error('no baseline frame');
  return baseline.payload.state;
}

/**
 * The expected projection for one viewer, computed from the log through
 * the shared contract with the session's OWN admission predicate. This
 * is the reference every surface is measured against; it is not a second
 * implementation, it is the contract the surfaces are supposed to use.
 */
async function expectedFor(
  host: CampaignMatchHost,
  participantId: string,
): Promise<ReturnType<typeof projectCampaignForViewer>> {
  const events = await host.getEventLog().getCampaignEvents(0);
  const viewer = {
    participantId,
    isGm: participantId === GM_ID,
  };
  return projectCampaignForViewer(CAMPAIGN_ID, events, (scope) =>
    campaignScopeAdmits(scope, viewer),
  );
}

describe.each(VIEWERS)(
  'campaign surface parity - $label',
  ({ id: participantId }) => {
    it('live fan-out digests to the viewer projection of the same facts', async () => {
      const { host, session } = await openWorld();
      // Attach BEFORE the commits, so this surface is genuinely the live
      // path and not a replay wearing its name.
      const live: ICampaignEvent[] = [];
      const detach = session.attachLiveParticipant(
        (event) => live.push(event),
        participantId,
      );
      await host._commitEventsForTests(script());
      detach();

      const expected = await expectedFor(host, participantId);
      // The live surface never carries the genesis row (it committed
      // before the attach), so compare against the visible tail rather
      // than the whole projection - same contract, same digest function.
      const visibleTail = expected.visible.filter(
        (event) => event.type !== 'CampaignSnapshotPublished',
      );
      expect(campaignViewerFactsDigest(live)).toBe(
        campaignViewerFactsDigest(visibleTail),
      );
    });

    it('the resync replay tail digests to the same facts as live', async () => {
      const { host, session } = await openWorld();
      const live: ICampaignEvent[] = [];
      const detach = session.attachLiveParticipant(
        (event) => live.push(event),
        participantId,
      );
      const committed = await host._commitEventsForTests(script());
      detach();
      const genesisHead = (committed[0]?.sequence ?? 1) - 1;

      // Small-gap resync from just before the first committed fact: the
      // replay path streams the same tail the live path fanned out.
      const replayed: ICampaignEvent[] = [];
      const resync = await session.resyncGuest(
        genesisHead,
        (event) => replayed.push(event),
        participantId,
      );
      expect(resync.snapshotted).toBe(false);
      // Falsification: filter the replay tail differently from live and
      // this reds. Equal digests IS the equivalence the letter asks for.
      expect(campaignViewerFactsDigest(replayed)).toBe(
        campaignViewerFactsDigest(live),
      );
    });

    it('the join baseline digests to the fold of the viewer facts', async () => {
      const { host, session, roomCode } = await openWorld();
      await host._commitEventsForTests(script());

      const seen: ICampaignEvent[] = [];
      const join =
        participantId === GM_ID
          ? await session.joinMember((event) => seen.push(event), participantId)
          : await session.joinGuest(
              roomCode,
              (event) => seen.push(event),
              participantId,
            );
      expect(join.ok).toBe(true);

      // The snapshot surface has NO events - it is one folded frame - so
      // the state half is what it can be held to. This is the surface
      // intentionally differing, and the binding below is what stops
      // that from being an escape hatch.
      const expected = await expectedFor(host, participantId);
      expect(campaignViewerStateDigest(baselineState(seen))).toBe(
        expected.stateDigest,
      );
    });

    it('cold recovery digests to the same state as the live join baseline', async () => {
      const { host, session, roomCode, store } = await openWorld();
      await host._commitEventsForTests(script());
      const warm: ICampaignEvent[] = [];
      if (participantId === GM_ID) {
        await session.joinMember((event) => warm.push(event), participantId);
      } else {
        await session.joinGuest(
          roomCode,
          (event) => warm.push(event),
          participantId,
        );
      }

      // The process restarts: the log survives, the host is rebuilt from
      // the persisted authoritative state exactly as CampaignHostRegistry
      // does (CampaignHostRegistry.ts:279-296).
      const rebuiltHost = new CampaignMatchHost({
        campaignId: CAMPAIGN_ID,
        hostPlayerId: GM_ID,
        eventStore: store,
        initialState: host.getState(),
      });
      const rebuilt = new CampaignSyncSession(rebuiltHost);
      const rebuiltCode = await rebuilt.open(roomCode);

      const cold: ICampaignEvent[] = [];
      const rejoin =
        participantId === GM_ID
          ? await rebuilt.joinMember((event) => cold.push(event), participantId)
          : await rebuilt.joinGuest(
              rebuiltCode,
              (event) => cold.push(event),
              participantId,
            );
      expect(rejoin.ok).toBe(true);
      expect(campaignViewerStateDigest(baselineState(cold))).toBe(
        campaignViewerStateDigest(baselineState(warm)),
      );
    });

    it('the large-gap resync baseline digests to the same state', async () => {
      const { host, session, roomCode } = await openWorld();
      await host._commitEventsForTests(script());
      for (let index = 0; index <= RESYNC_SNAPSHOT_GAP; index += 1) {
        await host._commitEventsForTests([
          {
            type: 'FundsChanged',
            campaignId: CAMPAIGN_ID,
            ts: '2026-08-22T16:31:00.000Z',
            authorPlayerId: GM_ID,
            scope: 'campaign',
            payload: { delta: 1, reason: `pad-${index}`, balance: index },
          },
        ]);
      }
      expect(roomCode).not.toBe('');

      const seen: ICampaignEvent[] = [];
      const resync = await session.resyncGuest(
        0,
        (event) => seen.push(event),
        participantId,
      );
      expect(resync.snapshotted).toBe(true);
      const expected = await expectedFor(host, participantId);
      expect(campaignViewerStateDigest(baselineState(seen))).toBe(
        expected.stateDigest,
      );
    });

    it('the facts family folds to the state family digest', async () => {
      // The binding between the two families. Without this a surface
      // could satisfy the facts half while its fold diverged, and the
      // per-family split would be an escape hatch instead of an honest
      // statement about what each surface carries.
      const { host, session, roomCode } = await openWorld();
      await host._commitEventsForTests(script());

      const seen: ICampaignEvent[] = [];
      if (participantId === GM_ID) {
        await session.joinMember((event) => seen.push(event), participantId);
      } else {
        await session.joinGuest(
          roomCode,
          (event) => seen.push(event),
          participantId,
        );
      }
      const expected = await expectedFor(host, participantId);
      expect(campaignViewerStateDigest(baselineState(seen))).toBe(
        campaignViewerStateDigest(expected.state),
      );
      expect(expected.factsDigest).toBe(
        campaignViewerFactsDigest(expected.visible),
      );
    });
  },
);

describe('campaign surface parity - the digests separate the viewers', () => {
  it('GM, Player 1, and Player 2 get three different projection digests', async () => {
    // Without this the parity rows above could all pass on a constant.
    // Three viewers, three visibility sets, three numbers.
    const { host } = await openWorld();
    await host._commitEventsForTests(script());
    const digests = await Promise.all(
      VIEWERS.map(
        async (viewer) => (await expectedFor(host, viewer.id)).digest,
      ),
    );
    expect(new Set(digests).size).toBe(VIEWERS.length);
  });

  it('the GM projection is the only one carrying every fact', async () => {
    const { host } = await openWorld();
    await host._commitEventsForTests(script());
    const events = await host.getEventLog().getCampaignEvents(0);
    const gm = await expectedFor(host, GM_ID);
    const p1 = await expectedFor(host, P1_ID);
    expect(gm.visible).toHaveLength(events.length);
    expect(p1.visible.length).toBeLessThan(events.length);
  });
});
