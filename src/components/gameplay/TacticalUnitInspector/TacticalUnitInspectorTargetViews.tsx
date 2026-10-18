import React from 'react';

import type {
  TargetProjection,
  StatusBadgeSpec,
} from './TacticalUnitInspectorViewPrimitives';

import {
  InfoRow,
  heatStatusColor,
  StatusBadge,
} from './TacticalUnitInspectorViewPrimitives';

const TARGET_BAND_LABEL: Record<string, string> = {
  pristine: 'Pristine',
  'lightly-damaged': 'Lightly Damaged',
  'moderately-damaged': 'Moderately Damaged',
  'heavily-damaged': 'Heavily Damaged',
  crippled: 'Crippled',
};

const TARGET_BAND_COLOR: Record<string, string> = {
  pristine: 'text-green-600',
  'lightly-damaged': 'text-green-700',
  'moderately-damaged': 'text-amber-600',
  'heavily-damaged': 'text-orange-600',
  crippled: 'text-red-600',
};

function TargetHeader({
  projection,
}: {
  readonly projection: TargetProjection;
}): React.ReactElement {
  return (
    <div className="border-b border-red-200 pb-2">
      <div
        className="text-sm font-semibold text-red-900"
        data-testid="inspector-unit-name"
      >
        {projection.name}
      </div>
      {projection.chassis !== null && (
        <div
          className="text-text-theme-muted text-xs"
          data-testid="inspector-chassis"
        >
          {projection.chassis}
        </div>
      )}
      {!projection.isExact && (
        <div className="text-text-theme-secondary text-xs italic">
          Rough intel
        </div>
      )}
    </div>
  );
}

function DamageBandRow({
  projection,
}: {
  readonly projection: TargetProjection;
}): React.ReactElement {
  return (
    <InfoRow
      label="Damage"
      testId="inspector-damage-band"
      valueClassName={`font-medium ${TARGET_BAND_COLOR[projection.damageBand] ?? 'text-text-theme-primary'}`}
    >
      {TARGET_BAND_LABEL[projection.damageBand] ?? projection.damageBand}
    </InfoRow>
  );
}

function TargetExactFields({
  projection,
}: {
  readonly projection: TargetProjection;
}): React.ReactElement | null {
  if (!projection.isExact) return null;

  const heat = projection.heat ?? 0;
  return (
    <>
      <InfoRow
        label="Heat"
        testId="inspector-heat"
        valueClassName={heatStatusColor(heat)}
      >
        {projection.heat}
      </InfoRow>
      <InfoRow label="Armor" testId="inspector-armor">
        {projection.totalArmorRemaining}
      </InfoRow>
      <InfoRow label="Structure" testId="inspector-structure">
        {projection.totalStructureRemaining}
      </InfoRow>
    </>
  );
}

function TargetStatusFlags({
  projection,
}: {
  readonly projection: TargetProjection;
}): React.ReactElement | null {
  const badges: StatusBadgeSpec[] = [
    {
      show: projection.destroyed,
      label: 'DESTROYED',
      className:
        'rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700',
    },
    {
      show: projection.shutdown !== null && projection.shutdown,
      label: 'SHUTDOWN',
      className:
        'rounded bg-surface-raised px-1 py-0.5 text-xs font-semibold text-text-theme-primary',
    },
    {
      show: projection.prone,
      label: 'PRONE',
      className:
        'rounded bg-yellow-100 px-1 py-0.5 text-xs font-semibold text-yellow-700',
    },
  ];
  const visibleBadges = badges.filter((badge) => badge.show);
  if (visibleBadges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1" data-testid="inspector-status-flags">
      {visibleBadges.map((badge) => (
        <StatusBadge
          key={badge.label}
          label={badge.label}
          className={badge.className}
        />
      ))}
    </div>
  );
}

export function TargetView({
  projection,
}: {
  readonly projection: TargetProjection;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 p-3" data-testid="inspector-target">
      <TargetHeader projection={projection} />
      <DamageBandRow projection={projection} />
      <TargetExactFields projection={projection} />
      <TargetStatusFlags projection={projection} />
    </div>
  );
}

export function RedactedView(): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 p-6 text-center"
      data-testid="inspector-redacted"
      aria-label="Unknown contact — no intelligence available"
    >
      <div className="text-text-theme-muted text-sm font-medium">
        Unknown Contact
      </div>
      <div className="text-text-theme-secondary text-xs">
        No intelligence available
      </div>
    </div>
  );
}
