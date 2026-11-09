import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '@/services/equipment/EquipmentLookupService';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  getEquipmentEntry,
  getAmmunitionEntry,
} from '@/utils/construction/equipmentBV';
import { isProtoMechCatalogEquipment } from '@/utils/construction/protomech/equipmentLegality';
import {
  createAmmoWeaponMatcher,
  isWeaponCategory,
} from '@/utils/equipment/ammunitionCompatibility';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

interface CatalogUnit {
  unitType: string;
  equipment?: { id: string; name?: string; isAmmo?: boolean }[];
}
const key = (item: IEquipmentItem) =>
  `${item.category === EquipmentCategory.AMMUNITION}:${item.id}`;
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : entry.name.endsWith('.json') && entry.name !== 'index.json'
        ? [join(dir, entry.name)]
        : [],
  );
}
const manifest: { entries: { id: string; source: unknown[] }[] } = JSON.parse(
  readFileSync(
    'scripts/equipment-catalog/allowed-unit-types-source.json',
    'utf8',
  ),
);
const cited = new Set(
  manifest.entries
    .filter((entry) => entry.source.length > 0)
    .map((entry) => entry.id),
);

beforeAll(async () => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
  await getEquipmentLookupService().initialize();
  const store = useEquipmentStore.getState();
  store.clearFilters();
  store.toggleHideUnavailable();
  store.setUnitContext(null, null, []);
});

it.each(['battlemechs', 'vehicles', 'aerospace', 'battlearmor', 'protomechs'])(
  'accounts for every previously offered canonical %s mount removed by family pins',
  (family) => {
    const service = getEquipmentLookupService();
    const legacy = service.getAllEquipment();
    const cache = new Map<string, ReturnType<typeof getEquipmentEntry>>();
    const offered = new Map<UnitType, Set<string>>();
    const legacyKeys = new Set(
      useEquipmentStore.getState().getFilteredEquipment(legacy).map(key),
    );
    const failures: { file: string; name: string; reason: string }[] = [];
    let units = 0;
    for (const file of files(`public/data/units/${family}`)) {
      const unit: CatalogUnit = JSON.parse(
        readFileSync(file, 'utf8').replace(/^\uFEFF/, ''),
      );
      const type = Object.values(UnitType).find(
        (candidate) =>
          candidate.replace(/\W/g, '').toLowerCase() ===
          unit.unitType.replace(/\W/g, '').toLowerCase(),
      );
      if (!type) throw new Error(`Unknown unit type: ${file}`);
      if (!offered.has(type)) {
        const candidates = service
          .getBrowserEquipment(type)
          .filter(
            (item) =>
              type !== UnitType.PROTOMECH || isProtoMechCatalogEquipment(item),
          );
        offered.set(
          type,
          new Set(
            useEquipmentStore
              .getState()
              .getFilteredEquipment(candidates)
              .map(key),
          ),
        );
      }
      units++;
      for (const mount of unit.equipment ?? []) {
        const name = mount.name ?? mount.id;
        const ammo =
          mount.isAmmo === true || /ammo/i.test(`${name} ${mount.id}`);
        const cacheKey = `${ammo}:${name}`;
        if (!cache.has(cacheKey))
          cache.set(
            cacheKey,
            (ammo ? getAmmunitionEntry : getEquipmentEntry)(name),
          );
        const entry = cache.get(cacheKey);
        if (!entry) continue; // Existing identity gaps are reported by the census, not repaired here.
        const itemKey = `${ammo}:${entry.id}`;
        if (!legacyKeys.has(itemKey) || offered.get(type)?.has(itemKey))
          continue;
        const old = legacy.find((item) => key(item) === itemKey);
        if (
          !old ||
          (type === UnitType.PROTOMECH && !isProtoMechCatalogEquipment(old))
        )
          continue;
        const excludes = (item: IEquipmentItem) =>
          item.allowedUnitTypes !== undefined &&
          !item.allowedUnitTypes.includes(type);
        const hasCitation = (item: IEquipmentItem) =>
          cited.has(item.id) ||
          item.special?.some((value) =>
            value.includes('/megamek/blob/48fcb2f64'),
          ) === true;
        if (excludes(old) && hasCitation(old)) continue;
        // A bin may previously have matched a wrongly admitted other-family weapon.
        const rejected = ammo
          ? legacy.filter(
              (weapon) =>
                isWeaponCategory(weapon.category) &&
                excludes(weapon) &&
                createAmmoWeaponMatcher([weapon.id], legacy)(old),
            )
          : [];
        if (rejected.length > 0 && rejected.every(hasCitation)) continue;
        failures.push({
          file,
          name,
          reason: 'Newly unreachable without a pinned exclusion citation',
        });
      }
    }
    expect(units).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  },
  120_000,
);
