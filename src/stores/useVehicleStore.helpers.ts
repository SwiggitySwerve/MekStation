import { WeightClass } from '@/types/enums/WeightClass';

export function getVehicleWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 19) return WeightClass.LIGHT;
  if (tonnage <= 39) return WeightClass.MEDIUM;
  if (tonnage <= 59) return WeightClass.HEAVY;
  if (tonnage <= 100) return WeightClass.ASSAULT;
  return WeightClass.SUPERHEAVY;
}

export function calculateFlankMP(cruiseMP: number): number {
  return Math.floor(cruiseMP * 1.5);
}
