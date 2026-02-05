/**
 * Damage Assessment Panel
 * Shows comprehensive damage breakdown per location with repair options.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */
import React, { useMemo } from 'react';

import { Card, Badge, Button } from '@/components/ui';
import {
  IRepairJob,
  IRepairItem,
  RepairType,
  UnitLocation,
  RepairJobStatus,
} from '@/types/repair';

// =============================================================================
// Location Display Names
// =============================================================================

const LOCATION_LABELS: Record<UnitLocation, string> = {
  [UnitLocation.Head]: 'HD',
  [UnitLocation.CenterTorso]: 'CT',
  [UnitLocation.CenterTorsoRear]: 'CTR',
  [UnitLocation.LeftTorso]: 'LT',
  [UnitLocation.LeftTorsoRear]: 'LTR',
  [UnitLocation.RightTorso]: 'RT',
  [UnitLocation.RightTorsoRear]: 'RTR',
  [UnitLocation.LeftArm]: 'LA',
  [UnitLocation.RightArm]: 'RA',
  [UnitLocation.LeftLeg]: 'LL',
  [UnitLocation.RightLeg]: 'RL',
};

const LOCATION_FULL_NAMES: Record<UnitLocation, string> = {
  [UnitLocation.Head]: 'Head',
  [UnitLocation.CenterTorso]: 'Center Torso',
  [UnitLocation.CenterTorsoRear]: 'Center Torso (R)',
  [UnitLocation.LeftTorso]: 'Left Torso',
  [UnitLocation.LeftTorsoRear]: 'Left Torso (R)',
  [UnitLocation.RightTorso]: 'Right Torso',
  [UnitLocation.RightTorsoRear]: 'Right Torso (R)',
  [UnitLocation.LeftArm]: 'Left Arm',
  [UnitLocation.RightArm]: 'Right Arm',
  [UnitLocation.LeftLeg]: 'Left Leg',
  [UnitLocation.RightLeg]: 'Right Leg',
};

// =============================================================================
// Damage Bar Component
// =============================================================================

interface DamageBarProps {
  current: number;
  max: number;
  type: 'armor' | 'structure';
}

function DamageBar({ current, max, type }: DamageBarProps): React.ReactElement {
  const percent = max > 0 ? ((max - current) / max) * 100 : 0;
  const damagePercent = max > 0 ? (current / max) * 100 : 0;

  const barColor = type === 'armor' ? 'bg-cyan-500' : 'bg-amber-500';

  const damageColor =
    damagePercent > 50
      ? 'bg-red-500/80'
      : damagePercent > 25
        ? 'bg-orange-500/60'
        : 'bg-red-500/40';

  return (
    <div className="flex items-center gap-2">
      <span className="text-text-theme-muted w-8 text-[10px] tracking-wider uppercase">
        {type === 'armor' ? 'ARM' : 'STR'}
      </span>
      <div className="bg-surface-deep relative h-2 flex-1 overflow-hidden rounded-sm">
        {/* Remaining (good) portion */}
        <div
          className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
        {/* Damaged portion */}
        {current > 0 && (
          <div
            className={`absolute inset-y-0 right-0 ${damageColor} transition-all duration-300`}
            style={{ width: `${damagePercent}%` }}
          />
        )}
      </div>
      <span className="text-text-theme-secondary w-12 text-right text-xs tabular-nums">
        {max - current}/{max}
      </span>
    </div>
  );
}

// =============================================================================
// Location Card Component
// =============================================================================

interface LocationCardProps {
  location: UnitLocation;
  items: IRepairItem[];
  onToggleItem?: (itemId: string) => void;
  disabled?: boolean;
}

