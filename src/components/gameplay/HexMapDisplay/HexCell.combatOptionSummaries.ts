import type { ICombatWeaponRangeOption } from '@/types/gameplay';

function optionEntries(
  options: readonly ICombatWeaponRangeOption[],
  valueFor: (option: ICombatWeaponRangeOption) => string,
): string | undefined {
  if (options.length === 0) return undefined;
  return options
    .map((option) => `${option.weaponId}:${valueFor(option)}`)
    .join('|');
}

function formatNumericAttribute(value: number): string {
  return Number.isInteger(value)
    ? `${value}`
    : value.toFixed(2).replace(/\.?0+$/, '');
}

export function combatWeaponOptionRangesAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  return optionEntries(options, (option) => option.rangeBracket);
}

export function combatWeaponOptionArcStatesAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  return optionEntries(options, (option) =>
    option.inArc ? 'in-arc' : 'out-of-arc',
  );
}

export function combatWeaponOptionEnvironmentStatesAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  return optionEntries(options, (option) =>
    option.environmentLegal ? 'legal' : 'blocked',
  );
}

export function combatWeaponOptionAvailabilityAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  return optionEntries(options, (option) =>
    option.available ? 'available' : 'blocked',
  );
}

export function combatWeaponOptionBlockedReasonsAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  const blockedOptions = options
    .filter((option) => option.blockedReason)
    .map((option) => `${option.weaponId}:${option.blockedReason}`);
  return blockedOptions.length > 0 ? blockedOptions.join('|') : undefined;
}

export function combatWeaponOptionToHitNumbersAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  const toHitOptions = options
    .filter((option) => option.toHitNumber !== undefined)
    .map((option) => `${option.weaponId}:${option.toHitNumber}`);
  return toHitOptions.length > 0 ? toHitOptions.join('|') : undefined;
}

export function combatWeaponOptionToHitModifiersAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  const toHitOptions = options.flatMap((option) => {
    const modifiers = option.toHitModifiers;
    if (!modifiers || modifiers.length === 0) return [];
    return [
      `${option.weaponId}:${modifiers
        .map((modifier) => `${modifier.name}:${modifier.value}`)
        .join(',')}`,
    ];
  });
  return toHitOptions.length > 0 ? toHitOptions.join('|') : undefined;
}

export function combatWeaponOptionExpectedDamagesAttribute(
  options: readonly ICombatWeaponRangeOption[],
): string | undefined {
  const expectedDamageOptions = options.flatMap((option) =>
    option.expectedDamage === undefined
      ? []
      : [`${option.weaponId}:${formatNumericAttribute(option.expectedDamage)}`],
  );
  return expectedDamageOptions.length > 0
    ? expectedDamageOptions.join('|')
    : undefined;
}
