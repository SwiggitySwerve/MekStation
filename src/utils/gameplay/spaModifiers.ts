/**
 * SPA (Special Pilot Abilities) Combat Modifiers
 * Implements BattleTech pilot special abilities for combat resolution.
 *
 * @spec openspec/changes/full-combat-parity/specs/spa-combat-integration/spec.md
 */

import { RangeBracket, MovementType } from '@/types/gameplay';
import {
  IToHitModifierDetail,
  IAttackerState,
  ITargetState,
} from '@/types/gameplay';

// =============================================================================
// Edge Trigger System
// =============================================================================

/**
 * The 6 specific Edge trigger types for mek combat.
 * Edge is NOT a generic reroll — each trigger has specific usage conditions.
 */
export type EdgeTriggerType =
  | 'reroll-to-hit'
  | 'reroll-damage-location'
  | 'reroll-critical-hit'
  | 'reroll-psr'
  | 'reroll-consciousness'
  | 'negate-critical-hit';

/**
 * Edge trigger definitions with descriptions.
 */
export const EDGE_TRIGGERS: Record<
  EdgeTriggerType,
  { name: string; description: string }
> = {
  'reroll-to-hit': {
    name: 'Reroll To-Hit',
    description: 'Reroll a to-hit attack roll (attacker or defender)',
  },
  'reroll-damage-location': {
    name: 'Reroll Damage Location',
    description: 'Reroll a hit location determination roll',
  },
  'reroll-critical-hit': {
    name: 'Reroll Critical Hit',
    description: 'Reroll a critical hit determination roll',
  },
  'reroll-psr': {
    name: 'Reroll PSR',
    description: 'Reroll a piloting skill roll',
  },
  'reroll-consciousness': {
    name: 'Reroll Consciousness',
    description: 'Reroll a consciousness check',
  },
  'negate-critical-hit': {
    name: 'Negate Critical Hit',
    description: 'Cancel one critical hit that was just determined',
  },
};

/**
 * State of a pilot's Edge points during a game.
 */
export interface IEdgeState {
  /** Maximum Edge points (set at game start, typically 1-3) */
  readonly maxPoints: number;
  /** Remaining Edge points */
  readonly remainingPoints: number;
  /** History of Edge uses this game */
  readonly usageHistory: readonly IEdgeUsage[];
}

/**
 * Record of a single Edge usage.
 */
export interface IEdgeUsage {
  /** Which trigger was used */
  readonly trigger: EdgeTriggerType;
  /** Turn when Edge was used */
  readonly turn: number;
  /** Unit that used Edge */
  readonly unitId: string;
  /** Brief description of what was rerolled/negated */
  readonly description: string;
}

/**
 * Create initial Edge state for a pilot.
 */
export function createEdgeState(edgePoints: number): IEdgeState {
  return {
    maxPoints: edgePoints,
    remainingPoints: edgePoints,
    usageHistory: [],
  };
}

/**
 * Check if a pilot can use Edge for a specific trigger.
 */
export function canUseEdge(
  edgeState: IEdgeState | undefined,
  trigger: EdgeTriggerType,
): boolean {
  if (!edgeState) return false;
  if (edgeState.remainingPoints <= 0) return false;
  // All 6 triggers are always available as long as points remain
  return trigger in EDGE_TRIGGERS;
}

/**
 * Use an Edge point. Returns the new Edge state.
 */
export function useEdge(
  edgeState: IEdgeState,
  trigger: EdgeTriggerType,
  turn: number,
  unitId: string,
  description: string,
): IEdgeState {
  if (edgeState.remainingPoints <= 0) {
    throw new Error('No Edge points remaining');
  }

  return {
    ...edgeState,
    remainingPoints: edgeState.remainingPoints - 1,
    usageHistory: [
      ...edgeState.usageHistory,
      { trigger, turn, unitId, description },
    ],
  };
}

// =============================================================================
// SPA Combat Effect Context
// =============================================================================

/**
 * Context for SPA modifier calculation — extends attacker/target with SPA-specific data.
 */
