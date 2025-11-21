/**
 * Movement Calculations - Shared utility for consistent movement display across all components
 * Handles enhancement effects and ensures consistent formatting with proper spacing
 */

export interface MovementDisplay {
  walkDisplay: string;
  runDisplay: string;
  jumpDisplay: string;
  combinedDisplay: string; // "4 / 6 / 0" format with spaces
  walkValue: number;
  runValue: number;
  jumpValue: number;
}

export interface UnitConfiguration {
  walkMP: number;
  runMP: number;
  jumpMP?: number;
  enhancements?: { type: string }[]; // Array of enhancement ComponentConfigurations
}

/**
 * Movement Enhancement Interface - Defines how each enhancement affects movement
 */
export interface MovementEnhancement {
  type: string;
  name: string;
  description: string;
  walkModifier: number; // +1, +2, etc.
  runModifier: 'multiplier' | 'recalculate' | number; // 'multiplier' = walk * 2, 'recalculate' = walk * 1.5, number = fixed bonus
  jumpModifier: number; // +1, +2, etc.
  priority: number; // Lower numbers apply first (TSM=1, Supercharger=2, MASC=3)
  condition?: string; // e.g., "9+ heat" for TSM
}

/**
 * Registry of all movement enhancements
 */
export const MOVEMENT_ENHANCEMENTS: Record<string, MovementEnhancement> = {
  'Triple Strength Myomer': {
    type: 'Triple Strength Myomer',
    name: 'TSM',
    description: 'Triple Strength Myomer (activates at 9+ heat)',
    walkModifier: 1, // Net effect: +2 from TSM, -1 from heat penalty = +1
    runModifier: 'recalculate',
    jumpModifier: 0,
    priority: 1,
    condition: '9+ heat'
  },
  'Supercharger': {
    type: 'Supercharger',
    name: 'Supercharger',
    description: 'Engine Supercharger (engine component)',
    walkModifier: 0,
    runModifier: 'multiplier',
    jumpModifier: 0,
    priority: 2
  },
  'MASC': {
    type: 'MASC',
    name: 'MASC',
    description: 'Myomer Accelerator Signal Circuitry',
    walkModifier: 0,
    runModifier: 'multiplier',
    jumpModifier: 0,
    priority: 3
  }
};

/**
 * Filter out mutually exclusive movement enhancements
 * TSM and MASC cannot be used together - TSM takes precedence
 */
export function filterMutuallyExclusiveEnhancements(enhancements: { type: string }[]): { type: string }[] {
  if (!Array.isArray(enhancements)) return [];
  let hasTSM = enhancements.some(e => e.type === 'Triple Strength Myomer');
  let hasMASC = enhancements.some(e => e.type === 'MASC');
  if (hasTSM && hasMASC) {
    // Prefer TSM (lower priority number)
    return enhancements.filter(e => e.type !== 'MASC');
  }
  return enhancements;
}

/**
 * Calculate enhanced movement with proper display formatting using structured enhancement system
 * @param config Unit configuration containing movement and enhancement data
 * @returns MovementDisplay object with all formatted strings and raw values
 */
