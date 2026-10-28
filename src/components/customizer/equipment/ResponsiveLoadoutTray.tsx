/**
 * Responsive Loadout Tray Component
 *
 * Wrapper that switches between GlobalLoadoutTray (desktop sidebar) and
 * BottomSheetTray (mobile bottom sheet) based on screen size.
 *
 * Responsive behavior:
 * - Mobile (<768px): Bottom sheet with simple expand/collapse toggle
 * - Desktop (768px+): Sidebar with expand/collapse toggle
 *
 * Both states are persisted to localStorage so user preferences are remembered.
 * No auto-collapse behavior - only changes state on explicit user interaction.
 *
 * Uses CSS-based responsive display (md: breakpoint) for smooth transitions
 * without layout shift on resize.
 *
 * @spec openspec/changes/pwa-implementation-tasks.md - Phase 3.3
 * @spec openspec/specs/customizer-responsive-layout/spec.md
 */

import React, { useId } from 'react';

import { MechLocation } from '@/types/construction';

import type { MobileLoadoutStats } from '../mobile';

import { ModalOverlay } from '../dialogs/ModalOverlay';
import { BottomSheetTray } from './BottomSheetTray';
import {
  GlobalLoadoutTray,
  LoadoutEquipmentItem,
  AvailableLocation,
} from './GlobalLoadoutTray';

// =============================================================================
// Types
// =============================================================================

export interface ResponsiveLoadoutTrayProps {
  /** Equipment items to display */
  equipment: LoadoutEquipmentItem[];
  /** Hide only the desktop sidebar; the mobile drawer remains available. */
  hideDesktopSidebar?: boolean;
  drawerOpen?: boolean;
  onCloseDrawer?: () => void;
  openRequest?: number;
  /** Total equipment count */
  equipmentCount: number;
  /** Called when equipment is removed */
  onRemoveEquipment: (instanceId: string) => void;
  /** Called when removing all equipment */
  onRemoveAllEquipment: () => void;
  /** Whether the desktop sidebar is expanded */
  isExpanded: boolean;
  /** Toggle desktop sidebar expansion */
  onToggleExpand: () => void;
  /** Currently selected equipment ID */
  selectedEquipmentId?: string | null;
  /** Called when equipment is selected */
  onSelectEquipment?: (instanceId: string | null) => void;
  /** Called to unassign equipment from its slot */
  onUnassignEquipment?: (instanceId: string) => void;
  /** Called for quick assignment to a specific location */
  onQuickAssign?: (instanceId: string, location: MechLocation) => void;
  /** Available locations with slot info for context menu */
  availableLocations?: AvailableLocation[];
  /** Function to get available locations for any equipment item */
  getAvailableLocationsForEquipment?: (
    instanceId: string,
  ) => AvailableLocation[];
  /** Whether this is an OmniMech */
  isOmni?: boolean;
  /** Unit stats for mobile status bar */
  mobileStats?: MobileLoadoutStats;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Responsive loadout tray that switches between sidebar (desktop) and
 * bottom sheet (mobile) layouts.
 *
 * - Mobile (<768px): Bottom sheet with simple toggle
 * - Desktop (768px+): Sidebar with expand/collapse
 *
 * State is persisted to localStorage - no auto-collapse behavior.
 */
export function ResponsiveLoadoutTray({
  equipment,
  hideDesktopSidebar = false,
  drawerOpen = false,
  onCloseDrawer = () => undefined,
  openRequest = 0,
  equipmentCount,
  onRemoveEquipment,
  onRemoveAllEquipment,
  isExpanded,
  onToggleExpand,
  selectedEquipmentId,
  onSelectEquipment,
  onUnassignEquipment,
  onQuickAssign,
  availableLocations = [],
  getAvailableLocationsForEquipment,
  isOmni = false,
  mobileStats,
}: ResponsiveLoadoutTrayProps): React.ReactElement {
  const drawerTitleId = useId();
  // No auto-collapse behavior - state is persisted and only changed by user interaction

  return (
    <>
      {/* Desktop/Tablet: Sidebar tray (hidden on mobile) */}
      <div className={hideDesktopSidebar ? 'hidden' : 'hidden h-full md:flex'}>
        <GlobalLoadoutTray
          equipment={equipment}
          equipmentCount={equipmentCount}
          onRemoveEquipment={onRemoveEquipment}
          onRemoveAllEquipment={onRemoveAllEquipment}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          selectedEquipmentId={selectedEquipmentId}
          onSelectEquipment={onSelectEquipment}
          onUnassignEquipment={onUnassignEquipment}
          onQuickAssign={onQuickAssign}
          availableLocations={availableLocations}
          getAvailableLocationsForEquipment={getAvailableLocationsForEquipment}
          isOmni={isOmni}
        />
      </div>

      {drawerOpen && hideDesktopSidebar && (
        <ModalOverlay
          isOpen
          fullScreen
          onClose={onCloseDrawer}
          ariaLabelledBy={drawerTitleId}
          className="!bg-surface-deep/80"
        >
          <h2 id={drawerTitleId} className="sr-only">
            Unit Loadout
          </h2>
          <div className="flex h-full justify-end">
            <button
              type="button"
              aria-label="Close loadout drawer"
              onClick={onCloseDrawer}
              className="min-w-11 flex-1"
            />
            <GlobalLoadoutTray
              equipment={equipment}
              equipmentCount={equipmentCount}
              onRemoveEquipment={onRemoveEquipment}
              onRemoveAllEquipment={onRemoveAllEquipment}
              isExpanded
              onToggleExpand={onCloseDrawer}
              selectedEquipmentId={selectedEquipmentId}
              onSelectEquipment={onSelectEquipment}
              onUnassignEquipment={onUnassignEquipment}
              onQuickAssign={onQuickAssign}
              availableLocations={availableLocations}
              getAvailableLocationsForEquipment={
                getAvailableLocationsForEquipment
              }
              isOmni={isOmni}
              className="!w-80 max-w-[calc(100vw-3rem)]"
            />
          </div>
        </ModalOverlay>
      )}

      {/* Mobile: Bottom sheet tray (hidden on desktop) */}
      <div className="md:hidden">
        <BottomSheetTray
          openRequest={openRequest}
          equipment={equipment}
          equipmentCount={equipmentCount}
          onRemoveEquipment={onRemoveEquipment}
          onRemoveAllEquipment={onRemoveAllEquipment}
          selectedEquipmentId={selectedEquipmentId}
          onSelectEquipment={onSelectEquipment}
          onUnassignEquipment={onUnassignEquipment}
          onQuickAssign={onQuickAssign}
          availableLocations={availableLocations}
          getAvailableLocationsForEquipment={getAvailableLocationsForEquipment}
          isOmni={isOmni}
          stats={mobileStats}
        />
      </div>
    </>
  );
}

export default ResponsiveLoadoutTray;
