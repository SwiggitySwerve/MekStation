import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_ACTIVE_PROBE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_AMMO_EXHAUSTION_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS,
  MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
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

function integrated(
  id: string,
  evidence: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'integrated', evidence, sourceRefs };
}

function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return { id, level: 'out-of-scope', evidence, gap, sourceRefs };
}

export const UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES = [] as const;

export const UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS = [] as const;

export const OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_BRANCHES = [
  'Blue Shield ARAD, hit-location, activation, and defensive special rules beyond damage/death critical replay',
  'bomb bays',
  'LAM/non-BattleMech fuel equipment and incendiary ammo lifecycle branches outside ground BattleMech equipment-critical replay',
] as const;

export const REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES = [
  'Claw/Talons physical critical-event production and modifier cleanup',
  'Partial Wing jump-bonus critical-event replay',
  'stealth-linked ECM suite critical-event replay',
  'active-probe critical-event replay',
  'generic shield preserved-function critical-event replay, including Blue Shield by name only',
  'represented mode-gated official Blue Shield Particle Field Damper 5-point critical explosion replay',
  'SCM six-slot critical lifecycle replay',
  'Emergency Coolant System damaged-state and 5-point critical explosion replay',
  'PLAYTEST_3 autocannon first-hit and follow-up critical replay including official RAC/HVAC names',
  'HarJel breach and HarJel II/III secondary-critical replay',
  'represented explicit explosion-damage equipment critical replay',
  'represented hot-loaded weapon critical explosion replay',
  'represented HotLoad linked-ammo weapon critical hydration with unique linked ammo explosionDamage',
  'represented HotLoad mode-state weapon critical hydration with explicit explosionDamage',
  'represented PPC Capacitor charged-capacitor critical explosion replay',
  'represented Prototype Improved Jump Jet 10-point critical explosion replay',
  'represented Extended Fuel Tank 20-point critical explosion replay',
  'represented RISC Laser Pulse Module exact explicit or unambiguous same-location linked-laser critical replay',
  'represented RISC Laser Pulse Module inoperable-linked module-destruction replay',
  'represented RISC Laser Pulse Module ambiguous or absent linked-laser no-fallback replay',
  'represented Artemis FCS critical-damage guidance removal replay',
  'generic EquipmentDestroyed name replay',
  'empty tracked ammo-bin critical no-explosion branch',
] as const;

export const REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS = [
  'equipment-ammo-exhaustion-no-explosion',
  'equipment-generic-destroyed-name-replay',
  'equipment-physical-modifiers',
  'equipment-partial-wing',
  'equipment-active-probe',
  'equipment-emergency-coolant',
  'equipment-ac-playtest',
  'equipment-harjel',
  'equipment-explosive-equipment',
  'equipment-hot-loaded-weapons',
  'equipment-hot-load-linked-ammo-inference',
  'equipment-hot-load-mode-state-inference',
  'equipment-blue-shield-explosion',
  'equipment-charged-capacitors',
  'equipment-prototype-improved-jump-jet-explosion',
  'equipment-extended-fuel-tank-explosion',
  'equipment-risc-laser-pulse-module-linked-laser',
  'equipment-risc-laser-pulse-module-inoperable-linked-module',
  'equipment-risc-laser-pulse-module-ambiguous-link',
  'equipment-artemis-fcs-critical-lifecycle',
  'equipment-shields',
  'equipment-scm',
  'equipment-stealth-linked-ecm',
] as const;

export const OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_SUPPORT_IDS = [
  'equipment-blue-shield-special-rules',
  'equipment-bomb-bays',
  'equipment-fuel-incendiary-branches',
] as const;

export const EQUIPMENT_CRITICAL_EFFECT_GAP = `equipment-specific MegaMek applyEquipmentCritical side paths beyond represented runner-visible slices (${REPRESENTED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES.join(
  ', ',
)}) are separately scoped under represented rows, explicit unsupported branch rows (${
  UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES.length > 0
    ? UNRESOLVED_EQUIPMENT_CRITICAL_EFFECT_BRANCHES.join(', ')
    : 'none'
}), and out-of-scope branch rows (${OUT_OF_SCOPE_EQUIPMENT_CRITICAL_EFFECT_BRANCHES.join(
  ', ',
)}) instead of being hidden by one broad aggregate row`;

