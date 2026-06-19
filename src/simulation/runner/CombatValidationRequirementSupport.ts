export type {
  CombatRequirementAuthorityKind,
  CombatRequirementId,
  ICombatRequirementPrimaryAuthority,
  ICombatRequirementSupportEntry,
} from './CombatValidationRequirementSupport.types';
export { COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES } from './CombatValidationRequirementSupport.types';

import type { ICombatRequirementSupportEntry } from './CombatValidationRequirementSupport.types';

import { BATTLEMECH_VALIDATION_REQUIREMENT_CATALOG_MOVEMENT_SUPPORT } from './CombatValidationRequirementSupport.rows.catalogMovement';
import { BATTLEMECH_VALIDATION_REQUIREMENT_HEAT_PHYSICAL_SUPPORT } from './CombatValidationRequirementSupport.rows.heatPhysical';
import { BATTLEMECH_VALIDATION_REQUIREMENT_PILOT_LIFECYCLE_SUPPORT } from './CombatValidationRequirementSupport.rows.pilotLifecycle';

export const BATTLEMECH_VALIDATION_REQUIREMENT_SUPPORT = {
  ...BATTLEMECH_VALIDATION_REQUIREMENT_CATALOG_MOVEMENT_SUPPORT,
  ...BATTLEMECH_VALIDATION_REQUIREMENT_HEAT_PHYSICAL_SUPPORT,
  ...BATTLEMECH_VALIDATION_REQUIREMENT_PILOT_LIFECYCLE_SUPPORT,
} satisfies Record<string, ICombatRequirementSupportEntry>;
