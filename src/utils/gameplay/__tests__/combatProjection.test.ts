import type { IGameState, IUnitToken, IWeaponStatus } from '@/types/gameplay';

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

import { deriveCombatRangeHexes } from '../combatProjection';
import { deriveValidWeaponTargetIds } from '../combatTargetIds';

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
      targetUnitIds: ['target'],
      validTargetUnitIds: ['target'],
    });
    expect(targetHex?.toHitNumber).toBeGreaterThan(0);
    expect(targetHex?.attackInvalidReason).toBeUndefined();
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
          ammoConsumed: 0,
        },
        {
          weaponId: 'ac-5',
          weaponName: 'AC/5',
          heat: 1,
          ammoConsumed: 1,
          ammoRemaining: 12,
        },
      ],
    });
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
      attackInvalidReason: 'OutOfArc',
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
    });
    expect(targetHex?.lineOfSightBlockerReason).toBeTruthy();
    expect(targetHex?.attackInvalidDetails).toBeTruthy();
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
});
