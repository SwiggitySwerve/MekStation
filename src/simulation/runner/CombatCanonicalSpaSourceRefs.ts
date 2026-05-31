import type { ISPADefinition } from '@/types/spa/SPADefinition';

import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import {
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';

const MEGAMEK_CANONICAL_SPA_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_CANONICAL_SPA_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_CANONICAL_SPA_SOURCE_VERSION,
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

const MEKSTATION_CANONICAL_SPA_CATALOG_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
    'src/lib/spa/canonicalCatalog.ts#L1-L54',
  ),
  mekstationDeviationRef(
    'MekStation SPA builder defaults supply category, source, XP, pipeline, and designation defaults used by canonical SPA rows that do not override them.',
    'src/lib/spa/catalog/builders.ts#L12-L75',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_COMMON_BATTLEMECH_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers the piloting, gunnery, miscellaneous, ATOW, infantry, and source-backed Edge pilot options mirrored by MekStation canonical SPA scope rows.',
    'megamek/src/megamek/common/options/PilotOptions.java#L60-L154',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines the piloting, gunnery, miscellaneous, ATOW, infantry, unofficial, Edge, and Manei Domini option ids mirrored by MekStation canonical SPA ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L279',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PILOTING_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers piloting and physical-combat pilot advantages, including Melee Master, Melee Specialist, Terrain Master variants, Zweihander, and ATOW G-Tolerance.',
    'megamek/src/megamek/common/options/PilotOptions.java#L60-L79',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines piloting SPA ids from aptitude_gunnery through atow_g_tolerance.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L190',
  ),
  mekstationDeviationRef(
    'MekStation piloting SPA table defines the canonical piloting, defensive, physical-combat, Terrain Master, and ATOW G-Tolerance rows consumed by canonicalPilotAbilityScope.',
    'src/lib/spa/catalog/pilotingSPAs.ts#L10-L143',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_GUNNERY_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers gunnery pilot advantages, including Blood Stalker, Cluster Hitter, Specialist, Oblique variants, Range Master, Sandblaster, Sniper, and Weapon Specialist.',
    'megamek/src/megamek/common/options/PilotOptions.java#L80-L93',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines gunnery SPA ids from blood_stalker through weapon_specialist.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L191-L204',
  ),
  mekstationDeviationRef(
    'MekStation gunnery SPA table defines the canonical gunnery rows consumed by canonicalPilotAbilityScope.',
    'src/lib/spa/catalog/gunnerySPAs.ts#L10-L103',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MISCELLANEOUS_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers miscellaneous, toughness, tactical, and ATOW pilot advantages including Eagle Eyes, Environmental Specialist, Forward Observer, Iron Man, Pain Resistance, Tactical Genius, Combat Sense, and Combat Paralysis.',
    'megamek/src/megamek/common/options/PilotOptions.java#L95-L104',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines miscellaneous, toughness, tactical, and ATOW SPA ids from eagle_eyes through atow_combat_paralysis.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L206-L216',
  ),
  mekstationDeviationRef(
    'MekStation miscellaneous and ATOW SPA tables define the canonical support, toughness, tactical, and ATOW rows consumed by canonicalPilotAbilityScope.',
    'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L10-L119',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_INFANTRY_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers Foot Cavalry and Urban Guerrilla inside the pilot-advantage group while MekStation partitions them out of the BattleMech combat matrix.',
    'megamek/src/megamek/common/options/PilotOptions.java#L106-L108',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines INFANTRY_FOOT_CAV and INFANTRY_URBAN_GUERRILLA as infantry ability ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L217-L220',
  ),
  mekstationDeviationRef(
    'MekStation infantry SPA table defines Foot Cavalry and Urban Guerrilla as canonical rows that remain out-of-scope for the BattleMech matrix.',
    'src/lib/spa/catalog/miscAndInfantrySPAs.ts#L65-L90',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_BIOWARE_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers Manei Domini, prosthetic limb, proto DNI, and suicide implant options in the MDAdvantages group.',
    'megamek/src/megamek/common/options/PilotOptions.java#L157-L188',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines Manei Domini, prosthetic limb, proto DNI, and suicide implant option ids.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L252-L279',
  ),
  mekstationDeviationRef(
    'MekStation bioware SPA table defines Manei Domini and prosthetic rows as canonical catalog-visible entries that are not hydrated into BattleMech combat resolvers.',
    'src/lib/spa/catalog/biowareSPAs.ts#L10-L168',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_UNOFFICIAL_SPA_SOURCE_REFS = [
  megamekRef(
    'MegaMek PilotOptions registers unofficial SPA ids that MekStation excludes from the official BattleMech validation matrix until explicitly enabled.',
    'megamek/src/megamek/common/options/PilotOptions.java#L110-L121',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines the unofficial SPA ids from ei_implant through small_pilot.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L221-L233',
  ),
  mekstationDeviationRef(
    'MekStation unofficial SPA table defines legacy and unofficial rows that canonicalPilotAbilityScope marks out-of-scope for the official BattleMech validation matrix.',
    'src/lib/spa/catalog/unofficialSPAs.ts#L10-L96',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_EDGE_SPA_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope keeps Mek Edge triggers helper-only except for MASC/Supercharger reroll consumption and splits Aero Edge triggers out-of-scope.',
    'src/lib/spa/catalog/edgeSPAs.ts#L10-L67',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

function sourceSpecificRefs(
  spa: ISPADefinition,
): readonly ICombatFeatureSourceReference[] {
  if (spa.source === 'Unofficial' || spa.source === 'Legacy') {
    return MEGAMEK_UNOFFICIAL_SPA_SOURCE_REFS;
  }

  if (spa.source === 'ATOW') return MEGAMEK_MISCELLANEOUS_SPA_SOURCE_REFS;

  return [];
}

function categorySpecificRefs(
  spa: ISPADefinition,
): readonly ICombatFeatureSourceReference[] {
  if (spa.category === 'gunnery') return MEGAMEK_GUNNERY_SPA_SOURCE_REFS;
  if (spa.category === 'infantry') return MEGAMEK_INFANTRY_SPA_SOURCE_REFS;
  if (spa.category === 'bioware') return MEGAMEK_BIOWARE_SPA_SOURCE_REFS;
  if (spa.category === 'edge') {
    return [
      ...MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
      ...MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
      ...MEKSTATION_EDGE_SPA_SOURCE_REFS,
    ];
  }

  if (
    spa.category === 'miscellaneous' ||
    spa.category === 'toughness' ||
    spa.category === 'tactical'
  ) {
    return MEGAMEK_MISCELLANEOUS_SPA_SOURCE_REFS;
  }

  return MEGAMEK_PILOTING_SPA_SOURCE_REFS;
}

function uniqueSourceRefs(
  refs: readonly ICombatFeatureSourceReference[],
): readonly ICombatFeatureSourceReference[] {
  return Array.from(
    new Map(refs.map((ref) => [`${ref.kind}:${ref.url}`, ref])).values(),
  );
}

export function canonicalSpaScopeSourceRefs(
  spa: ISPADefinition,
): readonly ICombatFeatureSourceReference[] {
  return uniqueSourceRefs([
    ...MEKSTATION_CANONICAL_SPA_CATALOG_SOURCE_REFS,
    ...MEGAMEK_COMMON_BATTLEMECH_SPA_SOURCE_REFS,
    ...sourceSpecificRefs(spa),
    ...categorySpecificRefs(spa),
  ]);
}
