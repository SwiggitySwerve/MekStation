/**
 * Production binder for per-session quarantine (umbrella 15.4 errata).
 *
 * recoverActiveMatches only quarantines when handed a registry. The
 * host registry now owns that ledger, passes it at boot, keeps the
 * blocked list, and refuses getOrCreate for a quarantined match so the
 * socket path cannot mint an empty host.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

jest.mock('@/engine/adapters/CompendiumAdapter', () => {
  const gameplay = jest.requireActual('@/types/gameplay/GameSessionInterfaces');
  const hex = jest.requireActual('@/types/gameplay/HexGridInterfaces');
  return {
    adaptUnit: jest.fn(
      async (
        unitRef: string,
        options: {
          readonly side?: typeof gameplay.GameSide.Player;
          readonly position?: { readonly q: number; readonly r: number };
          readonly facing?: typeof hex.Facing.North;
        } = {},
      ) => ({
        id: unitRef,
        side: options.side ?? gameplay.GameSide.Player,
        position: options.position ?? { q: 0, r: 0 },
        facing: options.facing ?? hex.Facing.North,
        heat: 0,
        movementThisTurn: hex.MovementType.Stationary,
        hexesMovedThisTurn: 0,
        armor: { center_torso: 30 },
        structure: { center_torso: 20 },
        startingInternalStructure: { center_torso: 20 },
        destroyedLocations: [],
        destroyedEquipment: [],
        ammo: [],
        pilotWounds: 0,
        pilotConscious: true,
        destroyed: false,
        hasRetreated: false,
        hasEjected: false,
        lockState: gameplay.LockState.Pending,
        weapons: [],
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        heatSinks: 10,
        heatSinkType: 'single',
        tonnage: 75,
      }),
    ),
  };
});

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MatchHostRegistry } from '../MatchHostRegistry';
import { buildDefaultMatchUnitBootstrap } from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';

import {
  isolationLiveHost,
  isolationMatchMeta,
  punchSequenceGap,
} from './matchIsolationFixtures';

/**
 * WHAT: one store with a healthy active match and a gapped twin.
 * WHY: the binder suite has to recover both in the same sweep.
 */
async function seedHealthyAndGapped(): Promise<InMemoryMatchStore> {
  const store = new InMemoryMatchStore({ quiet: true });
  await store.createMatch(isolationMatchMeta('match-healthy'));
  await isolationLiveHost('match-healthy', store);
  const healthyLog = await store.getEvents('match-healthy', 0);
  await store.createMatch(isolationMatchMeta('match-gapped'));
  await punchSequenceGap(store, 'match-gapped', healthyLog);
  return store;
}

describe('MatchHostRegistry quarantine binder', () => {
  it('records a refused match as quarantined and will not mint a fresh host for it', async () => {
    const store = await seedHealthyAndGapped();
    const registry = new MatchHostRegistry({ store });
    const createSpy = jest.spyOn(ServerMatchHost, 'create');

    const boot = await registry.recoverActiveMatches();
    expect(boot.blocked.map((entry) => entry.matchId)).toEqual([
      'match-gapped',
    ]);
    expect(registry.blockedMatches().map((entry) => entry.matchId)).toEqual([
      'match-gapped',
    ]);
    expect(registry.isQuarantined('match-gapped')).toBe(true);
    expect(Array.from(registry.quarantinedMatchIds())).toEqual([
      'match-gapped',
    ]);

    createSpy.mockClear();
    const refused = await registry.getOrCreate('match-gapped');
    expect(refused).toBeNull();
    expect(createSpy).not.toHaveBeenCalled();

    const served = await registry.getOrCreate('match-healthy');
    expect(served).not.toBeNull();
    expect(served).toBe(registry.get('match-healthy'));
    expect(createSpy).not.toHaveBeenCalled();

    createSpy.mockRestore();
  });

  it('still serves a healthy match recovered in the same boot', async () => {
    const store = await seedHealthyAndGapped();
    const registry = new MatchHostRegistry({ store });
    await registry.recoverActiveMatches();

    expect(registry.isQuarantined('match-healthy')).toBe(false);
    expect(registry.get('match-healthy')).not.toBeNull();
    const served = await registry.getOrCreate('match-healthy');
    expect(served).toBe(registry.get('match-healthy'));
  });

  it('still mints a fresh host for a match that was never recovered and is not quarantined', async () => {
    const store = await seedHealthyAndGapped();
    const lobby = isolationMatchMeta('match-lobby', 'lobby');
    await store.createMatch({
      ...lobby,
      unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 6),
    });
    const registry = new MatchHostRegistry({ store });
    await registry.recoverActiveMatches();

    expect(registry.isQuarantined('match-lobby')).toBe(false);
    expect(registry.get('match-lobby')).toBeNull();

    const createSpy = jest.spyOn(ServerMatchHost, 'create');
    const minted = await registry.getOrCreate('match-lobby');
    expect(minted).not.toBeNull();
    expect(createSpy).toHaveBeenCalled();
    createSpy.mockRestore();
  });

  it('keeps the blocked list visible after boot', async () => {
    const store = await seedHealthyAndGapped();
    const registry = new MatchHostRegistry({ store });
    const boot = await registry.recoverActiveMatches();

    expect(boot.blocked).toHaveLength(1);
    expect(boot.blocked[0]?.matchId).toBe('match-gapped');
    expect(boot.blocked[0]?.reason).toBe('sequence-gap');
    expect(registry.blockedMatches()).toBe(boot.blocked);
  });

  it('an empty store and empty quarantine still mint a host from meta', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const lobby = isolationMatchMeta('match-fresh', 'lobby');
    await store.createMatch({
      ...lobby,
      unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 6),
    });
    const registry = new MatchHostRegistry({ store });
    const boot = await registry.recoverActiveMatches();

    expect(boot.recovered).toBe(0);
    expect(boot.failed).toBe(0);
    expect(boot.blocked).toEqual([]);
    expect(Array.from(registry.quarantinedMatchIds())).toEqual([]);

    const minted = await registry.getOrCreate('match-fresh');
    expect(minted).not.toBeNull();
  });
});
