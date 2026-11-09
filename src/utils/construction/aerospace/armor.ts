/**
 * Aerospace armor construction owner. Source adapters normalize transport facts.
 * MegaMek 48fcb2f64 SmallCraft:783-797; TestSmallCraft:99-139.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/aerospace-unit-system/spec.md
 */
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

/** Normalized construction facts; transport and source parsing stay with callers. */
export interface IAerospaceArmorInput {
  readonly armorCode: number;
  readonly clan: boolean;
  readonly structuralIntegrity: number;
  readonly spheroid: boolean;
  readonly large: boolean;
  readonly advanced: boolean;
  readonly tonnage: number;
  readonly allocated: number;
}

export const isPrimitiveAerospaceArmor = (code: number): boolean =>
  [39, 40].includes(code);

/** Extracted from sourceWeight.sourceArmor without changing its supported inputs. */
export function aerospaceArmor(input: IAerospaceArmorInput) {
  const {
    armorCode: key,
    clan,
    structuralIntegrity: si,
    spheroid,
    allocated,
  } = input;
  const primitive = isPrimitiveAerospaceArmor(key);
  const primitiveLarge = primitive && input.large;
  const ferro = key === 19;
  if (![0, 19, 39, 40, 41].includes(key)) return undefined;
  let ppt = key === 39 ? 16 * 0.67 : ferro ? (clan ? 19.2 : 17.92) : 16;
  if (input.large) {
    const thresholds = spheroid
      ? [12500, 20000, 35000, 50000, 65000]
      : [6000, 9500, 12500, 17500, 25000];
    const index = thresholds.filter((t) => input.tonnage >= t).length;
    ppt = (
      ferro
        ? clan
          ? [24, 20.4, 16.8, 14.4, 12, 8.4]
          : [17.92, 15.68, 13.44, 11.2, 8.96, 6.72]
        : clan && !primitive
          ? [20, 17, 14, 12, 10, 7]
          : [16, 14, 12, 10, 8, 6]
    )[index];
  } else if (input.advanced) {
    if (key !== 41) return undefined;
    ppt = (clan ? [1, 0.7, 0.5] : [0.8, 0.6, 0.4])[
      input.tonnage < 150000 ? 0 : input.tonnage < 250000 ? 1 : 2
    ];
  }
  const bonus = input.large
    ? 4 * si
    : input.advanced
      ? 6 * Math.round(si / 10)
      : 0;
  const raw = primitiveLarge ? Math.ceil(allocated / 0.66) : allocated;
  const mass = ceilToHalfTon(Math.max(0, raw - bonus) / ppt);
  const max = Math.floor(si * (spheroid ? 3.6 : 4.5) * 2) / 2;
  const points = (t: number) =>
    Math.trunc(Math.floor(t * ppt + bonus) * (primitiveLarge ? 0.66 : 1));
  const cap = input.large ? Math.min(mass, max) : mass;
  return { mass, maximum: max, available: points(cap) };
}
