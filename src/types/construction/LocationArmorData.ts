/**
 * Location Armor Data Type
 *
 * Armor allocation data for a single mech location.
 * Extracted from components to support domain logic in utils layer.
 */

import { MechLocation } from '@/types/construction';

/**
 * Armor allocation data for a single location
 */
export interface LocationArmorData {
  readonly location: MechLocation;
  readonly current: number;
  readonly maximum: number;
  readonly rear?: number;
  readonly rearMaximum?: number;
}
