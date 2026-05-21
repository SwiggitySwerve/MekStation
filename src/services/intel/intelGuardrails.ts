/**
 * Intel Guardrails — defense-in-depth secret-leak detector.
 *
 * `assertNoLeakedSecrets` is called by `useUnitInspectorProjection` before
 * returning any opponent projection. It throws when an exact numeric field
 * leaks through at a tier that should have redacted it.
 *
 * Only active in non-production environments (process.env.NODE_ENV !== 'production').
 * In production the function is a no-op — the data-level projection logic in
 * `useUnitInspectorProjection` is the primary enforcement; this is a secondary
 * safety net that surfaces logic bugs during development and testing.
 *
 * Per the spec requirement "exact hidden fields SHALL not be recoverable from
 * labels, tooltips, DOM text, ARIA text, or test ids":
 *
 *   - 'hidden' / 'unknown' tier: projection MUST be IRedactedInspectorView
 *     (no name, no chassis, no heat, no armor, no structure).
 *   - 'silhouette' tier: projection name and chassis MUST be null.
 *   - 'gm' tier: only allowed when shellMode is 'gm' — enforced externally;
 *     this guard confirms the projection kind matches the tier.
 *
 * @spec openspec/changes/add-configurable-opponent-intel-ui/specs/fog-of-war/spec.md §3.1
 */

import type { IInspectorProjection } from '@/types/gameplay/TacticalInspectorInterfaces';
import type { OpponentIntelTier } from '@/types/gameplay/TacticalShellInterfaces';

// =============================================================================
// Guard function
// =============================================================================

/**
 * Assert that `projection` does not contain any exact fields that the
 * `tier` is supposed to redact.
 *
 * Throws a descriptive `Error` in non-production builds; silently returns in
 * production so guard bugs cannot surface as runtime crashes for end users.
 *
 * @param projection  The projection returned by `useUnitInspectorProjection`.
 * @param tier        The active `OpponentIntelTier` that produced the projection.
 */
export function assertNoLeakedSecrets(
  projection: IInspectorProjection,
  tier: OpponentIntelTier,
): void {
  // No-op in production — data-level logic is the primary gate.
  if (process.env.NODE_ENV === 'production') return;

  // Friendly projections are always allowed full exact state — no guard needed.
  if (projection.kind === 'friendly') return;

  // 'hidden' / 'unknown' MUST produce a 'redacted' projection. Any other kind
  // means exact state leaked through.
  if (tier === 'hidden' || tier === 'unknown') {
    if (projection.kind !== 'redacted') {
      throw new Error(
        `[intelGuardrails] Tier '${tier}' produced projection kind '${projection.kind}'. ` +
          `Expected 'redacted'. Exact state has leaked through the intel policy gate.`,
      );
    }
    // Redacted projection is correct — nothing more to check.
    return;
  }

  // 'silhouette' MUST have null name and chassis — no identity leak.
  if (tier === 'silhouette') {
    if (projection.kind !== 'target') {
      throw new Error(
        `[intelGuardrails] Tier 'silhouette' produced projection kind '${projection.kind}'. ` +
          `Expected 'target'.`,
      );
    }
    if (projection.name !== null) {
      throw new Error(
        `[intelGuardrails] Tier 'silhouette' projection has non-null 'name' ("${projection.name}"). ` +
          `Unit identity leaked. Projection must carry name: null at silhouette tier.`,
      );
    }
    if (projection.chassis !== null) {
      throw new Error(
        `[intelGuardrails] Tier 'silhouette' projection has non-null 'chassis' ("${projection.chassis}"). ` +
          `Chassis designator leaked. Projection must carry chassis: null at silhouette tier.`,
      );
    }
    return;
  }

  // 'gm' MUST produce a 'gm' projection (never 'target' or 'friendly').
  if (tier === 'gm') {
    if (projection.kind !== 'gm') {
      throw new Error(
        `[intelGuardrails] Tier 'gm' produced projection kind '${projection.kind}'. ` +
          `Expected 'gm'. GM-shell viewers must receive the privileged GM projection.`,
      );
    }
    return;
  }

  // 'exact', 'rough', 'last-known' — all produce 'target' projections.
  if (projection.kind !== 'target') {
    throw new Error(
      `[intelGuardrails] Tier '${tier}' produced projection kind '${projection.kind}'. ` +
        `Expected 'target'.`,
    );
  }

  // 'rough' and 'last-known': exact numeric fields must be null.
  if (tier === 'rough' || tier === 'last-known') {
    if (projection.heat !== null) {
      throw new Error(
        `[intelGuardrails] Tier '${tier}' projection has non-null 'heat' (${projection.heat}). ` +
          `Exact heat value leaked. Must be null at '${tier}' tier.`,
      );
    }
    if (projection.totalArmorRemaining !== null) {
      throw new Error(
        `[intelGuardrails] Tier '${tier}' projection has non-null 'totalArmorRemaining' ` +
          `(${projection.totalArmorRemaining}). Exact armor leaked. Must be null at '${tier}' tier.`,
      );
    }
    if (projection.totalStructureRemaining !== null) {
      throw new Error(
        `[intelGuardrails] Tier '${tier}' projection has non-null 'totalStructureRemaining' ` +
          `(${projection.totalStructureRemaining}). Exact structure leaked. Must be null at '${tier}' tier.`,
      );
    }
  }
}
