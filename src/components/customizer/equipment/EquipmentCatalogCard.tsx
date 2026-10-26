import React, { useId, useMemo } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { IEquipmentItem } from '@/types/equipment';
import { getEquipmentAccentClasses } from '@/utils/colors/equipmentColors';
import { getWeaponById } from '@/utils/equipment/weapons/utilities';

import workbenchStyles from '../CustomizerWorkbench.module.css';

interface EquipmentCatalogCardProps {
  equipment: IEquipmentItem;
  expanded: boolean;
  readOnly: boolean;
  onInspect: () => void;
  onAdd: () => void;
  onAddAndPlace?: () => void;
}

export function EquipmentCatalogCard({
  equipment,
  expanded,
  readOnly,
  onInspect,
  onAdd,
  onAddAndPlace,
}: EquipmentCatalogCardProps): React.ReactElement {
  const detailId = useId();
  const weapon = useMemo(() => getWeaponById(equipment.id), [equipment.id]);
  const variable = Boolean(equipment.variableEquipmentId);
  const accent = getEquipmentAccentClasses(equipment.category, equipment.name);
  return (
    <li
      className={`group text-text-theme-primary relative isolate rounded-md border border-l-4 border-solid transition-colors ${accent} ${expanded ? 'border-accent/60' : 'border-border-theme-subtle'}`}
      data-testid="equipment-catalog-row"
    >
      <span
        aria-hidden="true"
        className={`bg-surface-raised pointer-events-none absolute inset-0 -z-10 rounded-[inherit] ${expanded ? 'opacity-40' : 'opacity-30 group-hover:opacity-40'}`}
        data-testid="equipment-catalog-row-fill"
      />
      <div
        className={`${workbenchStyles.catalogColumns} flex items-center gap-3 lg:grid`}
      >
        <button
          type="button"
          data-catalog-column="name"
          onClick={onInspect}
          aria-label={`Details for ${equipment.name}`}
          aria-expanded={expanded}
          aria-controls={detailId}
          className="focus-visible:ring-accent min-h-11 min-w-0 flex-1 rounded text-left focus-visible:ring-2 lg:w-full lg:flex-none lg:!px-0"
        >
          <span className="flex items-center gap-1">
            <span
              className="block min-w-0 flex-1 truncate text-sm font-semibold text-inherit"
              title={equipment.name}
            >
              {equipment.name}
            </span>
            <AppIcon
              name="chevron-down"
              size="inline"
              aria-hidden="true"
              className={`text-text-theme-muted shrink-0 transition-transform lg:hidden ${expanded ? 'rotate-180' : ''}`}
            />
          </span>
          <span className="text-text-theme-secondary mt-0.5 block truncate text-xs tabular-nums lg:hidden">
            {equipment.category} ·{' '}
            {variable
              ? 'Variable weight / slots'
              : `${equipment.weight} t · ${equipment.criticalSlots} ${equipment.criticalSlots === 1 ? 'slot' : 'slots'}`}
          </span>
        </button>
        <span
          data-catalog-column="category"
          className="text-text-theme-secondary hidden min-w-0 truncate text-xs lg:block"
          title={equipment.category}
        >
          {equipment.category}
        </span>
        <span
          data-catalog-column="weight"
          className="hidden text-sm text-inherit tabular-nums lg:block"
        >
          {variable ? 'Variable' : equipment.weight}
        </span>
        <span
          data-catalog-column="criticalSlots"
          className="hidden text-sm text-inherit tabular-nums lg:block"
        >
          {variable ? 'Variable' : equipment.criticalSlots}
        </span>
        <span
          data-catalog-column="heat"
          className={`hidden text-sm tabular-nums lg:block ${weapon?.heat ? 'text-inherit' : 'text-text-theme-muted'}`}
        >
          {weapon?.heat ?? '—'}
        </span>
        <div
          data-catalog-column="actions"
          className="flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <Button
            size="sm"
            variant="ghost"
            disabled={readOnly}
            onClick={onAdd}
            title={`Add ${equipment.name}`}
            aria-label={`Add ${equipment.name}`}
            className={`!h-11 !min-h-11 !w-11 !min-w-11 !p-0 ${workbenchStyles.catalogAddHit}`}
          >
            <span className={workbenchStyles.catalogAddGlyph}>
              <AppIcon name="add" size="inline" aria-hidden="true" />
            </span>
          </Button>
        </div>
      </div>
      {expanded && (
        <div id={detailId} className="border-border-theme-subtle border-t p-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Detail label="Tech base" value={equipment.techBase} />
            <Detail label="Introduced" value={equipment.introductionYear} />
            <Detail label="Rules" value={equipment.rulesLevel} />
            <Detail
              label="Cost"
              value={equipment.costCBills?.toLocaleString()}
              suffix=" C-bills"
            />
            <Detail label="Battle value" value={equipment.battleValue} />
            {weapon && (
              <>
                <Detail label="Damage" value={weapon.damage} />
                <Detail label="Heat" value={weapon.heat} />
              </>
            )}
            {weapon?.ranges && (
              <Detail
                label="Range (S / M / L)"
                value={`${weapon.ranges.short} / ${weapon.ranges.medium} / ${weapon.ranges.long}`}
              />
            )}
            {weapon?.ranges?.minimum ? (
              <Detail label="Minimum range" value={weapon.ranges.minimum} />
            ) : null}
          </dl>
          {variable && (
            <p className="text-text-theme-secondary mt-3 text-xs">
              Weight and slots are calculated for this unit when added. Check
              the loadout for the resulting values.
            </p>
          )}
          {onAddAndPlace && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={readOnly}
                onClick={onAddAndPlace}
                title={`Add and place ${equipment.name}`}
                aria-label={`Add and place ${equipment.name}`}
              >
                Add + place
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Detail({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: string | number | undefined;
  suffix?: string;
}): React.ReactElement {
  return (
    <div>
      <dt className="text-text-theme-secondary text-xs">{label}</dt>
      <dd className="mt-1 font-medium text-inherit">
        {value === undefined ? '—' : `${value}${suffix}`}
      </dd>
    </div>
  );
}
