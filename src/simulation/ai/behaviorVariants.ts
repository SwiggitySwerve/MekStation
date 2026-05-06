/**
 * Named AI behavior variant registry.
 *
 * Per `add-encounter-swarm-harness` design D4: exposes four preset
 * `IBotBehavior` configurations the swarm harness selects by name via
 * `--ai-side-a` / `--ai-side-b` CLI flags.
 *
 * The `default` preset mirrors `DEFAULT_BEHAVIOR` from `types.ts` exactly
 * so any existing callsite that does not opt into a variant produces
 * byte-identical battle traces to the pre-swarm code.
 */

import type { IBotBehavior } from './types';

/** Union of valid variant names accepted by the CLI swarm runner. */
export type AIVariantName =
  | 'default'
  | 'aggressive'
  | 'defensive'
  | 'skirmisher';

/**
 * Registry of named behavior presets.
 *
 * - `default`:    retreatThreshold 0.3, safeHeatThreshold 13 — matches
 *                 DEFAULT_BEHAVIOR byte-for-byte (per spec "Default preset
 *                 preserves existing behavior").
 * - `aggressive`: retreatThreshold 0.7, safeHeatThreshold 18 — fights longer,
 *                 fires hotter; lower retreat propensity at 50% structural loss.
 * - `defensive`:  retreatThreshold 0.3, safeHeatThreshold 10 — conservative
 *                 heat management; drops highest-heat weapons sooner.
 * - `skirmisher`: retreatThreshold 0.4, safeHeatThreshold 11 — moderate heat
 *                 caution, slightly earlier retreat than default.
 */
export const BEHAVIOR_VARIANTS: Readonly<Record<AIVariantName, IBotBehavior>> =
  {
    default: {
      retreatThreshold: 0.3,
      retreatEdge: 'nearest',
      safeHeatThreshold: 13,
    },
    aggressive: {
      retreatThreshold: 0.7,
      retreatEdge: 'nearest',
      safeHeatThreshold: 18,
    },
    defensive: {
      retreatThreshold: 0.3,
      retreatEdge: 'nearest',
      safeHeatThreshold: 10,
    },
    skirmisher: {
      retreatThreshold: 0.4,
      retreatEdge: 'nearest',
      safeHeatThreshold: 11,
    },
  };

/**
 * Look up a behavior preset by name. Throws an explicit error when the name
 * is not in the registry so callers get a clear diagnostic rather than a
 * silent `undefined` access.
 *
 * Per spec scenario "Variant lookup with unknown name throws".
 */
export function getBehaviorVariant(name: AIVariantName): IBotBehavior {
  const variant = BEHAVIOR_VARIANTS[name];
  // The TypeScript type already constrains `name` to AIVariantName, but
  // the check is retained for runtime safety when the value comes from
  // an untyped source (e.g. CLI flag parsing).
  if (!variant) {
    throw new Error(
      `Unknown AI variant: "${name}". Valid variants: ${Object.keys(BEHAVIOR_VARIANTS).join(', ')}`,
    );
  }
  return variant;
}
