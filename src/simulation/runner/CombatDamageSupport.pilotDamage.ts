import { MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS } from './CombatConsciousnessSourceRefs';
import {
  MEKSTATION_COCKPIT_CRIT_PILOT_DEATH_SOURCE_REFS,
  MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
  MEKSTATION_HEAT_PILOT_DAMAGE_SOURCE_REFS,
  MEKSTATION_MAXTECH_HEAT_CRITICAL_SOURCE_REFS,
  MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
} from './CombatDamageSourceRefs';
import { MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS } from './CombatDamageSupport.sourceRefs';
import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

export const PILOT_DAMAGE_COMBAT_SUPPORT = {
  'head-hit-wound': integrated(
    'head-hit-wound',
    'resolveDamage applies one pilot wound for damaging head hits',
    MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
  ),
  'head-hit-pilot-event': integrated(
    'head-hit-pilot-event',
    'weaponAttackHitResolution emits PilotHit source=head_hit unless a cockpit crit already emitted the wound',
    MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
  ),
  'consciousness-check': integrated(
    'consciousness-check',
    'applyPilotDamage rolls consciousness checks at 3 + total wounds',
    MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
  ),
  unconsciousness: integrated(
    'unconsciousness',
    'applyPilotDamage sets pilotConscious=false and action eligibility removes unconscious actors',
    MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
  ),
  'pilot-death': integrated(
    'pilot-death',
    'applyPilotDamage and checkUnitDestruction destroy units at lethal wound threshold',
    [
      ...MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
      ...MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
    ],
  ),
  'cockpit-crit-pilot-death': integrated(
    'cockpit-crit-pilot-death',
    'applyCockpitHit emits PilotHit plus UnitDestroyed cause=pilot_death',
    MEKSTATION_COCKPIT_CRIT_PILOT_DEATH_SOURCE_REFS,
  ),
  'heat-pilot-damage': integrated(
    'heat-pilot-damage',
    'runHeatPhase and resolveHeatPhase emit PilotHit source=heat, persist wound totals, and destroy pilots at lethal heat wounds',
    MEKSTATION_HEAT_PILOT_DAMAGE_SOURCE_REFS,
  ),
  'maxtech-heat-pilot-damage': integrated(
    'maxtech-heat-pilot-damage',
    'runHeatPhase and resolveHeatPhase emit opt-in MaxTech heat-scale PilotHit source=heat at heat 32+ when the avoid roll fails, including Hot Dog avoid-number relief',
    MEKSTATION_HEAT_PILOT_DAMAGE_SOURCE_REFS,
  ),
  'maxtech-heat-critical-damage': integrated(
    'maxtech-heat-critical-damage',
    'runHeatPhase and resolveHeatPhase emit opt-in MaxTech heat-scale CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed chains from failed heat 36+ critical damage avoid rolls',
    MEKSTATION_MAXTECH_HEAT_CRITICAL_SOURCE_REFS,
  ),
  'fall-pilot-damage': integrated(
    'fall-pilot-damage',
    'runPSRPhase, resolvePendingPSRs, and source-backed missed-DFA fall resolution emit PilotHit source=fall, persist wound totals, and destroy pilots at lethal fall wounds',
    MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS,
  ),
  'ammo-explosion-pilot-damage': integrated(
    'ammo-explosion-pilot-damage',
    'resolveBattleMechAmmoExplosionPilotDamage applies source-backed BattleMech ammo-explosion pilot damage, Pain Resistance / Iron Man reduction, and pain-shunt suppression; runner heat, runner critical, and event-sourced heat cookoff paths emit PilotHit source=ammo_explosion and persist wounds/death state',
    MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
