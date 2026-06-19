import { WeightClass } from '@/types/enums/WeightClass';

export interface UnitWeightClassStep {
  readonly maxTonnage: number;
  readonly weightClass: WeightClass;
}

export function getThresholdWeightClass(
  tonnage: number,
  steps: readonly UnitWeightClassStep[],
  fallback: WeightClass,
): WeightClass {
  return (
    steps.find((step) => tonnage <= step.maxTonnage)?.weightClass ?? fallback
  );
}

const STANDARD_WEIGHT_CLASS_STEPS: readonly UnitWeightClassStep[] = [
  { maxTonnage: 35, weightClass: WeightClass.LIGHT },
  { maxTonnage: 55, weightClass: WeightClass.MEDIUM },
  { maxTonnage: 75, weightClass: WeightClass.HEAVY },
];

export function getUnitIndexWeightClass(tonnage: number): WeightClass {
  return getThresholdWeightClass(
    tonnage,
    STANDARD_WEIGHT_CLASS_STEPS,
    WeightClass.ASSAULT,
  );
}
