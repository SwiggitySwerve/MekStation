import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_LEGACY_QUIRK_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEKHQ_RUGGED_SOURCE_VERSION = '8a792e7212e882110ca99613db4edc05f035b40e';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_LEGACY_QUIRK_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_LEGACY_QUIRK_SOURCE_VERSION,
  };
}

function mekhqRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekhq-behavior',
    citation,
    url: `https://github.com/MegaMek/mekhq/blob/${MEKHQ_RUGGED_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEKHQ_RUGGED_SOURCE_VERSION,
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

const MEGAMEK_PSR_QUIRK_REGISTRY_SOURCE_REF = megamekRef(
  'MegaMek OptionsConstants defines Easy Pilot, Stable, Cramped Cockpit, Hard Pilot, and Unbalanced quirk ids.',
  'megamek/src/megamek/common/options/OptionsConstants.java#L60-L146',
);

const MEKSTATION_PSR_QUIRK_HELPER_SOURCE_REF = mekstationDeviationRef(
  'MekStation calculatePilotingQuirkPSRModifier scopes Stable to kick/push PSRs, Easy Pilot to piloting-skill-gated terrain/20+ damage PSRs, and Cramped Cockpit to non-Small-Pilot crews while applying local Hard to Pilot and Unbalanced target-number modifiers.',
  'src/utils/gameplay/quirkModifiers/pilotingQuirks.ts#L32-L76',
);

export const MEGAMEK_EASY_TO_PILOT_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.adjustDifficultTerrainPSRModifier applies Easy Pilot -1 to difficult-terrain PSRs only when base piloting is worse than 3.',
    'megamek/src/megamek/common/units/Entity.java#L8667-L8673',
  ),
  megamekRef(
    'MegaMek TWGameManager also applies Easy Pilot -1 to selected damage/control PSRs when base piloting is worse than 3.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15964-L16018',
  ),
  MEGAMEK_PSR_QUIRK_REGISTRY_SOURCE_REF,
  MEKSTATION_PSR_QUIRK_HELPER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_STABLE_PSR_SOURCE_REFS = [
  megamekRef(
    'MegaMek TWGameManager applies Stable -1 to Kick/Push PSRs.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15443-L15448',
  ),
  MEGAMEK_PSR_QUIRK_REGISTRY_SOURCE_REF,
  MEKSTATION_PSR_QUIRK_HELPER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_HARD_TO_PILOT_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.getBasePilotingRoll applies Hard to Pilot +1 to base piloting rolls.',
    'megamek/src/megamek/common/units/Entity.java#L7660-L7677',
  ),
  MEGAMEK_PSR_QUIRK_REGISTRY_SOURCE_REF,
  MEKSTATION_PSR_QUIRK_HELPER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_UNBALANCED_SOURCE_REFS = [
  megamekRef(
    'MegaMek Entity.adjustDifficultTerrainPSRModifier applies Unbalanced +1 to difficult-terrain PSRs.',
    'megamek/src/megamek/common/units/Entity.java#L8667-L8673',
  ),
  MEGAMEK_PSR_QUIRK_REGISTRY_SOURCE_REF,
  MEKSTATION_PSR_QUIRK_HELPER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_CRAMPED_COCKPIT_SOURCE_REFS = [
  megamekRef(
    'MegaMek Mek.addEntityBonuses applies Cramped Cockpit +1 unless the pilot has Small Pilot.',
    'megamek/src/megamek/common/units/Mek.java#L3396-L3399',
  ),
  megamekRef(
    'MegaMek PilotOptions registers the unofficial Small Pilot ability.',
    'megamek/src/megamek/common/options/PilotOptions.java#L121-L121',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines UNOFFICIAL_SMALL_PILOT as small_pilot.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L232-L232',
  ),
  MEGAMEK_PSR_QUIRK_REGISTRY_SOURCE_REF,
  MEKSTATION_PSR_QUIRK_HELPER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_BATTLE_FISTS_SOURCE_REFS = [
  megamekRef(
    'MegaMek PunchAttackAction applies Battle Fist as -1 punch to-hit for the matching arm when a hand actuator is present.',
    'megamek/src/megamek/common/actions/PunchAttackAction.java#L337-L342',
  ),
  megamekRef(
    'MegaMek Quirks only validates Battle Fist on BattleMech arms that have matching hand actuators.',
    'megamek/src/megamek/common/options/Quirks.java#L234-L241',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines left and right Battle Fists quirk ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L48-L50',
  ),
  mekstationDeviationRef(
    'MekStation getBattleFistPunchToHitModifier maps Battle Fists to -1 matching-arm punch to-hit.',
    'src/utils/gameplay/quirkModifiers/defensiveQuirks.ts#L13-L23',
  ),
  mekstationDeviationRef(
    'MekStation physical to-hit helpers consume Battle Fists when the matching arm has a working hand actuator.',
    'src/utils/gameplay/physicalAttacks/toHit.ts#L194-L218',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_NO_ARMS_SOURCE_REFS = [
  megamekRef(
    'MegaMek PunchAttackAction rejects punch attacks for No/Minimal Arms.',
    'megamek/src/megamek/common/actions/PunchAttackAction.java#L176-L183',
  ),
  megamekRef(
    'MegaMek ClubAttackAction rejects arm-mounted club attacks for No/Minimal Arms.',
    'megamek/src/megamek/common/actions/ClubAttackAction.java#L453-L455',
  ),
  megamekRef(
    'MegaMek PushAttackAction rejects push attacks for No/Minimal Arms.',
    'megamek/src/megamek/common/actions/PushAttackAction.java#L198-L200',
  ),
  megamekRef(
    'MegaMek MekWithArms adds a +2 stand-up PSR penalty for No/Minimal Arms.',
    'megamek/src/megamek/common/units/MekWithArms.java#L418-L426',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines the No/Minimal Arms quirk id.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L150-L155',
  ),
  mekstationDeviationRef(
    'MekStation hasNoArms exposes the local No Arms helper.',
    'src/utils/gameplay/quirkModifiers/defensiveQuirks.ts#L26-L30',
  ),
  mekstationDeviationRef(
    'MekStation physical attack restrictions consume No Arms for punch helpers.',
    'src/utils/gameplay/physicalAttacks/restrictions.ts#L331-L339',
  ),
  mekstationDeviationRef(
    'MekStation physical attack restrictions consume No Arms for arm-mounted melee helpers.',
    'src/utils/gameplay/physicalAttacks/restrictions.ts#L491-L499',
  ),
  mekstationDeviationRef(
    'MekStation physical attack restrictions consume No Arms for push helpers.',
    'src/utils/gameplay/physicalAttacks/restrictions.ts#L783-L791',
  ),
  mekstationDeviationRef(
    'MekStation piloting quirk PSR modifier applies the No Arms +2 stand-up PSR modifier.',
    'src/utils/gameplay/quirkModifiers/pilotingQuirks.ts#L74-L81',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_LOW_ARMS_GAP_SOURCE_REFS = [
  megamekRef(
    'MegaMek OptionsConstants defines Low Arms as a negative unit quirk id.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L126-L130',
  ),
  megamekRef(
    'MegaMek Quirks registers Low Arms as a negative quirk option.',
    'megamek/src/megamek/common/options/Quirks.java#L147-L151',
  ),
  mekstationDeviationRef(
    'MekStation isLowArmsRestricted intentionally no-ops until source-backed combat semantics exist.',
    'src/utils/gameplay/quirkModifiers/defensiveQuirks.ts#L34-L46',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ANTI_MEK_ACTUATOR_SOURCE_REFS = [
  megamekRef(
    'MegaMek Compute.getAntiMekAttacksTargetNumber applies Protected Actuators +1 and Exposed Actuators -1 to anti-Mek attack target numbers.',
    'megamek/src/megamek/common/compute/Compute.java#L5638-L5655',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Protected Actuators and Exposed Actuators quirk ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L82-L122',
  ),
  mekstationDeviationRef(
    'MekStation getAntiMekActuatorTargetModifier exposes the same +/-1 helper without implementing anti-Mek Leg/Swarm attack paths.',
    'src/utils/gameplay/quirkModifiers/defensiveQuirks.ts#L121-L130',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKHQ_RUGGED_SOURCE_REFS = [
  mekhqRef(
    'MekHQ Unit.getMaintenanceCycleDuration multiplies campaign maintenance cycle length by 2 for Rugged 1 and by 3 for Rugged 2.',
    'MekHQ/src/mekhq/campaign/unit/Unit.java#L6923-L6944',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Rugged 1 and Rugged 2 quirk ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L84-L85',
  ),
  mekstationDeviationRef(
    'MekStation getRuggedMaintenanceMultiplier mirrors the MekHQ maintenance multiplier helper outside combat runner resolution.',
    'src/utils/gameplay/quirkModifiers/defensiveQuirks.ts#L110-L119',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
