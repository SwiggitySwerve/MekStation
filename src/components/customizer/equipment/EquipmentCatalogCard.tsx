import React, {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { IEquipmentItem } from '@/types/equipment';
import { getEquipmentAccentClasses } from '@/utils/colors/equipmentColors';
import { getWeaponById } from '@/utils/equipment/weapons/utilities';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { getCatalogWeightExcess } from './EquipmentBrowser.model';

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
  const variable = Boolean(equipment.variableEquipmentId);
  const weightExcess = getCatalogWeightExcess(equipment, remainingWeight);
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
              className="text-text-theme-secondary hidden truncate text-xs lg:block"
            >
              {equipment.category}
              {weightExcess !== null && (
                <span className={workbenchStyles.catalogOver}>
                  +{weightExcess.toFixed(1)} t over
                </span>
              )}
            </span>
          </span>
        </button>
        <span
          data-catalog-column="damage"
          className="hidden text-sm whitespace-nowrap tabular-nums lg:block"
          title={shotsPerTon === undefined ? undefined : 'Shots per ton'}
        >
          {weapon?.damage ??
            (shotsPerTon === undefined ? '—' : `${shotsPerTon} shots`)}
        </span>
        <span
          data-catalog-column="range"
          className="hidden text-sm whitespace-nowrap tabular-nums lg:block"
        >
          {range}
        </span>
        <span
          data-catalog-column="heat"
          className="hidden text-sm tabular-nums lg:block"
        >
          {weapon?.heat ?? '—'}
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
        <CatalogAddAction
          name={equipment.name}
          readOnly={readOnly}
          onAdd={onAdd}
          onAddAndPlace={onAddAndPlace}
        />
        <div
          className={workbenchStyles.catalogMobileStats}
          data-testid="equipment-catalog-stats"
        >
          {weightExcess !== null && (
            <span className={workbenchStyles.catalogOver}>
              +{weightExcess.toFixed(1)} t over
            </span>
          )}
          {weapon ? (
            <>
              <span>Dmg {weapon.damage}</span>
              <span>Range {range.replaceAll(' ', '')}</span>
              <span>Heat {weapon.heat}</span>
            </>
          ) : shotsPerTon !== undefined ? (
            <span title="Shots per ton">{shotsPerTon} shots</span>
          ) : null}
          {variable ? (
            <span>Variable weight / slots</span>
          ) : (
            <>
              <span>{equipment.weight} t</span>
              <span>
                {equipment.criticalSlots}{' '}
                {equipment.criticalSlots === 1 ? 'slot' : 'slots'}
              </span>
            </>
          )}
        </div>
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
            <Detail label="Minimum range" value={weapon?.ranges?.minimum} />
          </dl>
          {variable && (
            <p className="text-text-theme-secondary col-span-full text-xs">
              Weight and slots are calculated for this unit when added. Check
              the loadout for the resulting values.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function CatalogAddAction({
  name,
  readOnly,
  onAdd,
  onAddAndPlace,
}: {
  name: string;
  readOnly: boolean;
  onAdd: () => void;
  onAddAndPlace?: () => void;
}): React.ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const available = open && !readOnly && Boolean(onAddAndPlace);
  useLayoutEffect(() => {
    if (!available) return;
    const panel = menu.current;
    const button = trigger.current;
    if (!panel || !button) return;
    // Portal keeps the last row's menu outside the catalog scroll clip.
    const anchor = button.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(anchor.right - box.width, window.innerWidth - box.width - 8))}px`;
    panel.style.top = `${Math.max(8, anchor.bottom + box.height + 8 <= window.innerHeight ? anchor.bottom + 4 : anchor.top - box.height - 4)}px`;
    panel
      .querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
    const outside = (event: PointerEvent): void => {
      if (
        !root.current?.contains(event.target as Node) &&
        !panel.contains(event.target as Node)
      )
        setOpen(false);
    };
    const dismiss = (): void => {
      if (panel.contains(document.activeElement))
        button.focus({ preventScroll: true });
      setOpen(false);
    };
    const dismissIfMoved = (): void => {
      // A queued scroll from revealing the trigger must not close a menu
      // positioned after that scroll. Only dismiss when its anchor moves.
      const current = button.getBoundingClientRect();
      if (current.top !== anchor.top || current.left !== anchor.left) dismiss();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismissIfMoved, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismissIfMoved, true);
    };
  }, [available]);
  const run = (action: () => void): void => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    action();
  };
  return (
    <div
      ref={root}
      data-catalog-column="actions"
      className={workbenchStyles.catalogActions}
    >
      <Button
        size="sm"
        variant="ghost"
        disabled={readOnly}
        onClick={onAdd}
        title="Add to unassigned"
        aria-label={`Add ${name}`}
        aria-description="Add to unassigned in the Loadout"
        className={workbenchStyles.catalogAddHit}
      >
        <AppIcon name="add" size="inline" aria-hidden="true" />
        <span>Add</span>
      </Button>
      {onAddAndPlace && (
        <Button
          size="sm"
          variant="ghost"
          disabled={readOnly}
          aria-label={`Add options for ${name}`}
          title="More ways to add"
          aria-haspopup="menu"
          aria-expanded={available}
          aria-controls={available ? id : undefined}
          className={workbenchStyles.catalogAddOptions}
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setOpen(!open);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              trigger.current = event.currentTarget;
              setOpen(true);
            }
          }}
        >
          <AppIcon name="more" size="inline" aria-hidden="true" />
        </Button>
      )}
      {available &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="menu"
            aria-label={`Add options for ${name}`}
            className={workbenchStyles.catalogAddMenu}
            onBlur={(event) => {
              if (
                event.relatedTarget !== trigger.current &&
                !event.currentTarget.contains(event.relatedTarget)
              )
                setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Tab') {
                if (event.key === 'Escape') event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                trigger.current?.focus({ preventScroll: true });
              } else if (
                ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
              ) {
                event.preventDefault();
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    '[role="menuitem"]',
                  ),
                );
                const current = items.indexOf(
                  document.activeElement as HTMLElement,
                );
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : (current +
                          (event.key === 'ArrowDown' ? 1 : -1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }
            }}
          >
            <Button
              variant="ghost"
              role="menuitem"
              tabIndex={-1}
              onClick={() => run(onAdd)}
            >
              Add to unassigned
            </Button>
            <Button
              variant="ghost"
              role="menuitem"
              tabIndex={-1}
              aria-label={`Add and place ${name}`}
              onClick={() => onAddAndPlace && run(onAddAndPlace)}
            >
              Add and choose location…
            </Button>
          </div>,
          document.body,
        )}
    </div>
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
