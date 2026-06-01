import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

export function getBooleanFromRawTags(
  rawTags: Record<string, string | string[]>,
  key: string,
): boolean {
  const normalizedKey = normalizeFeatureKey(key);
  const value =
    rawTags[key] ??
    Object.entries(rawTags).find(
      ([tagName]) => normalizeFeatureKey(tagName) === normalizedKey,
    )?.[1];
  if (Array.isArray(value)) {
    return value[0]?.toLowerCase() === 'true' || value[0] === '1';
  }
  return value?.toLowerCase() === 'true' || value === '1';
}

export function hasVehicleEquipmentFeature(
  equipment: readonly IVehicleMountedEquipment[],
  featureKey: string,
): boolean {
  const normalizedFeature = normalizeFeatureKey(featureKey);
  return equipment.some((item) =>
    normalizeFeatureKey(item.name).includes(normalizedFeature),
  );
}

function normalizeFeatureKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
