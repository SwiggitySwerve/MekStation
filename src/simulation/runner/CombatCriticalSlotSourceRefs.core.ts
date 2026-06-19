import {
  megamekSourceRef as criticalSlotMegamekRef,
  mekstationDeviationSourceRef as criticalSlotMekStationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { MEGAMEK_ARTEMIS_FCS_SOURCE_REFS } from './CombatSpecialWeaponSourceRefs';

export const MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS = [
  criticalSlotMegamekRef(
    'MegaMek CriticalSlot distinguishes system and equipment slots and tracks hit versus destroyed state for critical damage lifecycle.',
    'megamek/src/megamek/common/CriticalSlot.java#L90-L132',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS = [
  criticalSlotMegamekRef(
    'MegaMek MtfFile maps Fusion Engine, Life Support, Sensors, Cockpit, Gyro, and actuator text into Mek system critical slots.',
    'megamek/src/megamek/common/loaders/MtfFile.java#L792-L819',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS = [
  criticalSlotMegamekRef(
    'MegaMek MtfFile maps catalog equipment, weapons, split equipment, and combined ammo or heat sink critical-slot text into mounted equipment critical slots.',
    'megamek/src/megamek/common/loaders/MtfFile.java#L888-L1020',
  ),
  criticalSlotMegamekRef(
    'MegaMek Mek.addEquipment creates CriticalSlot entries for mounted equipment, including multi-slot, spreadable, split, and paired ammo or heat sink mounts.',
    'megamek/src/megamek/common/units/Mek.java#L2660-L2753',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek TWGameManager.applyCriticalHit marks system critical slots hit before routing BattleMech system effects through applyMekSystemCritical.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18917-L18943',
  ),
  criticalSlotMegamekRef(
    'MegaMek applyMekSystemCritical handles cockpit death, engine destruction, gyro effects, and actuator PSR side effects from hit system slots.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19090-L19249',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek TWGameManager.applyEquipmentCritical marks equipment critical slots and mounted equipment hit, with equipment-specific branches for shields, SCM, AC playtest, coolant, HarJel, stealth-linked ECM, explosions, ammo exhaustion, and bomb bays.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18980-L19068',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek applyEquipmentCritical keeps shield mounts functional after one critical hit instead of marking the mount hit.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18994-L18997',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMekStationRef(
    'MekStation shield equipment criticals emit EquipmentHit / destroyed=false so the critical slot resolves without destroyed-equipment replay.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L183-L187',
  ),
  criticalSlotMekStationRef(
    'MekStation criticalHitResolution tests prove shield equipment criticals preserve shield function while consuming the hit critical slot.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1476-L1519',
  ),
  criticalSlotMekStationRef(
    'MekStation criticalHitEvents tests prove non-destroying shield critical events do not emit ComponentDestroyed or mutate destroyedEquipment.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1459-L1513',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek applyEquipmentCritical counts damaged Super-Cooled Myomer critical slots and keeps SCM functional until all six SCM critical slots have been damaged.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18997-L19001',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMekStationRef(
    'MekStation critical-hit resolution counts Super-Cooled Myomer hits, emits EquipmentHit until the sixth SCM critical, then emits EquipmentDestroyed.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L318-L329',
  ),
  criticalSlotMekStationRef(
    'MekStation criticalHitResolution tests prove the first SCM critical consumes the slot without disabling the mount and the sixth SCM critical disables it.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1521-L1615',
  ),
  criticalSlotMekStationRef(
    'MekStation criticalHitEvents tests prove non-destroying SCM critical events count damaged Super-Cooled Myomer slots without disabling the equipment before the sixth SCM critical.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1515-L1562',
  ),
  criticalSlotMekStationRef(
    'MekStation criticalHitEvents tests prove the sixth SCM critical event disables the mounted Super-Cooled Myomer equipment and records destroyedEquipment.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1564-L1624',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek PLAYTEST_3 applyEquipmentCritical ignores the first autocannon critical hit and records autocannon-hit state.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19006-L19019',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMekStationRef(
    'MekStation critical-hit resolution records the first PLAYTEST_3 autocannon critical, including official RAC/HVAC naming, as EquipmentHit / destroyed=false and leaves the slot available for a later critical.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L141-L145',
  ),
  criticalSlotMekStationRef(
    'MekStation critical-hit resolution tests prove first-hit and follow-up PLAYTEST_3 autocannon critical behavior for AC, RAC, and HVAC names: first hit records autocannon-hit state without disabling the weapon, and a later critical destroys it normally.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L692-L789',
  ),
  criticalSlotMekStationRef(
    'MekStation critical-hit event replay records first-hit autocannon state from non-destroying PLAYTEST_3 AC/RAC/HVAC critical events and destroys the weapon after that state exists.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1677-L1770',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek applyEquipmentCritical marks emergency coolant systems damaged on Mek state when their equipment slot is hit.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19022-L19024',
  ),
  criticalSlotMegamekRef(
    'MegaMek RISC Emergency Coolant System construction marks the mount explosive and as Mek equipment.',
    'megamek/src/megamek/common/equipment/MiscType.java#L8889-L8897',
  ),
  criticalSlotMegamekRef(
    'MegaMek Mounted.getExplosionDamage returns 5 damage for F_EMERGENCY_COOLANT_SYSTEM misc equipment.',
    'megamek/src/megamek/common/equipment/Mounted.java#L1165-L1168',
  ),
  criticalSlotMegamekRef(
    'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    criticalSlotMekStationRef(
      'MekStation critical-slot hydration maps RISC Emergency Coolant System text to represented 5-point secondary-effect-gated explosion metadata.',
      'src/simulation/runner/UnitHydration.ts#L1686-L1692',
    ),
    criticalSlotMekStationRef(
      'MekStation critical-hit resolution marks Emergency Coolant System state damaged and emits AmmoExplosion when represented explosion metadata is present.',
      'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L332-L346',
    ),
    criticalSlotMekStationRef(
      'MekStation damage replay persists Emergency Coolant System damaged state from represented equipment critical events.',
      'src/utils/gameplay/gameState/criticalHitComponentDamage.ts#L142-L153',
    ),
    criticalSlotMekStationRef(
      'MekStation criticalHitResolution tests prove Emergency Coolant System criticals record damaged coolant-system state and emit 5-point explosion damage only when secondary effects are enabled.',
      'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1808-L1905',
    ),
    criticalSlotMekStationRef(
      'MekStation runner tests prove represented Emergency Coolant System criticals emit equipment explosion payloads, cascade damage, and persist damaged-coolant-system state.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L938-L1023',
    ),
    criticalSlotMekStationRef(
      'MekStation hydration tests prove RISC Emergency Coolant System critical text hydrates as represented 5-point secondary-effect-gated explosive equipment.',
      'src/simulation/runner/__tests__/atlasHydration.05.hydrates-risc-emergency-coolant-system-critical-text-a.fragment.ts#L4-L29',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek applyEquipmentCritical breaches HarJel locations and lets HarJel II/III trigger a secondary critical hit.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19026-L19041',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMekStationRef(
    'MekStation critical-hit resolution records plain HarJel criticals as breached-location state and marks HarJel II/III as one secondary same-location critical.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L208-L219',
  ),
  criticalSlotMekStationRef(
    'MekStation critical-hit resolution tests prove plain HarJel breach state and HarJel II/III secondary critical selection without claiming broader HarJel armor mechanics.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1756-L1875',
  ),
  criticalSlotMekStationRef(
    'MekStation critical-hit event replay preserves HarJel breached-location state and destroyed-equipment idempotency from represented critical events.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1459-L1518',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek applyEquipmentCritical routes explosive, hot-loaded, or charged-capacitor equipment through explodeEquipment.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L19057-L19063',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek WeaponMounted.getExplosionDamage returns linked ammo explosion damage when the weapon is hot-loaded.',
    'megamek/src/megamek/common/equipment/WeaponMounted.java#L66-L103',
  ),
  criticalSlotMegamekRef(
    'MegaMek Mounted.isHotLoaded derives hot-loaded state from explicit linked ammo state or HotLoad mode before explosion damage is requested.',
    'megamek/src/megamek/common/equipment/Mounted.java#L893-L930',
  ),
  criticalSlotMegamekRef(
    'MegaMek explodeEquipment applies mounted equipment explosion damage after the hot-loaded weapon gate passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek PPC Capacitor equipment is an explosive misc mount with charge modes.',
    'megamek/src/megamek/common/equipment/MiscType.java#L9043-L9077',
  ),
  criticalSlotMegamekRef(
    'MegaMek Mounted.hasChargedCapacitor detects linked charged PPC capacitor mounts before the critical branch explodes them.',
    'megamek/src/megamek/common/equipment/Mounted.java#L960-L979',
  ),
  criticalSlotMegamekRef(
    'MegaMek Mounted.getExplosionDamage adds 15 points for each charged PPC capacitor.',
    'megamek/src/megamek/common/equipment/Mounted.java#L1144-L1149',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    criticalSlotMegamekRef(
      'MegaMek Prototype Improved Jump Jet misc equipment construction marks the mount explosive and flags it as prototype improved jump-jet Mek equipment.',
      'megamek/src/megamek/common/equipment/MiscType.java#L1993-L2003',
    ),
    criticalSlotMegamekRef(
      'MegaMek Mounted.getExplosionDamage returns 10 damage for prototype improved jump-jet mounts.',
      'megamek/src/megamek/common/equipment/Mounted.java#L1157-L1160',
    ),
    criticalSlotMegamekRef(
      'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
      'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    criticalSlotMegamekRef(
      'MegaMek Extended Fuel Tank misc equipment is explosive BattleMech fuel equipment.',
      'megamek/src/megamek/common/equipment/MiscType.java#L8211-L8228',
    ),
    criticalSlotMegamekRef(
      'MegaMek Mounted.getExplosionDamage returns 20 damage for F_FUEL misc equipment.',
      'megamek/src/megamek/common/equipment/Mounted.java#L1144-L1152',
    ),
    criticalSlotMegamekRef(
      'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
      'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  criticalSlotMegamekRef(
    'MegaMek Blue Shield Particle Field Damper misc equipment construction marks the mount explosive and flags it as Blue Shield equipment.',
    'megamek/src/megamek/common/equipment/MiscType.java#L7853-L7874',
  ),
  criticalSlotMegamekRef(
    'MegaMek Mounted.getExplosionDamage returns 5 damage for F_BLUE_SHIELD misc equipment.',
    'megamek/src/megamek/common/equipment/Mounted.java#L1144-L1154',
  ),
  criticalSlotMegamekRef(
    'MegaMek EquipmentType.isExplosive returns false for Blue Shield Particle Field Damper equipment when the mounted mode is Off.',
    'megamek/src/megamek/common/equipment/EquipmentType.java#L454-L473',
  ),
  criticalSlotMegamekRef(
    'MegaMek explodeEquipment applies mounted equipment explosion damage after the explosive-equipment gate passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22681-L22704',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    criticalSlotMegamekRef(
      'MegaMek RISC Laser Pulse Module misc equipment construction marks the module explosive and flags it as linked laser-enhancement equipment.',
      'megamek/src/megamek/common/equipment/MiscType.java#L8915-L8944',
    ),
    criticalSlotMegamekRef(
      'MegaMek EquipmentType.isExplosive returns false for a RISC Laser Pulse Module unless its linked laser exists and is operable.',
      'megamek/src/megamek/common/equipment/EquipmentType.java#L431-L437',
    ),
    criticalSlotMegamekRef(
      'MegaMek explodeEquipment handles exploding RISC Laser Pulse Modules by hitting the first hittable linked-laser critical slot instead of applying normal critical slots.',
      'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22797-L22815',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];
