import {
  MEKSTATION_COCKPIT_CRIT_PILOT_DEATH_SOURCE_REFS,
  MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
  MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
} from './CombatDamageSourceRefs';
import {
  MEGAMEK_DFA_IMPOSSIBLE_DISPLACEMENT_SOURCE_REFS,
  MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS,
  HEAT_AMMO_EXPLOSION_DAMAGE_CASCADE_SOURCE_REFS,
  DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ENGINE_DESTRUCTION_CAUSE_SOURCE_REFS,
} from './CombatDamageSupport.sourceRefs';
import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

export const DESTRUCTION_CAUSE_COMBAT_SUPPORT = {
  damage: integrated(
    'damage',
    'checkUnitDestruction and UnitDestroyed events report generic damage kills',
    DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ),
  ammo_explosion: integrated(
    'ammo_explosion',
    'weaponAttackAmmoExplosions and heat-induced ammo cookoffs emit ammo_explosion destruction when the cascade destroys the unit',
    HEAT_AMMO_EXPLOSION_DAMAGE_CASCADE_SOURCE_REFS,
  ),
  engine_destroyed: integrated(
    'engine_destroyed',
    'resolveDamage and runner critical-event translation map third engine crits to engine_destroyed',
    ENGINE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ),
  impossible_displacement: integrated(
    'impossible_displacement',
    'DFA impossible-displacement branches emit UnitDestroyed cause=impossible_displacement for the blocked unit in runner and event-sourced physical resolution',
    MEGAMEK_DFA_IMPOSSIBLE_DISPLACEMENT_SOURCE_REFS,
  ),
  pilot_death: integrated(
    'pilot_death',
    'applyPilotDamage, cockpit crits, and PSR fall wounds emit pilot_death destruction',
    [
      ...MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
      ...MEKSTATION_COCKPIT_CRIT_PILOT_DEATH_SOURCE_REFS,
      ...MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS,
      ...MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
    ],
  ),
  ct_destroyed: integrated(
    'ct_destroyed',
    'checkUnitDestruction, resolveDamage, runner state snapshots, and UnitDestroyed emissions preserve ct_destroyed for fatal center-torso destruction',
    DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ),
  head_destroyed: integrated(
    'head_destroyed',
    'checkUnitDestruction, resolveDamage, runner state snapshots, and UnitDestroyed emissions preserve head_destroyed for fatal head destruction while pilot_death keeps priority at lethal wounds',
    DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
