import React from 'react';

import { Badge } from '@/components/ui';
import { IRepairItem, RepairType, UnitLocation } from '@/types/repair';

// =============================================================================
// Location Display Names
// =============================================================================

export const LOCATION_LABELS: Record<UnitLocation, string> = {
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

export const LOCATION_FULL_NAMES: Record<UnitLocation, string> = {
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
// Damage Bar
// =============================================================================

interface DamageBarProps {
  current: number;
  max: number;
  type: 'armor' | 'structure';
}

export function DamageBar({
  current,
  max,
  type,
}: DamageBarProps): React.ReactElement {
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
        <div
          className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
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
// Repair Item Row
// =============================================================================

interface RepairItemRowProps {
  item: IRepairItem;
  onToggle?: (itemId: string) => void;
  disabled?: boolean;
}

const TYPE_LABELS: Record<RepairType, string> = {
  [RepairType.Armor]: 'Armor',
  [RepairType.Structure]: 'Structure',
  [RepairType.ComponentRepair]: 'Repair',
  [RepairType.ComponentReplace]: 'Replace',
};

const TYPE_BADGE_VARIANTS: Record<
  RepairType,
  'cyan' | 'amber' | 'orange' | 'red'
> = {
  [RepairType.Armor]: 'cyan',
  [RepairType.Structure]: 'amber',
  [RepairType.ComponentRepair]: 'orange',
  [RepairType.ComponentReplace]: 'red',
};

export function RepairItemRow({
  item,
  onToggle,
  disabled,
}: RepairItemRowProps): React.ReactElement {
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
      <Badge variant={TYPE_BADGE_VARIANTS[item.type]} size="sm">
        {TYPE_LABELS[item.type]}
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
// Location Card
// =============================================================================

interface LocationCardProps {
  location: UnitLocation;
  items: IRepairItem[];
  onToggleItem?: (itemId: string) => void;
  disabled?: boolean;
}

export function LocationCard({
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
