import {
  mekstationDeviationSourceRef as ewArtemisMekStationRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

export {
  MEGAMEK_LBX_SOURCE_REFS,
  MEGAMEK_MML_SOURCE_REFS,
  MEGAMEK_RAC_SOURCE_REFS,
  MEGAMEK_STREAK_SRM_SOURCE_REFS,
  MEGAMEK_UAC_SOURCE_REFS,
} from './CombatWeaponFamilySourceRefs';

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
  ewArtemisMekStationRef(
    'MekStation UnitHydration hydrates BattleMech stealth armor and ECM suite currentMode/mode/activeMode/modeName into runner state.',
    'src/simulation/runner/UnitHydration.ts#L458-L480',
  ),
  ewArtemisMekStationRef(
    'MekStation createInitialState preserves hydrated ECM modes as operational electronic-warfare suites.',
    'src/simulation/runner/SimulationRunnerState.ts#L100-L142',
  ),
  ewArtemisMekStationRef(
    'MekStation runner tests prove active attacker stealth suppresses Artemis cluster bonuses only when stealth armor has operational own ECM.',
    'src/simulation/runner/__tests__/weaponAttackIndirectFire.04.test.ts#L129-L208',
  ),
  ewArtemisMekStationRef(
    'MekStation critical-hit replay tests prove represented ECM equipment destruction disables the own ECM state required by BattleMech stealth armor.',
    'src/simulation/runner/__tests__/criticalHitEvents.test.ts#L2851-L2934',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
