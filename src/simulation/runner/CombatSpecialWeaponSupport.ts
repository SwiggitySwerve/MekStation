import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

import { SPECIAL_WEAPON_AMS_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport.ams';
import { SPECIAL_WEAPON_DESIGNATOR_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport.designators';
import { SPECIAL_WEAPON_PLASMA_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport.plasma';
import { SPECIAL_WEAPON_TAG_ARTEMIS_COMBAT_SUPPORT } from './CombatSpecialWeaponSupport.tagArtemis';

export const UNRESOLVED_ARTEMIS_LINK_NETWORK_LIFECYCLE_SUPPORT_IDS =
  [] as const;

export const SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT = {
  ...SPECIAL_WEAPON_DESIGNATOR_COMBAT_SUPPORT,
  ...SPECIAL_WEAPON_AMS_COMBAT_SUPPORT,
  ...SPECIAL_WEAPON_TAG_ARTEMIS_COMBAT_SUPPORT,
  ...SPECIAL_WEAPON_PLASMA_COMBAT_SUPPORT,
} satisfies Record<string, ICombatFeatureSupportEntry>;
