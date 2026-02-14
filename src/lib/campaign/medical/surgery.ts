import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson, IInjury } from '@/types/campaign/Person';

import { ISurgeryResult } from './medicalTypes';
import { roll2d6, RandomFn } from './standardMedical';

function getMedicineSkillValue(_doctor: IPerson): number {
  return 7;
}

export function performSurgery(
  patient: IPerson,
  injury: IInjury,
  surgeon: IPerson,
  options: ICampaignOptions,
  random: RandomFn,
): ISurgeryResult {
  if (!injury.permanent) {
    throw new Error('Injury must be permanent to perform surgery');
  }

  const medicineSkill = getMedicineSkillValue(surgeon);
  const surgeryDifficulty = 2;

  const modifiers: { name: string; value: number }[] = [
    { name: 'Medicine Skill', value: medicineSkill },
    { name: 'Surgery Difficulty', value: surgeryDifficulty },
  ];

  const targetNumber = modifiers.reduce((sum, m) => sum + m.value, 0);
  const roll = roll2d6(random);
  const margin = roll - targetNumber;

  let outcome: 'permanent_healed' | 'healed' | 'no_change';
  let permanentRemoved = false;
  let prostheticInstalled = false;

  if (margin >= 3) {
    outcome = 'permanent_healed';
    permanentRemoved = true;
  } else if (margin >= 0) {
    outcome = 'healed';
    prostheticInstalled = true;
  } else {
    outcome = 'no_change';
  }

  return {
    patientId: patient.id,
    doctorId: surgeon.id,
    system: options.medicalSystem,
    roll,
    targetNumber,
    margin,
    outcome,
    injuryId: injury.id,
    healingDaysReduced: margin >= 0 ? injury.daysToHeal : 0,
    modifiers,
    permanentRemoved,
    prostheticInstalled,
  };
}

export function installProsthetic(
  injury: IInjury,
  location: string,
): IInjury & { hasProsthetic: boolean; prostheticLocation: string } {
  return {
    ...injury,
    hasProsthetic: true,
    prostheticLocation: location,
  };
}
