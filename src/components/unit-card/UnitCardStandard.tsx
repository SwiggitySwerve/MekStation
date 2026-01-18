/**
 * UnitCardStandard Component
 * Full unit card with complete combat information.
 * 
 * Displays: Header, movement, armor/structure, weapons table, heat summary, action buttons
 */
import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface WeaponEntry {
  name: string;
  damage: string;
  rangeShort: number;
  rangeMedium: number;
  rangeLong: number;
  heat: number;
  count: number;
}

export interface UnitCardStandardProps {
  // Identity
  id: string;
  name: string;
  chassis: string;
  model: string;
  
  // Classification
  techBaseName: string;
  rulesLevelName: string;
  year: number;
  
  // Physical
  tonnage: number;
  weightClassName: string;
  
  // Combat
  battleValue: number;
  
  // Movement
  walkMP: number;
  runMP: number;
  jumpMP: number;
  
  // Armor
  totalArmor: number;
  maxArmor: number;
  armorType: string;
  structureType: string;
  
  // Weapons
  weapons: WeaponEntry[];
  
  // Heat
  heatGenerated: number;
  heatDissipation: number;
  
  // Actions
  onEdit?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  
  className?: string;
}

/**
 * Standard unit card with full combat details
 */
export function UnitCardStandard({
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
  onEdit,
  onExport,
  onShare,
  onDuplicate,
  onDelete,
  className = '',
}: UnitCardStandardProps): React.ReactElement {
  const isInnerSphere = techBaseName.toLowerCase().includes('inner sphere') || techBaseName.toLowerCase() === 'is';
  const isClan = techBaseName.toLowerCase().includes('clan');
  
  const techBadgeVariant = isClan ? 'cyan' : isInnerSphere ? 'amber' : 'slate';
  const techLabel = isClan ? 'Clan' : isInnerSphere ? 'IS' : techBaseName;
  
  const armorPercentage = maxArmor > 0 ? Math.round((totalArmor / maxArmor) * 100) : 0;
  const heatNet = heatGenerated - heatDissipation;
  const heatNetDisplay = heatNet > 0 ? `+${heatNet}` : heatNet.toString();
  const heatVariant = heatNet > 0 ? 'text-rose-400' : heatNet < 0 ? 'text-cyan-400' : 'text-text-theme-secondary';

  const hasActions = onEdit || onExport || onShare || onDuplicate || onDelete;

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="border-b border-border-theme-subtle pb-4 mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-xl font-bold text-text-theme-primary tracking-tight">
            {name}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={techBadgeVariant} size="sm">
              {techLabel}
            </Badge>
            <Badge variant="slate" size="sm">
              {year}
            </Badge>
            <Badge variant="muted" size="sm">
              {rulesLevelName}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-text-theme-secondary">
          <span className="font-medium">{weightClassName}</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="font-mono">{tonnage} tons</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="font-mono text-accent">BV: {battleValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Movement & Armor Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Movement */}
        <div className="bg-surface-base/50 rounded-lg p-3 border border-border-theme-subtle/50">
          <h3 className="text-xs font-semibold text-text-theme-muted uppercase tracking-wider mb-2">
            Movement
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Walk</span>
              <span className="font-mono text-text-theme-primary">{walkMP}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Run</span>
              <span className="font-mono text-text-theme-primary">{runMP}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Jump</span>
              <span className={`font-mono ${jumpMP > 0 ? 'text-cyan-400' : 'text-text-theme-muted'}`}>
                {jumpMP}
              </span>
            </div>
          </div>
        </div>

        {/* Armor/Structure */}
        <div className="bg-surface-base/50 rounded-lg p-3 border border-border-theme-subtle/50">
          <h3 className="text-xs font-semibold text-text-theme-muted uppercase tracking-wider mb-2">
            Armor / Structure
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Total</span>
              <span className="font-mono text-text-theme-primary">{totalArmor}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Max</span>
              <span className="font-mono text-text-theme-muted">{maxArmor}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Coverage</span>
              <span className={`font-mono ${armorPercentage >= 90 ? 'text-emerald-400' : armorPercentage >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                {armorPercentage}%
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-border-theme-subtle/30">
            <div className="flex justify-between text-xs">
              <span className="text-text-theme-muted">{armorType}</span>
              <span className="text-text-theme-muted">{structureType}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weapons Table */}
      {weapons.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-text-theme-muted uppercase tracking-wider mb-2">
            Weapons
          </h3>
          <div className="bg-surface-base/30 rounded-lg border border-border-theme-subtle/50 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-surface-base/50 border-b border-border-theme-subtle/30 text-xs font-medium text-text-theme-muted uppercase tracking-wider">
              <div className="col-span-5">Weapon</div>
              <div className="col-span-2 text-center">Dmg</div>
              <div className="col-span-3 text-center">Range</div>
              <div className="col-span-2 text-center">Heat</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-border-theme-subtle/20">
              {weapons.map((weapon, index) => (
                <div 
                  key={`${weapon.name}-${index}`}
                  className="grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-surface-base/30 transition-colors"
                >
                  <div className="col-span-5 text-text-theme-primary truncate flex items-center gap-1">
                    {weapon.count > 1 && (
                      <span className="text-text-theme-muted font-mono text-xs">{weapon.count}x</span>
                    )}
                    {weapon.name}
                  </div>
                  <div className="col-span-2 text-center font-mono text-text-theme-secondary">
                    {weapon.damage}
                  </div>
                  <div className="col-span-3 text-center font-mono text-text-theme-muted text-xs">
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

      {/* Heat Summary */}
      <div className="bg-surface-base/30 rounded-lg px-4 py-3 border border-border-theme-subtle/50 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-muted uppercase tracking-wider text-xs font-semibold">Heat</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-rose-400">{heatGenerated}</span>
            <span className="text-text-theme-muted">generated</span>
            <span className="text-text-theme-muted">/</span>
            <span className="text-cyan-400">{heatDissipation}</span>
            <span className="text-text-theme-muted">dissipated</span>
            <span className={`font-semibold ${heatVariant}`}>
              ({heatNetDisplay})
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {hasActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-border-theme-subtle">
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              Export
            </Button>
          )}
          {onShare && (
            <Button variant="ghost" size="sm" onClick={onShare}>
              Share
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onDuplicate && (
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              Duplicate
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-rose-400 hover:text-rose-300">
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default UnitCardStandard;
