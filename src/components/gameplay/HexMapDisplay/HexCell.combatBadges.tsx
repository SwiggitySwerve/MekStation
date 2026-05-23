import React from 'react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';

import { RangeBracket } from '@/types/gameplay';

function formatRangeBracketLabel(bracket: RangeBracket): string {
  switch (bracket) {
    case RangeBracket.Short:
      return 'S';
    case RangeBracket.Medium:
      return 'M';
    case RangeBracket.Long:
      return 'L';
    case RangeBracket.Extreme:
      return 'X';
    case RangeBracket.OutOfRange:
      return 'OUT';
  }
}

function formatCombatLOSBadgeLabel(combatInfo: ICombatRangeHex): string {
  switch (combatInfo.losState) {
    case 'clear':
      return 'LOS';
    case 'partial':
      return 'P-LOS';
    case 'blocked':
      return 'NO LOS';
  }
}

function formatCombatArcBadgeLabel(combatInfo: ICombatRangeHex): string {
  switch (combatInfo.firingArc) {
    case 'front':
      return 'FRONT';
    case 'left-side':
      return 'L ARC';
    case 'right-side':
      return 'R ARC';
    case 'rear':
      return 'REAR';
    case 'out-of-arc':
      return 'NO ARC';
  }
}

function formatCombatVisibilityBadgeLabel(
  combatInfo: ICombatRangeHex,
): string | null {
  switch (combatInfo.targetVisibilityState) {
    case 'hidden':
      return 'HID';
    case 'lastKnown':
      return 'LAST';
    case 'mixed':
      return 'MIX';
    case 'visible':
    case 'none':
      return null;
  }
}

function formatRangeBracketName(bracket: RangeBracket): string {
  return bracket.replace(/_/g, ' ');
}

function formatWeaponList(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(', ') : 'none';
}

function formatCombatBadgeSummary(combatInfo: ICombatRangeHex): string {
  const status = combatInfo.attackable ? 'attack available' : 'not attackable';
  return `${formatRangeBracketName(combatInfo.rangeBracket)} range at ${combatInfo.distance} hexes; ${status}; weapons available ${formatWeaponList(combatInfo.weaponIdsAvailable)}`;
}

