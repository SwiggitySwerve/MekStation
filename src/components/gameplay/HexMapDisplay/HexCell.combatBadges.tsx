import React from 'react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';
import type { ITacticalMapCombatLosBlockerReference } from '@/utils/gameplay/tacticalMapProjection';

import { CoverLevel, RangeBracket, TerrainType } from '@/types/gameplay';

import {
  combatWeaponOptionArcStatesAttribute,
  combatWeaponOptionAvailabilityAttribute,
  combatWeaponOptionBlockedReasonsAttribute,
  combatWeaponOptionEnvironmentStatesAttribute,
  combatWeaponOptionExpectedDamagesAttribute,
  combatWeaponOptionRangesAttribute,
} from './HexCell.combatOptionSummaries';

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

function formatCombatRangeBadgeLabel(combatInfo: ICombatRangeHex): string {
  const distance = Number.isFinite(combatInfo.distance)
    ? combatInfo.distance
    : '?';
  return `${formatRangeBracketLabel(combatInfo.rangeBracket)}${distance}`;
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

function formatCombatCoverBadgeLevelLabel(level: CoverLevel): string {
  switch (level) {
    case CoverLevel.Partial:
      return 'P';
    case CoverLevel.Full:
      return 'F';
    case CoverLevel.None:
      return 'C';
  }
}

function formatCombatCoverBadgeLabel(combatInfo: ICombatRangeHex): string {
  return `${formatCombatCoverBadgeLevelLabel(combatInfo.targetCoverLevel)}+${combatInfo.targetCoverModifier}`;
}

function formatRangeBracketName(bracket: RangeBracket): string {
  return bracket.replace(/_/g, ' ');
}

function formatWeaponList(ids: readonly string[]): string {
  return ids.length > 0 ? ids.join(', ') : 'none';
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

function formatCombatBadgeSummary(combatInfo: ICombatRangeHex): string {
  const status = combatInfo.attackable ? 'attack available' : 'not attackable';
  const blockedOptions = combatInfo.weaponRangeOptions
    .filter((option) => !option.available)
    .map((option) => `${option.weaponId} ${option.blockedReason ?? 'blocked'}`);
  const optionSummary =
    blockedOptions.length > 0
      ? `; blocked weapons ${blockedOptions.join(', ')}`
      : '';
  return `${formatRangeBracketName(combatInfo.rangeBracket)} range at ${combatInfo.distance} hexes; ${status}; weapons available ${formatWeaponList(combatInfo.weaponIdsAvailable)}${optionSummary}`;
}

function weaponOptionAvailabilityCount(combatInfo: ICombatRangeHex): {
  readonly available: number;
  readonly total: number;
  readonly blocked: number;
} {
  const total = combatInfo.weaponRangeOptions.length;
  const available = combatInfo.weaponRangeOptions.filter(
    (option) => option.available,
  ).length;
  return {
    available,
    total,
    blocked: total - available,
  };
}

function formatWeaponAvailabilityTitle(combatInfo: ICombatRangeHex): string {
  const { available, total, blocked } =
    weaponOptionAvailabilityCount(combatInfo);
  const blockedOptions = combatInfo.weaponRangeOptions
    .filter((option) => !option.available)
    .map(
      (option) => `${option.weaponId}: ${option.blockedReason ?? 'blocked'}`,
    );
  const blockedSummary =
    blockedOptions.length > 0 ? `; blocked ${blockedOptions.join(', ')}` : '';
  return `Weapons available ${available} of ${total}; blocked ${blocked}${blockedSummary}`;
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
  const hasCoverModifier = combatInfo.targetCoverModifier > 0;
  const hasIndirectFire = combatInfo.indirectFireAvailable === true;
  const hasMinimumRangePenalty = (combatInfo.minimumRangePenalty ?? 0) > 0;
  const hasToHitNumber = combatInfo.toHitNumber !== undefined;
  const weaponAvailability = weaponOptionAvailabilityCount(combatInfo);
  const hasWeaponOptionCount = weaponAvailability.total > 1;
  const rangeLabel = formatCombatRangeBadgeLabel(combatInfo);
  const rangeBadgeWidth = Math.max(28, rangeLabel.length * 5.4 + 10);
  const combatSummary = formatCombatBadgeSummary(combatInfo);
  const weaponAvailabilityTitle = formatWeaponAvailabilityTitle(combatInfo);
  const indirectTitle = combatInfo.indirectFireReason ?? 'Indirect fire';
  const coverTitle =
    combatInfo.targetCoverReason ??
    `Cover modifier +${combatInfo.targetCoverModifier}`;
  const coverLabel = formatCombatCoverBadgeLabel(combatInfo);
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
      {hasWeaponOptionCount && (
        <g
          data-testid={`hex-combat-weapon-count-badge-${hex.q}-${hex.r}`}
          aria-label={weaponAvailabilityTitle}
          data-combat-weapon-count-badge-available={
            weaponAvailability.available
          }
          data-combat-weapon-count-badge-total={weaponAvailability.total}
          data-combat-weapon-count-badge-blocked={weaponAvailability.blocked}
          data-combat-weapon-count-badge-weapons-available={combatInfo.weaponIdsAvailable.join(
            ',',
          )}
          data-combat-weapon-count-badge-blocked-reasons={combatWeaponOptionBlockedReasonsAttribute(
            combatInfo.weaponRangeOptions,
          )}
        >
          <title>{weaponAvailabilityTitle}</title>
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
      )}
      {hasIndirectFire && (
        <g
          data-testid={`hex-indirect-fire-badge-${hex.q}-${hex.r}`}
          aria-label={indirectTitle}
          data-combat-indirect-badge-basis={combatInfo.indirectFireBasis}
          data-combat-indirect-badge-spotter={combatInfo.indirectFireSpotterId}
          data-combat-indirect-badge-penalty={
            combatInfo.indirectFireToHitPenalty
          }
          data-combat-indirect-badge-spotter-gunnery={
            combatInfo.indirectFireSpotterGunnery
          }
          data-combat-indirect-badge-spotter-skill-modifier={
            combatInfo.indirectFireSpotterSkillModifier
          }
          data-combat-indirect-badge-forward-observer={
            combatInfo.indirectFireForwardObserver ? 'true' : undefined
          }
          data-combat-indirect-badge-penalty-cancelled={
            combatInfo.indirectFirePenaltyCancelled
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
        x={x - rangeBadgeWidth / 2}
        y={y + 19}
        width={rangeBadgeWidth}
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
        {rangeLabel}
      </text>
      <CombatGeometryBadges x={x} y={y} hex={hex} combatInfo={combatInfo} />
      <CombatVisibilityBadge x={x} y={y} hex={hex} combatInfo={combatInfo} />
      {hasCoverModifier && (
        <g
          data-testid={`hex-cover-badge-${hex.q}-${hex.r}`}
          aria-label={coverTitle}
          data-combat-cover-badge-level={combatInfo.targetCoverLevel}
          data-combat-cover-badge-label={coverLabel}
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
            {coverLabel}
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
