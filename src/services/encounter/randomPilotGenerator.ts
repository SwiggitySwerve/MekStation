/**
 * Random Pilot Generator
 *
 * Two synthesis strategies for producing ephemeral IPilot objects:
 *   - "vault-sample"    : pick N pilots from a provided vault (without
 *                         replacement where possible; with replacement if
 *                         N > vault.length, flagged in metadata).
 *   - "template-synthesis": generate N brand-new statblock pilots whose
 *                         skills are drawn uniformly from the provided
 *                         IPilotSkillTemplate ranges; not persisted anywhere.
 *
 * All returned pilots are PilotType.Statblock so they do not touch the
 * persistent store.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/random-force-generator/spec.md
 * @design D6 — vault-sample + template-synthesis, no store writes
 */

import { SeededRandom } from '@/simulation/core/SeededRandom';
import { PilotSkillTemplate } from '@/types/encounter/EncounterInterfaces';
import {
  IPilot,
  IPilotSkills,
  PilotStatus,
  PilotType,
} from '@/types/pilot/PilotInterfaces';

import { IPilotSkillTemplate, resolveBand } from './pilotSkillBands';

// =============================================================================
// Public Types
// =============================================================================

/**
 * Strategy for how pilots should be obtained.
 */
export type PilotStrategy = 'vault-sample' | 'template-synthesis';

/**
 * Options for the random pilot generator.
 */
export interface IRandomPilotOptions {
  /** How many pilots to generate */
  readonly count: number;
  /** Generation strategy */
  readonly strategy: PilotStrategy;
  /** Seeded RNG instance (injected for determinism) */
  readonly random: SeededRandom;

  // --- vault-sample specific ---
  /**
   * Pool of existing pilots to sample from.
   * Required when strategy === "vault-sample".
   */
  readonly vault?: readonly IPilot[];

  // --- template-synthesis specific ---
  /**
   * Skill template for synthesized pilots.
   * Required when strategy === "template-synthesis".
   */
  readonly skillTemplate?: IPilotSkillTemplate | PilotSkillTemplate;

  /**
   * Optional name prefix for synthesized pilots.
   * Default: "Pilot".
   */
  readonly namePrefix?: string;
}

/**
 * Result of pilot generation with metadata.
 */
export interface IRandomPilotResult {
  /** The generated pilots */
  readonly pilots: readonly IPilot[];
  /**
   * True when vault-sample mode had to sample with replacement because
   * count > vault.length. Callers can use this to warn about duplicate pilots.
   */
  readonly sampledWithReplacement: boolean;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Draw N items from an array without replacement using Fisher-Yates partial
 * shuffle. When n > array.length, falls back to sampling with replacement.
 * Returns { items, withReplacement }.
 */
function sampleFromArray<T>(
  arr: readonly T[],
  n: number,
  random: SeededRandom,
): { items: T[]; withReplacement: boolean } {
  if (arr.length === 0) {
    return { items: [], withReplacement: false };
  }

  if (n <= arr.length) {
    // Without replacement: partial Fisher-Yates
    const pool = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(random.next() * (pool.length - i));
      // Swap
      const temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
      result.push(pool[i]);
    }
    return { items: result, withReplacement: false };
  }

  // With replacement: just pick randomly n times
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(random.next() * arr.length);
    result.push(arr[idx]);
  }
  return { items: result, withReplacement: true };
}

/**
 * Draw a uniform integer in [min, max] inclusive.
 */
function uniformInt(min: number, max: number, random: SeededRandom): number {
  // Math.floor covers the full [min, max] inclusive range
  return Math.floor(random.next() * (max - min + 1)) + min;
}

/**
 * Synthesize a single ephemeral pilot from a skill template range.
 * The returned pilot is PilotType.Statblock with no career or awards.
 */
function synthesizePilot(
  template: IPilotSkillTemplate,
  index: number,
  namePrefix: string,
  random: SeededRandom,
  now: string,
): IPilot {
  const gunnery = uniformInt(
    template.gunneryRange[0],
    template.gunneryRange[1],
    random,
  );
  const piloting = uniformInt(
    template.pilotingRange[0],
    template.pilotingRange[1],
    random,
  );

  const skills: IPilotSkills = { gunnery, piloting };

  return {
    id: `synth-pilot-${Date.now()}-${index}-${Math.floor(random.next() * 1_000_000)}`,
    name: `${namePrefix} ${index + 1}`,
    type: PilotType.Statblock,
    status: PilotStatus.Active,
    skills,
    wounds: 0,
    abilities: [],
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// Public Generator
// =============================================================================

/**
 * Generate a set of IPilot objects using the specified strategy.
 *
 * vault-sample (D6):
 *   Draws `count` pilots from the vault without replacement (Fisher-Yates
 *   partial shuffle). If count > vault.length, falls back to with-replacement
 *   sampling and stamps `sampledWithReplacement: true` on the result.
 *
 * template-synthesis (D6):
 *   Creates `count` brand-new Statblock pilots with gunnery and piloting
 *   drawn uniformly from the template's ranges. The template may be an
 *   IPilotSkillTemplate (range object) or a PilotSkillTemplate enum value
 *   (which is resolved via pilotSkillBands.resolveBand). Mixed enum picks
 *   a random band per pilot to produce varied skill distribution.
 *
 * @throws {Error} when required strategy-specific options are missing.
 */
export function generateRandomPilots(
  opts: IRandomPilotOptions,
): IRandomPilotResult {
  const { count, strategy, random } = opts;

  if (strategy === 'vault-sample') {
    const vault = opts.vault ?? [];
    const { items, withReplacement } = sampleFromArray(vault, count, random);
    return { pilots: items, sampledWithReplacement: withReplacement };
  }

  // template-synthesis
  const rawTemplate = opts.skillTemplate;
  if (rawTemplate === undefined) {
    throw new Error(
      'randomPilotGenerator: skillTemplate is required for template-synthesis strategy',
    );
  }

  const namePrefix = opts.namePrefix ?? 'Pilot';
  const now = new Date().toISOString();
  const pilots: IPilot[] = [];

  for (let i = 0; i < count; i++) {
    // Resolve per-pilot when Mixed (each pilot may get a different band)
    let band: IPilotSkillTemplate;
    if (typeof rawTemplate === 'string') {
      // PilotSkillTemplate enum value — resolve via skill bands
      band = resolveBand(rawTemplate as PilotSkillTemplate, () =>
        random.next(),
      );
    } else {
      // Already an IPilotSkillTemplate with explicit ranges
      band = rawTemplate;
    }
    pilots.push(synthesizePilot(band, i, namePrefix, random, now));
  }

  return { pilots, sampledWithReplacement: false };
}