export function calculateEnhancedMovement(config: UnitConfiguration): MovementDisplay {
  const baseWalkMP = config.walkMP;
  const baseRunMP = Math.floor(baseWalkMP * 1.5); // Standard BattleTech calculation
  const jumpMP = config.jumpMP || 0;

  // Get active enhancements and sort by priority
  let enhancements = config.enhancements || [];
  enhancements = filterMutuallyExclusiveEnhancements(enhancements);
  const activeEnhancements: MovementEnhancement[] = [];
  for (const enh of enhancements) {
    const enhancement = MOVEMENT_ENHANCEMENTS[enh.type];
    if (enhancement) {
      activeEnhancements.push(enhancement);
    }
  }
  activeEnhancements.sort((a, b) => a.priority - b.priority);

  // Apply enhancements in order
  let walkValue = baseWalkMP;
  let runValue = baseRunMP;
  let jumpValue = jumpMP;
  let enhancementNotes: string[] = [];
  let bracketedRun: number | null = null;
  let bracketedLabel: string | null = null;

  // Check for Supercharger + MASC combination (both affect run speed)
  const hasSupercharger = activeEnhancements.some(e => e.type === 'Supercharger');
  const hasMASC = activeEnhancements.some(e => e.type === 'MASC');
  const hasTSM = activeEnhancements.some(e => e.type === 'Triple Strength Myomer');
  const hasBothRunEnhancements = hasSupercharger && hasMASC;

  for (const enhancement of activeEnhancements) {
    // Apply walk modifier
    walkValue += enhancement.walkModifier;
    
    // Apply run modifier
    if (bracketedRun === null) {
      if (enhancement.runModifier === 'multiplier') {
        if (hasBothRunEnhancements) {
          // Both Supercharger and MASC: 2.5× multiplier
          const enhancedRun = Math.floor(walkValue * 2.5);
          bracketedRun = enhancedRun;
          runValue = enhancedRun; // Update runValue to match enhanced value
          bracketedLabel = 'Supercharger+MASC';
        } else {
          // Single run enhancement: 2× multiplier
          const enhancedRun = walkValue * 2;
          bracketedRun = enhancedRun;
          runValue = enhancedRun; // Update runValue to match enhanced value
          bracketedLabel = enhancement.name;
        }
      } else if (enhancement.runModifier === 'recalculate') {
        // TSM uses Math.ceil for run calculations
        runValue = Math.ceil(walkValue * 1.5);
        bracketedRun = runValue;
        bracketedLabel = enhancement.name;
      } else if (typeof enhancement.runModifier === 'number') {
        runValue += enhancement.runModifier;
        bracketedRun = runValue;
        bracketedLabel = enhancement.name;
      }
    } else {
      // Only the first (highest-priority) enhancement affecting run is bracketed
      if (enhancement.runModifier === 'recalculate') {
        // TSM uses Math.ceil for run calculations
        runValue = Math.ceil(walkValue * 1.5);
      } else if (typeof enhancement.runModifier === 'number') {
        runValue += enhancement.runModifier;
      }
    }
    
    // Apply jump modifier
    jumpValue += enhancement.jumpModifier;
    
    // Add to notes
    if (enhancement.walkModifier > 0) {
      enhancementNotes.push(`${enhancement.name}+${enhancement.walkModifier}`);
    }
    if (enhancement.runModifier === 'multiplier') {
      if (hasBothRunEnhancements) {
        // Only add the combined note once
        if (!enhancementNotes.includes('Supercharger+MASC+2.5')) {
          enhancementNotes.push('Supercharger+MASC+2.5');
        }
      } else {
        enhancementNotes.push(`${enhancement.name}+2`);
      }
    }
  }

  // Special case: If TSM and Supercharger are both active (without MASC), Supercharger should use TSM-boosted walk
  if (hasTSM && hasSupercharger && !hasMASC) {
    // TSM has already been applied to walkValue, so Supercharger uses that
    // Override any existing bracketed run value with Supercharger's calculation
    bracketedRun = walkValue * 2;
    runValue = walkValue * 2;
    bracketedLabel = 'Supercharger';
  }

  // Display formatting
  let walkDisplay = `${baseWalkMP}`;
  let runDisplay = `${baseRunMP}`;

  // Show brackets if walk value changed
  if (walkValue !== baseWalkMP) {
    walkDisplay = `${baseWalkMP} [${walkValue}]`;
  }

  // Only show one bracketed run value (highest-priority enhancement)
  if (bracketedRun !== null && bracketedRun !== baseRunMP) {
    runDisplay = `${baseRunMP} [${bracketedRun}]`;
  }

  const jumpDisplay = `${jumpValue}`;
  // Combined display with proper spacing around slash delimiters
  const combinedDisplay = `${walkDisplay} / ${runDisplay} / ${jumpDisplay}`;
  return {
    walkDisplay,
    runDisplay,
    jumpDisplay,
    combinedDisplay,
    walkValue,
    runValue,
    jumpValue
  };
}

