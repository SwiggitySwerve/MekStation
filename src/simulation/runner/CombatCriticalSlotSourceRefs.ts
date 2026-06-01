import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_CRITICAL_SLOT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

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

export const MEGAMEK_AMMO_CRITICAL_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_EQUIPMENT_CRITICAL_EFFECT_SOURCE_REFS,
  megamekRef(
    'MegaMek TWGameManager.explodeAmmoFromHeat chooses a valid explosive ammo bin, marks its critical slot and mount hit, and routes the selected bin through equipment explosion damage.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L22858-L22917',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
