/**
 * Property tests — Random Pilot Generator (Tasks 4.15–4.16)
 *
 * Spec contracts from add-encounter-swarm-harness:
 *   - vault-sample SHALL return exactly `count` pilots drawn from the vault.
 *   - vault-sample WITHOUT replacement: each pilot appears at most once when
 *     count <= vault.length.
 *   - vault-sample WITH replacement: sampledWithReplacement flag is true when
 *     count > vault.length; pilots may repeat.
 *   - template-synthesis SHALL return `count` new Statblock pilots whose
 *     gunnery is within [gunneryRange[0], gunneryRange[1]] and piloting is
 *     within [pilotingRange[0], pilotingRange[1]] for 1,000 runs.
 *   - Determinism: two calls with the same seed and options produce identical
 *     skill sequences.
 *   - PilotSkillTemplate.Mixed: skills are drawn from all four bands, and over
 *     sufficient runs the full range [2..6] gunnery values appear.
 */

import { SeededRandom } from '@/simulation/core/SeededRandom';
import { PilotSkillTemplate } from '@/types/encounter/EncounterInterfaces';
import { IPilot, PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import {
  ELITE_BAND,
  GREEN_BAND,
  REGULAR_BAND,
  VETERAN_BAND,
} from '../pilotSkillBands';
import {
  generateRandomPilots,
  IRandomPilotOptions,
} from '../randomPilotGenerator';

// =============================================================================
// Helpers
// =============================================================================

function makePilot(id: string, gunnery: number, piloting: number): IPilot {
  const now = new Date().toISOString();
  return {
    id,
    name: `Pilot ${id}`,
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery, piloting },
    wounds: 0,
    abilities: [],
    createdAt: now,
    updatedAt: now,
  };
}

function buildVault(n: number): IPilot[] {
  return Array.from({ length: n }, (_, i) =>
    makePilot(`vault-${i}`, 3 + (i % 3), 4 + (i % 3)),
  );
}

function baseOpts(
  overrides: Partial<IRandomPilotOptions> = {},
): IRandomPilotOptions {
  return {
    count: 4,
    strategy: 'template-synthesis',
    random: new SeededRandom(42),
    skillTemplate: REGULAR_BAND,
    ...overrides,
  };
}

// =============================================================================
// vault-sample: without replacement
// =============================================================================

