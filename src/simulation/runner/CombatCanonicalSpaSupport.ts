import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { CANONICAL_SPA_LIST, resolveSPAId } from '@/lib/spa';

import { canonicalSpaScopeSourceRefs } from './CombatCanonicalSpaSourceRefs';
import {
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

const SPA_SUPPORT_BY_ID: Record<string, ICombatFeatureSupportEntry> =
  SPA_COMBAT_SUPPORT;

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, level: 'helper-only', evidence, gap };
}

function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'out-of-scope', evidence, gap, sourceRefs }
    : { id, level: 'out-of-scope', evidence, gap };
}

const CANONICAL_ONLY_SPA_SUPPORT: Readonly<
  Record<string, ICombatFeatureSupportEntry>
> = {};

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
        .map((sourceRef) => [`${sourceRef.kind}:${sourceRef.url}`, sourceRef]),
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
      'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers remain BattleMech combat gaps until their resolvers consume trigger-specific Edge state',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'bioware') {
    return helperOnly(
      spa.id,
      evidence,
      'Manei Domini/bioware SPA effects are catalog-visible but not hydrated into BattleMech combat resolvers',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.category === 'edge') {
    return helperOnly(
      spa.id,
      evidence,
      'Trigger-specific Edge SPAs are catalog-visible; edge_when_masc_fails is consumed by runner MASC/Supercharger failure rerolls, while attack, other PSR, consciousness, and critical resolvers still do not consume Edge trigger state',
      canonicalSpaScopeSourceRefs(spa),
    );
  }

  if (spa.source === 'ATOW') {
    return helperOnly(
      spa.id,
      evidence,
      'ATOW/origin-level SPA effects are catalog-visible but not hydrated into BattleMech combat resolvers',
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
  if (canonicalOnlySupport) return canonicalOnlySupport;

  return canonicalSpaFallback(spa);
}

export const CANONICAL_SPA_COMBAT_SCOPE_SUPPORT = Object.fromEntries(
  CANONICAL_SPA_LIST.map((spa) => [spa.id, canonicalSpaSupportEntry(spa)]),
) satisfies Record<string, ICombatFeatureSupportEntry>;
