import React from 'react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';

function formatDamageValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatAmmoSummary(combatInfo: ICombatRangeHex): string {
  return combatInfo.availableWeaponImpacts
    .filter((impact) => impact.ammoConsumed > 0)
    .map((impact) => {
      const remaining =
        impact.ammoRemaining === undefined
          ? ''
          : ` ${Math.max(0, impact.ammoRemaining - impact.ammoConsumed)} left`;
      return `${impact.weaponName} -${impact.ammoConsumed}${remaining}`;
    })
    .join('; ');
}

function totalAmmoConsumed(combatInfo: ICombatRangeHex): number {
  return combatInfo.availableWeaponImpacts.reduce(
    (sum, impact) => sum + Math.max(0, impact.ammoConsumed),
    0,
  );
}

export function CombatImpactBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo?: ICombatRangeHex;
}): React.ReactElement | null {
  if (
    !combatInfo?.hasTarget ||
    !combatInfo.attackable ||
    combatInfo.availableWeaponImpacts.length === 0
  ) {
    return null;
  }

  const ammoConsumed = totalAmmoConsumed(combatInfo);
  const ammoSummary = formatAmmoSummary(combatInfo);
  const damageLabel =
    combatInfo.availableWeaponDamage > 0
      ? ` D${formatDamageValue(combatInfo.availableWeaponDamage)}`
      : '';
  const expectedLabel =
    combatInfo.expectedDamage === undefined
      ? ''
      : ` E${formatDamageValue(combatInfo.expectedDamage)}`;
  const ammoLabel = ammoConsumed > 0 ? ` A${ammoConsumed}` : '';
  const label = `H+${combatInfo.availableWeaponHeat}${damageLabel}${expectedLabel}${ammoLabel}`;
  const titleParts = [
    `Projected attack impact: +${combatInfo.availableWeaponHeat} heat`,
  ];
  if (combatInfo.availableWeaponDamage > 0) {
    titleParts.push(
      `damage ${formatDamageValue(combatInfo.availableWeaponDamage)} listed`,
    );
  }
  if (combatInfo.expectedDamage !== undefined) {
    titleParts.push(
      `expected ${formatDamageValue(combatInfo.expectedDamage)} damage`,
    );
  }
  if (ammoSummary) titleParts.push(`ammo ${ammoSummary}`);
  const title = titleParts.join('; ');
  const width = Math.max(44, label.length * 5.2 + 10);

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-combat-impact-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-impact-badge-heat={combatInfo.availableWeaponHeat}
      data-combat-impact-badge-damage={combatInfo.availableWeaponDamage}
      data-combat-impact-badge-expected-damage={combatInfo.expectedDamage}
      data-combat-impact-badge-ammo-consumed={ammoConsumed}
      data-combat-impact-badge-ammo-summary={ammoSummary || undefined}
    >
      <title>{title}</title>
      <rect
        x={x - width / 2}
        y={y + 58}
        width={width}
        height={12}
        rx={3}
        fill="#581c87"
        opacity={0.92}
      />
      <text
        x={x}
        y={y + 67}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#faf5ff"
      >
        {label}
      </text>
    </g>
  );
}
