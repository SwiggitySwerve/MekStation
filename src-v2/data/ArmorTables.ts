/**
 * ArmorTables.ts
 * Data for Armor construction rules.
 */

import { ArmorType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';

export const ARMOR_POINTS_PER_TON: Record<ArmorType, number> = {
  [ArmorType.STANDARD]: 16,
  [ArmorType.FERRO_FIBROUS]: 17.92, // 1.12x
  [ArmorType.FERRO_FIBROUS_CLAN]: 19.2, // 1.2x
  [ArmorType.LIGHT_FERRO]: 16.8, // 1.05x
  [ArmorType.HEAVY_FERRO]: 19.2, // 1.2x - Wait, Heavy Ferro is same points/ton as Clan Ferro?
                                 // Sarna: Heavy FF: 1.2x standard points per ton.
                                 // 16 * 1.2 = 19.2. Yes.
  [ArmorType.STEALTH]: 16,
  [ArmorType.REACTIVE]: 14, // Check value
  [ArmorType.REFLECTIVE]: 16, // Check value
  [ArmorType.HARDENED]: 8, // Half points per ton (effectively double armor)
};

export const ARMOR_SLOTS_REQUIRED: Record<ArmorType, Record<TechBase, number>> = {
  [ArmorType.STANDARD]: { [TechBase.INNER_SPHERE]: 0, [TechBase.CLAN]: 0, [TechBase.MIXED]: 0 },
  [ArmorType.FERRO_FIBROUS]: { [TechBase.INNER_SPHERE]: 14, [TechBase.CLAN]: 7, [TechBase.MIXED]: 14 },
  [ArmorType.FERRO_FIBROUS_CLAN]: { [TechBase.INNER_SPHERE]: 7, [TechBase.CLAN]: 7, [TechBase.MIXED]: 7 },
  [ArmorType.LIGHT_FERRO]: { [TechBase.INNER_SPHERE]: 7, [TechBase.CLAN]: 7, [TechBase.MIXED]: 7 },
  [ArmorType.HEAVY_FERRO]: { [TechBase.INNER_SPHERE]: 21, [TechBase.CLAN]: 21, [TechBase.MIXED]: 21 },
  [ArmorType.STEALTH]: { [TechBase.INNER_SPHERE]: 12, [TechBase.CLAN]: 12, [TechBase.MIXED]: 12 }, // Plus requirement of ECM
  [ArmorType.REACTIVE]: { [TechBase.INNER_SPHERE]: 14, [TechBase.CLAN]: 14, [TechBase.MIXED]: 14 },
  [ArmorType.REFLECTIVE]: { [TechBase.INNER_SPHERE]: 10, [TechBase.CLAN]: 10, [TechBase.MIXED]: 10 },
  [ArmorType.HARDENED]: { [TechBase.INNER_SPHERE]: 0, [TechBase.CLAN]: 0, [TechBase.MIXED]: 0 },
};

