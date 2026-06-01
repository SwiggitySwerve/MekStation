import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

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

function mekstationDeviationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: 'MekStation working-tree',
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

export const MEGAMEK_MULTI_TRAC_SOURCE_REFS = [
  megamekRef(
    'MegaMek Compute.getSecondaryTargetMod suppresses the secondary-target modifier for Multi-Trac attackers when the current target is not in the rear arc.',
    'megamek/src/megamek/common/compute/Compute.java#L2500-L2519',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_MULTI_TRAC as multi_trac.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L75-L78',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
    'megamek/src/megamek/common/options/PilotOptions.java#L60-L87',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L230',
  ),
  mekstationDeviationRef(
    'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L204-L386',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CALLED_SHOT_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L108-L138',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processAttackerQuirks applies +1 Sensor Ghosts to the attacker to-hit number.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L71-L74',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines QUIRK_NEG_SENSOR_GHOSTS as sensor_ghosts.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L144-L144',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processAttackerQuirks applies Accurate -1, Inaccurate +1, and Stable Weapon -1 when the attacker ran.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L78-L90',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Accurate, Stable Weapon, and Inaccurate weapon quirk ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L106-L159',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS = [
  megamekRef(
    'MegaMek WeaponMounted.getCurrentHeat applies weapon cooling quirks after shot/weapon multiplication: Improved Cooling floors heat at max(1, heat - 1), Poor Cooling adds 1, and No Cooling adds 2.',
    'megamek/src/megamek/common/equipment/WeaponMounted.java#L128-L142',
  ),
  megamekRef(
    'MegaMek WeaponQuirks registers Improved Cooling, Poor Cooling, and No Cooling as weapon quirk options.',
    'megamek/src/megamek/common/options/WeaponQuirks.java#L76-L80',
  ),
  megamekRef(
    'MegaMek WeaponQuirks disallows weapon cooling quirks for club weapons, non-heat weapons, conventional infantry, tanks, battle armor, and ProtoMeks.',
    'megamek/src/megamek/common/options/WeaponQuirks.java#L126-L177',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines weapon cooling quirk ids as imp_cooling, poor_cooling, and no_cooling.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L106-L162',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity range modifier helpers apply Improved Targeting -1 and Poor Targeting +1 at short, medium, and long range.',
    'megamek/src/megamek/common/units/Entity.java#L10975-L11033',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines source-backed targeting quirk ids as imp_target_short/med/long and poor_target_short/med/long.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L70-L140',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_TARGETING_QUIRK_ALIAS_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation QUIRK_CATALOG keeps local improved_targeting_* and poor_targeting_* aliases for the same range-targeting quirk family.',
    'src/utils/gameplay/quirkModifiers/catalog.ts#L13-L18',
  ),
  mekstationDeviationRef(
    'MekStation calculateTargetingQuirkModifier applies local aliases as +/-1 at the matching range bracket.',
    'src/utils/gameplay/quirkModifiers/targetingQuirks.ts#L14-L58',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_DISTRACTING_QUIRK_SOURCE_REFS = [
  megamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_DISTRACTING as distracting.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L55-L58',
  ),
  megamekRef(
    'MegaMek Quirks registers Distracting as a positive unit quirk option without a combat to-hit resolver in this source snapshot.',
    'megamek/src/megamek/common/options/Quirks.java#L80-L86',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS = [
  megamekRef(
    'MegaMek WeaponHandler.isLowProfileGlancingBlow applies Low Profile as glancing-blow handling when the attack roll equals the target number or target number plus one.',
    'megamek/src/megamek/common/weapons/handlers/WeaponHandler.java#L2245-L2258',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_LOW_PROFILE as low_profile and notes the BMM Low Profile behavior changed.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L72-L77',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_DEFENSIVE_QUIRK_TO_HIT_DEVIATION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation calculateDistractingModifier currently applies Distracting as a local +1 target to-hit helper.',
    'src/utils/gameplay/quirkModifiers/targetingQuirks.ts#L63-L77',
  ),
  mekstationDeviationRef(
    'MekStation calculateLowProfileModifier currently applies Low Profile as a local +1 target to-hit helper when partial cover is absent.',
    'src/utils/gameplay/quirkModifiers/targetingQuirks.ts#L89-L103',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS = [
  megamekRef(
    'MegaMek HeatResolver sets PILOT_HOT_DOG to hotDogMod = 1 before resolving heat effects.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java#L84-L88',
  ),
  megamekRef(
    'MegaMek HeatResolver subtracts hotDogMod from startup and shutdown target numbers instead of shifting the shutdown heat threshold.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java#L500-L636',
  ),
  megamekRef(
    'MegaMek HeatResolver subtracts hotDogMod from heat ammo-explosion target numbers plus optional MaxTech heat-scale pilot-damage and critical-damage target numbers; default life-support heat damage remains threshold-based.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java#L690-L862',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_HOT_DOG as hot_dog.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.getHeatFiringModifier reduces positive heat firing modifiers by 1 for UNOFFICIAL_SOME_LIKE_IT_HOT.',
    'megamek/src/megamek/common/units/Entity.java#L4190-L4216',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines UNOFFICIAL_SOME_LIKE_IT_HOT as some_like_it_hot.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L220-L230',
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

export const MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS = [
  megamekRef(
    'MegaMek OptionsConstants defines optional TacOps Evade and Skilled Evasion option ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L452-L455',
  ),
  megamekRef(
    'MegaMek GameOptions registers optional TacOps Evade and Skilled Evasion movement rules.',
    'megamek/src/megamek/common/options/GameOptions.java#L231-L235',
  ),
  megamekRef(
    'MegaMek MoveStepType defines EVADE as a movement step.',
    'megamek/src/megamek/common/enums/MoveStepType.java#L74-L80',
  ),
  megamekRef(
    'MegaMek MoveStep maps EVADE to running movement and rejects selected illegal evasion states.',
    'megamek/src/megamek/common/moves/MoveStep.java#L1839-L1848',
  ),
  megamekRef(
    'MegaMek MovePathHandler sets the entity evading flag when resolving an EVADE movement step.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L2282-L2284',
  ),
  megamekRef(
    'MegaMek Mek.getRunHeat adds extra heat for evading BattleMechs without a working supercooling myomer system.',
    'megamek/src/megamek/common/units/Mek.java#L1033-L1037',
  ),
  megamekRef(
    'MegaMek Engine.getRunHeat returns 2 heat for standard BattleMech engines without working supercooling myomer.',
    'megamek/src/megamek/common/equipment/Engine.java#L693-L703',
  ),
  megamekRef(
    'MegaMek Entity.getEvasionBonus returns the target evasion modifier, including optional Skilled Evasion piloting-skill scaling.',
    'megamek/src/megamek/common/units/Entity.java#L12548-L12570',
  ),
  megamekRef(
    'MegaMek ComputeTargetToHitMods applies the target evasion bonus to ranged weapon attacks.',
    'megamek/src/megamek/common/actions/compute/ComputeTargetToHitMods.java#L101-L106',
  ),
  megamekRef(
    'MegaMek ComputeToHitIsImpossible prevents non-large-spacecraft evading attackers from firing ranged attacks.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java#L289-L292',
  ),
  megamekRef(
    'MegaMek PhysicalAttackAction rejects evading physical attackers.',
    'megamek/src/megamek/common/actions/PhysicalAttackAction.java#L102-L104',
  ),
  megamekRef(
    'MegaMek PhysicalAttackAction applies target evasion bonuses to physical to-hit.',
    'megamek/src/megamek/common/actions/PhysicalAttackAction.java#L285-L287',
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
