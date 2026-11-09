/**
 * Capital ship read-only viewer (UL-14). DropShips, JumpShips, WarShips and
 * Space Stations open in the aerospace-style tab shell with the existing
 * Overview and Structure tabs. Nothing is editable: there are no inputs, and
 * the frozen view comes from the library open (see capitalShipView.ts).
 */
import React, { createContext, useContext } from 'react';

import type { CustomizerShellProps } from '@/components/customizer/shared/customizerTypeRegistry';
import type {
  TabPanelBaseProps,
  TabSpec,
} from '@/components/customizer/shared/TabSpec';

import { ErrorBoundary } from '@/components/common';
import { CUSTOMIZER_TAB_ICONS } from '@/components/customizer/tabs/CustomizerTabIcons';
import { CustomizerTabs } from '@/components/customizer/tabs/CustomizerTabs';
import { StatusItem } from '@/components/customizer/tabs/StatusItem';
import { useCustomizerTabShell } from '@/components/customizer/tabs/useCustomizerTabShell';
import {
  getCapitalShipView,
  type ICapitalShipRow,
  type ICapitalShipView,
} from '@/services/units/unitLoaderService/capitalShipView';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { PaperSize } from '@/types/printing';

import { CustomizerCatalogBoundary } from '../shared/CustomizerCatalogBoundary';
import { CapitalPreviewTab } from './CapitalPreviewTab';

const CapitalShipViewContext = createContext<ICapitalShipView | null>(null);

const fmt = (value: number): string =>
  Math.round(value).toLocaleString('en-US');

/** Arc colour chips: front cyan, sides amber, broadsides violet, aft rose. */
const ARC_TINTS: Record<string, string> = {
  Nose: 'bg-cyan-500',
  'Front Left': 'bg-cyan-400',
  'Front Right': 'bg-cyan-400',
  'Left Side': 'bg-amber-500',
  'Right Side': 'bg-amber-500',
  'Left Broadside': 'bg-violet-500',
  'Right Broadside': 'bg-violet-500',
  'Aft Left': 'bg-rose-400',
  'Aft Right': 'bg-rose-400',
  Aft: 'bg-rose-500',
};