export const EQUIPMENT_CRITICAL_EFFECT_EVIDENCE =
  'Aggregate equipment critical effects are split-accounted: represented empty tracked ammo-bin no-explosion handling, generic EquipmentDestroyed name replay, Claw/Talons cleanup, Partial Wing jump-bonus replay, generic shield preserved-function replay including Blue Shield by name only, SCM six-slot critical lifecycle replay, Emergency Coolant System damaged-state plus 5-point explosion replay, PLAYTEST_3 autocannon first-hit and follow-up critical replay including official RAC/HVAC names, HarJel breach and secondary-critical replay, represented explicit explosion-damage equipment replay including exact single same-location source metadata hydration, represented hot-loaded weapon critical explosion replay, represented HotLoad linked-ammo hydration with unique linked ammo explosionDamage, represented HotLoad mode-state hydration with explicit explosionDamage, represented PPC Capacitor explosion replay, represented mode-gated official Blue Shield 5-point explosion replay, represented Prototype Improved Jump Jet 10-point explosion replay, represented Extended Fuel Tank 20-point explosion replay, represented RISC Laser Pulse Module exact explicit or unambiguous same-location linked-laser critical replay, represented RISC Laser Pulse Module inoperable-linked module-destruction replay, represented RISC Laser Pulse Module ambiguous or absent linked-laser no-fallback replay, represented Artemis FCS critical-damage guidance removal replay, active-probe critical replay, and stealth-linked ECM replay are integrated sibling rows, while LAM/non-BattleMech fuel equipment and incendiary ammo lifecycle branches are exported as explicit out-of-scope rows rather than unsupported BattleMech equipment-critical blockers';

export const EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_GAP =
  'Blue Shield ARAD, hit-location, activation lifecycle, defensive special rules, and other non-critical damage/death behavior remain outside the BattleMech damage/death critical-effect inventory; represented critical damage behavior stays covered by generic shield handling plus mode-gated official 5-point explosionDamage payloads';

export const EQUIPMENT_HOT_LOAD_LINKED_AMMO_INFERENCE_GAP =
  'Hot-loaded weapon critical explosions still do not infer from linked-ammo guesses, duplicate linked ammo, missing linked ammo explosionDamage, or mode text without source-backed damage state';

export const EQUIPMENT_HOT_LOAD_MODE_STATE_INFERENCE_GAP =
  'Hot-loaded weapon critical explosions inferred from HotLoad mode state remain unsupported; critical slots must carry explicit hotLoaded=true plus positive explosionDamage, and weapon mode text or lifecycle state must not synthesize explosion behavior';

export const EQUIPMENT_RISC_LPM_AMBIGUOUS_LINK_GAP =
  'RISC Laser Pulse Module ambiguous or absent linked-laser evidence is represented only as a no-fallback generic module-destruction replay; full source-authoring parity for exact MegaMek mounted-equipment linkage remains limited to explicit linkedEquipment metadata or one unambiguous same-location working laser';

export const EQUIPMENT_FUEL_INCENDIARY_BRANCH_GAP =
  'LAM fuel equipment, generic non-Extended Fuel Tank catalog aliases, and incendiary/inferno ammo lifecycle branches belong to separate LAM/aerospace, non-BattleMech equipment, or ammo-special validation lanes and must not block the represented ground BattleMech equipment-critical replay matrix';

export const EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_EVIDENCE =
  'Represented Blue Shield equipment critical support covers BattleMech critical-slot damage/death behavior through generic shield preservation and mode-gated official 5-point explosionDamage payloads; broader ARAD, hit-location, activation, and defensive special rules are not damage/death critical-effect rows';

export const EQUIPMENT_HOT_LOAD_LINKED_AMMO_INFERENCE_EVIDENCE =
  'Represented hot-loaded weapon support hydrates source HotLoad mode state with positive explosionDamage from either the exact mounted weapon entry or a unique same-location linked ammo entry carrying explicit positive explosionDamage; linked-ammo guesses, duplicate linked ammo, and mode text without damage remain unclaimed';

