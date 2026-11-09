/**
 * Lets competing metadata writes land between a handler's read and its write.
 *
 * Wraps whichever write method the handler uses (`updateMatchMeta` before the
 * seat compare-and-swap, `updateMatchMetaIf` after it) so one interleave test
 * is red against a read-modify-write overwrite and green against the CAS.
 * The competing write uses the store's unwrapped `updateMatchMeta`.
 */

import type { IMatchMeta, IMatchMetaPatch, IMatchStore } from '../IMatchStore';

type MetaWriter = (...args: unknown[]) => Promise<unknown>;

export interface IMetaRace {
  /** How many competing writes have landed. */
  readonly fired: () => number;
}

export function raceMetaWrites(
  store: IMatchStore,
  matchId: string,
  competing: (fresh: IMatchMeta) => IMatchMetaPatch,
  times = 1,
): IMetaRace {
  const raw = store.updateMatchMeta.bind(store);
  let fired = 0;
  const target = store as unknown as Record<string, MetaWriter | undefined>;
  for (const name of ['updateMatchMeta', 'updateMatchMetaIf']) {
    const original = target[name];
    if (typeof original !== 'function') continue;
    jest.spyOn(target as never, name as never).mockImplementation(((
      ...args: unknown[]
    ) => {
      return (async () => {
        if (fired < times) {
          fired += 1;
          await raw(matchId, competing(await store.getMatchMeta(matchId)));
        }
        return original.apply(store, args);
      })();
    }) as never);
  }
  return { fired: () => fired };
}