export interface ISPAContext {
  /** Pilot's SPA identifiers (e.g., ['weapon-specialist', 'sniper']) */
  readonly abilities: readonly string[];
  /** Weapon type being fired (for Weapon Specialist) */
  readonly weaponType?: string;
  /** Weapon category: 'energy' | 'ballistic' | 'missile' (for Gunnery Specialist) */
  readonly weaponCategory?: string;
  /** Designated weapon type for Weapon Specialist */
  readonly designatedWeaponType?: string;
  /** Designated weapon category for Gunnery Specialist */
  readonly designatedWeaponCategory?: string;
  /** Designated target ID for Blood Stalker */
  readonly designatedTargetId?: string;
  /** Actual target being fired at */
  readonly targetId?: string;
  /** Designated range bracket for Range Master */
  readonly designatedRangeBracket?: RangeBracket;
  /** Current range bracket of the attack */
  readonly rangeBracket?: RangeBracket;
  /** Whether pilot declared a dodge action this turn */
  readonly isDodging?: boolean;
  /** Edge state for this pilot */
  readonly edgeState?: IEdgeState;
}

// =============================================================================
// Gunnery SPA Modifiers
// =============================================================================

/**
 * Weapon Specialist: -2 to-hit for designated weapon type.
 */
export function calculateWeaponSpecialistModifier(
  abilities: readonly string[],
  weaponType?: string,
  designatedWeaponType?: string,
): IToHitModifierDetail | null {
  if (!abilities.includes('weapon-specialist')) return null;
  if (!weaponType || !designatedWeaponType) return null;
  if (weaponType.toLowerCase() !== designatedWeaponType.toLowerCase())
    return null;

  return {
    name: 'Weapon Specialist',
    value: -2,
    source: 'spa',
    description: `Weapon Specialist (${designatedWeaponType}): -2`,
  };
}

/**
 * Gunnery Specialist: -1 for designated category, +1 for others.
 */
export function calculateGunnerySpecialistModifier(
  abilities: readonly string[],
  weaponCategory?: string,
  designatedCategory?: string,
): IToHitModifierDetail | null {
  if (!abilities.includes('gunnery-specialist')) return null;
  if (!weaponCategory || !designatedCategory) return null;

  const isDesignated =
    weaponCategory.toLowerCase() === designatedCategory.toLowerCase();
  return {
    name: 'Gunnery Specialist',
    value: isDesignated ? -1 : 1,
    source: 'spa',
    description: isDesignated
      ? `Gunnery Specialist (${designatedCategory}): -1`
      : `Gunnery Specialist (not ${designatedCategory}): +1`,
  };
}

/**
 * Blood Stalker: -1 vs designated target, +2 vs all others.
 */
export function calculateBloodStalkerModifier(
  abilities: readonly string[],
  targetId?: string,
  designatedTargetId?: string,
): IToHitModifierDetail | null {
  if (!abilities.includes('blood-stalker')) return null;
  if (!targetId || !designatedTargetId) return null;

  const isDesignated = targetId === designatedTargetId;
  return {
    name: 'Blood Stalker',
    value: isDesignated ? -1 : 2,
    source: 'spa',
    description: isDesignated
      ? 'Blood Stalker (designated target): -1'
      : 'Blood Stalker (non-designated target): +2',
  };
}

/**
 * Range Master: zeroes range modifier for one designated bracket.
 * Returns the negation of the current range modifier for the designated bracket.
 */
export function calculateRangeMasterModifier(
  abilities: readonly string[],
  rangeBracket?: RangeBracket,
  designatedBracket?: RangeBracket,
  currentRangeModifier?: number,
): IToHitModifierDetail | null {
  if (!abilities.includes('range-master')) return null;
  if (!rangeBracket || !designatedBracket) return null;
  if (rangeBracket !== designatedBracket) return null;
  if (currentRangeModifier === undefined || currentRangeModifier <= 0)
    return null;

  return {
    name: 'Range Master',
    value: -currentRangeModifier,
    source: 'spa',
    description: `Range Master (${designatedBracket}): zeroes range modifier`,
  };
}

/**
 * Sniper: halves all positive range modifiers (round down).
 * Returns a negative modifier equal to half the current range modifier.
 */
export function calculateSniperModifier(
  abilities: readonly string[],
  currentRangeModifier?: number,
): IToHitModifierDetail | null {
  if (!abilities.includes('sniper')) return null;
  if (currentRangeModifier === undefined || currentRangeModifier <= 0)
    return null;

  const reduction = -Math.floor(currentRangeModifier / 2);
  if (reduction === 0) return null;

  return {
    name: 'Sniper',
    value: reduction,
    source: 'spa',
    description: `Sniper: halves range modifier (${currentRangeModifier} → ${currentRangeModifier + reduction})`,
  };
}

