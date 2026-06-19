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
  it('uses mounted firing arcs when deciding which weapons are available', () => {
    const grid = createHexGrid({ radius: 2 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 0, r: -1 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'rear-laser',
          mountingArc: FiringArc.Rear,
        }),
      ],
    }).find((hex) => hex.hex.q === 0 && hex.hex.r === -1);

    expect(targetHex).toMatchObject({
      inRange: true,
      inArc: false,
      attackable: false,
      weaponIdsInRange: ['rear-laser'],
      weaponIdsInArc: [],
      weaponIdsAvailable: [],
      weaponRangeOptions: [
        {
          weaponId: 'rear-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: false,
          environmentLegal: true,
          available: false,
          blockedReason: 'out of front arc',
        },
      ],
      attackInvalidReason: 'OutOfArc',
    });
  });

  it('uses represented multi-arc mounts when deciding weapon availability', () => {
    const grid = createHexGrid({ radius: 2 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const leftTarget = makeToken({
      unitId: 'left-target',
      side: GameSide.Opponent,
      position: { q: -1, r: 1 },
    });
    const rearTarget = makeToken({
      unitId: 'rear-target',
      side: GameSide.Opponent,
      position: { q: 0, r: 1 },
    });

    const projection = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, leftTarget, rearTarget],
      weapons: [
        makeWeapon({
          id: 'left-sponson-laser',
          mountingArcs: [FiringArc.Front, FiringArc.Left],
        }),
      ],
    });

    const leftHex = projection.find(
      (hex) => hex.hex.q === -1 && hex.hex.r === 1,
    );
    const rearHex = projection.find(
      (hex) => hex.hex.q === 0 && hex.hex.r === 1,
    );

    expect(leftHex).toMatchObject({
      firingArc: 'left-side',
      inArc: true,
      attackable: true,
      weaponIdsAvailable: ['left-sponson-laser'],
    });
    expect(rearHex).toMatchObject({
      firingArc: 'rear',
      inArc: false,
      attackable: false,
      weaponIdsAvailable: [],
      attackInvalidReason: 'OutOfArc',
    });
  });

  it('keeps mixed per-weapon range and arc options explainable', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    const target = makeToken({
      unitId: 'target',
      side: GameSide.Opponent,
      position: { q: 0, r: -2 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [
        makeWeapon({
          id: 'front-laser',
          mountingArc: FiringArc.Front,
        }),
        makeWeapon({
          id: 'rear-laser',
          mountingArc: FiringArc.Rear,
        }),
        makeWeapon({
          id: 'small-laser',
          ranges: { short: 1, medium: 1, long: 1 },
        }),
      ],
    }).find((hex) => hex.hex.q === 0 && hex.hex.r === -2);

    expect(targetHex).toMatchObject({
      attackable: true,
      weaponIdsAvailable: ['front-laser'],
      weaponRangeOptions: [
        {
          weaponId: 'front-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: true,
          available: true,
        },
        {
          weaponId: 'rear-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: false,
          environmentLegal: true,
          available: false,
          blockedReason: 'out of front arc',
        },
        {
          weaponId: 'small-laser',
          rangeBracket: 'out_of_range',
          inRange: false,
          inArc: true,
          environmentLegal: true,
          available: false,
          blockedReason: 'out of range',
        },
      ],
    });
  });

  it('marks per-weapon represented water legality separately', () => {
    const grid = createHexGrid({ radius: 3 });
    for (const key of ['0,0', '1,0', '2,0']) {
      const hex = grid.hexes.get(key);
      expect(hex).toBeDefined();
      grid.hexes.set(key, {
        ...hex!,
        terrain: 'water:2',
      });
    }
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
        makeWeapon({ id: 'medium-laser' }),
        makeWeapon({ id: 'torpedo', name: 'Torpedo', isTorpedo: true }),
      ],
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      weaponIdsAvailable: ['torpedo'],
      weaponRangeOptions: [
        {
          weaponId: 'medium-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: false,
          available: false,
          blockedReason: 'Target underwater, but not weapon.',
        },
        {
          weaponId: 'torpedo',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: true,
          available: true,
        },
      ],
    });
  });

  it('rejects visible targets when every selected ammo-fed weapon is empty', () => {
    const grid = createHexGrid({ radius: 2 });
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
          id: 'dry-ac-5',
          name: 'AC/5',
          ammoRemaining: 0,
        }),
      ],
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: false,
      weaponIdsAvailable: [],
      weaponRangeOptions: [
        expect.objectContaining({
          weaponId: 'dry-ac-5',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: true,
          available: false,
          blockedReason: 'No matching non-empty ammo bin for "AC/5"',
        }),
      ],
      attackInvalidReason: 'OutOfAmmo',
      attackInvalidDetails: 'No matching non-empty ammo bin for "AC/5"',
      blockedReason: 'No matching non-empty ammo bin for "AC/5"',
    });
  });
});
