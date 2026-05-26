import type { IComponentDamageState } from '@/types/gameplay';

export type RepresentedGyroType = string | undefined;

function normalizedGyroType(gyroType: RepresentedGyroType): string {
  return gyroType?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';
}

export function isHeavyDutyGyro(gyroType: RepresentedGyroType): boolean {
  const normalized = normalizedGyroType(gyroType);
  return normalized === 'heavyduty' || normalized === 'heavydutygyro';
}

export function gyroDestroyedHitThreshold(
  gyroType: RepresentedGyroType,
): number {
  return isHeavyDutyGyro(gyroType) ? 3 : 2;
}

export function isGyroDestroyedForType(
  componentDamage: IComponentDamageState,
  gyroType?: RepresentedGyroType,
): boolean {
  return componentDamage.gyroHits >= gyroDestroyedHitThreshold(gyroType);
}

export function gyroPsrModifierForType(
  componentDamage: IComponentDamageState,
  gyroType?: RepresentedGyroType,
): number {
  if (!isHeavyDutyGyro(gyroType)) {
    return componentDamage.gyroHits * 3;
  }

  if (componentDamage.gyroHits <= 0) return 0;
  return componentDamage.gyroHits === 1 ? 1 : 3;
}

export function gyroPsrModifierName(gyroType?: RepresentedGyroType): string {
  return isHeavyDutyGyro(gyroType) ? 'Heavy-duty gyro damage' : 'Gyro damage';
}