/**
 * Multi-Tasker: -1 to secondary target penalty.
 */
export function calculateMultiTaskerModifier(
  abilities: readonly string[],
  isSecondaryTarget?: boolean,
): IToHitModifierDetail | null {
  if (!abilities.includes('multi-tasker')) return null;
  if (!isSecondaryTarget) return null;

  return {
    name: 'Multi-Tasker',
    value: -1,
    source: 'spa',
    description: 'Multi-Tasker: -1 secondary target penalty',
  };
}

/**
 * Cluster Hitter: +1 column shift on cluster hit table.
 * This doesn't return a to-hit modifier — it's a damage modifier.
 * Used when resolving cluster weapon hits.
 */
export function getClusterHitterBonus(abilities: readonly string[]): number {
  return abilities.includes('cluster-hitter') ? 1 : 0;
}

// =============================================================================
// Piloting SPA Modifiers
// =============================================================================

/**
 * Jumping Jack: reduces jump attack modifier from +3 to +1.
 */
export function calculateJumpingJackModifier(
  abilities: readonly string[],
  movementType: MovementType,
): IToHitModifierDetail | null {
  if (!abilities.includes('jumping-jack')) return null;
  if (movementType !== MovementType.Jump) return null;

  return {
    name: 'Jumping Jack',
    value: -2,
    source: 'spa',
    description: 'Jumping Jack: jump modifier reduced to +1 (instead of +3)',
  };
}

/**
 * Dodge Maneuver: +2 to-hit for enemies when dodging.
 * Applied to the TARGET's modifier — affects attacker's roll.
 */
export function calculateDodgeManeuverModifier(
  targetAbilities: readonly string[],
  isDodging?: boolean,
): IToHitModifierDetail | null {
  if (!targetAbilities.includes('dodge-maneuver')) return null;
  if (!isDodging) return null;

  return {
    name: 'Dodge Maneuver',
    value: 2,
    source: 'spa',
    description: 'Dodge Maneuver: target is dodging (+2)',
  };
}

/**
 * Melee Specialist: -1 to-hit for physical attacks.
 */
export function calculateMeleeSpecialistModifier(
  abilities: readonly string[],
): IToHitModifierDetail | null {
  if (!abilities.includes('melee-specialist')) return null;

  return {
    name: 'Melee Specialist',
    value: -1,
    source: 'spa',
    description: 'Melee Specialist: -1 physical attack',
  };
}

/**
 * Melee Master: +1 physical attack damage bonus.
 * Not a to-hit modifier — returns a damage bonus.
 */
export function getMeleeMasterDamageBonus(
  abilities: readonly string[],
): number {
  return abilities.includes('melee-master') ? 1 : 0;
}

// =============================================================================
// Misc SPA Modifiers
// =============================================================================

/**
 * Tactical Genius: +1 initiative.
 */
export function getTacticalGeniusBonus(abilities: readonly string[]): number {
  return abilities.includes('tactical-genius') ? 1 : 0;
}

/**
 * Pain Resistance: ignore first wound penalty.
 * Returns the effective wound count for to-hit penalty calculation.
 */
export function getEffectiveWounds(
  abilities: readonly string[],
  pilotWounds: number,
): number {
  if (abilities.includes('pain-resistance') && pilotWounds > 0) {
    return pilotWounds - 1;
  }
  return pilotWounds;
}

/**
 * Iron Man: -2 to consciousness check target numbers.
 */
export function getIronManModifier(abilities: readonly string[]): number {
  return abilities.includes('iron-man') ? -2 : 0;
}

/**
 * Hot Dog: +3 to shutdown heat threshold.
 * Increases the heat level at which shutdown checks begin.
 */
export function getHotDogShutdownThresholdBonus(
  abilities: readonly string[],
): number {
  return abilities.includes('hot-dog') ? 3 : 0;
}

// =============================================================================
// SPA Catalog — ~35 Official SPAs
// =============================================================================

/**
 * SPA combat effect category.
 */
export type SPACategory =
  | 'gunnery'
  | 'piloting'
  | 'defensive'
  | 'toughness'
  | 'tactical'
  | 'miscellaneous';

/**
 * Combat pipeline that the SPA affects.
 */
export type SPAPipeline =
  | 'to-hit'
  | 'damage'
  | 'psr'
  | 'heat'
  | 'initiative'
  | 'consciousness'
  | 'special';

/**
 * SPA catalog entry — defines how an SPA integrates with combat.
 */
