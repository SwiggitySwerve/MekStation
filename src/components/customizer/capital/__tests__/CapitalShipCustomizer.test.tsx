import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { PaperSize } from '@/types/printing';
/**
 * UL-14: capital ships open read-only. Real catalog definitions open through
 * the library path, then the customizer router mounts the read-only capital
 * shell (never the mech shell), with BV labelled by its calculation scope.
 */
jest.mock('jspdf', () => ({
  jsPDF: jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  })),
}));

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';

import { getLibrarySaveDisabledReason } from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { loadUnitIntoTab } from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import { UnitTypeRouter } from '@/components/customizer/UnitTypeRouter';
import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import {
  getCapitalShipView,
  mapCapitalDefinitionToView,
  registerCapitalShipView,
} from '@/services/units/unitLoaderService/capitalShipView';
import { UnsupportedUnitConfigurationError } from '@/services/units/unitLoaderService/movementConfiguration';
import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore, type TabInfo } from '@/stores/useTabManagerStore';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

jest.mock('@/stores/UnitStoreProvider', () => ({
  UnitStoreProvider: () => <div data-testid="mech-shell" />,
}));

const IDS = [
  'achilles-2582',
  'union-2708',
  'comitatus-jumpship-2995',
  'aegis-heavy-cruiser-2372',
  'gaajian-system-patrol-boat-2485',
  'crucible-station',
  'czar-dropship',
];
const read = (relative: string) =>
  JSON.parse(fs.readFileSync(path.join('public', relative), 'utf8'));
const capitalIndex = read('data/units/capital/index.json').units.filter(
  (row: { id: string }) => IDS.includes(row.id),
);

