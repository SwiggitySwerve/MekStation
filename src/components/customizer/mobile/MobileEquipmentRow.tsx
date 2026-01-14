/**
 * Mobile Equipment Row Component
 * 
 * Compact list row for displaying equipment items in the mobile loadout view.
 * Shows Name, Location, Heat, Crits, Weight with edit/remove actions.
 * Touch-friendly with 44px minimum height for accessibility.
 * 
 * @spec c:\Users\wroll\.cursor\plans\mobile_loadout_full-screen_redesign_00a59d27.plan.md
 */

import React, { useState } from 'react';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryColorsLegacy } from '@/utils/colors/equipmentColors';
import { MechLocation } from '@/types/construction';

// =============================================================================
// Types
// =============================================================================

export interface MobileEquipmentItem {
  instanceId: string;
  name: string;
  category: EquipmentCategory;
  weight: number;
  criticalSlots: number;
  heat?: number;
  damage?: number | string;
  ranges?: {
    minimum: number;
    short: number;
    medium: number;
    long: number;
  };
  isAllocated: boolean;
  location?: string;
  isRemovable: boolean;
  isOmniPodMounted?: boolean;
  /** Whether this weapon is compatible with a Targeting Computer */
  targetingComputerCompatible?: boolean;
}

/** Available location for quick assignment */
export interface AvailableLocationOption {
  location: string;
  label: string;
  availableSlots: number;
  canFit: boolean;
}

