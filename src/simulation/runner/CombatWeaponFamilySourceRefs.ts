import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEGAMEK_UAC_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'UACWeapon declares Ultra AC ammo, Single/Ultra firing modes, and the UltraWeaponHandler path.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/autoCannons/UACWeapon.java#L65-L83',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'UltraWeaponHandler derives one or two shots from firing mode, resolves cluster hits, and jams two-shot Ultra fire on a natural 2.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/UltraWeaponHandler.java#L83-L168',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_RAC_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'RACWeapon declares Rotary AC ammo, Single/2-6 shot modes, explosive-on-jam behavior, and RACHandler versus UltraWeaponHandler routing.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/autoCannons/RACWeapon.java#L66-L100',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'RACHandler maps selected RAC mode to shot count and applies rate-dependent jam thresholds before reducing ammo.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/RACHandler.java#L77-L147',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_LBX_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'LBXACWeapon routes cluster ammunition to LBXHandler, routes slug fire to ACWeaponHandler, and declares AC_LBX ammo/class metadata.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/autoCannons/LBXACWeapon.java#L82-L105',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'LBXHandler resolves cluster pellet damage, cluster-table hit counts, and cluster-ammo table usage.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/LBXHandler.java#L97-L147',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_STREAK_SRM_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'StreakSRMWeapon declares Streak SRM ammo, removes Artemis compatibility, and routes attacks to StreakHandler.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/srms/StreakSRMWeapon.java#L62-L79',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'StreakHandler suppresses hits/AMS on missed locks, resolves rack-size all-hit behavior, and spends ammo/heat only after a successful lock.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/handlers/StreakHandler.java#L97-L187',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MML_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MMLWeapon declares MML ammo/class metadata and routes linked LRM-mode ammo to LRM handlers and other MML ammo to SRM handlers.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/missiles/MMLWeapon.java#L59-L74',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MMLWeapon exposes indirect-fire modes when the base indirect-fire option is enabled.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/weapons/missiles/MMLWeapon.java#L83-L99',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'AmmoType creates paired MML LRM and SRM ammo entries with MML ammo type and distinct LRM/SRM flags.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/equipment/AmmoType.java#L9273-L9315',
    sourceVersion: MEGAMEK_WEAPON_FAMILY_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];
