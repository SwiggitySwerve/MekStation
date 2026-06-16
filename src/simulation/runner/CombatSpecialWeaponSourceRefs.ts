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
const MEKSTATION_SPECIAL_WEAPON_SOURCE_VERSION = 'MekStation working-tree';

function mekstationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: MEKSTATION_SPECIAL_WEAPON_SOURCE_VERSION,
  };
}

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

export const MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS = [
  ...MEGAMEK_INARC_POD_TYPE_SOURCE_REFS,
  {
    kind: 'megamek-source',
    citation:
      'INarcPod equality and target ids treat same-team same-type pods as interchangeable targets while preserving location on the pod object.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/INarcPod.java#L73-L149',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Entity attaches pending iNarc pods, exposes attached iNarc pods, and removes targeted iNarc pods.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L7317-L7387',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const INARC_POD_BRUSH_OFF_REMOVAL_SOURCE_REFS = [
  ...MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  mekstationRef(
    'MekStation runner physical Brush-Off removes the selected same-team same-type iNarc pod, preserving legacy first-pod removal when no selector is present.',
    'src/simulation/runner/phases/physicalAttack.ts#L216-L240',
  ),
  mekstationRef(
    'MekStation interactive physical declarations and resolutions carry Brush-Off selectedINarcPod state from the context or first attached pod.',
    'src/utils/gameplay/gameSessionPhysical.ts#L543-L549',
  ),
  mekstationRef(
    'MekStation physical attack events persist selectedINarcPod identity on declared and resolved Brush-Off payloads.',
    'src/types/gameplay/GameSessionAttackEvents.ts#L667-L715',
  ),
  mekstationRef(
    'MekStation runner tests prove selected Brush-Off declaration and resolution remove the matching iNarc pod while preserving nonmatching pods.',
    'src/simulation/runner/__tests__/physicalAttackRunner.behavior.test.ts#L901-L1039',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const INARC_POD_BRUSH_OFF_TARGET_SELECTION_SOURCE_REFS = [
  ...MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  mekstationRef(
    'MekStation special-weapon helpers build carrier-scoped Brush-Off target rows for deduped attached iNarc pods while preserving the selected pod object identity.',
    'src/utils/gameplay/specialWeaponMechanics/iNarcPodLifecycle.ts#L8-L53',
  ),
  mekstationRef(
    'MekStation physical attack panel maps a selected pod target row back to the carrier target id plus selectedINarcPod for the existing declaration path.',
    'src/components/gameplay/PhysicalAttackPanel.tsx#L150-L262',
  ),
  mekstationRef(
    'MekStation helper tests prove same-team same-type pod target dedupe and stable carrier-scoped Brush-Off target option ids.',
    'src/utils/gameplay/__tests__/specialWeaponMechanics.test.ts#L908-L986',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_INARC_EXPLOSIVE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'AmmoType defines iNarc Explosive Pods as INARC explosive ammo with 6 damage and rack size 1.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/AmmoType.java#L9997-L10006',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'NarcWeapon routes NARC/iNARC explosive munition attacks through NarcExplosiveHandler instead of the marker-attachment handler.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/other/NarcWeapon.java#L89-L95',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'NarcExplosiveHandler resolves iNarc explosive pod hits as one pod and 6 damage per hit.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/NarcExplosiveHandler.java#L71-L146',
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

export const MEGAMEK_INARC_ECM_SENSOR_EFFECT_SOURCE_REFS = [
  ...MEGAMEK_INARC_ECM_SOURCE_REFS,
  {
    kind: 'megamek-source',
    citation:
      'MegaMek sensor range-bracket checks add active sensor ECM modifiers for the detecting unit and target ECM modifiers for the detected entity.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/Compute.java#L4931-L4970',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Sensor.getModForECM and getModForTargetECM route sensor-check ECM penalties through ComputeECM effects.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/Sensor.java#L430-L455',
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

export const MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS = [
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
      'MegaMek HeatResolver caps external heat at the configured/default 15 points before adding heat buildup.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/HeatResolver.java#L347-L357',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PLASMA_CANNON_RESIDUAL_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'PlasmaCannonHandler keeps plasma-cannon BattleMech damage at zero while applying non-Mek/terrain/building special damage paths.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/plasma/PlasmaCannonHandler.java#L276-L382',
    sourceVersion: MEGAMEK_DESIGNATOR_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_PLASMA_CANNON_SOURCE_REFS = [
  ...MEGAMEK_PLASMA_CANNON_BATTLEMECH_TARGET_HEAT_SOURCE_REFS,
  ...MEGAMEK_PLASMA_CANNON_RESIDUAL_SOURCE_REFS,
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
      'Entity.getBAPRange gives Clan Active Probe, Watchdog, and Nova CEWS a 5-hex BAP range and adds +1 range for Eagle Eyes.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L6011-L6063',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_NOVA_CEWS_NETWORK_SOURCE_REFS = [
  MEGAMEK_ECM_SUITE_SOURCE_REFS[1],
  {
    kind: 'megamek-source',
    citation:
      'MiscType defines Nova CEWS with F_NOVA and ANY_C3 in addition to ECM and BAP flags.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L5912-L5924',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'ComputeC3Spotter treats Nova as a C3-type network for range calculation when the attacker has active Nova CEWS.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/compute/ComputeC3Spotter.java#L53-L65',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'Entity places active Nova CEWS units on C3Nova network ids and matches Nova network membership through C3 network state.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L6479-L6482',
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

export const MEGAMEK_ARTEMIS_FCS_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MiscType.createISArtemisIV defines Artemis IV FCS with F_ARTEMIS.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L6248-L6274',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MiscType.createISProtoArtemis defines Prototype Artemis IV FCS with F_ARTEMIS_PROTO.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L6276-L6295',
    sourceVersion: MEGAMEK_ELECTRONIC_WARFARE_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MiscType.createISArtemisV defines Artemis V FCS with F_ARTEMIS_V.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/MiscType.java#L6297-L6326',
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

export const MEKSTATION_ARTEMIS_STEALTH_LIFECYCLE_SOURCE_REFS = [
  ...MEGAMEK_STEALTH_ACTIVE_SOURCE_REFS,
  ...MEGAMEK_ARTEMIS_CLUSTER_SOURCE_REFS,
  mekstationRef(
    'MekStation UnitHydration hydrates BattleMech stealth armor and ECM suite currentMode/mode/activeMode/modeName into runner state.',
    'src/simulation/runner/UnitHydration.ts#L458-L480',
  ),
  mekstationRef(
    'MekStation createInitialState preserves hydrated ECM modes as operational electronic-warfare suites.',
    'src/simulation/runner/SimulationRunnerState.ts#L100-L142',
  ),
  mekstationRef(
    'MekStation runner tests prove active attacker stealth suppresses Artemis cluster bonuses only when stealth armor has operational own ECM.',
    'src/simulation/runner/__tests__/weaponAttackIndirectFire.test.ts#L813-L891',
  ),
  mekstationRef(
    'MekStation critical-hit replay tests prove represented ECM equipment destruction disables the own ECM state required by BattleMech stealth armor.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2851-L2934',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
