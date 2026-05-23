import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

function integrated(id: string, evidence: string): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

export const DAMAGE_RESOLUTION_COMBAT_SUPPORT = {
  'armor-damage': integrated(
    'armor-damage',
    'resolveDamage + runAttackPhase emit DamageApplied and persist armor totals',
  ),
  'internal-structure-damage': integrated(
    'internal-structure-damage',
    'resolveDamage applies structure damage and applyDamageResultToState persists structure totals',
  ),
  'rear-armor-damage': integrated(
    'rear-armor-damage',
    'applyDamageToLocation maps rear hit locations through rearArmor before structure',
  ),
  'head-damage-cap': integrated(
    'head-damage-cap',
    'resolveDamage caps each head hit at HEAD_DAMAGE_CAP_PER_HIT before transfer',
  ),
  'damage-transfer': integrated(
    'damage-transfer',
    'applyDamageWithTransfer follows getTransferCombatLocation until overflow ends',
  ),
  'side-torso-arm-cascade': integrated(
    'side-torso-arm-cascade',
    'applyDamageToLocation and runner LocationDestroyed events cascade side torso destruction to the same-side arm',
  ),
  'location-destroyed-events': integrated(
    'location-destroyed-events',
    'weaponAttackHitResolution emits LocationDestroyed for each destroyed location in the damage chain',
  ),
  'transfer-damage-events': integrated(
    'transfer-damage-events',
    'weaponAttackHitResolution emits TransferDamage when overflow transfers to another location',
  ),
  'twenty-plus-damage-psr': integrated(
    'twenty-plus-damage-psr',
    'weaponAttackHitResolution queues createDamagePSR after 20+ damage in one phase',
  ),
  'heat-ammo-explosion-damage-cascade': integrated(
    'heat-ammo-explosion-damage-cascade',
    'runHeatPhase empties the selected heat-cookoff bin, routes explosion damage through resolveDamage, emits damage/transfer/destruction events, and tags fatal cookoffs as ammo_explosion',
  ),
  'destruction-cause-state-persistence': helperOnly(
    'destruction-cause-state-persistence',
    'resolveDamage returns destructionCause and UnitDestroyed events carry cause',
    'applyDamageResultToState persists destroyed but not destructionCause on IUnitGameState',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PILOT_DAMAGE_COMBAT_SUPPORT = {
  'head-hit-wound': integrated(
    'head-hit-wound',
    'resolveDamage applies one pilot wound for damaging head hits',
  ),
  'head-hit-pilot-event': integrated(
    'head-hit-pilot-event',
    'weaponAttackHitResolution emits PilotHit source=head_hit unless a cockpit crit already emitted the wound',
  ),
  'consciousness-check': integrated(
    'consciousness-check',
    'applyPilotDamage rolls consciousness checks at 3 + total wounds',
  ),
  unconsciousness: integrated(
    'unconsciousness',
    'applyPilotDamage sets pilotConscious=false and action eligibility removes unconscious actors',
  ),
  'pilot-death': integrated(
    'pilot-death',
    'applyPilotDamage and checkUnitDestruction destroy units at lethal wound threshold',
  ),
  'cockpit-crit-pilot-death': integrated(
    'cockpit-crit-pilot-death',
    'applyCockpitHit emits PilotHit plus UnitDestroyed cause=pilot_death',
  ),
  'heat-pilot-damage': integrated(
    'heat-pilot-damage',
    'runHeatPhase and resolveHeatPhase emit PilotHit source=heat, persist wound totals, and destroy pilots at lethal heat wounds',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const CRITICAL_COMPONENT_COMBAT_SUPPORT = {
  actuator: integrated(
    'actuator',
    'default critical manifest includes limb actuators and applyActuatorHit persists actuator damage plus leg PSRs',
  ),
  cockpit: integrated(
    'cockpit',
    'default critical manifest includes cockpit and applyCockpitHit emits pilot_death destruction',
  ),
  engine: integrated(
    'engine',
    'default critical manifest includes engine slots and applyEngineHit persists heat/destruction effects',
  ),
  gyro: integrated(
    'gyro',
    'default critical manifest includes gyro slots and applyGyroHit emits gyro PSRs',
  ),
  life_support: integrated(
    'life_support',
    'default critical manifest includes life support slots and applyLifeSupportHit tracks disabled support',
  ),
  sensor: integrated(
    'sensor',
    'default critical manifest includes sensors and applySensorHit persists sensor hits',
  ),
  ammo: helperOnly(
    'ammo',
    'applyAmmoHit returns AmmoExplosion and weaponAttackAmmoExplosions can cascade ammo-bin damage',
    'default runner critical manifest does not hydrate ammo slots from unit equipment',
  ),
  equipment: helperOnly(
    'equipment',
    'applyCriticalHitEffect returns EquipmentDestroyed for generic equipment slots',
    'default runner critical manifest has no generic equipment slots',
  ),
  heat_sink: helperOnly(
    'heat_sink',
    'applyHeatSinkHit increments heatSinksDestroyed and runHeatPhase consumes that damage',
    'default runner critical manifest does not hydrate heat-sink slots from unit equipment',
  ),
  jump_jet: helperOnly(
    'jump_jet',
    'applyJumpJetHit increments jumpJetsDestroyed',
    'default runner critical manifest does not hydrate jump-jet slots from unit equipment',
  ),
  weapon: helperOnly(
    'weapon',
    'applyWeaponHit records weaponsDestroyed for explicit weapon critical slots',
    'default runner critical manifest does not hydrate weapon slots or disable AI weapon mounts',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const DESTRUCTION_CAUSE_COMBAT_SUPPORT = {
  damage: integrated(
    'damage',
    'checkUnitDestruction and UnitDestroyed events report generic damage kills',
  ),
  ammo_explosion: integrated(
    'ammo_explosion',
    'weaponAttackAmmoExplosions and heat-induced ammo cookoffs emit ammo_explosion destruction when the cascade destroys the unit',
  ),
  engine_destroyed: integrated(
    'engine_destroyed',
    'resolveDamage and runner critical-event translation map third engine crits to engine_destroyed',
  ),
  pilot_death: integrated(
    'pilot_death',
    'applyPilotDamage, cockpit crits, and PSR fall wounds emit pilot_death destruction',
  ),
  ct_destroyed: helperOnly(
    'ct_destroyed',
    'DestructionCause type includes ct_destroyed',
    'fatal center-torso destruction currently collapses to generic damage',
  ),
  head_destroyed: helperOnly(
    'head_destroyed',
    'DestructionCause type includes head_destroyed',
    'fatal head destruction currently collapses to generic damage unless represented as pilot_death',
  ),
  shutdown: helperOnly(
    'shutdown',
    'DestructionCause type includes shutdown and heat phase persists shutdown lifecycle state',
    'shutdown removes actions but does not emit UnitDestroyed cause=shutdown',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