/**
 * Format movement for engine info display
 * @param walkMP Walk movement points
 * @param runMP Run movement points (base, without enhancements)
 * @param maxWalkMP Maximum possible walk MP for this tonnage
 * @returns Formatted string for engine section
 */
export function formatEngineMovementInfo(walkMP: number, runMP: number, maxWalkMP: number): string {
  return `Walk: ${walkMP} MP | Run: ${runMP} MP | Max: ${maxWalkMP} MP`;
}

/**
 * Get individual movement values with enhancement calculations
 * @param config Unit configuration
 * @returns Object with all movement values including enhanced values
 */
export function getMovementValues(config: UnitConfiguration) {
  const movement = calculateEnhancedMovement(config);
  
  return {
    base: {
      walk: config.walkMP,
      run: Math.floor(config.walkMP * 1.5),
      jump: config.jumpMP || 0
    },
    enhanced: {
      walk: movement.walkValue,
      run: movement.runValue,
      jump: movement.jumpValue
    },
    display: movement
  };
}

/**
 * Get a full movement summary string for the top bar, including all enhancements.
 */
export function getFullMovementSummary(config: UnitConfiguration, tonnage: number): string {
  const movement = calculateEnhancedMovement(config);
  const notes: string[] = [];
  
  if (config.enhancements) {
    // Filter out mutually exclusive enhancements first
    const filteredEnhancements = filterMutuallyExclusiveEnhancements(config.enhancements);
    
    // Check for Supercharger + MASC combination
    const hasSupercharger = filteredEnhancements.some(e => e.type === 'Supercharger');
    const hasMASC = filteredEnhancements.some(e => e.type === 'MASC');
    const hasBothRunEnhancements = hasSupercharger && hasMASC;
    
    for (const enh of filteredEnhancements) {
      const enhancement = MOVEMENT_ENHANCEMENTS[enh.type];
      if (enhancement) {
        if (enhancement.walkModifier > 0) {
          notes.push(`${enhancement.name}+${enhancement.walkModifier}`);
        }
        if (enhancement.runModifier === 'multiplier') {
          if (hasBothRunEnhancements) {
            // Only add the combined note once
            if (!notes.includes('Supercharger+MASC+2.5')) {
              notes.push('Supercharger+MASC+2.5');
            }
          } else {
            notes.push(`${enhancement.name}+2`);
          }
        }
      }
    }
  }
  
  const noteStr = notes.length > 0 ? ` (${notes.join(', ')})` : '';
  return `${movement.combinedDisplay}${noteStr}`;
}

/**
 * Format condensed movement display for top bar
 * Returns format: "walk / run [maxWalk] / jump" or enhanced version
 * @param config Unit configuration containing movement and enhancement data
 * @param tonnage Unit tonnage for max walk calculation
 * @returns Condensed movement string like "4 / 6 [8] / 0" or "4 [5] / 6 [8] / 0" with TSM
 */
export function formatCondensedMovement(config: UnitConfiguration, tonnage: number): string {
  const maxWalkMP = Math.floor(400 / tonnage);
  const movement = calculateEnhancedMovement(config);
  
  // If no enhancements, show max walk in brackets
  if (!config.enhancements || config.enhancements.length === 0) {
    return `${config.walkMP} / ${config.runMP} [${maxWalkMP}] / ${movement.jumpValue}`;
  }
  
  // With enhancements, show enhanced values
  return movement.combinedDisplay;
}

/**
 * Get all available movement enhancement types
 */
export function getAvailableMovementEnhancements(): MovementEnhancement[] {
  return Object.values(MOVEMENT_ENHANCEMENTS);
}

/**
 * Check if a specific enhancement type is available
 */
export function isMovementEnhancementAvailable(type: string): boolean {
  return type in MOVEMENT_ENHANCEMENTS;
}