interface MobileEquipmentRowProps {
  item: MobileEquipmentItem;
  isSelected?: boolean;
  isOmni?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  onEditLocation?: () => void;
  onUnassign?: () => void;
  /** Quick assign to a location (for unassigned items) */
  onQuickAssign?: (location: string) => void;
  /** Available locations for quick assignment */
  availableLocations?: AvailableLocationOption[];
  /** Whether this item's location menu is open (controlled externally) */
  isLocationMenuOpen?: boolean;
  /** Callback to toggle this item's location menu */
  onToggleLocationMenu?: () => void;
  showActions?: boolean;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/** Convert location names to shorthand (e.g., "Right Torso" -> "RT") */
function getLocationShorthand(location: string): string {
  const shortcuts: Record<string, string> = {
    'Head': 'HD',
    'Center Torso': 'CT',
    'Left Torso': 'LT',
    'Right Torso': 'RT',
    'Left Arm': 'LA',
    'Right Arm': 'RA',
    'Left Leg': 'LL',
    'Right Leg': 'RL',
  };
  return shortcuts[location] || location;
}

/** Format range brackets like "0/3/6/9" or "-/3/6/9" for min range */
function formatRangeBrackets(ranges: { minimum: number; short: number; medium: number; long: number }): string {
  const min = ranges.minimum > 0 ? ranges.minimum : 0;
  return `${min}/${ranges.short}/${ranges.medium}/${ranges.long}`;
}

/** Get range band description based on short range */
function getRangeBand(ranges: { short: number; medium: number }): string {
  // Rough heuristics based on typical BattleTech weapon ranges
  if (ranges.short <= 2) return 'PD'; // Point Defense (very short range)
  if (ranges.short <= 4) return 'Short';
  if (ranges.short <= 7) return 'Medium';
  if (ranges.short <= 12) return 'Long';
  return 'Extreme';
}

// =============================================================================
// Main Component
// =============================================================================

export function MobileEquipmentRow({
  item,
  isSelected = false,
  isOmni = false,
  onSelect,
  onRemove,
  onEditLocation,
  onUnassign,
  onQuickAssign,
  availableLocations = [],
  isLocationMenuOpen = false,
  onToggleLocationMenu,
  showActions = true,
  className = '',
}: MobileEquipmentRowProps): React.ReactElement {
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [showConfirmUnassign, setShowConfirmUnassign] = useState(false);
  const colors = getCategoryColorsLegacy(item.category);
  
  // Check if this is fixed equipment on an OmniMech
  const isFixedOnOmni = isOmni && item.isOmniPodMounted === false;
  
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showConfirmRemove) {
      onRemove?.();
      setShowConfirmRemove(false);
    } else {
      setShowConfirmRemove(true);
      setShowConfirmUnassign(false); // Cancel unassign confirmation
      // Auto-reset after 3 seconds
      setTimeout(() => setShowConfirmRemove(false), 3000);
    }
  };
  
  const handleUnassignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showConfirmUnassign) {
      onUnassign?.();
      setShowConfirmUnassign(false);
    } else {
      setShowConfirmUnassign(true);
      setShowConfirmRemove(false); // Cancel remove confirmation
      // Auto-reset after 3 seconds
      setTimeout(() => setShowConfirmUnassign(false), 3000);
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`
        min-h-[36px] px-2 py-1 flex items-center gap-1.5
        border-b border-border-theme-subtle/30
        ${onSelect ? 'cursor-pointer active:bg-surface-raised/50' : ''}
        ${isSelected ? 'bg-accent/10 border-l-2 border-l-accent' : ''}
        ${isFixedOnOmni ? 'opacity-60' : ''}
        ${className}
      `}
    >
      {/* Category indicator */}
      <div className={`w-1 h-6 rounded-sm flex-shrink-0 ${colors.bg}`} />
      
      {/* Name column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white font-medium truncate">
            {item.name}
          </span>
          {item.damage !== undefined && (
            <span className="text-[9px] text-cyan-400/80 flex-shrink-0">{item.damage}d</span>
          )}
          {item.targetingComputerCompatible && (
            <span className="text-[8px] text-green-400/70 flex-shrink-0">TC</span>
          )}
          {isOmni && (
            <span className={`text-[8px] px-0.5 rounded flex-shrink-0 ${
              item.isOmniPodMounted 
                ? 'bg-accent/20 text-accent' 
                : 'bg-slate-700 text-slate-400'
            }`}>
              {item.isOmniPodMounted ? 'P' : 'F'}
            </span>
          )}
          {!item.isRemovable && (
            <span className="text-[8px] text-slate-500 flex-shrink-0">🔒</span>
          )}
        </div>
      </div>
      
      {/* Stats columns - matching header widths */}
      <div className="flex items-center text-[10px] text-text-theme-secondary flex-shrink-0 font-mono">
        <span className={`w-[28px] flex items-center justify-center border-l border-border-theme-subtle/20 ${item.isAllocated ? 'text-green-400' : 'text-amber-400/70'}`}>
          {item.isAllocated && item.location ? getLocationShorthand(item.location) : '—'}
        </span>
        <span className="w-[44px] flex items-center justify-center border-l border-border-theme-subtle/20 text-[9px]">
          {item.ranges ? `${item.ranges.short}/${item.ranges.medium}/${item.ranges.long}` : '—'}
        </span>
        <span className={`w-[20px] flex items-center justify-center border-l border-border-theme-subtle/20 ${item.heat && item.heat > 0 ? 'text-red-400' : 'text-slate-600'}`}>
          {item.heat ?? 0}
        </span>
        <span className="w-[20px] flex items-center justify-center border-l border-border-theme-subtle/20">{item.criticalSlots}</span>
        <span className="w-[28px] flex items-center justify-center border-l border-border-theme-subtle/20">{item.weight}</span>
      </div>
      
      {/* Actions - fixed width columns with proper touch targets */}
      {showActions && item.isRemovable && (
        <div className="flex items-center flex-shrink-0 relative">
          {/* Link/Unlink column - 36px for proper touch target */}
          <div className="w-[36px] h-[36px] flex items-center justify-center border-l border-border-theme-subtle/20">
            {item.isAllocated && onUnassign ? (
              // Unlink button for allocated items
              <button
                onClick={handleUnassignClick}
                className={`
                  w-full h-full flex items-center justify-center transition-all active:scale-95 text-base
                  ${showConfirmUnassign 
                    ? 'text-amber-400 bg-amber-900/40' 
                    : 'text-slate-400 hover:text-amber-400 hover:bg-amber-900/20'
                  }
                `}
                title={showConfirmUnassign ? 'Confirm unassign' : 'Unassign from slot'}
              >
                {showConfirmUnassign ? '?' : '⛓️‍💥'}
              </button>
            ) : !item.isAllocated && onQuickAssign && availableLocations.length > 0 ? (
              // Link button for unassigned items
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLocationMenu?.();
                }}
                className={`
                  w-full h-full flex items-center justify-center transition-all active:scale-95 text-base
                  ${isLocationMenuOpen 
                    ? 'text-green-400 bg-green-900/40' 
                    : 'text-slate-400 hover:text-green-400 hover:bg-green-900/20'
                  }
                `}
                title="Assign to location"
              >
                🔗
              </button>
            ) : null}
          </div>
          
          {/* Remove column - 36px for proper touch target */}
          <div className="w-[36px] h-[36px] flex items-center justify-center border-l border-border-theme-subtle/20">
            {onRemove && (
              <button
                onClick={handleRemoveClick}
                className={`
                  w-full h-full flex items-center justify-center transition-all active:scale-95 text-lg font-medium
                  ${showConfirmRemove 
                    ? 'text-red-400 bg-red-900/40' 
                    : 'text-slate-400 hover:text-red-400 hover:bg-red-900/20'
                  }
                `}
                title={showConfirmRemove ? 'Confirm remove' : 'Remove from unit'}
              >
                {showConfirmRemove ? '?' : '×'}
              </button>
            )}
          </div>
          
          {/* Location selection dropdown - wider grid layout */}
          {isLocationMenuOpen && !item.isAllocated && (
            <div 
              className="absolute right-0 top-full mt-1 z-50 bg-surface-base border border-accent/40 rounded-lg shadow-xl py-2 px-2 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] text-text-theme-secondary uppercase tracking-wide mb-2 px-1 font-medium">
                Assign to Location
              </div>
              {availableLocations.filter(loc => loc.canFit).length > 0 ? (
                <div className="grid grid-cols-2 gap-1">
                  {availableLocations.filter(loc => loc.canFit).map((loc) => (
                    <button
                      key={loc.location}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAssign?.(loc.location);
                        onToggleLocationMenu?.();
                      }}
                      className="px-2 py-2 text-left text-xs bg-surface-raised hover:bg-accent/20 hover:border-accent/50 border border-border-theme-subtle rounded transition-colors"
                    >
                      <div className="text-white font-medium text-[11px]">{loc.label}</div>
                      <div className="text-[9px] text-green-400/80">{loc.availableSlots} free</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-3 text-xs text-amber-400/80 text-center bg-amber-900/10 rounded">
                  No locations with enough slots
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MobileEquipmentRow;
