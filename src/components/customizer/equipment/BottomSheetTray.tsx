/**
 * Bottom Sheet Tray Component
 *
 * Mobile-optimized equipment tray with two states:
 * 1. Collapsed: Compact status bar showing Weight, Slots, Heat, BV
 * 2. Expanded: Full-screen equipment list with category filters
 *
 * Features:
 * - Always-visible stats bar at bottom
 * - Full-screen expansion for detailed equipment management
 * - Category filtering (Energy, Ballistic, Missile, etc.)
 * - Only shows removable equipment (filters structural items)
 * - Touch-friendly 44px row heights
 *
 * @spec c:\Users\wroll\.cursor\plans\mobile_loadout_full-screen_redesign_00a59d27.plan.md
 */

import React, { useMemo, useCallback } from 'react';
import type { LoadoutEquipmentItem, AvailableLocation } from './GlobalLoadoutTray';
import { MechLocation } from '@/types/construction';
import { usePersistedState, STORAGE_KEYS } from '@/hooks/usePersistedState';
import { 
  MobileLoadoutHeader, 
  MobileLoadoutList,
  MobileLoadoutStats,
  MobileEquipmentItem,
} from '../mobile';

// =============================================================================
// Types
// =============================================================================

interface BottomSheetTrayProps {
  equipment: LoadoutEquipmentItem[];
  equipmentCount: number;
  onRemoveEquipment: (instanceId: string) => void;
  onRemoveAllEquipment: () => void;
  selectedEquipmentId?: string | null;
  onSelectEquipment?: (instanceId: string | null) => void;
  onUnassignEquipment?: (instanceId: string) => void;
  onQuickAssign?: (instanceId: string, location: MechLocation) => void;
  availableLocations?: AvailableLocation[];
  /** Function to get available locations for any equipment item */
  getAvailableLocationsForEquipment?: (instanceId: string) => AvailableLocation[];
  isOmni?: boolean;
  /** Unit stats for the status bar */
  stats?: MobileLoadoutStats;
  className?: string;
}

// =============================================================================
// Default Stats (fallback when not provided)
// =============================================================================

const DEFAULT_STATS: MobileLoadoutStats = {
  weightUsed: 0,
  weightMax: 0,
  slotsUsed: 0,
  slotsMax: 78,
  heatGenerated: 0,
  heatDissipation: 10,
  battleValue: 0,
  equipmentCount: 0,
  unassignedCount: 0,
};

// =============================================================================
// Main Component
// =============================================================================

export function BottomSheetTray({
  equipment,
  equipmentCount,
  onRemoveEquipment,
  onRemoveAllEquipment,
  selectedEquipmentId,
  onSelectEquipment,
  onUnassignEquipment,
  onQuickAssign,
  availableLocations = [],
  getAvailableLocationsForEquipment,
  isOmni = false,
  stats: providedStats,
  className = '',
}: BottomSheetTrayProps): React.ReactElement {
  // Persist expanded state to localStorage
  const [isExpanded, setIsExpanded] = usePersistedState(
    STORAGE_KEYS.LOADOUT_SHEET_EXPANDED,
    false
  );

  // Compute stats from equipment if not provided
  const computedStats: MobileLoadoutStats = useMemo(() => {
    if (providedStats) return providedStats;
    
    const unassignedCount = equipment.filter(e => !e.isAllocated).length;
    const slotsUsed = equipment.reduce((sum, e) => sum + e.criticalSlots, 0);
    const weightUsed = equipment.reduce((sum, e) => sum + e.weight, 0);
    
    return {
      ...DEFAULT_STATS,
      weightUsed,
      slotsUsed,
      equipmentCount,
      unassignedCount,
    };
  }, [providedStats, equipment, equipmentCount]);

  // Convert LoadoutEquipmentItem to MobileEquipmentItem
  const mobileEquipment: MobileEquipmentItem[] = useMemo(() => {
    return equipment.map(item => ({
      instanceId: item.instanceId,
      name: item.name,
      category: item.category,
      weight: item.weight,
      criticalSlots: item.criticalSlots,
      heat: item.heat,
      damage: item.damage,
      ranges: item.ranges,
      isAllocated: item.isAllocated,
      location: item.location,
      isRemovable: item.isRemovable,
      isOmniPodMounted: item.isOmniPodMounted,
      targetingComputerCompatible: item.targetingComputerCompatible,
    }));
  }, [equipment]);

  // Toggle expanded/collapsed
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Close full-screen view
  const handleClose = () => {
    setIsExpanded(false);
  };
  
  // Get available locations for a specific equipment item
  const getAvailableLocationsForItem = useCallback((instanceId: string) => {
    // Use the dedicated function if provided (more accurate, checks per-item restrictions)
    if (getAvailableLocationsForEquipment) {
      const locations = getAvailableLocationsForEquipment(instanceId);
      return locations.map(loc => ({
        location: loc.location as string,
        label: loc.label,
        availableSlots: loc.availableSlots,
        canFit: loc.canFit,
      }));
    }
    
    // Fallback: Filter available locations based on equipment size
    const item = equipment.find(e => e.instanceId === instanceId);
    if (!item) return [];
    
    return availableLocations
      .filter(loc => loc.availableSlots >= item.criticalSlots)
      .map(loc => ({
        location: loc.location as string,
        label: loc.label,
        availableSlots: loc.availableSlots,
        canFit: loc.canFit && loc.availableSlots >= item.criticalSlots,
      }));
  }, [equipment, availableLocations, getAvailableLocationsForEquipment]);
  
  // Handle quick assign with MechLocation type
  const handleQuickAssign = useCallback((instanceId: string, location: string) => {
    if (onQuickAssign) {
      onQuickAssign(instanceId, location as MechLocation);
    }
  }, [onQuickAssign]);

  return (
    <>
      {/* Collapsed State: Status Bar */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-40
          ${className}
        `}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <MobileLoadoutHeader
          stats={computedStats}
          isExpanded={isExpanded}
          onToggle={handleToggle}
        />
      </div>

      {/* Expanded State: Full-Screen List */}
      {isExpanded && (
        <MobileLoadoutList
          equipment={mobileEquipment}
          stats={computedStats}
          isOmni={isOmni}
          selectedEquipmentId={selectedEquipmentId}
          onSelectEquipment={onSelectEquipment}
          onRemoveEquipment={onRemoveEquipment}
          onRemoveAllEquipment={onRemoveAllEquipment}
          onUnassignEquipment={onUnassignEquipment}
          onQuickAssign={onQuickAssign ? handleQuickAssign : undefined}
          getAvailableLocations={getAvailableLocationsForItem}
          onClose={handleClose}
        />
      )}
    </>
  );
}

export default BottomSheetTray;
