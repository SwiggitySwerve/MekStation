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
