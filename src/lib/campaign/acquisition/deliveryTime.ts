import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';

export type RandomFn = () => number;
export type TransitUnit = 'day' | 'week' | 'month';

const AVAILABILITY_INDEX: Record<AvailabilityRating, number> = {
  [AvailabilityRating.A]: 0,
  [AvailabilityRating.B]: 1,
  [AvailabilityRating.C]: 2,
  [AvailabilityRating.D]: 3,
  [AvailabilityRating.E]: 4,
  [AvailabilityRating.F]: 5,
  [AvailabilityRating.X]: 6,
};

export function roll1d6(random: RandomFn = Math.random): number {
  return Math.floor(random() * 6) + 1;
}

export function calculateDeliveryTime(
  availability: AvailabilityRating,
  _transitUnit: TransitUnit = 'month',
  random: RandomFn = Math.random,
): number {
  const BASE_MODIFIER = 7;
  const availabilityIndex = AVAILABILITY_INDEX[availability];
  const diceRoll = roll1d6(random);

  const rawTime = (BASE_MODIFIER + diceRoll + availabilityIndex) / 4;
  const deliveryTime = Math.max(1, Math.floor(rawTime));

  return deliveryTime;
}
