/**
 * Armor Location Issues
 *
 * Which biped locations the unit's validation flags for low or critical armor
 * (VAL-UNIV-013), so the armor diagram can mark the same locations the issue
 * banner names. Reads the existing rule results only; it adds no threshold.
 *
 * @module utils/armor/armorLocationIssues
 */

import type {
  IUnitValidationError,
  IUnitValidationResult,
} from '@/types/validation/UnitValidationInterfaces';

import { ArmorAllocationValidation } from '@/services/validation/rules/universal/ArmorAllocationValidation';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

export type ArmorLocationIssue = 'warning' | 'error';

export type ArmorLocationIssues = Partial<
  Record<MechLocation, ArmorLocationIssue>
>;

/** The rule's `armorAllocation.<key>` field keys; a rear face flags its torso. */
const FIELD_LOCATIONS: Readonly<Record<string, MechLocation>> = {
  head: MechLocation.HEAD,
  centerTorso: MechLocation.CENTER_TORSO,
  centerTorsoRear: MechLocation.CENTER_TORSO,
  leftTorso: MechLocation.LEFT_TORSO,
  leftTorsoRear: MechLocation.LEFT_TORSO,
  rightTorso: MechLocation.RIGHT_TORSO,
  rightTorsoRear: MechLocation.RIGHT_TORSO,
  leftArm: MechLocation.LEFT_ARM,
  rightArm: MechLocation.RIGHT_ARM,
  leftLeg: MechLocation.LEFT_LEG,
  rightLeg: MechLocation.RIGHT_LEG,
};

/** Locations with a low (warning) or critical (error) armor result; errors win. */
export function getArmorLocationIssues(
  result: IUnitValidationResult | null,
): ArmorLocationIssues {
  const issues: ArmorLocationIssues = {};
  const rule = result?.results.find(
    (ruleResult) => ruleResult.ruleId === ArmorAllocationValidation.id,
  );
  if (!rule) return issues;
  const mark = (
    diagnostics: readonly IUnitValidationError[],
    issue: ArmorLocationIssue,
  ) => {
    for (const { field } of diagnostics) {
      const location =
        FIELD_LOCATIONS[field?.replace(/^armorAllocation\./, '') ?? ''];
      if (location && issues[location] !== 'error') issues[location] = issue;
    }
  };
  mark(rule.errors, 'error');
  mark(rule.warnings, 'warning');
  return issues;
}
