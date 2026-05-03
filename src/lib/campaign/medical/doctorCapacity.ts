/**
 * Doctor Capacity Management - Campaign medical mechanics
 *
 * Manages doctor patient capacity limits and workload calculations:
 * - getDoctorCapacity: Calculate max patients (base 25, enhanced by admin skill)
 * - getAssignedPatientCount: Count patients with injuries
 * - isDoctorOverloaded: Check if over capacity
 * - getOverloadPenalty: Calculate penalty for overload
 * - getBestAvailableDoctor: Find least-loaded available doctor
 *
 * @module campaign/medical/doctorCapacity
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

/**
 * Calculate maximum patients a doctor can handle.
 *
 * Formula: base + (adminSkill * base * 0.2)
 * - Base: maxPatientsPerDoctor from options (default 25)
 * - Admin bonus: 20% per admin skill level (if doctorsUseAdministration enabled)
 *
 * @stub Plan 7 - IPilot.skills only carries gunnery/piloting; administration
 * skill will be added in a future change. The `_pilot` parameter is reserved
 * for that lookup. Returns base capacity only until then.
 *
 * NPC behavior: NPCs can be doctors too (medical domain = PROCESS).
 * NPC doctor entries pass `pilot = null`; capacity falls back to base.
 *
 * @param doctorEntry - The doctor's roster entry
 * @param _pilot - The doctor's vault pilot (null for NPCs); reserved for Plan 7
 * @param options - Campaign options
 * @returns Maximum patient capacity
 */
export function getDoctorCapacity(
  doctorEntry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  options: ICampaignOptions,
): number {
  const base = options.maxPatientsPerDoctor;

  if (!options.doctorsUseAdministration) {
    return base;
  }

  // @stub Plan 7 - IPilot.skills has no administration field yet.
  // When Plan 7 lands, replace with: pilot?.skills?.administration?.level ?? 0
  // For now, doctorEntry carries no skill data either, so adminSkill = 0.
  const adminSkill = 0;
  const bonus = Math.floor(adminSkill * base * 0.2);

  return base + bonus;
}

/**
 * Count patients assigned to a doctor (those with active injuries).
 *
 * @stub Plan 7 - ICampaignRosterEntry has no `doctorId` field (that was an
 * IPerson concept). Per-doctor assignment filtering is deferred to the
 * follow-up change that adds `assignedDoctorId` to ICampaignRosterEntry.
 * Until then, this counts ALL entries with injuries, giving each doctor the
 * same view of total roster injury load.
 *
 * NPC behavior: NPC entries with injuries count toward the load total.
 *
 * @param _doctorEntry - The doctor's roster entry (reserved for future per-doctor filtering)
 * @param _doctorPilot - The doctor's vault pilot (reserved for future use)
 * @param entries - All roster entries in the campaign
 * @returns Number of entries with at least one active injury
 */
export function getAssignedPatientCount(
  _doctorEntry: ICampaignRosterEntry,
  _doctorPilot: IPilot | null,
  entries: readonly ICampaignRosterEntry[],
): number {
  // @stub Plan 7 - Filter by doctorEntry.pilotId once assignedDoctorId lands on ICampaignRosterEntry
  return entries.filter((entry) => (entry.injuries ?? []).length > 0).length;
}

/**
 * Check if a doctor is overloaded (exceeds capacity).
 *
 * NPC behavior: NPC doctors are checked for overload like PC doctors.
 *
 * @param doctorEntry - The doctor's roster entry
 * @param doctorPilot - The doctor's vault pilot (null for NPCs)
 * @param entries - All roster entries in the campaign
 * @param options - Campaign options
 * @returns true if patient count exceeds capacity
 */
export function isDoctorOverloaded(
  doctorEntry: ICampaignRosterEntry,
  doctorPilot: IPilot | null,
  entries: readonly ICampaignRosterEntry[],
  options: ICampaignOptions,
): boolean {
  const capacity = getDoctorCapacity(doctorEntry, doctorPilot, options);
  const patientCount = getAssignedPatientCount(
    doctorEntry,
    doctorPilot,
    entries,
  );
  return patientCount > capacity;
}

/**
 * Calculate overload penalty (excess patients beyond capacity).
 *
 * Penalty = max(0, patientCount - capacity)
 *
 * NPC behavior: NPC doctors contribute to overload calculation like PC doctors.
 *
 * @param doctorEntry - The doctor's roster entry
 * @param doctorPilot - The doctor's vault pilot (null for NPCs)
 * @param entries - All roster entries in the campaign
 * @param options - Campaign options
 * @returns Penalty value (0 if not overloaded)
 */
export function getOverloadPenalty(
  doctorEntry: ICampaignRosterEntry,
  doctorPilot: IPilot | null,
  entries: readonly ICampaignRosterEntry[],
  options: ICampaignOptions,
): number {
  const capacity = getDoctorCapacity(doctorEntry, doctorPilot, options);
  const patientCount = getAssignedPatientCount(
    doctorEntry,
    doctorPilot,
    entries,
  );
  return Math.max(0, patientCount - capacity);
}

/**
 * Find the best available doctor for a patient.
 *
 * Selects doctor with:
 * 1. Capacity available (not overloaded)
 * 2. Lowest patient count among available doctors
 *
 * NPC behavior: NPC doctors (pilot = null resolved via pilots map) are
 * eligible as doctors when their primaryRole is DOCTOR or MEDIC.
 *
 * @param _patientEntry - The patient needing treatment (reserved for future
 *   per-doctor assignment logic when assignedDoctorId lands)
 * @param entries - All roster entries in the campaign
 * @param pilots - Pre-joined vault pilot map (keyed by pilotId)
 * @param options - Campaign options
 * @returns Best available doctor entry, or null if none available
 */
export function getBestAvailableDoctor(
  _patientEntry: ICampaignRosterEntry,
  entries: readonly ICampaignRosterEntry[],
  pilots: ReadonlyMap<string, IPilot>,
  options: ICampaignOptions,
): ICampaignRosterEntry | null {
  const doctors = entries.filter(
    (entry) =>
      entry.primaryRole === CampaignPersonnelRole.DOCTOR ||
      entry.primaryRole === CampaignPersonnelRole.MEDIC,
  );

  if (doctors.length === 0) {
    return null;
  }

  let bestDoctor: ICampaignRosterEntry | null = null;
  let lowestPatientCount = Infinity;

  for (const doctor of doctors) {
    const doctorPilot = pilots.get(doctor.pilotId) ?? null;
    const patientCount = getAssignedPatientCount(doctor, doctorPilot, entries);
    const capacity = getDoctorCapacity(doctor, doctorPilot, options);

    if (patientCount < capacity && patientCount < lowestPatientCount) {
      bestDoctor = doctor;
      lowestPatientCount = patientCount;
    }
  }

  return bestDoctor;
}
