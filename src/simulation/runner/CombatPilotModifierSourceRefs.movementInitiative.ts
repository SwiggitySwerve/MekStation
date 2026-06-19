import {
  megamekSourceRef as pilotMovementMegamekRef,
  mekstationDeviationSourceRef as mekstationDeviationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

const MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION =
  '55584ec7529b944fca3216965697e9fa1115dced';

function currentMegamekImplantRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_CURRENT_IMPLANT_SOURCE_VERSION,
  };
}

export const MEGAMEK_HOT_DOG_HEAT_ROLL_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek HeatResolver sets PILOT_HOT_DOG to hotDogMod = 1 before resolving heat effects.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java#L84-L88',
  ),
  pilotMovementMegamekRef(
    'MegaMek HeatResolver subtracts hotDogMod from startup and shutdown target numbers instead of shifting the shutdown heat threshold.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java#L500-L636',
  ),
  pilotMovementMegamekRef(
    'MegaMek HeatResolver subtracts hotDogMod from heat ammo-explosion target numbers plus optional MaxTech heat-scale pilot-damage and critical-damage target numbers; default life-support heat damage remains threshold-based.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java#L690-L862',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_HOT_DOG as hot_dog.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SOME_LIKE_IT_HOT_HEAT_TO_HIT_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Entity.getHeatFiringModifier reduces positive heat firing modifiers by 1 for UNOFFICIAL_SOME_LIKE_IT_HOT.',
    'megamek/src/megamek/common/units/Entity.java#L4190-L4216',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines UNOFFICIAL_SOME_LIKE_IT_HOT as some_like_it_hot.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L220-L230',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TERRAIN_MASTER_DEFENSIVE_TO_HIT_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L282-L293',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast as tm_forest_ranger and tm_swamp_beast.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MANEUVERING_ACE_SKID_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
    'megamek/src/megamek/common/units/Entity.java#L8638-L8660',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L173-L180',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ANIMAL_MIMICRY_QUAD_PSR_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek QuadMek.addEntityBonuses applies -1 Animal Mimicry to quad Mek piloting rolls.',
    'megamek/src/megamek/common/units/QuadMek.java#L460-L469',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_ANIMAL_MIMIC as animal_mimic.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L171-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_FROGMAN_WATER_PSR_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water.',
    'megamek/src/megamek/common/units/Entity.java#L8324-L8352',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_TM_FROGMAN as tm_frogman.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MOUNTAINEER_RUBBLE_PSR_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
    'megamek/src/megamek/common/units/Entity.java#L8240-L8256',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_TM_MOUNTAINEER as tm_mountaineer.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_SWAMP_BEAST_BOG_DOWN_PSR_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
    'megamek/src/megamek/common/units/Entity.java#L8263-L8288',
  ),
  pilotMovementMegamekRef(
    'MegaMek Terrain.getBogDownModifier makes swamp a BattleMech bog-down terrain while mud does not bog down biped or quad movement modes.',
    'megamek/src/megamek/common/units/Terrain.java#L616-L637',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_TM_SWAMP_BEAST as tm_swamp_beast.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CROSS_COUNTRY_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Terrain.movementCost applies Cross-Country only inside ground combat-vehicle terrain movement-cost gates.',
    'megamek/src/megamek/common/units/Terrain.java#L404-L584',
  ),
  pilotMovementMegamekRef(
    'MegaMek Tank.isLocationProhibited applies Cross-Country to tracked, wheeled, and hover combat-vehicle passability gates.',
    'megamek/src/megamek/common/units/Tank.java#L749-L822',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_CROSS_COUNTRY as cross_country.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines optional TacOps Evade and Skilled Evasion option ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L452-L455',
  ),
  pilotMovementMegamekRef(
    'MegaMek GameOptions registers optional TacOps Evade and Skilled Evasion movement rules.',
    'megamek/src/megamek/common/options/GameOptions.java#L231-L235',
  ),
  pilotMovementMegamekRef(
    'MegaMek MoveStepType defines EVADE as a movement step.',
    'megamek/src/megamek/common/enums/MoveStepType.java#L74-L80',
  ),
  pilotMovementMegamekRef(
    'MegaMek MoveStep maps EVADE to running movement and rejects selected illegal evasion states.',
    'megamek/src/megamek/common/moves/MoveStep.java#L1839-L1848',
  ),
  pilotMovementMegamekRef(
    'MegaMek MovePathHandler sets the entity evading flag when resolving an EVADE movement step.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L2282-L2284',
  ),
  pilotMovementMegamekRef(
    'MegaMek Mek.getRunHeat adds extra heat for evading BattleMechs without a working supercooling myomer system.',
    'megamek/src/megamek/common/units/Mek.java#L1033-L1037',
  ),
  pilotMovementMegamekRef(
    'MegaMek Engine.getRunHeat returns 2 heat for standard BattleMech engines without working supercooling myomer.',
    'megamek/src/megamek/common/equipment/Engine.java#L693-L703',
  ),
  pilotMovementMegamekRef(
    'MegaMek Entity.getEvasionBonus returns the target evasion modifier, including optional Skilled Evasion piloting-skill scaling.',
    'megamek/src/megamek/common/units/Entity.java#L12548-L12570',
  ),
  pilotMovementMegamekRef(
    'MegaMek ComputeTargetToHitMods applies the target evasion bonus to ranged weapon attacks.',
    'megamek/src/megamek/common/actions/compute/ComputeTargetToHitMods.java#L101-L106',
  ),
  pilotMovementMegamekRef(
    'MegaMek ComputeToHitIsImpossible prevents non-large-spacecraft evading attackers from firing ranged attacks.',
    'megamek/src/megamek/common/actions/compute/ComputeToHitIsImpossible.java#L289-L292',
  ),
  pilotMovementMegamekRef(
    'MegaMek PhysicalAttackAction rejects evading physical attackers.',
    'megamek/src/megamek/common/actions/PhysicalAttackAction.java#L102-L104',
  ),
  pilotMovementMegamekRef(
    'MegaMek PhysicalAttackAction applies target evasion bonuses to physical to-hit.',
    'megamek/src/megamek/common/actions/PhysicalAttackAction.java#L285-L287',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SHAKY_STICK_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L259-L271',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L176-L188',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SANDBLASTER_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek WeaponHandler.getClusterModifiers applies Sandblaster as +4 short, +3 medium, or +2 long cluster-table modifiers for the designated weapon, taking precedence over Cluster Hitter.',
    'megamek/src/megamek/common/weapons/handlers/WeaponHandler.java#L2126-L2180',
  ),
  pilotMovementMegamekRef(
    'MegaMek PilotSPAHelper limits Sandblaster designations to UAC, LB-X AC, TacOps rapid-fire AC, and damage-by-cluster-table weapons.',
    'megamek/src/megamek/common/units/PilotSPAHelper.java#L110-L162',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines GUNNERY_SANDBLASTER as sandblaster.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L197-L203',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INITIATIVE_QUIRK_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Entity.getQuirkIniBonus returns +2 for Battle Computer or +1 for Command Mech, and does not stack them.',
    'megamek/src/megamek/common/units/Entity.java#L12859-L12871',
  ),
  pilotMovementMegamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_BATTLE_COMP as battle_computer and QUIRK_POS_COMMAND_MEK as command_mech.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L48-L52',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INITIATIVE_EQUIPMENT_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
    'megamek/src/megamek/common/Team.java#L234-L247',
  ),
  pilotMovementMegamekRef(
    'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
    'megamek/src/megamek/common/Player.java#L637-L650',
  ),
  pilotMovementMegamekRef(
    'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
    'megamek/src/megamek/common/Player.java#L688-L706',
  ),
  pilotMovementMegamekRef(
    'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
    'megamek/src/megamek/common/units/Entity.java#L12840-L12855',
  ),
  pilotMovementMegamekRef(
    'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
    'megamek/src/megamek/common/units/Mek.java#L4919-L4927',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_TCP_SOURCE_VERSION = '55584ec7529b944fca3216965697e9fa1115dced';

function megamekTcpRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TCP_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_TCP_SOURCE_VERSION,
  };
}

