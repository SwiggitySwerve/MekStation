import type {
  IForce,
  IForceValidation,
  IForceValidationError,
  IForceValidationWarning,
} from '@/types/force';

import { PilotStatus } from '@/types/pilot';

import { getPilotRepository } from '../pilots/PilotRepository';

export function validatePilotAvailability(status: PilotStatus): {
  available: boolean;
  reason: string;
} {
  switch (status) {
    case PilotStatus.Active:
      return { available: true, reason: '' };
    case PilotStatus.Injured:
      return { available: true, reason: '' };
    case PilotStatus.MIA:
      return {
        available: false,
        reason: 'Pilot is MIA and cannot be assigned',
      };
    case PilotStatus.KIA:
      return {
        available: false,
        reason: 'Pilot is KIA and cannot be assigned',
      };
    case PilotStatus.Retired:
      return {
        available: false,
        reason: 'Pilot is retired and cannot be assigned',
      };
    default:
      return { available: true, reason: '' };
  }
}

export function validateForce(force: IForce): IForceValidation {
  const errors: IForceValidationError[] = [];
  const warnings: IForceValidationWarning[] = [];
  const pilotRepo = getPilotRepository();

  const emptySlots = force.assignments.filter(
    (a) => a.pilotId === null && a.unitId === null,
  );
  if (emptySlots.length > 0) {
    warnings.push({
      code: 'EMPTY_SLOTS',
      message: `Force has ${emptySlots.length} empty slot(s)`,
    });
  }

  const pilotsWithoutMechs = force.assignments.filter(
    (a) => a.pilotId !== null && a.unitId === null,
  );
  for (const assignment of pilotsWithoutMechs) {
    warnings.push({
      code: 'PILOT_NO_MECH',
      message: `Slot ${assignment.slot}: Pilot assigned but no mech`,
      slot: assignment.slot,
      assignmentId: assignment.id,
    });
  }

  const mechsWithoutPilots = force.assignments.filter(
    (a) => a.pilotId === null && a.unitId !== null,
  );
  for (const assignment of mechsWithoutPilots) {
    warnings.push({
      code: 'MECH_NO_PILOT',
      message: `Slot ${assignment.slot}: Mech assigned but no pilot`,
      slot: assignment.slot,
      assignmentId: assignment.id,
    });
  }

  const leadAssignment = force.assignments.find(
    (a) => a.position === 'lead' && (a.pilotId !== null || a.unitId !== null),
  );
  if (!leadAssignment) {
    warnings.push({
      code: 'NO_LEAD',
      message: 'Force has no assigned lead',
    });
  }

  const pilotIds = force.assignments
    .filter((a) => a.pilotId !== null)
    .map((a) => a.pilotId as string);
  const seenPilots = new Set<string>();
  const duplicatePilots = new Set<string>();
  for (const pilotId of pilotIds) {
    if (seenPilots.has(pilotId)) {
      duplicatePilots.add(pilotId);
    }
    seenPilots.add(pilotId);
  }
  duplicatePilots.forEach((duplicatePilotId) => {
    errors.push({
      code: 'DUPLICATE_PILOT',
      message: `Pilot ${duplicatePilotId} is assigned to multiple slots`,
    });
  });

  for (const assignment of force.assignments) {
    if (assignment.pilotId) {
      const pilot = pilotRepo.getById(assignment.pilotId);
      if (pilot) {
        const availability = validatePilotAvailability(pilot.status);
        if (!availability.available) {
          errors.push({
            code: 'UNAVAILABLE_PILOT',
            message: `Slot ${assignment.slot}: ${availability.reason}`,
            slot: assignment.slot,
            assignmentId: assignment.id,
          });
        }
      } else {
        errors.push({
          code: 'MISSING_PILOT',
          message: `Slot ${assignment.slot}: Referenced pilot no longer exists`,
          slot: assignment.slot,
          assignmentId: assignment.id,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