export interface ISPACatalogEntry {
  /** SPA identifier (matches ability IDs in pilot system) */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** SPA category */
  readonly category: SPACategory;
  /** Which combat pipeline(s) this SPA affects */
  readonly pipelines: readonly SPAPipeline[];
  /** Brief description of combat effect */
  readonly combatEffect: string;
  /** Whether this SPA requires a designation (weapon type, target, etc.) */
  readonly requiresDesignation: boolean;
  /** Designation type if required */
  readonly designationType?:
    | 'weapon_type'
    | 'weapon_category'
    | 'target'
    | 'range_bracket';
}

/**
 * Complete SPA catalog with ~35 official BattleTech SPAs.
 * Each entry describes how the SPA integrates with combat resolution.
 */
export const SPA_CATALOG: Record<string, ISPACatalogEntry> = {
  // =========================================================================
  // Gunnery SPAs
  // =========================================================================
  'weapon-specialist': {
    id: 'weapon-specialist',
    name: 'Weapon Specialist',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-2 to-hit with designated weapon type',
    requiresDesignation: true,
    designationType: 'weapon_type',
  },
  'gunnery-specialist': {
    id: 'gunnery-specialist',
    name: 'Gunnery Specialist',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit designated category, +1 others',
    requiresDesignation: true,
    designationType: 'weapon_category',
  },
  marksman: {
    id: 'marksman',
    name: 'Marksman',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 to-hit for aimed/called shots',
    requiresDesignation: false,
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Halves all positive range modifiers (round down)',
    requiresDesignation: false,
  },
  'blood-stalker': {
    id: 'blood-stalker',
    name: 'Blood Stalker',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 vs designated target, +2 vs all others',
    requiresDesignation: true,
    designationType: 'target',
  },
  'cluster-hitter': {
    id: 'cluster-hitter',
    name: 'Cluster Hitter',
    category: 'gunnery',
    pipelines: ['damage'],
    combatEffect: '+1 cluster hit table column shift',
    requiresDesignation: false,
  },
  'multi-tasker': {
    id: 'multi-tasker',
    name: 'Multi-Tasker',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 secondary target penalty',
    requiresDesignation: false,
  },
  'range-master': {
    id: 'range-master',
    name: 'Range Master',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Zeroes range modifier for designated bracket',
    requiresDesignation: true,
    designationType: 'range_bracket',
  },
  sandblaster: {
    id: 'sandblaster',
    name: 'Sandblaster',
    category: 'gunnery',
    pipelines: ['damage'],
    combatEffect: '+1 cluster hits with ultra/rotary ACs',
    requiresDesignation: false,
  },
  'oblique-attacker': {
    id: 'oblique-attacker',
    name: 'Oblique Attacker',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 to indirect fire penalty',
    requiresDesignation: false,
  },
  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: '-1 called shot modifier (reduces +3 to +2)',
    requiresDesignation: false,
  },

  // =========================================================================
  // Piloting SPAs
  // =========================================================================
  'jumping-jack': {
    id: 'jumping-jack',
    name: 'Jumping Jack',
    category: 'piloting',
    pipelines: ['to-hit'],
    combatEffect: 'Jump attack modifier reduced from +3 to +1',
    requiresDesignation: false,
  },
  'melee-specialist': {
    id: 'melee-specialist',
    name: 'Melee Specialist',
    category: 'piloting',
    pipelines: ['to-hit'],
    combatEffect: '-1 physical attack to-hit',
    requiresDesignation: false,
  },
  'melee-master': {
    id: 'melee-master',
    name: 'Melee Master',
    category: 'piloting',
    pipelines: ['damage'],
    combatEffect: '+1 physical attack damage',
    requiresDesignation: false,
  },
  'maneuvering-ace': {
    id: 'maneuvering-ace',
    name: 'Maneuvering Ace',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for terrain and skidding',
    requiresDesignation: false,
  },
  'terrain-master': {
    id: 'terrain-master',
    name: 'Terrain Master',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: 'Ignores +1 piloting modifier for difficult terrain',
    requiresDesignation: false,
  },
  acrobat: {
    id: 'acrobat',
    name: 'Acrobat',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 DFA piloting roll',
    requiresDesignation: false,
  },
  'cross-country': {
    id: 'cross-country',
    name: 'Cross-Country',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for terrain while running',
    requiresDesignation: false,
  },

  // =========================================================================
  // Defensive SPAs
  // =========================================================================
  'dodge-maneuver': {
    id: 'dodge-maneuver',
    name: 'Dodge Maneuver',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: '+2 enemy to-hit when dodging (forfeit attack)',
    requiresDesignation: false,
  },
  evasive: {
    id: 'evasive',
    name: 'Evasive',
    category: 'defensive',
    pipelines: ['to-hit'],
    combatEffect: '+1 TMM when running or jumping',
    requiresDesignation: false,
  },
  'natural-grace': {
    id: 'natural-grace',
    name: 'Natural Grace',
    category: 'defensive',
    pipelines: ['psr'],
    combatEffect: '-1 PSR for falls',
    requiresDesignation: false,
  },

  // =========================================================================
  // Toughness SPAs
  // =========================================================================
  'iron-man': {
    id: 'iron-man',
    name: 'Iron Man',
    category: 'toughness',
    pipelines: ['consciousness'],
    combatEffect: '-2 consciousness check target number',
    requiresDesignation: false,
  },
  'pain-resistance': {
    id: 'pain-resistance',
    name: 'Pain Resistance',
    category: 'toughness',
    pipelines: ['to-hit', 'consciousness'],
    combatEffect: 'Ignore first wound penalty',
    requiresDesignation: false,
  },
  edge: {
    id: 'edge',
    name: 'Edge',
    category: 'toughness',
    pipelines: ['special'],
    combatEffect: '6 specific reroll triggers, points do not regenerate',
    requiresDesignation: false,
  },
  toughness: {
    id: 'toughness',
    name: 'Toughness',
    category: 'toughness',
    pipelines: ['consciousness'],
    combatEffect: '-1 consciousness check target number',
    requiresDesignation: false,
  },

  // =========================================================================
  // Tactical SPAs
  // =========================================================================
  'tactical-genius': {
    id: 'tactical-genius',
    name: 'Tactical Genius',
    category: 'tactical',
    pipelines: ['initiative'],
    combatEffect: '+1 initiative roll',
    requiresDesignation: false,
  },
  'speed-demon': {
    id: 'speed-demon',
    name: 'Speed Demon',
    category: 'tactical',
    pipelines: ['special'],
    combatEffect: '+1 hex when running (at +1 heat)',
    requiresDesignation: false,
  },
  'combat-intuition': {
    id: 'combat-intuition',
    name: 'Combat Intuition',
    category: 'tactical',
    pipelines: ['initiative'],
    combatEffect: 'Move before initiative winner in first round',
    requiresDesignation: false,
  },

  // =========================================================================
  // Heat/Miscellaneous SPAs
  // =========================================================================
  'hot-dog': {
    id: 'hot-dog',
    name: 'Hot Dog',
    category: 'miscellaneous',
    pipelines: ['heat'],
    combatEffect: '+3 heat threshold before shutdown checks',
    requiresDesignation: false,
  },
  'cool-under-fire': {
    id: 'cool-under-fire',
    name: 'Cool Under Fire',
    category: 'miscellaneous',
    pipelines: ['heat'],
    combatEffect: '-1 heat generated per turn',
    requiresDesignation: false,
  },
  'some-like-it-hot': {
    id: 'some-like-it-hot',
    name: 'Some Like it Hot',
    category: 'miscellaneous',
    pipelines: ['heat'],
    combatEffect: '-1 heat to-hit penalty at all thresholds',
    requiresDesignation: false,
  },
  'multi-target': {
    id: 'multi-target',
    name: 'Multi-Target',
    category: 'gunnery',
    pipelines: ['to-hit'],
    combatEffect: 'Reduced multi-target penalty',
    requiresDesignation: false,
  },
  'iron-will': {
    id: 'iron-will',
    name: 'Iron Will',
    category: 'toughness',
    pipelines: ['consciousness'],
    combatEffect: '-2 consciousness check target number (alias for Iron Man)',
    requiresDesignation: false,
  },
  'heavy-lifter': {
    id: 'heavy-lifter',
    name: 'Heavy Lifter',
    category: 'piloting',
    pipelines: ['special'],
    combatEffect: 'Can carry and throw objects in physical combat',
    requiresDesignation: false,
  },
  'animal-mimicry': {
    id: 'animal-mimicry',
    name: 'Animal Mimicry',
    category: 'piloting',
    pipelines: ['psr'],
    combatEffect: '-1 PSR modifier in specific terrain',
    requiresDesignation: false,
  },
  antagonizer: {
    id: 'antagonizer',
    name: 'Antagonizer',
    category: 'tactical',
    pipelines: ['special'],
    combatEffect: 'Force opponent to attack this unit first',
    requiresDesignation: false,
  },
};

