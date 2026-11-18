interface TonnageRangeOptions {
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly minText?: string;
  readonly maxText?: string;
}

export function pushTonnageRangeErrors(
  errors: string[],
  tonnage: number,
  {
    label,
    min,
    max,
    minText = String(min),
    maxText = String(max),
  }: TonnageRangeOptions,
): void {
  if (min !== undefined && tonnage < min) {
    errors.push(`${label} tonnage must be at least ${minText} tons`);
  }
  if (max !== undefined && tonnage > max) {
    errors.push(`${label} tonnage cannot exceed ${maxText} tons`);
  }
}
