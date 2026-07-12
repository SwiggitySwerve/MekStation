import {
  EQUIPMENT_ARTEMIS_FCS_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
  EQUIPMENT_BLUE_SHIELD_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_EVIDENCE,
  EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_GAP,
  EQUIPMENT_CHARGED_CAPACITOR_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_EXTENDED_FUEL_TANK_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_FUEL_INCENDIARY_BRANCH_EVIDENCE,
  EQUIPMENT_FUEL_INCENDIARY_BRANCH_GAP,
  EQUIPMENT_HOT_LOAD_LINKED_AMMO_INFERENCE_EVIDENCE,
  EQUIPMENT_HOT_LOAD_MODE_STATE_INFERENCE_EVIDENCE,
  EQUIPMENT_PROTOTYPE_IMPROVED_JUMP_JET_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_EXPLOSIVE_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_HOT_LOADED_WEAPON_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_RISC_LPM_AMBIGUOUS_LINK_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_CRITICAL_EFFECT_EVIDENCE,
  EQUIPMENT_RISC_LASER_PULSE_MODULE_CRITICAL_EFFECT_EVIDENCE,
} from './CombatCriticalSlotEffectSupport';
import {
  MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_ACTIVE_PROBE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS,
  MEKSTATION_AMMO_EXHAUSTION_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  MEGAMEK_PARTIAL_WING_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_PHYSICAL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_REPRESENTED_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_STEALTH_LINKED_ECM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs';
import {
  integrated,
  outOfScope,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

export const EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE =
  'Aggregate equipment component coverage is split-accounted: catalog hydration can create generic equipment slots, represented empty tracked ammo-bin no-explosion handling, generic EquipmentDestroyed name replay, Claw/Talons cleanup, Partial Wing runtime mutations, shield preserved-function replay, SCM six-slot critical lifecycle replay, Emergency Coolant System damaged-state plus 5-point explosion replay, PLAYTEST_3 autocannon first-hit and follow-up critical replay including official RAC/HVAC names, HarJel breach and secondary-critical replay, represented explicit explosion-damage equipment replay including exact single same-location source metadata hydration, represented hot-loaded weapon critical explosion replay, represented HotLoad linked-ammo hydration with unique linked ammo explosionDamage, represented HotLoad mode-state hydration with explicit explosionDamage, represented PPC Capacitor explosion replay, represented mode-gated official Blue Shield 5-point explosion replay, represented Prototype Improved Jump Jet 10-point explosion replay, represented Extended Fuel Tank 20-point explosion replay, represented RISC Laser Pulse Module exact explicit or unambiguous same-location linked-laser critical replay, represented RISC Laser Pulse Module inoperable-linked module-destruction replay, represented RISC Laser Pulse Module ambiguous or absent linked-laser no-fallback replay, represented Artemis FCS critical-damage guidance removal replay, active-probe critical replay, and stealth-linked ECM suite replay are integrated sibling rows, while LAM/non-BattleMech fuel equipment and incendiary ammo lifecycle branches are exported as explicit out-of-scope rows rather than unsupported BattleMech equipment-critical blockers';

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
  'equipment-physical-modifiers': integrated(
    'equipment-physical-modifiers',
    'Generic equipment critical slots hydrate Claw/Talons payloads; physical damage can produce only represented CriticalHitResolved payloads, runner/replay clears represented physical modifier state from those payloads or destroyed-location damage, and component-damage state remains unchanged',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_PHYSICAL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-partial-wing': integrated(
    'equipment-partial-wing',
    'Generic equipment critical slots hydrate Partial Wing payloads; runner/replay decrements represented partialWingJumpBonus from EquipmentDestroyed CriticalHitResolved events, and component-damage state remains unchanged',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_PARTIAL_WING_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-active-probe': integrated(
    'equipment-active-probe',
    'Generic equipment critical slots hydrate active-probe equipment names; replay marks matching same-unit electronic-warfare active probes non-operational from represented EquipmentDestroyed CriticalHitResolved events, and component-damage state remains unchanged',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_ACTIVE_PROBE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-stealth-linked-ecm': integrated(
    'equipment-stealth-linked-ecm',
    'Generic equipment critical slots hydrate ECM equipment names; replay marks matching same-unit electronic-warfare ECM suites non-operational from represented EquipmentDestroyed CriticalHitResolved events, removing the active own-ECM state BattleMech stealth armor depends on while component-damage state remains unchanged',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_STEALTH_LINKED_ECM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-generic-destroyed-name-replay': integrated(
    'equipment-generic-destroyed-name-replay',
    'Generic equipment critical slots hydrate otherwise-unclassified mounted equipment; local effects/replay record EquipmentDestroyed names in destroyedEquipment without mutating component-damage state',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-ammo-exhaustion-no-explosion': integrated(
    'equipment-ammo-exhaustion-no-explosion',
    'Hydrated ammo critical slots carry ammoBinId through CriticalHitResolved; runner ammo-explosion handling treats empty tracked bins or untracked locations as destroyed ammo with no AmmoExplosion and no component-damage mutation',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_AMMO_EXHAUSTION_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-shields': integrated(
    'equipment-shields',
    'Generic shield equipment critical slots hydrate and resolve as non-destroying EquipmentHit events, preserving shield function without mutating component-damage state',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-scm': integrated(
    'equipment-scm',
    'Generic SCM equipment critical slots hydrate and resolve through represented Super-Cooled Myomer slot-damage counting, disabling the mounted equipment only after the sixth SCM critical without mutating generic component-damage state',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-emergency-coolant': integrated(
    'equipment-emergency-coolant',
    'Generic Emergency Coolant System equipment critical slots hydrate represented 5-point secondary-effect-gated explosion metadata, resolve through represented damaged-coolant-system state, and cascade equipment explosion damage when secondary effects are enabled; coolant use, coolant failure, and heat-phase behavior remain separate gaps',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-ac-playtest': integrated(
    'equipment-ac-playtest',
    'Generic autocannon equipment critical slots, including official RAC/HVAC naming, hydrate and resolve through represented PLAYTEST_3 first-hit state: the first critical records autocannon-hit state without destroying the slot/mount, and a later critical against the same mounted AC/RAC/HVAC destroys it normally',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-harjel': integrated(
    'equipment-harjel',
    'Generic HarJel equipment critical slots hydrate and resolve through represented breach-state replay: plain HarJel records a breached location, and HarJel II/III schedule one same-location secondary critical without claiming broader HarJel armor repair or breach-prevention rules',
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-explosive-equipment': integrated(
    'equipment-explosive-equipment',
    EQUIPMENT_EXPLOSIVE_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_REPRESENTED_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-hot-loaded-weapons': integrated(
    'equipment-hot-loaded-weapons',
    EQUIPMENT_HOT_LOADED_WEAPON_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-blue-shield-explosion': integrated(
    'equipment-blue-shield-explosion',
    EQUIPMENT_BLUE_SHIELD_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-charged-capacitors': integrated(
    'equipment-charged-capacitors',
    EQUIPMENT_CHARGED_CAPACITOR_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-prototype-improved-jump-jet-explosion': integrated(
    'equipment-prototype-improved-jump-jet-explosion',
    EQUIPMENT_PROTOTYPE_IMPROVED_JUMP_JET_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-extended-fuel-tank-explosion': integrated(
    'equipment-extended-fuel-tank-explosion',
    EQUIPMENT_EXTENDED_FUEL_TANK_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-risc-laser-pulse-module-linked-laser': integrated(
    'equipment-risc-laser-pulse-module-linked-laser',
    EQUIPMENT_RISC_LASER_PULSE_MODULE_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-risc-laser-pulse-module-inoperable-linked-module': integrated(
    'equipment-risc-laser-pulse-module-inoperable-linked-module',
    EQUIPMENT_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-artemis-fcs-critical-lifecycle': integrated(
    'equipment-artemis-fcs-critical-lifecycle',
    EQUIPMENT_ARTEMIS_FCS_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-blue-shield-special-rules': outOfScope(
    'equipment-blue-shield-special-rules',
    EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_EVIDENCE,
    EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_GAP,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-hot-load-linked-ammo-inference': integrated(
    'equipment-hot-load-linked-ammo-inference',
    EQUIPMENT_HOT_LOAD_LINKED_AMMO_INFERENCE_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-hot-load-mode-state-inference': integrated(
    'equipment-hot-load-mode-state-inference',
    EQUIPMENT_HOT_LOAD_MODE_STATE_INFERENCE_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-risc-laser-pulse-module-ambiguous-link': integrated(
    'equipment-risc-laser-pulse-module-ambiguous-link',
    EQUIPMENT_RISC_LPM_AMBIGUOUS_LINK_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-fuel-incendiary-branches': outOfScope(
    'equipment-fuel-incendiary-branches',
    EQUIPMENT_FUEL_INCENDIARY_BRANCH_EVIDENCE,
    EQUIPMENT_FUEL_INCENDIARY_BRANCH_GAP,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS,
    ],
  ),
  'equipment-bomb-bays': outOfScope(
    'equipment-bomb-bays',
    EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
    EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
    [
      ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  equipment: integrated('equipment', EQUIPMENT_CRITICAL_COMPONENT_EVIDENCE, [
    ...MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
    ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ...MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ]),
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
