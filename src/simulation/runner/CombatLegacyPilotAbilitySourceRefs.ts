import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import { MEGAMEK_CALLED_SHOT_SOURCE_REFS } from './CombatPilotModifierSourceRefs';

const MEGAMEK_LEGACY_PILOT_ABILITY_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_LEGACY_PILOT_ABILITY_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_LEGACY_PILOT_ABILITY_SOURCE_VERSION,
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

const MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF = megamekRef(
  'MegaMek PilotOptions registers gunnery pilot advantages including Blood Stalker, Cluster Hitter, Specialist, Oblique Attacker, Range Master, Sniper, and Weapon Specialist.',
  'megamek/src/megamek/common/options/PilotOptions.java#L80-L98',
);

const MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF = megamekRef(
  'MegaMek OptionsConstants defines gunnery SPA ids, leaves Sharpshooter commented out, and defines Forward Observer as a misc ability.',
  'megamek/src/megamek/common/options/OptionsConstants.java#L191-L209',
);

const MEKSTATION_ATTACKER_SPA_AGGREGATION_SOURCE_REF = mekstationDeviationRef(
  'MekStation calculateAttackerSPAModifiers consumes designated attacker state for Weapon Specialist, Gunnery Specialist, Blood Stalker, Range Master, and Sniper.',
  'src/utils/gameplay/spaModifiers/integration.ts#L54-L109',
);

