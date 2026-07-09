/**
 * InteractiveSession recovery-path tests — `fix-recovered-session-adapted-units`
 * (closes playtest gap #2).
 *
 * Asserts the recovery path's `fromSessionAsync` rebuilds the per-unit
 * adapted-state maps the engine needs to drive move + attack actions.
 * Pre-fix, `fromSession` left adapted-units empty and any move/attack
 * on a recovered session threw because the per-unit weapon / movement
 * capability lookup hit `undefined`.
 *
 * The bootstrap path's `weaponsByUnit` / `movementByUnit` / pilot-skill
 * maps are the parity reference — the recovery path must populate the
 * same shape so a session recovered after a server restart is
 * indistinguishable from a freshly-bootstrapped one with the same
 * units (spec scenario "Recovered session adapted-units match
 * bootstrap parity").
 */

import type { IWeapon } from '@/simulation/ai/types';

import type { IAdaptedUnit } from '../types';

// Mock the CompendiumAdapter so the test is deterministic and doesn't
// depend on the on-disk catalog. The recovery path consumes `adaptUnit`
// the same way the bootstrap path does, so mocking here proves the
// recovery integration end-to-end (the adapter's own behavior is
// covered by CompendiumAdapter.test.ts).
jest.mock('../adapters/CompendiumAdapter', () => {
  const mockAdaptUnit = jest.fn();
  return {
    adaptUnit: mockAdaptUnit,
    __mockAdaptUnit: mockAdaptUnit,
  };
});

