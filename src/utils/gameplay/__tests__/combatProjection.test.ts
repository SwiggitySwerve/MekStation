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
  it('marks visible enemy target hexes with weapon range, arc, and to-hit data', () => {
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
      weapons: [makeWeapon()],
      combatState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        target: { side: GameSide.Opponent, position: { q: 2, r: 0 } },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'clear',
      hasTarget: true,
      targetVisibilityState: 'visible',
      attackable: true,
      weaponIdsInRange: ['medium-laser'],
      weaponIdsInArc: ['medium-laser'],
      weaponIdsAvailable: ['medium-laser'],
      weaponRangeOptions: [
        {
          weaponId: 'medium-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: true,
          environmentLegal: true,
          available: true,
        },
      ],
      targetUnitIds: ['target'],
      validTargetUnitIds: ['target'],
    });
    expect(targetHex?.toHitNumber).toBeGreaterThan(0);
    expect(targetHex?.attackInvalidReason).toBeUndefined();
  });

  it('projects source-pinned hull-down cover modifiers from combat state', () => {
    const grid = createHexGrid({ radius: 3 });
    const coverHex = grid.hexes.get('1,0');
    expect(coverHex).toBeDefined();
    grid.hexes.set('1,0', {
      ...coverHex!,
      terrain: terrainStringFromFeatures([
        { type: TerrainType.Building, level: 1 },
      ]),
    });
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
      weapons: [makeWeapon()],
      combatState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        target: {
          side: GameSide.Opponent,
          position: { q: 2, r: 0 },
          hullDown: true,
        },
      }),
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      attackable: true,
      targetPartialCover: true,
      targetCoverModifier: 1,
      targetHullDown: true,
      targetHullDownModifier: 2,
      targetHullDownReason: 'Target in hull-down position: +2',
      toHitNumber: 6,
    });
    expect(targetHex?.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Hull-Down', value: 2 }),
      ]),
    );
  });

  it('blocks hull-down attacker leg weapons while keeping upper-body weapons available', () => {
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
          id: 'leg-laser',
          name: 'Leg Laser',
          location: 'left_leg',
        }),
        makeWeapon({
          id: 'arm-laser',
          name: 'Arm Laser',
          location: 'right_arm',
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
      weaponIdsInRange: ['leg-laser', 'arm-laser'],
      weaponIdsInArc: ['leg-laser', 'arm-laser'],
      weaponIdsAvailable: ['arm-laser'],
      attackInvalidReason: undefined,
    });
    expect(targetHex?.weaponRangeOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          weaponId: 'leg-laser',
          available: false,
          blockedReason: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
        }),
        expect.objectContaining({
          weaponId: 'arm-laser',
          available: true,
          blockedReason: undefined,
        }),
      ]),
    );
  });

  it('marks all-leg hull-down attacker volleys invalid before commit', () => {
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
          id: 'leg-laser',
          name: 'Leg Laser',
          location: 'right_leg',
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
      attackInvalidDetails: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
      blockedReason: HULL_DOWN_LEG_WEAPON_BLOCKED_REASON,
    });
  });

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

  it('treats last-known fog contacts as intelligence instead of legal targets', () => {
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
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 1, r: 0 },
    });

    const targetHex = deriveCombatRangeHexes({
      attacker,
      hexes: Array.from(grid.hexes.values(), (hex) => hex.coord),
      grid,
      tokens: [attacker, target],
      weapons: [makeWeapon()],
    }).find((hex) => hex.hex.q === 1 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      targetVisibilityState: 'lastKnown',
      visibleTargetUnitIds: [],
      obscuredTargetUnitIds: ['target'],
      attackable: false,
      targetUnitIds: ['target'],
      validTargetUnitIds: [],
      visibilityBlockedReason: 'Last known contact is not currently visible',
      attackInvalidReason: 'TargetNotVisible',
    });
  });

  it('surfaces LOS blockers with the same invalid reason the commit path expects', () => {
    const grid = createHexGrid({ radius: 3 });
    grid.hexes.set('1,0', {
      coord: { q: 1, r: 0 },
      terrain: TerrainType.Clear,
      elevation: 2,
      occupantId: null,
    });
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
      weapons: [makeWeapon()],
    }).find((hex) => hex.hex.q === 2 && hex.hex.r === 0);

    expect(targetHex).toMatchObject({
      losState: 'blocked',
      attackable: false,
      attackInvalidReason: 'NoLineOfSight',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'elevation',
        reason: 'Blocked by elevation +2 at (1, 0)',
      },
    });
    expect(targetHex?.lineOfSightBlockerReason).toBe(
      'Blocked by elevation +2 at (1, 0)',
    );
    expect(targetHex?.attackInvalidDetails).toBe(
      'Blocked by elevation +2 at (1, 0)',
    );
  });
});

describe('deriveValidWeaponTargetIds', () => {
  it('returns only targets that the shared combat projection marks legal', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
    });
    const visibleTarget = makeToken({
      unitId: 'visible-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });
    const lastKnownTarget = makeToken({
      unitId: 'last-known-target',
      side: GameSide.Opponent,
      position: { q: 3, r: 0 },
      fogStatus: 'lastKnown',
      lastKnownPosition: { q: 1, r: 0 },
    });

    const result = deriveValidWeaponTargetIds({
      currentState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        'visible-target': {
          side: GameSide.Opponent,
          position: { q: 2, r: 0 },
        },
        'last-known-target': {
          side: GameSide.Opponent,
          position: { q: 3, r: 0 },
        },
      }),
      selectedUnitId: 'attacker',
      tokens: [attacker, visibleTarget, lastKnownTarget],
      mapRadius: 3,
      grid,
      unitWeapons: { attacker: [makeWeapon()] },
    });

    expect(result).toEqual(['visible-target']);
  });

  it('filters valid targets by selected weapon ids when provided', () => {
    const grid = createHexGrid({ radius: 3 });
    const attacker = makeToken({
      unitId: 'attacker',
      isSelected: true,
      position: { q: 0, r: 0 },
      facing: Facing.Southeast,
    });
    const visibleTarget = makeToken({
      unitId: 'visible-target',
      side: GameSide.Opponent,
      position: { q: 2, r: 0 },
    });

    const result = deriveValidWeaponTargetIds({
      currentState: makeCombatState({
        attacker: { side: GameSide.Player, position: { q: 0, r: 0 } },
        'visible-target': {
          side: GameSide.Opponent,
          position: { q: 2, r: 0 },
        },
      }),
      selectedUnitId: 'attacker',
      tokens: [attacker, visibleTarget],
      mapRadius: 3,
      grid,
      unitWeapons: {
        attacker: [
          makeWeapon({
            id: 'small-laser',
            ranges: { short: 1, medium: 1, long: 1 },
          }),
          makeWeapon({
            id: 'medium-laser',
            ranges: { short: 2, medium: 4, long: 6 },
          }),
        ],
      },
      selectedWeaponIds: ['small-laser'],
    });

    expect(result).toEqual([]);
  });
});
