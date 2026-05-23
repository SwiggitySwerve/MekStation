import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { CANONICAL_SPA_LIST, resolveSPAId } from '@/lib/spa';

import {
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

const SPA_SUPPORT_BY_ID: Record<string, ICombatFeatureSupportEntry> =
  SPA_COMBAT_SUPPORT;

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
): ICombatFeatureSupportEntry {
  return { id, level: 'helper-only', evidence, gap };
}

function unsupported(id: string, gap: string): ICombatFeatureSupportEntry {
  return {
    id,
    level: 'unsupported',
    evidence: 'No combat behavior wired',
    gap,
  };
}

function cloneForCanonicalSpa(
  spa: ISPADefinition,
  support: ICombatFeatureSupportEntry,
): ICombatFeatureSupportEntry {
  return {
    ...support,
    id: spa.id,
    evidence: `${support.evidence}; canonical SPA catalog id ${spa.id} is covered through the combat SPA support map`,
  };
}

function canonicalSpaFallback(spa: ISPADefinition): ICombatFeatureSupportEntry {
  const pipelineList = spa.pipelines.join(', ') || 'none';
  const evidence = `Canonical SPA catalog entry "${spa.displayName}" (${spa.id}) affects pipeline(s): ${pipelineList}`;

  if (spa.source === 'Unofficial') {
    return unsupported(
      spa.id,
      `${evidence}; unofficial SPAs are excluded from the official BattleMech validation matrix until explicitly enabled`,
    );
  }

  if (spa.category === 'infantry') {
    return helperOnly(
      spa.id,
      evidence,
      'Infantry-scoped SPAs belong in the separate infantry or battle-armor validation matrix',
    );
  }

  if (spa.category === 'bioware') {
    return helperOnly(
      spa.id,
      evidence,
      'Manei Domini/bioware SPA effects are catalog-visible but not hydrated into BattleMech combat resolvers',
    );
  }

  if (spa.category === 'edge') {
    return helperOnly(
      spa.id,
      evidence,
      'Trigger-specific Edge SPAs are catalog-visible, but no attack, PSR, consciousness, or critical resolver consumes Edge trigger state',
    );
  }

  if (spa.source === 'ATOW') {
    return helperOnly(
      spa.id,
      evidence,
      'ATOW/origin-level SPA effects are catalog-visible but not hydrated into BattleMech combat resolvers',
    );
  }

  return helperOnly(
    spa.id,
    evidence,
    'No combat support entry or resolver consumes this canonical SPA id yet',
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

  return canonicalSpaFallback(spa);
}

export const CANONICAL_SPA_COMBAT_SCOPE_SUPPORT = Object.fromEntries(
  CANONICAL_SPA_LIST.map((spa) => [spa.id, canonicalSpaSupportEntry(spa)]),
) satisfies Record<string, ICombatFeatureSupportEntry>;
