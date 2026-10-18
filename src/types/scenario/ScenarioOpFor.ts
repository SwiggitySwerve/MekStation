import { UnitTypeCategory, OpForSkillLevel } from './ScenarioEnums';

// =============================================================================
// OpFor Configuration Interface
// =============================================================================

/**
 * Unit type mix configuration.
 * Values are percentages that should sum to 100.
 */
export interface IUnitTypeMix {
  /** Percentage of BattleMechs */
  readonly [UnitTypeCategory.BattleMech]?: number;
  /** Percentage of Vehicles */
  readonly [UnitTypeCategory.Vehicle]?: number;
  /** Percentage of Infantry */
  readonly [UnitTypeCategory.Infantry]?: number;
  /** Percentage of Battle Armor */
  readonly [UnitTypeCategory.BattleArmor]?: number;
  /** Percentage of Aerospace */
  readonly [UnitTypeCategory.Aerospace]?: number;
  /** Percentage of ProtoMechs */
  readonly [UnitTypeCategory.ProtoMech]?: number;
  /** Percentage of Conventional Fighters */
  readonly [UnitTypeCategory.ConventionalFighter]?: number;
}

/**
 * Skill variance configuration.
 */
export interface ISkillVariance {
  /** Gunnery skill variance (+/- from base) */
  readonly gunneryVariance: number;
  /** Piloting skill variance (+/- from base) */
  readonly pilotingVariance: number;
  /** Chance for skill to be better than base (0-1) */
  readonly eliteChance: number;
  /** Chance for skill to be worse than base (0-1) */
  readonly greenChance: number;
}

/**
 * OpFor generation configuration.
 */
export interface IOpForGeneratorConfig {
  /** Player force total BV */
  readonly playerBV: number;
  /** Difficulty multiplier (0.5 = easy, 1.0 = normal, 1.5 = hard) */
  readonly difficultyMultiplier: number;
  /** Enemy faction for unit selection */
  readonly faction: string;
  /** Era for era-appropriate units */
  readonly era: string;
  /**
   * Year for temporal filtering of units.
   * When specified, only units available in this year will be selected.
   * Uses introductionYear and extinctionYear from unit data.
   * @see filterByYear in availabilityUtils
   */
  readonly year?: number;
  /** Unit type mix ratios */
  readonly unitTypeMix: IUnitTypeMix;
  /** Base skill level */
  readonly skillLevel: OpForSkillLevel;
  /** Skill variance settings */
  readonly skillVariance: ISkillVariance;
  /** Minimum lance size */
  readonly minLanceSize: number;
  /** Maximum lance size */
  readonly maxLanceSize: number;
  /** BV floor (stop if below this) */
  readonly bvFloor: number;
  /** BV ceiling (stop if above this) */
  readonly bvCeiling: number;
  /** Allow combined arms? */
  readonly allowCombinedArms: boolean;
  /** Weight class restrictions */
  readonly weightClassRestrictions?: readonly string[];
  /** Excluded unit chassis */
  readonly excludedChassis?: readonly string[];
}

/**
 * Result of OpFor generation.
 */
export interface IOpForGeneratorResult {
  /** Generated units */
  readonly units: readonly IGeneratedUnit[];
  /** Total BV of generated force */
  readonly totalBV: number;
  /** Target BV (for comparison) */
  readonly targetBV: number;
  /** BV deviation percentage */
  readonly bvDeviation: number;
  /** Generation metadata */
  readonly metadata: {
    readonly faction: string;
    readonly era: string;
    readonly difficultyMultiplier: number;
    readonly lanceCount: number;
  };
}

/**
 * Generated unit from OpFor generator.
 */
export interface IGeneratedUnit {
  /** Canonical unit catalog ID used by live combat and recovery. */
  readonly sourceUnitId: string;
  /** Unit chassis name */
  readonly chassis: string;
  /** Unit variant name */
  readonly variant: string;
  /** Full unit designation */
  readonly designation: string;
  /** Unit BV */
  readonly bv: number;
  /** Unit tonnage */
  readonly tonnage: number;
  /** Unit type category */
  readonly unitType: UnitTypeCategory;
  /** Assigned pilot */
  readonly pilot: IGeneratedPilot;
  /** Lance assignment */
  readonly lanceId: string;
}

/**
 * Generated pilot for OpFor unit.
 */
export interface IGeneratedPilot {
  /** Pilot name */
  readonly name: string;
  /** Gunnery skill */
  readonly gunnery: number;
  /** Piloting skill */
  readonly piloting: number;
  /** Special abilities */
  readonly abilities?: readonly string[];
}