describe('generateRandomPilots — vault-sample without replacement', () => {
  it('returns exactly count pilots', () => {
    const vault = buildVault(10);
    const result = generateRandomPilots(
      baseOpts({ strategy: 'vault-sample', vault, count: 4 }),
    );
    expect(result.pilots.length).toBe(4);
  });

  it('sampledWithReplacement is false when count <= vault.length', () => {
    const vault = buildVault(10);
    const result = generateRandomPilots(
      baseOpts({ strategy: 'vault-sample', vault, count: 4 }),
    );
    expect(result.sampledWithReplacement).toBe(false);
  });

  it('no pilot id appears more than once (without replacement)', () => {
    const vault = buildVault(20);
    for (let seed = 0; seed < 50; seed++) {
      const result = generateRandomPilots(
        baseOpts({
          strategy: 'vault-sample',
          vault,
          count: 10,
          random: new SeededRandom(seed),
        }),
      );
      const ids = result.pilots.map((p) => p.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });

  it('returned pilots are from the vault', () => {
    const vault = buildVault(10);
    const vaultIds = new Set(vault.map((p) => p.id));
    const result = generateRandomPilots(
      baseOpts({ strategy: 'vault-sample', vault, count: 4 }),
    );
    for (const pilot of result.pilots) {
      expect(vaultIds.has(pilot.id)).toBe(true);
    }
  });
});

// =============================================================================
// vault-sample: with replacement (count > vault)
// =============================================================================

describe('generateRandomPilots — vault-sample with replacement', () => {
  it('returns count pilots even when count > vault.length', () => {
    const vault = buildVault(3);
    const result = generateRandomPilots(
      baseOpts({ strategy: 'vault-sample', vault, count: 8 }),
    );
    expect(result.pilots.length).toBe(8);
  });

  it('sets sampledWithReplacement true when count > vault.length', () => {
    const vault = buildVault(3);
    const result = generateRandomPilots(
      baseOpts({ strategy: 'vault-sample', vault, count: 8 }),
    );
    expect(result.sampledWithReplacement).toBe(true);
  });

  it('handles empty vault: returns empty array, no replacement flag', () => {
    const result = generateRandomPilots(
      baseOpts({ strategy: 'vault-sample', vault: [], count: 4 }),
    );
    expect(result.pilots.length).toBe(0);
    expect(result.sampledWithReplacement).toBe(false);
  });
});

// =============================================================================
// template-synthesis: skill range compliance (1,000 runs)
// =============================================================================

describe('generateRandomPilots — template-synthesis skill ranges (1,000 runs)', () => {
  const bands = [
    { name: 'GREEN', band: GREEN_BAND },
    { name: 'REGULAR', band: REGULAR_BAND },
    { name: 'VETERAN', band: VETERAN_BAND },
    { name: 'ELITE', band: ELITE_BAND },
  ];

  for (const { name, band } of bands) {
    it(`${name}: all 1,000 pilots have skills within [${band.gunneryRange}] / [${band.pilotingRange}]`, () => {
      let violations = 0;

      for (let seed = 0; seed < 1_000; seed++) {
        const result = generateRandomPilots(
          baseOpts({
            strategy: 'template-synthesis',
            skillTemplate: band,
            count: 1,
            random: new SeededRandom(seed + 3000),
          }),
        );

        const pilot = result.pilots[0];
        const gOk =
          pilot.skills.gunnery >= band.gunneryRange[0] &&
          pilot.skills.gunnery <= band.gunneryRange[1];
        const pOk =
          pilot.skills.piloting >= band.pilotingRange[0] &&
          pilot.skills.piloting <= band.pilotingRange[1];
        if (!gOk || !pOk) violations++;
      }

      expect(violations).toBe(0);
    });
  }

  it('synthesized pilots are PilotType.Statblock', () => {
    const result = generateRandomPilots(
      baseOpts({ strategy: 'template-synthesis', count: 10 }),
    );
    for (const pilot of result.pilots) {
      expect(pilot.type).toBe(PilotType.Statblock);
    }
  });

  it('sampledWithReplacement is always false for template-synthesis', () => {
    const result = generateRandomPilots(
      baseOpts({ strategy: 'template-synthesis', count: 5 }),
    );
    expect(result.sampledWithReplacement).toBe(false);
  });

  it('synthesized pilots have non-empty id and name', () => {
    const result = generateRandomPilots(
      baseOpts({ strategy: 'template-synthesis', count: 4 }),
    );
    for (const pilot of result.pilots) {
      expect(pilot.id.length).toBeGreaterThan(0);
      expect(pilot.name.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// template-synthesis: PilotSkillTemplate enum values
// =============================================================================

describe('generateRandomPilots — PilotSkillTemplate enum values', () => {
  const enumCases: Array<{
    template: PilotSkillTemplate;
    gMin: number;
    gMax: number;
    pMin: number;
    pMax: number;
  }> = [
    { template: PilotSkillTemplate.Green, gMin: 5, gMax: 6, pMin: 6, pMax: 7 },
    {
      template: PilotSkillTemplate.Regular,
      gMin: 4,
      gMax: 5,
      pMin: 5,
      pMax: 6,
    },
    {
      template: PilotSkillTemplate.Veteran,
      gMin: 3,
      gMax: 4,
      pMin: 4,
      pMax: 5,
    },
    { template: PilotSkillTemplate.Elite, gMin: 2, gMax: 3, pMin: 3, pMax: 4 },
  ];

  for (const { template, gMin, gMax, pMin, pMax } of enumCases) {
    it(`${template}: gunnery in [${gMin},${gMax}], piloting in [${pMin},${pMax}]`, () => {
      for (let seed = 0; seed < 100; seed++) {
        const result = generateRandomPilots(
          baseOpts({
            strategy: 'template-synthesis',
            skillTemplate: template,
            count: 1,
            random: new SeededRandom(seed + 7000),
          }),
        );
        const { gunnery, piloting } = result.pilots[0].skills;
        expect(gunnery).toBeGreaterThanOrEqual(gMin);
        expect(gunnery).toBeLessThanOrEqual(gMax);
        expect(piloting).toBeGreaterThanOrEqual(pMin);
        expect(piloting).toBeLessThanOrEqual(pMax);
      }
    });
  }

  it('Mixed: produces gunnery values from multiple bands over 500 runs', () => {
    const gunneryValues = new Set<number>();

    for (let seed = 0; seed < 500; seed++) {
      const result = generateRandomPilots(
        baseOpts({
          strategy: 'template-synthesis',
          skillTemplate: PilotSkillTemplate.Mixed,
          count: 1,
          random: new SeededRandom(seed + 9000),
        }),
      );
      gunneryValues.add(result.pilots[0].skills.gunnery);
    }

    // Mixed spans green (5-6) through elite (2-3), so we expect at least 3
    // distinct gunnery values to appear over 500 runs.
    expect(gunneryValues.size).toBeGreaterThanOrEqual(3);
  });
});

// =============================================================================
// Determinism
// =============================================================================

describe('generateRandomPilots — determinism', () => {
  it('two calls with the same seed produce identical skill sequences', () => {
    for (let seed = 0; seed < 20; seed++) {
      const makeOpts = () =>
        baseOpts({
          strategy: 'template-synthesis',
          skillTemplate: VETERAN_BAND,
          count: 4,
          random: new SeededRandom(seed + 4000),
        });

      const r1 = generateRandomPilots(makeOpts());
      const r2 = generateRandomPilots(makeOpts());

      const skills1 = r1.pilots.map((p) => p.skills);
      const skills2 = r2.pilots.map((p) => p.skills);
      expect(skills1).toEqual(skills2);

      // Spec Fix 1: pilot IDs must also be deterministic (no Date.now()).
      for (let i = 0; i < r1.pilots.length; i++) {
        expect(r1.pilots[i].id).toBe(r2.pilots[i].id);
      }
    }
  });

  it('vault-sample is deterministic across same seed', () => {
    const vault = buildVault(20);

    for (let seed = 0; seed < 20; seed++) {
      const makeOpts = () =>
        baseOpts({
          strategy: 'vault-sample',
          vault,
          count: 6,
          random: new SeededRandom(seed + 6000),
        });

      const r1 = generateRandomPilots(makeOpts());
      const r2 = generateRandomPilots(makeOpts());

      expect(r1.pilots.map((p) => p.id)).toEqual(r2.pilots.map((p) => p.id));
    }
  });
});

// =============================================================================
// Error handling
// =============================================================================

describe('generateRandomPilots — error handling', () => {
  it('throws when strategy is template-synthesis and no skillTemplate provided', () => {
    expect(() =>
      generateRandomPilots({
        count: 4,
        strategy: 'template-synthesis',
        random: new SeededRandom(1),
        // skillTemplate intentionally omitted
      }),
    ).toThrow(/skillTemplate is required/);
  });
});
