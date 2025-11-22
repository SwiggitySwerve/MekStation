/**
 * EngineTables.ts
 * Data for Engine construction rules.
 */

import { EngineType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';

export const ENGINE_WEIGHT_MULTIPLIERS: Record<EngineType, number> = {
  [EngineType.STANDARD]: 1.0,
  [EngineType.XL]: 0.5,
  [EngineType.LIGHT]: 0.75,
  [EngineType.XXL]: 0.333,
  [EngineType.COMPACT]: 1.5,
  [EngineType.ICE]: 2.0,
  [EngineType.FUEL_CELL]: 1.2,
};

// Corrected Standard Fusion Engine Weights (Partial Table for Verification)
// Source: TechManual / Sarna
export const STANDARD_ENGINE_WEIGHTS: Record<number, number> = {
  10: 0.5, 15: 0.5, 20: 0.5, 25: 1.0, 30: 1.0, 35: 1.5, 40: 1.5, 45: 2.0, 50: 2.0, 55: 2.5, 60: 1.5, 
  65: 2.5, 70: 3.0, 75: 3.0, 80: 3.5, 85: 4.0, 90: 4.0, 95: 4.5, 
  100: 3.0, 105: 3.5, 110: 3.5, 115: 4.0, 120: 4.0, 125: 4.5, 130: 4.5, 135: 5.0, 140: 5.0, 145: 5.5, 
  150: 5.5, 155: 6.0, 160: 6.0, 165: 6.5, 170: 7.0, 175: 7.0, 180: 7.0, 185: 7.5, 190: 8.0, 195: 8.0, 
  200: 8.5, 205: 9.0, 210: 9.0, 215: 9.5, 220: 10.0, 225: 10.0, 230: 10.5, 235: 11.0, 240: 11.5, 245: 12.0, 
  250: 12.5, 255: 13.0, 260: 13.5, 265: 14.0, 270: 14.5, 275: 15.5, 280: 16.0, 285: 16.5, 290: 17.5, 295: 18.0, 
  300: 19.0, 305: 19.5, 310: 20.5, 315: 21.5, 320: 22.5, 325: 23.5, 330: 24.5, 335: 25.5, 340: 27.0, 345: 28.5, 
  350: 29.5, 355: 31.5, 360: 33.0, 365: 34.5, 370: 36.5, 375: 38.5, 380: 41.0, 385: 43.5, 390: 46.0, 395: 49.0, 400: 52.5,
};

export interface IEngineSlotConfiguration {
  readonly ct: number;
  readonly sideTorso: number;
}

export const ENGINE_SLOTS: Record<EngineType, Record<TechBase, IEngineSlotConfiguration>> = {
  [EngineType.STANDARD]: {
    [TechBase.INNER_SPHERE]: { ct: 6, sideTorso: 0 },
    [TechBase.CLAN]: { ct: 6, sideTorso: 0 },
    [TechBase.MIXED]: { ct: 6, sideTorso: 0 },
  },
  [EngineType.XL]: {
    [TechBase.INNER_SPHERE]: { ct: 6, sideTorso: 3 },
    [TechBase.CLAN]: { ct: 6, sideTorso: 2 },
    [TechBase.MIXED]: { ct: 6, sideTorso: 3 },
  },
  [EngineType.LIGHT]: {
    [TechBase.INNER_SPHERE]: { ct: 6, sideTorso: 2 },
    [TechBase.CLAN]: { ct: 6, sideTorso: 2 },
    [TechBase.MIXED]: { ct: 6, sideTorso: 2 },
  },
  [EngineType.XXL]: {
    [TechBase.INNER_SPHERE]: { ct: 6, sideTorso: 6 },
    [TechBase.CLAN]: { ct: 6, sideTorso: 4 },
    [TechBase.MIXED]: { ct: 6, sideTorso: 6 },
  },
  [EngineType.COMPACT]: {
    [TechBase.INNER_SPHERE]: { ct: 3, sideTorso: 0 },
    [TechBase.CLAN]: { ct: 3, sideTorso: 0 },
    [TechBase.MIXED]: { ct: 3, sideTorso: 0 },
  },
  [EngineType.ICE]: {
    [TechBase.INNER_SPHERE]: { ct: 6, sideTorso: 0 },
    [TechBase.CLAN]: { ct: 6, sideTorso: 0 },
    [TechBase.MIXED]: { ct: 6, sideTorso: 0 },
  },
  [EngineType.FUEL_CELL]: {
    [TechBase.INNER_SPHERE]: { ct: 6, sideTorso: 0 },
    [TechBase.CLAN]: { ct: 6, sideTorso: 0 },
    [TechBase.MIXED]: { ct: 6, sideTorso: 0 },
  },
};
