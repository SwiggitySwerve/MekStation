/**
 * Unit Entity Helpers - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export function getUnitDisplayName(unit: { name?: string; chassis?: string; model?: string }): string {
  if (unit.name) return unit.name;
  if (unit.chassis && unit.model) return `${unit.chassis} ${unit.model}`;
  return 'Unknown Unit';
}

export function getUnitTonnage(unit: { tonnage?: number }): number {
  return unit.tonnage ?? 0;
}

export function isValidUnit(unit: unknown): boolean {
  return unit !== null && typeof unit === 'object';
}
