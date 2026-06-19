import {
  mekstationDeviationSourceRef as designatorMekStationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

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
  designatorMekStationRef(
    'MekStation runner physical Brush-Off removes the selected same-team same-type iNarc pod, preserving legacy first-pod removal when no selector is present.',
    'src/simulation/runner/phases/physicalAttack.ts#L216-L240',
  ),
  designatorMekStationRef(
    'MekStation interactive physical declarations and resolutions carry Brush-Off selectedINarcPod state from the context or first attached pod.',
    'src/utils/gameplay/gameSessionPhysical.ts#L543-L549',
  ),
  designatorMekStationRef(
    'MekStation physical attack events persist selectedINarcPod identity on declared and resolved Brush-Off payloads.',
    'src/types/gameplay/GameSessionAttackEvents.ts#L667-L715',
  ),
  designatorMekStationRef(
    'MekStation runner tests prove selected Brush-Off declaration and resolution remove the matching iNarc pod while preserving nonmatching pods.',
    'src/simulation/runner/__tests__/physicalAttackRunner.behavior.test.ts#L901-L1039',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const INARC_POD_BRUSH_OFF_TARGET_SELECTION_SOURCE_REFS = [
  ...MEGAMEK_INARC_POD_OBJECT_SOURCE_REFS,
  designatorMekStationRef(
    'MekStation special-weapon helpers build carrier-scoped Brush-Off target rows for deduped attached iNarc pods while preserving the selected pod object identity.',
    'src/utils/gameplay/specialWeaponMechanics/iNarcPodLifecycle.ts#L8-L53',
  ),
  designatorMekStationRef(
    'MekStation physical attack panel maps a selected pod target row back to the carrier target id plus selectedINarcPod for the existing declaration path.',
    'src/components/gameplay/PhysicalAttackPanel.tsx#L150-L262',
  ),
  designatorMekStationRef(
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
