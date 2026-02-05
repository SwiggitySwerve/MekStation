/**
 * Assignment Slot Component
 *
 * Displays a single assignment slot within a force showing:
 * - Slot number and position
 * - Assigned pilot (or empty state)
 * - Assigned unit/mech (or empty state)
 * - Quick actions (clear, swap)
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import React from 'react';

import { Card, Badge } from '@/components/ui';
import { IAssignment, ForcePosition } from '@/types/force';
import { IPilot, IPilotSkills } from '@/types/pilot';

// =============================================================================
// Types
// =============================================================================

export interface AssignmentSlotProps {
  /** The assignment data */
  assignment: IAssignment;
  /** Resolved pilot data (if assigned) */
  pilot?: IPilot | null;
  /** Unit name (if assigned) */
  unitName?: string | null;
  /** Unit BV (if assigned) */
  unitBV?: number;
  /** Unit tonnage (if assigned) */
  unitTonnage?: number;
  /** Whether this slot is selected */
  isSelected?: boolean;
  /** Called when slot is clicked */
  onClick?: () => void;
  /** Called when pilot should be selected */
  onSelectPilot?: () => void;
  /** Called when unit should be selected */
  onSelectUnit?: () => void;
  /** Called when assignment should be cleared */
  onClear?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getPositionLabel(position: ForcePosition): string {
  switch (position) {
    case ForcePosition.Commander:
      return 'Commander';
    case ForcePosition.Executive:
      return 'XO';
    case ForcePosition.Lead:
      return 'Lead';
    case ForcePosition.Member:
      return 'Member';
    case ForcePosition.Scout:
      return 'Scout';
    case ForcePosition.FireSupport:
      return 'Fire Support';
    default:
      return 'Member';
  }
}

function getPositionBadgeVariant(
  position: ForcePosition,
): 'amber' | 'cyan' | 'muted' | 'orange' | 'violet' {
  switch (position) {
    case ForcePosition.Commander:
      return 'amber';
    case ForcePosition.Executive:
      return 'amber';
    case ForcePosition.Lead:
      return 'orange';
    case ForcePosition.Scout:
      return 'cyan';
    case ForcePosition.FireSupport:
      return 'violet';
    default:
      return 'muted';
  }
}

function formatSkills(skills: IPilotSkills): string {
  return `${skills.gunnery}/${skills.piloting}`;
}

// =============================================================================
// Component
// =============================================================================

export function AssignmentSlot({
  assignment,
  pilot,
  unitName,
  unitBV,
  unitTonnage,
  isSelected = false,
  onClick,
  onSelectPilot,
  onSelectUnit,
  onClear,
  className = '',
}: AssignmentSlotProps): React.ReactElement {
  const hasPilot = !!pilot;
  const hasUnit = !!unitName;
  const isEmpty = !hasPilot && !hasUnit;
  const isComplete = hasPilot && hasUnit;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
  };

  const handleSelectPilot = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPilot?.();
  };

  const handleSelectUnit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectUnit?.();
  };

  return (
    <Card
      variant={isSelected ? 'interactive' : 'default'}
      onClick={onClick}
      className={`group transition-all ${isSelected ? 'ring-accent ring-2' : ''} ${className}`}
    >
      <div className="p-3">
        {/* Header: Slot number and position */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-text-theme-muted font-mono text-sm">
              #{assignment.slot}
            </span>
            <Badge
              variant={getPositionBadgeVariant(assignment.position)}
              size="sm"
            >
              {getPositionLabel(assignment.position)}
            </Badge>
          </div>

          {/* Clear button */}
          {!isEmpty && onClear && (
            <button
              onClick={handleClear}
              className="hover:bg-surface-theme-elevated text-text-theme-muted hover:text-text-theme-secondary rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
              title="Clear assignment"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Pilot Section */}
        <div className="mb-2">
          <div className="text-text-theme-muted mb-1 text-xs tracking-wide uppercase">
            Pilot
          </div>
          {hasPilot ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-text-theme-primary font-medium">
                  {pilot.callsign || pilot.name}
                </span>
                <span className="text-text-theme-secondary ml-2 font-mono text-sm">
                  ({formatSkills(pilot.skills)})
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSelectPilot}
              className="border-border-theme-subtle hover:border-accent text-text-theme-muted hover:text-accent w-full rounded border-2 border-dashed px-3 py-2 text-sm transition-colors"
            >
              + Select Pilot
            </button>
          )}
        </div>

        {/* Unit Section */}
        <div>
          <div className="text-text-theme-muted mb-1 text-xs tracking-wide uppercase">
            Unit
          </div>
          {hasUnit ? (
            <div className="flex items-center justify-between">
              <span className="text-text-theme-primary font-medium">
                {unitName}
              </span>
              <div className="text-text-theme-secondary flex items-center gap-2 text-sm">
                {unitTonnage && (
                  <span className="font-mono">{unitTonnage}t</span>
                )}
                {unitBV && (
                  <span className="text-accent font-mono">{unitBV} BV</span>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={handleSelectUnit}
              className="border-border-theme-subtle hover:border-accent text-text-theme-muted hover:text-accent w-full rounded border-2 border-dashed px-3 py-2 text-sm transition-colors"
            >
              + Select Unit
            </button>
          )}
        </div>

        {/* Status indicator */}
        {!isEmpty && (
          <div className="border-border-theme-subtle mt-3 border-t pt-2">
            <div className="flex items-center gap-1">
              <div
                className={`h-2 w-2 rounded-full ${
                  isComplete ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-text-theme-muted text-xs">
                {isComplete ? 'Ready' : hasPilot ? 'Needs unit' : 'Needs pilot'}
              </span>
            </div>
          </div>
        )}

        {/* Notes */}
        {assignment.notes && (
          <div className="text-text-theme-muted mt-2 text-xs italic">
            {assignment.notes}
          </div>
        )}
      </div>
    </Card>
  );
}
