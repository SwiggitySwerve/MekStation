/**
 * Known Limitations - Legacy Generic-Detector Exclusion Logic
 *
 * This module filters violation messages emitted by LEGACY generic simulation
 * detectors whose wording cannot distinguish real bugs from historic engine
 * gaps. It is NOT a feature-status ledger: per the 2026-06-09 audit (finding
 * E-10), several buckets below name features that are now fully integrated
 * (heat shutdown, LOS, critical-hit effects, pilot skill checks, ammo
 * consumption, terrain costs). Feature status lives in
 * `src/simulation/runner/CombatValidationCatalog.ts` and
 * `src/simulation/runner/CombatValidationGapInventory.ts`.
 *
 * The buckets survive because legacy detectors may still emit matching
 * messages. Suppression is explicit opt-in by invariant name (or an explicit
 * `context.legacyGeneric` / `context.legacyGenericDetector` marker) so new detectors stay visible by
 * default even when their wording overlaps a broad legacy bucket. The category
 * list and patterns are pinned by contract tests (one validation trap per
 * category in CombatValidationScopeSupport.ts) — retire a bucket only in
 * lockstep with those traps.
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
 * Each pattern matches legacy violation messages that correspond to documented
 * limitation buckets.
 */
const KNOWN_LIMITATION_PATTERNS = {
  /** Legacy/generic physical attack detectors outside the catalog suite */
  physicalAttacks: [
    /\bphysical\s+attack\b/i,
    /\bmelee\s+combat\b/i,
    /\b(?:punch|kick|charge|push)\b/i,
    /\bdeath\s+from\s+above\b|\bdfa\b/i,
    /\bhand-to-hand\b/i,
  ],

  /** Ammo consumption and reload mechanics */
  ammoConsumption: [
    /\bammo\b.*\bconsumption\b/i,
    /\bammo\b.*\bdepletion\b/i,
    /\bammo\b.*\btracking\b/i,
    /\bammo\b.*\b(?:not\s+)?tracked\b/i,
    /\breload\b/i,
    /\bfired\b.*\bwith\b.*\b0\b.*\bammo\b/i,
    /\bammo\b.*\bnot\b.*\bdecremented\b/i,
    /\bammunition\b.*\bexhausted\b/i,
  ],

  /** Heat shutdown and recovery mechanics */
  heatShutdown: [
    /\bheat\b.*\bshutdown\b/i,
    /\bshutdown\b.*\bheat\b/i,
    /\bshutdown\b.*\brecovery\b/i,
    /\bshutdown\b.*\bat\b.*\d+/i,
    /\bshould\b.*\bshut\b.*\bdown\b/i,
    /\bheat\b.*\binduced\b.*\bshutdown\b/i,
    /\bheat[-\s]+induced\b.*\bammo\b.*\bexplosion\b/i,
    /\brestart\b.*\bafter\b.*\bshutdown\b/i,
  ],

  /** Terrain movement cost validation (partial implementation) */
  terrainMovement: [
    /\bterrain\b.*\bmovement\b.*\bcost\b/i,
    /\bwater\b.*\bhex\b.*\bcost\b/i,
    /\brubble\b.*\bcost\b/i,
    /\bbuilding\b.*\bentry\b.*\bcost\b/i,
    /\bterrain\b.*\bmodifier\b.*\bmismatch\b/i,
  ],

  /** Piloting skill checks (falls, skids, consciousness) */
  pilotingChecks: [
    /\bpiloting\b.*\bcheck\b/i,
    /\bfall\b.*\bcheck\b/i,
    /\bskid\b.*\bcheck\b/i,
    /\bconsciousness\b.*\bcheck\b/i,
    /\bejection\b.*\bpsr\b/i,
    /\beject\b.*\bpiloting\b/i,
    /\bpiloting\b.*\beject\b/i,
    /\bpilot\b.*\bskill\b.*\bcheck\b/i,
  ],

  /** Critical hit effects (weapon destruction, actuator damage, etc.) */
  criticalEffects: [
    /\bcritical\b.*\bhit\b.*\beffect\b/i,
    /\bdestroyed\b.*\bweapon\b.*\bstill\b.*\bfires\b/i,
    /\bactuator\b.*\bdamage\b/i,
    /\bsensor\b.*\bcritical\b/i,
    /\bgyro\b.*\bhit\b/i,
    /\bengine\b.*\bhit\b.*\bheat\b/i,
    /\bequipment\b.*\bdestroyed\b.*\bbut\b.*\bfunctional\b/i,
  ],

  /** Line of sight validation */
  lineOfSight: [
    /\bline\s+of\s+sight\b|\blos\b/i,
    /\blos\b.*\bblocked\b/i,
    /\belevation\b.*\blos\b/i,
    /\bintervening\b.*\bterrain\b/i,
    /\bpartial\b.*\bcover\b/i,
  ],

  /** Special Pilot Abilities (SPAs) */
  specialAbilities: [
    /\bspecial\b.*\bpilot\b.*\bability\b|\bspa\b/i,
    /\bgunnery\b.*\bspecialist\b/i,
    /\bdodge\b.*\bability\b/i,
    /\bmelee\b.*\bspecialist\b/i,
    /\bspa\b.*\beffect\b.*\bnot\b.*\bapplied\b/i,
  ],

  /** Vehicle and aerospace rules */
  vehicleAerospace: [
    /\bvehicle\b.*\bmovement\b/i,
    /\bvtol\b.*\baltitude\b/i,
    /\baerospace\b.*\bunit\b/i,
    /\bvehicle\b.*\bdamage\b.*\btable\b/i,
    /\b(?:wheeled|tracked)\b|\bhover\b.*\bmovement\b/i,
  ],

  /** Campaign progression systems */
  campaignProgression: [
    /\bxp\b.*\bawarded?\b/i,
    /\bskill\b.*\bprogression\b/i,
    /\bunit\b.*\brepair\b/i,
    /\bforce\b.*\bmanagement\b/i,
    /\bcampaign\b.*\bsystem\b/i,
    /\bpilot\b.*\bskill\b.*\bnot\b.*\bimproving\b/i,
  ],

  /** MTF file parsing */
  mtfParsing: [
    /\bmtf\b.*\bfile\b.*\bparsing\b/i,
    /\bmtf\b.*\bimport\b/i,
    /\bmechtech\b.*\bformat\b/i,
  ],
} as const;

