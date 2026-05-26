import type { IComponentDamageState } from '@/types/gameplay';

export type RepresentedGyroType = string | undefined;

export interface IGyroRuleOptions {
  readonly optionalRules?: readonly string[];
}

const PLAYTEST_3_OPTIONAL_RULE_KEY = 'playtest3';

function normalizedGyroType(gyroType: RepresentedGyroType): string {
  return gyroType?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';
}

function normalizedOptionalRuleKey(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hasOptionalRule(
  optionalRules: readonly string[] | undefined,
  expectedKey: string,
): boolean {
  return (optionalRules ?? []).some(
    (rule) => normalizedOptionalRuleKey(rule) === expectedKey,
  );
}

function isPlaytest3Enabled(options: IGyroRuleOptions = {}): boolean {
  return hasOptionalRule(options.optionalRules, PLAYTEST_3_OPTIONAL_RULE_KEY);
}

export function isHeavyDutyGyro(gyroType: RepresentedGyroType): boolean {
  const normalized = normalizedGyroType(gyroType);
  return normalized === 'heavyduty' || normalized === 'heavydutygyro';
}

export function gyroDestroyedHitThreshold(
  gyroType: RepresentedGyroType,
  options: IGyroRuleOptions = {},
): number {
  return isHeavyDutyGyro(gyroType) ? (isPlaytest3Enabled(options) ? 4 : 3) : 2;
}

export function isGyroDestroyedForType(
  componentDamage: IComponentDamageState,
  gyroType?: RepresentedGyroType,
  options: IGyroRuleOptions = {},
): boolean {
  return (
    componentDamage.gyroHits >= gyroDestroyedHitThreshold(gyroType, options)
  );
}

export function gyroPsrModifierForType(
  componentDamage: IComponentDamageState,
  gyroType?: RepresentedGyroType,
  options: IGyroRuleOptions = {},
): number {
  if (!isHeavyDutyGyro(gyroType)) {
    return componentDamage.gyroHits * 3;
  }

  if (componentDamage.gyroHits <= 0) return 0;
  if (isPlaytest3Enabled(options)) {
    return Math.min(componentDamage.gyroHits, 3);
  }
  return componentDamage.gyroHits === 1 ? 1 : 3;
}

export function gyroPsrModifierName(gyroType?: RepresentedGyroType): string {
  return isHeavyDutyGyro(gyroType) ? 'Heavy-duty gyro damage' : 'Gyro damage';
}
