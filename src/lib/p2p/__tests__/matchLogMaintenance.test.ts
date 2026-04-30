import type { IPurgeOldMatchesResult } from '../matchLogStorage';

import { installMatchLogMaintenance } from '../matchLogMaintenance';

const purgeResult: IPurgeOldMatchesResult = {
  purgedMatchIds: ['match-1', 'match-2'],
  purgedEventCount: 5,
};

describe('matchLogMaintenance', () => {
  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.__mekstationDebug = undefined;
    }
  });

  it('purges old match logs on startup and exposes manual debug purge', async () => {
    const purgeOldMatches = jest.fn<Promise<IPurgeOldMatchesResult>, [number?]>(
      async () => purgeResult,
    );

    installMatchLogMaintenance({
      storage: { purgeOldMatches },
      logger: { error: jest.fn() },
    });
    await Promise.resolve();

    expect(purgeOldMatches).toHaveBeenCalledWith();
    expect(window.__mekstationDebug?.purgeOldMatches).toBeDefined();

    const manualResult =
      await window.__mekstationDebug?.purgeOldMatches?.(1_000);

    expect(purgeOldMatches).toHaveBeenLastCalledWith(1_000);
    expect(manualResult).toEqual(purgeResult);
  });
});
