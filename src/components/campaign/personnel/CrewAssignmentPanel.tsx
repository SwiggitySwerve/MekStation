/**
 * Crew Assignment Panel — Force-slot assignment surface.
 *
 * Renders inside PersonnelSidePanel's "Assignment" tab. Lets the player
 * assign or unassign the selected pilot to a Force slot using the
 * existing useForceStore actions (which wrap /api/forces/assignments/[id]).
 *
 * On mount, ensures useForceStore.forces is populated by calling loadForces()
 * if it's empty. After a successful assign/unassign, the store auto-runs
 * loadForces() and surfaces re-renders via the existing reactive selector.
 *
 * @spec openspec/changes/add-pilot-xp-spend-from-campaign/specs/campaign-ui/spec.md
 */

import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import type { IAssignment, IForce } from '@/types/force';

import { Button } from '@/components/ui';
import { useForceStore } from '@/stores/useForceStore';

// =============================================================================
// Props
// =============================================================================

interface CrewAssignmentPanelProps {
  /** Vault pilot id to render assignment controls for */
  pilotId: string;
}

// =============================================================================
// Component
// =============================================================================

export function CrewAssignmentPanel({
  pilotId,
}: CrewAssignmentPanelProps): React.ReactElement {
  const router = useRouter();
  const campaignId = typeof router.query.id === 'string' ? router.query.id : '';

  const forces = useForceStore((state) => state.forces);
  const isLoading = useForceStore((state) => state.isLoading);
  const error = useForceStore((state) => state.error);
  const loadForces = useForceStore((state) => state.loadForces);
  const assignPilot = useForceStore((state) => state.assignPilot);
  const clearAssignment = useForceStore((state) => state.clearAssignment);

  // Ensure forces are loaded on mount. If the store is already populated
  // we skip the fetch — loadForces() unconditionally fetches and we don't
  // want to thrash the network on every panel open.
  useEffect(() => {
    if (forces.length === 0 && !isLoading) {
      void loadForces();
    }
    // intentionally only run on mount; subsequent forces changes come from
    // the store's own auto-refresh after assign/unassign actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No-Force empty state — short-circuit before any assignment lookups.
  if (forces.length === 0) {
    if (isLoading) {
      return (
        <p className="text-text-theme-secondary p-4 text-sm">Loading forces…</p>
      );
    }
    return (
      <div className="space-y-3 p-4">
        <p className="text-text-theme-secondary text-sm">
          No active force in this campaign.
        </p>
        <Link
          href={`/gameplay/campaigns/${campaignId}/forces`}
          className="text-accent text-sm underline hover:opacity-80"
        >
          Create one in Forces
        </Link>
      </div>
    );
  }

  // Find current assignment for this pilot, plus all empty slots that have a unit.
  const allAssignments = forces.flatMap((force) =>
    force.assignments.map((assignment) => ({ assignment, force })),
  );
  const currentAssignment = allAssignments.find(
    ({ assignment }) => assignment.pilotId === pilotId,
  );
  // Deferred: role-based filtering (mech vs vehicle vs aerospace).
  // ICampaignRosterEntry doesn't carry role today; refining requires a vault
  // join + unit-type lookup. Tracked in council-decisions/2026-05-01-personnel-architecture-path.md.
  const compatibleSlots = allAssignments.filter(
    ({ assignment }) =>
      assignment.pilotId === null && assignment.unitId !== null,
  );

  const handleAssign = async (assignmentId: string): Promise<void> => {
    await assignPilot(assignmentId, pilotId);
  };

  const handleUnassign = async (assignmentId: string): Promise<void> => {
    await clearAssignment(assignmentId);
  };

  return (
    <div className="space-y-4 p-4" data-testid="crew-assignment-panel">
      {currentAssignment ? (
        <div className="space-y-2">
          <p className="text-text-theme-primary text-sm font-medium">
            Currently assigned:{' '}
            <span data-testid="current-assignment-unit">
              {formatAssignmentLabel(
                currentAssignment.assignment,
                currentAssignment.force,
              )}
            </span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={isLoading}
            onClick={() => void handleUnassign(currentAssignment.assignment.id)}
            data-testid="unassign-button"
          >
            Unassign
          </Button>
        </div>
      ) : (
        <p className="text-text-theme-secondary text-sm">Unassigned</p>
      )}

      {!currentAssignment && (
        <div className="space-y-2">
          <h3 className="text-text-theme-primary text-sm font-semibold">
            Available slots
          </h3>
          {compatibleSlots.length === 0 ? (
            <p className="text-text-theme-secondary text-sm">
              No compatible empty slots.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="available-slots">
              {compatibleSlots.map(({ assignment, force }) => (
                <li
                  key={assignment.id}
                  className="border-border-theme-subtle flex items-center justify-between rounded border p-2"
                >
                  <span className="text-text-theme-secondary text-sm">
                    {formatAssignmentLabel(assignment, force)}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => void handleAssign(assignment.id)}
                    data-testid={`assign-button-${assignment.id}`}
                  >
                    Assign
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p
          className="rounded border border-red-600/30 bg-red-900/20 p-2 text-sm text-red-400"
          data-testid="assignment-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a human-readable label for an assignment row. The unit name isn't
 * carried on IAssignment directly — only the unitId. For the narrow PR we
 * surface the unitId + force name so the player can identify the slot.
 * Full unit-name resolution requires a vault unit join, deferred to the
 * follow-up change.
 */
function formatAssignmentLabel(assignment: IAssignment, force: IForce): string {
  const unitLabel = assignment.unitId ?? 'unit';
  return `${force.name} · ${unitLabel} (${assignment.position} #${assignment.slot})`;
}

export default CrewAssignmentPanel;
