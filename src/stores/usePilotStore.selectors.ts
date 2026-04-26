/**
 * Selector hooks for `usePilotStore`. Extracted from the main store
 * file so the per-file LOC budget stays under the lint warning
 * threshold. The hook signatures + behavior are identical to the
 * original inline implementations.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import { IPilot, PilotStatus } from '@/types/pilot';

import { usePilotStore } from './usePilotStore';

/**
 * Get filtered pilots based on current filters (status + search query).
 * Subscribes to the full store rather than a fine-grained selector
 * because the three filter inputs change together in practice.
 */
export function useFilteredPilots(): IPilot[] {
  const { pilots, showActiveOnly, searchQuery } = usePilotStore();

  let filtered = pilots;

  // Filter by status
  if (showActiveOnly) {
    filtered = filtered.filter((p) => p.status === PilotStatus.Active);
  }

  // Filter by search query (matches name / callsign / affiliation)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.callsign?.toLowerCase().includes(query) ||
        p.affiliation?.toLowerCase().includes(query),
    );
  }

  return filtered;
}

/**
 * Get a pilot by ID. Returns `null` for null ids or unknown ids so
 * callers can pass an optional id straight from URL params.
 */
export function usePilotById(id: string | null): IPilot | null {
  const pilots = usePilotStore((state) => state.pilots);
  if (!id) return null;
  return pilots.find((p) => p.id === id) || null;
}
