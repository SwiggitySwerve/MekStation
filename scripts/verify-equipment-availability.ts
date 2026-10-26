/** Compare the real equipment filter with HEAD's pre-sync data and filter.
 * Run after sync: npx tsx scripts/verify-equipment-availability.ts --report=<path>
 * --baseline=<git-ref> defaults to HEAD; no Git state is changed.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { parseTechBase } from '@/services/equipment/EquipmentParsers';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { filterEquipment } from '@/stores/useEquipmentStore.filters';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';
import { isAvailableInYear } from '@/utils/temporal/availabilityUtils';

interface RawMetadata {
  id: string;
  name: string;
  techBase: string;
  introductionYear: number;
  extinctionYear?: number;
  reintroductionYear?: number;
}

async function main() {
  const baseline =
    process.argv.find((value) => value.startsWith('--baseline='))?.slice(11) ??
    'HEAD';
  const gitFile = (file: string) =>
    execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
  const cache = resolve('.cache/equipment-availability');
  await mkdir(cache, { recursive: true });
  const snapshot = resolve(cache, 'baseline.filters.ts');
  await writeFile(snapshot, gitFile('src/stores/useEquipmentStore.filters.ts'));
  const originalFilter: typeof filterEquipment = (
    await import(pathToFileURL(snapshot).href)
  ).filterEquipment;
  const index: { files: Record<string, Record<string, string>> } = JSON.parse(
    await readFile('public/data/equipment/official/index.json', 'utf8'),
  );
  const originals = new Map<string, RawMetadata>();
  const catalogChanges: {
    file: string;
    id: string;
    before: RawMetadata;
    after: RawMetadata;
  }[] = [];
  const availabilityFields = [
    'techBase',
    'introductionYear',
    'extinctionYear',
    'reintroductionYear',
  ] as const;
  for (const file of Object.values(index.files).flatMap(Object.values)) {
    const catalog: { items: RawMetadata[] } = JSON.parse(
      gitFile(`public/data/equipment/official/${file}`),
    );
    const generated: { items: RawMetadata[] } = JSON.parse(
      await readFile(`public/data/equipment/official/${file}`, 'utf8'),
    );
    assert.deepEqual(
      generated.items.map((item) => item.id),
      catalog.items.map((item) => item.id),
      `${file} changed IDs or item order`,
    );
    for (const [position, previous] of catalog.items.entries()) {
      const next = generated.items[position];
      assert.ok(next, `Generated data deleted ${file}:${previous.id}`);
      const unchangedFields = (item: RawMetadata) =>
        Object.fromEntries(
          Object.entries(item).filter(
            ([field]) =>
              !availabilityFields.some(
                (availabilityField) => availabilityField === field,
              ),
          ),
        );
      assert.deepEqual(
        unchangedFields(next),
        unchangedFields(previous),
        `${file}:${previous.id} changed outside availability`,
      );
      if (availabilityFields.some((field) => previous[field] !== next[field])) {
        catalogChanges.push({
          file,
          id: previous.id,
          before: previous,
          after: next,
        });
      }
    }
    for (const item of catalog.items)
      originals.set(`${item.id}:${item.name}`, item);
  }
  const lookup = getEquipmentLookupService();
  await lookup.initialize();
  assert.equal(lookup.getDataSource(), 'json');
  const current = lookup.getAllEquipment();
  const before: IEquipmentItem[] = current.map((item) => {
    const raw = originals.get(`${item.id}:${item.name}`);
    assert.ok(raw, `Missing baseline metadata for ${item.id}`);
    return {
      ...item,
      techBase: parseTechBase(raw.techBase),
      introductionYear: raw.introductionYear,
      extinctionYear: raw.extinctionYear,
      reintroductionYear: raw.reintroductionYear,
    };
  });
  const filters = {
    ...useEquipmentStore.getState().filters,
    hideUnavailable: true,
    hideAmmoWithoutWeapon: false,
    showAllCategories: true,
    hidePrototype: false,
    hideOneShot: false,
  };
  const context = {
    unitYear: 3028,
    unitTechBase: TechBase.INNER_SPHERE,
    unitWeaponIds: [],
  };
  const sort = { column: 'name', direction: 'asc' } as const;
  const old = originalFilter(before, filters, context, sort);
  const metadataOnly = originalFilter(current, filters, context, sort);
  const now = filterEquipment(current, filters, context, sort);
  const identity = (item: IEquipmentItem) => `${item.category}:${item.id}`;
  const nowIds = new Set(now.map(identity));
  const metadataIds = new Set(metadataOnly.map(identity));
  const oldIds = new Set(old.map(identity));
  const metadata = (item: IEquipmentItem) => ({
    id: item.id,
    name: item.name,
    techBase: item.techBase,
    introductionYear: item.introductionYear,
    extinctionYear: item.extinctionYear,
    reintroductionYear: item.reintroductionYear,
  });
  const newlyHidden = old
    .filter((item) => !nowIds.has(identity(item)))
    .map((item) => ({
      before: metadata(item),
      after: metadata(
        current.find((candidate) => identity(candidate) === identity(item))!,
      ),
      reason: metadataIds.has(identity(item))
        ? 'no available compatible catalog weapon'
        : 'source availability correction',
    }));
  const spotChecks = [
    'beagle-active-probe',
    'active-probe-beagle',
    'active-probe',
    'er-small-laser',
    'er-medium-laser',
    'er-large-laser',
    'gauss-rifle',
    'uac-5',
    'artemisiv',
    'case',
    'double-heat-sink',
    'er-ppc',
  ].map((id) => {
    const loaded = getEquipmentLoader().getById(id);
    assert.ok(loaded, `Missing spot-check row ${id}`);
    assert.equal(
      loaded.techBase === TechBase.INNER_SPHERE &&
        isAvailableInYear(loaded, 3028),
      false,
      `${id} must be unavailable to IS in 3028`,
    );
    return {
      id,
      techBase: loaded.techBase,
      introductionYear: loaded.introductionYear,
      extinctionYear: loaded.extinctionYear,
      reintroductionYear: loaded.reintroductionYear,
      wasShown: old.some((item) => item.id === id),
      shown: now.some((item) => item.id === id),
      excludedByExistingCatalogProjection: !current.some(
        (item) => item.id === id,
      ),
    };
  });
  for (const year of [2755, 3028]) {
    const ids = new Set(
      filterEquipment(
        current,
        filters,
        { ...context, unitYear: year },
        sort,
      ).map((item) => item.id),
    );
    for (const id of [
      'ppc',
      'medium-laser',
      'ac-10',
      'ac-10-ammo',
      'lrm-5',
      'lrm-20',
      'srm-2',
      'srm-4',
      'srm-6',
      'lrm-ammo',
      'srm-ammo',
      'mg-ammo',
    ])
      assert.ok(ids.has(id), `${id} missing in ${year}`);
    assert.equal(ids.has('er-ppc'), year === 2755);
    assert.equal(ids.has('ammo-ac-15'), false);
  }
  const sink = getEquipmentLoader().getMiscEquipmentById('double-heat-sink');
  assert.ok(sink);
  assert.equal(
    filterEquipment(
      [{ ...sink, category: EquipmentCategory.MISC_EQUIPMENT }],
      filters,
      context,
      sort,
    ).length,
    0,
  );
  const report = {
    baseline,
    year: 3028,
    techBase: TechBase.INNER_SPHERE,
    oldShown: old.length,
    currentShown: now.length,
    catalogUpdated: catalogChanges.length,
    techBaseCorrected: catalogChanges.filter(
      (item) => item.before.techBase !== item.after.techBase,
    ).length,
    catalogChanges,
    newlyHiddenCount: newlyHidden.length,
    newlyHidden,
    newlyShown: now.filter((item) => !oldIds.has(identity(item))).map(metadata),
    spotChecks,
  };
  const output = process.argv
    .find((value) => value.startsWith('--report='))
    ?.slice(9);
  if (output) await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        catalogUpdated: report.catalogUpdated,
        techBaseCorrected: report.techBaseCorrected,
        oldShown: old.length,
        currentShown: now.length,
        newlyHidden: newlyHidden.length,
        spotChecks,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
