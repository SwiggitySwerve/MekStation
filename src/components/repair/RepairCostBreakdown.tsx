/**
 * Repair Cost Breakdown Component
 * Itemized cost display with resource comparison.
 *
 * @spec openspec/changes/add-repair-system/specs/repair/spec.md
 */
import React, { useMemo } from 'react';

import { Card, Badge } from '@/components/ui';
import { IRepairJob, IRepairItem, RepairType } from '@/types/repair';

// =============================================================================
// Cost Row Component
// =============================================================================

interface CostRowProps {
  label: string;
  count: number;
  cost: number;
  time: number;
  variant?: 'cyan' | 'amber' | 'orange' | 'red';
}

function CostRow({
  label,
  count,
  cost,
  time,
  variant = 'cyan',
}: CostRowProps): React.ReactElement {
  if (count === 0) return <></>;

  const badgeVariants = {
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="border-border-theme-subtle/50 flex items-center gap-3 border-b py-2.5 last:border-b-0">
      <div
        className={`h-2 w-2 rounded-full ${badgeVariants[variant].split(' ')[0]}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-text-theme-primary text-sm font-medium">
            {label}
          </span>
          <span className="text-text-theme-muted text-xs">x{count}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-text-theme-primary text-sm font-semibold tabular-nums">
          {cost.toLocaleString()}
        </div>
        <div className="text-text-theme-muted text-xs tabular-nums">
          {time}h
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Resource Meter Component
// =============================================================================

interface ResourceMeterProps {
  label: string;
  current: number;
  needed: number;
  unit?: string;
}

function ResourceMeter({
  label,
  current,
  needed,
  unit = '',
}: ResourceMeterProps): React.ReactElement {
  const percent = Math.min((current / needed) * 100, 100);
  const isInsufficient = current < needed;

  const barColor = isInsufficient
    ? 'bg-gradient-to-r from-red-600 to-red-500'
    : 'bg-gradient-to-r from-emerald-600 to-emerald-400';

  const textColor = isInsufficient ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-theme-secondary">{label}</span>
        <span className={`font-medium tabular-nums ${textColor}`}>
          {current.toLocaleString()} / {needed.toLocaleString()} {unit}
        </span>
      </div>
      <div className="bg-surface-deep relative h-3 overflow-hidden rounded-full">
        {/* Track marks */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="border-surface-base/20 flex-1 border-r last:border-r-0"
            />
          ))}
        </div>
        {/* Fill */}
        <div
          className={`h-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percent}%` }}
        />
        {/* Threshold marker at 100% */}
        {isInsufficient && (
          <div
            className="bg-text-theme-muted absolute top-0 bottom-0 w-0.5"
            style={{ left: `${percent}%` }}
          />
        )}
      </div>
      {isInsufficient && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Short by {(needed - current).toLocaleString()} {unit}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface RepairCostBreakdownProps {
  job: IRepairJob;
  availableCBills?: number;
  className?: string;
}

export function RepairCostBreakdown({
  job,
  availableCBills = 0,
  className = '',
}: RepairCostBreakdownProps): React.ReactElement {
  // Calculate breakdown by type
  const breakdown = useMemo(() => {
    const selected = job.items.filter((i) => i.selected);

    const armor = selected.filter((i) => i.type === RepairType.Armor);
    const structure = selected.filter((i) => i.type === RepairType.Structure);
    const componentRepair = selected.filter(
      (i) => i.type === RepairType.ComponentRepair,
    );
    const componentReplace = selected.filter(
      (i) => i.type === RepairType.ComponentReplace,
    );

    const sumCost = (items: IRepairItem[]) =>
      items.reduce((sum, i) => sum + i.cost, 0);
    const sumTime = (items: IRepairItem[]) =>
      items.reduce((sum, i) => sum + i.timeHours, 0);

    return {
      armor: {
        count: armor.length,
        cost: sumCost(armor),
        time: sumTime(armor),
      },
      structure: {
        count: structure.length,
        cost: sumCost(structure),
        time: sumTime(structure),
      },
      componentRepair: {
        count: componentRepair.length,
        cost: sumCost(componentRepair),
        time: sumTime(componentRepair),
      },
      componentReplace: {
        count: componentReplace.length,
        cost: sumCost(componentReplace),
        time: sumTime(componentReplace),
      },
      total: {
        cost: job.totalCost,
        time: job.totalTimeHours,
        items: selected.length,
      },
    };
  }, [job]);

  const canAfford = availableCBills >= breakdown.total.cost;
  const hasTimeWarning = breakdown.total.time > 48;

  return (
    <Card data-testid="repair-cost-breakdown" className={className}>
      {/* Header */}
      <div className="border-border-theme-subtle mb-4 flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-text-theme-primary text-lg font-bold">
            Cost Breakdown
          </h3>
          <p className="text-text-theme-secondary text-sm">{job.unitName}</p>
        </div>
        {!canAfford && (
          <Badge variant="red" size="sm">
            INSUFFICIENT FUNDS
          </Badge>
        )}
      </div>

      {/* Itemized Costs */}
      <div className="mb-6" data-testid="repair-cost-items">
        <CostRow
          label="Armor Repairs"
          count={breakdown.armor.count}
          cost={breakdown.armor.cost}
          time={breakdown.armor.time}
          variant="cyan"
        />
        <CostRow
          label="Structure Repairs"
          count={breakdown.structure.count}
          cost={breakdown.structure.cost}
          time={breakdown.structure.time}
          variant="amber"
        />
        <CostRow
          label="Component Repairs"
          count={breakdown.componentRepair.count}
          cost={breakdown.componentRepair.cost}
          time={breakdown.componentRepair.time}
          variant="orange"
        />
        <CostRow
          label="Component Replacements"
          count={breakdown.componentReplace.count}
          cost={breakdown.componentReplace.cost}
          time={breakdown.componentReplace.time}
          variant="red"
        />
      </div>

      {/* Total Summary */}
      <div className="bg-surface-deep border-border-theme-subtle mb-6 rounded-xl border p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-text-theme-muted mb-1 block text-xs tracking-wider uppercase">
              Total Cost
            </span>
            <span
              className={`text-2xl font-bold tabular-nums ${canAfford ? 'text-accent' : 'text-red-400'}`}
            >
              {breakdown.total.cost.toLocaleString()}
            </span>
            <span className="text-text-theme-secondary ml-1 text-sm">
              C-Bills
            </span>
          </div>
          <div>
            <span className="text-text-theme-muted mb-1 block text-xs tracking-wider uppercase">
              Est. Time
            </span>
            <span
              className={`text-2xl font-bold tabular-nums ${hasTimeWarning ? 'text-amber-400' : 'text-text-theme-primary'}`}
            >
              {breakdown.total.time}
            </span>
            <span className="text-text-theme-secondary ml-1 text-sm">
              hours
            </span>
          </div>
        </div>
        {hasTimeWarning && (
          <div className="border-border-theme-subtle mt-3 flex items-center gap-2 border-t pt-3 text-xs text-amber-400">
            <svg
              className="h-4 w-4 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Unit will be unavailable for 2+ days
          </div>
        )}
      </div>

      {/* Resource Comparison */}
      <div className="space-y-4">
        <h4 className="text-text-theme-primary text-sm font-semibold">
          Resource Check
        </h4>
        <ResourceMeter
          label="C-Bills"
          current={availableCBills}
          needed={breakdown.total.cost}
          unit=""
        />
      </div>

      {/* Cost Efficiency Tips */}
      {breakdown.componentReplace.count > 0 && (
        <div className="mt-6 rounded-lg border border-blue-600/30 bg-blue-900/20 p-3">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-xs font-medium text-blue-400">
                Salvage Available
              </p>
              <p className="text-text-theme-secondary mt-0.5 text-xs">
                Check salvage inventory for matching components to reduce
                replacement costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default RepairCostBreakdown;
