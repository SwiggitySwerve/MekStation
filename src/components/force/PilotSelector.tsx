/**
 * Pilot Selector Component
 *
 * Modal dialog for selecting a pilot to assign to a force slot.
 * Displays available pilots with filtering and search.
 *
 * @spec openspec/changes/add-force-management/proposal.md
 */

import React, { useState, useMemo } from 'react';
import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Card, Badge, Button, Input } from '@/components/ui';
import { IPilot, PilotStatus, PilotType, getSkillLabel, getPilotRating } from '@/types/pilot';

// =============================================================================
// Types
// =============================================================================

export interface PilotSelectorProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when dialog should close */
  onClose: () => void;
  /** Called when a pilot is selected */
  onSelect: (pilotId: string) => void;
  /** Available pilots to choose from */
  pilots: readonly IPilot[];
  /** Pilot IDs that are already assigned (shown as unavailable) */
  assignedPilotIds?: readonly string[];
  /** Title for the dialog */
  title?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusBadgeVariant(
  status: PilotStatus
): 'emerald' | 'amber' | 'cyan' | 'red' | 'muted' {
  switch (status) {
    case PilotStatus.Active:
      return 'emerald';
    case PilotStatus.Injured:
      return 'amber';
    case PilotStatus.MIA:
      return 'cyan';
    case PilotStatus.KIA:
      return 'red';
    case PilotStatus.Retired:
      return 'muted';
    default:
      return 'muted';
  }
}

function getStatusLabel(status: PilotStatus): string {
  switch (status) {
    case PilotStatus.Active:
      return 'Active';
    case PilotStatus.Injured:
      return 'Injured';
    case PilotStatus.MIA:
      return 'MIA';
    case PilotStatus.KIA:
      return 'KIA';
    case PilotStatus.Retired:
      return 'Retired';
    default:
      return 'Unknown';
  }
}

function isAvailableForAssignment(pilot: IPilot): boolean {
  return (
    pilot.status === PilotStatus.Active ||
    pilot.status === PilotStatus.Injured
  );
}

// =============================================================================
// Component
// =============================================================================

export function PilotSelector({
  isOpen,
  onClose,
  onSelect,
  pilots,
  assignedPilotIds = [],
  title = 'Select Pilot',
}: PilotSelectorProps): React.ReactElement | null {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(false);

  // Filter and sort pilots
  const filteredPilots = useMemo(() => {
    const assignedSet = new Set(assignedPilotIds);

    return pilots
      .filter((pilot) => {
        // Search filter
        const matchesSearch =
          !searchQuery ||
          pilot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pilot.callsign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          pilot.affiliation?.toLowerCase().includes(searchQuery.toLowerCase());

        // Availability filter
        const isAvailable =
          isAvailableForAssignment(pilot) && !assignedSet.has(pilot.id);
        const matchesAvailability = showUnavailable || isAvailable;

        return matchesSearch && matchesAvailability;
      })
      .sort((a, b) => {
        // Sort by: available first, then by skill, then by name
        const aAvailable =
          isAvailableForAssignment(a) && !assignedSet.has(a.id);
        const bAvailable =
          isAvailableForAssignment(b) && !assignedSet.has(b.id);

        if (aAvailable !== bAvailable) {
          return aAvailable ? -1 : 1;
        }

        // Lower skill values are better
        const aSkill = a.skills.gunnery + a.skills.piloting;
        const bSkill = b.skills.gunnery + b.skills.piloting;
        if (aSkill !== bSkill) {
          return aSkill - bSkill;
        }

        return a.name.localeCompare(b.name);
      });
  }, [pilots, searchQuery, showUnavailable, assignedPilotIds]);

  const handleSelect = (pilotId: string) => {
    onSelect(pilotId);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <div className="p-6 space-y-4 max-h-[60vh] flex flex-col">
        {/* Title */}
        <h2 className="text-xl font-semibold text-text-theme-primary">
          {title}
        </h2>

        {/* Search and filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pilots..."
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-theme-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showUnavailable}
              onChange={(e) => setShowUnavailable(e.target.checked)}
              className="rounded border-border-theme-subtle"
            />
            Show unavailable
          </label>
        </div>

        {/* Pilot list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredPilots.length === 0 ? (
            <div className="text-center py-8 text-text-theme-muted">
              No pilots found
            </div>
          ) : (
            filteredPilots.map((pilot) => {
              const isAssigned = assignedPilotIds.includes(pilot.id);
              const isUnavailable =
                !isAvailableForAssignment(pilot) || isAssigned;

              return (
                <Card
                  key={pilot.id}
                  variant={isUnavailable ? 'dark' : 'interactive'}
                  onClick={
                    isUnavailable ? undefined : () => handleSelect(pilot.id)
                  }
                  className={isUnavailable ? 'opacity-50' : ''}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-theme-primary">
                          {pilot.callsign || pilot.name}
                        </span>
                        {pilot.callsign && (
                          <span className="text-sm text-text-theme-secondary">
                            ({pilot.name})
                          </span>
                        )}
                        <Badge
                          variant={getStatusBadgeVariant(pilot.status)}
                          size="sm"
                        >
                          {getStatusLabel(pilot.status)}
                        </Badge>
                        {isAssigned && (
                          <Badge variant="muted" size="sm">
                            Assigned
                          </Badge>
                        )}
                      </div>
                      {pilot.affiliation && (
                        <div className="text-sm text-text-theme-muted mt-1">
                          {pilot.affiliation}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-lg text-accent">
                        {pilot.skills.gunnery}/{pilot.skills.piloting}
                      </div>
                      <div className="text-xs text-text-theme-muted">
                        {getSkillLabel(pilot.skills.gunnery)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-border-theme-subtle">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
