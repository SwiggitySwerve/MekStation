/**
 * StructureTables.ts
 * Data for Internal Structure construction rules.
 */

import { StructureType } from '../types/SystemComponents';
import { TechBase } from '../types/TechBase';

export const STRUCTURE_WEIGHT_MULTIPLIERS: Record<StructureType, number> = {
  [StructureType.STANDARD]: 0.1,       // 10%
  [StructureType.ENDO_STEEL]: 0.05,    // 5%
  [StructureType.ENDO_STEEL_CLAN]: 0.05,
  [StructureType.COMPOSITE]: 0.05,     // Composite is 5% weight? No, usually half weight but fragile. 
                                      // TechManual: Composite Structure = 0.5 x Standard Structure weight. So 5%.
  [StructureType.REINFORCED]: 0.2,     // 2x weight (20%)
  [StructureType.INDUSTRIAL]: 0.2,     // 2x weight usually? Or same as standard? 
                                      // TechManual: IndustrialMech structure is heavier.
};

export const STRUCTURE_SLOTS_REQUIRED: Record<StructureType, Record<TechBase, number>> = {
  [StructureType.STANDARD]: { [TechBase.INNER_SPHERE]: 0, [TechBase.CLAN]: 0, [TechBase.MIXED]: 0 },
  [StructureType.ENDO_STEEL]: { [TechBase.INNER_SPHERE]: 14, [TechBase.CLAN]: 7, [TechBase.MIXED]: 14 },
  [StructureType.ENDO_STEEL_CLAN]: { [TechBase.INNER_SPHERE]: 7, [TechBase.CLAN]: 7, [TechBase.MIXED]: 7 },
  [StructureType.COMPOSITE]: { [TechBase.INNER_SPHERE]: 0, [TechBase.CLAN]: 0, [TechBase.MIXED]: 0 }, 
                             // Composite takes no slots? 
                             // Sarna: Composite Structure: Standard bulk (no slots).
  [StructureType.REINFORCED]: { [TechBase.INNER_SPHERE]: 0, [TechBase.CLAN]: 0, [TechBase.MIXED]: 0 },
  [StructureType.INDUSTRIAL]: { [TechBase.INNER_SPHERE]: 0, [TechBase.CLAN]: 0, [TechBase.MIXED]: 0 },
};

