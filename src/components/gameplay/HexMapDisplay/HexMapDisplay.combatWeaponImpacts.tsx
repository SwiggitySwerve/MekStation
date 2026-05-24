import React from 'react';

import type { ICombatRangeHex, ICombatWeaponImpact } from '@/types/gameplay';

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function ammoRemainingAfterImpact(
  impact: ICombatWeaponImpact,
): number | undefined {
  if (impact.ammoRemaining === undefined) return undefined;
  return Math.max(0, impact.ammoRemaining - impact.ammoConsumed);
}

function formatWeaponImpact(impact: ICombatWeaponImpact): string {
  const ammoRemainingAfter = ammoRemainingAfterImpact(impact);
  const ammo =
    impact.ammoConsumed > 0
      ? `, ammo -${impact.ammoConsumed}${
          ammoRemainingAfter === undefined
            ? ''
            : ` (${ammoRemainingAfter} left)`
        }`
      : '';
  return `${impact.weaponName}: +${impact.heat} heat, ${formatDamageValue(
    impact.damage,
  )} damage${ammo}`;
}

function joinedImpactAttribute(
  impacts: readonly ICombatWeaponImpact[],
  readValue: (impact: ICombatWeaponImpact) => string | number | undefined,
): string | undefined {
  if (impacts.length === 0) return undefined;
  const values = impacts.map(readValue);
  return values.some((value) => value !== undefined)
    ? values.map((value) => value ?? '').join('|')
    : undefined;
}

export function CombatWeaponImpactRows({
  combatInfo,
  testId,
}: {
  readonly combatInfo: ICombatRangeHex;
  readonly testId: string;
}): React.ReactElement | null {
  if (!combatInfo.hasTarget || combatInfo.availableWeaponImpacts.length === 0) {
    return null;
  }

  const impacts = combatInfo.availableWeaponImpacts;

  return (
    <div
      data-testid={testId}
      data-combat-weapon-impact-ids={joinedImpactAttribute(
        impacts,
        (impact) => impact.weaponId,
      )}
      data-combat-weapon-impact-names={joinedImpactAttribute(
        impacts,
        (impact) => impact.weaponName,
      )}
      data-combat-weapon-impact-heats={joinedImpactAttribute(
        impacts,
        (impact) => impact.heat,
      )}
      data-combat-weapon-impact-damages={joinedImpactAttribute(
        impacts,
        (impact) => impact.damage,
      )}
      data-combat-weapon-impact-ammo-consumed={joinedImpactAttribute(
        impacts,
        (impact) => impact.ammoConsumed,
      )}
      data-combat-weapon-impact-ammo-remaining-after={joinedImpactAttribute(
        impacts,
        ammoRemainingAfterImpact,
      )}
    >
      Weapon impact detail: {impacts.map(formatWeaponImpact).join('; ')}
    </div>
  );
}
