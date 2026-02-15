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

import { LocationCard } from './DamageAssessmentComponents';

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