export const EQUIPMENT_HOT_LOAD_MODE_STATE_INFERENCE_EVIDENCE =
  'Represented hot-loaded weapon support hydrates source equipment HotLoad mode state only when exactly one matching mounted weapon entry carries explicit positive explosionDamage; unique same-location linked-ammo explosionDamage hydration is represented separately while linked-ammo guesses remain unclaimed';

export const EQUIPMENT_RISC_LPM_AMBIGUOUS_LINK_EVIDENCE =
  'Represented RISC Laser Pulse Module support fails closed for ambiguous, multi-linked, non-laser, or absent linked-laser evidence: hydration keeps the module generic, runner critical resolution records only EquipmentDestroyed for the module, emits no AmmoExplosion damage, and does not disable a random same-location laser';

export const EQUIPMENT_FUEL_INCENDIARY_BRANCH_EVIDENCE =
  'Represented Extended Fuel Tank support covers the source-backed BattleMech fuel explosion slice; active BattleMech critical-slot data adds only LAM Fuel Tank outside that represented slice, generic Fuel Tank maps to the unofficial bafueltank catalog row, and incendiary/inferno catalog entries are ammunition variants rather than equipment critical-slot branches';

export const EQUIPMENT_EXPLOSIVE_CRITICAL_EFFECT_GAP =
  'Unrepresented explosive equipment side paths remain outside the represented explosionDamage critical-effect slice until runtime state proves their equipment identity and explosion damage';

export const EQUIPMENT_HOT_LOADED_WEAPON_CRITICAL_EFFECT_GAP =
  'Hot-loaded weapon criticals require explicit hotLoaded state or source HotLoad mode state with exactly one matching mounted entry plus positive explosionDamage; names, aliases, linked ammo guesses, duplicate mounts, and mode text without damage are not synthesized';

export const EQUIPMENT_EXPLOSIVE_CRITICAL_EFFECT_EVIDENCE =
  'Represented equipment critical slots carrying explicit positive explosionDamage and an equipment identity, including exact single same-location source equipment metadata hydrated into a critical slot, emit equipment AmmoExplosion payloads and cascade damage through runner DamageApplied events; MekStation does not synthesize explosion damage from static aliases or generic equipment names, and broader charge/capacitor lifecycle, Blue Shield Particle Field Damper special rules, RISC Laser Pulse Module, non-Extended-Fuel-Tank fuel branches, bomb-bay, hot-loaded weapon, RAC/HVAC, incendiary, and generic mounted-equipment side paths without explicit damage metadata remain outside this narrow row';

export const EQUIPMENT_HOT_LOADED_WEAPON_CRITICAL_EFFECT_EVIDENCE =
  'Represented hot-loaded weapon critical slots carrying explicit hotLoaded state plus positive explosionDamage, or source HotLoad mode state on exactly one matching mounted weapon entry with explicit positive explosionDamage, emit weapon or equipment AmmoExplosion payloads and cascade damage through runner DamageApplied events; MekStation does not synthesize hot-loaded explosion damage from names, aliases, linked ammo guesses, duplicate mounts, or mode text without damage';

export const EQUIPMENT_CHARGED_CAPACITOR_CRITICAL_EFFECT_EVIDENCE =
  'Represented PPC Capacitor critical slots carrying charged-capacitor explosion damage emit equipment AmmoExplosion payloads and cascade damage through runner DamageApplied events; broader linked, cross-linked, double-capacitor, fired-PPC, and charged-mode lifecycle parity remains outside this narrow row';

export const EQUIPMENT_BLUE_SHIELD_CRITICAL_EFFECT_EVIDENCE =
  'Represented official Blue Shield Particle Field Damper critical slots hydrate with source-backed 5-point secondary-effect-gated explosion metadata unless the source equipment mode is explicitly Off; active/default slots emit equipment AmmoExplosion payloads and cascade damage through runner DamageApplied events, while Off-mode slots remain non-explosive shield equipment; broader Blue Shield activation lifecycle, ARAD, hit-location, and special defensive rules remain outside this narrow row';

