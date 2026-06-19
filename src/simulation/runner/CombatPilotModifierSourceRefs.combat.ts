import {
  megamekSourceRef as pilotCombatMegamekRef,
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

export const MEGAMEK_SECONDARY_TARGET_MULTI_TASKER_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
    'megamek/src/megamek/common/compute/Compute.java#L2494-L2615',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L192-L200',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MULTI_TRAC_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek Compute.getSecondaryTargetMod suppresses the secondary-target modifier for Multi-Trac attackers when the current target is not in the rear arc.',
    'megamek/src/megamek/common/compute/Compute.java#L2500-L2519',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_MULTI_TRAC as multi_trac.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L75-L78',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_LOCAL_ONLY_SPA_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
    'megamek/src/megamek/common/options/PilotOptions.java#L60-L87',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L230',
  ),
  mekstationDeviationRef(
    'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L204-L386',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CALLED_SHOT_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L108-L138',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SENSOR_GHOSTS_TO_HIT_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek ComputeAbilityMods.processAttackerQuirks applies +1 Sensor Ghosts to the attacker to-hit number.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L71-L74',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines QUIRK_NEG_SENSOR_GHOSTS as sensor_ghosts.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L144-L144',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_VDNI_TARGET_NUMBER_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek ComputeAttackerToHitMods applies -1 ranged attack to-hit for VDNI and Buffered VDNI.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L388-L390',
  ),
  pilotCombatMegamekRef(
    'MegaMek Mek.addEntityBonuses applies -1 piloting-roll modifier for VDNI only when Buffered VDNI is absent.',
    'megamek/src/megamek/common/units/Mek.java#L3362-L3365',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines the Manei Domini VDNI and Buffered VDNI ids as vdni and bvdni.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L253-L255',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PROTO_DNI_TARGET_NUMBER_SOURCE_REFS = [
  currentMegamekImplantRef(
    'Current MegaMek ComputeAttackerToHitMods applies Prototype DNI as -2 ranged/gunnery target-number relief when active DNI is available.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L453-L466',
  ),
  currentMegamekImplantRef(
    'Current MegaMek Mek.getBasePilotingRoll applies Prototype DNI as -3 BattleMech piloting target-number relief when active DNI is available.',
    'megamek/src/megamek/common/units/Mek.java#L4125-L4138',
  ),
  currentMegamekImplantRef(
    'Current MegaMek Entity.hasDNIImplant includes proto_dni in the active DNI gate shared by VDNI and Buffered VDNI.',
    'megamek/src/megamek/common/units/Entity.java#L12320-L12338',
  ),
  currentMegamekImplantRef(
    'Current MegaMek OptionsConstants defines proto_dni as a Manei Domini option id.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L275',
  ),
  mekstationDeviationRef(
    'MekStation calculateVdniRangedToHitModifier consumes canonical proto_dni as represented active-DNI-gated -2 ranged attack to-hit relief.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L218-L240',
  ),
  mekstationDeviationRef(
    'MekStation calculateNeuralInterfacePilotingModifier consumes canonical proto_dni as represented active-DNI-gated -3 BattleMech piloting target-number relief.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L440-L468',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PROTO_DNI_RUNTIME_BOUNDARY_SOURCE_REFS = [
  currentMegamekImplantRef(
    'Current MegaMek option text describes Prototype Direct Neural Interface as BattleMek-only -2 Gunnery, -3 Piloting, and damage-feedback behavior.',
    'megamek/resources/megamek/common/options/messages.properties#L773-L774',
  ),
  currentMegamekImplantRef(
    'Current MegaMek TWDamageManager neural-feedback runtime checks active DNI plus MD_VDNI and excludes Buffered VDNI/Pain Shunt; it does not branch on MD_PROTO_DNI.',
    'megamek/src/megamek/server/totalWarfare/TWDamageManager.java#L406-L412',
  ),
  mekstationDeviationRef(
    'MekStation damage coverage proves Prototype DNI internal damage does not infer VDNI neural-feedback pilot damage.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L354-L372',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_COMM_IMPLANT_INDIRECT_FIRE_SOURCE_REFS = [
  currentMegamekImplantRef(
    'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1562-L1567',
  ),
  currentMegamekImplantRef(
    'Current MegaMek OptionsConstants defines comm_implant and boost_comm_implant as Manei Domini option ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L265-L266',
  ),
  currentMegamekImplantRef(
    'Current MegaMek TWGameManager applies comm-implant minefield detonation relief only to Infantry units.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L7574-L7580',
  ),
  currentMegamekImplantRef(
    'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
    'megamek/src/megamek/common/units/Entity.java#L6727-L6737',
  ),
  mekstationDeviationRef(
    'MekStation resolveIndirectFire consumes comm_implant and boost_comm_implant on elected LOS spotters as represented -1 indirect-fire spotter relief.',
    'src/utils/gameplay/indirectFire.ts#L481-L520',
  ),
  mekstationDeviationRef(
    'MekStation runner indirect-fire coverage proves comm_implant reduces AttackDeclared indirect-fire modifiers and the selected-spotter event to-hit penalty.',
    'src/simulation/runner/__tests__/weaponAttackIndirectFire.02.test.ts#L170-L202',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_VDNI_NEURAL_FEEDBACK_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek TWDamageManager rolls 2d6 after internal damage for unbuffered VDNI, applies one crew damage on 8+, and suppresses the roll for Buffered VDNI or Artificial Pain Shunt.',
    'megamek/src/megamek/server/totalWarfare/TWDamageManager.java#L1927-L1945',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines Artificial Pain Shunt, VDNI, and Buffered VDNI as artificial_pain_shunt, vdni, and bvdni.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L252-L255',
  ),
  mekstationDeviationRef(
    'MekStation resolveDamage applies represented VDNI internal-damage neural feedback as a separate neural_feedback pilot-damage source.',
    'src/utils/gameplay/damage/finalize.ts#L53-L83',
  ),
  mekstationDeviationRef(
    'MekStation critical-hit event coverage proves represented VDNI feedback emits PilotHit and persists pilot wounds after internal structure damage.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L316-L365',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_BVDNI_NEURAL_FEEDBACK_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek TWGameManager rolls 2d6 after a Buffered VDNI critical hit, applies one crew damage on 8+, and suppresses the roll for Artificial Pain Shunt.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L18947-L18961',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines Artificial Pain Shunt, VDNI, and Buffered VDNI as artificial_pain_shunt, vdni, and bvdni.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L252-L255',
  ),
  mekstationDeviationRef(
    'MekStation resolveDamage applies represented Buffered VDNI critical-hit neural feedback as a separate neural_feedback pilot-damage source.',
    'src/utils/gameplay/damage/finalize.ts#L53-L83',
  ),
  mekstationDeviationRef(
    'MekStation critical-hit event coverage proves represented Buffered VDNI feedback wounds the pilot after a resolved critical hit.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L367-L393',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_WEAPON_TO_HIT_QUIRK_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek ComputeAbilityMods.processAttackerQuirks applies Accurate -1, Inaccurate +1, and Stable Weapon -1 when the attacker ran.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L78-L90',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines Accurate, Stable Weapon, and Inaccurate weapon quirk ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L106-L159',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_WEAPON_COOLING_QUIRK_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek WeaponMounted.getCurrentHeat applies weapon cooling quirks after shot/weapon multiplication: Improved Cooling floors heat at max(1, heat - 1), Poor Cooling adds 1, and No Cooling adds 2.',
    'megamek/src/megamek/common/equipment/WeaponMounted.java#L128-L142',
  ),
  pilotCombatMegamekRef(
    'MegaMek WeaponQuirks registers Improved Cooling, Poor Cooling, and No Cooling as weapon quirk options.',
    'megamek/src/megamek/common/options/WeaponQuirks.java#L76-L80',
  ),
  pilotCombatMegamekRef(
    'MegaMek WeaponQuirks disallows weapon cooling quirks for club weapons, non-heat weapons, conventional infantry, tanks, battle armor, and ProtoMeks.',
    'megamek/src/megamek/common/options/WeaponQuirks.java#L126-L177',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines weapon cooling quirk ids as imp_cooling, poor_cooling, and no_cooling.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L106-L162',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TARGETING_QUIRK_TO_HIT_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek Entity range modifier helpers apply Improved Targeting -1 and Poor Targeting +1 at short, medium, and long range.',
    'megamek/src/megamek/common/units/Entity.java#L10975-L11033',
  ),
  pilotCombatMegamekRef(
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
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_DISTRACTING as distracting.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L55-L58',
  ),
  pilotCombatMegamekRef(
    'MegaMek Quirks registers Distracting as a positive unit quirk option without a combat to-hit resolver in this source snapshot.',
    'megamek/src/megamek/common/options/Quirks.java#L80-L86',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_LOW_PROFILE_GLANCING_SOURCE_REFS = [
  pilotCombatMegamekRef(
    'MegaMek WeaponHandler.isLowProfileGlancingBlow applies Low Profile as glancing-blow handling when the attack roll equals the target number or target number plus one.',
    'megamek/src/megamek/common/weapons/handlers/WeaponHandler.java#L2245-L2258',
  ),
  pilotCombatMegamekRef(
    'MegaMek HitData.makeGlancingBlow records glancing critical-hit-table modifiers as -2.',
    'megamek/src/megamek/common/HitData.java#L197-L207',
  ),
  pilotCombatMegamekRef(
    'MegaMek TWDamageManager applies hit.glancingMod() to normal critical-hit table rolls.',
    'megamek/src/megamek/server/totalWarfare/TWDamageManager.java#L1764-L1772',
  ),
  pilotCombatMegamekRef(
    'MegaMek OptionsConstants defines QUIRK_POS_LOW_PROFILE as low_profile and notes the BMM Low Profile behavior changed.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L72-L77',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_DISTRACTING_TO_HIT_DEVIATION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation calculateDistractingModifier currently applies Distracting as a local +1 target to-hit helper.',
    'src/utils/gameplay/quirkModifiers/targetingQuirks.ts#L63-L77',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_LOW_PROFILE_TO_HIT_DEVIATION_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation calculateLowProfileModifier currently applies Low Profile as a local +1 target to-hit helper when partial cover is absent.',
    'src/utils/gameplay/quirkModifiers/targetingQuirks.ts#L89-L103',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_DEFENSIVE_QUIRK_TO_HIT_DEVIATION_SOURCE_REFS = [
  ...MEKSTATION_DISTRACTING_TO_HIT_DEVIATION_SOURCE_REFS,
  ...MEKSTATION_LOW_PROFILE_TO_HIT_DEVIATION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
