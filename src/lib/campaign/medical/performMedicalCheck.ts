import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson, IInjury } from '@/types/campaign/Person';

import { advancedMedicalCheck } from './advancedMedical';
import { alternateMedicalCheck } from './alternateMedical';
import { IMedicalCheckResult, MedicalSystem } from './medicalTypes';
import { standardMedicalCheck, RandomFn } from './standardMedical';

export function performMedicalCheck(
  system: MedicalSystem,
  patient: IPerson,
  injury: IInjury,
  doctor: IPerson | null,
  options: ICampaignOptions,
  random: RandomFn,
): IMedicalCheckResult {
  switch (system) {
    case MedicalSystem.STANDARD:
      return standardMedicalCheck(patient, injury, doctor, options, random);
    case MedicalSystem.ADVANCED:
      return advancedMedicalCheck(patient, injury, doctor, options, random);
    case MedicalSystem.ALTERNATE:
      return alternateMedicalCheck(patient, injury, doctor, options, random);
    default:
      const _exhaustive: never = system;
      return _exhaustive;
  }
}
