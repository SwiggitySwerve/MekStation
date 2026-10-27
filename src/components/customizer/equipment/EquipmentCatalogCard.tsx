import React, { useId, useMemo } from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { IEquipmentItem } from '@/types/equipment';
import { getEquipmentAccentClasses } from '@/utils/colors/equipmentColors';
import { getWeaponById } from '@/utils/equipment/weapons/utilities';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { BUILD_STATUS_KIND_TEXT_CLASS } from '../shared/BuildStatusLabel';
import {
  describeCatalogWeightExcess,
  getCatalogWeightExcess,
  isVariableSizeEquipment,
} from './EquipmentBrowser.model';
import { CatalogAddAction } from './EquipmentCatalogCardActions';

/** Warning hue plus a dotted underline, so the cue is not colour alone. */
const WEIGHT_OVER_CLASS = `${BUILD_STATUS_KIND_TEXT_CLASS.warning} underline decoration-dotted underline-offset-4`;

interface EquipmentCatalogCardProps {
  equipment: IEquipmentItem;
  expanded: boolean;
  readOnly: boolean;
  onInspect: () => void;
  onAdd: () => void;
  onAddAndPlace?: () => void;
  mountedCount?: number;
  remainingWeight?: number;
}

export function EquipmentCatalogCard({
  equipment,
  expanded,
  readOnly,
  onInspect,
  onAdd,
  onAddAndPlace,
  mountedCount = 0,
  remainingWeight,
}: EquipmentCatalogCardProps): React.ReactElement {
  const detailId = useId();
  const weapon = useMemo(() => getWeaponById(equipment.id), [equipment.id]);
  const shotsPerTon = getEquipmentLoader().getAmmunitionById(
    equipment.id,
  )?.shotsPerTon;
  const range = weapon?.ranges
    ? `${weapon.ranges.short} / ${weapon.ranges.medium} / ${weapon.ranges.long}`
    : '—';
  const mobileRange = range.replaceAll(' ', '');
  const minimumRange = weapon?.ranges?.minimum || '—';
  // Damage belongs to weapons; ammunition shows its capacity as its own field.
  const damage = weapon?.damage ?? '—';
  // The browser's unified item drops the data's "Variable weight/slots"
  // notes, so read them from the loaded electronics/misc record.
  const loader = getEquipmentLoader();
  const variable = isVariableSizeEquipment({
    variableEquipmentId: equipment.variableEquipmentId,
    special:
      equipment.special ??
      loader.getElectronicsById(equipment.id)?.special ??
      loader.getMiscEquipmentById(equipment.id)?.special,
  });
  const weightExcess = getCatalogWeightExcess(equipment, remainingWeight);
  const weightNote =
    weightExcess === null
      ? undefined
      : describeCatalogWeightExcess(weightExcess);
  // Phone stats: only the fields that apply to this kind of item. Ammunition
  // is one line (capacity, weight, slots); a weapon adds a damage/range line
  // above heat; other equipment shows weight and slots alone.
  const sizeFields: StatField[] = [
    {
      text: variable ? 'Variable weight' : `${equipment.weight} t`,
      className: weightNote ? WEIGHT_OVER_CLASS : undefined,
      title: weightNote,
      note: weightNote,
    },
    plainField(
      variable
        ? 'Variable slots'
        : `${equipment.criticalSlots} ${equipment.criticalSlots === 1 ? 'slot' : 'slots'}`,
    ),
  ];
  const statLines: StatField[][] =
    shotsPerTon !== undefined
      ? [[plainField(`Shots ${shotsPerTon}`), ...sizeFields]]
      : weapon
        ? [
            [
              plainField(`Damage ${damage}`),
              ...(weapon.ranges ? [plainField(`Range ${mobileRange}`)] : []),
              ...(weapon.ranges?.minimum
                ? [plainField(`Min ${weapon.ranges.minimum}`)]
                : []),
            ],
            [
              ...(weapon.heat === undefined
                ? []
                : [plainField(`Heat ${weapon.heat}`)]),
              ...sizeFields,
            ],
          ]
        : [sizeFields];
  const accent = getEquipmentAccentClasses(equipment.category, equipment.name);
  return (
    <li
      className={`group text-text-theme-primary border-border-theme-subtle/40 relative isolate border-b border-l-4 border-solid transition-colors ${workbenchStyles.catalogRow} ${accent}`}
      data-testid="equipment-catalog-row"
    >
      <span
        aria-hidden="true"
        className={`bg-surface-raised pointer-events-none absolute inset-0 -z-10 ${expanded ? 'opacity-40' : 'opacity-10 group-hover:opacity-30'}`}
        data-testid="equipment-catalog-row-fill"
      />
      <div className={workbenchStyles.catalogColumns}>
        <button
          type="button"
          data-catalog-column="name"
          onClick={onInspect}
          aria-label={`Details for ${equipment.name}`}
          aria-expanded={expanded}
          aria-controls={detailId}
          className={`focus-visible:ring-accent min-h-11 min-w-0 flex-1 rounded text-left focus-visible:ring-2 ${workbenchStyles.catalogInspect}`}
        >
          <AppIcon
            name="chevron-right"
            size="inline"
            aria-hidden="true"
            className={`text-text-theme-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="min-w-0 flex-1">
            <span className={workbenchStyles.catalogNameLine}>
              <span
                className="min-w-0 truncate text-base font-semibold text-inherit lg:text-sm"
                title={equipment.name}
              >
                {equipment.name}
              </span>
              {mountedCount > 0 && (
                <span className={workbenchStyles.catalogMounted}>
                  ×{mountedCount} mounted
                </span>
              )}
            </span>
            <span
              data-catalog-column="category"
              className={`hidden lg:block ${workbenchStyles.catalogMeta}`}
            >
              {equipment.category}
              {shotsPerTon !== undefined && ` · ${shotsPerTon} shots/t`}
            </span>
          </span>
          <span
            className={workbenchStyles.catalogMobileStats}
            data-testid="equipment-catalog-stats"
          >
            {statLines.map((fields) => (
              <StatLine key={fields[0].text} fields={fields} />
            ))}
          </span>
        </button>
        <span
          data-catalog-column="damage"
          className="hidden text-sm whitespace-nowrap tabular-nums lg:block"
        >
          {damage}
        </span>
        <span
          data-catalog-column="range"
          className="hidden text-sm whitespace-nowrap tabular-nums lg:block"
        >
          {range}
        </span>
        <span
          data-catalog-column="minimumRange"
          className="hidden text-sm tabular-nums lg:block"
        >
          {minimumRange}
        </span>
        <span
          data-catalog-column="heat"
          className="hidden text-sm tabular-nums lg:block"
        >
          {weapon?.heat ?? '—'}
        </span>
        <span
          data-catalog-column="weight"
          className={`hidden text-sm tabular-nums lg:block ${weightNote ? WEIGHT_OVER_CLASS : 'text-inherit'}`}
          title={weightNote}
        >
          {variable ? <VariableValue kind="weight" /> : equipment.weight}
          {weightNote && <span className="sr-only">, {weightNote}</span>}
        </span>
        <span
          data-catalog-column="criticalSlots"
          className="hidden text-sm text-inherit tabular-nums lg:block"
        >
          {variable ? <VariableValue kind="slots" /> : equipment.criticalSlots}
        </span>
        <CatalogAddAction
          name={equipment.name}
          readOnly={readOnly}
          onAdd={onAdd}
          onAddAndPlace={onAddAndPlace}
        />
      </div>
      {expanded && (
        <div
          id={detailId}
          className={`border-border-theme-subtle border-t ${workbenchStyles.catalogDetails}`}
        >
          <dl className={workbenchStyles.catalogDetailGrid}>
            <Detail label="Tech base" value={equipment.techBase} />
            <Detail label="Introduced" value={equipment.introductionYear} />
            <Detail label="Rules" value={equipment.rulesLevel} />
            <Detail
              label="Cost"
              value={equipment.costCBills?.toLocaleString()}
              suffix=" C-bills"
            />
            <Detail label="Battle value" value={equipment.battleValue} />
          </dl>
          {variable && (
            <p className="text-text-theme-secondary col-span-full text-xs">
              {equipment.variableEquipmentId
                ? 'Weight and slots are calculated for this unit when added. Check the loadout for the resulting values.'
                : 'Weight and slots depend on the size chosen for this unit; the catalog has no fixed values for this item.'}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Variable size stays inside the numeric column: a short muted "Var." that
 * right-aligns with the figures, with the full words for assistive tech and
 * the tooltip.
 */
function VariableValue({
  kind,
}: {
  kind: 'weight' | 'slots';
}): React.ReactElement {
  const full = `Variable ${kind}`;
  return (
    <span className="text-text-theme-muted" title={full}>
      <span aria-hidden="true">Var.</span>
      <span className="sr-only">{full}</span>
    </span>
  );
}

interface StatField {
  text: string;
  className?: string;
  title?: string;
  /** Screen-reader note appended to the field. */
  note?: string;
}

const plainField = (text: string): StatField => ({ text });

/**
 * One phone stat line: unbreakable fields joined by a dot, so a narrow row
 * wraps between fields and never inside one.
 */
function StatLine({
  fields,
}: {
  fields: readonly StatField[];
}): React.ReactElement {
  return (
    <span>
      {fields.map((field, index) => (
        <React.Fragment key={field.text}>
          {index > 0 && ' '}
          <span
            className={`${workbenchStyles.catalogStatField} ${field.className ?? ''}`}
            title={field.title}
          >
            {field.text}
            {field.note && <span className="sr-only">, {field.note}</span>}
          </span>
          {index < fields.length - 1 && ' ·'}
        </React.Fragment>
      ))}
    </span>
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
      <dt className="text-text-theme-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-inherit">
        {value === undefined ? '—' : `${value}${suffix}`}
      </dd>
    </div>
  );
}
