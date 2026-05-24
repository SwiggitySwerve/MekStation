import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

const MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_PILOT_MODIFIER_SOURCE_VERSION,
  };
}

export const MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS = [
  megamekRef(
    'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
    'megamek/src/megamek/common/compute/Compute.java#L2494-L2615',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L192-L200',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CALLED_SHOT_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L108-L138',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L282-L293',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast as tm_forest_ranger and tm_swamp_beast.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_SKID_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
    'megamek/src/megamek/common/units/Entity.java#L8638-L8660',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L173-L180',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ANIMAL_MIMICRY_QUAD_PSR_SOURCE_REFS = [
  megamekRef(
    'MegaMek QuadMek.addEntityBonuses applies -1 Animal Mimicry to quad Mek piloting rolls.',
    'megamek/src/megamek/common/units/QuadMek.java#L460-L469',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_ANIMAL_MIMIC as animal_mimic.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L171-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_FROGMAN_WATER_PSR_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water.',
    'megamek/src/megamek/common/units/Entity.java#L8324-L8352',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_TM_FROGMAN as tm_frogman.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MOUNTAINEER_RUBBLE_PSR_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
    'megamek/src/megamek/common/units/Entity.java#L8240-L8256',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_TM_MOUNTAINEER as tm_mountaineer.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_SWAMP_BEAST_BOG_DOWN_PSR_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
    'megamek/src/megamek/common/units/Entity.java#L8263-L8288',
  ),
  megamekRef(
    'MegaMek Terrain.getBogDownModifier makes swamp a BattleMech bog-down terrain while mud does not bog down biped or quad movement modes.',
    'megamek/src/megamek/common/units/Terrain.java#L616-L637',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_TM_SWAMP_BEAST as tm_swamp_beast.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CROSS_COUNTRY_SOURCE_REFS = [
  megamekRef(
    'MegaMek Terrain.movementCost applies Cross-Country only inside ground combat-vehicle terrain movement-cost gates.',
    'megamek/src/megamek/common/units/Terrain.java#L404-L584',
  ),
  megamekRef(
    'MegaMek Tank.isLocationProhibited applies Cross-Country to tracked, wheeled, and hover combat-vehicle passability gates.',
    'megamek/src/megamek/common/units/Tank.java#L749-L822',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_CROSS_COUNTRY as cross_country.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HEAVY_LIFTER_SOURCE_REFS = [
  megamekRef(
    'MegaMek MekWithArms.maxGroundObjectTonnage multiplies BattleMech ground-object lift capacity by 1.5 for Heavy Lifter.',
    'megamek/src/megamek/common/units/MekWithArms.java#L97-L115',
  ),
  megamekRef(
    'MegaMek ProtoMek.maxGroundObjectTonnage multiplies ProtoMek ground-object lift capacity by 1.5 for Heavy Lifter.',
    'megamek/src/megamek/common/units/ProtoMek.java#L553-L567',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_HVY_LIFTER as hvy_lifter.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SHAKY_STICK_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L259-L271',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L176-L188',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SANDBLASTER_SOURCE_REFS = [
  megamekRef(
    'MegaMek WeaponHandler.getClusterModifiers applies Sandblaster as +4 short, +3 medium, or +2 long cluster-table modifiers for the designated weapon, taking precedence over Cluster Hitter.',
    'megamek/src/megamek/common/weapons/handlers/WeaponHandler.java#L2126-L2180',
  ),
  megamekRef(
    'MegaMek PilotSPAHelper limits Sandblaster designations to UAC, LB-X AC, TacOps rapid-fire AC, and damage-by-cluster-table weapons.',
    'megamek/src/megamek/common/units/PilotSPAHelper.java#L110-L162',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines GUNNERY_SANDBLASTER as sandblaster.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L197-L203',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.getQuirkIniBonus returns +2 for Battle Computer or +1 for Command Mech, and does not stack them.',
    'megamek/src/megamek/common/units/Entity.java#L12859-L12871',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_BATTLE_COMP as battle_computer and QUIRK_POS_COMMAND_MEK as command_mech.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L48-L52',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS = [
  megamekRef(
    'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
    'megamek/src/megamek/common/Team.java#L234-L247',
  ),
  megamekRef(
    'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
    'megamek/src/megamek/common/Player.java#L637-L650',
  ),
  megamekRef(
    'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
    'megamek/src/megamek/common/Player.java#L688-L706',
  ),
  megamekRef(
    'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
    'megamek/src/megamek/common/units/Entity.java#L12840-L12855',
  ),
  megamekRef(
    'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
    'megamek/src/megamek/common/units/Mek.java#L4919-L4927',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS = [
  megamekRef(
    'MegaMek Game.hasTacticalGenius checks for a conscious active unit with MISC_TACTICAL_GENIUS before initiative reroll handling.',
    'megamek/src/megamek/common/game/Game.java#L617-L626',
  ),
  megamekRef(
    'MegaMek InitiativeRoll.replaceRoll replaces the previous initiative roll and records that Tactical Genius was used.',
    'megamek/src/megamek/common/game/InitiativeRoll.java#L95-L104',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines MISC_TACTICAL_GENIUS as tactical_genius.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L209-L214',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PSR_SPA_SOURCE_REFS = [
  ...MEGAMEK_MANEUVERING_ACE_SKID_SOURCE_REFS,
  ...MEGAMEK_ANIMAL_MIMICRY_QUAD_PSR_SOURCE_REFS,
  ...MEGAMEK_FROGMAN_WATER_PSR_SOURCE_REFS,
  ...MEGAMEK_MOUNTAINEER_RUBBLE_PSR_SOURCE_REFS,
  ...MEGAMEK_SWAMP_BEAST_BOG_DOWN_PSR_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
