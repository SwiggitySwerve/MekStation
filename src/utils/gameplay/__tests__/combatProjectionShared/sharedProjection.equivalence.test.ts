import { isDeepStrictEqual } from 'node:util';

import type {
  ICombatRangeHex,
  IGameState,
  IHexGrid,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';

import { Facing, GameSide, TerrainType } from '@/types/gameplay';

import { deriveCombatRangeHexes } from '../../combatProjection.rangeHex';
import { deriveSharedCombatRangeHexes } from '../../combatProjection.shared';
import { selectCombatProjectionWeapons } from '../../combatProjection.weaponSelection';
import { deriveValidWeaponTargetIds } from '../../combatTargetIds';
import { hexesInRange } from '../../hexMath';
import {
  BOARD_KINDS,
  allHexes,
  coordToKey,
  makeBoard,
  makeCombatState,
  makeUnits,
  makeWeapons,
  pick,
  seededRng,
  tokensFor,
  type IUnitSpec,
  type Rng,
} from './fixtures';
import { referenceDeriveCombatRangeHexes } from './rangeHex.reference';

const coreProjection = deriveCombatRangeHexes as jest.MockedFunction<
  typeof deriveCombatRangeHexes
>;

jest.mock('../../combatProjection.rangeHex', () => {
  const actual = jest.requireActual('../../combatProjection.rangeHex');
  return {
    ...actual,
    deriveCombatRangeHexes: jest.fn(actual.deriveCombatRangeHexes),
  };
});

const RADIUS = 7;
const SEEDS = [11, 23];
const TURNS_PER_BOARD = 3;
const SELECTIONS_PER_TURN = 24;

interface IMismatch {
  readonly label: string;
  readonly hex: string;
}

const coverage: Record<string, number> = {};
function count(name: string, when: boolean): void {
  if (when) coverage[name] = (coverage[name] ?? 0) + 1;
}

function recordCoverage(projection: readonly ICombatRangeHex[]): void {
  for (const hex of projection) {
    count('attackable', hex.attackable);
    count('losBlocked', hex.losState === 'blocked');
    count('losPartial', hex.losState === 'partial');
    count('inRangeNotInArc', hex.inRange && !hex.inArc);
    count('toHitNumber', hex.toHitNumber !== undefined);
    count('minimumRangePenalty', hex.minimumRangePenalty !== undefined);
    count(
      'targetCover',
      hex.targetCoverLevel !== undefined && hex.targetCoverLevel !== 'none',
    );
    count('obscuredTarget', hex.obscuredTargetUnitIds.length > 0);
    count('multipleContacts', hex.targetUnitIds.length > 1);
    count('attackInvalidReason', hex.attackInvalidReason !== undefined);
  }
}

function compareProjections(
  label: string,
  actual: readonly ICombatRangeHex[],
  expected: readonly ICombatRangeHex[],
  mismatches: IMismatch[],
): number {
  if (actual.length !== expected.length) {
    mismatches.push({
      label,
      hex: `length ${actual.length}/${expected.length}`,
    });
    return 0;
  }
  expected.forEach((hex, index) => {
    if (!isDeepStrictEqual(actual[index], hex)) {
      mismatches.push({ label, hex: coordToKey(hex.hex) });
    }
  });
  return expected.length;
}

/** Interaction flags the UI sets per caller; the projection must ignore them. */
function withFlagNoise(tokens: readonly IUnitToken[], rng: Rng): IUnitToken[] {
  return tokens.map((token) => ({
    ...token,
    isValidTarget: rng() < 0.5,
    isActiveTarget: rng() < 0.2,
    isSecondaryTarget: rng() < 0.2,
    ...(rng() < 0.2 ? { attackInfeasibleReason: 'out of arc' } : {}),
  }));
}

function weaponSubset(rng: Rng, weapons: readonly IWeaponStatus[]): string[] {
  return rng() < 0.4
    ? []
    : weapons.filter(() => rng() < 0.6).map((weapon) => weapon.id);
}

function referenceTargetIds({
  state,
  tokens,
  grid,
  weapons,
}: {
  readonly state: IGameState;
  readonly tokens: readonly IUnitToken[];
  readonly grid: IHexGrid;
  readonly weapons: readonly IWeaponStatus[];
}): string[] {
  const ids = new Set<string>();
  for (const projection of referenceDeriveCombatRangeHexes({
    attacker: tokens.find((token) => token.unitId === 'attacker') ?? null,
    hexes: hexesInRange({ q: 0, r: 0 }, RADIUS),
    grid,
    tokens,
    weapons,
    combatState: state,
  })) {
    for (const id of projection.validTargetUnitIds) ids.add(id);
  }
  return Array.from(ids);
}

describe('shared whole-map combat projection (perf P5)', () => {
  it('matches the frozen reference hex for hex over seeded boards and selections', () => {
    const mismatches: IMismatch[] = [];
    let hexComparisons = 0;
    let projections = 0;
    let targetIdComparisons = 0;

    for (const seed of SEEDS) {
      BOARD_KINDS.forEach((kind, kindIndex) => {
        const rng = seededRng(seed * 101 + kindIndex);
        const grid = makeBoard(kind, rng, RADIUS);
        const hexes = allHexes(grid);

        for (let turn = 0; turn < TURNS_PER_BOARD; turn++) {
          const units: IUnitSpec[] = makeUnits(rng, RADIUS);
          // One state object per turn: every selection below shares it, so
          // the cache is hit and must still answer for the exact inputs.
          const state = makeCombatState(units);
          const unitWeapons = makeWeapons(rng);
          const enemyIds = units
            .filter((unit) => unit.side === GameSide.Opponent)
            .map((unit) => unit.unitId);

          for (let sel = 0; sel < SELECTIONS_PER_TURN; sel++) {
            const label = `seed ${seed} ${kind} turn ${turn} sel ${sel}`;
            let tokens = withFlagNoise(tokensFor(units, 'attacker'), rng);
            if (rng() < 0.2) {
              // Attacker token moved or turned while the state is unchanged.
              const moved: IUnitToken = {
                ...tokens[0],
                position: pick(rng, hexes),
                facing: pick(rng, [
                  Facing.North,
                  Facing.Southeast,
                  Facing.South,
                  Facing.Northwest,
                ]),
              };
              tokens = [moved, ...tokens.slice(1)];
            }
            if (rng() < 0.15) {
              // An enemy token moved while the state is unchanged.
              const index = 1 + Math.floor(rng() * (tokens.length - 1));
              tokens = tokens.map((token, i) =>
                i === index ? { ...token, position: pick(rng, hexes) } : token,
              );
            }
            const selectedWeaponIds = weaponSubset(rng, unitWeapons);
            const weapons = selectCombatProjectionWeapons(
              unitWeapons,
              selectedWeaponIds,
            );
            const targetUnitId = pick(rng, [undefined, null, ...enemyIds]);
            const input = {
              attacker: tokens[0],
              targetUnitId,
              hexes,
              grid,
              tokens,
              weapons,
              combatState: state,
            };

            const expected = referenceDeriveCombatRangeHexes(input);
            recordCoverage(expected);
            hexComparisons += compareProjections(
              label,
              deriveSharedCombatRangeHexes(input),
              expected,
              mismatches,
            );
            projections++;

            const ids = deriveValidWeaponTargetIds({
              currentState: state,
              selectedUnitId: 'attacker',
              tokens,
              mapRadius: RADIUS,
              grid,
              unitWeapons: { attacker: unitWeapons },
              selectedWeaponIds,
            });
            if (
              !isDeepStrictEqual(
                ids,
                referenceTargetIds({ state, tokens, grid, weapons }),
              )
            ) {
              mismatches.push({ label, hex: 'deriveValidWeaponTargetIds' });
            }
            targetIdComparisons++;

            if (sel === SELECTIONS_PER_TURN / 2) {
              // In-place grid edit under the same state object: the next
              // selections must see it, not a cached pre-edit projection.
              const coord = pick(rng, hexes);
              const hex = grid.hexes.get(coordToKey(coord))!;
              grid.hexes.set(coordToKey(coord), {
                ...hex,
                terrain: TerrainType.HeavyWoods,
                elevation: hex.elevation + 2,
              });
            }
          }
        }
      });
    }

    const coreCalls = coreProjection.mock.calls.map(
      ([input]) => input.hexes.length,
    );
    // eslint-disable-next-line no-console
    console.log(
      `P5 core projection calls: ${coreCalls.filter((n) => n > 50).length} whole-map, ` +
        `${coreCalls.filter((n) => n <= 50).length} target-hex splices ` +
        `(${coreCalls.filter((n) => n <= 50).reduce((a, b) => a + b, 0)} hexes); ` +
        `coverage ${JSON.stringify(coverage)}`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `P5 equivalence: ${projections} projections, ${hexComparisons} hex comparisons, ` +
        `${targetIdComparisons} target-id comparisons, ${mismatches.length} mismatches`,
    );
    expect(mismatches).toEqual([]);
    expect(hexComparisons).toBeGreaterThanOrEqual(
      projections * hexesInRange({ q: 0, r: 0 }, RADIUS).length,
    );
  });
});
