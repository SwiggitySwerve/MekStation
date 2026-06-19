import React from 'react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';
import type { ITacticalMapCombatLosBlockerReference } from '@/utils/gameplay/tacticalMapProjection';

import { TerrainType } from '@/types/gameplay';

import {
  formatCombatBadgeSummary,
  formatCombatRangeBadgeLabel,
} from './HexCell.combatBadgeSummaries';
import {
  combatWeaponOptionArcStatesAttribute,
  combatWeaponOptionAvailabilityAttribute,
  combatWeaponOptionBlockedReasonsAttribute,
  combatWeaponOptionEnvironmentStatesAttribute,
  combatWeaponOptionExpectedDamagesAttribute,
  combatWeaponOptionRangesAttribute,
} from './HexCell.combatOptionSummaries';
import {
  CombatCoverBadge,
  CombatIndirectFireBadge,
  CombatMinimumRangeBadge,
  CombatRangeCoreBadge,
  CombatToHitBadge,
  CombatWeaponCountBadge,
} from './HexCell.combatRangeSubBadges';

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

function formatHexKey(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}

function formatLOSBlockerTerrainLabel(
  terrain: TerrainType | undefined,
): string {
  switch (terrain) {
    case TerrainType.Building:
      return 'BLDG';
    case TerrainType.LightWoods:
    case TerrainType.HeavyWoods:
      return 'WDS';
    case TerrainType.Smoke:
      return 'SMK';
    default:
      return 'BLK';
  }
}

function formatLOSBlockerBadgeLabel(
  ref: ITacticalMapCombatLosBlockerReference,
): string {
  if (ref.losState === 'partial' || ref.blocker.kind === 'cover') {
    return 'LOS COV';
  }
  switch (ref.blocker.kind) {
    case 'elevation':
      return 'LOS ELEV';
    case 'terrain':
      return `LOS ${formatLOSBlockerTerrainLabel(ref.blocker.terrain)}`;
    default:
      return 'LOS BLK';
  }
}

function strongestLOSBlockerReference(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): ITacticalMapCombatLosBlockerReference {
  return refs.find((ref) => ref.losState === 'blocked') ?? refs[0];
}

function formatLOSBlockerTitle(
  refs: readonly ITacticalMapCombatLosBlockerReference[],
): string {
  const primary = strongestLOSBlockerReference(refs);
  const targetHexes = refs.map((ref) => formatHexKey(ref.targetHex));
  const uniqueReasons = Array.from(
    new Set(refs.map((ref) => ref.blocker.reason)),
  );
  const affectedTargets = `affects target hex${targetHexes.length === 1 ? '' : 'es'} ${targetHexes.join(', ')}`;
  return `LOS ${primary.losState} at blocker ${formatHexKey(primary.blocker.hex)}: ${uniqueReasons.join('; ')}; ${affectedTargets}`;
}

export function CombatLineOfSightBlockerBadge({
  x,
  y,
  hex,
  blockerRefs,
}: {
  readonly x: number;
  readonly y: number;
  readonly hex: IHexCoordinate;
  readonly blockerRefs?: readonly ITacticalMapCombatLosBlockerReference[];
}): React.ReactElement | null {
  if (!blockerRefs || blockerRefs.length === 0) return null;

  const primary = strongestLOSBlockerReference(blockerRefs);
  const label = formatLOSBlockerBadgeLabel(primary);
  const title = formatLOSBlockerTitle(blockerRefs);
  const targetHexes = blockerRefs.map((ref) => formatHexKey(ref.targetHex));
  const targetIds = blockerRefs.map((ref) => ref.targetUnitIds.join(','));
  const width = Math.max(44, label.length * 5.4 + 10);
  const isPartial = primary.losState === 'partial';

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-combat-los-blocker-badge-${hex.q}-${hex.r}`}
      aria-label={title}
      data-combat-los-blocker-target-hexes={targetHexes.join('|')}
      data-combat-los-blocker-target-ids={targetIds.join('|')}
      data-combat-los-blocker-state={primary.losState}
      data-combat-los-blocker-kind={primary.blocker.kind}
      data-combat-los-blocker-terrain={primary.blocker.terrain}
      data-combat-los-blocker-reason={primary.blocker.reason}
    >
      <title>{title}</title>
      <rect
        x={x - width / 2}
        y={y - 36}
        width={width}
        height={12}
        rx={3}
        fill={isPartial ? '#075985' : '#581c87'}
        opacity={0.94}
        stroke="#f8fafc"
        strokeOpacity={0.6}
        strokeWidth={0.75}
      />
      <text
        x={x}
        y={y - 27}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill={isPartial ? '#e0f2fe' : '#faf5ff'}
      >
        {label}
      </text>
    </g>
  );
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

  const rangeLabel = formatCombatRangeBadgeLabel(combatInfo);
  const rangeBadgeWidth = Math.max(28, rangeLabel.length * 5.4 + 10);
  const combatSummary = formatCombatBadgeSummary(combatInfo);

  return (
    <g
      pointerEvents="none"
      data-testid={`hex-combat-badge-${hex.q}-${hex.r}`}
      aria-label={combatSummary}
      data-combat-badge-range={combatInfo.rangeBracket}
      data-combat-badge-label={rangeLabel}
      data-combat-badge-distance={combatInfo.distance}
      data-combat-badge-attackable={combatInfo.attackable ? 'true' : 'false'}
      data-combat-badge-weapons-available={combatInfo.weaponIdsAvailable.join(
        ',',
      )}
      data-combat-badge-weapon-option-ranges={combatWeaponOptionRangesAttribute(
        combatInfo.weaponRangeOptions,
      )}
      data-combat-badge-weapon-option-arc-states={combatWeaponOptionArcStatesAttribute(
        combatInfo.weaponRangeOptions,
      )}
      data-combat-badge-weapon-option-environment-states={combatWeaponOptionEnvironmentStatesAttribute(
        combatInfo.weaponRangeOptions,
      )}
      data-combat-badge-weapon-option-availability={combatWeaponOptionAvailabilityAttribute(
        combatInfo.weaponRangeOptions,
      )}
      data-combat-badge-weapon-option-blocked-reasons={combatWeaponOptionBlockedReasonsAttribute(
        combatInfo.weaponRangeOptions,
      )}
      data-combat-badge-weapon-option-expected-damages={combatWeaponOptionExpectedDamagesAttribute(
        combatInfo.weaponRangeOptions,
      )}
    >
      <title>{combatSummary}</title>
      <CombatWeaponCountBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatIndirectFireBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatRangeCoreBadge
        x={x}
        y={y}
        combatInfo={combatInfo}
        label={rangeLabel}
        width={rangeBadgeWidth}
      />
      <CombatGeometryBadges x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatVisibilityBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatCoverBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatMinimumRangeBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatToHitBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
    </g>
  );
}
