/**
 * TechBase Standardization
 * Single source of truth for tech base types across the application
 */

export type TechBase = 'Inner Sphere' | 'Clan'
export type TechBaseCode = 'IS' | 'Clan'

/**
 * Utility functions for tech base conversion and validation
 */
export const TechBaseUtil = {
  /**
   * Normalize a tech base string to the standard TechBase type
   * @param input - Raw tech base string (could be 'IS', 'Inner Sphere', 'Clan', etc.)
   * @returns Normalized TechBase
   */
  normalize(input: string): TechBase {
    const normalized = input.trim()
    if (normalized === 'IS' || normalized === 'Inner Sphere') {
      return 'Inner Sphere'
    }
    if (normalized === 'Clan') {
      return 'Clan'
    }
    // Default to Inner Sphere for unknown values
    console.warn(`Unknown tech base: ${input}, defaulting to Inner Sphere`)
    return 'Inner Sphere'
  },

  /**
   * Convert a TechBase to its code representation
   * @param techBase - Standard TechBase
   * @returns TechBase code ('IS' or 'Clan')
   */
  toCode(techBase: TechBase): TechBaseCode {
    return techBase === 'Inner Sphere' ? 'IS' : 'Clan'
  },

  /**
   * Check if a string is a valid TechBase
   * @param input - String to validate
   * @returns True if valid
   */
  isValid(input: string): boolean {
    const normalized = input.trim()
    return normalized === 'Inner Sphere' || 
           normalized === 'Clan' || 
           normalized === 'IS'
  },

  /**
   * Get all valid tech bases
   * @returns Array of all valid TechBase values
   */
  all(): TechBase[] {
    return ['Inner Sphere', 'Clan']
  }
}

