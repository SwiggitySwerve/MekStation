import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
/**
 * Equipment page constants
 */
import { EquipmentCategory } from '@/types/equipment';
import { EQUIPMENT_CATEGORY_COLORS } from '@/utils/colors/equipmentColors';

export const ITEMS_PER_PAGE = 36;

// Build select options from centralized color config
export const CATEGORY_OPTIONS = Object.values(EquipmentCategory).map((cat) => ({
  value: cat,
  label: EQUIPMENT_CATEGORY_COLORS[cat]?.label ?? cat,
}));

export const TECH_BASE_OPTIONS = Object.values(TechBase).map((tb) => ({
  value: tb,
  label: tb,
}));

export const RULES_LEVEL_OPTIONS = Object.values(RulesLevel).map((rl) => ({
  value: rl,
  label: rl,
}));
