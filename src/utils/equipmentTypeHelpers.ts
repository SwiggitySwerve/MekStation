/**
 * Equipment Type Helpers - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export function getEquipmentCategory(equipment: unknown): string {
  if (!equipment || typeof equipment !== 'object') return 'Unknown';
  const e = equipment as Record<string, unknown>;
  return (e.category as string) ?? 'Equipment';
}

export function getEquipmentWeight(equipment: unknown): number {
  if (!equipment || typeof equipment !== 'object') return 0;
  const e = equipment as Record<string, unknown>;
  return (e.weight as number) ?? (e.tons as number) ?? 0;
}

export function getEquipmentSlots(equipment: unknown): number {
  if (!equipment || typeof equipment !== 'object') return 1;
  const e = equipment as Record<string, unknown>;
  return (e.criticalSlots as number) ?? (e.slots as number) ?? (e.crits as number) ?? 1;
}


