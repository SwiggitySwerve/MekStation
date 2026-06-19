import type { ICombatActionSupportEntry } from './CombatActionSupport.types';

import { ATTACK_UTILITY_COMMAND_ACTION_SUPPORT } from './CombatActionSupport.attackUtilityCommandSupport';
import { MOVEMENT_COMMAND_ACTION_SUPPORT } from './CombatActionSupport.movementCommandSupport';

export const COMBAT_COMMAND_ACTION_SUPPORT = {
  ...MOVEMENT_COMMAND_ACTION_SUPPORT,
  ...ATTACK_UTILITY_COMMAND_ACTION_SUPPORT,
} satisfies Record<string, ICombatActionSupportEntry>;
