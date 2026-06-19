import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  TERRAIN_ENVIRONMENT_CONDITION_COMBAT_SUPPORT,
  TERRAIN_MOVEMENT_COST_COMBAT_SUPPORT,
} from './CombatRuleSupport.terrainCore';
import { TERRAIN_LOS_COMBAT_SUPPORT } from './CombatRuleSupport.terrainLos';
import { TERRAIN_MINEFIELD_COMBAT_SUPPORT } from './CombatRuleSupport.terrainMinefields';

export const MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS = [] as const;

export const TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS = [] as readonly string[];

export const TERRAIN_ENVIRONMENT_COMBAT_SUPPORT = {
  ...TERRAIN_MOVEMENT_COST_COMBAT_SUPPORT,
  ...TERRAIN_LOS_COMBAT_SUPPORT,
  ...TERRAIN_ENVIRONMENT_CONDITION_COMBAT_SUPPORT,
  ...TERRAIN_MINEFIELD_COMBAT_SUPPORT,
};

export const TERRAIN_TYPE_MOVEMENT_COVERAGE = Object.values(TerrainType);
