/**
 * Component Type Utilities - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export function getComponentType(component: unknown): string {
  if (!component || typeof component !== 'object') return 'unknown';
  const c = component as Record<string, unknown>;
  return (c.type as string) ?? (c.componentType as string) ?? 'unknown';
}

export function isWeapon(component: unknown): boolean {
  return getComponentType(component) === 'Weapon';
}

export function isAmmo(component: unknown): boolean {
  return getComponentType(component) === 'Ammo';
}

export function isEquipment(component: unknown): boolean {
  return getComponentType(component) === 'Equipment';
}


