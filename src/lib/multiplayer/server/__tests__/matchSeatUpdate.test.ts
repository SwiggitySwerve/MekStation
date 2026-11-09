/**
 * M-H2 (Wave 4): `updateMatchSeats` is the one guarded seat writer. It derives
 * a patch from fresh metadata, applies it with the revision it read, and on a
 * conflict re-derives from the winner's metadata, a bounded number of times.
 */

import { DurableMatchStore } from '../DurableMatchStore';
import { type IMatchMeta, type IMatchStore } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  SEAT_UPDATE_MAX_ATTEMPTS,
  updateMatchSeats,
} from '../lobby/seatUpdate';
import { raceMetaWrites } from './matchMetaRace.test-helpers';

const AT = '2026-01-01T00:00:00.000Z';

function makeMeta(matchId: string): IMatchMeta {
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1'],
    sideAssignments: [{ playerId: 'p1', side: 'player' }],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

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

describe.each(builders)('%s updateMatchSeats', (_name, build) => {
  let store: IMatchStore;
  let close: () => void;

  beforeEach(async () => {
    ({ store, close } = build());
    await store.createMatch(makeMeta('m'));
  });
  afterEach(() => {
    jest.restoreAllMocks();
    close();
  });

  const addPlayer = (id: string) => (meta: IMatchMeta) => ({
    playerIds: [...meta.playerIds, id],
  });

  it('applies the derived patch and returns the applied metadata', async () => {
    const result = await updateMatchSeats(store, 'm', addPlayer('p2'));

    expect(result).toMatchObject({
      kind: 'applied',
      meta: { playerIds: ['p1', 'p2'], revision: 1 },
    });
    expect((await store.getMatchMeta('m')).playerIds).toEqual(['p1', 'p2']);
  });

  it('answers unchanged and writes nothing when the derivation yields no patch', async () => {
    const before = await store.getMatchMeta('m');

    const result = await updateMatchSeats(store, 'm', () => null);

    expect(result).toEqual({ kind: 'unchanged', meta: before });
    expect(await store.getMatchMeta('m')).toEqual(before);
  });

  it('re-derives from the winner when a competing write lands first', async () => {
    const race = raceMetaWrites(store, 'm', (fresh) => ({
      playerIds: [...fresh.playerIds, 'racer'],
    }));
    const seen: string[][] = [];

    const result = await updateMatchSeats(store, 'm', (meta) => {
      seen.push([...meta.playerIds]);
      return addPlayer('p2')(meta);
    });

    expect(race.fired()).toBe(1);
    expect(seen).toEqual([['p1'], ['p1', 'racer']]);
    expect(result.kind).toBe('applied');
    expect((await store.getMatchMeta('m')).playerIds).toEqual([
      'p1',
      'racer',
      'p2',
    ]);
  });

  it('gives up with busy after the bounded number of attempts', async () => {
    raceMetaWrites(
      store,
      'm',
      (fresh) => ({ playerIds: [...fresh.playerIds, 'racer'] }),
      SEAT_UPDATE_MAX_ATTEMPTS,
    );
    const derive = jest.fn(addPlayer('p2'));

    const result = await updateMatchSeats(store, 'm', derive);

    expect(SEAT_UPDATE_MAX_ATTEMPTS).toBe(5);
    expect(result.kind).toBe('busy');
    expect(derive).toHaveBeenCalledTimes(SEAT_UPDATE_MAX_ATTEMPTS);
    expect((await store.getMatchMeta('m')).playerIds).not.toContain('p2');
  });

  it('lets a derivation error through untouched, without a write or a retry', async () => {
    const before = await store.getMatchMeta('m');
    const derive = jest.fn(() => {
      throw new Error('refused');
    });

    await expect(updateMatchSeats(store, 'm', derive)).rejects.toThrow(
      'refused',
    );

    expect(derive).toHaveBeenCalledTimes(1);
    expect(await store.getMatchMeta('m')).toEqual(before);
  });
});
