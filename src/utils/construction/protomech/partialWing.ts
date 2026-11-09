/**
 * ProtoMech Partial Wing jump bonus: the single owner of the rule.
 *
 * Pinned MegaMek 48fcb2f64 `ProtoMek.getJumpMP` (ProtoMek.java:470-487) adds the
 * bonus when the wing is working and weather is not ignored: +3 in a very high or
 * high atmosphere, +2 in a standard or thin one, +1 in a trace one, otherwise 0.
 *
 * Pure: no React, store or UI imports, so the editor and gameplay movement share
 * this one table. The editor passes a standard atmosphere
 * (`effectiveJumpMP` in `movementCaps.ts`); a gameplay caller passes the match's
 * atmosphere.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

/**
 * Planetary atmosphere levels of `megamek.common.planetaryConditions.Atmosphere`
 * (vacuum, trace, thin, standard, high, very high). The gameplay
 * `AtmosphereCondition` (`types/gameplay/EnvironmentalConditions.ts`) has only
 * the first four of these, so this union is a superset of it and its values pass
 * straight in; it adds the two high levels the table needs.
 */
export type PartialWingAtmosphere =
  | 'vacuum'
  | 'trace'
  | 'thin'
  | 'standard'
  | 'high'
  | 'very_high';

export interface PartialWingJumpContext {
  /** `hasWorkingMisc(F_PARTIAL_WING)`: mounted and not destroyed. */
  readonly wingWorking: boolean;
  /** `MPCalculationSetting.ignoreWeather()`; BV and construction ignore it. */
  readonly ignoreWeather: boolean;
}

/** Jump MP the Partial Wing adds (ProtoMek.java:470-487). */
export function partialWingJumpBonus(
  atmosphere: PartialWingAtmosphere,
  { wingWorking, ignoreWeather }: PartialWingJumpContext,
): number {
  if (!wingWorking || ignoreWeather) return 0;
  switch (atmosphere) {
    case 'very_high':
    case 'high':
      return 3;
    case 'standard':
    case 'thin':
      return 2;
    case 'trace':
      return 1;
    default:
      return 0;
  }
}
