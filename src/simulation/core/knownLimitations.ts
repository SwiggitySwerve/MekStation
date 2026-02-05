/**
 * Known Limitations - Programmatic Exclusion Logic
 *
 * This module provides functions to identify violations that correspond to
 * documented limitations in the game engine, preventing false positives in
 * simulation bug reports.
 *
 * @see src/simulation/known-limitations.md for human-readable documentation
 */

/**
 * Violation interface (minimal definition for type safety).
 * Full definition should come from invariants/types.ts when available.
 */
export interface IViolation {
  /** Invariant identifier that detected the violation */
  readonly invariant: string;
  /** Severity level */
  readonly severity: 'error' | 'warning' | 'info';
  /** Human-readable violation message */
  readonly message: string;
  /** Additional context data */
  readonly context: Record<string, unknown>;
}

/**
 * Known limitation categories with regex patterns for detection.
 * Each pattern matches violation messages or invariant names that correspond
 * to documented limitations.
 */
const KNOWN_LIMITATION_PATTERNS = {
  /** Physical attacks (punches, kicks, charges, DFA) */
  physicalAttacks: [
    /physical\s*attack/i,
    /melee\s*combat/i,
    /punch|kick|charge|push/i,
    /death\s*from\s*above|dfa/i,
    /hand-to-hand/i,
  ],

  /** Ammo consumption and reload mechanics */
  ammoConsumption: [
    /ammo.*consumption/i,
    /ammo.*depletion/i,
    /ammo.*tracking/i,
    /reload/i,
    /fired.*with.*0.*ammo/i,
    /ammo.*not.*decremented/i,
    /ammunition.*exhausted/i,
  ],

  /** Heat shutdown and recovery mechanics */
  heatShutdown: [
    /heat.*shutdown/i,
    /shutdown.*heat/i,
    /shutdown.*recovery/i,
    /shutdown.*at.*\d+/i,
    /should.*shut.*down/i,
    /heat.*induced.*shutdown/i,
    /restart.*after.*shutdown/i,
  ],

  /** Terrain movement cost validation (partial implementation) */
  terrainMovement: [
    /terrain.*movement.*cost/i,
    /water.*hex.*cost/i,
    /rubble.*cost/i,
    /building.*entry.*cost/i,
    /terrain.*modifier.*mismatch/i,
  ],

  /** Piloting skill checks (falls, skids, consciousness) */
  pilotingChecks: [
    /piloting.*check/i,
    /fall.*check/i,
    /skid.*check/i,
    /consciousness.*check/i,
    /ejection/i,
    /pilot.*skill.*check/i,
  ],

  /** Critical hit effects (weapon destruction, actuator damage, etc.) */
  criticalEffects: [
    /critical.*hit.*effect/i,
    /destroyed.*weapon.*still.*fires/i,
    /actuator.*damage/i,
    /sensor.*critical/i,
    /gyro.*hit/i,
    /engine.*hit.*heat/i,
    /equipment.*destroyed.*but.*functional/i,
  ],

  /** Line of sight validation */
  lineOfSight: [
    /line.*of.*sight|los/i,
    /los.*blocked/i,
    /elevation.*los/i,
    /intervening.*terrain/i,
    /partial.*cover/i,
  ],

  /** Special Pilot Abilities (SPAs) */
  specialAbilities: [
    /special.*pilot.*ability|spa/i,
    /gunnery.*specialist/i,
    /dodge.*ability/i,
    /melee.*specialist/i,
    /spa.*effect.*not.*applied/i,
  ],

  /** Vehicle and aerospace rules */
  vehicleAerospace: [
    /vehicle.*movement/i,
    /vtol.*altitude/i,
    /aerospace.*unit/i,
    /vehicle.*damage.*table/i,
    /wheeled|tracked|hover.*movement/i,
  ],

  /** Campaign progression systems */
  campaignProgression: [
    /xp.*award/i,
    /skill.*progression/i,
    /unit.*repair/i,
    /force.*management/i,
    /campaign.*system/i,
  ],

  /** MTF file parsing */
  mtfParsing: [/mtf.*file.*parsing/i, /mtf.*import/i, /mechtech.*format/i],
} as const;

/**
 * Flattened list of all known limitation patterns for efficient matching.
 */
const ALL_PATTERNS: readonly RegExp[] = Object.values(
  KNOWN_LIMITATION_PATTERNS,
).flat();

/**
 * Check if a violation corresponds to a known limitation.
 *
 * Returns true if the violation matches any documented limitation pattern,
 * indicating it should be excluded from bug reports.
 *
 * @param violation - The violation to check
 * @returns true if this is a known limitation, false if it's a potential bug
 *
 * @example
 * ```typescript
 * const violation = {
 *   invariant: 'checkPhysicalAttack',
 *   severity: 'warning',
 *   message: 'Physical attack not available',
 *   context: {}
 * };
 *
 * if (isKnownLimitation(violation)) {
 *   // Don't report this - it's a documented limitation
 *   return;
 * }
 * ```
 */