export type KnownLimitationCategory = keyof typeof KNOWN_LIMITATION_PATTERNS;

export const KNOWN_LIMITATION_CATEGORY_IDS = Object.keys(
  KNOWN_LIMITATION_PATTERNS,
) as readonly KnownLimitationCategory[];

const LEGACY_GENERIC_DETECTOR_CATEGORY_RECORD = {
  checkAmmo: ['ammoConsumption'],
  checkAmmoConsumption: ['ammoConsumption'],
  checkCombatActions: ['physicalAttacks'],
  checkCoverModifiers: ['lineOfSight'],
  checkCriticalEffects: ['criticalEffects'],
  checkHeatEffects: ['heatShutdown'],
  checkJumpAttack: ['physicalAttacks'],
  checkLineOfSight: ['lineOfSight'],
  checkMeleeCombat: ['physicalAttacks'],
  checkMovementCost: ['terrainMovement'],
  checkPhysicalAttack: ['physicalAttacks'],
  checkPilotAbilities: ['specialAbilities'],
  checkPilotAdvancement: ['campaignProgression'],
  checkPilotingSkill: ['pilotingChecks'],
  checkPilotStatus: ['pilotingChecks'],
  checkPostBattleRewards: ['campaignProgression'],
  checkReloadAction: ['ammoConsumption'],
  checkShutdownRecovery: ['heatShutdown'],
  checkTargeting: ['criticalEffects'],
  checkTerrainModifiers: ['terrainMovement'],
  checkToHitModifiers: ['specialAbilities'],
  checkUnitImport: ['mtfParsing'],
  checkVehicleMovement: ['vehicleAerospace'],
  checkVTOLPosition: ['vehicleAerospace'],
  checkWeaponFiring: ['ammoConsumption'],
  checkWeaponStatus: ['criticalEffects'],
} satisfies Record<string, readonly KnownLimitationCategory[]>;

