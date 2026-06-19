import {
  MEGAMEK_CRITICAL_SLOT_STATE_SOURCE_REFS,
  MEGAMEK_MTF_SYSTEM_CRITICAL_SOURCE_REFS,
  MEGAMEK_MTF_EQUIPMENT_CRITICAL_SOURCE_REFS,
  MEGAMEK_SYSTEM_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_SCM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_AC_PLAYTEST_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_EMERGENCY_COOLANT_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_HARJEL_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEGAMEK_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs.core';
import {
  MEKSTATION_CHARGED_CAPACITOR_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_EXTENDED_FUEL_TANK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_FUEL_INCENDIARY_SCOPE_SPLIT_SOURCE_REFS,
  MEKSTATION_BLUE_SHIELD_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_RISC_LASER_PULSE_MODULE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_RISC_LASER_PULSE_MODULE_INOPERABLE_LINKED_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_ARTEMIS_FCS_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_HOT_LOADED_WEAPON_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_PROTOTYPE_IMPROVED_JUMP_JET_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  MEKSTATION_REPRESENTED_EXPLOSIVE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
} from './CombatCriticalSlotSourceRefs.representedExplosives';
import {
  megamekSourceRef as megamekRef,
  mekstationDeviationSourceRef as genericEquipmentMekStationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { MEGAMEK_ARTEMIS_FCS_SOURCE_REFS } from './CombatSpecialWeaponSourceRefs';

export const MEKSTATION_GENERIC_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  genericEquipmentMekStationRef(
    'MekStation applyCriticalHitEffect falls through otherwise-unclassified equipment slots to EquipmentDestroyed without mutating componentDamage.',
    'src/utils/gameplay/criticalHitResolution/slotEffectResolution.ts#L237-L240',
  ),
  genericEquipmentMekStationRef(
    'MekStation criticalHitResolution tests prove CASE plus unresolved explosive equipment and hot-loaded weapon critical names remain generic EquipmentDestroyed effects and leave component damage unchanged.',
    'src/utils/gameplay/__tests__/criticalHitResolution.test.ts#L1452-L1611',
  ),
  genericEquipmentMekStationRef(
    'MekStation criticalHitEvents tests prove generic equipment critical event replay records destroyedEquipment without mutating represented physical modifier state.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L1394-L1457',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_ACTIVE_PROBE_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  genericEquipmentMekStationRef(
    'MekStation full-unit hydration maps Beagle, Bloodhound, Clan, light, Watchdog CEWS, and Nova CEWS active-probe equipment into represented electronic-warfare probe state.',
    'src/simulation/runner/UnitHydration.ts#L1461-L1551',
  ),
  genericEquipmentMekStationRef(
    'MekStation damage replay consumes represented active-probe equipment CriticalHitResolved payloads to mark matching same-unit active probes non-operational.',
    'src/utils/gameplay/gameState/criticalHitEquipmentState.ts#L32-L70',
  ),
  genericEquipmentMekStationRef(
    'MekStation criticalHitEvents tests prove represented active-probe equipment critical events disable matching active-probe state and record destroyed equipment.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2616-L2694',
  ),
  genericEquipmentMekStationRef(
    'MekStation GameCreated and hydration tests prove active-probe equipment is hydrated into runner electronic-warfare state before critical replay consumes it.',
    'src/simulation/runner/__tests__/SimulationRunner.gameCreated.test.ts#L226-L263',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_STEALTH_LINKED_ECM_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS =
  [
    ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
    genericEquipmentMekStationRef(
      'MekStation damage replay consumes represented ECM equipment CriticalHitResolved payloads to mark matching same-unit ECM suites non-operational.',
      'src/utils/gameplay/gameState/criticalHitEquipmentState.ts#L32-L70',
    ),
    genericEquipmentMekStationRef(
      'MekStation runner attacker stealth checks require BattleMech stealth armor plus an active own ECM suite before passing attackerStealthActive into cluster resolution.',
      'src/simulation/runner/phases/weaponAttack.ts#L141-L166',
    ),
    genericEquipmentMekStationRef(
      'MekStation criticalHitEvents tests prove represented ECM equipment critical replay removes the active own-ECM state required by BattleMech stealth armor.',
      'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2818-L2907',
    ),
  ] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_AMMO_EXHAUSTION_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  genericEquipmentMekStationRef(
    'MekStation applyCritAmmoExplosions skips AmmoExplosion when a critical resolves against an empty tracked ammo bin or no bin is tracked at that location.',
    'src/simulation/runner/phases/weaponAttackAmmoExplosions.ts#L89-L93',
  ),
  genericEquipmentMekStationRef(
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
