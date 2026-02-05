/**
 * UnitCardCompact Component
 * Minimal unit info display for list views and quick scanning.
 *
 * Displays: Name, tonnage, weight class, tech base, BV, movement, rules level
 */
import React from 'react';

import { getTechBaseDisplay } from '@/utils/techBase';

import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

export interface UnitCardCompactProps {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  weightClassName: string;
  techBaseName: string;
  battleValue: number;
  rulesLevelName: string;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact unit card for list views
 */
export function UnitCardCompact({
  name,
  tonnage,
  weightClassName,
  techBaseName,
  battleValue,
  rulesLevelName,
  walkMP,
  runMP,
  jumpMP,
  onClick,
  className = '',
}: UnitCardCompactProps): React.ReactElement {
  const { variant: techBadgeVariant, label: techLabel } =
    getTechBaseDisplay(techBaseName);

  return (
    <Card
      variant="interactive"
      onClick={onClick}
      className={`group ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Unit identity */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-text-theme-primary truncate font-semibold">
              {name}
            </h3>
            <Badge variant={techBadgeVariant} size="sm">
              {techLabel}
            </Badge>
          </div>

          <div className="text-text-theme-secondary flex items-center gap-3 text-sm">
            <span className="text-text-theme-muted font-medium">
              {weightClassName}
            </span>
            <span className="text-border-theme-subtle">|</span>
            <span className="font-mono">{tonnage}t</span>
            <span className="text-border-theme-subtle">|</span>
            <span className="text-text-theme-muted font-mono">
              {walkMP}/{runMP}/{jumpMP}
            </span>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <Badge variant="muted" size="sm">
            {rulesLevelName}
          </Badge>

          <div className="text-right">
            <div className="text-text-theme-muted text-xs tracking-wide uppercase">
              BV
            </div>
            <div className="text-accent font-mono font-bold">
              {battleValue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default UnitCardCompact;