export const EQUIPMENT_PROTOTYPE_IMPROVED_JUMP_JET_CRITICAL_EFFECT_EVIDENCE =
  'Represented official prototype-improved-jump-jet / Prototype Improved Jump Jet critical slots carrying 10-point equipment explosion damage emit equipment AmmoExplosion payloads and cascade damage through runner DamageApplied events; Blue Shield Particle Field Damper special rules, RISC Laser Pulse Module, non-Extended-Fuel-Tank fuel or bomb bays, hot-loaded weapons, incendiary branches, and generic explosive-equipment parity remain outside this narrow row';

export const EQUIPMENT_EXTENDED_FUEL_TANK_CRITICAL_EFFECT_EVIDENCE =
  'Represented official Extended Fuel Tank critical slots, including official tonnage-suffixed BattleMech critical text such as Extended Fuel Tank (1 ton) and Extended Fuel Tank (3 tons), carry 20-point secondary-effect-gated equipment explosion damage, emit equipment AmmoExplosion payloads, and cascade damage through runner DamageApplied events; fuel consumption, bomb-bay fuel checks, Blue Shield Particle Field Damper special rules, RISC Laser Pulse Module linked-laser criticals, non-Extended-Fuel-Tank fuel/incendiary branches, and generic fuel equipment parity remain outside this narrow row';

export const EQUIPMENT_RISC_LASER_PULSE_MODULE_CRITICAL_EFFECT_EVIDENCE =
  'Represented official RISC Laser Pulse Module critical slots carrying explicit linkedEquipment metadata that resolves to exactly one working same-location laser, or no linkedEquipment metadata with exactly one same-location working laser weapon, destroy the linked working laser without emitting AmmoExplosion damage; ambiguous, multi-linked, non-laser, destroyed, or absent same-location laser evidence is represented by the no-fallback generic module-destruction row, while Blue Shield Particle Field Damper special rules, non-Extended-Fuel-Tank fuel or bomb bays, incendiary branches, and generic explosive-equipment parity remain outside this narrow row';

export const EQUIPMENT_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_CRITICAL_EFFECT_EVIDENCE =
  'Represented official RISC Laser Pulse Module critical slots carrying explicit single linkedEquipment metadata that already points at a destroyed linked laser fall back to generic module EquipmentDestroyed replay without emitting AmmoExplosion damage or duplicating linked-weapon destruction; ambiguous, multi-linked, non-laser, or absent same-location laser evidence is represented by the no-fallback generic module-destruction row, while Blue Shield Particle Field Damper special rules, non-Extended-Fuel-Tank fuel or bomb bays, incendiary branches, and generic explosive-equipment parity remain outside this narrow row';

export const EQUIPMENT_RISC_LPM_AMBIGUOUS_LINK_CRITICAL_EFFECT_EVIDENCE =
  'Represented official RISC Laser Pulse Module critical slots with ambiguous, multi-linked, non-laser, destroyed, or absent linked-laser evidence remain generic equipment slots and replay only module EquipmentDestroyed state; they emit no AmmoExplosion damage and do not synthesize linked-laser destruction from fallback names or multiple same-location lasers';

export const EQUIPMENT_ARTEMIS_FCS_CRITICAL_EFFECT_EVIDENCE =
  'Represented Artemis IV/prototype Artemis IV/Artemis V FCS equipment criticals record destroyed FCS kind, location, and explicit linked launcher id when present through CriticalHitResolved replay; runner snapshots remove matching guidance flags from the explicitly linked launcher or represented same-location fallback launchers, while ambiguous FCS allocation, Nova CEWS C3-style network behavior, and broader Artemis mode/network lifecycle remain outside this narrow row';

export const EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE =
  'MegaMek applyEquipmentCritical includes bomb-bay equipment branches, but MekStation bomb-bay authoring and fly-over behavior are aerospace/small-craft surfaces rather than BattleMech critical-effect runtime evidence';

export const EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP =
  'Bomb-bay equipment critical effects belong in a separate aerospace/small-craft combat validation matrix and must not keep the BattleMech mounted-equipment critical-effect row helper-only';