function LocationCard({
  location,
  items,
  onToggleItem,
  disabled = false,
}: LocationCardProps): React.ReactElement {
  const armorItem = items.find((i) => i.type === RepairType.Armor);
  const structureItem = items.find((i) => i.type === RepairType.Structure);
  const componentItems = items.filter(
    (i) =>
      i.type === RepairType.ComponentRepair ||
      i.type === RepairType.ComponentReplace,
  );

  const totalCost = items
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.cost, 0);
  const hasDamage = items.length > 0;

  if (!hasDamage) return <></>;

  return (
    <div
      className={`relative rounded-lg border p-3 transition-all ${
        hasDamage
          ? 'bg-surface-raised/60 border-border-theme-subtle'
          : 'bg-surface-deep/30 border-border-theme-subtle/50 opacity-50'
      } `}
    >
      {/* Location Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-accent text-sm font-bold tracking-wide uppercase">
            {LOCATION_LABELS[location]}
          </span>
          <span className="text-text-theme-muted text-xs">
            {LOCATION_FULL_NAMES[location]}
          </span>
        </div>
        {totalCost > 0 && (
          <span className="text-text-theme-secondary text-xs font-medium tabular-nums">
            {totalCost.toLocaleString()} C-Bills
          </span>
        )}
      </div>

      {/* Damage Bars */}
      <div className="mb-3 space-y-1.5">
        {armorItem && (
          <DamageBar
            current={armorItem.pointsToRestore ?? 0}
            max={
              (armorItem.pointsToRestore ?? 0) +
              (armorItem.pointsToRestore ?? 0)
            }
            type="armor"
          />
        )}
        {structureItem && (
          <DamageBar
            current={structureItem.pointsToRestore ?? 0}
            max={
              (structureItem.pointsToRestore ?? 0) +
              (structureItem.pointsToRestore ?? 0)
            }
            type="structure"
          />
        )}
      </div>

      {/* Repair Items */}
      <div className="space-y-1.5">
        {armorItem && (
          <RepairItemRow
            item={armorItem}
            onToggle={onToggleItem}
            disabled={disabled}
          />
        )}
        {structureItem && (
          <RepairItemRow
            item={structureItem}
            onToggle={onToggleItem}
            disabled={disabled}
          />
        )}
        {componentItems.map((item) => (
          <RepairItemRow
            key={item.id}
            item={item}
            onToggle={onToggleItem}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Repair Item Row
// =============================================================================

interface RepairItemRowProps {
  item: IRepairItem;
  onToggle?: (itemId: string) => void;
  disabled?: boolean;
}

function RepairItemRow({
  item,
  onToggle,
  disabled,
}: RepairItemRowProps): React.ReactElement {
  const typeLabels: Record<RepairType, string> = {
    [RepairType.Armor]: 'Armor',
    [RepairType.Structure]: 'Structure',
    [RepairType.ComponentRepair]: 'Repair',
    [RepairType.ComponentReplace]: 'Replace',
  };

  const typeBadgeVariants: Record<
    RepairType,
    'cyan' | 'amber' | 'orange' | 'red'
  > = {
    [RepairType.Armor]: 'cyan',
    [RepairType.Structure]: 'amber',
    [RepairType.ComponentRepair]: 'orange',
    [RepairType.ComponentReplace]: 'red',
  };

  return (
    <label
      data-testid={`repair-item-row-${item.id}`}
      className={`flex cursor-pointer items-center gap-2 rounded-md p-2 transition-all ${
        item.selected
          ? 'bg-accent/10 border-accent/30 border'
          : 'bg-surface-deep/50 hover:bg-surface-deep border border-transparent'
      } ${disabled ? 'pointer-events-none opacity-60' : ''} `}
    >
      <input
        data-testid={`repair-item-checkbox-${item.id}`}
        type="checkbox"
        checked={item.selected}
        onChange={() => onToggle?.(item.id)}
        disabled={disabled}
        className="border-border-theme-subtle bg-surface-deep text-accent focus:ring-accent/50 h-4 w-4 rounded"
      />
      <Badge variant={typeBadgeVariants[item.type]} size="sm">
        {typeLabels[item.type]}
      </Badge>
      <span className="text-text-theme-secondary flex-1 truncate text-xs">
        {item.componentName ?? `${item.pointsToRestore} pts`}
      </span>
      <span className="text-text-theme-muted text-xs tabular-nums">
        {item.timeHours}h
      </span>
      <span className="text-text-theme-primary text-xs font-medium tabular-nums">
        {item.cost.toLocaleString()}
      </span>
    </label>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface DamageAssessmentPanelProps {
  job: IRepairJob;
  onToggleItem?: (itemId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onStartRepair?: () => void;
  onPartialRepair?: () => void;
  availableCBills?: number;
  className?: string;
}

export function DamageAssessmentPanel({
  job,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onStartRepair,
  onPartialRepair,
  availableCBills = Infinity,
  className = '',
}: DamageAssessmentPanelProps): React.ReactElement {
  // Group items by location
  const itemsByLocation = useMemo(() => {
    const grouped = new Map<UnitLocation, IRepairItem[]>();
    for (const item of job.items) {
      const existing = grouped.get(item.location) ?? [];
      grouped.set(item.location, [...existing, item]);
    }
    return grouped;
  }, [job.items]);

  // Calculate totals
  const selectedItems = job.items.filter((i) => i.selected);
  const totalCost = selectedItems.reduce((sum, i) => sum + i.cost, 0);
  const totalTime = selectedItems.reduce((sum, i) => sum + i.timeHours, 0);
  const canAfford = totalCost <= availableCBills;

  const isDisabled = job.status !== RepairJobStatus.Pending;

  // Location order for display
  const locationOrder: UnitLocation[] = [
    UnitLocation.Head,
    UnitLocation.LeftArm,
    UnitLocation.LeftTorso,
    UnitLocation.CenterTorso,
    UnitLocation.RightTorso,
    UnitLocation.RightArm,
    UnitLocation.LeftTorsoRear,
    UnitLocation.CenterTorsoRear,
    UnitLocation.RightTorsoRear,
    UnitLocation.LeftLeg,
    UnitLocation.RightLeg,
  ];

  return (
    <Card
      data-testid="damage-assessment-panel"
      className={`overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="border-border-theme-subtle mb-4 flex items-center justify-between border-b pb-4">
        <div>
          <h3
            data-testid="damage-assessment-unit-name"
            className="text-text-theme-primary text-lg font-bold"
          >
            {job.unitName}
          </h3>
          <p className="text-text-theme-secondary text-sm">Damage Assessment</p>
        </div>
        <Badge
          variant={
            job.status === RepairJobStatus.Completed
              ? 'emerald'
              : job.status === RepairJobStatus.InProgress
                ? 'amber'
                : job.status === RepairJobStatus.Blocked
                  ? 'red'
                  : 'slate'
          }
        >
          {job.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Selection Controls */}
      {!isDisabled && (
        <div className="mb-4 flex gap-2">
          <button
            data-testid="repair-select-all-btn"
            onClick={onSelectAll}
            className="text-accent hover:text-accent/80 text-xs transition-colors"
          >
            Select All
          </button>
          <span className="text-text-theme-muted">|</span>
          <button
            data-testid="repair-deselect-all-btn"
            onClick={onDeselectAll}
            className="text-accent hover:text-accent/80 text-xs transition-colors"
          >
            Deselect All
          </button>
        </div>
      )}

      {/* Location Grid */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {locationOrder.map((location) => {
          const items = itemsByLocation.get(location);
          if (!items?.length) return null;
          return (
            <LocationCard
              key={location}
              location={location}
              items={items}
              onToggleItem={onToggleItem}
              disabled={isDisabled}
            />
          );
        })}
      </div>

      {/* Components Summary */}
      {job.items.filter((i) => i.type === RepairType.ComponentReplace).length >
        0 && (
        <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-3">
          <h4 className="mb-2 text-sm font-medium text-red-400">
            Destroyed Components
          </h4>
          <div className="flex flex-wrap gap-2">
            {job.items
              .filter((i) => i.type === RepairType.ComponentReplace)
              .map((item) => (
                <Badge key={item.id} variant="red" size="sm">
                  {item.componentName}
                </Badge>
              ))}
          </div>
        </div>
      )}

      {/* Cost Summary */}
      <div
        className="bg-surface-deep border-border-theme-subtle mb-4 rounded-lg border p-4"
        data-testid="repair-cost-summary"
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-theme-muted mb-1 block">
              Selected Items
            </span>
            <span
              data-testid="repair-selected-count"
              className="text-text-theme-primary text-xl font-bold"
            >
              {selectedItems.length} / {job.items.length}
            </span>
          </div>
          <div>
            <span className="text-text-theme-muted mb-1 block">Est. Time</span>
            <span
              data-testid="repair-estimated-time"
              className="text-text-theme-primary text-xl font-bold"
            >
              {totalTime}h
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-text-theme-muted mb-1 block">Total Cost</span>
            <span
              data-testid="repair-total-cost"
              className={`text-2xl font-bold ${canAfford ? 'text-accent' : 'text-red-400'}`}
            >
              {totalCost.toLocaleString()} C-Bills
            </span>
            {!canAfford && (
              <span
                data-testid="repair-insufficient-funds"
                className="mt-1 block text-xs text-red-400"
              >
                Insufficient funds (need{' '}
                {(totalCost - availableCBills).toLocaleString()} more)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isDisabled && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            data-testid="repair-start-full-btn"
            variant="primary"
            className="flex-1"
            onClick={onStartRepair}
            disabled={selectedItems.length === 0 || !canAfford}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            Start Full Repair
          </Button>
          <Button
            data-testid="repair-partial-btn"
            variant="secondary"
            className="flex-1"
            onClick={onPartialRepair}
            disabled={selectedItems.length === 0}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Partial Repair
          </Button>
        </div>
      )}
    </Card>
  );
}

export default DamageAssessmentPanel;
