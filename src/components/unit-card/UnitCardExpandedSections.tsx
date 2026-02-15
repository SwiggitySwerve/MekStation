import React from 'react';

import type { EquipmentEntry, CriticalSlotSummary } from './UnitCardExpanded';

import { Badge } from '../ui/Badge';

// =============================================================================
// Core Stats Grid
// =============================================================================

interface CoreStatsGridProps {
  walkMP: number;
  runMP: number;
  jumpMP: number;
  totalArmor: number;
  maxArmor: number;
  armorPercentage: number;
  armorType: string;
  structureType: string;
  heatGenerated: number;
  heatDissipation: number;
  heatDisplay: string;
  heatClassName: string;
}

export function CoreStatsGrid({
  walkMP,
  runMP,
  jumpMP,
  totalArmor,
  maxArmor,
  armorPercentage,
  armorType,
  structureType,
  heatGenerated,
  heatDissipation,
  heatDisplay,
  heatClassName,
}: CoreStatsGridProps): React.ReactElement {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Movement */}
      <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-4">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-amber-400 uppercase">
          Movement
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Walk</span>
            <span className="text-text-theme-primary font-mono font-semibold">
              {walkMP}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Run</span>
            <span className="text-text-theme-primary font-mono font-semibold">
              {runMP}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Jump</span>
            <span
              className={`font-mono font-semibold ${jumpMP > 0 ? 'text-cyan-400' : 'text-text-theme-muted'}`}
            >
              {jumpMP}
            </span>
          </div>
        </div>
      </div>

      {/* Armor */}
      <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-4">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-cyan-400 uppercase">
          Armor
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Total</span>
            <span className="text-text-theme-primary font-mono font-semibold">
              {totalArmor}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Max</span>
            <span className="text-text-theme-muted font-mono">{maxArmor}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Coverage</span>
            <span
              className={`font-mono font-semibold ${armorPercentage >= 90 ? 'text-emerald-400' : armorPercentage >= 70 ? 'text-amber-400' : 'text-rose-400'}`}
            >
              {armorPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Structure */}
      <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-4">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
          Structure
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Armor Type</span>
            <span className="text-text-theme-primary font-mono text-xs">
              {armorType}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Internal</span>
            <span className="text-text-theme-primary font-mono text-xs">
              {structureType}
            </span>
          </div>
        </div>
      </div>

      {/* Heat */}
      <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-4">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-rose-400 uppercase">
          Heat
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Generated</span>
            <span className="font-mono font-semibold text-rose-400">
              {heatGenerated}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Dissipated</span>
            <span className="font-mono font-semibold text-cyan-400">
              {heatDissipation}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-theme-secondary">Net</span>
            <span className={`font-mono font-semibold ${heatClassName}`}>
              {heatDisplay}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Equipment List
// =============================================================================

interface EquipmentListProps {
  equipmentByCategory: Record<string, EquipmentEntry[]>;
}

export function EquipmentList({
  equipmentByCategory,
}: EquipmentListProps): React.ReactElement {
  return (
    <div className="mb-6">
      <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        <span className="h-4 w-1 rounded-full bg-cyan-500" />
        Equipment
      </h3>
      <div className="space-y-4">
        {Object.entries(equipmentByCategory).map(([category, items]) => (
          <div
            key={category}
            className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border"
          >
            <div className="bg-surface-base/50 border-border-theme-subtle/30 border-b px-4 py-2">
              <span className="text-text-theme-muted text-xs font-semibold tracking-wider uppercase">
                {category}
              </span>
            </div>
            <div className="divide-border-theme-subtle/20 divide-y">
              {items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="hover:bg-surface-base/30 flex items-center justify-between px-4 py-2 text-sm transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {item.count > 1 && (
                      <Badge variant="muted" size="sm">
                        {item.count}x
                      </Badge>
                    )}
                    <span className="text-text-theme-primary">{item.name}</span>
                    {item.location && (
                      <span className="text-text-theme-muted text-xs">
                        ({item.location})
                      </span>
                    )}
                  </div>
                  <div className="text-text-theme-muted flex items-center gap-4 font-mono text-xs">
                    <span>{item.weight}t</span>
                    <span>{item.slots} slots</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Critical Slots Summary
// =============================================================================

interface CriticalSlotsSummaryProps {
  criticalSlots: CriticalSlotSummary[];
}

export function CriticalSlotsSummary({
  criticalSlots,
}: CriticalSlotsSummaryProps): React.ReactElement {
  return (
    <div className="mb-6">
      <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        <span className="h-4 w-1 rounded-full bg-emerald-500" />
        Critical Slots
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {criticalSlots.map((location) => {
          const usagePercent =
            location.totalSlots > 0
              ? Math.round((location.usedSlots / location.totalSlots) * 100)
              : 0;
          const isFull = location.freeSlots === 0;

          return (
            <div
              key={location.location}
              className={`bg-surface-base/50 rounded-lg border p-3 ${isFull ? 'border-rose-500/30' : 'border-border-theme-subtle/50'}`}
            >
              <div className="text-text-theme-muted mb-2 truncate text-xs font-semibold tracking-wider uppercase">
                {location.location}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-text-theme-primary font-mono text-lg font-bold">
                  {location.usedSlots}
                </span>
                <span className="text-text-theme-muted text-xs">
                  / {location.totalSlots}
                </span>
              </div>
              <div className="bg-surface-base mt-2 h-1 overflow-hidden rounded-full">
                <div
                  className={`h-full transition-all ${isFull ? 'bg-rose-500' : usagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
