import React from 'react';

import type { IInspectorProjection } from '@/types/gameplay/TacticalInspectorInterfaces';

import { useElectedSpotters } from '@/components/gameplay/TacticalCommandShell';

type FriendlyProjection = Extract<IInspectorProjection, { kind: 'friendly' }>;
type TargetProjection = Extract<IInspectorProjection, { kind: 'target' }>;

interface InfoRowProps {
  readonly label: string;
  readonly testId: string;
  readonly children: React.ReactNode;
  readonly valueClassName?: string;
}

interface StatusBadgeSpec {
  readonly show: boolean;
  readonly label: string;
  readonly className: string;
}

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

function pilotStatusColor(projection: FriendlyProjection): string {
  if (!projection.pilotConscious) return 'text-red-600';
  return projection.pilotWounds >= 3 ? 'text-amber-600' : 'text-gray-700';
}

function heatStatusColor(heat: number): string {
  if (heat >= 20) return 'font-semibold text-red-600';
  return heat >= 10 ? 'font-medium text-amber-600' : 'text-gray-800';
}

function InfoRow({
  label,
  testId,
  children,
  valueClassName = 'text-gray-800',
}: InfoRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className={valueClassName} data-testid={testId}>
        {children}
      </span>
    </div>
  );
}

function StatusBadge({
  label,
  className,
}: Omit<StatusBadgeSpec, 'show'>): React.ReactElement {
  return <span className={className}>{label}</span>;
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
      <div className="text-xs text-gray-500" data-testid="inspector-chassis">
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
        'rounded bg-gray-200 px-1 py-0.5 text-xs font-semibold text-gray-700',
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
      <div className="mb-1 text-xs font-medium text-gray-600">Weapons</div>
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
        <div className="text-xs text-gray-500" data-testid="inspector-chassis">
          {projection.chassis}
        </div>
      )}
      {!projection.isExact && (
        <div className="text-xs text-gray-400 italic">Rough intel</div>
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
      valueClassName={`font-medium ${TARGET_BAND_COLOR[projection.damageBand] ?? 'text-gray-800'}`}
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
        'rounded bg-gray-200 px-1 py-0.5 text-xs font-semibold text-gray-700',
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
      <div className="text-sm font-medium text-gray-500">Unknown Contact</div>
      <div className="text-xs text-gray-400">No intelligence available</div>
    </div>
  );
}