beforeEach(async () => {
  global.fetch = jest.fn(async (input: string) => {
    const relative = decodeURIComponent(
      new URL(input, 'http://localhost').pathname,
    ).replace(/^\//, '');
    const index = /^data\/units\/([^/]+)\/index\.json$/.exec(relative)?.[1];
    const body =
      index === 'capital'
        ? { version: 'fixture', units: capitalIndex }
        : index || !fs.existsSync(path.join('public', relative))
          ? undefined
          : read(relative);
    return body === undefined
      ? { ok: false, status: 404 }
      : { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  await getEquipmentRegistry().initialize();
  resetCanonicalUnitService();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
});

async function openCapital(id: string): Promise<TabInfo> {
  const unit = (await getCanonicalUnitService().getIndex({ family: 'capital' }))
    .filter((entry) => entry.id === id)
    .pop()!;
  const showToast = jest.fn();
  await loadUnitIntoTab({
    unit,
    source: 'canonical',
    createTab: jest.fn(),
    navigateToTab: jest.fn(),
    setIsLoadDialogOpen: jest.fn(),
    setIsLoadingUnit: jest.fn(),
    showToast,
  });
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'success' }),
  );
  return useTabManagerStore.getState().tabs.at(-1)!;
}

function mount(tab: TabInfo) {
  return render(
    <UnitTypeRouter
      activeTab={tab}
      activeTabId="overview"
      onTabChange={jest.fn()}
    />,
  );
}

/** The value cell of the definition row with this exact label. */
function row(label: string): string | null {
  const term = screen
    .getAllByRole('term')
    .find((dt) => dt.textContent === label);
  return term?.nextElementSibling?.textContent ?? null;
}

const bvPanel = () =>
  screen.getByRole('heading', { name: 'Battle Value' }).parentElement!;
const bvTerms = () =>
  within(bvPanel())
    .getAllByRole('term')
    .map((dt) => dt.textContent);

/** Every focusable control must be tab navigation; nothing edits the unit. */
function expectNoEditControls(root: HTMLElement) {
  expect(
    root.querySelectorAll('input, select, textarea, [contenteditable="true"]'),
  ).toHaveLength(0);
  for (const button of Array.from(root.querySelectorAll('button'))) {
    const navigation =
      button.getAttribute('role') === 'tab' ||
      /^Section:/.test(button.getAttribute('aria-label') ?? '') ||
      /scroll-cue/.test(button.getAttribute('data-testid') ?? '');
    expect(navigation || button.disabled).toBe(true);
  }
}

it('opens a DropShip from the library into the read-only capital shell, not the mech shell', async () => {
  const tab = await openCapital('achilles-2582');
  expect(tab).toMatchObject({
    unitType: UnitType.DROPSHIP,
    name: 'Achilles (2582)',
    tonnage: 4500,
  });
  mount(tab);
  expect(screen.getByTestId('capital-ship-customizer')).toBeInTheDocument();
  expect(screen.queryByTestId('mech-shell')).not.toBeInTheDocument();
  expect(screen.getByText('Read-Only')).toBeInTheDocument();
  expect(getUnitStore(tab.id)).toBeUndefined();
  expect(getAerospaceStore(tab.id)).toBeUndefined();
  expect(Object.isFrozen(getCapitalShipView(tab.id)?.armorByArc)).toBe(true);
  expect(getLibrarySaveDisabledReason(tab)).toMatch(/not available/);
});

it.each(IDS)(
  '%s renders with no enabled edit control on either tab',
  async (id) => {
    const { container } = mount(await openCapital(id));
    expectNoEditControls(container);
    await userEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    expect(
      screen.getByText('Armor by Arc', { exact: false }),
    ).toBeInTheDocument();
    expectNoEditControls(container);
  },
);

it('shows a complete DropShip BV as the total', async () => {
  mount(await openCapital('union-2708'));
  expect(bvTerms()).toEqual(['Battle Value', 'Defensive', 'Offensive']);
  expect(row('Battle Value')).toBe('3,972');
  expect(row('Defensive')).toBe('1,632');
  expect(within(bvPanel()).queryByText(/not available/)).toBeNull();
});

it('shows a complete capital-ship BV (Space Station) as the total', async () => {
  const tab = await openCapital('crucible-station');
  mount(tab);
  expect(getCapitalShipView(tab.id)?.bv.scope).toBe('complete');
  expect(bvTerms()).toEqual(['Battle Value', 'Defensive', 'Offensive']);
  expect(row('Battle Value')).toBe('2,004');
  expect(within(bvPanel()).queryByText(/not available/)).toBeNull();
});

it('shows the newly complete Gaajian BV after admitting hull equipment', async () => {
  const tab = await openCapital('gaajian-system-patrol-boat-2485');
  mount(tab);
  expect(getCapitalShipView(tab.id)?.bv).toMatchObject({
    scope: 'complete',
    defensive: 1864,
    total: 3426,
  });
  expect(bvTerms()).toEqual(['Battle Value', 'Defensive', 'Offensive']);
  expect(row('Battle Value')).toBe('3,426');
  expect(within(bvPanel()).queryByText(/not available/)).toBeNull();
});

it('labels unsupported hull equipment defensive-only and never shows it as the total', () => {
  const definition = read(
    'data/units/capital/Gaajian System Patrol Boat (2485).json',
  );
  const view = registerCapitalShipView(
    mapCapitalDefinitionToView(
      {
        ...definition,
        equipment: [
          ...definition.equipment,
          { id: 'unsupported-hull-fixture', location: 'HULL' },
        ],
      },
      'unsupported-hull-tab',
    ),
  );
  mount({ ...view, unitType: UnitType.DROPSHIP } as unknown as TabInfo);
  expect(view.bv).toEqual({ scope: 'defensive-only', defensive: 1864 });
  expect(bvTerms()).toEqual(['Defensive BV']);
  expect(row('Defensive BV')).toBe('1,864');
  expect(
    within(bvPanel()).getByText(
      'Full battle value is not available yet. Only the defensive value is calculated for this ship.',
    ),
  ).toBeInTheDocument();
});

it('shows the newly complete Aegis capital BV as a total', async () => {
  const tab = await openCapital('aegis-heavy-cruiser-2372');
  mount(tab);
  expect(getCapitalShipView(tab.id)?.bv).toMatchObject({
    scope: 'complete',
    defensive: 12920,
    total: 104194,
  });
  expect(bvTerms()).toEqual(['Battle Value', 'Defensive', 'Offensive']);
  expect(row('Battle Value')).toBe('104,194');
  expect(within(bvPanel()).queryByText(/not available/)).toBeNull();
});

it('shows tonnage, crew, bays, SI, KF drive and sail, armor and equipment by arc', async () => {
  mount(await openCapital('aegis-heavy-cruiser-2372'));
  expect(row('Tonnage')).toBe('750,000 t');
  expect(row('Crew')).toBe('476');
  expect(row('Gunners')).toBe('120');
  expect(row('Docking Collar')).toBe('4');
  expect(row('Fighter Bay')).toBe('18 units, 4 doors');
  expect(row('Cargo Bay')).toBe('128,089.5 t, 1 door');

  await userEvent.click(screen.getByRole('tab', { name: 'Structure' }));
  expect(row('Structural Integrity')).toBe('75');
  expect(row('Drive Core')).toBe('Compact');
  expect(row('Jump Range')).toBe('30 light years');
  expect(row('Jump Sail')).toBe('Yes');
  expect(screen.getByText('Armor by Arc · Ferro Carbide')).toBeInTheDocument();
  expect(row('Nose')).toBe('91');
  expect(row('Aft Right')).toBe('101');
  const group = (arc: string) =>
    within(screen.getByRole('heading', { name: arc, level: 4 }).parentElement!)
      .getAllByRole('term')
      .map((dt) => `${dt.textContent} ${dt.nextElementSibling?.textContent}`);
  expect(group('Nose')).toEqual([
    '(B) Naval Autocannon (NAC/10) 1',
    'Naval Autocannon (NAC/10) 3',
    'Ammo NAC/10:60 1',
  ]);
  expect(group('Aft')).toContain('Naval Laser 45 3');
});

it('omits the KF drive section for a DropShip', async () => {
  mount(await openCapital('achilles-2582'));
  await userEvent.click(screen.getByRole('tab', { name: 'Structure' }));
  expect(screen.queryByText('KF Drive and Sail')).not.toBeInTheDocument();
  expect(row('Structural Integrity')).toBe('16');
});

it('asks to reopen from the library when the view is no longer loaded', () => {
  mount({
    id: 'stale-tab',
    name: 'Achilles (2582)',
    tonnage: 4500,
    techBase: 'Inner Sphere',
    unitType: UnitType.DROPSHIP,
  } as TabInfo);
  expect(
    screen.getByText(
      'This capital ship is no longer loaded. Open it again from the library.',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByTestId('mech-shell')).not.toBeInTheDocument();
});

it('says plainly when no BV can be calculated, and rejects a ship without tonnage', () => {
  const achilles = read('data/units/capital/Achilles (2582).json');
  const { structuralIntegrity: _si, ...noSI } = achilles;
  const view = registerCapitalShipView(
    mapCapitalDefinitionToView(noSI, 'no-si-tab'),
  );
  expect(view.bv.scope).toBe('unavailable');
  mount({ ...view, unitType: UnitType.DROPSHIP } as unknown as TabInfo);
  expect(
    within(bvPanel()).getByText(
      'Battle value is not available for this ship yet.',
    ),
  ).toBeInTheDocument();
  expect(within(bvPanel()).queryAllByRole('term')).toHaveLength(0);

  const { tonnage: _t, ...noTonnage } = achilles;
  expect(() => mapCapitalDefinitionToView(noTonnage, 'x')).toThrow(
    UnsupportedUnitConfigurationError,
  );
});

it('opens an invalid ship and displays its construction diagnostics without editing controls', async () => {
  const { container } = mount(await openCapital('czar-dropship'));
  expect(
    screen.getByRole('heading', { name: 'Construction diagnostics' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'Total armor,26.5 tons, is greater than the maximum: 25.0',
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      'More armor allocated than is available according to armor tonnage.',
    ),
  ).toBeInTheDocument();
  expectNoEditControls(container);
});

it('opens the capital Preview and exports the same scoped payload', async () => {
  mount(await openCapital('crucible-station'));
  const preview = screen.getByRole('tab', { name: 'Preview' });
  const service = getRecordSheetService();
  const pages = jest
    .spyOn(service, 'getSVGPages')
    .mockResolvedValue(['<svg xmlns="http://www.w3.org/2000/svg"/>']);
  const print = jest
    .spyOn(service, 'printRecordSheet')
    .mockResolvedValue(undefined);
  const pdf = jest.spyOn(service, 'exportPDF').mockResolvedValue(undefined);
  try {
    await userEvent.click(preview);
    expect(
      await screen.findByRole('img', {
        name: 'Crucible Station record sheet page 1',
      }),
    ).toBeInTheDocument();
    const data = pages.mock.calls[0][0];
    expect(data.unitType).toBe('capital');
    await userEvent.click(screen.getByRole('button', { name: /^Print$/ }));
    expect(print).toHaveBeenCalledWith(data, PaperSize.LETTER);
    await userEvent.click(
      screen.getByRole('button', { name: /^Download PDF$/ }),
    );
    expect(pdf).toHaveBeenCalledWith(data, {
      paperSize: PaperSize.LETTER,
      includePilotData: false,
    });
  } finally {
    pages.mockRestore();
    print.mockRestore();
    pdf.mockRestore();
  }
});
