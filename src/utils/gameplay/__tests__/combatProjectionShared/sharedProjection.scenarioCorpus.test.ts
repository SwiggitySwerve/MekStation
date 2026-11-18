/**
 * Perf P5, C4 review S2: the shared projection against the frozen reference
 * on the repo's curated tactical-map scenarios (C3, ECM, indirect fire and
 * spotters, aerospace, vehicles and turrets, water, elevation, stacked LOS,
 * fog), plus combat-state variants for hull-down, evading, sprinting and an
 * ECM suite. Every input is checked with every token as the target and with
 * no target, with and without interaction-flag noise, twice (miss, then hit).
 *
 * Default run: every scenario input as captured, plus each state variant on
 * the first VARIANT_BASES inputs, and every class asserted present.
 * P5_CORPUS_FULL=1: every state variant on every scenario input.
 */
import { isDeepStrictEqual } from 'node:util';

import type { ICombatRangeHex, IGameState, IUnitToken } from '@/types/gameplay';
import type { ICombatProjectionInput } from '@/utils/gameplay/combatProjection.types';

import { GameSide, MovementType, TokenUnitType } from '@/types/gameplay';

import { deriveSharedCombatRangeHexes } from '../../combatProjection.shared';
import { coordToKey } from '../../hexMath';
import { referenceDeriveCombatRangeHexes } from './rangeHex.reference';

const mockCapturedInputs: ICombatProjectionInput[] = [];

// The scenario builders and the engine's committed-attack path project
// through the barrel; record every input they pass.
jest.mock('@/utils/gameplay/combatProjection', () => {
  const actual = jest.requireActual('@/utils/gameplay/combatProjection');
  return {
    ...actual,
    deriveCombatRangeHexes: (input: ICombatProjectionInput) => {
      mockCapturedInputs.push(input);
      return actual.deriveCombatRangeHexes(input);
    },
  };
});

const FULL = process.env.P5_CORPUS_FULL === '1';
const VARIANT_BASES = 4;

type Unit = IGameState['units'][string];
type Variant = {
  readonly name: string;
  readonly apply: (input: ICombatProjectionInput) => ICombatProjectionInput;
};

function withUnits(
  input: ICombatProjectionInput,
  change: (unit: Unit, unitId: string) => Unit,
): ICombatProjectionInput {
  const state = input.combatState;
  if (!state) return input;
  return {
    ...input,
    combatState: {
      ...state,
      units: Object.fromEntries(
        Object.entries(state.units).map(([id, unit]) => [id, change(unit, id)]),
      ),
    },
  };
}

const STATE_VARIANTS: readonly Variant[] = [
  {
    name: 'hullDown',
    apply: (input) =>
      withUnits(input, (unit, id) =>
        id === input.attacker?.unitId ? unit : { ...unit, hullDown: true },
      ),
  },
  {
    name: 'evade',
    apply: (input) =>
      withUnits(input, (unit) => ({ ...unit, isEvading: true }) as Unit),
  },
  {
    name: 'sprint',
    apply: (input) =>
      withUnits(
        input,
        (unit) =>
          ({
            ...unit,
            sprintedThisTurn: true,
            movementThisTurn: MovementType.Sprint,
            hexesMovedThisTurn: 6,
          }) as Unit,
      ),
  },
  {
    // Not ECM-effect coverage: it changes no output on these boards. A real
    // ECM effect is covered by the curated ECM-protected scenario.
    name: 'ecmSuite',
    apply: (input) => {
      const state = input.combatState;
      const enemy = input.tokens.find(
        (token) => token.side !== input.attacker?.side,
      );
      if (!state || !enemy) return input;
      return {
        ...input,
        combatState: {
          ...state,
          electronicWarfare: {
            ecmSuites: [
              {
                type: 'guardian',
                mode: 'ecm',
                operational: true,
                entityId: enemy.unitId,
                teamId: String(enemy.side),
                position: enemy.position,
              },
            ],
            activeProbes: [],
          },
        },
      };
    },
  },
];

const CLASSES: Record<
  string,
  (input: ICombatProjectionInput, variant: string) => boolean
> = {
  c3: (input) => Boolean(input.combatState?.c3State),
  // The curated ECM scenario: an ECM-protected target nullifies TAG.
  ecmProtected: (input) =>
    Object.values(input.combatState?.units ?? {}).some(
      (unit) => (unit as { ecmProtected?: boolean }).ecmProtected === true,
    ),
  // Synthetic suite: drives the electronic-warfare branch of the to-hit
  // projection (getECMProtectedFlag); on these boards it changes no output.
  ecmSuite: (input) =>
    Boolean(input.combatState?.electronicWarfare?.ecmSuites.length),
  hullDown: (input) =>
    Object.values(input.combatState?.units ?? {}).some((unit) => unit.hullDown),
  evade: (input) =>
    Object.values(input.combatState?.units ?? {}).some(
      (unit) => unit.isEvading,
    ),
  sprint: (input) =>
    Object.values(input.combatState?.units ?? {}).some(
      (unit) => unit.sprintedThisTurn,
    ),
  aerospace: (input) =>
    input.tokens.some((token) => token.unitType === TokenUnitType.Aerospace),
  vehicle: (input) =>
    input.tokens.some((token) => token.unitType === TokenUnitType.Vehicle),
  turret: (input) =>
    input.weapons.some((weapon) => weapon.vehicleIsTurretMounted === true),
  water: (input) =>
    Array.from(input.grid.hexes.values()).some((hex) =>
      hex.terrain.includes('water'),
    ),
  fog: (input) =>
    input.tokens.some(
      (token) => token.fogStatus !== undefined && token.fogStatus !== 'visible',
    ),
  stacked: (input) => {
    const keys = input.tokens
      .filter((token) => token.side !== input.attacker?.side)
      .map((token) => coordToKey(token.lastKnownPosition ?? token.position));
    return new Set(keys).size < keys.length;
  },
  engineCommitPath: (input) => commitPathInputs.has(input),
};

