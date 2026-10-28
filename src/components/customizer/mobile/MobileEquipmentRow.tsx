/**
 * Mobile Equipment Row Component
 *
 * Compact list row for displaying equipment items in the mobile loadout view.
 * Shows Name, Location, Heat, Crits, Weight with edit/remove actions.
 * Touch-friendly with 44px minimum height for accessibility.
 *
 * @spec c:\Users\wroll\.cursor\plans\mobile_loadout_full-screen_redesign_00a59d27.plan.md
 */

import React, { useCallback, useState } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { EquipmentCategory } from '@/types/equipment';
import { getCategoryIndicatorClass } from '@/utils/colors/equipmentColors';
import { getLocationShorthand } from '@/utils/locationUtils';

import { GlobalLoadoutTrayPlacementStatus } from '../equipment/GlobalLoadoutTrayPlacementStatus';
import { MobileLocationMenu } from './MobileLocationMenu';

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
  reason?: string;
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

interface ConfirmButtonClickArgs {
  readonly isConfirming: boolean;
  readonly setIsConfirming: (value: boolean) => void;
  readonly onConfirm?: () => void;
  readonly onStartConfirm: () => void;
}

const CONFIRM_RESET_MS = 3000;
const DISPLAY_DASH = '\u2014';

// =============================================================================
// Row Helpers
// =============================================================================

function useConfirmButtonClick({
  isConfirming,
  setIsConfirming,
  onConfirm,
  onStartConfirm,
}: ConfirmButtonClickArgs): (e: React.MouseEvent) => void {
  return useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isConfirming) {
        onConfirm?.();
        setIsConfirming(false);
        return;
      }

      setIsConfirming(true);
      onStartConfirm();
      setTimeout(() => setIsConfirming(false), CONFIRM_RESET_MS);
    },
    [isConfirming, onConfirm, onStartConfirm, setIsConfirming],
  );
}

function buildRowClassName({
  onSelect,
  isSelected,
  isFixedOnOmni,
  className,
}: {
  readonly onSelect?: () => void;
  readonly isSelected: boolean;
  readonly isFixedOnOmni: boolean;
  readonly className: string;
}): string {
  return [
    'border-border-theme-subtle/30 flex min-h-[44px] items-center border-b px-2 py-1',
    onSelect ? 'active:bg-surface-raised/50 cursor-pointer' : '',
    isSelected ? 'bg-accent/10 border-l-accent border-l-2' : '',
    isFixedOnOmni ? 'opacity-60' : '',
    className,
  ].join(' ');
}

