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

function CostRow({ label, count, cost, time, variant = 'cyan' }: CostRowProps): React.ReactElement {
  if (count === 0) return <></>;

  const badgeVariants = {
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-theme-subtle/50 last:border-b-0">
      <div className={`w-2 h-2 rounded-full ${badgeVariants[variant].split(' ')[0]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-theme-primary">{label}</span>
          <span className="text-xs text-text-theme-muted">x{count}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-text-theme-primary tabular-nums">
          {cost.toLocaleString()}
        </div>
        <div className="text-xs text-text-theme-muted tabular-nums">{time}h</div>
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
      <div className="h-3 bg-surface-deep rounded-full overflow-hidden relative">
        {/* Track marks */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-surface-base/20 last:border-r-0" />
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
            className="absolute top-0 bottom-0 w-0.5 bg-text-theme-muted"
            style={{ left: `${percent}%` }}
          />
        )}
      </div>
      {isInsufficient && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
    const selected = job.items.filter(i => i.selected);

    const armor = selected.filter(i => i.type === RepairType.Armor);
    const structure = selected.filter(i => i.type === RepairType.Structure);
    const componentRepair = selected.filter(i => i.type === RepairType.ComponentRepair);
    const componentReplace = selected.filter(i => i.type === RepairType.ComponentReplace);

    const sumCost = (items: IRepairItem[]) => items.reduce((sum, i) => sum + i.cost, 0);
    const sumTime = (items: IRepairItem[]) => items.reduce((sum, i) => sum + i.timeHours, 0);

    return {
      armor: { count: armor.length, cost: sumCost(armor), time: sumTime(armor) },
      structure: { count: structure.length, cost: sumCost(structure), time: sumTime(structure) },
      componentRepair: { count: componentRepair.length, cost: sumCost(componentRepair), time: sumTime(componentRepair) },
      componentReplace: { count: componentReplace.length, cost: sumCost(componentReplace), time: sumTime(componentReplace) },
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
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-theme-subtle">
        <div>
          <h3 className="text-lg font-bold text-text-theme-primary">Cost Breakdown</h3>
          <p className="text-sm text-text-theme-secondary">{job.unitName}</p>
        </div>
        {!canAfford && (
          <Badge variant="red" size="sm">
            INSUFFICIENT FUNDS
          </Badge>
        )}
      </div>

      {/* Itemized Costs */}
      <div className="mb-6">
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
      <div className="p-4 rounded-xl bg-surface-deep border border-border-theme-subtle mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-text-theme-muted uppercase tracking-wider block mb-1">
              Total Cost
            </span>
            <span className={`text-2xl font-bold tabular-nums ${canAfford ? 'text-accent' : 'text-red-400'}`}>
              {breakdown.total.cost.toLocaleString()}
            </span>
            <span className="text-sm text-text-theme-secondary ml-1">C-Bills</span>
          </div>
          <div>
            <span className="text-xs text-text-theme-muted uppercase tracking-wider block mb-1">
              Est. Time
            </span>
            <span className={`text-2xl font-bold tabular-nums ${hasTimeWarning ? 'text-amber-400' : 'text-text-theme-primary'}`}>
              {breakdown.total.time}
            </span>
            <span className="text-sm text-text-theme-secondary ml-1">hours</span>
          </div>
        </div>
        {hasTimeWarning && (
          <div className="mt-3 pt-3 border-t border-border-theme-subtle flex items-center gap-2 text-xs text-amber-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Unit will be unavailable for 2+ days
          </div>
        )}
      </div>

      {/* Resource Comparison */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-theme-primary">Resource Check</h4>
        <ResourceMeter
          label="C-Bills"
          current={availableCBills}
          needed={breakdown.total.cost}
          unit=""
        />
      </div>

      {/* Cost Efficiency Tips */}
      {breakdown.componentReplace.count > 0 && (
        <div className="mt-6 p-3 rounded-lg bg-blue-900/20 border border-blue-600/30">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs font-medium text-blue-400">Salvage Available</p>
              <p className="text-xs text-text-theme-secondary mt-0.5">
                Check salvage inventory for matching components to reduce replacement costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default RepairCostBreakdown;
