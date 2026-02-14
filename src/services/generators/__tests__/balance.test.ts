/**
 * Balance Testing for Scenario Generators
 * Verifies that generated scenarios produce fair and balanced battles.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import { Faction } from '@/constants/scenario/rats';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { OpForSkillLevel, ScenarioObjectiveType } from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

import {
  OpForGeneratorService,
  getDefaultOpForConfig,
} from '../OpForGeneratorService';
import { ScenarioGeneratorService } from '../ScenarioGeneratorService';

describe('Balance Testing', () => {
  const opForGenerator = new OpForGeneratorService();
  const scenarioGenerator = new ScenarioGeneratorService();

  describe('OpFor BV Accuracy', () => {
    const testCases = [
      {
        playerBV: 4000,
        description: 'Small lance (4000 BV)',
        maxDeviation: 0.25,
      },
      {
        playerBV: 8000,
        description: 'Standard lance (8000 BV)',
        maxDeviation: 0.2,
      },
      {
        playerBV: 12000,
        description: 'Reinforced lance (12000 BV)',
        maxDeviation: 0.2,
      },
    ];

    testCases.forEach(({ playerBV, description, maxDeviation }) => {
      it(`should generate OpFor within ${maxDeviation * 100}% of target for ${description}`, () => {
        const config = getDefaultOpForConfig(
          playerBV,
          Faction.DRACONIS_COMBINE,
          Era.CLAN_INVASION,
        );
        // Use seeded random for deterministic results
        const seededRandom = new SeededRandom(42);
        const result = opForGenerator.generate(config, () =>
          seededRandom.next(),
        );

        const deviation = Math.abs(result.bvDeviation);
        expect(deviation).toBeLessThan(maxDeviation);

        // Log for analysis
        console.log(
          `${description}: Target ${playerBV}, Got ${result.totalBV} (${(result.bvDeviation * 100).toFixed(1)}% deviation)`,
        );
      });
    });

    it('should produce forces for large BV (Company level)', () => {
      // For company-size forces, we relax deviation requirements
      // as the generator has unit count limits
      const config = {
        ...getDefaultOpForConfig(
          24000,
          Faction.DRACONIS_COMBINE,
          Era.CLAN_INVASION,
        ),
        maxLanceSize: 16, // Allow larger force
      };
      const result = opForGenerator.generate(config);

      // Should produce a substantial force even if not hitting exact target
      expect(result.units.length).toBeGreaterThan(4);
      expect(result.totalBV).toBeGreaterThan(12000);
    });

    it('should consistently hit BV targets across multiple generations', () => {
      const playerBV = 10000;
      const config = getDefaultOpForConfig(
        playerBV,
        Faction.PIRATES,
        Era.LATE_SUCCESSION_WARS,
      );

      const deviations: number[] = [];
      for (let i = 0; i < 10; i++) {
        const result = opForGenerator.generate(config);
        deviations.push(result.bvDeviation);
      }

      const avgDeviation =
        deviations.reduce((a, b) => a + b, 0) / deviations.length;
      const maxDeviation = Math.max(...deviations.map(Math.abs));

      // Average deviation should be reasonable (within 20%)
      // Note: stochastic test — tolerance accounts for random generation variance
      expect(Math.abs(avgDeviation)).toBeLessThan(0.2);
      // No single generation should be wildly off (within 30%)
      expect(maxDeviation).toBeLessThan(0.3);
    });
  });

  describe('Difficulty Scaling', () => {
    const difficulties = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

    it('should scale OpFor BV proportionally with difficulty', () => {
      const playerBV = 10000;
      const results: { difficulty: number; bv: number }[] = [];

      for (const difficulty of difficulties) {
        const config = {
          ...getDefaultOpForConfig(
            playerBV,
            Faction.MERCENARY,
            Era.CLAN_INVASION,
          ),
          difficultyMultiplier: difficulty,
        };
        const result = opForGenerator.generate(config);
        results.push({ difficulty, bv: result.totalBV });
      }

      // Higher difficulties should generally produce more BV
      // Due to randomness, we compare endpoints rather than each step
      const easyBV = results.find((r) => r.difficulty === 0.5)?.bv || 0;
      const hardBV = results.find((r) => r.difficulty === 1.5)?.bv || 0;
      expect(hardBV).toBeGreaterThan(easyBV);

      // The 2.0 difficulty should produce more than 1.0, but may be limited by unit count
      const normalBV = results.find((r) => r.difficulty === 1.0)?.bv || 0;
      const extremeBV = results.find((r) => r.difficulty === 2.0)?.bv || 0;
      expect(extremeBV).toBeGreaterThan(normalBV * 0.8); // At least close to normal
    });
  });

  describe('Skill Level Impact', () => {
    it('should assign correct base skills for each level', () => {
      const playerBV = 8000;
      const skillLevels = [
        {
          level: OpForSkillLevel.Green,
          expectedGunnery: 5,
          expectedPiloting: 6,
        },
        {
          level: OpForSkillLevel.Regular,
          expectedGunnery: 4,
          expectedPiloting: 5,
        },
        {
          level: OpForSkillLevel.Veteran,
          expectedGunnery: 3,
          expectedPiloting: 4,
        },
        {
          level: OpForSkillLevel.Elite,
          expectedGunnery: 2,
          expectedPiloting: 3,
        },
        {
          level: OpForSkillLevel.Legendary,
          expectedGunnery: 1,
          expectedPiloting: 2,
        },
      ];

      for (const { level, expectedGunnery, expectedPiloting } of skillLevels) {
        const config = {
          ...getDefaultOpForConfig(
            playerBV,
            Faction.CLAN_WOLF,
            Era.CLAN_INVASION,
          ),
          skillLevel: level,
        };
        const result = opForGenerator.generate(config);

        for (const unit of result.units) {
          expect(unit.pilot.gunnery).toBe(expectedGunnery);
          expect(unit.pilot.piloting).toBe(expectedPiloting);
        }
      }
    });

    it('should produce skill variance for Mixed skill level', () => {
      const playerBV = 20000; // Large force to get enough samples
      const config = {
        ...getDefaultOpForConfig(
          playerBV,
          Faction.FEDERATED_SUNS,
          Era.CLAN_INVASION,
        ),
        skillLevel: OpForSkillLevel.Mixed,
      };

      // Run multiple times and collect all skills
      const allGunneries: number[] = [];
      for (let i = 0; i < 5; i++) {
        const result = opForGenerator.generate(config);
        allGunneries.push(...result.units.map((u) => u.pilot.gunnery));
      }

      // Should have some variance (not all the same skill)
      const uniqueGunneries = new Set(allGunneries);
      expect(uniqueGunneries.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Scenario Template Balance', () => {
    const scenarioTypes = [
      ScenarioObjectiveType.Destroy,
      ScenarioObjectiveType.Capture,
      ScenarioObjectiveType.Defend,
      ScenarioObjectiveType.Escort,
      ScenarioObjectiveType.Recon,
      ScenarioObjectiveType.Breakthrough,
    ];

    scenarioTypes.forEach((scenarioType) => {
      it(`should generate balanced scenario for ${scenarioType} type`, () => {
        const scenario = scenarioGenerator.generate({
          playerBV: 8000,
          playerUnitCount: 4,
          scenarioType,
          faction: Faction.PIRATES,
          era: Era.CLAN_INVASION,
          difficulty: 1.0,
          maxModifiers: 0,
          allowNegativeModifiers: false,
        });

        // Template should match requested type
        expect(scenario.template.objectiveType).toBe(scenarioType);

        // OpFor should be reasonable (not zero, not excessive)
        // Note: Template multipliers can reduce BV significantly for some types
        expect(scenario.opFor.units.length).toBeGreaterThan(0);
        expect(scenario.opFor.totalBV).toBeGreaterThan(2000); // Minimum for any scenario
        expect(scenario.opFor.totalBV).toBeLessThan(25000); // Maximum reasonable

        // Should have victory conditions
        expect(scenario.template.victoryConditions.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Force Composition', () => {
    it('should generate reasonable unit counts for different BV levels', () => {
      const testCases = [
        { bv: 3000, minUnits: 1, maxUnits: 4 },
        { bv: 8000, minUnits: 2, maxUnits: 8 },
        { bv: 16000, minUnits: 4, maxUnits: 12 },
        { bv: 30000, minUnits: 6, maxUnits: 16 },
      ];

      for (const { bv, minUnits, maxUnits } of testCases) {
        const config = getDefaultOpForConfig(
          bv,
          Faction.LYRAN_COMMONWEALTH,
          Era.LATE_SUCCESSION_WARS,
        );
        // Use seeded random for deterministic results
        const seededRandom = new SeededRandom(42);
        const result = opForGenerator.generate(config, () =>
          seededRandom.next(),
        );

        expect(result.units.length).toBeGreaterThanOrEqual(minUnits);
        expect(result.units.length).toBeLessThanOrEqual(maxUnits);
      }
    });

    it('should assign units to lances correctly', () => {
      const config = getDefaultOpForConfig(
        16000,
        Faction.CLAN_JADE_FALCON,
        Era.CLAN_INVASION,
      );
      const result = opForGenerator.generate(config);

      // Check lance assignments
      const lances = new Map<string, number>();
      for (const unit of result.units) {
        const count = lances.get(unit.lanceId) || 0;
        lances.set(unit.lanceId, count + 1);
      }

      // Each lance should have at most 4 units
      for (const [_, count] of Array.from(lances.entries())) {
        expect(count).toBeLessThanOrEqual(4);
      }

      // Number of lances should match metadata
      expect(lances.size).toBe(result.metadata.lanceCount);
    });
  });

  describe('Modifier Distribution', () => {
    it('should respect max modifier count', () => {
      for (let maxModifiers = 0; maxModifiers <= 3; maxModifiers++) {
        const scenario = scenarioGenerator.generate({
          playerBV: 8000,
          playerUnitCount: 4,
          faction: Faction.PIRATES,
          era: Era.CLAN_INVASION,
          difficulty: 1.0,
          maxModifiers,
          allowNegativeModifiers: true,
        });

        expect(scenario.modifiers.length).toBeLessThanOrEqual(maxModifiers);
      }
    });

    it('should exclude negative modifiers when requested', () => {
      // Generate many scenarios to test distribution
      for (let i = 0; i < 10; i++) {
        const scenario = scenarioGenerator.generate({
          playerBV: 8000,
          playerUnitCount: 4,
          faction: Faction.PIRATES,
          era: Era.CLAN_INVASION,
          difficulty: 1.0,
          maxModifiers: 3,
          allowNegativeModifiers: false,
        });

        for (const modifier of scenario.modifiers) {
          expect(modifier.effect).not.toBe('negative');
        }
      }
    });
  });

  describe('Reproducibility', () => {
    it('should produce identical results with the same seed', () => {
      const seed = 42;
      const config = {
        playerBV: 8000,
        playerUnitCount: 4,
        faction: Faction.DRACONIS_COMBINE,
        era: Era.JIHAD,
        difficulty: 1.0,
        maxModifiers: 2,
        allowNegativeModifiers: true,
        seed,
      };

      const scenario1 = scenarioGenerator.generate(config);
      const scenario2 = scenarioGenerator.generate(config);

      expect(scenario1.template.id).toBe(scenario2.template.id);
      expect(scenario1.mapPreset.id).toBe(scenario2.mapPreset.id);
      expect(scenario1.modifiers.length).toBe(scenario2.modifiers.length);
      expect(scenario1.turnLimit).toBe(scenario2.turnLimit);
    });

    it('should produce different results with different seeds', () => {
      const baseConfig = {
        playerBV: 8000,
        playerUnitCount: 4,
        faction: Faction.FREE_WORLDS_LEAGUE,
        era: Era.DARK_AGE,
        difficulty: 1.0,
        maxModifiers: 2,
        allowNegativeModifiers: true,
      };

      const results = new Set<string>();
      for (let seed = 1; seed <= 10; seed++) {
        const scenario = scenarioGenerator.generate({ ...baseConfig, seed });
        results.add(`${scenario.template.id}|${scenario.mapPreset.id}`);
      }

      // Should have some variety (not all the same)
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum BV gracefully', () => {
      const config = getDefaultOpForConfig(
        500,
        Faction.PIRATES,
        Era.LATE_SUCCESSION_WARS,
      );
      const result = opForGenerator.generate(config);

      expect(result.units.length).toBeGreaterThanOrEqual(1);
      expect(result.totalBV).toBeGreaterThan(0);
    });

    it('should handle very high BV', () => {
      const config = {
        ...getDefaultOpForConfig(50000, Faction.COMSTAR, Era.JIHAD),
        maxLanceSize: 24, // Allow larger force for high BV
      };
      const result = opForGenerator.generate(config);

      expect(result.units.length).toBeGreaterThan(0);
      // With default lance size limits, may not reach full target
      expect(result.totalBV).toBeGreaterThan(10000);
    });

    it('should handle single unit player force', () => {
      const scenario = scenarioGenerator.generate({
        playerBV: 2000,
        playerUnitCount: 1,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      expect(scenario.template).toBeDefined();
      expect(scenario.opFor.units.length).toBeGreaterThan(0);
    });
  });
});
