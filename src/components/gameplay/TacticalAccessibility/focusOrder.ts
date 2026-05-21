/**
 * Tactical HUD Focus Order
 *
 * Defines the logical tab order for the tactical command shell regions.
 * Consumers assign `tabIndex` values based on the returned rank so that
 * keyboard focus moves in a predictable, reading-order sequence regardless
 * of DOM render order.
 *
 * Order follows the spec's "Tactical Focus Order" requirement (§3.1):
 *   top-band → map-center → bottom-dock → left-tray → right-tray → feed
 *
 * Slots absent from this list (e.g. mobile-drawer, morale-band) are not
 * directly focusable regions — they are sub-surfaces within the above regions
 * or conditionally visible overlays that own their own focus trap.
 *
 * Usage:
 *   import { getTabIndexForSlot } from '@/components/gameplay/TacticalAccessibility/focusOrder';
 *   <div tabIndex={getTabIndexForSlot('map-center')} ... />
 *
 * @spec openspec/changes/add-responsive-tactical-hud-accessibility/specs/accessibility-system/spec.md
 *   "Tactical Focus Order" ADDED requirement — §3.1
 */

import type { SlotId } from '@/types/gameplay/TacticalShellInterfaces';

// =============================================================================
// Tab order constant
// =============================================================================

/**
 * Ordered array of shell slot IDs in focus-sequence order.
 *
 * The base `tabIndex` for a slot is its 0-based position in this array.
 * Using sequential integers (0, 1, 2, …) ensures native browser tab order
 * follows the logical sequence even when slots are positioned out-of-flow by
 * CSS (e.g. a flexbox reversed layout or absolute positioning on the map).
 */
export const TAB_ORDER: readonly SlotId[] = [
  'top-band',
  'map-center',
  'bottom-dock',
  'left-tray',
  'right-tray',
  'feed',
] as const;

// =============================================================================
// Helper
// =============================================================================

/**
 * Returns the `tabIndex` value for a given shell slot.
 *
 * Slots in `TAB_ORDER` receive a value from 0 (top-band) to N-1 (feed).
 * Slots not in the list (morale-band, minimap-cluster, mobile-drawer) receive
 * `-1` so they are removed from the default tab sequence — they are either
 * sub-surfaces with their own focus management or conditionally visible
 * overlays that must not be tab-reachable while hidden.
 *
 * @param slotId - The `SlotId` of the shell region to query.
 * @returns A non-negative integer for ordered slots; -1 for unordered slots.
 */
export function getTabIndexForSlot(slotId: SlotId): number {
  const index = TAB_ORDER.indexOf(slotId);
  return index === -1 ? -1 : index;
}
