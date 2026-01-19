/**
 * Encounter Status Utilities
 * Shared utilities for encounter status display across pages.
 */
import { EncounterStatus } from '@/types/encounter';

/** Badge color variants used by the Badge component */
export type StatusBadgeColor = 'slate' | 'success' | 'warning' | 'info';

/**
 * Get the badge color variant for an encounter status.
 * @param status - The encounter status
 * @returns Badge color variant
 */
export function getStatusColor(status: EncounterStatus): StatusBadgeColor {
  switch (status) {
    case EncounterStatus.Draft:
      return 'slate';
    case EncounterStatus.Ready:
      return 'success';
    case EncounterStatus.Launched:
      return 'info';
    case EncounterStatus.Completed:
      return 'slate';
    default:
      return 'slate';
  }
}

/**
 * Get a human-readable label for an encounter status.
 * @param status - The encounter status
 * @param verbose - If true, returns more descriptive labels (e.g., "Ready to Launch" instead of "Ready")
 * @returns Human-readable status label
 */
export function getStatusLabel(status: EncounterStatus, verbose = false): string {
  switch (status) {
    case EncounterStatus.Draft:
      return 'Draft';
    case EncounterStatus.Ready:
      return verbose ? 'Ready to Launch' : 'Ready';
    case EncounterStatus.Launched:
      return 'In Progress';
    case EncounterStatus.Completed:
      return 'Completed';
    default:
      return status;
  }
}
