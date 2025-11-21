/**
 * TechBase Standardization (Legacy/Bridge)
 * 
 * This file is now a bridge to the new strongly-typed TechBase enum in BaseTypes
 * and the utility functions in utils/TechBaseUtils.
 * 
 * @deprecated Import from 'types/core/BaseTypes' and 'utils/TechBaseUtils' instead.
 */

import { TechBase as TechBaseEnum } from './BaseTypes';
import { TechBaseUtil as TBU } from '../../utils/TechBaseUtils';

// Re-export the enum as the type for compatibility
// We add the string literals to allow legacy code to pass strings without casting immediately
export type TechBase = TechBaseEnum | 'Inner Sphere' | 'Clan' | 'Mixed' | 'Both';

export type TechBaseCode = 'IS' | 'Clan' | 'Mixed';

// Re-export the utility
export const TechBaseUtil = TBU;
