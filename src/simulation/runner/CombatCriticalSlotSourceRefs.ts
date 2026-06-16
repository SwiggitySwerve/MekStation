import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import { MEGAMEK_ARTEMIS_FCS_SOURCE_REFS } from './CombatSpecialWeaponSourceRefs';

const MEGAMEK_CRITICAL_SLOT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEKSTATION_CRITICAL_SLOT_SOURCE_VERSION = 'MekStation working-tree';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CRITICAL_SLOT_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_CRITICAL_SLOT_SOURCE_VERSION,
  };
}

function mekstationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: MEKSTATION_CRITICAL_SLOT_SOURCE_VERSION,
  };
}

export const MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS = [
  megamekRef(
    'MegaMek CriticalSlot distinguishes system and equipment slots and tracks hit versus destroyed state for critical damage lifecycle.',
    'megamek/src/megamek/common/CriticalSlot.java#L90-L132',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS = [
  megamekRef(
    'MegaMek MtfFile maps Fusion Engine, Life Support, Sensors, Cockpit, Gyro, and actuator text into Mek system critical slots.',
    'megamek/src/megamek/common/loaders/MtfFile.java#L792-L819',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS = [
  megamekRef(
    'MegaMek MtfFile maps catalog equipment, weapons, split equipment, and combined ammo or heat sink critical-slot text into mounted equipment critical slots.',
    'megamek/src/megamek/common/loaders/MtfFile.java#L888-L1020',
  ),
  megamekRef(
    'MegaMek Mek.addEquipment creates CriticalSlot entries for mounted equipment, including multi-slot, spreadable, split, and paired ammo or heat sink mounts.',
    'megamek/src/megamek/common/units/Mek.java#L2660-L2753',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS,
  megamekRef(
    'MegaMek TWGameManager.applyCriticalHit marks system critical slots hit before routing BattleMech system effects through applyMekSystemCritical.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18917-L18943',
  ),
  megamekRef(
    'MegaMek applyMekSystemCritical handles cockpit death, engine destruction, gyro effects, and actuator PSR side effects from hit system slots.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19090-L19249',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS,
  megamekRef(
    'MegaMek TWGameManager.applyEquipmentCritical marks equipment critical slots and mounted equipment hit, with equipment-specific branches for shields, SCM, AC playtest, coolant, HarJel, stealth-linked ECM, explosions, ammo exhaustion, and bomb bays.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18980-L19068',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek applyEquipmentCritical keeps shield mounts functional after one critical hit instead of marking the mount hit.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18994-L18997',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation shield equipment criticals emit EquipmentHit / destroyed=false so the critical slot resolves without destroyed-equipment replay.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L118-L191',
  ),
  mekstationRef(
    'MekStation criticalHitResolution tests prove shield equipment criticals preserve shield function while consuming the hit critical slot.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1476-L1519',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove non-destroying shield critical events do not emit ComponentDestroyed or mutate destroyedEquipment.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1459-L1513',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek applyEquipmentCritical counts damaged Super-Cooled Myomer critical slots and keeps SCM functional until all six SCM critical slots have been damaged.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18997-L19001',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation critical-hit resolution counts Super-Cooled Myomer hits, emits EquipmentHit until the sixth SCM critical, then emits EquipmentDestroyed.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L129-L151',
  ),
  mekstationRef(
    'MekStation criticalHitResolution tests prove the first SCM critical consumes the slot without disabling the mount and the sixth SCM critical disables it.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1521-L1615',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove non-destroying SCM critical events count damaged Super-Cooled Myomer slots without disabling the equipment before the sixth SCM critical.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1515-L1562',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove the sixth SCM critical event disables the mounted Super-Cooled Myomer equipment and records destroyedEquipment.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1564-L1624',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek PLAYTEST_3 applyEquipmentCritical ignores the first autocannon critical hit and records autocannon-hit state.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19006-L19019',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation critical-hit resolution records the first PLAYTEST_3 autocannon critical, including official RAC/HVAC naming, as EquipmentHit / destroyed=false and leaves the slot available for a later critical.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L98-L110',
  ),
  mekstationRef(
    'MekStation critical-hit resolution tests prove first-hit and follow-up PLAYTEST_3 autocannon critical behavior for AC, RAC, and HVAC names: first hit records autocannon-hit state without disabling the weapon, and a later critical destroys it normally.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L692-L789',
  ),
  mekstationRef(
    'MekStation critical-hit event replay records first-hit autocannon state from non-destroying PLAYTEST_3 AC/RAC/HVAC critical events and destroys the weapon after that state exists.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1677-L1770',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek applyEquipmentCritical marks emergency coolant systems damaged on Mek state when their equipment slot is hit.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19022-L19024',
  ),
  megamekRef(
    'MegaMek RISC Emergency Coolant System construction marks the mount explosive and as Mek equipment.',
    'megamek/src/megamek/common/equipment/MiscType.java#L8889-L8897',
  ),
  megamekRef(
    'MegaMek Mounted.getExplosionDamage returns 5 damage for F_EMERGENCY_COOLANT_SYSTEM misc equipment.',
    'megamek/src/megamek/common/equipment/Mounted.java#L1165-L1168',
  ),
  megamekRef(
    'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation critical-slot hydration maps RISC Emergency Coolant System text to represented 5-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/UnitHydration.ts#L1686-L1692',
    ),
    mekstationRef(
      'MekStation critical-hit resolution marks Emergency Coolant System state damaged and emits AmmoExplosion when represented explosion metadata is present.',
      'src/utils/gameplay/criticalHitResolution/effects.ts#L151-L166',
    ),
    mekstationRef(
      'MekStation damage replay persists Emergency Coolant System damaged state from represented equipment critical events.',
      'src/utils/gameplay/gameState/damageResolution.ts#L318-L326',
    ),
    mekstationRef(
      'MekStation criticalHitResolution tests prove Emergency Coolant System criticals record damaged coolant-system state and emit 5-point explosion damage only when secondary effects are enabled.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1808-L1905',
    ),
    mekstationRef(
      'MekStation runner tests prove represented Emergency Coolant System criticals emit equipment explosion payloads, cascade damage, and persist damaged-coolant-system state.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L938-L1023',
    ),
    mekstationRef(
      'MekStation hydration tests prove RISC Emergency Coolant System critical text hydrates as represented 5-point secondary-effect-gated explosive equipment.',
      'src/simulation/runner/__tests__/atlasHydration.test.ts#L1040-L1066',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek applyEquipmentCritical breaches HarJel locations and lets HarJel II/III trigger a secondary critical hit.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19026-L19041',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation critical-hit resolution records plain HarJel criticals as breached-location state and marks HarJel II/III as one secondary same-location critical.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L191-L219',
  ),
  mekstationRef(
    'MekStation critical-hit resolution tests prove plain HarJel breach state and HarJel II/III secondary critical selection without claiming broader HarJel armor mechanics.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1756-L1875',
  ),
  mekstationRef(
    'MekStation critical-hit event replay preserves HarJel breached-location state and destroyed-equipment idempotency from represented critical events.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1459-L1518',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek applyEquipmentCritical routes explosive, hot-loaded, or charged-capacitor equipment through explodeEquipment.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19057-L19063',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek WeaponMounted.getExplosionDamage returns linked ammo explosion damage when the weapon is hot-loaded.',
    'megamek/src/megamek/common/equipment/WeaponMounted.java#L66-L103',
  ),
  megamekRef(
    'MegaMek Mounted.isHotLoaded derives hot-loaded state from explicit linked ammo state or HotLoad mode before explosion damage is requested.',
    'megamek/src/megamek/common/equipment/Mounted.java#L893-L930',
  ),
  megamekRef(
    'MegaMek explodeEquipment applies mounted equipment explosion damage after the hot-loaded weapon gate passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek PPC Capacitor equipment is an explosive misc mount with charge modes.',
    'megamek/src/megamek/common/equipment/MiscType.java#L9043-L9077',
  ),
  megamekRef(
    'MegaMek Mounted.hasChargedCapacitor detects linked charged PPC capacitor mounts before the critical branch explodes them.',
    'megamek/src/megamek/common/equipment/Mounted.java#L960-L979',
  ),
  megamekRef(
    'MegaMek Mounted.getExplosionDamage adds 15 points for each charged PPC capacitor.',
    'megamek/src/megamek/common/equipment/Mounted.java#L1144-L1149',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    megamekRef(
      'MegaMek Prototype Improved Jump Jet misc equipment construction marks the mount explosive and flags it as prototype improved jump-jet Mek equipment.',
      'megamek/src/megamek/common/equipment/MiscType.java#L1993-L2003',
    ),
    megamekRef(
      'MegaMek Mounted.getExplosionDamage returns 10 damage for prototype improved jump-jet mounts.',
      'megamek/src/megamek/common/equipment/Mounted.java#L1157-L1160',
    ),
    megamekRef(
      'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
      'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    megamekRef(
      'MegaMek Extended Fuel Tank misc equipment is explosive BattleMech fuel equipment.',
      'megamek/src/megamek/common/equipment/MiscType.java#L8211-L8228',
    ),
    megamekRef(
      'MegaMek Mounted.getExplosionDamage returns 20 damage for F_FUEL misc equipment.',
      'megamek/src/megamek/common/equipment/Mounted.java#L1144-L1152',
    ),
    megamekRef(
      'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
      'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek Blue Shield Particle Field Damper misc equipment construction marks the mount explosive and flags it as Blue Shield equipment.',
    'megamek/src/megamek/common/equipment/MiscType.java#L7853-L7874',
  ),
  megamekRef(
    'MegaMek Mounted.getExplosionDamage returns 5 damage for F_BLUE_SHIELD misc equipment.',
    'megamek/src/megamek/common/equipment/Mounted.java#L1144-L1154',
  ),
  megamekRef(
    'MegaMek EquipmentType.isExplosive returns false for Blue Shield Particle Field Damper equipment when the mounted mode is Off.',
    'megamek/src/megamek/common/equipment/EquipmentType.java#L454-L473',
  ),
  megamekRef(
    'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    megamekRef(
      'MegaMek RISC Laser Pulse Module misc equipment construction marks the module explosive and flags it as linked laser-enhancement equipment.',
      'megamek/src/megamek/common/equipment/MiscType.java#L8915-L8944',
    ),
    megamekRef(
      'MegaMek EquipmentType.isExplosive returns false for a RISC Laser Pulse Module unless its linked laser exists and is operable.',
      'megamek/src/megamek/common/equipment/EquipmentType.java#L431-L437',
    ),
    megamekRef(
      'MegaMek explodeEquipment handles exploding RISC Laser Pulse Modules by hitting the first hittable linked-laser critical slot instead of applying normal critical slots.',
      'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22797-L22815',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation critical slots with represented equipment explosion damage resolve as equipment AmmoExplosion critical effects.',
      'src/utils/gameplay/criticalHitResolution/effects.ts#L37-L219',
    ),
    mekstationRef(
      'MekStation critical-slot selection treats represented equipment explosion damage as an Edge-eligible explosion slot.',
      'src/utils/gameplay/criticalHitResolution/selection.ts#L154-L158',
    ),
    mekstationRef(
      'MekStation runner critical explosion handling cascades represented equipment explosion damage through AmmoExplosion and DamageApplied events.',
      'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L47-L253',
    ),
    mekstationRef(
      'MekStation tests prove represented PPC Capacitor criticals emit explosion payloads and runner damage cascades without claiming broader linked-capacitor lifecycle parity.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L723-L797',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation critical-slot hydration maps Extended Fuel Tank text, including official tonnage-suffixed BattleMech critical text, before generic equipment handling and attaches represented 20-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/UnitHydration.ts#L1776-L1790',
    ),
    mekstationRef(
      'MekStation hydration tests prove exact Extended Fuel Tank text and official Carbine/Vampyr tonnage-suffixed Extended Fuel Tank critical text hydrate as equipment with represented 20-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/__tests__/atlasHydration.test.ts#L1017-L1072',
    ),
    mekstationRef(
      'MekStation critical-hit resolution tests prove represented Extended Fuel Tank criticals explode only when secondary effects are enabled.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2225-L2286',
    ),
    mekstationRef(
      'MekStation runner tests prove represented Extended Fuel Tank criticals emit 20-point equipment explosion payloads and cascade damage without claiming generic fuel lifecycle parity.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1027-L1115',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS = [
  ...MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation contract tests prove generic Fuel Tank maps to unofficial bafueltank, Extended Fuel Tank remains a distinct represented catalog id, and active BattleMech critical-slot data adds only LAM Fuel Tank outside represented Extended Fuel Tank names.',
    'src/simulation/runner/__tests__/combatCriticalSlotHydrationCatalog.contract.test.ts#L546-L598',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation critical-slot hydration maps official Blue Shield Particle Field Damper critical text before generic shield/equipment handling, attaches represented 5-point secondary-effect-gated explosion metadata for active/default mounts, and omits explosion metadata when source mode is Off.',
    'src/simulation/runner/UnitHydration.ts#L1832-L1879',
  ),
  mekstationRef(
    'MekStation hydration tests prove official Spatha Blue Shield Particle Field Damper critical text hydrates as represented explosive equipment and synthetic source modes keep active/default mounts explosive while Off mounts hydrate as non-explosive shield equipment.',
    'src/simulation/runner/__tests__/atlasHydration.test.ts#L1079-L1164',
  ),
  mekstationRef(
    'MekStation critical-hit resolution lets explicit Blue Shield explosionDamage payloads resolve as equipment AmmoExplosion critical effects instead of the generic shield-preservation effect.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L118-L191',
  ),
  mekstationRef(
    'MekStation critical-hit resolution tests prove represented Blue Shield criticals with explicit 5-point explosion metadata explode without claiming broader Blue Shield special rules parity.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1574-L1627',
  ),
  mekstationRef(
    'MekStation runner tests prove represented Blue Shield criticals emit 5-point equipment explosion payloads and cascade damage without ammo-bin fallback fields.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L797-L875',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation full-unit equipment hydration preserves explicit linkedEquipment metadata for represented linked equipment.',
      'src/simulation/runner/UnitHydration.ts#L147-L151',
    ),
    mekstationRef(
      'MekStation full-unit equipment hydration carries explicit linkedEquipment metadata into critical-slot classification.',
      'src/simulation/runner/UnitHydration.ts#L1160-L1184',
    ),
    mekstationRef(
      'MekStation critical-slot hydration maps RISC Laser Pulse Module linked-laser state from explicit same-location linkedEquipment metadata or exactly one same-location working laser weapon.',
      'src/simulation/runner/UnitHydration.ts#L1654-L1778',
    ),
    mekstationRef(
      'MekStation hydration tests prove RISC Laser Pulse Module linked-laser metadata hydrates from explicit linked equipment or an unambiguous same-location laser, and remains generic when the same-location laser fallback is ambiguous or absent.',
      'src/simulation/runner/__tests__/atlasHydration.test.ts#L1535-L1754',
    ),
    mekstationRef(
      'MekStation critical-hit resolution tests prove represented RISC Laser Pulse Module criticals destroy the linked laser without synthesizing explosion damage.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2121-L2191',
    ),
    mekstationRef(
      'MekStation session critical-event emission preserves represented linked critical weapon ids and names for RISC Laser Pulse Module replay.',
      'src/utils/gameplay/__tests__/damagePipeline.test.ts#L136-L176',
    ),
    mekstationRef(
      'MekStation runner tests prove represented RISC Laser Pulse Module criticals mark the linked laser destroyed without emitting AmmoExplosion damage, and ambiguous unlinked RISC module criticals stay generic without disabling a random laser.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1418-L1547',
    ),
    mekstationRef(
      'MekStation replay tests prove represented RISC Laser Pulse Module linked-laser critical events do not record generic RISC module destruction.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1913-L1952',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation critical-hit resolution destroys only the RISC Laser Pulse Module when explicit linked-laser state points at an already destroyed weapon.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2212-L2260',
    ),
    mekstationRef(
      'MekStation replay tests prove represented inoperable-linked RISC Laser Pulse Module critical events record generic module destruction without duplicating linked weapon destruction.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2005-L2065',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  ...MEGAMEK_ARTEMIS_FCS_SOURCE_REFS,
  mekstationRef(
    'MekStation critical-hit resolution preserves linked launcher metadata on represented Artemis FCS equipment critical events.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L280-L462',
  ),
  mekstationRef(
    'MekStation replay records destroyed Artemis FCS kind, location, and explicit linked launcher id when CriticalHitResolved carries it.',
    'src/utils/gameplay/gameState/damageResolution.ts#L442-L678',
  ),
  mekstationRef(
    'MekStation runner snapshots remove Artemis IV, prototype Artemis IV, or Artemis V guidance from explicitly linked or same-location launchers after represented FCS critical destruction.',
    'src/simulation/runner/SimulationRunnerSupport.ts#L156-L263',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove same-location destroyed Artemis FCS replay records destroyedArtemisFcs without treating Artemis-capable ammo as FCS.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2897-L2948',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation critical slots with explicit hotLoaded state and positive explosionDamage resolve as weapon or equipment AmmoExplosion critical effects.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L37-L219',
  ),
  mekstationRef(
    'MekStation unit hydration maps source equipment HotLoad mode plus explicit positive explosionDamage into hotLoaded weapon critical slots, and refuses mode-only or duplicate-mount inference.',
    'src/simulation/runner/__tests__/atlasHydration.test.ts#L1265-L1369',
  ),
  mekstationRef(
    'MekStation critical-hit resolution tests prove explicit hotLoaded weapon criticals explode and hot-loaded names without explosionDamage do not synthesize damage.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1948-L2050',
  ),
  mekstationRef(
    'MekStation runner critical explosion handling cascades explicit hot-loaded weapon explosion damage through AmmoExplosion and DamageApplied events.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L782-L865',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation critical-slot hydration maps Prototype Improved Jump Jet text before the generic jump-jet classifier and attaches the represented 10-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/UnitHydration.ts#L1609-L1613',
    ),
    mekstationRef(
      'MekStation hydration tests prove ISPrototypeImprovedJumpJet critical text hydrates as equipment with represented 10-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/__tests__/atlasHydration.test.ts#L859-L881',
    ),
    mekstationRef(
      'MekStation critical slots with represented equipment explosion damage resolve as equipment AmmoExplosion critical effects.',
      'src/utils/gameplay/criticalHitResolution/effects.ts#L374-L393',
    ),
    mekstationRef(
      'MekStation runner critical explosion handling cascades represented equipment explosion damage through AmmoExplosion and DamageApplied events.',
      'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L47-L253',
    ),
    mekstationRef(
      'MekStation critical-hit resolution tests prove represented Prototype Improved Jump Jet criticals explode only when secondary effects are enabled.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L2033-L2090',
    ),
    mekstationRef(
      'MekStation runner tests prove represented Prototype Improved Jump Jet criticals emit 10-point equipment explosion payloads and cascade damage without claiming generic explosive-equipment parity.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L803-L876',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_REPRESENTED_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ...MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    ...MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation critical-slot hydration carries exact single same-location source equipment entries with explicit positive explosionDamage into generic equipment critical slots, while name-only and duplicate metadata stay non-explosive.',
      'src/simulation/runner/UnitHydration.ts#L1843-L2049',
    ),
    mekstationRef(
      'MekStation hydration tests prove generic equipment explosion damage comes only from explicit source metadata and is not synthesized from names or duplicate source entries.',
      'src/simulation/runner/__tests__/atlasHydration.test.ts#L1399-L1466',
    ),
    mekstationRef(
      'MekStation critical-hit resolution consumes only represented equipment explosionDamage payloads instead of deriving generic explosive equipment damage from names.',
      'src/utils/gameplay/criticalHitResolution/effects.ts#L374-L393',
    ),
    mekstationRef(
      'MekStation runner critical explosion handling cascades represented equipment explosion damage through AmmoExplosion and DamageApplied events.',
      'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L47-L253',
    ),
    mekstationRef(
      'MekStation runner tests prove represented equipment explosion payloads emit equipment AmmoExplosion events without ammo-bin fallback fields.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L723-L876',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  mekstationRef(
    'MekStation applyCriticalHitEffect falls through otherwise-unclassified equipment slots to EquipmentDestroyed without mutating componentDamage.',
    'src/utils/gameplay/criticalHitResolution/effects.ts#L118-L156',
  ),
  mekstationRef(
    'MekStation criticalHitResolution tests prove CASE plus unresolved explosive equipment and hot-loaded weapon critical names remain generic EquipmentDestroyed effects and leave component damage unchanged.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1452-L1611',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove generic equipment critical event replay records destroyedEquipment without mutating represented physical modifier state.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1394-L1457',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ACTIVE_PROBE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation full-unit hydration maps Beagle, Bloodhound, Clan, light, Watchdog CEWS, and Nova CEWS active-probe equipment into represented electronic-warfare probe state.',
    'src/simulation/runner/UnitHydration.ts#L1240-L1456',
  ),
  mekstationRef(
    'MekStation damage replay consumes represented active-probe equipment CriticalHitResolved payloads to mark matching same-unit active probes non-operational.',
    'src/utils/gameplay/gameState/damageResolution.ts#L421-L581',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove represented active-probe equipment critical events disable matching active-probe state and record destroyed equipment.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2616-L2694',
  ),
  mekstationRef(
    'MekStation GameCreated and hydration tests prove active-probe equipment is hydrated into runner electronic-warfare state before critical replay consumes it.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L226-L263',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_STEALTH_LINKED_ECM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    mekstationRef(
      'MekStation damage replay consumes represented ECM equipment CriticalHitResolved payloads to mark matching same-unit ECM suites non-operational.',
      'src/utils/gameplay/gameState/damageResolution.ts#L549-L613',
    ),
    mekstationRef(
      'MekStation runner attacker stealth checks require BattleMech stealth armor plus an active own ECM suite before passing attackerStealthActive into cluster resolution.',
      'src/simulation/runner/phases/weaponAttack.ts#L141-L166',
    ),
    mekstationRef(
      'MekStation criticalHitEvents tests prove represented ECM equipment critical replay removes the active own-ECM state required by BattleMech stealth armor.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2818-L2907',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_AMMO_EXHAUSTION_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  mekstationRef(
    'MekStation applyCritAmmoExplosions skips AmmoExplosion when a critical resolves against an empty tracked ammo bin or no bin is tracked at that location.',
    'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L89-L92',
  ),
  mekstationRef(
    'MekStation criticalHitEvents tests prove critical hits target exact ammo bins, empty bins emit no AmmoExplosion, and loaded same-location bins remain untouched.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L614-L755',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek Mek.getJumpMP applies a Partial Wing jump bonus only when the Mek already has positive jump MP, and getPartialWingJumpBonus subtracts bad torso critical slots.',
    'megamek/src/megamek/common/units/Mek.java#L1081-L1231',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PHYSICAL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount.',
    'megamek/src/megamek/common/units/Mek.java#L7328-L7341',
  ),
  megamekRef(
    'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
    'megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
  ),
  megamekRef(
    'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing.',
    'megamek/src/megamek/common/units/Entity.java#L11864-L11939',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PARTIAL_WING_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  MEGAMEK_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS;

export const MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek TWGameManager.explodeAmmoFromHeat chooses a valid explosive ammo bin, marks its critical slot and mount hit, and routes the selected bin through equipment explosion damage.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22858-L22917',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
