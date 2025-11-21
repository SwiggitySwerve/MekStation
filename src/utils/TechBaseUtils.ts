import { TechBase } from '../types/core/BaseTypes';

export type TechBaseCode = 'IS' | 'Clan' | 'Mixed';

export const TechBaseUtil = {
  /**
   * Normalize a tech base string to the standard TechBase type
   */
  normalize(input: string): TechBase {
    const normalized = input.trim();
    if (normalized === 'IS' || normalized === 'Inner Sphere' || normalized === TechBase.INNER_SPHERE) {
      return TechBase.INNER_SPHERE;
    }
    if (normalized === 'Clan' || normalized === TechBase.CLAN) {
      return TechBase.CLAN;
    }
    if (normalized === 'Mixed' || normalized === TechBase.MIXED) {
        return TechBase.MIXED;
    }
    if (normalized === 'Both' || normalized === TechBase.BOTH) {
        return TechBase.BOTH;
    }
    
    // Handle mixed subtypes if needed, or default to IS
    console.warn(`Unknown tech base: ${input}, defaulting to Inner Sphere`);
    return TechBase.INNER_SPHERE;
  },

  /**
   * Convert a TechBase to its code representation
   */
  toCode(techBase: TechBase): TechBaseCode {
      switch(techBase) {
          case TechBase.INNER_SPHERE: return 'IS';
          case TechBase.CLAN: return 'Clan';
          case TechBase.MIXED: 
          case TechBase.MIXED_IS_CHASSIS:
          case TechBase.MIXED_CLAN_CHASSIS:
            return 'Mixed';
          default: return 'IS';
      }
  },

  /**
   * Check if a string is a valid TechBase
   */
  isValid(input: string): boolean {
       const values: string[] = Object.values(TechBase);
       return values.includes(input) || input === 'IS';
  },

  /**
   * Get all valid tech bases
   */
  all(): TechBase[] {
      return Object.values(TechBase);
  }
};
