import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import { isDead, isDepartedUnit } from './statusRules';

export interface IStatusTransitionResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly sideEffects: readonly IStatusTransitionEffect[];
}

export type IStatusTransitionEffect =
  | { type: 'clear_unit_assignment' }
  | { type: 'clear_doctor_assignment' }
  | { type: 'clear_tech_jobs' }
  | { type: 'set_death_date'; date?: string }
  | { type: 'set_retirement_date'; date?: string }
  | { type: 'clear_retirement_date' }
  | { type: 'release_commander_flag' };

const DEAD_STATUSES = new Set([
  PersonnelStatus.KIA,
  PersonnelStatus.ACCIDENTAL_DEATH,
  PersonnelStatus.DISEASE,
  PersonnelStatus.NATURAL_CAUSES,
  PersonnelStatus.MURDER,
  PersonnelStatus.WOUNDS,
  PersonnelStatus.MIA_PRESUMED_DEAD,
  PersonnelStatus.OLD_AGE,
  PersonnelStatus.MEDICAL_COMPLICATIONS,
  PersonnelStatus.PREGNANCY_COMPLICATIONS,
  PersonnelStatus.UNDETERMINED,
  PersonnelStatus.SUICIDE,
  PersonnelStatus.EXECUTION,
  PersonnelStatus.MISSING_PRESUMED_DEAD,
]);

const DEPARTED_STATUSES = new Set([
  PersonnelStatus.RESIGNED,
  PersonnelStatus.FIRED,
  PersonnelStatus.LEFT,
  PersonnelStatus.SACKED,
  PersonnelStatus.DEFECTED,
  PersonnelStatus.STUDENT_GRADUATED,
  PersonnelStatus.RETIRED_FROM_WOUNDS,
  PersonnelStatus.MEDICAL_RETIREMENT,
  PersonnelStatus.CONTRACT_ENDED,
  PersonnelStatus.RETIRED,
]);

export function validateStatusTransition(
  from: PersonnelStatus,
  to: PersonnelStatus
): IStatusTransitionResult {
  const fromIsDead = DEAD_STATUSES.has(from);
  const toIsDead = DEAD_STATUSES.has(to);

  if (fromIsDead && !toIsDead) {
    return {
      valid: false,
      reason: 'Cannot transition from dead status to non-dead status',
      sideEffects: [],
    };
  }

  const sideEffects = getTransitionSideEffects(from, to);

  return {
    valid: true,
    sideEffects,
  };
}

export function getTransitionSideEffects(
  from: PersonnelStatus,
  to: PersonnelStatus
): readonly IStatusTransitionEffect[] {
  const effects: IStatusTransitionEffect[] = [];

  const fromIsDead = DEAD_STATUSES.has(from);
  const toDead = DEAD_STATUSES.has(to);
  const fromDeparted = DEPARTED_STATUSES.has(from);
  const toDeparted = DEPARTED_STATUSES.has(to);

  if (toDead && !fromIsDead) {
    effects.push({ type: 'set_death_date' });
    effects.push({ type: 'clear_unit_assignment' });
    effects.push({ type: 'clear_doctor_assignment' });
    effects.push({ type: 'clear_tech_jobs' });
  }

  if (toDeparted && !fromDeparted) {
    effects.push({ type: 'set_retirement_date' });
    effects.push({ type: 'release_commander_flag' });
  }

  if (fromDeparted && !toDeparted && to === PersonnelStatus.ACTIVE) {
    effects.push({ type: 'clear_retirement_date' });
  }

  return effects;
}
