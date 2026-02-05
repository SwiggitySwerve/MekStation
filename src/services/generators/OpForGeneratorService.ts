/**
 * OpFor Generator Service
 * Generates enemy forces based on player BV, difficulty, and faction.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import {
  Faction,
  getRAT,
  type IRATEntry,
  selectUnitsFromRAT,
} from '../../constants/scenario/rats';
import {
  type IGeneratedPilot,
  type IGeneratedUnit,
  type IOpForGeneratorConfig,
  type IOpForGeneratorResult,
  type ISkillVariance,
  OpForSkillLevel,
  UnitTypeCategory,
} from '../../types/scenario';
import { Era } from '../../types/temporal/Era';

// =============================================================================
// Skill Level Mappings
// =============================================================================

/**
 * Base skills for each skill level.
 */
const SKILL_LEVEL_BASE: Readonly<
  Record<OpForSkillLevel, { gunnery: number; piloting: number }>
> = {
  [OpForSkillLevel.Green]: { gunnery: 5, piloting: 6 },
  [OpForSkillLevel.Regular]: { gunnery: 4, piloting: 5 },
  [OpForSkillLevel.Veteran]: { gunnery: 3, piloting: 4 },
  [OpForSkillLevel.Elite]: { gunnery: 2, piloting: 3 },
  [OpForSkillLevel.Legendary]: { gunnery: 1, piloting: 2 },
  [OpForSkillLevel.Mixed]: { gunnery: 4, piloting: 5 }, // Base for variance
};

/**
 * Default skill variance settings.
 */
const DEFAULT_SKILL_VARIANCE: ISkillVariance = {
  gunneryVariance: 1,
  pilotingVariance: 1,
  eliteChance: 0.1,
  greenChance: 0.1,
};

// =============================================================================
// Pilot Name Generator
// =============================================================================

/**
 * Sample first names for pilot generation.
 */
const FIRST_NAMES = [
  'Marcus',
  'Helena',
  'Viktor',
  'Yuki',
  'Chen',
  'Katrina',
  'Dmitri',
  'Fatima',
  'Johann',
  'Nadia',
  'Rashid',
  'Isabella',
  'Takeshi',
  'Olga',
  'Hans',
  'Mei',
  'Aleksei',
  'Lydia',
  'Tomás',
  'Ingrid',
  'Kenji',
  'Svetlana',
  'Erik',
  'Aisha',
  'Wolfgang',
  'Valentina',
  'Hiroshi',
  'Natasha',
  'Klaus',
  'Zara',
  'Gunther',
  'Sonja',
];

/**
 * Sample last names for pilot generation.
 */
const LAST_NAMES = [
  'Steiner',
  'Kurita',
  'Liao',
  'Davion',
  'Marik',
  'Kerensky',
  'Allard',
  'Kell',
  'Wolf',
  'Hazen',
  'Pryde',
  'Fetladral',
  'Radick',
  'Osis',
  'Moon',
  'Carns',
  'Sorenson',
  'Tanaka',
  'Mueller',
  'Volkov',
  'Chen',
  'Martinez',
  'Nakamura',
  'Weber',
  'Schmidt',
  'Ivanov',
  'Park',
  'Garcia',
  'Johansson',
  'Petrov',
  'Yamamoto',
  'Klein',
];

/**
 * Generate a random pilot name.
 * @param randomFn - Optional random function for seeded PRNG (defaults to Math.random)
 */
