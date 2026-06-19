import {
  AWARD_CATALOG,
  CriteriaType,
  type IAward,
  type IAwardContext,
  type IGrantAwardInput,
} from '@/types/award';

interface IAwardEventGrantInput {
  pilotId: string;
  eventType: string;
  data: Record<string, unknown>;
  context: IAwardContext;
  hasPilotAward: (pilotId: string, awardId: string) => boolean;
  grantAward: (input: IGrantAwardInput) => boolean;
}

function isSpecificEventAwardFor(award: IAward, eventType: string): boolean {
  return (
    award.criteria.type === CriteriaType.SpecificEvent &&
    award.criteria.conditions?.eventType === eventType
  );
}

function isEventConditionMet(
  key: string,
  value: unknown,
  data: Record<string, unknown>,
): boolean {
  if (key === 'eventType') return true;

  const actualValue = data[key];
  if (typeof value === 'number' && typeof actualValue === 'number') {
    return actualValue >= value;
  }

  return actualValue === value;
}

function areEventAwardConditionsMet(
  award: IAward,
  data: Record<string, unknown>,
): boolean {
  const conditions = award.criteria.conditions;
  if (!conditions) return true;

  return Object.entries(conditions).every(([key, value]) =>
    isEventConditionMet(key, value, data),
  );
}

export function grantMatchingEventAwards(input: IAwardEventGrantInput): void {
  const matchingAwards = AWARD_CATALOG.filter((award) =>
    isSpecificEventAwardFor(award, input.eventType),
  );

  for (const award of matchingAwards) {
    if (input.hasPilotAward(input.pilotId, award.id)) continue;
    if (!areEventAwardConditionsMet(award, input.data)) continue;

    input.grantAward({
      pilotId: input.pilotId,
      awardId: award.id,
      context: input.context,
    });
  }
}
