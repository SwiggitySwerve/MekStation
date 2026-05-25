import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { MEGAMEK_AMMO_EXPLOSION_PILOT_DAMAGE_SOURCE_REFS } from './CombatConsciousnessSourceRefs';
import {
  MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs';
import {
  BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS,
  MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  MEKSTATION_COCKPIT_CRIT_PILOT_DEATH_SOURCE_REFS,
  MEKSTATION_DAMAGE_EVENT_SOURCE_REFS,
  MEKSTATION_DAMAGE_RESOLUTION_SOURCE_REFS,
  MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
  MEKSTATION_HEAT_AMMO_EXPLOSION_DAMAGE_SOURCE_REFS,
  MEKSTATION_HEAT_PILOT_DAMAGE_SOURCE_REFS,
  MEKSTATION_MAXTECH_HEAT_CRITICAL_SOURCE_REFS,
  MEKSTATION_PILOT_DAMAGE_SOURCE_REFS,
} from './CombatDamageSourceRefs';
import { DAMAGE_THRESHOLD_PSR_SOURCE_REFS } from './CombatPsrTriggerSourceRefs';

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, level: 'helper-only', evidence, gap };
}

const MEGAMEK_DAMAGE_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

const MEGAMEK_DFA_IMPOSSIBLE_DISPLACEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek resolveDfaAttack destroys the attacker on a missed DFA when the target cannot be displaced.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15233-L15265',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek resolveDfaAttack destroys the target on a successful DFA when the target cannot be displaced.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15352-L15366',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek doEntityFall rolls checkPilotAvoidFallDamage after fall damage and applies one crew hit when that piloting check fails.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23233-L23357',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_CASE_AMMO_EXPLOSION_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek applyEntityArmorDamage skips normal armor absorption for ammoExplosion damage, so the cascade starts at internal structure.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L2844-L2865`,
    sourceVersion: MEGAMEK_DAMAGE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek prevents remaining ammo-explosion damage from transferring when the hit location has CASE.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L520-L529`,
    sourceVersion: MEGAMEK_DAMAGE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek caps ammo-explosion damage at 10 with CASE and 1 with CASE II before local internal damage resolution and blows out rear armor on surviving torso locations.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWDamageManagerModular.java#L2435-L2489`,
    sourceVersion: MEGAMEK_DAMAGE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.locationHasCase detects mounted CASE or CASE-P in the same location.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_DAMAGE_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6867-L6874`,
    sourceVersion: MEGAMEK_DAMAGE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const CORE_DAMAGE_RESOLUTION_SOURCE_REFS = [
  ...BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS,
  ...MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DAMAGE_RESOLUTION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const DAMAGE_EVENT_SOURCE_REFS = [
  ...MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DAMAGE_EVENT_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const HEAT_AMMO_EXPLOSION_DAMAGE_CASCADE_SOURCE_REFS = [
  ...MEGAMEK_CASE_AMMO_EXPLOSION_SOURCE_REFS,
  ...MEKSTATION_HEAT_AMMO_EXPLOSION_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS = [
  ...BATTLEMECH_MANUAL_DAMAGE_SOURCE_REFS,
  ...MEGAMEK_BATTLEMECH_DAMAGE_SOURCE_REFS,
  ...MEKSTATION_DESTRUCTION_CAUSE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const ENGINE_DESTRUCTION_CAUSE_SOURCE_REFS = [
  ...DAMAGE_DESTRUCTION_CAUSE_SOURCE_REFS,
  ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

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
  'head-damage-cap': integrated(
    'head-damage-cap',
    'resolveDamage caps each head hit at HEAD_DAMAGE_CAP_PER_HIT before transfer',
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

export const CRITICAL_COMPONENT_COMBAT_SUPPORT = {
  actuator: integrated(
    'actuator',
    'default critical manifest includes limb actuators and applyActuatorHit persists actuator damage plus leg PSRs',
    [
      ...MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  cockpit: integrated(
    'cockpit',
    'default critical manifest includes cockpit and applyCockpitHit emits pilot_death destruction',
    [
      ...MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  engine: integrated(
    'engine',
    'default critical manifest includes engine slots and applyEngineHit persists heat/destruction effects',
    [
      ...MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  gyro: integrated(
    'gyro',
    'default critical manifest includes gyro slots and applyGyroHit emits gyro PSRs',
    [
      ...MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  life_support: integrated(
    'life_support',
    'default critical manifest includes life support slots and applyLifeSupportHit tracks disabled support',
    [
      ...MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  sensor: integrated(
    'sensor',
    'default critical manifest includes sensors and applySensorHit persists sensor hits',
    [
      ...MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  ammo: integrated(
    'ammo',
    'hydrateCriticalSlotManifestFromFullUnit maps catalog ammo slots to ammoBinId, createHydratedUnitState seeds ammoState from catalog ammo critical slots, and weaponAttackAmmoExplosions targets crit-induced cookoffs at the resolved bin',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  equipment: helperOnly(
    'equipment',
    'applyCriticalHitEffect returns EquipmentDestroyed for generic equipment slots',
    'Generic equipment critical slots can hydrate from catalog data, but MegaMek equipment-specific branches do not all cascade through MekStation combat state yet',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  heat_sink: integrated(
    'heat_sink',
    'hydrateCriticalSlotManifestFromFullUnit seeds catalog Heat Sink slots, applyHeatSinkHit increments heatSinksDestroyed, and runHeatPhase consumes that damage',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  jump_jet: integrated(
    'jump_jet',
    'hydrateCriticalSlotManifestFromFullUnit seeds catalog Jump Jet slots, applyJumpJetHit increments jumpJetsDestroyed, and runMovementPhase reduces jump MP before movement validation',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  weapon: integrated(
    'weapon',
    'hydrateCriticalSlotManifestFromFullUnit seeds catalog Weapon slots with runtime weapon ids, applyWeaponHit records weaponsDestroyed, toAIUnitState removes those mounts from bot planning, and runAttackPhase rejects stale declarations',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

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