export function isKnownLimitation(violation: IViolation): boolean {
  const message = violation.message.toLowerCase();
  const invariant = violation.invariant.toLowerCase();
  const combinedText = `${message} ${invariant}`;

  return ALL_PATTERNS.some((pattern) => pattern.test(combinedText));
}

/**
 * Get the limitation category for a violation.
 *
 * Returns the category name if the violation matches a known limitation,
 * or null if it doesn't match any limitation.
 *
 * @param violation - The violation to categorize
 * @returns Category name or null
 *
 * @example
 * ```typescript
 * const category = getLimitationCategory(violation);
 * if (category) {
 *   console.log(`Excluded: ${category}`);
 * }
 * ```
 */
export function getLimitationCategory(violation: IViolation): string | null {
  const message = violation.message.toLowerCase();
  const invariant = violation.invariant.toLowerCase();
  const combinedText = `${message} ${invariant}`;

  for (const [category, patterns] of Object.entries(
    KNOWN_LIMITATION_PATTERNS,
  )) {
    if (patterns.some((pattern) => pattern.test(combinedText))) {
      return category;
    }
  }

  return null;
}

/**
 * Get a human-readable explanation for why a violation is a known limitation.
 *
 * Returns a brief explanation referencing the documentation, or null if the
 * violation is not a known limitation.
 *
 * @param violation - The violation to explain
 * @returns Explanation string or null
 *
 * @example
 * ```typescript
 * const explanation = getLimitationExplanation(violation);
 * if (explanation) {
 *   console.log(`Skipped: ${explanation}`);
 * }
 * ```
 */
export function getLimitationExplanation(violation: IViolation): string | null {
  const category = getLimitationCategory(violation);
  if (!category) return null;

  const explanations: Record<string, string> = {
    physicalAttacks:
      'Physical attacks are not yet implemented (see known-limitations.md)',
    ammoConsumption:
      'Ammo consumption tracking is not enforced (see known-limitations.md)',
    heatShutdown:
      'Heat shutdown mechanics are partially implemented (see known-limitations.md)',
    terrainMovement:
      'Terrain movement costs use simplified rules (see known-limitations.md)',
    pilotingChecks:
      'Piloting skill checks are partially implemented (see known-limitations.md)',
    criticalEffects:
      'Critical hit effects are not fully enforced (see known-limitations.md)',
    lineOfSight:
      'Line of sight validation is not implemented (see known-limitations.md)',
    specialAbilities:
      'Special Pilot Abilities are not enforced (see known-limitations.md)',
    vehicleAerospace:
      'Vehicle and aerospace rules are not implemented (see known-limitations.md)',
    campaignProgression:
      'Campaign progression systems are stubbed (see known-limitations.md)',
    mtfParsing:
      'MTF file parsing is not implemented (see known-limitations.md)',
  };

  return explanations[category] || null;
}

/**
 * Filter a list of violations to exclude known limitations.
 *
 * Returns only violations that are NOT known limitations, i.e., potential bugs
 * that should be reported.
 *
 * @param violations - List of violations to filter
 * @returns Filtered list containing only potential bugs
 *
 * @example
 * ```typescript
 * const allViolations = checkInvariants(gameState);
 * const actualBugs = filterKnownLimitations(allViolations);
 *
 * if (actualBugs.length > 0) {
 *   reportBugs(actualBugs);
 * }
 * ```
 */
export function filterKnownLimitations(
  violations: readonly IViolation[],
): readonly IViolation[] {
  return violations.filter((v) => !isKnownLimitation(v));
}

/**
 * Partition violations into known limitations and potential bugs.
 *
 * Returns an object with two arrays: violations that are known limitations,
 * and violations that are potential bugs.
 *
 * @param violations - List of violations to partition
 * @returns Object with `knownLimitations` and `potentialBugs` arrays
 *
 * @example
 * ```typescript
 * const { knownLimitations, potentialBugs } = partitionViolations(allViolations);
 *
 * console.log(`Excluded ${knownLimitations.length} known limitations`);
 * console.log(`Found ${potentialBugs.length} potential bugs`);
 * ```
 */
export function partitionViolations(violations: readonly IViolation[]): {
  readonly knownLimitations: readonly IViolation[];
  readonly potentialBugs: readonly IViolation[];
} {
  const knownLimitations: IViolation[] = [];
  const potentialBugs: IViolation[] = [];

  for (const violation of violations) {
    if (isKnownLimitation(violation)) {
      knownLimitations.push(violation);
    } else {
      potentialBugs.push(violation);
    }
  }

  return { knownLimitations, potentialBugs };
}
