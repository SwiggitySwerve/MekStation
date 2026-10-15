import {
  AMBUSH,
  EXTENDED_ENGAGEMENT,
  EXTREME_HEAT,
  NIGHT_BATTLE,
  TIME_PRESSURE,
} from '@/constants/scenario/modifiers';
import { Faction } from '@/constants/scenario/rats';
import { STANDUP_FIGHT_TEMPLATE } from '@/constants/scenario/templates';
import {
  BiomeType,
  type IBattleModifier,
  type IScenarioGeneratorConfig,
  type IScenarioTemplate,
  ScenarioObjectiveType,
} from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

import { ScenarioGeneratorService } from '../ScenarioGeneratorService';

jest.mock('@/constants/scenario/modifiers', () => ({
  ...jest.requireActual<typeof import('@/constants/scenario/modifiers')>(
    '@/constants/scenario/modifiers',
  ),
  BATTLE_MODIFIERS: [],
}));

jest.mock('@/constants/scenario/templates', () => ({
  ...jest.requireActual<typeof import('@/constants/scenario/templates')>(
    '@/constants/scenario/templates',
  ),
  SCENARIO_TEMPLATES: [],
}));

const modifierCatalog = jest.requireMock<{
  BATTLE_MODIFIERS: IBattleModifier[];
}>('@/constants/scenario/modifiers').BATTLE_MODIFIERS;

const templateCatalog = jest.requireMock<{
  SCENARIO_TEMPLATES: IScenarioTemplate[];
}>('@/constants/scenario/templates').SCENARIO_TEMPLATES;

const baseConfig: IScenarioGeneratorConfig = {
  playerBV: 432,
  playerUnitCount: 1,
  faction: Faction.PIRATES,
  era: Era.LATE_SUCCESSION_WARS,
  difficulty: 1,
  maxModifiers: 2,
  allowNegativeModifiers: true,
  biome: BiomeType.Desert,
  scenarioType: ScenarioObjectiveType.Capture,
  seed: 12345,
};

function useCatalog(
  turnLimit: number,
  modifiers: readonly IBattleModifier[],
  objectiveType = ScenarioObjectiveType.Capture,
): void {
  templateCatalog.splice(0, templateCatalog.length, {
    ...STANDUP_FIGHT_TEMPLATE,
    objectiveType,
    turnLimit,
  });
  modifierCatalog.splice(0, modifierCatalog.length, ...modifiers);
}

function generate(patch: Partial<IScenarioGeneratorConfig> = {}) {
  return new ScenarioGeneratorService().generate({ ...baseConfig, ...patch });
}

afterEach(() => {
  templateCatalog.splice(0);
  modifierCatalog.splice(0);
});

describe('scenario modifier eligibility', () => {
  it('keeps default-modifier Standup Fight unlimited without Time Pressure', () => {
    useCatalog(0, [TIME_PRESSURE], ScenarioObjectiveType.Destroy);

    const scenario = generate({ scenarioType: ScenarioObjectiveType.Destroy });

    expect(scenario.template.id).toBe('standup_fight');
    expect(scenario.modifiers).toEqual([]);
    expect(scenario.turnLimit).toBe(0);
  });

  it('excludes biome-restricted heat in an incompatible biome', () => {
    useCatalog(15, [EXTREME_HEAT]);

    const scenario = generate({ biome: BiomeType.Arctic });

    expect(scenario.modifiers).toEqual([]);
    expect(scenario.turnLimit).toBe(15);
  });

  it.each([
    [ScenarioObjectiveType.Recon, BiomeType.Forest, true],
    [ScenarioObjectiveType.Recon, BiomeType.Desert, false],
    [ScenarioObjectiveType.Destroy, BiomeType.Forest, false],
    [ScenarioObjectiveType.Destroy, BiomeType.Desert, false],
  ] as const)(
    'requires both restrictions for Ambush in %s / %s',
    (scenarioType, biome, eligible) => {
      useCatalog(15, [AMBUSH], scenarioType);

      const scenario = generate({ scenarioType, biome });

      expect(scenario.modifiers.map((modifier) => modifier.id)).toEqual(
        eligible ? ['ambush'] : [],
      );
    },
  );

  it('allows a modifier with unrestricted scenario and biome dimensions', () => {
    useCatalog(0, [NIGHT_BATTLE], ScenarioObjectiveType.Destroy);

    const scenario = generate({ scenarioType: ScenarioObjectiveType.Destroy });

    expect(scenario.modifiers.map((modifier) => modifier.id)).toEqual([
      'night_battle',
    ]);
    expect(scenario.turnLimit).toBe(0);
  });

  it('continues to honor the negative modifier toggle', () => {
    useCatalog(15, [TIME_PRESSURE]);

    const scenario = generate({ allowNegativeModifiers: false });

    expect(scenario.modifiers).toEqual([]);
    expect(scenario.turnLimit).toBe(15);
  });

  it('keeps deterministic selection and mutually exclusive time modifiers', () => {
    useCatalog(20, [TIME_PRESSURE, EXTENDED_ENGAGEMENT]);

    const first = generate();
    const second = generate();

    expect(first.modifiers).toHaveLength(1);
    expect(first.modifiers.map((modifier) => modifier.id)).toEqual(
      second.modifiers.map((modifier) => modifier.id),
    );
    expect(first.turnLimit).toBe(second.turnLimit);
    expect(new Set(first.modifiers.map((modifier) => modifier.id)).size).toBe(
      1,
    );
  });
});

describe('scenario turn-limit semantics', () => {
  it.each([TIME_PRESSURE, EXTENDED_ENGAGEMENT])(
    'preserves an unlimited template with applicable $name',
    (modifier) => {
      useCatalog(0, [modifier]);

      const scenario = generate();

      expect(scenario.modifiers.map((selected) => selected.id)).toEqual([
        modifier.id,
      ]);
      expect(scenario.turnLimit).toBe(0);
    },
  );

  it.each([
    [15, 12],
    [8, 5],
    [3, 5],
    [2, 5],
  ])('applies Time Pressure to finite %i turns as %i', (base, expected) => {
    useCatalog(base, [TIME_PRESSURE]);

    const scenario = generate();

    expect(scenario.modifiers.map((modifier) => modifier.id)).toEqual([
      'time_pressure',
    ]);
    expect(scenario.turnLimit).toBe(expected);
  });

  it('preserves a valid finite extension above the existing floor', () => {
    useCatalog(20, [EXTENDED_ENGAGEMENT]);

    expect(generate().turnLimit).toBe(25);
  });

  it.each([
    [0, 0],
    [2, 5],
    [15, 15],
  ])('retains unmodified template %i as %i', (base, expected) => {
    useCatalog(base, []);

    expect(generate({ maxModifiers: 0 }).turnLimit).toBe(expected);
  });
});
