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
import { getLocationShorthand } from '@/utils/locationUtils';

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

/** Format range brackets like "0/3/6/9" or "-/3/6/9" for min range */
function _formatRangeBrackets(ranges: {
  minimum: number;
  short: number;
  medium: number;
  long: number;
}): string {
  const min = ranges.minimum > 0 ? ranges.minimum : 0;
  return `${min}/${ranges.short}/${ranges.medium}/${ranges.long}`;
}

/** Get range band description based on short range */
function _getRangeBand(ranges: { short: number; medium: number }): string {
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
  onEditLocation: _onEditLocation,
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

  const canShowActions = showActions && item.isRemovable;

  return (
    <div
      onClick={onSelect}
      className={`border-border-theme-subtle/30 flex min-h-[36px] items-center border-b px-2 py-1 ${onSelect ? 'active:bg-surface-raised/50 cursor-pointer' : ''} ${isSelected ? 'bg-accent/10 border-l-accent border-l-2' : ''} ${isFixedOnOmni ? 'opacity-60' : ''} ${className} `}
    >
      <div className={`mr-1.5 h-6 w-1 flex-shrink-0 rounded-sm ${colors.bg}`} />

      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="truncate text-xs font-medium text-white">
          {item.name}
        </span>
        {item.damage !== undefined && (
          <span className="flex-shrink-0 text-[9px] text-cyan-400/80">
            {item.damage}d
          </span>
        )}
        {item.targetingComputerCompatible && (
          <span className="flex-shrink-0 text-[8px] text-green-400/70">TC</span>
        )}
        {isOmni && (
          <span
            className={`flex-shrink-0 rounded px-0.5 text-[8px] ${
              item.isOmniPodMounted
                ? 'bg-accent/20 text-accent'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {item.isOmniPodMounted ? 'P' : 'F'}
          </span>
        )}
        {!item.isRemovable && (
          <span className="flex-shrink-0 text-[8px] text-slate-500">🔒</span>
        )}
      </div>

      <div
        className={`border-border-theme-subtle/20 w-[28px] flex-shrink-0 border-l text-center font-mono text-[10px] ${item.isAllocated ? 'text-green-400' : 'text-amber-400/70'}`}
      >
        {item.isAllocated && item.location
          ? getLocationShorthand(item.location)
          : '—'}
      </div>
      <div className="border-border-theme-subtle/20 text-text-theme-secondary w-[44px] flex-shrink-0 border-l text-center font-mono text-[9px]">
        {item.ranges
          ? `${item.ranges.short}/${item.ranges.medium}/${item.ranges.long}`
          : '—'}
      </div>
      <div
        className={`border-border-theme-subtle/20 w-[20px] flex-shrink-0 border-l text-center font-mono text-[10px] ${item.heat && item.heat > 0 ? 'text-red-400' : 'text-slate-600'}`}
      >
        {item.heat ?? 0}
      </div>
      <div className="border-border-theme-subtle/20 text-text-theme-secondary w-[20px] flex-shrink-0 border-l text-center font-mono text-[10px]">
        {item.criticalSlots}
      </div>
      <div className="border-border-theme-subtle/20 text-text-theme-secondary w-[28px] flex-shrink-0 border-l text-center font-mono text-[10px]">
        {item.weight}
      </div>

      <div className="border-border-theme-subtle/20 relative flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center border-l">
        {canShowActions && item.isAllocated && onUnassign ? (
          <button
            onClick={handleUnassignClick}
            className={`flex h-full w-full items-center justify-center text-base transition-all active:scale-95 ${showConfirmUnassign ? 'bg-amber-900/40 text-amber-400' : 'text-slate-400 hover:bg-amber-900/20 hover:text-amber-400'}`}
            title={
              showConfirmUnassign ? 'Confirm unassign' : 'Unassign from slot'
            }
          >
            {showConfirmUnassign ? '?' : '⛓️‍💥'}
          </button>
        ) : canShowActions &&
          !item.isAllocated &&
          onQuickAssign &&
          availableLocations.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLocationMenu?.();
            }}
            className={`flex h-full w-full items-center justify-center text-base transition-all active:scale-95 ${isLocationMenuOpen ? 'bg-green-900/40 text-green-400' : 'text-slate-400 hover:bg-green-900/20 hover:text-green-400'}`}
            title="Assign to location"
          >
            🔗
          </button>
        ) : null}

        {isLocationMenuOpen && !item.isAllocated && (
          <div
            className="bg-surface-base border-accent/40 absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-lg border px-2 py-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-text-theme-secondary mb-2 px-1 text-[10px] font-medium tracking-wide uppercase">
              Assign to Location
            </div>
            {availableLocations.filter((loc) => loc.canFit).length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {availableLocations
                  .filter((loc) => loc.canFit)
                  .map((loc) => (
                    <button
                      key={loc.location}
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAssign?.(loc.location);
                        onToggleLocationMenu?.();
                      }}
                      className="bg-surface-raised hover:bg-accent/20 hover:border-accent/50 border-border-theme-subtle rounded border px-2 py-2 text-left text-xs transition-colors"
                    >
                      <div className="text-[11px] font-medium text-white">
                        {loc.label}
                      </div>
                      <div className="text-[9px] text-green-400/80">
                        {loc.availableSlots} free
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="rounded bg-amber-900/10 px-2 py-3 text-center text-xs text-amber-400/80">
                No locations with enough slots
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-border-theme-subtle/20 flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center border-l">
        {canShowActions && onRemove && (
          <button
            onClick={handleRemoveClick}
            className={`flex h-full w-full items-center justify-center text-lg font-medium transition-all active:scale-95 ${showConfirmRemove ? 'bg-red-900/40 text-red-400' : 'text-slate-400 hover:bg-red-900/20 hover:text-red-400'}`}
            title={showConfirmRemove ? 'Confirm remove' : 'Remove from unit'}
          >
            {showConfirmRemove ? '?' : '×'}
          </button>
        )}
      </div>
    </div>
  );
}

export default MobileEquipmentRow;
