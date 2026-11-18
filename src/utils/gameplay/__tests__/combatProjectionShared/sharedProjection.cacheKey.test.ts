import { isDeepStrictEqual } from 'node:util';

import type {
  ICombatRangeHex,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ICombatProjectionInput } from '@/utils/gameplay/combatProjection.types';

import {
  Facing,
  GameSide,
  MovementType,
  TerrainType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

import { deriveCombatRangeHexes } from '../../combatProjection.rangeHex';
import { deriveSharedCombatRangeHexes } from '../../combatProjection.shared';
import { coordToKey } from '../../hexMath';
import {
  allHexes,
  makeCombatState,
  WEAPON_TEMPLATES,
  tokensFor,
  type IUnitSpec,
} from './fixtures';
import { referenceDeriveCombatRangeHexes } from './rangeHex.reference';

jest.mock('../../combatProjection.rangeHex', () => {
  const actual = jest.requireActual('../../combatProjection.rangeHex');
  return {
    ...actual,
    deriveCombatRangeHexes: jest.fn(actual.deriveCombatRangeHexes),
  };
});

const coreProjection = deriveCombatRangeHexes as jest.MockedFunction<
  typeof deriveCombatRangeHexes
>;

/**
 * Each input the projection reads must reach the cache key: priming the
 * cache with the base input and then changing one input must give the
 * reference result for the changed input, which differs from the base.
 */

const RADIUS = 6;

function unit(unitId: string, side: GameSide, q: number, r: number): IUnitSpec {
  return {
    unitId,
    side,
    position: { q, r },
    facing: Facing.Southeast,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    prone: false,
    destroyed: false,
  };
}

// Two enemies stacked at (3,0) so the selected target changes which unit
// the hex projects; a third alone at (-2,4).
const UNITS: readonly IUnitSpec[] = [
  unit('attacker', GameSide.Player, 0, 0),
  unit('enemy-a', GameSide.Opponent, 3, 0),
  unit('enemy-b', GameSide.Opponent, 3, 0),
  unit('enemy-c', GameSide.Opponent, -2, 4),
];

const WEAPONS: readonly IWeaponStatus[] = WEAPON_TEMPLATES;

function baseInput(): ICombatProjectionInput & {
  readonly attacker: IUnitToken;
  readonly tokens: readonly IUnitToken[];
  readonly grid: IHexGrid;
} {
  const grid = createHexGrid({ radius: RADIUS });
  const tokens = tokensFor(UNITS, 'attacker');
  return {
    attacker: tokens[0],
    targetUnitId: null,
    hexes: allHexes(grid),
    grid,
    tokens,
    weapons: WEAPONS,
    combatState: makeCombatState(UNITS),
  };
}

function withToken(
  tokens: readonly IUnitToken[],
  unitId: string,
  change: Partial<IUnitToken>,
): IUnitToken[] {
  return tokens.map((token) =>
    token.unitId === unitId ? ({ ...token, ...change } as IUnitToken) : token,
  );
}

type Change = (base: ReturnType<typeof baseInput>) => ICombatProjectionInput;

const CHANGES: Record<string, Change> = {
  'attacker position': (base) => {
    const tokens = withToken(base.tokens, 'attacker', {
      position: { q: -1, r: -1 },
    });
    return { ...base, attacker: tokens[0], tokens };
  },
  'attacker facing': (base) => {
    const tokens = withToken(base.tokens, 'attacker', {
      facing: Facing.Northwest,
    });
    return { ...base, attacker: tokens[0], tokens };
  },
  'attacker token only, tokens unchanged': (base) => ({
    ...base,
    attacker: { ...base.attacker, facing: Facing.Northwest },
  }),
  'selected weapon': (base) => ({
    ...base,
    weapons: base.weapons.filter((weapon) => weapon.id === 'lrm-10'),
  }),
  'weapon state': (base) => ({
    ...base,
    weapons: base.weapons.map((weapon, index) =>
      index === 0 ? { ...weapon, destroyed: true } : weapon,
    ),
  }),
  target: (base) => ({ ...base, targetUnitId: 'enemy-b' }),
  'terrain, same grid object': (base) => {
    const key = coordToKey({ q: 2, r: 0 });
    const hex = base.grid.hexes.get(key)!;
    base.grid.hexes.set(key, {
      ...hex,
      terrain: TerrainType.HeavyWoods,
      elevation: 3,
    });
    return base;
  },
  'terrain, new grid': (base) => {
    const grid: IHexGrid = {
      ...base.grid,
      hexes: new Map(base.grid.hexes),
    };
    const key = coordToKey({ q: 1, r: 0 });
    grid.hexes.set(key, { ...grid.hexes.get(key)!, elevation: 4 });
    return { ...base, grid };
  },
  'unit position': (base) => ({
    ...base,
    tokens: withToken(base.tokens, 'enemy-c', { position: { q: 1, r: 1 } }),
  }),
  'unit fog': (base) => ({
    ...base,
    tokens: withToken(base.tokens, 'enemy-a', { fogStatus: 'hidden' }),
  }),
  'combat state': (base) => ({
    ...base,
    combatState: makeCombatState(
      UNITS.map((spec) =>
        spec.unitId === 'attacker'
          ? {
              ...spec,
              movementThisTurn: MovementType.Run,
              hexesMovedThisTurn: 5,
            }
          : spec,
      ),
    ),
  }),
  hexes: (base) => ({ ...base, hexes: base.hexes.slice(0, -7) }),
};

describe('shared projection cache key (perf P5)', () => {
  it.each(Object.keys(CHANGES))(
    'a change of %s misses the cache and gives the reference result',
    (name) => {
      const base = baseInput();
      const primed = deriveSharedCombatRangeHexes(base);
      expect(primed).toStrictEqual(referenceDeriveCombatRangeHexes(base));

      const changed = CHANGES[name](base);
      const expected: readonly ICombatRangeHex[] =
        referenceDeriveCombatRangeHexes(changed);
      const actual = deriveSharedCombatRangeHexes(changed);

      expect(actual).toStrictEqual(expected);
      // The change matters on this board, so a stale hit would be caught.
      expect(isDeepStrictEqual(expected, primed)).toBe(false);
    },
  );

  it('interaction flags alone hit the cache and still match the reference', () => {
    const base = baseInput();
    const primed = deriveSharedCombatRangeHexes(base);
    const flagged = {
      ...base,
      tokens: base.tokens.map((token) => ({
        ...token,
        isValidTarget: true,
        isActiveTarget: token.unitId === 'enemy-a',
        isSecondaryTarget: token.unitId === 'enemy-c',
        attackInfeasibleReason: 'no weapon in arc',
      })),
    };

    const shared = deriveSharedCombatRangeHexes(flagged);
    expect(shared).toBe(primed);
    expect(shared).toStrictEqual(referenceDeriveCombatRangeHexes(flagged));
  });

  describe('same state object, one non-flag token field changed (C4 S1)', () => {
    // Every IUnitToken field except the interaction flags, across all token
    // variants. The mapped type makes a new token field a type error here
    // until it gets a case, so no field can silently fall out of the key.
    // These fields can change while the combat state object stays the same
    // (lastKnownPosition comes from client fog memory, for example).
    const FIELD_CHANGES: { readonly [K in NonFlagTokenField]: unknown } = {
      unitId: 'enemy-renamed',
      name: 'Renamed',
      side: GameSide.Player,
      position: { q: 1, r: -2 },
      lastKnownPosition: { q: 2, r: 1 },
      facing: Facing.North,
      fogStatus: 'hidden',
      sensorRange: 7,
      isDestroyed: true,
      isProne: true,
      designation: 'ZZZ',
      unitType: TokenUnitType.Vehicle,
      weightClass: 'assault',
      chassisArchetype: 'humanoid',
      isQuad: true,
      isLAM: true,
      armorPipState: { front: 1 },
      vehicleMotionType: VehicleMotionType.Hover,
      turretFacing: 3,
      altitude: 5,
      velocity: 4,
      mountedOn: 'enemy-a',
      passengerBadge: { hostTokenId: 'enemy-a', slot: 'back' },
      trooperCount: 3,
      jumpActive: true,
      infantryCount: 20,
      platoonCount: 1,
      infantryMotiveType: 'jump',
      infantrySpecialization: 'anti_mech',
      protoCount: 5,
      isGlider: true,
      hasMainGun: true,
    };

    // enemy-c is a last-known ghost so its lastKnownPosition is read.
    function ghostBase(): ReturnType<typeof baseInput> {
      const base = baseInput();
      return {
        ...base,
        tokens: withToken(base.tokens, 'enemy-c', {
          fogStatus: 'lastKnown',
          lastKnownPosition: { q: -2, r: 3 },
        }),
      };
    }

    function expectChanged(
      token: IUnitToken,
      field: NonFlagTokenField,
      value: unknown,
    ): void {
      expect(
        isDeepStrictEqual(
          (token as unknown as Record<string, unknown>)[field],
          value,
        ),
      ).toBe(false);
    }

    function expectMissMatchingReference(
      primedInput: ICombatProjectionInput,
      changed: ICombatProjectionInput,
    ): {
      primed: readonly ICombatRangeHex[];
      actual: readonly ICombatRangeHex[];
    } {
      const primed = deriveSharedCombatRangeHexes(primedInput);
      expect(deriveSharedCombatRangeHexes(primedInput)).toBe(primed);
      coreProjection.mockClear();
      const actual = deriveSharedCombatRangeHexes(changed);
      // A miss: the uncached projection ran over the whole map again.
      expect(
        coreProjection.mock.calls.filter(
          ([input]) => input.hexes.length === changed.hexes.length,
        ),
      ).toHaveLength(1);
      expect(actual).toStrictEqual(referenceDeriveCombatRangeHexes(changed));
      return { primed, actual };
    }

    it.each(Object.keys(FIELD_CHANGES) as NonFlagTokenField[])(
      'enemy token field %s',
      (field) => {
        const base = ghostBase();
        const enemy = base.tokens.find((token) => token.unitId === 'enemy-c')!;
        expectChanged(enemy, field, FIELD_CHANGES[field]);
        expectMissMatchingReference(base, {
          ...base,
          tokens: withToken(base.tokens, 'enemy-c', {
            [field]: FIELD_CHANGES[field],
          } as Partial<IUnitToken>),
        });
      },
    );

    it.each(Object.keys(FIELD_CHANGES) as NonFlagTokenField[])(
      'attacker token field %s',
      (field) => {
        const base = ghostBase();
        // The attacker is already on the player side.
        const value =
          field === 'side' ? GameSide.Opponent : FIELD_CHANGES[field];
        expectChanged(base.attacker, field, value);
        const attacker = { ...base.attacker, [field]: value } as IUnitToken;
        expectMissMatchingReference(base, {
          ...base,
          attacker,
          tokens: [attacker, ...base.tokens.slice(1)],
        });
      },
    );

    it.each([
      ['isDestroyed', 'enemy-a', { isDestroyed: true }],
      ['lastKnownPosition', 'enemy-c', { lastKnownPosition: { q: 2, r: 1 } }],
      ['side', 'enemy-a', { side: GameSide.Player }],
      ['fogStatus', 'enemy-a', { fogStatus: 'lastKnown' }],
    ] as const)(
      '%s changes the projection, so a stale hit would be wrong',
      (_field, unitId, change) => {
        const base = ghostBase();
        const { primed, actual } = expectMissMatchingReference(base, {
          ...base,
          tokens: withToken(base.tokens, unitId, change as Partial<IUnitToken>),
        });
        expect(isDeepStrictEqual(actual, primed)).toBe(false);
      },
    );
  });
});

type InteractionFlag =
  | 'isSelected'
  | 'isValidTarget'
  | 'isActiveTarget'
  | 'isSecondaryTarget'
  | 'attackInfeasibleReason';
type KeysOfUnion<T> = T extends unknown ? keyof T : never;
type NonFlagTokenField = Exclude<KeysOfUnion<IUnitToken>, InteractionFlag>;
