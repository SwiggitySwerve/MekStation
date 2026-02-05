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

import type { ICampaignOptions } from '../../../types/campaign/Campaign';
import type { IPerson } from '../../../types/campaign/Person';

import { CampaignPersonnelRole } from '../../../types/campaign/enums/CampaignPersonnelRole';

/**
 * Calculate maximum patients a doctor can handle
 *
 * Formula: base + (adminSkill * base * 0.2)
 * - Base: maxPatientsPerDoctor from options (default 25)
 * - Admin bonus: 20% per admin skill level (if doctorsUseAdministration enabled)
 *
 * @param doctor - The doctor person
 * @param options - Campaign options
 * @returns Maximum patient capacity
 */
export function getDoctorCapacity(
  doctor: IPerson,
  options: ICampaignOptions,
): number {
  const base = options.maxPatientsPerDoctor;

  if (!options.doctorsUseAdministration) {
    return base;
  }

  const adminSkill = doctor.skills?.administration?.level ?? 0;
  const bonus = Math.floor(adminSkill * base * 0.2);

  return base + bonus;
}

/**
 * Count patients assigned to a doctor (those with active injuries)
 *
 * @param doctor - The doctor person
 * @param personnel - All personnel in campaign
 * @returns Number of patients with injuries
 */
export function getAssignedPatientCount(
  doctor: IPerson,
  personnel: IPerson[],
): number {
  return personnel.filter(
    (person) =>
      person.injuries &&
      person.injuries.length > 0 &&
      person.doctorId === doctor.id,
  ).length;
}

/**
 * Check if a doctor is overloaded (exceeds capacity)
 *
 * @param doctor - The doctor person
 * @param personnel - All personnel in campaign
 * @param options - Campaign options
 * @returns true if patient count exceeds capacity
 */
export function isDoctorOverloaded(
  doctor: IPerson,
  personnel: IPerson[],
  options: ICampaignOptions,
): boolean {
  const capacity = getDoctorCapacity(doctor, options);
  const patientCount = getAssignedPatientCount(doctor, personnel);
  return patientCount > capacity;
}

/**
 * Calculate overload penalty (excess patients beyond capacity)
 *
 * Penalty = max(0, patientCount - capacity)
 *
 * @param doctor - The doctor person
 * @param personnel - All personnel in campaign
 * @param options - Campaign options
 * @returns Penalty value (0 if not overloaded)
 */
export function getOverloadPenalty(
  doctor: IPerson,
  personnel: IPerson[],
  options: ICampaignOptions,
): number {
  const capacity = getDoctorCapacity(doctor, options);
  const patientCount = getAssignedPatientCount(doctor, personnel);
  return Math.max(0, patientCount - capacity);
}

/**
 * Find the best available doctor for a patient
 *
 * Selects doctor with:
 * 1. Capacity available (not overloaded)
 * 2. Lowest patient count among available doctors
 *
 * @param patient - The patient needing treatment
 * @param personnel - All personnel in campaign
 * @param options - Campaign options
 * @returns Best available doctor, or null if none available
 */
export function getBestAvailableDoctor(
  patient: IPerson,
  personnel: IPerson[],
  options: ICampaignOptions,
): IPerson | null {
  const doctors = personnel.filter(
    (person) =>
      person.primaryRole === CampaignPersonnelRole.DOCTOR ||
      person.primaryRole === CampaignPersonnelRole.MEDIC,
  );

  if (doctors.length === 0) {
    return null;
  }

  let bestDoctor: IPerson | null = null;
  let lowestPatientCount = Infinity;

  for (const doctor of doctors) {
    const patientCount = getAssignedPatientCount(doctor, personnel);
    const capacity = getDoctorCapacity(doctor, options);

    if (patientCount < capacity && patientCount < lowestPatientCount) {
      bestDoctor = doctor;
      lowestPatientCount = patientCount;
    }
  }

  return bestDoctor;
}
