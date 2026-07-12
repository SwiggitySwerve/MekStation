import { UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES } from './CombatCriticalSlotEffectSupport';
import { MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS } from './CombatCriticalSlotSourceRefs';
import {
  BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS,
  MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  MEKSTATION_DAMAGE_EVENT_SOURCE_REFS,
  MEKSTATION_DAMAGE_RESOLUTION_SOURCE_REFS,
  MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
  MEKSTATION_HEAT_AMMO_EXPLOSION_DAMAGE_SOURCE_REFS,
} from './CombatDamageSourceRefs';
import { combatFeatureSourceRef } from './CombatFeatureSourceReference';
import { type ICombatFeatureSourceReference } from './CombatFeatureSupport';

const MEGAMEK_DAMAGE_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_DFA_IMPOSSIBLE_DISPLACEMENT_SOURCE_REFS = [
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek resolveDfaAttack destroys the attacker on a missed DFA when the target cannot be displaced.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15233-L15265',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  ),
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek resolveDfaAttack destroys the target on a successful DFA when the target cannot be displaced.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15352-L15366',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS = [
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek doEntityFall rolls checkPilotAvoidFallDamage after fall damage and applies one crew hit when that piloting check fails.',
    'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23233-L23357',
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CASE_AMMO_EXPLOSION_SOURCE_REFS = [
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek applyEntityArmorDamage skips normal armor absorption for ammoExplosion damage, so the cascade starts at internal structure.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L2844-L2865`,
    MEGAMEK_DAMAGE_SOURCE_VERSION,
  ),
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek prevents remaining ammo-explosion damage from transferring when the hit location has CASE.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L520-L529`,
    MEGAMEK_DAMAGE_SOURCE_VERSION,
  ),
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek caps ammo-explosion damage at 10 with CASE and 1 with CASE II before local internal damage resolution and blows out rear armor on surviving torso locations.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L2435-L2489`,
    MEGAMEK_DAMAGE_SOURCE_VERSION,
  ),
  combatFeatureSourceRef(
    'megamek-source',
    'MegaMek Entity.locationHasCase detects mounted CASE or CASE-P in the same location.',
    `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6867-L6874`,
    MEGAMEK_DAMAGE_SOURCE_VERSION,
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const CORE_DAMAGE_RESOLUTION_SOURCE_REFS = [
  ...BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS,
  ...MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DAMAGE_RESOLUTION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const DAMAGE_EVENT_SOURCE_REFS = [
  ...MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DAMAGE_EVENT_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const HEAT_AMMO_EXPLOSION_DAMAGE_CASCADE_SOURCE_REFS = [
  ...MEGAMEK_CASE_AMMO_EXPLOSION_SOURCE_REFS,
  ...MEKSTATION_HEAT_AMMO_EXPLOSION_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS = [
  ...BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS,
  ...MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const ENGINE_DESTRUCTION_CAUSE_SOURCE_REFS = [
  ...DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export { UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES };
