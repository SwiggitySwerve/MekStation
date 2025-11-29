/**
 * Equipment Colors - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export const EQUIPMENT_COLORS: Record<string, string> = {
  'Energy Weapons': '#ff6b6b',
  'Ballistic Weapons': '#4ecdc4',
  'Missile Weapons': '#45b7d1',
  'Physical Weapons': '#96ceb4',
  'Equipment': '#dda0dd',
  'Ammunition': '#ffeaa7',
  'default': '#95a5a6',
};

export function getEquipmentColor(category: string): string {
  return EQUIPMENT_COLORS[category] ?? EQUIPMENT_COLORS.default;
}

export function getEquipmentBackgroundColor(category: string): string {
  const color = getEquipmentColor(category);
  return `${color}33`; // Add alpha
}

export function getEquipmentTypeBadgeClasses(type: string): string {
  switch (type) {
    case 'weapon':
      return 'bg-red-700 text-white';
    case 'ammo':
      return 'bg-orange-600 text-white';
    case 'heat_sink':
      return 'bg-cyan-600 text-white';
    default:
      return 'bg-blue-600 text-white';
  }
}

export function getEquipmentTypeDisplayName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getTechBaseColors(techBase: string): { background: string; border: string } {
  const mapping: Record<string, { background: string; border: string }> = {
    'Inner Sphere': { background: 'bg-blue-700', border: 'border-blue-500' },
    'Clan': { background: 'bg-purple-700', border: 'border-purple-500' },
    'Mixed': { background: 'bg-green-700', border: 'border-green-500' },
  };
  return mapping[techBase] ?? { background: 'bg-gray-700', border: 'border-gray-500' };
}

export function getTechBaseDisplayName(techBase: string): string {
  return techBase;
}

export function getEquipmentSortPriority(type: string): number {
  const order: Record<string, number> = {
    weapon: 1,
    ammo: 2,
    equipment: 3,
    heat_sink: 4,
  };
  return order[type] ?? 99;
}

export function getBattleTechEquipmentClasses(_name: string): string {
  return 'bg-gray-700 text-white';
}

export function getEquipmentCategory(type: string): string {
  switch (type) {
    case 'weapon':
      return 'Weapons';
    case 'ammo':
      return 'Ammunition';
    default:
      return 'Equipment';
  }
}

export function isEquipmentCategory(_value: string): boolean {
  return true;
}


