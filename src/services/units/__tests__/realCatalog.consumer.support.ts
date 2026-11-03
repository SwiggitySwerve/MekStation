/** Replays UL-13/UL-14/SMALL-open through real library loaders and registries.
 * #2532 allowlist: after-inventory.json rows with dataset=committed, resolved=null,
 * grouped by family (protomeks -> protomechs), sorted by ID. Review additions.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { UnitFamily } from '@/types/unit/UnitIndex';

import { loadUnitIntoTab } from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import {
  clearAllAerospaceStores,
  getAerospaceStore,
} from '@/stores/aerospaceStoreRegistry';
import {
  clearAllBattleArmorStores,
  getBattleArmorStore,
} from '@/stores/battleArmorStoreRegistry';
import {
  clearAllInfantryStores,
  getInfantryStore,
} from '@/stores/infantryStoreRegistry';
import {
  clearAllProtoMechStores,
  getProtoMechStore,
} from '@/stores/protoMechStoreRegistry';
import { clearAllStores, getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import {
  clearAllVehicleStores,
  getVehicleStore,
} from '@/stores/vehicleStoreRegistry';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';

import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '../CanonicalUnitService';
import { getCapitalShipView } from '../unitLoaderService/capitalShipView';
import unresolvedAllowlist from './fixtures/realCatalog.unresolved.json';

jest.mock('../CustomUnitApiService', () => ({
  customUnitApiService: { list: async () => [], getById: jest.fn() },
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join('public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

// #2512, mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985.
// Java classes aggregate below. Nine vehicle-folder FixedWingSupport sources
// count in aerospace. All five Mek classes map to BattleMech.
const SOURCE_TYPES: Record<UnitFamily, Record<string, number>> = {
  battlemechs: { BattleMech: 4263 },
  vehicles: { Vehicle: 1074 + 12, 'Support Vehicle': 178 + 25 + 24, VTOL: 131 },
  aerospace: {
    Aerospace: 502,
    'Conventional Fighter': 46 + 33,
    'Small Craft': 39,
  },
  capital: { DropShip: 209, JumpShip: 29, WarShip: 123, 'Space Station': 33 },
  battlearmor: { BattleArmor: 1188 },
  infantry: { Infantry: 1820 },
  protomechs: { ProtoMech: 86 },
};
// Owner ruling 2026-11-02: regenerate every pinned Mek, removing stale designs.
const EXPECTED_TYPES = SOURCE_TYPES;
const STORE_READERS = {
  battlemechs: getUnitStore,
  vehicles: getVehicleStore,
  aerospace: getAerospaceStore,
  battlearmor: getBattleArmorStore,
  infantry: getInfantryStore,
  protomechs: getProtoMechStore,
};
type Mount = { id?: string; equipmentId?: string; name?: string };
type CatalogUnit = {
  unitType: string;
  equipment?: Mount[];
  primaryWeapon?: Mount;
  secondaryWeapon?: Mount;
};
type Index = {
  totalUnits: number;
  units: { id: string; path: string; unitType?: string }[];
};
const read = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const originalFetch = global.fetch;

function clearSessions() {
  clearAllStores();
  clearAllVehicleStores();
  clearAllAerospaceStores();
  clearAllBattleArmorStores();
  clearAllInfantryStores();
  clearAllProtoMechStores();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  localStorage.clear();
}

beforeAll(() => {
  // Serve committed files with real URL decoding (including #).
  global.fetch = jest.fn(async (input: string) => {
    const relative = decodeURIComponent(
      new URL(input, 'http://localhost').pathname,
    ).replace(/^\//, '');
    const file = path.join('public', relative);
    return fs.existsSync(file)
      ? { ok: true, status: 200, json: async () => read<unknown>(file) }
      : { ok: false, status: 404 };
  }) as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = originalFetch;
  resetCanonicalUnitService();
  clearSessions();
});

export function testCatalog(
  families: readonly UnitFamily[],
  part = 0,
  parts = 1,
) {
  describe.each(families)(
    `%s real catalog (${part + 1}/${parts})`,
    (family) => {
      it('opens every indexed definition into its store or frozen capital view and reconciles counts and unresolved IDs', async () => {
        resetCanonicalUnitService();
        const started = performance.now();
        const directory = path.join('public/data/units', family);
        const index = read<Index>(path.join(directory, 'index.json'));
        const expected = EXPECTED_TYPES[family];
        const total = Object.values(expected).reduce(
          (sum, count) => sum + count,
          0,
        );
        expect(index.totalUnits).toBe(total);
        expect(index.units).toHaveLength(total);
        expect(new Set(index.units.map(({ id }) => id)).size).toBe(total);
        const service = getCanonicalUnitService();
        const entries = await service.getIndex({ family, strict: true });
        expect(entries.map(({ id }) => id).sort()).toEqual(
          index.units.map(({ id }) => id).sort(),
        );
        const indexTypes: Record<string, number> = {};
        const definitionTypes: Record<string, number> = {};
        const unresolved = new Set<string>();
        const failures: string[] = [];
        let opened = 0;
        for (const row of index.units) {
          const unit = read<CatalogUnit>(path.join(directory, row.path));
          const type = row.unitType ?? 'BattleMech';
          indexTypes[type] = (indexTypes[type] ?? 0) + 1;
          definitionTypes[unit.unitType] =
            (definitionTypes[unit.unitType] ?? 0) + 1;
          // Same #2532 inventory surface, including infantry primary/secondary kits.
          for (const mount of [
            ...(unit.equipment ?? []),
            unit.primaryWeapon,
            unit.secondaryWeapon,
          ]) {
            const id = mount?.id ?? mount?.equipmentId ?? mount?.name;
            if (id?.trim() && !getEquipmentEntry(id)) unresolved.add(id);
          }
        }
        const inventoryMs = Math.round(performance.now() - started);
        const selected = entries.filter((_, index) => index % parts === part);
        for (const unit of selected) {
          clearSessions();
          const toasts: { message: string; variant: string }[] = [];
          const navigateToTab = jest.fn();
          try {
            await loadUnitIntoTab({
              unit,
              source: 'canonical',
              createTab: jest.fn(),
              navigateToTab,
              setIsLoadDialogOpen: jest.fn(),
              setIsLoadingUnit: jest.fn(),
              showToast: (toast) => {
                toasts.push(toast);
              },
            });
            const [tab] = useTabManagerStore.getState().tabs;
            expect(tab).toBeDefined();
            expect(navigateToTab).toHaveBeenCalledWith(tab.id);
            expect(toasts[0]?.variant).toBe('success');
            if (family === 'capital') {
              const view = getCapitalShipView(tab.id);
              expect(view?.sourceId).toBe(unit.id);
              expect(view?.unitType).toBe(unit.unitType);
              expect(Object.isFrozen(view)).toBe(true);
              for (const getStore of Object.values(STORE_READERS))
                expect(getStore(tab.id)).toBeUndefined();
            } else {
              const state = STORE_READERS[family](tab.id)?.getState();
              expect(state).toBeDefined();
              expect(state?.id).toBe(tab.id);
              expect(state?.chassis).toBe(unit.chassis);
              if (family !== 'battlemechs') {
                expect(state?.unitType).toBe(unit.unitType);
                expect(tab.unitType).toBe(unit.unitType);
              }
            }
            opened++;
          } catch (error) {
            failures.push(
              `${family}/${unit.id}: ${toasts.map(({ message }) => message).join('; ')} ${String(error)}`,
            );
          }
        }
        clearSessions();
        const allowed: readonly string[] = unresolvedAllowlist[family];
        const unexpected = [...unresolved]
          .filter((id) => !allowed.includes(id))
          .sort();
        const resolved = allowed.filter((id) => !unresolved.has(id)).sort();
        const report = {
          family,
          total,
          selected: selected.length,
          part,
          parts,
          inventoryMs,
          opened,
          indexTypes,
          definitionTypes,
          unresolved: [...unresolved].sort(),
          unexpected,
          resolved,
          failures,
          elapsedMs: Math.round(performance.now() - started),
        };
        if (process.env.CATALOG_REPORT_DIR)
          fs.writeFileSync(
            path.join(
              process.env.CATALOG_REPORT_DIR,
              `${family}-${part + 1}-of-${parts}.json`,
            ),
            JSON.stringify(report, null, 2),
          );
        expect(failures).toEqual([]);
        expect(opened).toBe(selected.length);
        expect(indexTypes).toEqual(expected);
        expect(definitionTypes).toEqual(expected);
        expect({
          unexpected,
          'resolved IDs: shrink realCatalog.unresolved.json': resolved,
        }).toEqual({
          unexpected: [],
          'resolved IDs: shrink realCatalog.unresolved.json': [],
        });
      }, 300_000);
    },
  );
}
