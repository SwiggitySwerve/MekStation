import {
  ceilToHalfTon,
  roundWeightToGrams,
} from '@/utils/physical/weightUtils';

/** TestSupportVehicle.java:754-764: only small support rounds away gram noise. */
export function ceilSupportWeight(weight: number, tonnage: number): number {
  return tonnage < 5
    ? Math.ceil(roundWeightToGrams(weight) / 1000) / 1000
    : ceilToHalfTon(weight);
}
/** RoundWeight.STANDARD (RoundWeight.java:58-68), with gram truncation. */
export function roundSupportComponentWeight(
  weight: number,
  tonnage: number,
): number {
  const step = tonnage < 5 ? 1000 : 2;
  return Math.ceil((roundWeightToGrams(weight) / 1e6) * step) / step;
}
