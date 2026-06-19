import type { IGameState, IUnitToken, IWeaponStatus } from '@/types/gameplay';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import {
  Facing,
  FiringArc,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  TerrainType,
  TokenUnitType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';
import { getTwoD6HitProbability } from '@/utils/gameplay/toHit/forecast';

import { deriveCombatRangeHexes } from '../combatProjection';
import { deriveValidWeaponTargetIds } from '../combatTargetIds';
import {
  HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
  HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
} from '../hullDownRestrictions';

function makeToken(overrides: Partial<IUnitToken>): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeWeapon(overrides: Partial<IWeaponStatus> = {}): IWeaponStatus {
  return {
    id: 'medium-laser',
    name: 'Medium Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 3,
    damage: 5,
    ranges: { short: 2, medium: 4, long: 6 },
    ...overrides,
  };
}

function makeCombatState(
  units: Record<
    string,
    {
      readonly side: GameSide;
      readonly position: { readonly q: number; readonly r: number };
      readonly gunnery?: number;
      readonly heat?: number;
      readonly movementThisTurn?: MovementType;
      readonly hexesMovedThisTurn?: number;
      readonly prone?: boolean;
      readonly hullDown?: boolean;
      readonly shutdown?: boolean;
      readonly destroyed?: boolean;
    }
  >,
): IGameState {
  return {
    gameId: 'combat-projection-test',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    activationIndex: 0,
    turnEvents: [],
    units: Object.fromEntries(
      Object.entries(units).map(([unitId, unit]) => [
        unitId,
        {
          id: unitId,
          side: unit.side,
          position: unit.position,
          facing: Facing.North,
          heat: unit.heat ?? 0,
          movementThisTurn: unit.movementThisTurn ?? MovementType.Stationary,
          hexesMovedThisTurn: unit.hexesMovedThisTurn ?? 0,
          prone: unit.prone,
          hullDown: unit.hullDown,
          destroyed: unit.destroyed ?? false,
          shutdown: unit.shutdown ?? false,
          hasRetreated: false,
          gunnery: unit.gunnery ?? 4,
        },
      ]),
    ) as IGameState['units'],
  };
}

describe('deriveCombatRangeHexes', () => {
  it('blocks hull-down vehicle front weapons unless firing indirectly', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      unitType: TokenUnitType.Vehicle,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'front-ac',
          name: 'Front AC/5',
          location: 'Front',
          vehicleMountLocation: VehicleLocation.FRONT,
        }),
        makeWeapon({
          id: 'front-lrm',
          name: 'Front LRM-5',
          location: 'Front',
          mode: 'Indirect',
          vehicleMountLocation: VehicleLocation.FRONT,
        }),
      ],
      combatState: makeCombatState({
        attacker: {
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          hullDown: true,
        },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      weaponIdsInRange: ['front-ac', 'front-lrm'],
      weaponIdsInArc: ['front-ac', 'front-lrm'],
      weaponIdsAvailable: ['front-lrm'],
      attackInvalidReason: undefined,
    });
    expect(targetHex?.weaponRangeOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'front-ac',
          available: false,
          blockedReason: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
        }),
        expect.objectContaining({
          weaponId: 'front-lrm',
          available: true,
          blockedReason: undefined,
        }),
      ]),
    );
  });

  it('marks all-front hull-down vehicle direct volleys invalid before commit', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      unitType: TokenUnitType.Vehicle,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'front-ac',
          name: 'Front AC/5',
          location: 'Front',
          vehicleMountLocation: VehicleLocation.FRONT,
        }),
      ],
      combatState: makeCombatState({
        attacker: {
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          hullDown: true,
        },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      inRange: true,
      inArc: true,
      attackable: false,
      weaponIdsAvailable: [],
      attackInvalidReason: 'InvalidTarget',
      attackInvalidDetails: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
      blockedReason: HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON,
    });
  });

  it('projects available weapon heat and ammo impact from weapon statuses', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({ id: 'medium-laser', name: 'Medium Laser', heat: 3 }),
        makeWeapon({
          id: 'ac-5',
          name: 'AC/5',
          heat: 1,
          ammoRemaining: 12,
        }),
      ],
      combatState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      weaponIdsAvailable: ['medium-laser', 'ac-5'],
      availableWeaponHeat: 4,
      availableWeaponImpacts: [
        {
          weaponId: 'medium-laser',
          weaponName: 'Medium Laser',
          heat: 3,
          damage: 5,
          ammoConsumed: 0,
        },
        {
          weaponId: 'ac-5',
          weaponName: 'AC/5',
          heat: 1,
          damage: 5,
          ammoConsumed: 1,
          ammoRemaining: 12,
        },
      ],
      availableWeaponDamage: 10,
    });
    expect(targetHex?.expectedDamage).toBeCloseTo(
      10 * (getTwoD6HitProbability(targetHex!.toHitNumber!) / 100),
      4,
    );
  });

  it('sums expected damage from each available weapon target number', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'short-laser',
          ranges: { short: 2, medium: 4, long: 6 },
        }),
        makeWeapon({
          id: 'long-bracket-laser',
          ranges: { short: 1, medium: 1, long: 2 },
        }),
      ],
      combatState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      toHitNumber: 4,
      availableWeaponDamage: 10,
      weaponRangeOptions: [
        expect.objectContaining({
          weaponId: 'short-laser',
          rangeBracket: 'short',
          toHitNumber: 4,
          expectedDamage: 4.6,
        }),
        expect.objectContaining({
          weaponId: 'long-bracket-laser',
          rangeBracket: 'long',
          toHitNumber: 8,
          expectedDamage: 2.1,
        }),
      ],
    });
    expect(targetHex?.expectedDamage).toBeCloseTo(
      5 * (getTwoD6HitProbability(4) / 100) +
        5 * (getTwoD6HitProbability(8) / 100),
      4,
    );
  });

  it('keeps out-of-range targets explainable instead of making them disappear', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [makeWeapon({ ranges: { short: 1, medium: 1, long: 2 } })],
    }).find((hex) => hex.hex.q === 3 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      distance: 3,
      rangeBracket: 'out_of_range',
      inRange: false,
      attackable: false,
      targetUnitIds: ['target'],
      validTargetUnitIds: [],
      attackInvalidReason: 'OutOfRange',
      attackInvalidDetails:
        "Target at 3 hexes is outside the selected weapons' range",
      blockedReason: 'Out of weapon range',
    });
  });
});