function EquipmentSummary({
  item,
  isOmni,
}: {
  readonly item: MobileEquipmentItem;
  readonly isOmni: boolean;
}): React.ReactElement {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <span className="text-text-theme-primary text-xs font-medium break-words">
        {item.name}
      </span>
      {item.damage !== undefined && (
        <span className="flex-shrink-0 text-[10px] text-cyan-400/80">
          {item.damage}d
        </span>
      )}
      {item.targetingComputerCompatible && (
        <span className="flex-shrink-0 text-[10px] text-green-400/70">TC</span>
      )}
      {isOmni && (
        <span
          className={`flex-shrink-0 rounded px-0.5 text-[10px] ${
            item.isOmniPodMounted
              ? 'bg-accent/20 text-accent'
              : 'bg-surface-raised text-text-theme-secondary'
          }`}
        >
          <span
            title={
              item.isOmniPodMounted
                ? 'Pod-mounted equipment'
                : 'Fixed OmniMech equipment'
            }
          >
            {item.isOmniPodMounted ? 'P' : 'F'}
          </span>
        </span>
      )}
      {!item.isRemovable && (
        <span className="text-text-theme-muted flex-shrink-0 text-[8px]">
          <AppIcon name="lock" size="inline" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function LocationCell({
  item,
}: {
  readonly item: MobileEquipmentItem;
}): React.ReactElement {
  return (
    <div
      className={`border-border-theme-subtle/20 w-[28px] flex-shrink-0 border-l text-center font-mono text-[10px] ${item.isAllocated ? 'text-green-400' : 'text-red-400'}`}
    >
      {item.isAllocated && item.location
        ? getLocationShorthand(item.location)
        : DISPLAY_DASH}
    </div>
  );
}

function RangeCell({
  ranges,
}: {
  readonly ranges: MobileEquipmentItem['ranges'];
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle/20 text-text-theme-secondary w-[44px] flex-shrink-0 border-l text-center font-mono text-[9px]">
      {ranges
        ? `${ranges.short}/${ranges.medium}/${ranges.long}`
        : DISPLAY_DASH}
    </div>
  );
}

function HeatCell({ heat }: { readonly heat?: number }): React.ReactElement {
  return (
    <div
      className={`border-border-theme-subtle/20 w-[20px] flex-shrink-0 border-l text-center font-mono text-[10px] ${heat && heat > 0 ? 'text-red-400' : 'text-text-theme-muted'}`}
    >
      {heat ?? 0}
    </div>
  );
}

function NumberCell({
  value,
  widthClass,
}: {
  readonly value: number | string;
  readonly widthClass: string;
}): React.ReactElement {
  return (
    <div
      className={`border-border-theme-subtle/20 text-text-theme-secondary ${widthClass} flex-shrink-0 border-l text-center font-mono text-[10px]`}
    >
      {value}
    </div>
  );
}

function AssignmentAction({
  canShowActions,
  item,
  onUnassign,
  onQuickAssign,
  availableLocations,
  isLocationMenuOpen,
  onToggleLocationMenu,
  showConfirmUnassign,
  onUnassignClick,
}: {
  readonly canShowActions: boolean;
  readonly item: MobileEquipmentItem;
  readonly onUnassign?: () => void;
  readonly onQuickAssign?: (location: string) => void;
  readonly availableLocations: readonly AvailableLocationOption[];
  readonly isLocationMenuOpen: boolean;
  readonly onToggleLocationMenu?: () => void;
  readonly showConfirmUnassign: boolean;
  readonly onUnassignClick: (e: React.MouseEvent) => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle/20 relative flex h-[44px] w-[45px] flex-shrink-0 items-center justify-center border-l">
      {canShowActions && item.isAllocated && onUnassign ? (
        <button
          onClick={onUnassignClick}
          className={`flex h-full w-full items-center justify-center text-base transition-all active:scale-95 ${showConfirmUnassign ? 'bg-amber-900/40 text-amber-400' : 'text-text-theme-secondary hover:bg-amber-900/20 hover:text-amber-400'}`}
          aria-label={`${showConfirmUnassign ? 'Confirm unassign' : 'Unassign'} ${item.name} from ${item.location}`}
          title={
            showConfirmUnassign ? 'Confirm unassign' : 'Unassign from slot'
          }
        >
          {showConfirmUnassign ? (
            <AppIcon name="check" size="control" aria-hidden="true" />
          ) : (
            <AppIcon name="unlink" size="control" aria-hidden="true" />
          )}
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
          className={`flex h-full w-full items-center justify-center text-base transition-all active:scale-95 ${isLocationMenuOpen ? 'bg-green-900/40 text-green-400' : 'text-text-theme-secondary hover:bg-green-900/20 hover:text-green-400'}`}
          aria-label={`Assign ${item.name} to location`}
          aria-expanded={isLocationMenuOpen}
          title="Assign to location"
        >
          <AppIcon name="link" size="control" aria-hidden="true" />
        </button>
      ) : null}
      <MobileLocationMenu
        item={item}
        availableLocations={availableLocations}
        isLocationMenuOpen={isLocationMenuOpen}
        onQuickAssign={onQuickAssign}
        onToggleLocationMenu={onToggleLocationMenu}
      />
    </div>
  );
}

function RemoveAction({
  item,
  canShowActions,
  onRemove,
  showConfirmRemove,
  onRemoveClick,
}: {
  readonly canShowActions: boolean;
  readonly item: MobileEquipmentItem;
  readonly onRemove?: () => void;
  readonly showConfirmRemove: boolean;
  readonly onRemoveClick: (e: React.MouseEvent) => void;
}): React.ReactElement {
  return (
    <div className="border-border-theme-subtle/20 flex h-[44px] w-[45px] flex-shrink-0 items-center justify-center border-l">
      {canShowActions && onRemove && (
        <button
          onClick={onRemoveClick}
          className={`flex h-full w-full items-center justify-center text-lg font-medium transition-all active:scale-95 ${showConfirmRemove ? 'bg-red-900/40 text-red-400' : 'text-text-theme-secondary hover:bg-red-900/20 hover:text-red-400'}`}
          aria-label={`${showConfirmRemove ? 'Confirm removal of' : 'Remove'} ${item.name}${item.location ? ` from ${item.location}` : ''}`}
          title={showConfirmRemove ? 'Confirm remove' : 'Remove from unit'}
        >
          {showConfirmRemove ? (
            <AppIcon name="check" size="control" aria-hidden="true" />
          ) : (
            <AppIcon name="trash" size="control" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
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

  // Check if this is fixed equipment on an OmniMech
  const isFixedOnOmni = isOmni && item.isOmniPodMounted === false;
  const handleRemoveClick = useConfirmButtonClick({
    isConfirming: showConfirmRemove,
    setIsConfirming: setShowConfirmRemove,
    onConfirm: onRemove,
    onStartConfirm: () => setShowConfirmUnassign(false),
  });
  const handleUnassignClick = useConfirmButtonClick({
    isConfirming: showConfirmUnassign,
    setIsConfirming: setShowConfirmUnassign,
    onConfirm: onUnassign,
    onStartConfirm: () => setShowConfirmRemove(false),
  });
  const canShowActions = showActions && item.isRemovable;

  return (
    <div
      onClick={onSelect}
      className={buildRowClassName({
        onSelect,
        isSelected,
        isFixedOnOmni,
        className,
      })}
    >
      <div
        aria-hidden="true"
        className={`mr-1.5 h-6 w-1 flex-shrink-0 rounded-sm ${getCategoryIndicatorClass(item.category)}`}
      />
      <button
        type="button"
        data-equipment-select={item.instanceId}
        disabled={!onSelect}
        aria-label={`Select ${item.name}${item.location ? ` in ${item.location}` : ' unassigned'}`}
        aria-pressed={isSelected}
        className="focus-visible:outline-accent min-h-11 min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
      >
        <EquipmentSummary item={item} isOmni={isOmni} />
        {!item.isAllocated && (
          <span className="block text-[10px]">
            <GlobalLoadoutTrayPlacementStatus />
          </span>
        )}
      </button>
      <LocationCell item={item} />
      <RangeCell ranges={item.ranges} />
      <HeatCell heat={item.heat} />
      <NumberCell value={item.criticalSlots} widthClass="w-[20px]" />
      <NumberCell value={item.weight.toFixed(1)} widthClass="w-[28px]" />
      <AssignmentAction
        canShowActions={canShowActions && (!isFixedOnOmni || !item.isAllocated)}
        item={item}
        onUnassign={onUnassign}
        onQuickAssign={onQuickAssign}
        availableLocations={availableLocations}
        isLocationMenuOpen={isLocationMenuOpen}
        onToggleLocationMenu={onToggleLocationMenu}
        showConfirmUnassign={showConfirmUnassign}
        onUnassignClick={handleUnassignClick}
      />
      <RemoveAction
        item={item}
        canShowActions={canShowActions && !isFixedOnOmni}
        onRemove={onRemove}
        showConfirmRemove={showConfirmRemove}
        onRemoveClick={handleRemoveClick}
      />
    </div>
  );
}

export default MobileEquipmentRow;