const LEGACY_GENERIC_DETECTOR_CATEGORIES: ReadonlyMap<
  string,
  readonly KnownLimitationCategory[]
> = new Map(
  Object.entries(LEGACY_GENERIC_DETECTOR_CATEGORY_RECORD).map(
    ([invariant, categories]): [string, readonly KnownLimitationCategory[]] => [
      invariant.toLowerCase(),
      categories,
    ],
  ),
);

function isSuppressionCategoryAllowed(
  violation: IViolation,
  category: KnownLimitationCategory,
): boolean {
  if (violation.context.legacyGeneric === true) return true;
  if (violation.context.legacyGenericDetector === true) return true;

  const allowedCategories = LEGACY_GENERIC_DETECTOR_CATEGORIES.get(
    violation.invariant.toLowerCase(),
  );
  return allowedCategories?.includes(category) ?? false;
}

function findLimitationCategory(violation: IViolation): string | null {
  const message = violation.message.toLowerCase();

  for (const [category, patterns] of Object.entries(
    KNOWN_LIMITATION_PATTERNS,
  )) {
    if (patterns.some((pattern) => pattern.test(message))) {
      return category;
    }
  }

  return null;
}

/**
 * Check if a violation corresponds to a known limitation.
 *
 * Returns true only when the violation matches a documented limitation pattern
 * and was emitted by an explicitly suppressible legacy detector.
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
  const category = findLimitationCategory(violation);
  if (!category) return false;

  return isSuppressionCategoryAllowed(
    violation,
    category as KnownLimitationCategory,
  );
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
 *   logger.debug(`Excluded: ${category}`);
 * }
 * ```
 */
export function getLimitationCategory(violation: IViolation): string | null {
  const category = findLimitationCategory(violation);
  if (!category) return null;

  return isSuppressionCategoryAllowed(
    violation,
    category as KnownLimitationCategory,
  )
    ? category
    : null;
}

/**
 * Return the broad pattern category even for invariants that are intentionally
 * not suppressible. This is useful for auditing whether a validation lane would
 * have matched a legacy bucket without allowing that match to hide failures.
 */
export function getLimitationPatternCategory(
  violation: IViolation,
): string | null {
  return findLimitationCategory(violation);
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
 *   logger.debug(`Skipped: ${explanation}`);
 * }
 * ```
 */
export function getLimitationExplanation(violation: IViolation): string | null {
  const category = getLimitationCategory(violation);
  if (!category) return null;

  const explanations: Record<string, string> = {
    physicalAttacks:
      'Physical attacks generic detector gap; BattleMech validation lanes are not suppressible by this broad filter (see known-limitations.md)',
    ammoConsumption:
      'Ammo consumption is implemented; bucket retained for legacy generic detectors only (see known-limitations.md)',
    heatShutdown:
      'Heat shutdown mechanics are implemented; bucket retained for legacy generic detectors only (see known-limitations.md)',
    terrainMovement:
      'Terrain movement costs are implemented; bucket retained for legacy generic detectors only (see known-limitations.md)',
    pilotingChecks:
      'Piloting skill checks are implemented; bucket retained for legacy generic detectors only (see known-limitations.md)',
    criticalEffects:
      'Critical hit effects are implemented for system slots; bucket retained for legacy generic detectors only (see known-limitations.md)',
    lineOfSight:
      'Line of sight validation is implemented; bucket retained for legacy generic detectors only (see known-limitations.md)',
    specialAbilities:
      'Special Pilot Abilities are partially enforced per the combat validation catalog (see known-limitations.md)',
    vehicleAerospace:
      'Vehicle and aerospace rules are outside the BattleMech validation lane (see known-limitations.md)',
    campaignProgression:
      'Campaign progression is partially implemented; academy/education and coming-of-age SPA systems remain stubbed (see known-limitations.md)',
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
 * logger.debug(`Excluded ${knownLimitations.length} known limitations`);
 * logger.debug(`Found ${potentialBugs.length} potential bugs`);
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