export function calculateAttackerSPAModifiers(
  attacker: IAttackerState,
  target: ITargetState,
  rangeBracket: RangeBracket,
  currentRangeModifier: number,
): readonly IToHitModifierDetail[] {
  const attackerAbilities = attacker.abilities ?? [];
  const targetAbilities = target.abilities ?? [];

  if (attackerAbilities.length === 0 && targetAbilities.length === 0) {
    return [];
  }

  const modifiers: IToHitModifierDetail[] = [];

  // Weapon Specialist
  const weaponSpecMod = calculateWeaponSpecialistModifier(
    attackerAbilities,
    attacker.weaponType,
    attacker.designatedWeaponType,
  );
  if (weaponSpecMod) modifiers.push(weaponSpecMod);

  // Gunnery Specialist
  const gunnSpecMod = calculateGunnerySpecialistModifier(
    attackerAbilities,
    attacker.weaponCategory,
    attacker.designatedWeaponCategory,
  );
  if (gunnSpecMod) modifiers.push(gunnSpecMod);

  // Blood Stalker
  const bloodMod = calculateBloodStalkerModifier(
    attackerAbilities,
    attacker.targetId,
    attacker.designatedTargetId,
  );
  if (bloodMod) modifiers.push(bloodMod);

  // Range Master
  const rangeMasterMod = calculateRangeMasterModifier(
    attackerAbilities,
    rangeBracket,
    attacker.designatedRangeBracket,
    currentRangeModifier,
  );
  if (rangeMasterMod) {
    modifiers.push(rangeMasterMod);
  } else {
    // Sniper (only if Range Master didn't fire)
    const sniperMod = calculateSniperModifier(
      attackerAbilities,
      currentRangeModifier,
    );
    if (sniperMod) modifiers.push(sniperMod);
  }

  // Multi-Tasker
  if (attacker.secondaryTarget?.isSecondary) {
    const multiMod = calculateMultiTaskerModifier(attackerAbilities, true);
    if (multiMod) modifiers.push(multiMod);
  }

  // Jumping Jack
  const jumpMod = calculateJumpingJackModifier(
    attackerAbilities,
    attacker.movementType,
  );
  if (jumpMod) modifiers.push(jumpMod);

  const dodgeMod = calculateDodgeManeuverModifier(
    targetAbilities,
    target.isDodging,
  );
  if (dodgeMod) modifiers.push(dodgeMod);

  return modifiers;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the number of SPAs in the catalog.
 */
export function getSPACatalogSize(): number {
  return Object.keys(SPA_CATALOG).length;
}

/**
 * Get all SPAs that affect a specific pipeline.
 */
export function getSPAsForPipeline(pipeline: SPAPipeline): ISPACatalogEntry[] {
  return Object.values(SPA_CATALOG).filter((spa) =>
    spa.pipelines.includes(pipeline),
  );
}

/**
 * Get all SPAs in a category.
 */
export function getSPAsByCategory(category: SPACategory): ISPACatalogEntry[] {
  return Object.values(SPA_CATALOG).filter((spa) => spa.category === category);
}

/**
 * Check if a pilot has a specific SPA.
 */
export function hasSPA(abilities: readonly string[], spaId: string): boolean {
  return abilities.includes(spaId);
}

/**
 * Get toughness TN modifier from SPAs.
 * Combines Iron Man and Toughness effects.
 */
export function getConsciousnessCheckModifier(
  abilities: readonly string[],
): number {
  let modifier = 0;
  if (abilities.includes('iron-man') || abilities.includes('iron-will')) {
    modifier -= 2;
  }
  if (abilities.includes('toughness')) {
    modifier -= 1;
  }
  return modifier;
}

/**
 * Get Oblique Attacker bonus (-1 to indirect fire penalty).
 */
export function getObliqueAttackerBonus(abilities: readonly string[]): number {
  return abilities.includes('oblique-attacker') ? -1 : 0;
}

/**
 * Get Sharpshooter bonus (-1 to called shot modifier).
 */
export function getSharpshooterBonus(abilities: readonly string[]): number {
  return abilities.includes('sharpshooter') ? -1 : 0;
}
