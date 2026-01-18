/**
 * Force Builder Component
 *
 * Main component for building and managing a force.
 * Displays all assignment slots with pilot/unit selection,
 * force statistics, and validation warnings.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import { AssignmentSlot } from './AssignmentSlot';
import {
  IForce,
  IForceValidation,
  ForceStatus,
  getForceTypeName,
} from '@/types/force';
import { IPilot } from '@/types/pilot';

// =============================================================================
// Types
// =============================================================================

export interface ForceBuilderProps {
  /** The force being built/edited */
  force: IForce;
  /** Resolved pilot data for each assignment (keyed by pilotId) */
  pilots: Map<string, IPilot>;
  /** Unit data for each assignment (keyed by unitId) */
  units: Map<string, { name: string; bv: number; tonnage: number }>;
  /** Validation result */
  validation?: IForceValidation;
  /** Called when a pilot should be selected for an assignment */
  onSelectPilot?: (assignmentId: string) => void;
  /** Called when a unit should be selected for an assignment */
  onSelectUnit?: (assignmentId: string) => void;
  /** Called when an assignment should be cleared */
  onClearAssignment?: (assignmentId: string) => void;
  /** Called when assignments should be swapped */
  onSwapAssignments?: (assignmentId1: string, assignmentId2: string) => void;
  /** Called when force name should be edited */
  onEditName?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusBadgeVariant(
  status: ForceStatus
): 'emerald' | 'amber' | 'cyan' | 'muted' {
  switch (status) {
    case ForceStatus.Active:
      return 'emerald';
    case ForceStatus.Maintenance:
      return 'amber';
    case ForceStatus.Transit:
      return 'cyan';
    case ForceStatus.Disbanded:
      return 'muted';
    default:
      return 'muted';
  }
}

function getStatusLabel(status: ForceStatus): string {
  switch (status) {
    case ForceStatus.Active:
      return 'Active';
    case ForceStatus.Maintenance:
      return 'Maintenance';
    case ForceStatus.Transit:
      return 'Transit';
    case ForceStatus.Disbanded:
      return 'Disbanded';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// Component
// =============================================================================

export function ForceBuilder({
  force,
  pilots,
  units,
  validation,
  onSelectPilot,
  onSelectUnit,
  onClearAssignment,
  onSwapAssignments,
  onEditName,
  className = '',
}: ForceBuilderProps): React.ReactElement {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [firstSwapSlot, setFirstSwapSlot] = useState<string | null>(null);

  // Handle slot click for selection/swap
  const handleSlotClick = useCallback(
    (assignmentId: string) => {
      if (swapMode) {
        if (!firstSwapSlot) {
          setFirstSwapSlot(assignmentId);
        } else if (firstSwapSlot !== assignmentId) {
          onSwapAssignments?.(firstSwapSlot, assignmentId);
          setSwapMode(false);
          setFirstSwapSlot(null);
        }
      } else {
        setSelectedSlotId(
          selectedSlotId === assignmentId ? null : assignmentId
        );
      }
    },
    [swapMode, firstSwapSlot, selectedSlotId, onSwapAssignments]
  );

  // Cancel swap mode
  const handleCancelSwap = useCallback(() => {
    setSwapMode(false);
    setFirstSwapSlot(null);
  }, []);

  // Start swap mode
  const handleStartSwap = useCallback(() => {
    setSwapMode(true);
    setFirstSwapSlot(null);
    setSelectedSlotId(null);
  }, []);

  // Calculate force readiness stats
  const stats = useMemo(() => {
    const total = force.assignments.length;
    const withPilot = force.assignments.filter((a) => a.pilotId).length;
    const withUnit = force.assignments.filter((a) => a.unitId).length;
    const complete = force.assignments.filter(
      (a) => a.pilotId && a.unitId
    ).length;
    const empty = force.assignments.filter(
      (a) => !a.pilotId && !a.unitId
    ).length;

    return { total, withPilot, withUnit, complete, empty };
  }, [force.assignments]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card variant="header">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-text-theme-primary">
                {force.name}
              </h2>
              {onEditName && (
                <button
                  onClick={onEditName}
                  className="p-1 rounded hover:bg-surface-theme-elevated text-text-theme-muted hover:text-text-theme-secondary"
                  title="Edit name"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="slate" size="md">
                {getForceTypeName(force.forceType)}
              </Badge>
              <Badge
                variant={getStatusBadgeVariant(force.status)}
                size="md"
              >
                {getStatusLabel(force.status)}
              </Badge>
              {force.affiliation && (
                <span className="text-sm text-text-theme-secondary">
                  {force.affiliation}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="text-right">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-text-theme-muted">BV Total: </span>
                <span className="font-mono font-bold text-accent">
                  {force.stats.totalBV.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-text-theme-muted">Tonnage: </span>
                <span className="font-mono font-bold text-text-theme-primary">
                  {force.stats.totalTonnage}t
                </span>
              </div>
            </div>
            <div className="mt-1 text-sm text-text-theme-secondary">
              {stats.complete}/{stats.total} slots ready
            </div>
          </div>
        </div>

        {/* Description */}
        {force.description && (
          <p className="mt-4 text-text-theme-secondary">{force.description}</p>
        )}
      </Card>

      {/* Validation Warnings */}
      {validation && validation.warnings.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium text-amber-400">Warnings</span>
          </div>
          <ul className="space-y-1">
            {validation.warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${index}`}
                className="text-sm text-amber-200"
              >
                {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Validation Errors */}
      {validation && validation.errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium text-red-400">Errors</span>
          </div>
          <ul className="space-y-1">
            {validation.errors.map((error, index) => (
              <li
                key={`${error.code}-${index}`}
                className="text-sm text-red-200"
              >
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {swapMode ? (
          <>
            <span className="text-sm text-text-theme-secondary">
              {firstSwapSlot
                ? 'Select second slot to swap with'
                : 'Select first slot to swap'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCancelSwap}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleStartSwap}>
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Swap Slots
          </Button>
        )}
      </div>

      {/* Assignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {force.assignments.map((assignment) => {
          const pilot = assignment.pilotId
            ? pilots.get(assignment.pilotId)
            : null;
          const unit = assignment.unitId
            ? units.get(assignment.unitId)
            : null;

          return (
            <AssignmentSlot
              key={assignment.id}
              assignment={assignment}
              pilot={pilot}
              unitName={unit?.name}
              unitBV={unit?.bv}
              unitTonnage={unit?.tonnage}
              isSelected={
                selectedSlotId === assignment.id ||
                firstSwapSlot === assignment.id
              }
              onClick={() => handleSlotClick(assignment.id)}
              onSelectPilot={() => onSelectPilot?.(assignment.id)}
              onSelectUnit={() => onSelectUnit?.(assignment.id)}
              onClear={() => onClearAssignment?.(assignment.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
