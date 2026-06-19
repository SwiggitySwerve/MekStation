import { CANONICAL_SPA_LIST, resolveSPAId } from '@/lib/spa';
import { type ISPADefinition } from '@/types/spa/SPADefinition';

import { canonicalSpaScopeSourceRefs } from './CombatCanonicalSpaSourceRefs';
import {
  BIOWARE_PERSONNEL_ONLY_SPA_IDS,
  CANONICAL_ONLY_SPA_SUPPORT,
} from './CombatCanonicalSpaSupport.entries';
import {
  MEKSTATION_EDGE_EXPLOSION_SOURCE_REFS,
  MEKSTATION_EDGE_HEAD_HIT_SOURCE_REFS,
  MEKSTATION_EDGE_TAC_SOURCE_REFS,
  MEGAMEK_EDGE_TRIGGER_SOURCE_REFS,
  MEKSTATION_EDGE_TRIGGER_HELPER_SOURCE_REFS,
} from './CombatEdgeSourceRefs';
import {
  helperOnly,
  integrated,
  outOfScope,
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_NIGHTWALKER_SOURCE_REFS } from './CombatLegacyPilotAbilitySourceRefs';
import {
  MEGAMEK_PROTO_DNI_RUNTIME_BOUNDARY_SOURCE_REFS,
  MEGAMEK_TRIPLE_CORE_PROCESSOR_SOURCE_REFS,
} from './CombatPilotModifierSourceRefs';
import { remapMekStationSourceRef } from './CombatSourceRefAnchorRemap';

const SPA_SUPPORT_BY_ID: Record<string, ICombatFeatureSupportEntry> =
  SPA_COMBAT_SUPPORT;
function cloneForCanonicalSpa(
  spa: ISPADefinition,
  support: ICombatFeatureSupportEntry,
): ICombatFeatureSupportEntry {
  const sourceRefs = mergeSourceRefs(
    support.sourceRefs ?? [],
    canonicalSpaScopeSourceRefs(spa),
  );

  return {
    ...support,
    id: spa.id,
    evidence: `${support.evidence}; canonical SPA catalog id ${spa.id} is covered through the combat SPA support map`,
    sourceRefs,
  };
}

function mergeSourceRefs(
  ...sourceRefGroups: readonly (readonly ICombatFeatureSourceReference[])[]
): readonly ICombatFeatureSourceReference[] {
  return Array.from(
    new Map(
      sourceRefGroups
        .flatMap((sourceRefs) => [...sourceRefs])
        .map((sourceRef) => {
          const remappedSourceRef = remapMekStationSourceRef(sourceRef);
          return [
            `${remappedSourceRef.kind}:${remappedSourceRef.sourceVersion}:${remappedSourceRef.url}:${remappedSourceRef.citation}`,
            remappedSourceRef,
          ];
        }),
    ).values(),
  );
}

function canonicalSpaFallback(spa: ISPADefinition): ICombatFeatureSupportEntry {
  const pipelineList = spa.pipelines.join(', ') || 'none';
  const evidence = `Canonical SPA catalog entry "${spa.displayName}" (${spa.id}) affects pipeline(s): ${pipelineList}`;

  if (spa.source === 'Unofficial' || spa.source === 'Legacy') {
    return outOfScope(
      spa.id,
      evidence,
      'Unofficial and legacy SPA rows are excluded from the official BattleMech validation matrix until explicitly enabled',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'infantry') {
    return outOfScope(
      spa.id,
      evidence,
      'Infantry-scoped SPAs belong in the separate infantry or battle-armor validation matrix',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge' && spa.id.startsWith('edge_when_aero_')) {
    return outOfScope(
      spa.id,
      evidence,
      'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge' && spa.id === 'edge_when_masc_fails') {
    return integrated(
      spa.id,
      `${evidence}; runPSRPhase consumes this trigger for source-backed MASC and Supercharger failure rerolls, spends Edge, emits superseded/reroll evidence, and suppresses failure aftermath when the reroll passes`,
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'bioware') {
    if (BIOWARE_PERSONNEL_ONLY_SPA_IDS.has(spa.id)) {
      return outOfScope(
        spa.id,
        `${evidence}; this bioware row is infantry, prosthetic, sensory-implant, gas-effuser, or capture/self-destruct personnel equipment rather than a BattleMech pilot combat resolver input`,
        'Personnel-only Manei Domini implant rows belong in an infantry/personnel or campaign-capture validation matrix; they are catalog-visible but are not BattleMech combat completion blockers',
        canonicalSpaScopeSourceRefs(spa),
      );
    }

    return helperOnly(
      spa.id,
      evidence,
      'BattleMech-relevant Manei Domini/bioware SPA effects are catalog-visible but not hydrated into BattleMech combat resolvers',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge') {
    return helperOnly(
      spa.id,
      evidence,
      'Trigger-specific Edge SPAs are catalog-visible; BattleMech Edge triggers move row-by-row as runtime evidence proves each trigger-specific path, while aggregate Edge rows stay helper-only until broad coverage is proven',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.source === 'ATOW') {
    return outOfScope(
      spa.id,
      evidence,
      'ATOW/origin-level and aerospace-control SPA effects belong in a separate personnel or aerospace validation matrix instead of the official BattleMech combat blocker inventory',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  return helperOnly(
    spa.id,
    evidence,
    'No combat support entry or resolver consumes this canonical SPA id yet',
    canonicalSpaScopeSourceRefs(spa),
  );
}

function canonicalSpaSupportEntry(
  spa: ISPADefinition,
): ICombatFeatureSupportEntry {
  const directSupport = SPA_SUPPORT_BY_ID[spa.id];
  if (directSupport) return cloneForCanonicalSpa(spa, directSupport);

  const aliasedSupport = Object.values(SPA_COMBAT_SUPPORT).find(
    (entry) => resolveSPAId(entry.id) === spa.id,
  );
  if (aliasedSupport) return cloneForCanonicalSpa(spa, aliasedSupport);

  const canonicalOnlySupport = CANONICAL_ONLY_SPA_SUPPORT[spa.id];
  if (canonicalOnlySupport)
    return cloneForCanonicalSpa(spa, canonicalOnlySupport);

  return canonicalSpaFallback(spa);
}

export const CANONICAL_SPA_COMBAT_SCOPE_SUPPORT = Object.fromEntries(
  CANONICAL_SPA_LIST.map((spa) => [spa.id, canonicalSpaSupportEntry(spa)]),
) satisfies Record<string, ICombatFeatureSupportEntry>;
