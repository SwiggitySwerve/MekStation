import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { formatTons } from '@/utils/formatting';

import type { MobileLoadoutStats } from './MobileLoadoutHeader';

interface SectionHeaderProps {
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  titleColor?: string;
}

export function SectionHeader({
  title,
  count,
  isExpanded,
  onToggle,
  titleColor = 'text-text-theme-primary',
}: SectionHeaderProps): React.ReactElement {
  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="bg-surface-raised/50 border-border-theme-subtle/50 active:bg-surface-raised flex min-h-11 w-full items-center justify-between border-y px-2 py-1 transition-colors"
    >
      <span className={`text-xs font-semibold ${titleColor}`}>{title}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-text-theme-secondary text-[10px]">({count})</span>
        <AppIcon
          name="chevron-down"
          size="inline"
          aria-hidden="true"
          className={`text-text-theme-muted transition-transform ${isExpanded ? 'rotate-180' : ' '}`}
        />
      </div>
    </button>
  );
}

// =============================================================================
// Stats Summary Component
// =============================================================================

interface StatsSummaryProps {
  stats: MobileLoadoutStats;
}

export function StatsSummary({ stats }: StatsSummaryProps): React.ReactElement {
  const weightOverage = stats.weightUsed > stats.weightMax;
  const slotsOverage = stats.slotsUsed > stats.slotsMax;
  const heatNegative = stats.heatGenerated > stats.heatDissipation;

  return (
    <div className="bg-surface-deep border-border-theme flex items-center justify-around border-b px-3 py-2 text-center">
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          Weight
        </div>
        <div
          className={`text-sm font-bold ${weightOverage ? 'text-red-400' : 'text-text-theme-primary'}`}
        >
          {stats.weightUsed.toFixed(1)}
          <span className="text-text-theme-muted font-normal">
            {' / '}
            {formatTons(stats.weightMax)}
          </span>
        </div>
      </div>
      <div className="bg-border-theme-subtle h-8 w-px" />
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          Slots
        </div>
        <div
          className={`text-sm font-bold ${slotsOverage ? 'text-red-400' : 'text-text-theme-primary'}`}
        >
          {stats.slotsUsed}
          <span className="text-text-theme-muted font-normal">
            /{stats.slotsMax}
          </span>
        </div>
      </div>
      <div className="bg-border-theme-subtle h-8 w-px" />
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          Heat
        </div>
        <div
          className={`text-sm font-bold ${heatNegative ? 'text-red-400' : heatNegative ? 'text-amber-400' : 'text-green-400'}`}
        >
          {stats.heatGenerated}
          <span className="text-text-theme-muted font-normal">
            /{stats.heatDissipation}
          </span>
        </div>
      </div>
      <div className="bg-border-theme-subtle h-8 w-px" />
      <div>
        <div className="text-text-theme-secondary text-[10px] uppercase">
          BV
        </div>
        <div className="text-sm font-bold text-cyan-400">
          {stats.battleValue.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Section Column Headers Component
// =============================================================================

export function SectionColumnHeaders(): React.ReactElement {
  return (
    <div className="bg-surface-raised/30 border-border-theme-subtle/50 text-text-theme-secondary/50 flex items-center border-b px-2 py-1 font-mono text-[8px] tracking-wide uppercase">
      <div className="mr-1.5 w-1 flex-shrink-0" />
      <div className="min-w-0 flex-1 text-left font-sans">Name</div>
      <div className="border-border-theme-subtle/30 w-[28px] flex-shrink-0 border-l text-center">
        Loc
      </div>
      <div className="border-border-theme-subtle/30 w-[44px] flex-shrink-0 border-l text-center">
        S/M/L
      </div>
      <div className="border-border-theme-subtle/30 w-[20px] flex-shrink-0 border-l text-center">
        H
      </div>
      <div className="border-border-theme-subtle/30 w-[20px] flex-shrink-0 border-l text-center">
        C
      </div>
      <div className="border-border-theme-subtle/30 w-[28px] flex-shrink-0 border-l text-center">
        Wt
      </div>
      <div className="border-border-theme-subtle/30 w-[45px] flex-shrink-0 border-l text-center">
        <AppIcon name="link" size="inline" aria-hidden="true" />
      </div>
      <div className="border-border-theme-subtle/30 w-[45px] flex-shrink-0 border-l text-center">
        <AppIcon name="trash" size="inline" aria-hidden="true" />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================
