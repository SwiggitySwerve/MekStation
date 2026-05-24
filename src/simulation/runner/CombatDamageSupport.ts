import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

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
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

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
  'destruction-cause-state-persistence': integrated(
    'destruction-cause-state-persistence',
    'resolveDamage returns destructionCause, applyDamageResultToState persists it on IUnitGameState, ammo explosion cascades can override generic damage, and UnitDestroyed replay stores the event cause',
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
  'maxtech-heat-pilot-damage': integrated(
    'maxtech-heat-pilot-damage',
    'runHeatPhase and resolveHeatPhase emit opt-in MaxTech heat-scale PilotHit source=heat at heat 32+ when the avoid roll fails, including Hot Dog avoid-number relief',
  ),
  'maxtech-heat-critical-damage': integrated(
    'maxtech-heat-critical-damage',
    'runHeatPhase and resolveHeatPhase emit opt-in MaxTech heat-scale CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed chains from failed heat 36+ critical damage avoid rolls',
  ),
  'fall-pilot-damage': integrated(
    'fall-pilot-damage',
    'runPSRPhase, resolvePendingPSRs, and source-backed missed-DFA fall resolution emit PilotHit source=fall, persist wound totals, and destroy pilots at lethal fall wounds',
    MEGAMEK_FALL_PILOT_DAMAGE_SOURCE_REFS,
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
  heat_sink: integrated(
    'heat_sink',
    'hydrateCriticalSlotManifestFromFullUnit seeds catalog Heat Sink slots, applyHeatSinkHit increments heatSinksDestroyed, and runHeatPhase consumes that damage',
  ),
  jump_jet: integrated(
    'jump_jet',
    'hydrateCriticalSlotManifestFromFullUnit seeds catalog Jump Jet slots, applyJumpJetHit increments jumpJetsDestroyed, and runMovementPhase reduces jump MP before movement validation',
  ),
  weapon: integrated(
    'weapon',
    'hydrateCriticalSlotManifestFromFullUnit seeds catalog Weapon slots with runtime weapon ids, applyWeaponHit records weaponsDestroyed, toAIUnitState removes those mounts from bot planning, and runAttackPhase rejects stale declarations',
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
  impossible_displacement: integrated(
    'impossible_displacement',
    'DFA impossible-displacement branches emit UnitDestroyed cause=impossible_displacement for the blocked unit in runner and event-sourced physical resolution',
    MEGAMEK_DFA_IMPOSSIBLE_DISPLACEMENT_SOURCE_REFS,
  ),
  pilot_death: integrated(
    'pilot_death',
    'applyPilotDamage, cockpit crits, and PSR fall wounds emit pilot_death destruction',
  ),
  ct_destroyed: integrated(
    'ct_destroyed',
    'checkUnitDestruction, resolveDamage, runner state snapshots, and UnitDestroyed emissions preserve ct_destroyed for fatal center-torso destruction',
  ),
  head_destroyed: integrated(
    'head_destroyed',
    'checkUnitDestruction, resolveDamage, runner state snapshots, and UnitDestroyed emissions preserve head_destroyed for fatal head destruction while pilot_death keeps priority at lethal wounds',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
