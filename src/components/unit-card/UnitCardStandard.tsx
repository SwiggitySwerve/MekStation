/**
 * UnitCardStandard Component
 * Full unit card with complete combat information.
 *
 * Displays: Header, movement, armor/structure, weapons table, heat summary, action buttons
 */
import React from 'react';

import { getHeatDisplay } from '@/utils/heatCalculation';
import { getTechBaseDisplay } from '@/utils/techBase';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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
  const { variant: techBadgeVariant, label: techLabel } =
    getTechBaseDisplay(techBaseName);

  const armorPercentage =
    maxArmor > 0 ? Math.round((totalArmor / maxArmor) * 100) : 0;
  const heat = getHeatDisplay(heatGenerated, heatDissipation);

  const hasActions = onEdit || onExport || onShare || onDuplicate || onDelete;

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Header Section */}
      <div className="border-border-theme-subtle mb-4 border-b pb-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h2 className="text-text-theme-primary text-xl font-bold tracking-tight">
            {name}
          </h2>
          <div className="flex flex-shrink-0 items-center gap-2">
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

        <div className="text-text-theme-secondary flex items-center gap-2 text-sm">
          <span className="font-medium">{weightClassName}</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="font-mono">{tonnage} tons</span>
          <span className="text-border-theme-subtle">-</span>
          <span className="text-accent font-mono">
            BV: {battleValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Movement & Armor Grid */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        {/* Movement */}
        <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-3">
          <h3 className="text-text-theme-muted mb-2 text-xs font-semibold tracking-wider uppercase">
            Movement
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Walk</span>
              <span className="text-text-theme-primary font-mono">
                {walkMP}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Run</span>
              <span className="text-text-theme-primary font-mono">{runMP}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Jump</span>
              <span
                className={`font-mono ${jumpMP > 0 ? 'text-cyan-400' : 'text-text-theme-muted'}`}
              >
                {jumpMP}
              </span>
            </div>
          </div>
        </div>

        {/* Armor/Structure */}
        <div className="bg-surface-base/50 border-border-theme-subtle/50 rounded-lg border p-3">
          <h3 className="text-text-theme-muted mb-2 text-xs font-semibold tracking-wider uppercase">
            Armor / Structure
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-theme-secondary">Total</span>
              <span className="text-text-theme-primary font-mono">
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
                className={`font-mono ${armorPercentage >= 90 ? 'text-emerald-400' : armorPercentage >= 70 ? 'text-amber-400' : 'text-rose-400'}`}
              >
                {armorPercentage}%
              </span>
            </div>
          </div>
          <div className="border-border-theme-subtle/30 mt-2 border-t pt-2">
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
          <h3 className="text-text-theme-muted mb-2 text-xs font-semibold tracking-wider uppercase">
            Weapons
          </h3>
          <div className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border">
            {/* Table Header */}
            <div className="bg-surface-base/50 border-border-theme-subtle/30 text-text-theme-muted grid grid-cols-12 gap-2 border-b px-3 py-2 text-xs font-medium tracking-wider uppercase">
              <div className="col-span-5">Weapon</div>
              <div className="col-span-2 text-center">Dmg</div>
              <div className="col-span-3 text-center">Range</div>
              <div className="col-span-2 text-center">Heat</div>
            </div>

            {/* Table Body */}
            <div className="divide-border-theme-subtle/20 divide-y">
              {weapons.map((weapon, index) => (
                <div
                  key={`${weapon.name}-${index}`}
                  className="hover:bg-surface-base/30 grid grid-cols-12 gap-2 px-3 py-2 text-sm transition-colors"
                >
                  <div className="text-text-theme-primary col-span-5 flex items-center gap-1 truncate">
                    {weapon.count > 1 && (
                      <span className="text-text-theme-muted font-mono text-xs">
                        {weapon.count}x
                      </span>
                    )}
                    {weapon.name}
                  </div>
                  <div className="text-text-theme-secondary col-span-2 text-center font-mono">
                    {weapon.damage}
                  </div>
                  <div className="text-text-theme-muted col-span-3 text-center font-mono text-xs">
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
      <div className="bg-surface-base/30 border-border-theme-subtle/50 mb-4 rounded-lg border px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-muted text-xs font-semibold tracking-wider uppercase">
            Heat
          </span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-rose-400">{heatGenerated}</span>
            <span className="text-text-theme-muted">generated</span>
            <span className="text-text-theme-muted">/</span>
            <span className="text-cyan-400">{heatDissipation}</span>
            <span className="text-text-theme-muted">dissipated</span>
            <span className={`font-semibold ${heat.className}`}>
              ({heat.display})
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {hasActions && (
        <div className="border-border-theme-subtle flex items-center gap-2 border-t pt-4">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-rose-400 hover:text-rose-300"
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default UnitCardStandard;