export const MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS = [
  megamekTcpRef(
    'MegaMek Player.getTCPInitBonus gives a TCP plus VDNI/BVDNI pilot a +2 initiative component, adds +1 for command/C3/communications equipment, and subtracts represented penalties such as shutdown, ECM, and EMI.',
    'megamek/src/megamek/common/Player.java#L831-L909',
  ),
  megamekTcpRef(
    'MegaMek Team.getInitBonusBreakdown tracks TCP as an initiative component when calculating team initiative.',
    'megamek/src/megamek/common/Team.java#L247-L286',
  ),
  megamekTcpRef(
    'MegaMek InitiativeBonusBreakdown.total applies the current source rule that positive initiative components use only the highest value, while negative modifiers stack.',
    'megamek/src/megamek/common/game/InitiativeBonusBreakdown.java#L88-L113',
  ),
  megamekTcpRef(
    'MegaMek Entity.hasTCPAimedShotCapability requires Triple-Core Processor plus VDNI or Buffered VDNI before granting targeting-computer-style aimed-shot capability.',
    'megamek/src/megamek/common/units/Entity.java#L6449-L6469',
  ),
  megamekTcpRef(
    'MegaMek ComputeAttackerToHitMods applies the TCP plus VDNI aimed-shot path as targeting-computer eligibility, with an extra -1 only when an actual targeting computer is also present.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L308-L330',
  ),
  mekstationDeviationRef(
    'MekStation calculateTripleCoreProcessorInitiativeBonus routes represented TCP initiative through existing electronic-warfare state for hostile ECM-without-own-ECM penalties and the explicit battle-wide EMI state.',
    'src/utils/gameplay/initiativeModifiers.ts#L95-L150',
  ),
  mekstationDeviationRef(
    'MekStation gameSession coverage proves represented TCP initiative applies hostile ECM and EMI reductions while preserving own-ECM protection.',
    'src/utils/gameplay/__tests__/gameSession.test.ts#L1300-L1429',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TACTICAL_GENIUS_SOURCE_REFS = [
  pilotMovementMegamekRef(
    'MegaMek Game.hasTacticalGenius checks for a conscious active unit with MISC_TACTICAL_GENIUS before initiative reroll handling.',
    'megamek/src/megamek/common/game/Game.java#L617-L626',
  ),
  pilotMovementMegamekRef(
    'MegaMek InitiativeRoll.replaceRoll replaces the previous initiative roll and records that Tactical Genius was used.',
    'megamek/src/megamek/common/game/InitiativeRoll.java#L95-L104',
  ),
  pilotMovementMegamekRef(
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
