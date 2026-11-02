/**
 * The number-only legacy handler API cannot represent construction completeness.
 * @spec openspec/changes/reject-incomplete-combat-vehicle-handler-weight/specs/vehicle-unit-system/spec.md
 */
export function rejectIncompleteCombatVehicleWeight(): never {
  throw new Error(
    'Combat vehicle handler weight is incomplete: resolved equipment masses and complete construction terms are unavailable',
  );
}
