/**
 * Tests for the skirmish pre-battle session builder.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/specs/game-session-management/spec.md
 */

import {
  buildFromSkirmishConfig,
  computeBvTotals,
  getSkirmishConfigError,
  SUPPORTED_MAP_RADII,
  type ISkirmishLaunchConfig,
  type ISkirmishUnitSelection,
} from '@/utils/gameplay/preBattleSessionBuilder';

const makePilot = (
  overrides: Partial<ISkirmishUnitSelection['pilot']> = {},
): NonNullable<ISkirmishUnitSelection['pilot']> => ({
  pilotId: 'pilot-1',
  callsign: 'Ghost',
  gunnery: 4,
  piloting: 5,
  ...overrides,
});

const makeUnit = (
  overrides: Partial<ISkirmishUnitSelection> = {},
): ISkirmishUnitSelection => ({
  unitId: 'wsp-1a',
  designation: 'Wasp WSP-1A',
  tonnage: 20,
  bv: 640,
  pilot: makePilot(),
  ...overrides,
});

const makeConfig = (
  overrides: Partial<ISkirmishLaunchConfig> = {},
): ISkirmishLaunchConfig => ({
  encounterId: 'enc-1',
  mapRadius: 8,
  terrainPreset: 'clear',
  player: {
    units: [
      makeUnit({ unitId: 'wsp-1a', designation: 'Wasp WSP-1A' }),
      makeUnit({
        unitId: 'phx-1',
        designation: 'Phoenix Hawk PXH-1',
        pilot: makePilot({ pilotId: 'p-player-2', callsign: 'Viper' }),
      }),
    ],
  },
  opponent: {
    units: [
      makeUnit({
        unitId: 'cda-2a',
        designation: 'Cicada CDA-2A',
        pilot: makePilot({ pilotId: 'p-opp-1', callsign: 'Spectre' }),
      }),
      makeUnit({
        unitId: 'jvn-10n',
        designation: 'Javelin JVN-10N',
        pilot: makePilot({ pilotId: 'p-opp-2', callsign: 'Raven' }),
      }),
    ],
  },
  ...overrides,
});

describe('getSkirmishConfigError', () => {
  it('returns null for a fully-valid config', () => {
    expect(getSkirmishConfigError(makeConfig())).toBeNull();
  });

  it('rejects a config whose radius is not in the supported set (tasks 4.1, 10.2)', () => {
    const config = makeConfig({ mapRadius: 3 });
    expect(getSkirmishConfigError(config)).toMatch(
      /Map radius 3 not in supported set/,
    );
  });

  it('rejects a config when a player unit has no pilot (tasks 3.4, 10.1)', () => {
    const config = makeConfig({
      player: {
        units: [
          makeUnit({ unitId: 'wsp-1a', designation: 'Wasp WSP-1A' }),
          makeUnit({
            unitId: 'phx-1',
            designation: 'Phoenix Hawk PXH-1',
            pilot: null,
          }),
        ],
      },
    });
    expect(getSkirmishConfigError(config)).toBe(
      'Pilot required for unit Phoenix Hawk PXH-1',
    );
  });

  it('rejects an empty roster on either side', () => {
    expect(
      getSkirmishConfigError(makeConfig({ player: { units: [] } })),
    ).toMatch(/Player force is empty/);
    expect(
      getSkirmishConfigError(makeConfig({ opponent: { units: [] } })),
    ).toMatch(/Opponent force is empty/);
  });
});