export const MEGAMEK_WEAPON_SPECIALIST_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processAttackerSPAs applies Weapon Specialist -2 and lets Weapon Specialist supersede Gunnery Specialist.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L136-L166',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation calculateWeaponSpecialistModifier applies -2 for a matching designated weapon type.',
    'src/utils/gameplay/spaModifiers/weaponSpecialists.ts#L14-L30',
  ),
  MEKSTATION_ATTACKER_SPA_AGGREGATION_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_GUNNERY_SPECIALIST_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processAttackerSPAs applies Gunnery Specialist -1 to the specialized category and +1 to other weapon categories.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L143-L166',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation calculateGunnerySpecialistModifier applies -1 for the designated category and +1 otherwise.',
    'src/utils/gameplay/spaModifiers/weaponSpecialists.ts#L35-L53',
  ),
  MEKSTATION_ATTACKER_SPA_AGGREGATION_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MARKSMAN_CALLED_SHOT_SOURCE_REFS = [
  ...MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation SPA_CATALOG defines Marksman as a local called-shot helper row.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L35-L42',
  ),
  mekstationDeviationRef(
    'MekStation getSharpshooterBonus maps canonical Marksman and legacy Sharpshooter to the same local -1 called-shot helper.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L427-L433',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SNIPER_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity range modifier helpers halve positive range modifiers for Sniper after Range Master adjustments.',
    'megamek/src/megamek/common/units/Entity.java#L10975-L11067',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation calculateSniperModifier halves positive range modifiers, rounding down.',
    'src/utils/gameplay/spaModifiers/weaponSpecialists.ts#L83-L99',
  ),
  MEKSTATION_ATTACKER_SPA_AGGREGATION_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_BLOOD_STALKER_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeAbilityMods.processAttackerSPAs applies Blood Stalker -1 against the stalked target and +2 against other targets.',
    'megamek/src/megamek/common/actions/compute/ComputeAbilityMods.java#L102-L114',
  ),
  megamekRef(
    'MegaMek FiringDisplay queues ActivateBloodStalkerAction and records the selected Blood Stalker target.',
    'megamek/src/megamek/client/ui/panels/phaseDisplay/FiringDisplay.java#L989-L1008',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation calculateBloodStalkerModifier applies -1 to the designated target and +2 to other targets.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L42-L59',
  ),
  MEKSTATION_ATTACKER_SPA_AGGREGATION_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CLUSTER_HITTER_SOURCE_REFS = [
  megamekRef(
    'MegaMek WeaponHandler.getClusterModifiers applies Cluster Hitter as +1 on the cluster table when Sandblaster and Cluster Master do not supersede it.',
    'megamek/src/megamek/common/weapons/handlers/WeaponHandler.java#L2165-L2180',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation getClusterHitterBonus exposes Cluster Hitter as a +1 cluster-table shift.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L84-L86',
  ),
  mekstationDeviationRef(
    'MekStation runAttackPhase hydrates Cluster Hitter into missile clusterContext for projectile resolution.',
    'src/simulation/runner/phases/weaponAttack.ts#L1273-L1302',
  ),
  mekstationDeviationRef(
    'MekStation calculateClusterModifiers applies Cluster Hitter as +1 unless Sandblaster overrides it.',
    'src/utils/gameplay/specialWeaponMechanics/missileMechanics.ts#L301-L334',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RANGE_MASTER_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity range modifier helpers zero the designated medium, long, or extreme bracket for Range Master.',
    'megamek/src/megamek/common/units/Entity.java#L10975-L11067',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation calculateRangeMasterModifier negates the current positive range modifier for the designated bracket.',
    'src/utils/gameplay/spaModifiers/weaponSpecialists.ts#L59-L77',
  ),
  MEKSTATION_ATTACKER_SPA_AGGREGATION_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_OBLIQUE_ATTACKER_SOURCE_REFS = [
  megamekRef(
    'MegaMek ComputeToHit applies the indirect-fire penalty and subtracts it for Oblique Attacker.',
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1512-L1519',
  ),
  megamekRef(
    'MegaMek ComputeToHit also reduces indirect artillery modifiers for Oblique Attacker.',
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1799-L1804',
  ),
  MEGAMEK_GUNNERY_OPTION_REGISTRY_SOURCE_REF,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation getObliqueAttackerBonus exposes Oblique Attacker as -1 for indirect-fire penalty math.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L423-L425',
  ),
  mekstationDeviationRef(
    'MekStation resolveIndirectFire applies attacker-side Oblique Attacker to LOS spotter and NARC/iNARC indirect-fire paths.',
    'src/utils/gameplay/indirectFire.ts#L325-L398',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_FORWARD_OBSERVER_SOURCE_REFS = [
  megamekRef(
    'MegaMek ArtilleryWeaponIndirectFireHandler applies Forward Observer as a -1 spotting modifier for indirect artillery.',
    'megamek/src/megamek/common/weapons/handlers/artillery/ArtilleryWeaponIndirectFireHandler.java#L181-L196',
  ),
  megamekRef(
    'MegaMek ArtilleryWeaponIndirectFireHandler records Forward Observer on adjusted indirect artillery shots.',
    'megamek/src/megamek/common/weapons/handlers/artillery/ArtilleryWeaponIndirectFireHandler.java#L216-L224',
  ),
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation resolveIndirectFire cancels the walked-spotter penalty when the spotter has forward_observer.',
    'src/utils/gameplay/indirectFire.ts#L364-L398',
  ),
  mekstationDeviationRef(
    'MekStation interactive declarations emit IndirectFireForwardObserver when Forward Observer relief applies.',
    'src/utils/gameplay/gameSessionCore.ts#L607-L631',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_SHARPSHOOTER_CALLED_SHOT_SOURCE_REFS = [
  ...MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  MEGAMEK_GUNNERY_OPTION_ID_SOURCE_REF,
  mekstationDeviationRef(
    'MekStation SPA_CATALOG keeps Sharpshooter as a legacy called-shot helper alias.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L111-L118',
  ),
  mekstationDeviationRef(
    'MekStation getSharpshooterBonus maps legacy Sharpshooter and canonical Marksman to the same local -1 called-shot helper.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L427-L433',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MELEE_SPECIALIST_SOURCE_REFS = [
  megamekRef(
    'MegaMek Compute.modifyPhysicalBTHForAdvantages applies Melee Specialist -1 to BattleMech physical attack target numbers.',
    'megamek/src/megamek/common/compute/Compute.java#L2731-L2746',
  ),
  megamekRef(
    'MegaMek Entity.modifyPhysicalDamageForMeleeSpecialist applies +1 physical damage for Melee Specialist.',
    'megamek/src/megamek/common/units/Entity.java#L15661-L15667',
  ),
  megamekRef(
    'MegaMek PilotOptions and OptionsConstants register Melee Specialist and Melee Master as distinct piloting advantages.',
    'megamek/src/megamek/common/options/PilotOptions.java#L60-L69',
  ),
  mekstationDeviationRef(
    'MekStation calculateMeleeSpecialistModifier applies Melee Specialist as a -1 physical attack to-hit helper.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L212-L223',
  ),
  mekstationDeviationRef(
    'MekStation getMeleeSpecialistDamageBonus applies Melee Specialist as a +1 physical attack damage helper.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L273-L277',
  ),
  mekstationDeviationRef(
    'MekStation physical to-hit helpers append Melee Specialist to physical attack modifiers.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L103-L114',
  ),
  mekstationDeviationRef(
    'MekStation physical damage helpers consume Melee Specialist as the source-backed flat physical damage bonus.',
    'src/utils/gameplay/physicalAttacks/damage.ts#L85-L87',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_MELEE_MASTER_DEVIATION_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.getAllowedPhysicalAttacks grants Melee Master two allowed physical attacks instead of a flat damage bonus.',
    'megamek/src/megamek/common/units/Entity.java#L14765-L14770',
  ),
  megamekRef(
    'MegaMek PhysicalDisplay surfaces the Melee Master two-attack rule in physical attack prompts.',
    'megamek/src/megamek/client/ui/panels/phaseDisplay/PhysicalDisplay.java#L621-L667',
  ),
  megamekRef(
    'MegaMek PilotOptions and OptionsConstants register Melee Specialist and Melee Master as distinct piloting advantages.',
    'megamek/src/megamek/common/options/PilotOptions.java#L60-L69',
  ),
  mekstationDeviationRef(
    'MekStation getMeleeMasterDamageBonus now returns no flat damage because Melee Master is an action-count rule, not a damage modifier.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L280-L287',
  ),
  mekstationDeviationRef(
    'MekStation physical action-count helpers return two allowed physical attacks for canonical or legacy Melee Master ids and one attack otherwise.',
    'src/utils/gameplay/physicalAttacks/actionCount.ts#L14-L20',
  ),
  mekstationDeviationRef(
    'MekStation declarePhysicalAttack enforces the per-turn physical attack allowance, derives declaration limbs, and rejects over-limit declarations without scheduling a physical attack.',
    'src/utils/gameplay/gameSessionPhysical.ts#L437-L469',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TERRAIN_MASTER_GAP_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers Terrain Master variants rather than a generic terrain_master combat option.',
    'megamek/src/megamek/common/options/PilotOptions.java#L72-L76',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Terrain Master variant ids for Forest Ranger, Frogman, Mountaineer, Nightwalker, and Swamp Beast.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
  mekstationDeviationRef(
    'MekStation SPA_CATALOG keeps a legacy generic terrain-master row and splits implemented Terrain Master behavior into tm_frogman, tm_mountaineer, tm_forest_ranger, and tm_swamp_beast rows.',
    'src/utils/gameplay/spaModifiers/catalog.ts#L163-L202',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_NIGHTWALKER_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers Terrain Master: Nightwalker as the source-backed tm_nightwalker pilot option.',
    'megamek/src/megamek/common/options/PilotOptions.java#L72-L76',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Terrain Master: Nightwalker as tm_nightwalker.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L183-L187',
  ),
  megamekRef(
    'MegaMek LandAirMek.isNightwalker applies Terrain Master: Nightwalker only while the LAM is not airborne.',
    'megamek/src/megamek/common/units/LandAirMek.java#L1205-L1210',
  ),
  megamekRef(
    'MegaMek MoveStep uses isNightwalker to bypass full-moon, glare, moonless, solar-flare, and pitch-black movement light penalties, while prohibiting running in those light conditions.',
    'megamek/src/megamek/common/moves/MoveStep.java#L2682-L2724',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
