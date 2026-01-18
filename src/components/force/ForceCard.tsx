/**
 * Force Card Component
 *
 * Compact display of a force for list views and roster pages.
 * Shows key force information and readiness status.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import React from 'react';
import { Card, Badge } from '@/components/ui';
import {
  IForce,
  IForceSummary,
  ForceType,
  ForceStatus,
  getForceTypeName,
} from '@/types/force';

// =============================================================================
// Types
// =============================================================================

export interface ForceCardProps {
  /** Force data */
  force: IForce | IForceSummary;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Called when card is clicked */
  onClick?: () => void;
  /** Hierarchy depth for indentation */
  depth?: number;
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

function getForceTypeVariant(
  forceType: ForceType
): 'amber' | 'cyan' | 'violet' | 'muted' {
  switch (forceType) {
    case ForceType.Lance:
    case ForceType.Company:
    case ForceType.Battalion:
      return 'amber'; // Inner Sphere
    case ForceType.Star:
    case ForceType.Binary:
    case ForceType.Cluster:
      return 'cyan'; // Clan
    case ForceType.Level_II:
      return 'violet'; // ComStar
    default:
      return 'muted';
  }
}

// =============================================================================
// Component
// =============================================================================

export function ForceCard({
  force,
  isSelected = false,
  onClick,
  depth = 0,
  className = '',
}: ForceCardProps): React.ReactElement {
  const stats = force.stats;
  const readyCount = Math.min(stats.assignedPilots, stats.assignedUnits);
  const totalSlots =
    stats.assignedPilots +
    stats.assignedUnits +
    stats.emptySlots -
    readyCount; // Avoid double counting

  const readinessPercent =
    totalSlots > 0 ? Math.round((readyCount / totalSlots) * 100) : 0;

  return (
    <Card
      variant={isSelected ? 'interactive' : 'default'}
      onClick={onClick}
      className={`group transition-all ${isSelected ? 'ring-2 ring-accent' : ''} ${className}`}
    >
      <div
        className="flex items-start gap-4"
        style={{ marginLeft: `${depth * 1.5}rem` }}
      >
        {/* Hierarchy indicator */}
        {depth > 0 && (
          <div className="flex-shrink-0 w-4 h-full border-l-2 border-border-theme-subtle" />
        )}

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-theme-primary truncate">
                {force.name}
              </h3>
              <Badge
                variant={getForceTypeVariant(force.forceType)}
                size="sm"
              >
                {getForceTypeName(force.forceType)}
              </Badge>
              <Badge
                variant={getStatusBadgeVariant(force.status)}
                size="sm"
              >
                {getStatusLabel(force.status)}
              </Badge>
            </div>
          </div>

          {/* Affiliation */}
          {force.affiliation && (
            <div className="text-sm text-text-theme-secondary mb-2">
              {force.affiliation}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-text-theme-muted">BV:</span>
              <span className="font-mono font-bold text-accent">
                {stats.totalBV.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-text-theme-muted">Tonnage:</span>
              <span className="font-mono font-bold text-text-theme-primary">
                {stats.totalTonnage}t
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-text-theme-muted">Ready:</span>
              <span
                className={`font-mono font-bold ${
                  readinessPercent === 100
                    ? 'text-emerald-400'
                    : readinessPercent >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {readyCount}/{totalSlots - stats.emptySlots}
              </span>
            </div>
          </div>

          {/* Readiness bar */}
          <div className="mt-2">
            <div className="h-1 bg-surface-theme-elevated rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  readinessPercent === 100
                    ? 'bg-emerald-500'
                    : readinessPercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Arrow indicator */}
        {onClick && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              className="w-5 h-5 text-text-theme-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        )}
      </div>
    </Card>
  );
}
