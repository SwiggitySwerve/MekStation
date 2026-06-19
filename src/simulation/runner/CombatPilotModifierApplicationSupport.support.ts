import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

import { PILOT_MODIFIER_RESOLVER_MOVEMENT_ENVIRONMENT_SUPPORT } from './CombatPilotModifierApplicationSupport.support.movementEnvironment';
import { PILOT_MODIFIER_RESOLVER_PSR_HEAT_EDGE_SUPPORT } from './CombatPilotModifierApplicationSupport.support.psrHeatEdge';
import { PILOT_MODIFIER_RESOLVER_RANGED_PHYSICAL_SUPPORT } from './CombatPilotModifierApplicationSupport.support.rangedPhysical';

export const PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT = {
  ...PILOT_MODIFIER_RESOLVER_RANGED_PHYSICAL_SUPPORT,
  ...PILOT_MODIFIER_RESOLVER_PSR_HEAT_EDGE_SUPPORT,
  ...PILOT_MODIFIER_RESOLVER_MOVEMENT_ENVIRONMENT_SUPPORT,
} satisfies Record<string, ICombatFeatureSupportEntry>;
