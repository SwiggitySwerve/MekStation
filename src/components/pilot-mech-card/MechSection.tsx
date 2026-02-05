/**
 * Mech Section Component
 *
 * Displays assigned mech information or empty state.
 * Uses UnitCardCompact for mech display when assigned.
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { calculateArmorPercentage } from '@/services/pilot-mech-card';
import { IPilotMechCardMechData } from '@/types/pilot/pilot-mech-card';

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
      className="border-border-theme-subtle hover:border-accent/50 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors"
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
          className="mx-auto h-12 w-12 opacity-50"
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
      <p className="text-text-theme-secondary mb-2 text-sm font-medium">
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
  const armorPercentage = calculateArmorPercentage(
    mech.totalArmor,
    mech.maxArmor,
  );

  // Determine tech base badge variant
  const techBadgeVariant = mech.techBase.toLowerCase().includes('clan')
    ? 'cyan'
    : mech.techBase.toLowerCase() === 'is' ||
        mech.techBase.toLowerCase().includes('inner')
      ? 'amber'
      : 'slate';

  return (
    <Card variant="dark" className="overflow-hidden">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-text-theme-primary truncate text-lg font-bold">
            {mech.name}
          </h4>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={techBadgeVariant} size="sm">
              {mech.techBase}
            </Badge>
            <span className="text-text-theme-muted text-sm">
              {mech.weightClass}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div className="text-text-theme-muted text-xs tracking-wider uppercase">
            BV
          </div>
          <div className="text-accent font-mono text-lg font-bold">
            {mech.battleValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        {/* Tonnage & Movement */}
        <div className="bg-surface-base/30 border-border-theme-subtle/30 rounded-lg border p-2.5">
          <div className="text-text-theme-muted mb-1.5 text-xs">Movement</div>
          <div className="flex items-center justify-between">
            <span className="text-text-theme-primary font-mono font-semibold">
              {mech.tonnage}t
            </span>
            <span className="text-text-theme-secondary font-mono text-sm">
              {mech.walkMP}/{mech.runMP}/{mech.jumpMP}
            </span>
          </div>
        </div>

        {/* Armor */}
        <div className="bg-surface-base/30 border-border-theme-subtle/30 rounded-lg border p-2.5">
          <div className="text-text-theme-muted mb-1.5 text-xs">Armor</div>
          <div className="flex items-center justify-between">
            <span className="text-text-theme-primary font-mono font-semibold">
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
        <span className="text-text-theme-muted text-xs font-semibold tracking-wider uppercase">
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
