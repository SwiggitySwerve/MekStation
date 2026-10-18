import type {
  AITierName,
  IAITierParameters,
  IAITierResourceParameters,
  IAITierCoordinationParameters,
  IAITierObjectiveParameters,
  IAITierAdvancedParameters,
} from './AITierParameters';

import { AI_TIER_REGISTRY } from './AITierCatalog';
import {
  DEFAULT_TIER_NAME,
  INERT_RESOURCE_PARAMETERS,
  INERT_COORDINATION_PARAMETERS,
  INERT_OBJECTIVE_PARAMETERS,
  INERT_ADVANCED_PARAMETERS,
} from './AITierDefaults';

/**
 * Look up a tier's parameter record by name. Throws an explicit error when
 * the name is not in the registry so callers get a clear diagnostic rather
 * than a silent `undefined` access.
 *
 * Per spec scenario "Unknown tier name throws" — the error names the invalid
 * tier and lists the valid tiers. Mirrors `getBehaviorVariant`.
 */
export function getTierParameters(name: AITierName): IAITierParameters {
  const params = AI_TIER_REGISTRY[name];
  // The TypeScript type already constrains `name` to AITierName, but the
  // runtime check is retained for safety when the value comes from an
  // untyped source (e.g. a serialized game-session config or CLI flag).
  if (!params) {
    throw new Error(
      `Unknown AI tier: "${name}". Valid tiers: ${Object.keys(
        AI_TIER_REGISTRY,
      ).join(', ')}`,
    );
  }
  return params;
}

/**
 * Resolve the tier parameters for an optional tier name, falling back to the
 * default tier (`Regular`) when the name is absent.
 *
 * Used by `MoveAI` so an `IBotBehavior` without an explicit `tier` resolves
 * to `Regular` — the legacy-scorer tier — preserving pre-change behavior for
 * every existing caller and test fixture.
 */
export function resolveTierParameters(
  name: AITierName | undefined,
): IAITierParameters {
  return getTierParameters(name ?? DEFAULT_TIER_NAME);
}

/**
 * Resolve the A2 resource-planning block for a tier parameter record,
 * falling back to `INERT_RESOURCE_PARAMETERS` when the record predates A2
 * (the optional `resource` field is absent).
 *
 * Used by `AttackAI` so a hand-rolled `IAITierParameters` fixture without a
 * `resource` block resolves to fully-inert resource planning — the legacy
 * bot behavior — rather than throwing on an undefined access. Every entry in
 * `AI_TIER_REGISTRY` populates `resource`, so production callers always get
 * the real tier values.
 */
export function resolveResourceParameters(
  params: IAITierParameters,
): IAITierResourceParameters {
  return params.resource ?? INERT_RESOURCE_PARAMETERS;
}

/**
 * Resolve the A3a coordination block for a tier parameter record, falling
 * back to `INERT_COORDINATION_PARAMETERS` when the record predates A3a (the
 * optional `coordination` field is absent).
 *
 * Used by `BotPlayer` and `MoveAI` so a hand-rolled `IAITierParameters`
 * fixture without a `coordination` block resolves to fully-inert
 * coordination — the per-unit (A1+A2) bot behavior — rather than throwing on
 * an undefined access. Every entry in `AI_TIER_REGISTRY` populates
 * `coordination`, so production callers always get the real tier values.
 */
export function resolveCoordinationParameters(
  params: IAITierParameters,
): IAITierCoordinationParameters {
  return params.coordination ?? INERT_COORDINATION_PARAMETERS;
}

/**
 * Resolve the A3b objective-awareness block for a tier parameter record,
 * falling back to `INERT_OBJECTIVE_PARAMETERS` when the record predates A3b
 * (the optional `objective` field is absent).
 *
 * Used by `BotPlayer`, `AILancePlanner`, and `MoveAI` so a hand-rolled
 * `IAITierParameters` fixture without an `objective` block resolves to
 * fully-inert objective awareness — the `Destroy`-only bot — rather than
 * throwing on an undefined access. Every entry in `AI_TIER_REGISTRY`
 * populates `objective`, so production callers always get the real tier
 * values.
 */
export function resolveObjectiveParameters(
  params: IAITierParameters,
): IAITierObjectiveParameters {
  return params.objective ?? INERT_OBJECTIVE_PARAMETERS;
}

/**
 * Resolve the A4 advanced-systems block for a tier parameter record, falling
 * back to `INERT_ADVANCED_PARAMETERS` when the record predates A4 (the
 * optional `advanced` field is absent).
 *
 * Used by `BotPlayer` and `MoveAI` so a hand-rolled `IAITierParameters`
 * fixture without an `advanced` block resolves to fully-inert advanced
 * systems — the bot keeps the flat-probability jump roll and the jump /
 * ECM / vision terms contribute nothing — rather than throwing on an
 * undefined access. Every entry in `AI_TIER_REGISTRY` populates `advanced`,
 * so production callers always get the real tier values.
 */
export function resolveAdvancedParameters(
  params: IAITierParameters,
): IAITierAdvancedParameters {
  return params.advanced ?? INERT_ADVANCED_PARAMETERS;
}
