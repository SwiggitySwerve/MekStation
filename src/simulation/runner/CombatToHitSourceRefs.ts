import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_TO_HIT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekToHitRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  };
}

export const MEGAMEK_GUNNERY_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    "MegaMek ComputeToHit starts normal weapon attacks from the attacker's crew gunnery skill, or the optional RPG energy/missile/ballistic/artillery gunnery skill.",
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L570-L585',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ATTACKER_MOVEMENT_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    "MegaMek ComputeAttackerToHitMods appends the attacker's movement modifier before other attacker-side ranged to-hit modifiers.",
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L100-L105',
  ),
  megamekToHitRef(
    'MegaMek Compute.getAttackerMovementModifier applies standard BattleMech walk +1, run +2, jump +3, swim/UMU +3, and sprint auto-fail attacker movement outcomes with dual-cockpit gunner reduction.',
    'megamek/src/megamek/common/compute/Compute.java#L2627-L2687',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TARGET_MOVEMENT_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    "MegaMek ComputeTargetToHitMods appends target movement modifiers and source-backed semi-guided/precision-ammo reductions from the target's movement value.",
    'megamek/src/megamek/common/actions/compute/ComputeTargetToHitMods.java#L198-L223',
  ),
  megamekToHitRef(
    'MegaMek Compute.getTargetMovementModifier maps target distance moved to the standard TMM brackets, adds +1 for jumped or airborne non-aerospace movement, and applies -1 when the target sprinted.',
    'megamek/src/megamek/common/compute/Compute.java#L2775-L2916',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HEAT_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    "MegaMek ComputeAttackerToHitMods adds the attacker's heat firing modifier to normal weapon attacks.",
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L190-L194',
  ),
  megamekToHitRef(
    'MegaMek Entity.getHeatFiringModifier applies the standard heat firing thresholds and optional TacOps heat thresholds, then reduces positive heat modifiers by 1 for Some Like It Hot.',
    'megamek/src/megamek/common/units/Entity.java#L4190-L4216',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeEnvironmentalToHitMods appends night, weather, wind, fog, blowing sand, gravity, and EMI to-hit modifiers by planetary condition and weapon family.',
    'megamek/src/megamek/common/actions/compute/ComputeEnvironmentalToHitMods.java#L59-L151',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PARTIAL_COVER_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek LosEffects applies +1 for target partial cover and switches to the partial-cover hit table.',
    'megamek/src/megamek/common/LosEffects.java#L915-L929',
  ),
  megamekToHitRef(
    'MegaMek ComputeTerrainMods promotes target water or LOS cover into partial-cover hit-table and cover metadata during terrain/LOS modifier compilation.',
    'megamek/src/megamek/common/actions/compute/ComputeTerrainMods.java#L173-L205',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TARGET_PRONE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeTargetToHitMods applies -2 against prone targets at distance 1 or less and +1 against prone targets at longer range.',
    'megamek/src/megamek/common/actions/compute/ComputeTargetToHitMods.java#L115-L128',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TARGET_IMMOBILE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeTargetToHitMods appends target immobile modifiers for non-artillery-cannon attacks after target movement.',
    'megamek/src/megamek/common/actions/compute/ComputeTargetToHitMods.java#L248-L267',
  ),
  megamekToHitRef(
    'MegaMek Compute.getImmobileMod returns -4 for target immobile and preserves aimed-shot variants for immobilized targets.',
    'megamek/src/megamek/common/compute/Compute.java#L1272-L1303',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INDIRECT_FIRE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeToHit applies +1 for indirect LRM/mortar-style fire, applies spotter movement/attack penalties, and handles semi-guided TAG relief.',
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1512-L1544',
  ),
  megamekToHitRef(
    'MegaMek Compute.getSpotterMovementModifier adds spotter walked +1, ran/skidded +2, jumped +3, or sprinted impossible for indirect fire spotting.',
    'megamek/src/megamek/common/compute/Compute.java#L2689-L2725',
  ),
  megamekToHitRef(
    'MegaMek Entity.canSpot rejects off-board, sprinting, and evading entities before they can spot LRM indirect fire.',
    'megamek/src/megamek/common/units/Entity.java#L9812-L9818',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PILOT_WOUNDS_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    "MegaMek ComputeToHit uses the attacker's crew gunnery skill as the base ranged to-hit value; MekStation's explicit pilotWounds row is kept visible as a local combat-state modifier against that source boundary.",
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L570-L585',
  ),
  megamekToHitRef(
    'MegaMek ComputeAttackerToHitMods applies explicit crew-hit to-hit additions for Aero units and vehicle crew damage, showing that wound-to-hit effects are unit-class scoped.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L367-L382',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_SENSOR_DAMAGE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek Compute.getDamageWeaponMods applies attacker sensor damage modifiers for BattleMechs, including torso-mounted and dual-cockpit variants.',
    'megamek/src/megamek/common/compute/Compute.java#L2449-L2478',
  ),
  megamekToHitRef(
    'MegaMek ComputeAttackerToHitMods appends damage weapon modifiers, then applies vehicle sensor damage separately.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L299-L309',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ACTUATOR_DAMAGE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek Compute.getDamageWeaponMods applies +4 for destroyed shoulder actuators and +1 each for upper/lower arm actuator hits on arm-mounted BattleMech weapons.',
    'megamek/src/megamek/common/compute/Compute.java#L2407-L2444',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ATTACKER_PRONE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeAttackerToHitMods appends prone attacker modifiers through Compute.getProneMods.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L103-L105',
  ),
  megamekToHitRef(
    'MegaMek Compute.getProneMods applies BattleMech prone firing restrictions and the standard +2 attacker-prone modifier, reduced to +1 for a dedicated dual-cockpit gunner.',
    'megamek/src/megamek/common/compute/Compute.java#L2248-L2333',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ECM_GUIDANCE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeECM.isAffectedByECM resolves whether a line from attacker to target is inside enemy ECM coverage.',
    'megamek/src/megamek/common/compute/ComputeECM.java#L60-L79',
  ),
  megamekToHitRef(
    'MegaMek ComputeToHit gates Artemis V and NARC/iNARC to-hit benefits on ECM status, suppressing guidance bonuses instead of adding a generic ECM penalty.',
    'megamek/src/megamek/common/actions/compute/ComputeToHit.java#L213-L220,L272-L281,L348-L380,L888-L955,L1572-L1582',
  ),
  megamekToHitRef(
    'MegaMek ComputeAttackerToHitMods applies targeting-computer aiming or direct-fire modifiers without an ECM-gated additive penalty in the attacker modifier block.',
    'megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L263-L289',
  ),
  megamekToHitRef(
    'MegaMek MissileWeaponHandler uses ECM coverage to suppress Artemis and NARC-capable missile cluster bonuses rather than adding a to-hit penalty.',
    'megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L134-L255',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS = [
  megamekToHitRef(
    'MegaMek ComputeTerrainMods appends range, LOS, attacker terrain, target terrain, and source-backed semi-guided terrain suppression while compiling terrain/LOS to-hit modifiers.',
    'megamek/src/megamek/common/actions/compute/ComputeTerrainMods.java#L121-L153',
  ),
  megamekToHitRef(
    'MegaMek Compute.getTargetTerrainModifier applies target-in woods, jungle, smoke, geyser, heavy industrial, screen, stuck-swamp, and planted-field modifiers from the target hex.',
    'megamek/src/megamek/common/compute/Compute.java#L2939-L3093',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
