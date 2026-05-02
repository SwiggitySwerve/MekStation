/**
 * Pre-join template helper — vault pilot lookup map.
 *
 * Used by processors that iterate the campaign roster and need each
 * iteration's vault `IPilot` resolved by `pilotId`. Built ONCE per pipeline
 * run and passed to per-entry helpers via `pilotLookup.get(entry.pilotId) ?? null`,
 * avoiding the N² `vault.find(p => p.id === entry.pilotId)` that the previous
 * `IPerson` god-type pattern paid per call.
 *
 * Mandated by Council #2 (Cluster E IPerson hard-cutover, decision
 * 2026-05-02). The two-arg helper signature `(entry, pilot | null)` SHALL NOT
 * internally call `vault.find(...)` — helpers receive pre-resolved pilots.
 *
 * @spec openspec/specs/campaign-personnel-architecture/spec.md — Pre-join template requirement
 * @spec openspec/changes/wire-iperson-hard-cutover/design.md — Pre-join template decision
 */

import type { IPilot } from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Pre-join helper
// =============================================================================

/**
 * Build a `Map<pilotId, IPilot>` lookup over the vault pilot list.
 *
 * Linear in `vault.length`. Build once per pipeline run; reuse for every
 * per-entry helper invocation. NPC roster entries (whose `pilotId` is a
 * roster-local identifier with no vault counterpart) resolve to `undefined`
 * via `lookup.get(...)`; callers SHALL coerce to `null` before passing the
 * second argument to two-arg helpers.
 *
 * @example
 * ```ts
 * const pilotsByPilotId = buildPilotLookup(usePilotStore.getState().pilots);
 * for (const entry of useCampaignRosterStore.getState().pilots) {
 *   const pilot = pilotsByPilotId.get(entry.pilotId) ?? null;
 *   helper(entry, pilot);
 * }
 * ```
 *
 * @param vault - The vault pilot list (typically `usePilotStore.getState().pilots`).
 * @returns A `Map` keyed by `IPilot.id`. Empty when `vault` is empty.
 */
export function buildPilotLookup(
  vault: readonly IPilot[],
): Map<string, IPilot> {
  // Direct iteration is cheaper than .map(([k,v]) => …) ↦ new Map(...) for
  // large vaults because we avoid the intermediate tuple array allocation.
  const lookup = new Map<string, IPilot>();
  for (const pilot of vault) {
    lookup.set(pilot.id, pilot);
  }
  return lookup;
}