import {
  GameSide,
  LockState,
  type IGameSession,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import { createGameSession, startGame } from '@/utils/gameplay/gameSession';

import { InteractiveSession } from '../InteractiveSession';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adapterModule = require('../adapters/CompendiumAdapter') as {
  __mockAdaptUnit: jest.Mock;
};
const mockAdaptUnit = adapterModule.__mockAdaptUnit;

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -2 } : { q: 0, r: 2 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    startingInternalStructure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

// Older sessions may have game-unit ids equal to catalog refs. The
// recovery path must also support newer deployed ids whose `unitRef`
// remains the catalog lookup key.
function makeFourUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'atlas-as7-d',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'atlas-as7-d',
      pilotRef: 'pilot-p1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'marauder-mad-3r',
      name: 'Marauder',
      side: GameSide.Player,
      unitRef: 'marauder-mad-3r',
      pilotRef: 'pilot-p2',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'warhammer-whm-6r',
      name: 'Warhammer',
      side: GameSide.Opponent,
      unitRef: 'warhammer-whm-6r',
      pilotRef: 'pilot-o1',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'rifleman-rfl-3n',
      name: 'Rifleman',
      side: GameSide.Opponent,
      unitRef: 'rifleman-rfl-3n',
      pilotRef: 'pilot-o2',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function makeSessionWith(units: readonly IGameUnit[]): IGameSession {
  const session = createGameSession(
    {
      mapRadius: 7,
      turnLimit: 30,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    units,
  );
  return startGame(session, GameSide.Player);
}

describe('InteractiveSession.fromSessionAsync — gap #2 recovery parity', () => {
  beforeEach(() => {
    mockAdaptUnit.mockReset();
  });

  it('rebuilds per-unit adapted state for every game unit (bootstrap parity)', async () => {
    // Stub adaptUnit to return a fresh adapted unit per call so the
    // recovery path's derive loop has a deterministic catalog.
    mockAdaptUnit.mockImplementation(
      async (
        _unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) => {
        return makeAdaptedUnit(_unitRef, options.side);
      },
    );

    const units = makeFourUnits();
    const session = makeSessionWith(units);

    const recovered = await InteractiveSession.fromSessionAsync(session);

    // The recovery path called adaptUnit once per game unit.
    expect(mockAdaptUnit).toHaveBeenCalledTimes(4);

    // Each unit's adapted state is now reachable from the engine.
    // getMovementCapability and getAvailableActions returning non-null
    // is the proof that weaponsByUnit / movementByUnit were populated.
    for (const u of units) {
      const cap = recovered.getMovementCapability(u.id);
      // The bootstrap path's buildInteractiveSessionUnitMaps keys the
      // movementByUnit map by IGameUnit.id (not the adapted unit's id),
      // so the lookup uses the game-unit id. A populated map returns
      // walk/run/jump MP > 0; an empty map returns null.
      expect(cap).not.toBeNull();
      expect(cap?.walkMP).toBeGreaterThan(0);
    }
  });

  it('the bootstrap session and the recovered session have parity adapted-units length', async () => {
    mockAdaptUnit.mockImplementation(
      async (
        unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) => {
        return makeAdaptedUnit(unitRef, options.side);
      },
    );

    const units = makeFourUnits();
    const session = makeSessionWith(units);
    const recovered = await InteractiveSession.fromSessionAsync(session);

    // The adapted-units count equals the game-unit count — every unit
    // got an adapted entry.
    expect(mockAdaptUnit).toHaveBeenCalledTimes(units.length);

    // Each unit's movement capability lookup is reachable — proves the
    // recovery path's weaponsByUnit / movementByUnit / etc. populated
    // for every game unit.
    for (const u of units) {
      expect(recovered.getMovementCapability(u.id)).not.toBeNull();
    }
  });

  it('aliases recovered adapted-unit ids to deployed game-unit ids while looking up canonical unitRefs', async () => {
    mockAdaptUnit.mockImplementation(
      async (
        unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) => {
        return makeAdaptedUnit(unitRef, options.side);
      },
    );

    const units: readonly IGameUnit[] = [
      {
        id: 'player-1-atlas-as7-d',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-p1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'opponent-1-atlas-as7-d',
        name: 'Atlas',
        side: GameSide.Opponent,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-o1',
        gunnery: 4,
        piloting: 5,
      },
    ];
    const session = makeSessionWith(units);

    const recovered = await InteractiveSession.fromSessionAsync(session);

    expect(mockAdaptUnit).toHaveBeenNthCalledWith(
      1,
      'atlas-as7-d',
      expect.objectContaining({ side: GameSide.Player }),
    );
    expect(mockAdaptUnit).toHaveBeenNthCalledWith(
      2,
      'atlas-as7-d',
      expect.objectContaining({ side: GameSide.Opponent }),
    );
    expect(
      recovered.getMovementCapability('player-1-atlas-as7-d'),
    ).not.toBeNull();
    expect(
      recovered.getMovementCapability('opponent-1-atlas-as7-d'),
    ).not.toBeNull();
    expect(recovered.getMovementCapability('atlas-as7-d')).toBeNull();
  });

  it('a unit whose unitRef is not in the catalog is skipped with a warning', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      // adaptUnit returns null for the second unit's unitRef ("missing").
      mockAdaptUnit.mockImplementation(
        async (
          unitRef: string,
          options: { side: GameSide } = { side: GameSide.Player },
        ) => {
          if (unitRef === 'missing') return null;
          return makeAdaptedUnit(unitRef, options.side);
        },
      );

      const units: IGameUnit[] = [
        {
          id: 'atlas-as7-d',
          name: 'Atlas',
          side: GameSide.Player,
          unitRef: 'atlas-as7-d',
          pilotRef: 'pilot-p1',
          gunnery: 4,
          piloting: 5,
        },
        {
          id: 'missing-unit',
          name: 'Missing',
          side: GameSide.Player,
          unitRef: 'missing',
          pilotRef: 'pilot-p2',
          gunnery: 4,
          piloting: 5,
        },
      ];
      const session = makeSessionWith(units);

      const recovered = await InteractiveSession.fromSessionAsync(session);

      // The known unit still has movement; the missing one does not.
      expect(recovered.getMovementCapability('atlas-as7-d')).not.toBeNull();
      expect(recovered.getMovementCapability('missing-unit')).toBeNull();

      // A warning fired identifying the offending caller and unit.
      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toMatch(/missing-unit/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/missing/);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('the legacy fromSession (sync) does NOT populate adapted-units (regression baseline)', () => {
    // Confirm the pre-fix behavior is preserved on the legacy path. The
    // sync fromSession leaves the maps empty; getMovementCapability
    // returns null. This pins the regression baseline so a future
    // refactor doesn't silently drop the async path.
    const units = makeFourUnits();
    const session = makeSessionWith(units);

    const legacy = InteractiveSession.fromSession(session);

    for (const u of units) {
      expect(legacy.getMovementCapability(u.id)).toBeNull();
    }
  });

  it('bootstrap behavior is unaffected (the derive helper only runs in the async path)', async () => {
    // Spec scenario "Bootstrap path is unaffected" — instantiating
    // InteractiveSession via the constructor (bootstrap) does NOT call
    // the recovery-path derive helper. This is enforced structurally:
    // the constructor only sees pre-built `playerUnits` / `opponentUnits`
    // arrays; the derive helper only runs when `fromSessionAsync` is
    // the entry point.
    //
    // Concretely: a constructor call doesn't invoke the (mocked)
    // adaptUnit module, so the mock stays at 0 invocations.
    mockAdaptUnit.mockClear();
    const playerAdapted = [makeAdaptedUnit('p1', GameSide.Player)];
    const opponentAdapted = [makeAdaptedUnit('o1', GameSide.Opponent)];
    const units: IGameUnit[] = [
      {
        id: 'p1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-p1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'o1',
        name: 'Warhammer',
        side: GameSide.Opponent,
        unitRef: 'warhammer-whm-6r',
        pilotRef: 'pilot-o1',
        gunnery: 4,
        piloting: 5,
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SeededRandom } = require('@/simulation/core/SeededRandom') as {
      SeededRandom: new (seed: number) => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMinimalGrid } = require('../GameEngine.helpers') as {
      createMinimalGrid: (radius: number) => unknown;
    };

    const fromBootstrap = new InteractiveSession(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      7,
      30,
      new SeededRandom(0) as never,
      createMinimalGrid(7) as never,
      playerAdapted,
      opponentAdapted,
      units,
    );

    expect(mockAdaptUnit).not.toHaveBeenCalled();
    expect(fromBootstrap.getMovementCapability('p1')).not.toBeNull();
    expect(fromBootstrap.getMovementCapability('o1')).not.toBeNull();
  });
});
