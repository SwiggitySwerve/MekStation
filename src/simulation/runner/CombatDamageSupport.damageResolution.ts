import {
  MEGAMEK_CASE_AMMO_EXPLOSION_SOURCE_REFS,
  CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  DAMAGE_EVENT_SOURCE_REFS,
  HEAT_AMMO_EXPLOSION_DAMAGE_CASCADE_SOURCE_REFS,
  DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
} from './CombatDamageSupport.sourceRefs';
import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { DAMAGE_THRESHOLD_PSR_SOURCE_REFS } from './CombatPsrTriggerSourceRefs';

export const DAMAGE_RESOLUTION_COMBAT_SUPPORT = {
  'armor-damage': integrated(
    'armor-damage',
    'resolveDamage + runAttackPhase emit DamageApplied and persist armor totals',
    CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  ),
  'internal-structure-damage': integrated(
    'internal-structure-damage',
    'resolveDamage applies structure damage and applyDamageResultToState persists structure totals',
    CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  ),
  'rear-armor-damage': integrated(
    'rear-armor-damage',
    'applyDamageToLocation maps rear hit locations through rearArmor before structure',
    CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  ),
  'head-full-damage': integrated(
    'head-full-damage',
    'resolveDamage applies full head-hit damage while preserving one pilot wound per head hit',
    CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  ),
  'damage-transfer': integrated(
    'damage-transfer',
    'applyDamageWithTransfer follows getTransferCombatLocation until overflow ends',
    CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  ),
  'side-torso-arm-cascade': integrated(
    'side-torso-arm-cascade',
    'applyDamageToLocation and runner LocationDestroyed events cascade side torso destruction to the same-side arm',
    CORE_DAMAGE_RESOLUTION_SOURCE_REFS,
  ),
  'location-destroyed-events': integrated(
    'location-destroyed-events',
    'weaponAttackHitResolution emits LocationDestroyed for each destroyed location in the damage chain',
    DAMAGE_EVENT_SOURCE_REFS,
  ),
  'transfer-damage-events': integrated(
    'transfer-damage-events',
    'weaponAttackHitResolution emits TransferDamage when overflow transfers to another location',
    DAMAGE_EVENT_SOURCE_REFS,
  ),
  'twenty-plus-damage-psr': integrated(
    'twenty-plus-damage-psr',
    'weaponAttackHitResolution queues createDamagePSR after 20+ damage in one phase',
    DAMAGE_THRESHOLD_PSR_SOURCE_REFS,
  ),
  'heat-ammo-explosion-damage-cascade': integrated(
    'heat-ammo-explosion-damage-cascade',
    'runHeatPhase and resolveHeatPhase empty the selected heat-cookoff bin, route explosion damage through resolveDamage, emit damage/transfer/destruction events, and tag fatal cookoffs as ammo_explosion',
    HEAT_AMMO_EXPLOSION_DAMAGE_CASCADE_SOURCE_REFS,
  ),
  'case-ammo-explosion-containment': integrated(
    'case-ammo-explosion-containment',
    'UnitHydration and IGameUnit setup project CASE, CASE-P/prototype CASE, and CASE II into per-location combat state; heat, crit, and event-sourced heat cookoffs emit caseProtection, route explosion damage directly to internal structure, blow out rear armor for surviving protected torso locations, and cap protected damage before transfer can occur',
    MEGAMEK_CASE_AMMO_EXPLOSION_SOURCE_REFS,
  ),
  'destruction-cause-state-persistence': integrated(
    'destruction-cause-state-persistence',
    'resolveDamage returns destructionCause, applyDamageResultToState persists it on IUnitGameState, ammo explosion cascades can override generic damage, and UnitDestroyed replay stores the event cause',
    DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
