/**
 * Mech Section Component
 *
 * Displays assigned mech information or empty state.
 * Uses UnitCardCompact for mech display when assigned.
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IPilotMechCardMechData } from '@/types/pilot-mech-card';
import { calculateArmorPercentage } from '@/services/pilot-mech-card';

// =============================================================================
// Types
// =============================================================================

export interface MechSectionProps {
  /** Mech data (null if unassigned) */
  mech: IPilotMechCardMechData | null;
  /** Called when Change Mech is clicked */
  onChangeMech?: () => void;
  /** Whether to show the change mech button */
  showChangeMechButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Empty state for when no mech is assigned
 */
function EmptyMechState({
  onChangeMech,
}: {
  onChangeMech?: () => void;
}): React.ReactElement {
  return (
    <div
      className="border-2 border-dashed border-border-theme-subtle rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer"
      onClick={onChangeMech}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onChangeMech?.();
        }
      }}
    >
      <div className="text-text-theme-muted mb-2">
        <svg
          className="w-12 h-12 mx-auto opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <p className="text-text-theme-secondary text-sm font-medium mb-2">
        No Mech Assigned
      </p>
      <p className="text-text-theme-muted text-xs">
        Click to assign a mech to this pilot
      </p>
    </div>
  );
}

/**
 * Compact mech display with key stats
 */
function MechDisplay({
  mech,
}: {
  mech: IPilotMechCardMechData;
}): React.ReactElement {
  const armorPercentage = calculateArmorPercentage(mech.totalArmor, mech.maxArmor);
  
  // Determine tech base badge variant
  const techBadgeVariant = mech.techBase.toLowerCase().includes('clan')
    ? 'cyan'
    : mech.techBase.toLowerCase() === 'is' || mech.techBase.toLowerCase().includes('inner')
    ? 'amber'
    : 'slate';

  return (
    <Card variant="dark" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="text-lg font-bold text-text-theme-primary truncate">
            {mech.name}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={techBadgeVariant} size="sm">
              {mech.techBase}
            </Badge>
            <span className="text-sm text-text-theme-muted">
              {mech.weightClass}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-text-theme-muted uppercase tracking-wider">BV</div>
          <div className="text-accent font-bold font-mono text-lg">
            {mech.battleValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Tonnage & Movement */}
        <div className="bg-surface-base/30 rounded-lg p-2.5 border border-border-theme-subtle/30">
          <div className="text-xs text-text-theme-muted mb-1.5">Movement</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-text-theme-primary font-semibold">
              {mech.tonnage}t
            </span>
            <span className="font-mono text-text-theme-secondary text-sm">
              {mech.walkMP}/{mech.runMP}/{mech.jumpMP}
            </span>
          </div>
        </div>

        {/* Armor */}
        <div className="bg-surface-base/30 rounded-lg p-2.5 border border-border-theme-subtle/30">
          <div className="text-xs text-text-theme-muted mb-1.5">Armor</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-text-theme-primary font-semibold">
              {mech.totalArmor}
            </span>
            <span
              className={`font-mono text-sm font-semibold ${
                armorPercentage >= 90
                  ? 'text-emerald-400'
                  : armorPercentage >= 70
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {armorPercentage}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MechSection({
  mech,
  onChangeMech,
  showChangeMechButton = true,
  className = '',
}: MechSectionProps): React.ReactElement {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-theme-muted uppercase tracking-wider font-semibold">
          Assigned Mech
        </span>
        {showChangeMechButton && mech && onChangeMech && (
          <Button variant="ghost" size="sm" onClick={onChangeMech}>
            Change
          </Button>
        )}
      </div>

      {mech ? (
        <MechDisplay mech={mech} />
      ) : (
        <EmptyMechState onChangeMech={onChangeMech} />
      )}
    </div>
  );
}

export default MechSection;