function ArcChip({ arc }: { arc: string }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${ARC_TINTS[arc] ?? 'bg-slate-400'}`}
    />
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="bg-surface-base border-border-theme-subtle rounded-lg border p-4">
      <h3 className="text-text-theme-primary mb-3 text-sm font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Rows({
  rows,
  arcs = false,
}: {
  rows: readonly ICapitalShipRow[];
  arcs?: boolean;
}): React.ReactElement {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
      {rows.map((row) => (
        <React.Fragment key={`${row.label}:${row.detail ?? ''}`}>
          <dt className="text-text-theme-secondary flex min-w-0 items-center gap-2">
            {arcs && <ArcChip arc={row.label} />}
            <span className="truncate">
              {row.label}
              {row.count > 1 && !arcs && row.detail !== undefined
                ? ` ×${row.count}`
                : ''}
            </span>
          </dt>
          <dd className="text-text-theme-primary text-right tabular-nums">
            {row.detail ?? fmt(row.count)}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** BV with its scope: a defensive subtotal is never labelled the total. */
export function CapitalBattleValue(): React.ReactElement | null {
  const view = useContext(CapitalShipViewContext);
  if (!view) return null;
  const { bv } = view;
  return (
    <Section title="Battle Value">
      {bv.scope === 'complete' ? (
        <Rows
          rows={[
            { label: 'Battle Value', count: bv.total },
            { label: 'Defensive', count: bv.defensive },
            { label: 'Offensive', count: bv.offensive },
          ]}
        />
      ) : bv.scope === 'defensive-only' ? (
        <>
          <Rows rows={[{ label: 'Defensive BV', count: bv.defensive }]} />
          <p className="text-warning mt-2 text-sm">
            Full battle value is not available yet. Only the defensive value is
            calculated for this ship.
          </p>
        </>
      ) : (
        <p className="text-warning text-sm">
          Battle value is not available for this ship yet.
        </p>
      )}
    </Section>
  );
}

function MissingView(): React.ReactElement {
  return (
    <p className="text-text-theme-secondary p-8 text-center text-sm">
      This capital ship is no longer loaded. Open it again from the library.
    </p>
  );
}

export function CapitalOverviewPanel({
  className = '',
}: TabPanelBaseProps): React.ReactElement {
  const view = useContext(CapitalShipViewContext);
  if (!view) return <MissingView />;
  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className}`}>
      <Section title="Overview">
        <Rows
          rows={[
            { label: 'Unit Type', count: 1, detail: view.unitType },
            { label: 'Tonnage', count: 1, detail: `${fmt(view.tonnage)} t` },
            { label: 'Tech Base', count: 1, detail: view.techBase },
            ...(view.year === undefined
              ? []
              : [{ label: 'Year', count: 1, detail: String(view.year) }]),
          ]}
        />
      </Section>
      <CapitalBattleValue />
      {!!view.constructionErrors?.length && (
        <Section title="Construction diagnostics">
          <ul className="text-text-theme-secondary min-w-0 list-inside list-disc text-sm break-words">
            {view.constructionErrors.map((error, index) => (
              <li key={`${index}:${error}`}>{error}</li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Crew">
        <Rows rows={view.crew} />
      </Section>
      <Section title="Bays and Transport">
        {view.transport.length ? (
          <Rows rows={view.transport} />
        ) : (
          <p className="text-text-theme-secondary text-sm">
            This ship has no bays or transport space.
          </p>
        )}
      </Section>
    </div>
  );
}

export function CapitalArmorPanel(): React.ReactElement | null {
  const view = useContext(CapitalShipViewContext);
  if (!view) return null;
  return (
    <Section title={`Armor by Arc · ${view.armorType}`}>
      <Rows rows={view.armorByArc} arcs />
    </Section>
  );
}

export function CapitalStructurePanel({
  className = '',
}: TabPanelBaseProps): React.ReactElement {
  const view = useContext(CapitalShipViewContext);
  if (!view) return <MissingView />;
  const hull: ICapitalShipRow[] = [
    { label: 'Tonnage', count: 1, detail: `${fmt(view.tonnage)} t` },
    ...(view.structuralIntegrity === undefined
      ? []
      : [{ label: 'Structural Integrity', count: view.structuralIntegrity }]),
    ...(view.safeThrust === undefined
      ? []
      : [
          {
            label: 'Thrust',
            count: 1,
            detail: `${view.safeThrust} / ${view.maxThrust ?? '–'}`,
          },
        ]),
    ...(view.heatSinks
      ? [{ label: 'Heat Sinks', count: 1, detail: view.heatSinks }]
      : []),
    ...(view.fuel === undefined ? [] : [{ label: 'Fuel', count: view.fuel }]),
  ];
  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${className}`}>
      <Section title="Hull">
        <Rows rows={hull} />
      </Section>
      {view.kf && (
        <Section title="KF Drive and Sail">
          <Rows rows={view.kf} />
        </Section>
      )}
      <CapitalArmorPanel />
      <Section title="Equipment by Arc">
        <div className="flex flex-col gap-3">
          {view.equipmentByArc.map((group) => (
            <div key={group.arc}>
              <h4 className="text-text-theme-primary mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <ArcChip arc={group.arc} />
                {group.arc}
              </h4>
              <Rows rows={group.items} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/** Context-backed preview also supports the registry's active-tab entry point. */
export function CapitalRecordSheetPreview({
  paperSize,
  className,
}: {
  paperSize?: PaperSize;
  className?: string;
}): React.ReactElement {
  const tabId = useTabManagerStore((state) => state.activeTabId);
  const view =
    useContext(CapitalShipViewContext) ??
    (tabId ? getCapitalShipView(tabId) : undefined);
  return (
    <CapitalPreviewTab
      view={view ?? null}
      paperSize={paperSize}
      className={className}
    />
  );
}

export const CAPITAL_SHIP_TABS: TabSpec[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: CUSTOMIZER_TAB_ICONS.overview,
    component: CapitalOverviewPanel,
  },
  {
    id: 'structure',
    label: 'Structure',
    icon: CUSTOMIZER_TAB_ICONS.structure,
    component: CapitalStructurePanel,
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: CUSTOMIZER_TAB_ICONS.preview,
    component: CapitalRecordSheetPreview,
  },
];

function CapitalStatusBar({ view }: { view: ICapitalShipView }) {
  const armor = view.armorByArc.reduce((sum, row) => sum + row.count, 0);
  const { bv } = view;
  return (
    <div className="bg-surface-base border-border-theme-subtle flex flex-wrap items-center justify-between border-b">
      <StatusItem
        label="Tonnage"
        value={fmt(view.tonnage)}
        subValue={view.unitType}
      />
      <StatusItem label="SI" value={view.structuralIntegrity ?? '–'} />
      <StatusItem label="Armor" value={fmt(armor)} subValue="points" />
      {bv.scope === 'complete' ? (
        <StatusItem label="Battle Value" value={fmt(bv.total)} />
      ) : (
        <StatusItem
          label={
            bv.scope === 'defensive-only' ? 'Defensive BV' : 'Battle Value'
          }
          value={bv.scope === 'defensive-only' ? fmt(bv.defensive) : '–'}
          subValue="full BV not available"
          status="warning"
        />
      )}
      <span className="text-text-theme-secondary px-3 py-1 text-xs">
        <span className="border-border-theme mr-2 rounded border px-1.5 py-0.5 font-semibold">
          Read-Only
        </span>
        Capital ships cannot be edited yet.
      </span>
    </div>
  );
}

function CapitalShipCustomizer(): React.ReactElement {
  const view = useContext(CapitalShipViewContext);
  const { tabBarProps, activeTab, TabComponent } = useCustomizerTabShell({
    specs: CAPITAL_SHIP_TABS,
    state: {},
    initialTab: 'overview',
  });
  return (
    <div
      className="flex h-full flex-1 flex-col"
      data-testid="capital-ship-customizer"
    >
      {view && <CapitalStatusBar view={view} />}
      {/* Tab navigation stays live; only the panels are read-only. */}
      <CustomizerTabs {...tabBarProps} />
      <div
        className="min-h-0 flex-1 overflow-auto p-4"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={activeTab}
      >
        {TabComponent && <TabComponent readOnly />}
      </div>
    </div>
  );
}

/** Descriptor shell: looks up the frozen view for this tab; creates no store. */
export function CapitalShipShell({
  activeTab,
}: CustomizerShellProps): React.ReactElement {
  return (
    <ErrorBoundary componentName="CapitalShipViewer">
      <CapitalShipViewContext.Provider
        value={getCapitalShipView(activeTab.id) ?? null}
      >
        <CustomizerCatalogBoundary
          family={activeTab.unitType}
          tabs={CAPITAL_SHIP_TABS}
          readOnly
          diagram={
            <div data-testid="capital-loading-locations">
              <CapitalArmorPanel />
            </div>
          }
        >
          <CapitalShipCustomizer />
        </CustomizerCatalogBoundary>
      </CapitalShipViewContext.Provider>
    </ErrorBoundary>
  );
}
