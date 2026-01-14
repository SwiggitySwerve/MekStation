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

import React from 'react';
import { GlobalLoadoutTray, LoadoutEquipmentItem, AvailableLocation } from './GlobalLoadoutTray';
import { BottomSheetTray } from './BottomSheetTray';
import { MechLocation } from '@/types/construction';

// =============================================================================
// Types
// =============================================================================

export interface ResponsiveLoadoutTrayProps {
  /** Equipment items to display */
  equipment: LoadoutEquipmentItem[];
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
  /** Whether this is an OmniMech */
  isOmni?: boolean;
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
  isOmni = false,
}: ResponsiveLoadoutTrayProps): React.ReactElement {
  // No auto-collapse behavior - state is persisted and only changed by user interaction
  
  return (
    <>
      {/* Desktop/Tablet: Sidebar tray (hidden on mobile) */}
      <div className="hidden md:flex h-full">
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
          isOmni={isOmni}
        />
      </div>
      
      {/* Mobile: Bottom sheet tray (hidden on desktop) */}
      <div className="md:hidden">
        <BottomSheetTray
          equipment={equipment}
          equipmentCount={equipmentCount}
          onRemoveEquipment={onRemoveEquipment}
          onRemoveAllEquipment={onRemoveAllEquipment}
          selectedEquipmentId={selectedEquipmentId}
          onSelectEquipment={onSelectEquipment}
          onUnassignEquipment={onUnassignEquipment}
          onQuickAssign={onQuickAssign}
          availableLocations={availableLocations}
          isOmni={isOmni}
        />
      </div>
    </>
  );
}

export default ResponsiveLoadoutTray;
