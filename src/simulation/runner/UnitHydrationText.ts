import { normalizeEquipmentId as normalizeCatalogEquipmentId } from '@/utils/construction/equipmentBV/normalization';

export function normalizeCriticalSlotText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeEquipmentLocation(location: string): string {
  return location.split(',')[0]?.trim() ?? location.trim();
}

export function normalizeEquipmentSignalKey(id: string): string {
  return id
    .replace(/^\d+-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeHydrationEquipmentId(id: string): string {
  return normalizeCatalogEquipmentId(id);
}

export function stripCriticalSlotRearMarker(text: string): string {
  return text.replace(/\s*\([a-z]\)\s*$/i, '').trim();
}

export function normalizedWithoutTechPrefix(normalized: string): string {
  return normalized.replace(/^(is|clan|cl)/, '');
}

export function runtimeWeaponCatalogId(weaponId: string): string {
  return weaponId.replace(/-\d+$/, '');
}