function CombatGeometryBadges({
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
  if (!combatInfo.hasTarget) return null;

  const losBadgeLabel = formatCombatLOSBadgeLabel(combatInfo);
  const arcBadgeLabel = formatCombatArcBadgeLabel(combatInfo);
  const losReason =
    combatInfo.lineOfSightBlockerReason ??
    `Line of sight ${combatInfo.losState}`;
  const losTitle = `LOS ${combatInfo.losState}: ${losReason}`;
  const arcTitle = `${combatInfo.firingArc} arc ${
    combatInfo.inArc ? 'covered' : 'not covered'
  }`;
  return (
    <>
      <g
        data-testid={`hex-combat-los-badge-${hex.q}-${hex.r}`}
        aria-label={losTitle}
        data-combat-los-badge-state={combatInfo.losState}
        data-combat-los-badge-reason={losReason}
      >
        <title>{losTitle}</title>
        <rect
          x={x - 55}
          y={y + 32}
          width={42}
          height={12}
          rx={3}
          fill={combatInfo.losState === 'blocked' ? '#7f1d1d' : '#065f46'}
          opacity={0.9}
        />
        <text
          x={x - 34}
          y={y + 41}
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill={combatInfo.losState === 'blocked' ? '#fff7ed' : '#ecfdf5'}
        >
          {losBadgeLabel}
        </text>
      </g>
      <g
        data-testid={`hex-combat-arc-badge-${hex.q}-${hex.r}`}
        aria-label={arcTitle}
        data-combat-arc-badge-arc={combatInfo.firingArc}
        data-combat-arc-badge-in-arc={combatInfo.inArc ? 'true' : 'false'}
      >
        <title>{arcTitle}</title>
        <rect
          x={x + 13}
          y={y + 32}
          width={42}
          height={12}
          rx={3}
          fill={combatInfo.inArc ? '#1e40af' : '#7f1d1d'}
          opacity={0.9}
        />
        <text
          x={x + 34}
          y={y + 41}
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill={combatInfo.inArc ? '#eff6ff' : '#fff7ed'}
        >
          {arcBadgeLabel}
        </text>
      </g>
    </>
  );
}

function CombatVisibilityBadge({
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
  const label = formatCombatVisibilityBadgeLabel(combatInfo);
  if (!label) return null;
  const reason =
    combatInfo.visibilityBlockedReason ??
    `Target visibility ${combatInfo.targetVisibilityState}`;

  return (
    <g
      data-testid={`hex-combat-visibility-badge-${hex.q}-${hex.r}`}
      aria-label={reason}
      data-combat-visibility-badge-state={combatInfo.targetVisibilityState}
      data-combat-visibility-badge-reason={reason}
    >
      <title>{reason}</title>
      <rect
        x={x - 17}
        y={y + 45}
        width={34}
        height={12}
        rx={3}
        fill={combatInfo.attackable ? '#334155' : '#4c1d95'}
        opacity={0.92}
      />
      <text
        x={x}
        y={y + 54}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {label}
      </text>
    </g>
  );
}

export function CombatRangeBadge({
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
  if (!combatInfo || (!combatInfo.inRange && !combatInfo.hasTarget)) {
    return null;
  }
  const hasCoverModifier = combatInfo.targetCoverModifier > 0;
  const hasIndirectFire = combatInfo.indirectFireAvailable === true;
  const hasMinimumRangePenalty = (combatInfo.minimumRangePenalty ?? 0) > 0;
  const hasToHitNumber = combatInfo.toHitNumber !== undefined;
  const combatSummary = formatCombatBadgeSummary(combatInfo);
  const indirectTitle = combatInfo.indirectFireReason ?? 'Indirect fire';
  const coverTitle =
    combatInfo.targetCoverReason ??
    `Cover modifier +${combatInfo.targetCoverModifier}`;
  const minimumRangeTitle =
    combatInfo.minimumRangeReason ??
    `Minimum range penalty +${combatInfo.minimumRangePenalty ?? 0}`;
  const toHitTitle =
    combatInfo.toHitReason ?? `Target number ${combatInfo.toHitNumber ?? ''}`;

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-combat-badge-${hex.q}-${hex.r}`}
      aria-label={combatSummary}
      data-combat-badge-range={combatInfo.rangeBracket}
      data-combat-badge-distance={combatInfo.distance}
      data-combat-badge-attackable={combatInfo.attackable ? 'true' : 'false'}
      data-combat-badge-weapons-available={combatInfo.weaponIdsAvailable.join(
        ',',
      )}
    >
      <title>{combatSummary}</title>
      {hasIndirectFire && (
        <g
          data-testid={`hex-indirect-fire-badge-${hex.q}-${hex.r}`}
          aria-label={indirectTitle}
          data-combat-indirect-badge-basis={combatInfo.indirectFireBasis}
          data-combat-indirect-badge-spotter={combatInfo.indirectFireSpotterId}
          data-combat-indirect-badge-penalty={
            combatInfo.indirectFireToHitPenalty
          }
        >
          <title>{indirectTitle}</title>
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
      )}
      <rect
        x={x - 14}
        y={y + 19}
        width={28}
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
        {formatRangeBracketLabel(combatInfo.rangeBracket)}
      </text>
      <CombatGeometryBadges x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatVisibilityBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      {hasCoverModifier && (
        <g
          data-testid={`hex-cover-badge-${hex.q}-${hex.r}`}
          aria-label={coverTitle}
          data-combat-cover-badge-level={combatInfo.targetCoverLevel}
          data-combat-cover-badge-modifier={combatInfo.targetCoverModifier}
          data-combat-cover-badge-reason={coverTitle}
        >
          <title>{coverTitle}</title>
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
            C+{combatInfo.targetCoverModifier}
          </text>
        </g>
      )}
      {hasMinimumRangePenalty && (
        <g
          data-testid={`hex-minimum-range-badge-${hex.q}-${hex.r}`}
          aria-label={minimumRangeTitle}
          data-combat-minimum-range-badge-penalty={
            combatInfo.minimumRangePenalty
          }
          data-combat-minimum-range-badge-weapons={combatInfo.minimumRangeWeaponIds?.join(
            ',',
          )}
          data-combat-minimum-range-badge-reason={minimumRangeTitle}
        >
          <title>{minimumRangeTitle}</title>
          <rect
            x={x + (hasCoverModifier ? 47 : 15)}
            y={y + 19}
            width={30}
            height={12}
            rx={3}
            fill="#7c2d12"
            opacity={0.9}
          />
          <text
            x={x + (hasCoverModifier ? 62 : 30)}
            y={y + 28}
            textAnchor="middle"
            fontSize={8}
            fontWeight="bold"
            fill="#fff7ed"
          >
            MIN+{combatInfo.minimumRangePenalty}
          </text>
        </g>
      )}
      {hasToHitNumber && (
        <g
          data-testid={`hex-to-hit-badge-${hex.q}-${hex.r}`}
          aria-label={toHitTitle}
          data-combat-to-hit-badge-number={combatInfo.toHitNumber}
          data-combat-to-hit-badge-reason={toHitTitle}
        >
          <title>{toHitTitle}</title>
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
      )}
    </g>
  );
}
