/**
 * M-H2 (Wave 4): boot recovery releases crash-leftover spectator seats.
 *
 * Only the full recovery pass is the boot pass. A recovery scoped to one match
 * id also runs at runtime (a co-op mission host rebuilt on its first socket),
 * where a spectator may have just registered and not attached yet.
 */

import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { recoverActiveMatches } from '../MatchRecovery';
import {
  GM_PLAYER_ID,
  matchWithGmAndViewers,
  matchWithSpectators,
  playingSeats,
} from './spectatorSeats.test-helpers';

const spectatorsOf = async (store: InMemoryMatchStore, matchId: string) =>
  ((await store.getMatchMeta(matchId)).seats ?? []).filter(
    (seat) => seat.kind === 'spectator',
  );

describe('recoverActiveMatches spectator leftovers', () => {
  let store: InMemoryMatchStore;

  beforeEach(() => {
    store = new InMemoryMatchStore({ quiet: true });
  });

  it('releases the spectators of every active match on the full boot pass', async () => {
    await store.createMatch(matchWithSpectators('one', 2));
    await store.createMatch(matchWithSpectators('two', 1));
    await store.createMatch(matchWithSpectators('clean', 0));

    await recoverActiveMatches(store);

    expect(await spectatorsOf(store, 'one')).toEqual([]);
    expect(await spectatorsOf(store, 'two')).toEqual([]);
    expect((await store.getMatchMeta('one')).seats).toEqual(playingSeats());
    expect((await store.getMatchMeta('clean')).revision).toBeUndefined();
  });

  it('keeps the co-op GM on the full boot pass while sweeping the viewers', async () => {
    await store.createMatch(matchWithGmAndViewers('coop-boot', 2));
    const members = new MatchSeatMembershipSource(store);

    await recoverActiveMatches(store);

    expect(await spectatorsOf(store, 'coop-boot')).toHaveLength(1);
    expect((await spectatorsOf(store, 'coop-boot'))[0].occupant?.playerId).toBe(
      GM_PLAYER_ID,
    );
    expect(
      await members.lookupMembership(GM_PLAYER_ID, 'coop-boot'),
    ).not.toBeNull();
    expect(await members.lookupMembership('watch-1', 'coop-boot')).toBeNull();
  });

  it('leaves lobby and completed matches alone', async () => {
    await store.createMatch(matchWithSpectators('lobby-m', 1, 'lobby'));
    await store.createMatch(matchWithSpectators('done-m', 1));
    await store.closeMatch('done-m');
    const before = {
      lobby: await store.getMatchMeta('lobby-m'),
      done: await store.getMatchMeta('done-m'),
    };

    await recoverActiveMatches(store);

    expect(await store.getMatchMeta('lobby-m')).toEqual(before.lobby);
    expect(await store.getMatchMeta('done-m')).toEqual(before.done);
  });

  it('does not touch spectators when recovery is scoped to one match (the runtime path)', async () => {
    await store.createMatch(matchWithSpectators('coop', 2));
    await store.createMatch(matchWithSpectators('other', 2));

    await recoverActiveMatches(store, undefined, 'coop');

    expect(await spectatorsOf(store, 'coop')).toHaveLength(2);
    expect(await spectatorsOf(store, 'other')).toHaveLength(2);
  });
});
