import React from 'react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';

import {
  formatCombatCoverBadgeLabel,
  formatWeaponAvailabilityTitle,
  weaponOptionAvailabilityCount,
} from './HexCell.combatBadgeSummaries';
import { combatWeaponOptionBlockedReasonsAttribute } from './HexCell.combatOptionSummaries';

export function CombatWeaponCountBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo: ICombatRangeHex;
}): React.ReactElement | null {
  const weaponAvailability = weaponOptionAvailabilityCount(combatInfo);
  if (weaponAvailability.total <= 1) return null;

  const title = formatWeaponAvailabilityTitle(combatInfo);
  return (
    <g
      data-testid={`hex-combat-weapon-count-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-weapon-count-badge-available={weaponAvailability.available}
      data-combat-weapon-count-badge-total={weaponAvailability.total}
      data-combat-weapon-count-badge-blocked={weaponAvailability.blocked}
      data-combat-weapon-count-badge-weapons-available={combatInfo.weaponIdsAvailable.join(
        ',',
      )}
      data-combat-weapon-count-badge-blocked-reasons={combatWeaponOptionBlockedReasonsAttribute(
        combatInfo.weaponRangeOptions,
      )}
    >
      <title>{title}</title>
      <rect
        x={x - 69}
        y={y + 6}
        width={56}
        height={12}
        rx={3}
        fill={weaponAvailability.available > 0 ? '#334155' : '#7f1d1d'}
        opacity={0.92}
      />
      <text
        x={x - 41}
        y={y + 15}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {weaponAvailability.available}/{weaponAvailability.total} WPN
      </text>
    </g>
  );
}

export function CombatIndirectFireBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo: ICombatRangeHex;
}): React.ReactElement | null {
  if (combatInfo.indirectFireAvailable !== true) return null;

  const title = combatInfo.indirectFireReason ?? 'Indirect fire';
  return (
    <g
      data-testid={`hex-indirect-fire-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-indirect-badge-basis={combatInfo.indirectFireBasis}
      data-combat-indirect-badge-spotter={combatInfo.indirectFireSpotterId}
      data-combat-indirect-badge-penalty={combatInfo.indirectFireToHitPenalty}
      data-combat-indirect-badge-spotter-attacked={
        combatInfo.indirectFireSpotterAttacked ? 'true' : undefined
      }
      data-combat-indirect-badge-forward-observer={
        combatInfo.indirectFireForwardObserver ? 'true' : undefined
      }
      data-combat-indirect-badge-penalty-cancelled={
        combatInfo.indirectFirePenaltyCancelled
      }
    >
      <title>{title}</title>
      <rect
        x={x - 48}
        y={y + 19}
        width={32}
        height={12}
        rx={3}
        fill="#1d4ed8"
        opacity={0.9}
      />
      <text
        x={x - 32}
        y={y + 28}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#eff6ff"
      >
        IND
      </text>
    </g>
  );
}

export function CombatRangeCoreBadge({
  x,
  y,
  combatInfo,
  label,
  width,
}: {
  readonly x: number;
  readonly y: number;
  readonly combatInfo: ICombatRangeHex;
  readonly label: string;
  readonly width: number;
}): React.ReactElement {
  return (
    <>
      <rect
        x={x - width / 2}
        y={y + 19}
        width={width}
        height={12}
        rx={3}
        fill={combatInfo.attackable ? '#991b1b' : '#7f1d1d'}
        opacity={0.88}
      />
      <text
        x={x}
        y={y + 28}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fef2f2"
      >
        {label}
      </text>
    </>
  );
}

export function CombatCoverBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo: ICombatRangeHex;
}): React.ReactElement | null {
  if (combatInfo.targetCoverModifier <= 0) return null;

  const title =
    combatInfo.targetCoverReason ??
    `Cover modifier +${combatInfo.targetCoverModifier}`;
  const label = formatCombatCoverBadgeLabel(combatInfo);
  return (
    <g
      data-testid={`hex-cover-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-cover-badge-level={combatInfo.targetCoverLevel}
      data-combat-cover-badge-label={label}
      data-combat-cover-badge-modifier={combatInfo.targetCoverModifier}
      data-combat-cover-badge-reason={title}
    >
      <title>{title}</title>
      <rect
        x={x + 15}
        y={y + 19}
        width={30}
        height={12}
        rx={3}
        fill="#92400e"
        opacity={0.9}
      />
      <text
        x={x + 30}
        y={y + 28}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fffbeb"
      >
        {label}
      </text>
    </g>
  );
}

export function CombatMinimumRangeBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo: ICombatRangeHex;
}): React.ReactElement | null {
  if ((combatInfo.minimumRangePenalty ?? 0) <= 0) return null;

  const title =
    combatInfo.minimumRangeReason ??
    `Minimum range penalty +${combatInfo.minimumRangePenalty ?? 0}`;
  const offset = combatInfo.targetCoverModifier > 0 ? 47 : 15;
  return (
    <g
      data-testid={`hex-minimum-range-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-minimum-range-badge-penalty={combatInfo.minimumRangePenalty}
      data-combat-minimum-range-badge-weapons={combatInfo.minimumRangeWeaponIds?.join(
        ',',
      )}
      data-combat-minimum-range-badge-reason={title}
    >
      <title>{title}</title>
      <rect
        x={x + offset}
        y={y + 19}
        width={30}
        height={12}
        rx={3}
        fill="#7c2d12"
        opacity={0.9}
      />
      <text
        x={x + offset + 15}
        y={y + 28}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#fff7ed"
      >
        MIN+{combatInfo.minimumRangePenalty}
      </text>
    </g>
  );
}

export function CombatToHitBadge({
  x,
  y,
  hex,
  combatInfo,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly combatInfo: ICombatRangeHex;
}): React.ReactElement | null {
  if (combatInfo.toHitNumber === undefined) return null;

  const title =
    combatInfo.toHitReason ?? `Target number ${combatInfo.toHitNumber ?? ''}`;
  return (
    <g
      data-testid={`hex-to-hit-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-to-hit-badge-number={combatInfo.toHitNumber}
      data-combat-to-hit-badge-reason={title}
    >
      <title>{title}</title>
      <rect
        x={x - 16}
        y={y + 32}
        width={32}
        height={12}
        rx={3}
        fill="#312e81"
        opacity={0.92}
      />
      <text
        x={x}
        y={y + 41}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#eef2ff"
      >
        TN{combatInfo.toHitNumber}
      </text>
    </g>
  );
}
