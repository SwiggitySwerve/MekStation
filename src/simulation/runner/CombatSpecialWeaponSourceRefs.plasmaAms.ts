import { type ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

export {
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatWeaponFamilySourceRefs';

const MEGAMEK_DESIGNATOR_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

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
