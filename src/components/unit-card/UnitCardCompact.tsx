/**
 * UnitCardCompact Component
 * Minimal unit info display for list views and quick scanning.
 * 
 * Displays: Name, tonnage, weight class, tech base, BV, movement, rules level
 */
import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

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
  const isInnerSphere = techBaseName.toLowerCase().includes('inner sphere') || techBaseName.toLowerCase() === 'is';
  const isClan = techBaseName.toLowerCase().includes('clan');
  
  const techBadgeVariant = isClan ? 'cyan' : isInnerSphere ? 'amber' : 'slate';
  const techLabel = isClan ? 'Clan' : isInnerSphere ? 'IS' : techBaseName;

  return (
    <Card
      variant="interactive"
      onClick={onClick}
      className={`group ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Unit identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-text-theme-primary font-semibold truncate">
              {name}
            </h3>
            <Badge variant={techBadgeVariant} size="sm">
              {techLabel}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-text-theme-secondary">
            <span className="font-medium text-text-theme-muted">
              {weightClassName}
            </span>
            <span className="text-border-theme-subtle">|</span>
            <span className="font-mono">
              {tonnage}t
            </span>
            <span className="text-border-theme-subtle">|</span>
            <span className="font-mono text-text-theme-muted">
              {walkMP}/{runMP}/{jumpMP}
            </span>
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge variant="muted" size="sm">
            {rulesLevelName}
          </Badge>
          
          <div className="text-right">
            <div className="text-xs text-text-theme-muted uppercase tracking-wide">BV</div>
            <div className="text-accent font-bold font-mono">
              {battleValue.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default UnitCardCompact;
