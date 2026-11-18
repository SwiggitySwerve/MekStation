import { isDeepStrictEqual } from 'node:util';

import type {
  ICombatRangeHex,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ICombatProjectionInput } from '@/utils/gameplay/combatProjection.types';

import { Facing, GameSide, MovementType, TerrainType } from '@/types/gameplay';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

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
});
