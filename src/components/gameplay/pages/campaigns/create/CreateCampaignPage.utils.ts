import type { PilotAssignments } from './CreateCampaignPage.types';

export function createEntityId(prefix: 'unit' | 'pilot'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function removeUnitAssignment(
  assignments: PilotAssignments,
  unitId: string,
): PilotAssignments {
  const next = { ...assignments };
  delete next[unitId];
  return next;
}

export function removePilotAssignments(
  assignments: PilotAssignments,
  pilotId: string,
): PilotAssignments {
  const next: PilotAssignments = {};
  for (const [unitId, assignedPilotId] of Object.entries(assignments)) {
    if (assignedPilotId !== pilotId) {
      next[unitId] = assignedPilotId;
    }
  }
  return next;
}

export function assignPilotToUnit(
  assignments: PilotAssignments,
  unitId: string,
  pilotId: string,
): PilotAssignments {
  const next: PilotAssignments = {};
  for (const [existingUnitId, existingPilotId] of Object.entries(assignments)) {
    if (existingPilotId !== pilotId) {
      next[existingUnitId] = existingPilotId;
    }
  }

  if (pilotId) {
    next[unitId] = pilotId;
  }

  return next;
}

export function getAssignedUnitIdForPilot(
  assignments: PilotAssignments,
  pilotId: string,
): string | undefined {
  return Object.entries(assignments).find(([, assignedPilotId]) => {
    return assignedPilotId === pilotId;
  })?.[0];
}