/** Inputs recorded from the engine's committed-attack projection. */
const commitPathInputs = new Set<ICombatProjectionInput>();

function flagNoise(token: IUnitToken, index: number): IUnitToken {
  return {
    ...token,
    isSelected: index % 2 === 0,
    isValidTarget: index % 3 === 0,
    isActiveTarget: index % 5 === 0,
    isSecondaryTarget: index % 7 === 0,
    attackInfeasibleReason: index % 2 ? 'noise' : undefined,
  };
}

function captureScenarioInputs(): ICombatProjectionInput[] {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const scenarios = require('@/testing/__tests__/tactical-map.combat-scenarios.test-context');
  require('@/testing/tactical-map.indirect-fire-ecm-scenario');
  require('@/testing/tactical-map.indirect-fire-spotter-skill-scenario');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const builderCount = mockCapturedInputs.length;
  for (const [name, build] of Object.entries(scenarios)) {
    if (name.endsWith('CommitInput') && typeof build === 'function') {
      // The engine projects the whole map for the committed attack.
      scenarios.applyInteractiveSessionAttack(build());
    }
  }
  mockCapturedInputs
    .slice(builderCount)
    .forEach((input) => commitPathInputs.add(input));
  return mockCapturedInputs.filter((input) => input.attacker);
}

describe('shared projection on the curated scenario corpus (perf P5, C4 S2)', () => {
  it('matches the frozen reference for every target, flag noise, miss and hit', () => {
    const started = Date.now();
    const scenarioInputs = captureScenarioInputs();
    const captureMs = Date.now() - started;
    expect(scenarioInputs.length).toBeGreaterThan(30);

    const corpus: { input: ICombatProjectionInput; variant: string }[] =
      scenarioInputs.map((input) => ({ input, variant: 'scenario' }));
    // How many variant inputs project differently from their base, so a
    // variant is known to reach the projection rather than be ignored.
    const variantEffective: Record<string, number> = {};
    STATE_VARIANTS.forEach((variant) => {
      const bases = FULL
        ? scenarioInputs
        : scenarioInputs.slice(0, VARIANT_BASES);
      variantEffective[variant.name] = 0;
      for (const input of bases) {
        const varied = variant.apply(input);
        corpus.push({ input: varied, variant: variant.name });
        if (
          !isDeepStrictEqual(
            referenceDeriveCombatRangeHexes(varied),
            referenceDeriveCombatRangeHexes(input),
          )
        ) {
          variantEffective[variant.name]++;
        }
      }
    });

    const mismatches: string[] = [];
    const classComparisons: Record<string, number> = Object.fromEntries(
      Object.keys(CLASSES).map((name) => [name, 0]),
    );
    let comparisons = 0;
    let hexComparisons = 0;

    corpus.forEach(({ input, variant }, corpusIndex) => {
      const classes = Object.entries(CLASSES)
        .filter(([, matches]) => matches(input, variant))
        .map(([name]) => name);
      const targets = new Set<string | null | undefined>([
        input.targetUnitId,
        undefined,
        ...input.tokens.map((token) => token.unitId),
      ]);
      for (const targetUnitId of targets) {
        const expected: readonly ICombatRangeHex[] =
          referenceDeriveCombatRangeHexes({ ...input, targetUnitId });
        for (const noisy of [false, true]) {
          const tokens = noisy ? input.tokens.map(flagNoise) : input.tokens;
          const attacker = noisy
            ? flagNoise(input.attacker!, 1)
            : input.attacker;
          for (const pass of ['miss', 'hit']) {
            const actual = deriveSharedCombatRangeHexes({
              ...input,
              attacker,
              tokens,
              targetUnitId,
            });
            comparisons++;
            hexComparisons += expected.length;
            for (const name of classes) classComparisons[name]++;
            if (!isDeepStrictEqual(Array.from(actual), Array.from(expected))) {
              mismatches.push(
                `#${corpusIndex} ${variant} target=${String(targetUnitId)} noisy=${noisy} ${pass}`,
              );
            }
          }
        }
      }
    });

    // eslint-disable-next-line no-console
    console.log(
      `P5 scenario corpus (${FULL ? 'full' : 'default'}): ${scenarioInputs.length} scenario inputs, ` +
        `${corpus.length} corpus inputs, ${comparisons} comparisons, ${hexComparisons} hex comparisons, ` +
        `${mismatches.length} mismatches; capture ${captureMs} ms, total ${Date.now() - started} ms; ` +
        `per class ${JSON.stringify(classComparisons)}; ` +
        `variants changing the projection ${JSON.stringify(variantEffective)}`,
    );
    expect(mismatches).toEqual([]);
    for (const [name, count] of Object.entries(classComparisons)) {
      expect({ name, represented: count > 0 }).toEqual({
        name,
        represented: true,
      });
    }
    expect(
      corpus.some(({ input }) =>
        input.tokens.some((token) => token.side === GameSide.Opponent),
      ),
    ).toBe(true);
  });
});
