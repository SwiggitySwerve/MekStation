import React from 'react';

import type { ICommandPreview } from '@/types/gameplay';

import { attackTypeLabel } from '../PhysicalAttackPanel.helpers';

function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function CommandPreviewPanel({
  preview,
}: {
  readonly preview: ICommandPreview;
}): React.ReactElement {
  if (preview.kind === 'movement') {
    return <MovementCommandPreview preview={preview} />;
  }

  if (preview.kind === 'weapon-attack') {
    return <WeaponAttackCommandPreview preview={preview} />;
  }

  return <PhysicalAttackCommandPreview preview={preview} />;
}

function MovementCommandPreview({
  preview,
}: {
  readonly preview: Extract<ICommandPreview, { kind: 'movement' }>;
}): React.ReactElement {
  return (
    <div
      className="border-border-theme bg-surface-raised text-text-theme-primary min-w-48 rounded border px-3 py-2 text-xs shadow"
      data-testid="command-preview-movement"
      data-command-preview-kind="movement"
      data-command-preview-mp-cost={preview.mpCost}
      data-command-preview-mode={preview.mode}
      data-command-preview-movement-mode={preview.movementMode}
      data-command-preview-heat={preview.heatGenerated}
      data-command-preview-turning-cost={preview.turningCost}
      data-command-preview-unreachable={preview.unreachable ? 'true' : 'false'}
    >
      <div className="font-semibold">
        {preview.unreachable ? 'Blocked Move' : 'Move Preview'}
      </div>
      <div className="text-text-theme-secondary mt-1">
        {preview.mode} - {preview.mpCost} MP
        {preview.heatGenerated !== undefined
          ? ` - Heat ${formatSigned(preview.heatGenerated)}`
          : ''}
      </div>
      {(preview.terrainCost !== undefined ||
        preview.turningCost !== undefined ||
        preview.elevationCost !== undefined) && (
        <div className="text-text-theme-secondary">
          {preview.terrainCost !== undefined
            ? `Terrain +${preview.terrainCost}`
            : ''}
          {preview.terrainCost !== undefined &&
          (preview.turningCost !== undefined ||
            preview.elevationCost !== undefined)
            ? ' - '
            : ''}
          {preview.turningCost !== undefined
            ? `Turning +${preview.turningCost}`
            : ''}
          {preview.turningCost !== undefined &&
          preview.elevationCost !== undefined
            ? ' - '
            : ''}
          {preview.elevationCost !== undefined
            ? `Elevation +${preview.elevationCost}`
            : ''}
        </div>
      )}
      {preview.blockedReason && (
        <div className="text-warning mt-1" data-testid="command-preview-reason">
          {preview.blockedReason}
        </div>
      )}
    </div>
  );
}

function WeaponAttackCommandPreview({
  preview,
}: {
  readonly preview: Extract<ICommandPreview, { kind: 'weapon-attack' }>;
}): React.ReactElement {
  const ammoEntries = Object.entries(preview.ammoUsage);
  return (
    <div
      className="border-border-theme bg-surface-raised text-text-theme-primary min-w-56 rounded border px-3 py-2 text-xs shadow"
      data-testid="command-preview-weapon"
      data-command-preview-kind="weapon-attack"
      data-command-preview-target={preview.targetUnitId}
      data-command-preview-attackable={preview.attackable ? 'true' : 'false'}
      data-command-preview-to-hit={preview.toHit ?? undefined}
      data-command-preview-range={preview.rangeBand}
      data-command-preview-invalid-reason={preview.attackInvalidReason}
      data-command-preview-blocked-reason={preview.blockedReason}
      data-command-preview-heat={preview.heatCost}
      data-command-preview-weapon-ids={preview.weaponIds.join(',')}
      data-command-preview-weapon-names={preview.weaponNames.join(',')}
      data-command-preview-expected-damage={preview.expectedDamage.toFixed(2)}
    >
      <div className="font-semibold">
        {preview.attackable ? 'Attack Preview' : 'Blocked Attack'}
      </div>
      <div className="text-text-theme-secondary mt-1">
        {preview.targetUnitId} -{' '}
        {preview.toHit === null ? 'TN -' : `TN${preview.toHit}`} -{' '}
        {preview.rangeBand}
      </div>
      <div className="text-text-theme-secondary">
        Heat {formatSigned(preview.heatCost)} - Exp{' '}
        {preview.expectedDamage.toFixed(1)}
      </div>
      {preview.weaponNames.length > 0 && (
        <div
          className="text-text-theme-secondary"
          data-testid="command-preview-weapons"
        >
          Weapons {preview.weaponNames.join(', ')}
        </div>
      )}
      {ammoEntries.length > 0 && (
        <div
          className="text-text-theme-secondary"
          data-testid="command-preview-ammo"
        >
          Ammo{' '}
          {ammoEntries.map(([name, count]) => `${name} x${count}`).join(', ')}
        </div>
      )}
      {!preview.attackable && preview.blockedReason && (
        <div className="text-warning mt-1" data-testid="command-preview-reason">
          {preview.blockedReason}
        </div>
      )}
    </div>
  );
}

function PhysicalAttackCommandPreview({
  preview,
}: {
  readonly preview: Extract<ICommandPreview, { kind: 'physical-attack' }>;
}): React.ReactElement {
  return (
    <div
      className="border-border-theme bg-surface-raised text-text-theme-primary min-w-48 rounded border px-3 py-2 text-xs shadow"
      data-testid="command-preview-physical"
      data-command-preview-kind="physical-attack"
      data-command-preview-target={preview.targetUnitId}
      data-command-preview-attackable={preview.attackable ? 'true' : 'false'}
      data-command-preview-to-hit={preview.toHit ?? undefined}
      data-command-preview-damage={preview.damage}
      data-command-preview-self-damage={preview.selfDamage}
      data-command-preview-requires-psr={preview.requiresPSR ? 'true' : 'false'}
      data-command-preview-restrictions={preview.restrictionReasonCodes?.join(
        ',',
      )}
    >
      <div className="font-semibold">
        {preview.attackable ? 'Physical Preview' : 'Blocked Physical'}
      </div>
      <div className="text-text-theme-secondary">
        Damage {preview.damage}
        {preview.selfDamage > 0 ? ` - Self ${preview.selfDamage}` : ''}
        {preview.attackerLegDamagePerLeg && preview.attackerLegDamagePerLeg > 0
          ? ` - Legs ${preview.attackerLegDamagePerLeg}/leg`
          : ''}
      </div>
      {(preview.requiresPSR || preview.onMiss === 'AttackerFalls') && (
        <div className="text-text-theme-secondary">
          {preview.requiresPSR ? 'PSR required' : ''}
          {preview.requiresPSR && preview.onMiss === 'AttackerFalls'
            ? ' - '
            : ''}
          {preview.onMiss === 'AttackerFalls' ? 'Fall on miss' : ''}
        </div>
      )}
      {!preview.attackable && preview.blockedReasons?.length ? (
        <div className="text-warning mt-1" data-testid="command-preview-reason">
          {preview.blockedReasons.join('; ')}
        </div>
      ) : null}
      <div className="text-text-theme-secondary mt-1">
        {attackTypeLabel(preview.attackType, preview.limb ?? undefined)} -{' '}
        {preview.toHit === null ? 'TN -' : `TN${preview.toHit}`}
      </div>
    </div>
  );
}
