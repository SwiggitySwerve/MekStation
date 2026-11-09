/**
 * M-H2 (Wave 4): a spectator seat that survived a crash is released at boot.
 *
 * A seat is normally released when the viewer's last socket detaches. A process
 * that died first never ran that, and the seat then counts toward the
 * 16-spectator cap for the life of the match. No socket survives a restart, so
 * at boot every persisted spectator seat is a leftover.
 */

import { logger } from '@/utils/logger';

import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchStore } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { SEAT_UPDATE_MAX_ATTEMPTS } from '../lobby/seatUpdate';
import { releaseLeftoverSpectators } from '../lobby/spectatorBootSweep';
import { raceMetaWrites } from './matchMetaRace.test-helpers';
import {
  GM_PLAYER_ID,
  matchWithGmAndViewers,
  matchWithSpectators,
  playingSeats,
} from './spectatorSeats.test-helpers';

const builders: ReadonlyArray<
  readonly [string, () => { store: IMatchStore; close: () => void }]
> = [
  [
    'InMemoryMatchStore',
    () => ({
      store: new InMemoryMatchStore({ quiet: true }),
      close: () => undefined,
    }),
  ],
  [
    'DurableMatchStore',
    () => {
      const durable = new DurableMatchStore({ path: ':memory:' });
      return { store: durable, close: () => durable.close() };
    },
  ],
];

describe.each(builders)('%s releaseLeftoverSpectators', (_name, build) => {
  let store: IMatchStore;
  let close: () => void;

  beforeEach(() => {
    ({ store, close } = build());
  });
  afterEach(() => {
    jest.restoreAllMocks();
    close();
  });

  it('removes every spectator seat and nothing else, in one write', async () => {
    await store.createMatch(matchWithSpectators('m', 3));
    const before = await store.getMatchMeta('m');

    const released = await releaseLeftoverSpectators(store, before);

    expect(released).toBe(3);
    const after = await store.getMatchMeta('m');
    expect(after.seats).toEqual(playingSeats());
    expect(after).toMatchObject({
      status: 'active',
      hostPlayerId: before.hostPlayerId,
      playerIds: before.playerIds,
      sideAssignments: before.sideAssignments,
      revision: 1,
    });
  });

  it('keeps the co-op GM seat and its membership while sweeping the viewers beside it', async () => {
    await store.createMatch(matchWithGmAndViewers('coop', 2));
    const members = new MatchSeatMembershipSource(store);
    expect(await members.lookupMembership(GM_PLAYER_ID, 'coop')).not.toBeNull();
    const before = await store.getMatchMeta('coop');

    const released = await releaseLeftoverSpectators(store, before);

    expect(released).toBe(2);
    const after = await store.getMatchMeta('coop');
    const spectators = (after.seats ?? [])
      .filter((seat) => seat.kind === 'spectator')
      .map((seat) => seat.occupant?.playerId);
    expect(spectators).toEqual([GM_PLAYER_ID]);
    expect(after.hostPlayerId).toBe(GM_PLAYER_ID);
    expect(await members.lookupMembership(GM_PLAYER_ID, 'coop')).not.toBeNull();
    // The viewers' membership is gone: they register again to watch.
    expect(await members.lookupMembership('watch-1', 'coop')).toBeNull();
  });

  it('writes nothing for a co-op match whose only spectator seat is the GM', async () => {
    await store.createMatch(matchWithGmAndViewers('coop-quiet', 0));
    const before = await store.getMatchMeta('coop-quiet');

    expect(await releaseLeftoverSpectators(store, before)).toBe(0);

    expect(await store.getMatchMeta('coop-quiet')).toEqual(before);
  });

  it('writes nothing when there is no spectator seat, and is idempotent', async () => {
    await store.createMatch(matchWithSpectators('m', 0));
    const before = await store.getMatchMeta('m');
    expect(await releaseLeftoverSpectators(store, before)).toBe(0);
    expect(await store.getMatchMeta('m')).toEqual(before);

    await store.createMatch(matchWithSpectators('n', 2));
    const listed = await store.getMatchMeta('n');
    expect(await releaseLeftoverSpectators(store, listed)).toBe(2);
    // The caller's listing is now stale; a second pass finds nothing to do.
    expect(await releaseLeftoverSpectators(store, listed)).toBe(0);
    expect((await store.getMatchMeta('n')).revision).toBe(1);
  });

  it('survives a store failure, logs it, and reports nothing released', async () => {
    await store.createMatch(matchWithSpectators('leftover-match', 2));
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    jest
      .spyOn(store, 'updateMatchMetaIf')
      .mockRejectedValueOnce(new Error('disk full'));

    const released = await releaseLeftoverSpectators(
      store,
      await store.getMatchMeta('leftover-match'),
    );

    expect(released).toBe(0);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('leftover-match'),
      expect.anything(),
    );
  });

  it('logs and reports nothing released when every attempt loses a race', async () => {
    await store.createMatch(matchWithSpectators('m', 2));
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    raceMetaWrites(
      store,
      'm',
      (fresh) => ({ hostPlayerId: fresh.hostPlayerId }),
      SEAT_UPDATE_MAX_ATTEMPTS,
    );

    const released = await releaseLeftoverSpectators(
      store,
      await store.getMatchMeta('m'),
    );

    expect(released).toBe(0);
    expect(warn).toHaveBeenCalled();
  });
});
