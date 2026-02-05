/**
 * UnitCardExpanded Component
 * Extended unit card with all available details.
 *
 * Includes everything from Standard plus: equipment list, critical slots, quirks, notes
 */
import React from 'react';

import { getHeatDisplay } from '@/utils/heatCalculation';
import { getTechBaseDisplay } from '@/utils/techBase';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { UnitCardStandardProps } from './UnitCardStandard';

export interface EquipmentEntry {
  name: string;
  category: string;
  weight: number;
  slots: number;
  location?: string;
  count: number;
}

export interface CriticalSlotSummary {
  location: string;
  totalSlots: number;
  usedSlots: number;
  freeSlots: number;
}

export interface UnitCardExpandedProps extends UnitCardStandardProps {
  // Additional equipment (non-weapon)
  equipment: EquipmentEntry[];

  // Critical slots per location
  criticalSlots: CriticalSlotSummary[];

  // Quirks
  quirks: string[];

  // Fluff
  notes?: string;
  overview?: string;
}

/**
 * Expanded unit card with full equipment and fluff details
 */
export function UnitCardExpanded({
  name,
  techBaseName,
  rulesLevelName,
  year,
  tonnage,
  weightClassName,
  battleValue,
  walkMP,
  runMP,
  jumpMP,
  totalArmor,
  maxArmor,
  armorType,
  structureType,
  weapons,
  heatGenerated,
  heatDissipation,
  equipment,
  criticalSlots,
  quirks,
  notes,
  overview,
  onEdit,
  onExport,
  onShare,
  onDuplicate,
  onDelete,
  className = '',
}: UnitCardExpandedProps): React.ReactElement {
  const { variant: techBadgeVariant, label: techLabel } =
    getTechBaseDisplay(techBaseName);

  const armorPercentage =
    maxArmor > 0 ? Math.round((totalArmor / maxArmor) * 100) : 0;
  const heat = getHeatDisplay(heatGenerated, heatDissipation);

  const hasActions = onEdit || onExport || onShare || onDuplicate || onDelete;

  // Group equipment by category
  const equipmentByCategory = equipment.reduce(
    (acc, item) => {
      const category = item.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, EquipmentEntry[]>,
  );

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="border-border-theme-subtle mb-6 border-b pb-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="text-text-theme-primary text-2xl font-bold tracking-tight">
            {name}
          </h2>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Badge variant={techBadgeVariant} size="md">
              {techLabel}
            </Badge>
            <Badge variant="slate" size="md">
              {year}
            </Badge>
            <Badge variant="muted" size="md">
              {rulesLevelName}
            </Badge>
          </div>
        </div>

        <div className="text-text-theme-secondary flex items-center gap-3 text-sm">
          <span className="text-text-theme-primary font-semibold">
            {weightClassName}
          </span>
          <span className="text-border-theme-subtle">-</span>
          <span className="font-mono">{tonnage} tons</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="text-accent font-mono font-semibold">
            BV: {battleValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Overview/Fluff */}
      {overview && (
        <div className="mb-6">
          <p className="text-text-theme-secondary border-l-2 border-amber-500/30 pl-4 text-sm leading-relaxed italic">
            {overview}
          </p>
        </div>
      )}

      {/* Core Stats Grid */}
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
              <span className="text-text-theme-muted font-mono">
                {maxArmor}
              </span>
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
              <span className={`font-mono font-semibold ${heat.className}`}>
                {heat.display}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Weapons Table */}
      {weapons.length > 0 && (
        <div className="mb-6">
          <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <span className="h-4 w-1 rounded-full bg-rose-500" />
            Weapons
          </h3>
          <div className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border">
            {/* Table Header */}
            <div className="bg-surface-base/50 border-border-theme-subtle/30 text-text-theme-muted grid grid-cols-12 gap-2 border-b px-4 py-3 text-xs font-medium tracking-wider uppercase">
              <div className="col-span-5">Weapon</div>
              <div className="col-span-2 text-center">Damage</div>
              <div className="col-span-3 text-center">Range (S/M/L)</div>
              <div className="col-span-2 text-center">Heat</div>
            </div>

            {/* Table Body */}
            <div className="divide-border-theme-subtle/20 divide-y">
              {weapons.map((weapon, index) => (
                <div
                  key={`${weapon.name}-${index}`}
                  className="hover:bg-surface-base/30 grid grid-cols-12 gap-2 px-4 py-3 text-sm transition-colors"
                >
                  <div className="text-text-theme-primary col-span-5 flex items-center gap-2">
                    {weapon.count > 1 && (
                      <Badge variant="muted" size="sm">
                        {weapon.count}x
                      </Badge>
                    )}
                    <span className="truncate">{weapon.name}</span>
                  </div>
                  <div className="col-span-2 text-center font-mono font-semibold text-amber-400">
                    {weapon.damage}
                  </div>
                  <div className="text-text-theme-secondary col-span-3 text-center font-mono">
                    {weapon.rangeShort}/{weapon.rangeMedium}/{weapon.rangeLong}
                  </div>
                  <div className="col-span-2 text-center font-mono text-rose-400">
                    {weapon.heat}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Equipment List */}
      {equipment.length > 0 && (
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
                        <span className="text-text-theme-primary">
                          {item.name}
                        </span>
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
      )}

      {/* Critical Slots Summary */}
      {criticalSlots.length > 0 && (
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
                  {/* Usage bar */}
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
      )}

      {/* Quirks */}
      {quirks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <span className="h-4 w-1 rounded-full bg-violet-500" />
            Quirks
          </h3>
          <div className="flex flex-wrap gap-2">
            {quirks.map((quirk, index) => (
              <Badge key={index} variant="violet" size="md">
                {quirk}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="mb-6">
          <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
            <span className="h-4 w-1 rounded-full bg-amber-500" />
            Notes
          </h3>
          <div className="bg-surface-base/30 border-border-theme-subtle/50 rounded-lg border p-4">
            <p className="text-text-theme-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {notes}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasActions && (
        <div className="border-border-theme-subtle flex items-center gap-2 border-t pt-6">
          {onExport && (
            <Button variant="secondary" size="sm" onClick={onExport}>
              Export
            </Button>
          )}
          {onShare && (
            <Button variant="secondary" size="sm" onClick={onShare}>
              Share
            </Button>
          )}
          {onEdit && (
            <Button variant="primary" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDuplicate && (
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              Duplicate
            </Button>
          )}
          <div className="flex-1" />
          {onDelete && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default UnitCardExpanded;
