import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IInjury } from '@/types/campaign/Person';

import { advancedMedicalCheck } from './advancedMedical';
import { alternateMedicalCheck } from './alternateMedical';
import { IMedicalCheckResult, MedicalSystem } from './medicalTypes';
import { standardMedicalCheck, RandomFn } from './standardMedical';

export interface IMedicalCheckContext {
  readonly system: MedicalSystem;
  readonly patientEntry: ICampaignRosterEntry;
  readonly injury: IInjury;
  readonly doctorEntry: ICampaignRosterEntry | null;
  readonly doctorPilot: IPilot | null;
  readonly options: ICampaignOptions;
  readonly random: RandomFn;
}

/**
 * Dispatch a medical check to the appropriate system implementation.
 *
 * NPC behavior: NPCs heal too (medical domain = PROCESS). Pass
 * `doctorEntry = null` when no doctor is available. NPC patients and doctors
 * resolve identity from their respective `entry.pilotId`; vault pilots are
 * null for NPC entries.
 *
 * @param system - The medical system to use
 * @param patientEntry - The injured person's roster entry
 * @param injury - The injury being treated
 * @param doctorEntry - The doctor's roster entry (null = no doctor)
 * @param doctorPilot - The doctor's vault pilot (null for NPCs or no doctor)
 * @param options - Campaign options
 * @param random - Injectable random function (0-1)
 * @returns Medical check result from the selected system
 */
export function performMedicalCheck({
  system,
  patientEntry,
  injury,
  doctorEntry,
  doctorPilot,
  options,
  random,
}: IMedicalCheckContext): IMedicalCheckResult {
  switch (system) {
    case MedicalSystem.STANDARD:
      return standardMedicalCheck(
        patientEntry,
        injury,
        doctorEntry,
        doctorPilot,
        options,
        random,
      );
    case MedicalSystem.ADVANCED:
      return advancedMedicalCheck(
        patientEntry,
        injury,
        doctorEntry,
        doctorPilot,
        options,
        random,
      );
    case MedicalSystem.ALTERNATE:
      return alternateMedicalCheck(
        patientEntry,
        injury,
        doctorEntry,
        doctorPilot,
        options,
        random,
      );
    default:
      const _exhaustive: never = system;
      return _exhaustive;
  }
}
