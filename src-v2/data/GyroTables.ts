/**
 * GyroTables.ts
 * Data for Gyro construction rules.
 */

import { GyroType } from '../types/SystemComponents';

export const GYRO_WEIGHT_MULTIPLIERS: Record<GyroType, number> = {
  [GyroType.STANDARD]: 1.0,
  [GyroType.XL]: 0.5,
  [GyroType.COMPACT]: 1.5,
  [GyroType.HEAVY_DUTY]: 2.0, // Approx, actually it's Standard + 1 ton
};

export const GYRO_SLOTS: Record<GyroType, number> = {
  [GyroType.STANDARD]: 4,
  [GyroType.XL]: 6,
  [GyroType.COMPACT]: 2,
  [GyroType.HEAVY_DUTY]: 4,
};