export const CRITICAL_SLOT_EFFECT_COMBAT_SUPPORT = {
  actuator: integrated(
    'actuator',
    'applyActuatorHit mutates actuator damage and queues PSRs for leg actuator hits',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  ammo: integrated(
    'ammo',
    'applyAmmoHit returns AmmoExplosion effects for explicit ammo critical slots',
    MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  cockpit: integrated(
    'cockpit',
    'applyCockpitHit emits cockpit critical pilot-death effects',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  engine: integrated(
    'engine',
    'applyEngineHit mutates engine-hit state and destruction when the third engine hit lands',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-physical-modifiers': integrated(
    'equipment-physical-modifiers',
    'physical damage can produce represented Claw/Talons equipment CriticalHitResolved payloads; runner and replay consume only those represented payloads plus destroyed-location replay to clear physical modifier state for destroyed, missing, or breached mounts',
    MEGAMEK_PHYSICAL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-partial-wing': integrated(
    'equipment-partial-wing',
    'runner and replay consume represented Partial Wing equipment CriticalHitResolved payloads only to decrement partialWingJumpBonus when the mounted equipment slot is destroyed',
    MEGAMEK_PARTIAL_WING_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-active-probe': integrated(
    'equipment-active-probe',
    'replay consumes represented active-probe equipment CriticalHitResolved payloads to mark matching same-unit active probes non-operational while leaving broader active-probe authoring and mode lifecycle outside this narrow critical-event row',
    MEKSTATION_ACTIVE_PROBE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-stealth-linked-ecm': integrated(
    'equipment-stealth-linked-ecm',
    'replay consumes represented ECM equipment CriticalHitResolved payloads to mark matching same-unit electronic-warfare ECM suites non-operational, removing the active own-ECM state the runner requires for BattleMech stealth armor',
    MEKSTATION_STEALTH_LINKED_ECM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-generic-destroyed-name-replay': integrated(
    'equipment-generic-destroyed-name-replay',
    'generic equipment CriticalHitResolved payloads resolve only to EquipmentDestroyed name replay and destroyedEquipment accounting without mutating equipment-specific component state',
    [
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-ammo-exhaustion-no-explosion': integrated(
    'equipment-ammo-exhaustion-no-explosion',
    'critical-induced ammo destruction consumes the exact hydrated ammoBinId; empty tracked bins and untracked locations emit ComponentDestroyed but no AmmoExplosion, leaving other loaded bins untouched',
    MEKSTATION_AMMO_EXHAUSTION_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-shields': integrated(
    'equipment-shields',
    'shield equipment criticals without explicit explosionDamage resolve as non-destroying EquipmentHit events so replay preserves shield function and skips generic destroyed-equipment accounting; Blue Shield Particle Field Damper defensive special rules remain outside this generic shield equipment-critical path',
    MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-scm': integrated(
    'equipment-scm',
    'SCM equipment criticals count damaged Super-Cooled Myomer critical slots and only disable the mounted equipment on the sixth SCM critical; heat-benefit and heat-capacity mechanics remain outside this narrow critical-slot lifecycle row',
    MEKSTATION_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-emergency-coolant': integrated(
    'equipment-emergency-coolant',
    'Emergency Coolant System equipment criticals hydrate represented 5-point secondary-effect-gated explosion metadata, mark typed damaged-coolant-system state, and cascade equipment explosion damage when secondary effects are enabled; coolant use, coolant failure, and heat-phase behavior remain outside this narrow critical-slot lifecycle row',
    MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-ac-playtest': integrated(
    'equipment-ac-playtest',
    'PLAYTEST_3 autocannon equipment criticals, including official RAC/HVAC naming, record first-hit autocannon state as non-destroying EquipmentHit events and leave the slot/mount available; a later critical against the same mounted AC/RAC/HVAC resolves through normal weapon destruction',
    MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-harjel': integrated(
    'equipment-harjel',
    'plain HarJel equipment criticals record breached-location state and HarJel II/III criticals schedule one represented same-location secondary critical; broader HarJel breach prevention, breach-check bonuses, and armor repair remain outside this narrow critical-effect row',
    MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-explosive-equipment': integrated(
    'equipment-explosive-equipment',
    EQUIPMENT_EXPLOSIVE_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_REPRESENTED_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-hot-loaded-weapons': integrated(
    'equipment-hot-loaded-weapons',
    EQUIPMENT_HOT_LOADED_WEAPON_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-blue-shield-explosion': integrated(
    'equipment-blue-shield-explosion',
    EQUIPMENT_BLUE_SHIELD_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-charged-capacitors': integrated(
    'equipment-charged-capacitors',
    EQUIPMENT_CHARGED_CAPACITOR_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-prototype-improved-jump-jet-explosion': integrated(
    'equipment-prototype-improved-jump-jet-explosion',
    EQUIPMENT_PROTOTYPE_IMPROVED_JUMP_JET_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-extended-fuel-tank-explosion': integrated(
    'equipment-extended-fuel-tank-explosion',
    EQUIPMENT_EXTENDED_FUEL_TANK_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-risc-laser-pulse-module-linked-laser': integrated(
    'equipment-risc-laser-pulse-module-linked-laser',
    EQUIPMENT_RISC_LASER_PULSE_MODULE_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-risc-laser-pulse-module-inoperable-linked-module': integrated(
    'equipment-risc-laser-pulse-module-inoperable-linked-module',
    EQUIPMENT_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-risc-laser-pulse-module-ambiguous-link': integrated(
    'equipment-risc-laser-pulse-module-ambiguous-link',
    EQUIPMENT_RISC_LPM_AMBIGUOUS_LINK_CRITICAL_EFFECT_EVIDENCE,
    [
      ...MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-artemis-fcs-critical-lifecycle': integrated(
    'equipment-artemis-fcs-critical-lifecycle',
    EQUIPMENT_ARTEMIS_FCS_CRITICAL_EFFECT_EVIDENCE,
    MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  'equipment-blue-shield-special-rules': outOfScope(
    'equipment-blue-shield-special-rules',
    EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_EVIDENCE,
    EQUIPMENT_BLUE_SHIELD_SPECIAL_RULES_GAP,
    [
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-hot-load-linked-ammo-inference': integrated(
    'equipment-hot-load-linked-ammo-inference',
    EQUIPMENT_HOT_LOAD_LINKED_AMMO_INFERENCE_EVIDENCE,
    [
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-hot-load-mode-state-inference': integrated(
    'equipment-hot-load-mode-state-inference',
    EQUIPMENT_HOT_LOAD_MODE_STATE_INFERENCE_EVIDENCE,
    [
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
    ],
  ),
  'equipment-fuel-incendiary-branches': outOfScope(
    'equipment-fuel-incendiary-branches',
    EQUIPMENT_FUEL_INCENDIARY_BRANCH_EVIDENCE,
    EQUIPMENT_FUEL_INCENDIARY_BRANCH_GAP,
    [
      ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
      ...MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS,
    ],
  ),
  'equipment-bomb-bays': outOfScope(
    'equipment-bomb-bays',
    EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_EVIDENCE,
    EQUIPMENT_BOMB_BAY_CRITICAL_EFFECT_GAP,
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  equipment: integrated('equipment', EQUIPMENT_CRITICAL_EFFECT_EVIDENCE, [
    ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ...MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ]),
  gyro: integrated(
    'gyro',
    'applyGyroHit mutates gyro-hit state and queues gyro PSRs',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  heat_sink: integrated(
    'heat_sink',
    'applyHeatSinkHit increments heatSinksDestroyed for heat dissipation loss',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  jump_jet: integrated(
    'jump_jet',
    'applyJumpJetHit increments jumpJetsDestroyed for jump capability loss',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  life_support: integrated(
    'life_support',
    'applyLifeSupportHit mutates life-support state and disables life support on the second hit',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  sensor: integrated(
    'sensor',
    'applySensorHit mutates sensor-hit state for to-hit penalties',
    MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  ),
  weapon: integrated(
    'weapon',
    'applyWeaponHit records destroyed weapons for explicit weapon critical slots',
    MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