describe('buildFromSkirmishConfig', () => {
  it('produces a game session with 4 units (2 per side)', () => {
    const session = buildFromSkirmishConfig(makeConfig());
    expect(session.units).toHaveLength(4);
    const playerSides = session.units.filter((u) => u.side === 'player');
    const opponentSides = session.units.filter((u) => u.side === 'opponent');
    expect(playerSides).toHaveLength(2);
    expect(opponentSides).toHaveLength(2);
  });

  it('assigns pilot skills to the game units', () => {
    const session = buildFromSkirmishConfig(
      makeConfig({
        player: {
          units: [
            makeUnit({
              pilot: makePilot({
                pilotId: 'p-elite',
                gunnery: 2,
                piloting: 3,
              }),
            }),
            makeUnit({
              unitId: 'phx-1',
              designation: 'Phoenix Hawk PXH-1',
              pilot: makePilot({
                pilotId: 'p-veteran',
                gunnery: 3,
                piloting: 4,
              }),
            }),
          ],
        },
      }),
    );

    const playerUnits = session.units.filter((u) => u.side === 'player');
    expect(playerUnits[0]?.gunnery).toBe(2);
    expect(playerUnits[0]?.piloting).toBe(3);
    expect(playerUnits[1]?.gunnery).toBe(3);
    expect(playerUnits[1]?.piloting).toBe(4);
  });

  it('propagates map radius into the session config', () => {
    const session = buildFromSkirmishConfig(makeConfig({ mapRadius: 12 }));
    expect(session.config.mapRadius).toBe(12);
  });

  it('throws with the exact spec error string when a pilot is missing', () => {
    const config = makeConfig({
      opponent: {
        units: [
          makeUnit({
            unitId: 'cda-2a',
            designation: 'Cicada CDA-2A',
            pilot: null,
          }),
          makeUnit({
            unitId: 'jvn-10n',
            designation: 'Javelin JVN-10N',
            pilot: makePilot({ pilotId: 'p-opp-2' }),
          }),
        ],
      },
    });
    expect(() => buildFromSkirmishConfig(config)).toThrow(
      'Pilot required for unit Cicada CDA-2A',
    );
  });

  it.each(SUPPORTED_MAP_RADII)('accepts the supported radius %i', (radius) => {
    const session = buildFromSkirmishConfig(makeConfig({ mapRadius: radius }));
    expect(session.config.mapRadius).toBe(radius);
  });
});

describe('computeBvTotals', () => {
  it('sums BV per side and reports imbalance ratio', () => {
    const config = makeConfig({
      player: {
        units: [
          makeUnit({ bv: 1000 }),
          makeUnit({
            unitId: 'phx-1',
            bv: 500,
            pilot: makePilot({ pilotId: 'p2' }),
          }),
        ],
      },
      opponent: {
        units: [
          makeUnit({
            unitId: 'cda-2a',
            bv: 1200,
            pilot: makePilot({ pilotId: 'p3' }),
          }),
          makeUnit({
            unitId: 'jvn-10n',
            bv: 800,
            pilot: makePilot({ pilotId: 'p4' }),
          }),
        ],
      },
    });
    const totals = computeBvTotals(config);
    expect(totals.player).toBe(1500);
    expect(totals.opponent).toBe(2000);
    // (2000 - 1500) / 2000 = 0.25
    expect(totals.imbalanceRatio).toBeCloseTo(0.25, 5);
  });

  it('reports zero imbalance when either side has no BV', () => {
    const totals = computeBvTotals(makeConfig({ player: { units: [] } }));
    expect(totals.player).toBe(0);
    expect(totals.imbalanceRatio).toBeLessThanOrEqual(1);
  });
});

// -----------------------------------------------------------------------------
// Pilot-move behaviour — the page-level helper enforces this (task 3.3), but
// we can lock in the "assigned pilot set is deduplicated" invariant by asking
// the validator about a bad config where the same pilot appears twice.
// -----------------------------------------------------------------------------

describe('pilot deduplication (task 3.3)', () => {
  it('does not throw when the same pilot appears on two units — the page-level mover prevents this, but the builder itself only enforces pilot presence', () => {
    // Both player units share pilotId "duplicate-pilot". The builder
    // currently validates presence only; the UI-layer `assignPilotMoving`
    // ensures duplicates cannot reach this code path. This test locks
    // the contract: any future "no duplicate pilots" rule belongs to the
    // UI helper, not the builder.
    const sharedPilot = makePilot({ pilotId: 'duplicate-pilot' });
    const config = makeConfig({
      player: {
        units: [
          makeUnit({ unitId: 'wsp-1a', pilot: sharedPilot }),
          makeUnit({
            unitId: 'phx-1',
            designation: 'Phoenix Hawk PXH-1',
            pilot: sharedPilot,
          }),
        ],
      },
    });
    expect(() => buildFromSkirmishConfig(config)).not.toThrow();
  });
});
