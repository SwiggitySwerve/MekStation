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

export const MEGAMEK_PSR_SPA_SOURCE_REFS = [
  ...MEGAMEK_MANEUVERING_ACE_SKID_SOURCE_REFS,
  ...MEGAMEK_ANIMAL_MIMICRY_QUAD_PSR_SOURCE_REFS,
  ...MEGAMEK_FROGMAN_WATER_PSR_SOURCE_REFS,
  ...MEGAMEK_MOUNTAINEER_RUBBLE_PSR_SOURCE_REFS,
  ...MEGAMEK_SWAMP_BEAST_BOG_DOWN_PSR_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