function generatePilotName(randomFn: () => number = Math.random): string {
  const firstName = FIRST_NAMES[Math.floor(randomFn() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(randomFn() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Filter RAT entries by year availability.
 * Handles optional introductionYear and extinctionYear fields.
 */
function filterRATEntriesByYear(
  entries: readonly IRATEntry[],
  year: number,
): IRATEntry[] {
  return entries.filter((entry) => {
    if (entry.introductionYear !== undefined && year < entry.introductionYear) {
      return false;
    }

    if (entry.extinctionYear !== undefined && year > entry.extinctionYear) {
      return false;
    }

    return true;
  });
}

// =============================================================================
// OpFor Generator Class
// =============================================================================

/**
 * OpFor Generator Service
 * Creates balanced enemy forces for scenarios.
 */
export class OpForGeneratorService {
  /**
   * Generate an OpFor based on configuration.
   * @param config - OpFor generation configuration
   * @param randomFn - Optional random function for seeded PRNG (defaults to Math.random)
   */
  generate(
    config: IOpForGeneratorConfig,
    randomFn: () => number = Math.random,
  ): IOpForGeneratorResult {
    // Calculate target BV
    const targetBV = Math.round(config.playerBV * config.difficultyMultiplier);

    // Get appropriate RAT
    const rat = getRAT(config.faction, config.era as Era);

    // Select units from RAT
    const selectedEntries = this.selectUnits(rat, targetBV, config, randomFn);

    // Convert to generated units with pilots
    const units = this.createGeneratedUnits(selectedEntries, config, randomFn);

    // Calculate totals
    const totalBV = units.reduce((sum, u) => sum + u.bv, 0);
    const bvDeviation = (totalBV - targetBV) / targetBV;

    return {
      units,
      totalBV,
      targetBV,
      bvDeviation,
      metadata: {
        faction: config.faction,
        era: config.era,
        difficultyMultiplier: config.difficultyMultiplier,
        lanceCount: Math.ceil(units.length / 4),
      },
    };
  }

  /**
   * Select units from RAT based on configuration.
   */
  private selectUnits(
    rat: ReturnType<typeof getRAT>,
    targetBV: number,
    config: IOpForGeneratorConfig,
    randomFn: () => number,
  ): readonly IRATEntry[] {
    let availableEntries = rat.entries;

    if (config.year !== undefined) {
      availableEntries = filterRATEntriesByYear(rat.entries, config.year);

      if (availableEntries.length === 0) {
        console.warn(
          `No units available for year ${config.year} in faction ${config.faction}. Using all available units.`,
        );
        availableEntries = rat.entries;
      }
    }

    const filteredRAT = {
      ...rat,
      entries: availableEntries,
      totalWeight: availableEntries.reduce((sum, e) => sum + e.weight, 0),
    };

    const unitTypesToSelect = this.getUnitTypesToSelect(config);

    const allSelected: IRATEntry[] = [];

    for (const [unitType, percentage] of unitTypesToSelect) {
      const typeBV = Math.round(targetBV * (percentage / 100));
      if (typeBV < 100) continue;

      const typeUnits = selectUnitsFromRAT(filteredRAT, typeBV, {
        unitTypeFilter: unitType,
        minUnits: 1,
        maxUnits: Math.ceil(config.maxLanceSize * (percentage / 100)),
        bvTolerance: 0.15,
        randomFn,
      });

      allSelected.push(...typeUnits);
    }

    if (allSelected.length === 0) {
      return selectUnitsFromRAT(filteredRAT, targetBV, {
        minUnits: config.minLanceSize,
        maxUnits: config.maxLanceSize,
        bvTolerance: 0.15,
        randomFn,
      });
    }

    return allSelected;
  }

  /**
   * Determine which unit types to select and in what proportions.
   */
  private getUnitTypesToSelect(
    config: IOpForGeneratorConfig,
  ): Array<[UnitTypeCategory, number]> {
    const result: Array<[UnitTypeCategory, number]> = [];
    const mix = config.unitTypeMix;

    // Check each category
    for (const category of Object.values(UnitTypeCategory)) {
      const percentage = mix[category as keyof typeof mix];
      if (percentage && percentage > 0) {
        result.push([category as UnitTypeCategory, percentage]);
      }
    }

    // Default to 100% BattleMechs if nothing specified
    if (result.length === 0) {
      result.push([UnitTypeCategory.BattleMech, 100]);
    }

    return result;
  }

  /**
   * Convert RAT entries to generated units with pilots.
   */
  private createGeneratedUnits(
    entries: readonly IRATEntry[],
    config: IOpForGeneratorConfig,
    randomFn: () => number,
  ): readonly IGeneratedUnit[] {
    const units: IGeneratedUnit[] = [];
    let lanceId = 1;
    let lanceUnitCount = 0;

    for (const entry of entries) {
      // Create pilot with appropriate skills
      const pilot = this.generatePilot(config, randomFn);

      // Assign to lance
      const currentLanceId = `lance-${lanceId}`;
      lanceUnitCount++;

      // Start new lance every 4 units
      if (lanceUnitCount >= 4) {
        lanceId++;
        lanceUnitCount = 0;
      }

      units.push({
        chassis: entry.chassis,
        variant: entry.variant,
        designation: entry.designation,
        bv: entry.bv,
        tonnage: entry.tonnage,
        unitType: entry.unitType,
        pilot,
        lanceId: currentLanceId,
      });
    }

    return units;
  }

  /**
   * Generate a pilot with skills based on configuration.
   */
  private generatePilot(
    config: IOpForGeneratorConfig,
    randomFn: () => number,
  ): IGeneratedPilot {
    const base = SKILL_LEVEL_BASE[config.skillLevel];
    const variance = config.skillVariance || DEFAULT_SKILL_VARIANCE;

    let gunnery = base.gunnery;
    let piloting = base.piloting;

    // Apply variance for mixed skill level
    if (config.skillLevel === OpForSkillLevel.Mixed) {
      // Roll for skill variance
      const roll = randomFn();

      if (roll < variance.eliteChance) {
        // Elite pilot
        gunnery = Math.max(1, gunnery - 1);
        piloting = Math.max(2, piloting - 1);
      } else if (roll > 1 - variance.greenChance) {
        // Green pilot
        gunnery = Math.min(6, gunnery + 1);
        piloting = Math.min(7, piloting + 1);
      } else {
        // Regular variance
        const gunneryDelta =
          Math.floor(randomFn() * (variance.gunneryVariance * 2 + 1)) -
          variance.gunneryVariance;
        const pilotingDelta =
          Math.floor(randomFn() * (variance.pilotingVariance * 2 + 1)) -
          variance.pilotingVariance;
        gunnery = Math.max(1, Math.min(6, gunnery + gunneryDelta));
        piloting = Math.max(2, Math.min(7, piloting + pilotingDelta));
      }
    }

    return {
      name: generatePilotName(randomFn),
      gunnery,
      piloting,
    };
  }

  /**
   * Estimate the BV adjustment for pilot skills.
   * Better skills = higher effective BV.
   *
   * TODO: This method is currently unused. Consider integrating it into OpFor generation
   * to provide more accurate BV calculations that account for pilot skill differences.
   */
  estimateSkillBVMultiplier(gunnery: number, piloting: number): number {
    // Standard reference is 4/5 (Regular)
    const baseSkill = 4 + 5;
    const actualSkill = gunnery + piloting;

    // Each point of improvement is roughly +10% BV
    // Each point worse is roughly -8% BV
    const skillDiff = baseSkill - actualSkill;

    if (skillDiff > 0) {
      return 1 + skillDiff * 0.1;
    } else {
      return 1 + skillDiff * 0.08;
    }
  }
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default OpFor generator configuration.
 */
export function getDefaultOpForConfig(
  playerBV: number,
  faction?: string,
  era?: string,
): IOpForGeneratorConfig {
  return {
    playerBV,
    difficultyMultiplier: 1.0,
    faction: faction || Faction.PIRATES,
    era: era || Era.CLAN_INVASION,
    unitTypeMix: {
      [UnitTypeCategory.BattleMech]: 100,
    },
    skillLevel: OpForSkillLevel.Regular,
    skillVariance: DEFAULT_SKILL_VARIANCE,
    minLanceSize: 4,
    maxLanceSize: 12,
    bvFloor: 0.85,
    bvCeiling: 1.15,
    allowCombinedArms: false,
  };
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Singleton OpFor generator service.
 */
export const opForGenerator = new OpForGeneratorService();
