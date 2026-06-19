import React from 'react';

import type {
  EquipmentEntry,
  UnitCardExpandedProps,
} from './UnitCardExpanded.types';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];
type WeaponEntry = UnitCardExpandedProps['weapons'][number];

interface UnitCardHeaderProps {
  readonly name: string;
  readonly techBadgeVariant: BadgeVariant;
  readonly techLabel: string;
  readonly year: number;
  readonly rulesLevelName: string;
  readonly weightClassName: string;
  readonly tonnage: number;
  readonly battleValue: number;
}

export function UnitCardHeader({
  name,
  techBadgeVariant,
  techLabel,
  year,
  rulesLevelName,
  weightClassName,
  tonnage,
  battleValue,
}: UnitCardHeaderProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle mb-6 border-b pb-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h2 className="text-text-theme-primary text-2xl font-bold tracking-tight">
          {name}
        </h2>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Badge variant={techBadgeVariant} size="md">
            {techLabel}
          </Badge>
          <Badge variant="slate" size="md">
            {year}
          </Badge>
          <Badge variant="muted" size="md">
            {rulesLevelName}
          </Badge>
        </div>
      </div>

      <div className="text-text-theme-secondary flex items-center gap-3 text-sm">
        <span className="text-text-theme-primary font-semibold">
          {weightClassName}
        </span>
        <span className="text-border-theme-subtle">-</span>
        <span className="font-mono">{tonnage} tons</span>
        <span className="text-border-theme-subtle">-</span>
        <span className="text-accent font-mono font-semibold">
          BV: {battleValue.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

export function UnitOverview({
  overview,
}: {
  readonly overview: string | undefined;
}): React.ReactElement | null {
  if (!overview) return null;

  return (
    <div className="mb-6">
      <p className="text-text-theme-secondary border-l-2 border-amber-500/30 pl-4 text-sm leading-relaxed italic">
        {overview}
      </p>
    </div>
  );
}

export function WeaponTable({
  weapons,
}: {
  readonly weapons: readonly WeaponEntry[];
}): React.ReactElement | null {
  if (weapons.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        <span className="h-4 w-1 rounded-full bg-rose-500" />
        Weapons
      </h3>
      <div className="bg-surface-base/30 border-border-theme-subtle/50 overflow-hidden rounded-lg border">
        <div className="bg-surface-base/50 border-border-theme-subtle/30 text-text-theme-muted grid grid-cols-12 gap-2 border-b px-4 py-3 text-xs font-medium tracking-wider uppercase">
          <div className="col-span-5">Weapon</div>
          <div className="col-span-2 text-center">Damage</div>
          <div className="col-span-3 text-center">Range (S/M/L)</div>
          <div className="col-span-2 text-center">Heat</div>
        </div>

        <div className="divide-border-theme-subtle/20 divide-y">
          {weapons.map((weapon, index) => (
            <WeaponRow key={`${weapon.name}-${index}`} weapon={weapon} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeaponRow({
  weapon,
}: {
  readonly weapon: WeaponEntry;
}): React.ReactElement {
  return (
    <div className="hover:bg-surface-base/30 grid grid-cols-12 gap-2 px-4 py-3 text-sm transition-colors">
      <div className="text-text-theme-primary col-span-5 flex items-center gap-2">
        {weapon.count > 1 && (
          <Badge variant="muted" size="sm">
            {weapon.count}x
          </Badge>
        )}
        <span className="truncate">{weapon.name}</span>
      </div>
      <div className="col-span-2 text-center font-mono font-semibold text-amber-400">
        {weapon.damage}
      </div>
      <div className="text-text-theme-secondary col-span-3 text-center font-mono">
        {weapon.rangeShort}/{weapon.rangeMedium}/{weapon.rangeLong}
      </div>
      <div className="col-span-2 text-center font-mono text-rose-400">
        {weapon.heat}
      </div>
    </div>
  );
}

export function QuirksSection({
  quirks,
}: {
  readonly quirks: readonly string[];
}): React.ReactElement | null {
  if (quirks.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        <span className="h-4 w-1 rounded-full bg-violet-500" />
        Quirks
      </h3>
      <div className="flex flex-wrap gap-2">
        {quirks.map((quirk, index) => (
          <Badge key={index} variant="violet" size="md">
            {quirk}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function NotesSection({
  notes,
}: {
  readonly notes: string | undefined;
}): React.ReactElement | null {
  if (!notes) return null;

  return (
    <div className="mb-6">
      <h3 className="text-text-theme-primary mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider uppercase">
        <span className="h-4 w-1 rounded-full bg-amber-500" />
        Notes
      </h3>
      <div className="bg-surface-base/30 border-border-theme-subtle/50 rounded-lg border p-4">
        <p className="text-text-theme-secondary text-sm leading-relaxed whitespace-pre-wrap">
          {notes}
        </p>
      </div>
    </div>
  );
}

export function UnitCardActions({
  onEdit,
  onExport,
  onShare,
  onDuplicate,
  onDelete,
}: Pick<
  UnitCardExpandedProps,
  'onEdit' | 'onExport' | 'onShare' | 'onDuplicate' | 'onDelete'
>): React.ReactElement | null {
  if (!hasUnitCardActions({ onEdit, onExport, onShare, onDuplicate, onDelete }))
    return null;

  return (
    <div className="border-border-theme-subtle flex items-center gap-2 border-t pt-6">
      {onExport && (
        <Button variant="secondary" size="sm" onClick={onExport}>
          Export
        </Button>
      )}
      {onShare && (
        <Button variant="secondary" size="sm" onClick={onShare}>
          Share
        </Button>
      )}
      {onEdit && (
        <Button variant="primary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      )}
      {onDuplicate && (
        <Button variant="ghost" size="sm" onClick={onDuplicate}>
          Duplicate
        </Button>
      )}
      <div className="flex-1" />
      {onDelete && (
        <Button variant="danger" size="sm" onClick={onDelete}>
          Delete
        </Button>
      )}
    </div>
  );
}

export function groupEquipmentByCategory(
  equipment: readonly EquipmentEntry[],
): Record<string, EquipmentEntry[]> {
  return equipment.reduce<Record<string, EquipmentEntry[]>>((acc, item) => {
    const category = item.category || 'Other';
    acc[category] ??= [];
    acc[category].push(item);
    return acc;
  }, {});
}

function hasUnitCardActions({
  onEdit,
  onExport,
  onShare,
  onDuplicate,
  onDelete,
}: Pick<
  UnitCardExpandedProps,
  'onEdit' | 'onExport' | 'onShare' | 'onDuplicate' | 'onDelete'
>): boolean {
  return Boolean(onEdit || onExport || onShare || onDuplicate || onDelete);
}
