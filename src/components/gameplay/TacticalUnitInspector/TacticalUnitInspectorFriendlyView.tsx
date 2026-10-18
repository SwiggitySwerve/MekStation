import React from 'react';

import { useElectedSpotters } from '@/components/gameplay/TacticalCommandShell';

import type {
  FriendlyProjection,
  StatusBadgeSpec,
} from './TacticalUnitInspectorViewPrimitives';

import {
  InfoRow,
  StatusBadge,
  heatStatusColor,
} from './TacticalUnitInspectorViewPrimitives';

function pilotStatusColor(projection: FriendlyProjection): string {
  if (!projection.pilotConscious) return 'text-red-600';
  return projection.pilotWounds >= 3
    ? 'text-amber-600'
    : 'text-text-theme-primary';
}

function FriendlyHeader({
  projection,
}: {
  readonly projection: FriendlyProjection;
}): React.ReactElement {
  const shellSpotters = useElectedSpotters();
  const spotterEntry = shellSpotters.find(
    (spotter) => spotter.spotterId === projection.unitId,
  );

  return (
    <div className="border-b border-blue-200 pb-2">
      <div
        className="text-sm font-semibold text-blue-900"
        data-testid="inspector-unit-name"
      >
        {projection.name}
      </div>
      <div
        className="text-text-theme-muted text-xs"
        data-testid="inspector-chassis"
      >
        {projection.chassis}
      </div>
      {spotterEntry && (
        <div
          className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
          data-testid="inspector-spotting-badge"
        >
          Spotting for: {spotterEntry.attackerId}
        </div>
      )}
    </div>
  );
}

function PilotWoundsRow({
  projection,
  statusColor,
}: {
  readonly projection: FriendlyProjection;
  readonly statusColor: string;
}): React.ReactElement | null {
  if (projection.pilotWounds <= 0) return null;

  return (
    <InfoRow
      label="Pilot Wounds"
      testId="inspector-pilot-wounds"
      valueClassName={statusColor}
    >
      {projection.pilotConscious ? `${projection.pilotWounds}/5` : 'KIA'}
    </InfoRow>
  );
}

function PilotRows({
  projection,
}: {
  readonly projection: FriendlyProjection;
}): React.ReactElement {
  const statusColor = pilotStatusColor(projection);

  return (
    <>
      <InfoRow
        label="Pilot"
        testId="inspector-pilot-name"
        valueClassName={`font-medium ${statusColor}`}
      >
        {projection.pilotName}
      </InfoRow>
      <InfoRow label="Skills" testId="inspector-pilot-skills">
        G{projection.gunnery} / P{projection.piloting}
      </InfoRow>
      <PilotWoundsRow projection={projection} statusColor={statusColor} />
    </>
  );
}

function FriendlyStatusFlags({
  projection,
}: {
  readonly projection: FriendlyProjection;
}): React.ReactElement | null {
  const badges: StatusBadgeSpec[] = [
    {
      show: projection.destroyed,
      label: 'DESTROYED',
      className:
        'rounded bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700',
    },
    {
      show: projection.shutdown,
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
    {
      show: projection.isWithdrawing,
      label: 'WITHDRAWING',
      className:
        'rounded bg-orange-100 px-1 py-0.5 text-xs font-semibold text-orange-700',
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

function CriticalEffects({
  effects,
}: {
  readonly effects: readonly string[];
}): React.ReactElement | null {
  if (effects.length === 0) return null;

  return (
    <div className="rounded bg-red-50 p-1.5">
      <div className="mb-1 text-xs font-medium text-red-700">
        Critical Damage
      </div>
      {effects.map((effect, i) => (
        <div
          key={i}
          className="text-xs text-red-600"
          data-testid={`inspector-crit-${i}`}
        >
          {effect}
        </div>
      ))}
    </div>
  );
}

function MovementRow({
  projection,
}: {
  readonly projection: FriendlyProjection;
}): React.ReactElement {
  const suffix = projection.hexesMoved !== 1 ? 'es' : '';

  return (
    <InfoRow label="Movement" testId="inspector-movement">
      {projection.movementThisTurn} ({projection.hexesMoved} hex{suffix})
    </InfoRow>
  );
}

function WeaponList({
  weapons,
}: {
  readonly weapons: FriendlyProjection['weapons'];
}): React.ReactElement | null {
  if (weapons.length === 0) return null;

  return (
    <div>
      <div className="text-text-theme-muted mb-1 text-xs font-medium">
        Weapons
      </div>
      {weapons.map((weapon) => (
        <div
          key={weapon.weaponId}
          className={`flex items-center justify-between text-xs ${weapon.disabled ? 'opacity-50' : ''}`}
          data-testid={`inspector-weapon-${weapon.weaponId}`}
        >
          <span className={weapon.disabled ? 'line-through' : ''}>
            {weapon.displayName}
          </span>
          {weapon.disabledReason && (
            <span className="text-red-500">{weapon.disabledReason}</span>
          )}
          {weapon.hasAmmoWarning && !weapon.disabled && (
            <span className="text-amber-500">Low ammo</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function FriendlyView({
  projection,
}: {
  readonly projection: FriendlyProjection;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 p-3" data-testid="inspector-friendly">
      <FriendlyHeader projection={projection} />
      <PilotRows projection={projection} />
      <InfoRow
        label="Heat"
        testId="inspector-heat"
        valueClassName={heatStatusColor(projection.heat)}
      >
        {projection.heat}
      </InfoRow>
      <InfoRow label="Armor" testId="inspector-armor">
        {projection.totalArmorRemaining}
      </InfoRow>
      <InfoRow label="Structure" testId="inspector-structure">
        {projection.totalStructureRemaining}
      </InfoRow>
      <FriendlyStatusFlags projection={projection} />
      <CriticalEffects effects={projection.criticalEffects} />
      <MovementRow projection={projection} />
      <WeaponList weapons={projection.weapons} />
    </div>
  );
}
