/**
 * UnitCardExpanded Component
 * Extended unit card with all available details.
 * 
 * Includes everything from Standard plus: equipment list, critical slots, quirks, notes
 */
import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { UnitCardStandardProps } from './UnitCardStandard';
import { getTechBaseDisplay } from '@/utils/techBase';
import { getHeatDisplay } from '@/utils/heatCalculation';

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
  const { variant: techBadgeVariant, label: techLabel } = getTechBaseDisplay(techBaseName);
  
  const armorPercentage = maxArmor > 0 ? Math.round((totalArmor / maxArmor) * 100) : 0;
  const heat = getHeatDisplay(heatGenerated, heatDissipation);

  const hasActions = onEdit || onExport || onShare || onDuplicate || onDelete;

  // Group equipment by category
  const equipmentByCategory = equipment.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, EquipmentEntry[]>);

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="border-b border-border-theme-subtle pb-4 mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-2xl font-bold text-text-theme-primary tracking-tight">
            {name}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
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
        
        <div className="flex items-center gap-3 text-sm text-text-theme-secondary">
          <span className="font-semibold text-text-theme-primary">{weightClassName}</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="font-mono">{tonnage} tons</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="font-mono text-accent font-semibold">BV: {battleValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Overview/Fluff */}
      {overview && (
        <div className="mb-6">
          <p className="text-text-theme-secondary text-sm leading-relaxed italic border-l-2 border-amber-500/30 pl-4">
            {overview}
          </p>
        </div>
      )}

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Movement */}
        <div className="bg-surface-base/50 rounded-lg p-4 border border-border-theme-subtle/50">
          <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
            Movement
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Walk</span>
              <span className="font-mono text-text-theme-primary font-semibold">{walkMP}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Run</span>
              <span className="font-mono text-text-theme-primary font-semibold">{runMP}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Jump</span>
              <span className={`font-mono font-semibold ${jumpMP > 0 ? 'text-cyan-400' : 'text-text-theme-muted'}`}>
                {jumpMP}
              </span>
            </div>
          </div>
        </div>

        {/* Armor */}
        <div className="bg-surface-base/50 rounded-lg p-4 border border-border-theme-subtle/50">
          <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3">
            Armor
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Total</span>
              <span className="font-mono text-text-theme-primary font-semibold">{totalArmor}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Max</span>
              <span className="font-mono text-text-theme-muted">{maxArmor}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Coverage</span>
              <span className={`font-mono font-semibold ${armorPercentage >= 90 ? 'text-emerald-400' : armorPercentage >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                {armorPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Structure */}
        <div className="bg-surface-base/50 rounded-lg p-4 border border-border-theme-subtle/50">
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
            Structure
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Armor Type</span>
              <span className="font-mono text-text-theme-primary text-xs">{armorType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Internal</span>
              <span className="font-mono text-text-theme-primary text-xs">{structureType}</span>
            </div>
          </div>
        </div>

        {/* Heat */}
        <div className="bg-surface-base/50 rounded-lg p-4 border border-border-theme-subtle/50">
          <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-3">
            Heat
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Generated</span>
              <span className="font-mono text-rose-400 font-semibold">{heatGenerated}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Dissipated</span>
              <span className="font-mono text-cyan-400 font-semibold">{heatDissipation}</span>
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
          <h3 className="text-sm font-semibold text-text-theme-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-rose-500 rounded-full" />
            Weapons
          </h3>
          <div className="bg-surface-base/30 rounded-lg border border-border-theme-subtle/50 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-surface-base/50 border-b border-border-theme-subtle/30 text-xs font-medium text-text-theme-muted uppercase tracking-wider">
              <div className="col-span-5">Weapon</div>
              <div className="col-span-2 text-center">Damage</div>
              <div className="col-span-3 text-center">Range (S/M/L)</div>
              <div className="col-span-2 text-center">Heat</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-border-theme-subtle/20">
              {weapons.map((weapon, index) => (
                <div 
                  key={`${weapon.name}-${index}`}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-surface-base/30 transition-colors"
                >
                  <div className="col-span-5 text-text-theme-primary flex items-center gap-2">
                    {weapon.count > 1 && (
                      <Badge variant="muted" size="sm">{weapon.count}x</Badge>
                    )}
                    <span className="truncate">{weapon.name}</span>
                  </div>
                  <div className="col-span-2 text-center font-mono text-amber-400 font-semibold">
                    {weapon.damage}
                  </div>
                  <div className="col-span-3 text-center font-mono text-text-theme-secondary">
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
          <h3 className="text-sm font-semibold text-text-theme-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-cyan-500 rounded-full" />
            Equipment
          </h3>
          <div className="space-y-4">
            {Object.entries(equipmentByCategory).map(([category, items]) => (
              <div key={category} className="bg-surface-base/30 rounded-lg border border-border-theme-subtle/50 overflow-hidden">
                <div className="px-4 py-2 bg-surface-base/50 border-b border-border-theme-subtle/30">
                  <span className="text-xs font-semibold text-text-theme-muted uppercase tracking-wider">
                    {category}
                  </span>
                </div>
                <div className="divide-y divide-border-theme-subtle/20">
                  {items.map((item, index) => (
                    <div 
                      key={`${item.name}-${index}`}
                      className="px-4 py-2 flex items-center justify-between text-sm hover:bg-surface-base/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {item.count > 1 && (
                          <Badge variant="muted" size="sm">{item.count}x</Badge>
                        )}
                        <span className="text-text-theme-primary">{item.name}</span>
                        {item.location && (
                          <span className="text-text-theme-muted text-xs">({item.location})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-text-theme-muted text-xs font-mono">
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
          <h3 className="text-sm font-semibold text-text-theme-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded-full" />
            Critical Slots
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {criticalSlots.map((location) => {
              const usagePercent = location.totalSlots > 0 
                ? Math.round((location.usedSlots / location.totalSlots) * 100) 
                : 0;
              const isFull = location.freeSlots === 0;
              
              return (
                <div 
                  key={location.location}
                  className={`bg-surface-base/50 rounded-lg p-3 border ${isFull ? 'border-rose-500/30' : 'border-border-theme-subtle/50'}`}
                >
                  <div className="text-xs font-semibold text-text-theme-muted uppercase tracking-wider mb-2 truncate">
                    {location.location}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold font-mono text-text-theme-primary">
                      {location.usedSlots}
                    </span>
                    <span className="text-text-theme-muted text-xs">/ {location.totalSlots}</span>
                  </div>
                  {/* Usage bar */}
                  <div className="mt-2 h-1 bg-surface-base rounded-full overflow-hidden">
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
          <h3 className="text-sm font-semibold text-text-theme-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-violet-500 rounded-full" />
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
          <h3 className="text-sm font-semibold text-text-theme-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded-full" />
            Notes
          </h3>
          <div className="bg-surface-base/30 rounded-lg p-4 border border-border-theme-subtle/50">
            <p className="text-text-theme-secondary text-sm leading-relaxed whitespace-pre-wrap">
              {notes}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {hasActions && (
        <div className="flex items-center gap-2 pt-6 border-t border-border-theme-subtle">
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
