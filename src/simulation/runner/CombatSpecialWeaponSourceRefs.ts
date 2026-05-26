import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

export {
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatWeaponFamilySourceRefs';

const MEGAMEK_DESIGNATOR_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_NARC_MARKER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/NarcHandler.java#L243-L253',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_NARC_CLUSTER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'Entity.isNarcedBy detects attached standard NARC pods from the firing team.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7303-L7305',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler applies the NARC/iNARC Homing cluster modifier to direct NARC-capable LRM/SRM/MML/NLRM fire when target ECM does not suppress it.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L232-L260',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_INARC_VARIANT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/NarcHandler.java#L254-L290',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_POD_TYPE_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/INarcPod.java#L53-L59',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_HOMING_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'Entity.isINarcedBy returns true only for Homing iNarc pods from the firing team.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7325-L7334',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit marks NARC-capable LRM/SRM/MML attacks as iNarc-guided when the target carries a Homing iNarc pod and target ECM does not suppress it.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L348-L360',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit applies the -1 iNarc Homing to-hit modifier to iNarc-guided missile attacks.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L952-L955',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler applies the NARC cluster modifier to direct NARC-capable missiles when the target is NARCed or iNARC Homing-marked and target ECM does not suppress it.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L232-L260',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_HAYWIRE_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'Entity.isINarcedWith checks attached iNarc pod type from any team.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7336-L7344',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit derives isHaywireINarced from the attacker entity before compiling attacker to-hit modifiers.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L209-L210',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeAttackerToHitMods applies the +1 iNarc Haywire attacker to-hit modifier.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L196-L199',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_ECM_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/ComputeECM.java#L472-L515',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler suppresses Artemis, prototype Artemis, and Artemis V cluster guidance when the attacker-to-target missile path is ECM affected.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L137-L200',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_ECM_C3_SOURCE_REFS = [
  MEGAMEK_INARC_ECM_SOURCE_REFS[0],
  MEGAMEK_INARC_ECM_SOURCE_REFS[1],
  {
    kind: 'megamek-source',
    citation:
      'ComputeC3Spotter rejects C3 node paths when ComputeECM reports ECM effects on either leg of the network connection.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/ComputeC3Spotter.java#L214-L250',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_NEMESIS_SOURCE_REFS = [
  MEGAMEK_INARC_VARIANT_SOURCE_REFS[0],
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler redirects iNarc Nemesis-confusable missiles to friendly intervening Nemesis pod carriers before returning to the original target on misses.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L709-L752',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler scopes iNarc Nemesis confusion to direct ATM, Artemis-linked, NARC-capable, or Listen-Kill LRM/SRM missile attacks.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L1072-L1109',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Game.getNemesisTargets returns friendly entities with iNarc Nemesis pods attached in intervening hexes between attacker and original target.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/game/Game.java#L3125-L3145',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TAG_DESIGNATION_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/TAGHandler.java#L75-L87',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TAG_CLEAR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWPhasePreparationManager.java#L73-L78',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation: 'Game.resetTagInfo clears the tagInfoForTurn collection.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/game/Game.java#L3162-L3167',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TAG_SEMI_GUIDED_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'ComputeTargetToHitMods cancels positive target-movement modifiers for TAG-guided semi-guided LRM/MML/NLRM/mortar ammunition.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeTargetToHitMods.java#L203-L210',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeToHit applies a -1 semi-guided indirect-fire modifier when qualifying missile or mortar ammunition attacks a TAG-designated target.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/compute/ComputeToHit.java#L1532-L1535',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_NARC_FAMILY_SOURCE_REFS = [
  ...MEGAMEK_NARC_MARKER_SOURCE_REFS,
  ...MEGAMEK_NARC_CLUSTER_SOURCE_REFS,
  ...MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  MEGAMEK_INARC_HOMING_SOURCE_REFS[1],
  MEGAMEK_INARC_HOMING_SOURCE_REFS[2],
  MEGAMEK_INARC_HOMING_SOURCE_REFS[3],
  MEGAMEK_INARC_HOMING_SOURCE_REFS[4],
  MEGAMEK_INARC_HAYWIRE_SOURCE_REFS[1],
  MEGAMEK_INARC_HAYWIRE_SOURCE_REFS[2],
  MEGAMEK_INARC_HAYWIRE_SOURCE_REFS[3],
  MEGAMEK_INARC_ECM_SOURCE_REFS[1],
  MEGAMEK_INARC_ECM_SOURCE_REFS[2],
  MEGAMEK_INARC_ECM_C3_SOURCE_REFS[2],
  ...MEGAMEK_INARC_NEMESIS_SOURCE_REFS.slice(1),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_TAG_FAMILY_SOURCE_REFS = [
  ...MEGAMEK_TAG_DESIGNATION_SOURCE_REFS,
  ...MEGAMEK_TAG_CLEAR_SOURCE_REFS,
  ...MEGAMEK_TAG_SEMI_GUIDED_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PLASMA_CANNON_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'CLPlasmaCannon declares variable damage, heat 7, plasma/energy flags, plasma ammunition, and routes attacks to PlasmaCannonHandler.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/ppc/clan/CLPlasmaCannon.java#L69-L112',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek plasma rifle and Clan plasma cannon ammunition rows use AmmoTypeEnum.PLASMA, ten shots per ton, and non-explosive ammo state.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/AmmoType.java#L11324-L11366',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'PlasmaCannonHandler applies external target heat on heat-tracking entities, including reflective, heat-dissipating, and PLAYTEST_3 armor-specific adjustments.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/plasma/PlasmaCannonHandler.java#L213-L271',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'PlasmaCannonHandler keeps plasma-cannon BattleMech damage at zero while applying non-Mek/terrain/building special damage paths.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/plasma/PlasmaCannonHandler.java#L276-L382',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_AMS_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'TWGameManager.assignAMS scopes AMS assignment to missile attacks that hit, then routes target AMS through auto assignment or manual defender choice.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L9868-L9934',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Entity.assignAMS filters active AMS by firing arc, lets AMS bays or multi-use AMS engage all in-arc attacks, and otherwise assigns one AMS to the highest expected damage salvo.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7248-L7297',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AMS_CLUSTER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler applies assigned AMS counter equipment through getAMSHitsMod, rechecks firing arc and readiness, spends heat/ammo, and applies the standard -4 missile cluster modifier when AMS engages.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L500-L663',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler adds AMS modifiers before missile cluster-table resolution and treats all-shots-hit/Streak attacks as cluster roll 11 so AMS can reduce them.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L262-L286',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AMS_SINGLE_MISSILE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'NarcHandler rolls one d6 for AMS/APDS interception and destroys the incoming pod on 1-3.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/NarcHandler.java#L77-L131',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ThunderBoltWeaponHandler rolls one d6 for AMS/APDS interception and destroys the incoming missile on 1-3.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/ThunderBoltWeaponHandler.java#L162-L215',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AMS_AMMO_LIFECYCLE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler decrements AMS ammo, adds AMS heat, marks AMS as used, and branches optional multi-use and PLAYTEST_3 AMS lifecycle rules.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L553-L623',
    sourceVersion: MEGAMEK_AMS_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_AMS_SOURCE_REFS = [
  ...MEGAMEK_AMS_ASSIGNMENT_SOURCE_REFS,
  ...MEGAMEK_AMS_CLUSTER_SOURCE_REFS,
  ...MEGAMEK_AMS_SINGLE_MISSILE_SOURCE_REFS,
  ...MEGAMEK_AMS_AMMO_LIFECYCLE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_ECM_SUITE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Guardian, Clan, and Angel ECM suites with ECM flags and ECM modes.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5630-L5789',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5867-L5945',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ACTIVE_PROBE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Beagle, Bloodhound, and Clan active probes with BAP flags.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5404-L5572',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation: 'MiscType defines Light Active Probe with a BAP flag.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5600-L5627',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  MEGAMEK_ECM_SUITE_SOURCE_REFS[1],
  {
    kind: 'megamek-source',
    citation:
      'Entity.getBAPRange gives Clan Active Probe, Watchdog, and Nova CEWS a 5-hex BAP range.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L6011-L6056',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/MissileWeaponHandler.java#L124-L200',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/lrm/LRMHandler.java#L139-L217',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Mek.java#L3442-L3457',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];
