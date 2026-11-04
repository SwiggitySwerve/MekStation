import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const option = (flag) => process.argv[process.argv.indexOf(flag) + 1];
// These five Java identities are the coordinator-approved exceptions. All other
// previously resolved inputs, including consumer fallback results, are frozen.
export const APPROVED_JAVA_REROUTES = [
  {
    name: 'IS LB 2-X AC Ammo',
    oldTarget: 'lb-2-x-ammo',
    newTarget: 'is-lb-2-x-ac-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB2XAmmo, BV 5; CAT-Q1 HANDBACK shared Clan records note; main #2600 native identity is retained as the before target',
  },
  {
    name: 'IS LB 5-X AC Ammo',
    oldTarget: 'lb-5-x-ammo',
    newTarget: 'is-lb-5-x-ac-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB5XAmmo, BV 10; CAT-Q1 HANDBACK shared Clan records note',
  },
  {
    name: 'IS LB 2-X Cluster Ammo',
    oldTarget: 'clan-lb-2-x-cluster',
    newTarget: 'is-lb-2-x-cluster-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB2XClusterAmmo, BV 5; CAT-Q1 HANDBACK shared Clan records note',
  },
  {
    name: 'IS LB 5-X Cluster Ammo',
    oldTarget: 'clan-lb-5-x-cluster',
    newTarget: 'is-lb-5-x-cluster-ammo-registry',
    reason:
      'L-EQ3/java-registry.json at pinned 48fcb2f6; AmmoType.createISLB5XClusterAmmo, BV 10; CAT-Q1 HANDBACK shared Clan records note',
  },
  {
    name: 'Sniper',
    oldTarget: 'sniper-cannon',
    newTarget: 'issniper-registry',
    reason:
      'L-EQ3/java-registry.json[ISSniper] at pinned 48fcb2f6; weapons/artillery/Sniper.java, BV 85; CAT-Q1 HANDBACK Helepolis/Orion note',
  },
];
async function capture(root, inputs) {
  process.chdir(root);
  const require = createRequire(resolve(root, 'package.json'));
  require('tsx/cjs');
  globalThis.fetch = async (input) => {
    const file = resolve(
      root,
      'public',
      '.' + new URL(String(input), 'http://local').pathname,
    );
    return { ok: true, status: 200, json: async () => read(file) };
  };
  const bv = require(resolve(root, 'src/utils/construction/equipmentBV'));
  const catalogsLoader = require(
    resolve(root, 'src/utils/construction/equipmentBV/catalogLoader'),
  );
  const { TechBase } = require(resolve(root, 'src/types/enums/TechBase'));
  const catalogs = require(
    resolve(root, 'src/utils/construction/equipmentBVCatalogData'),
  );
  const { getEquipmentRegistry } = require(
    resolve(root, 'src/services/equipment/EquipmentRegistry'),
  );
  const { getEquipmentLoader } = require(
    resolve(root, 'src/services/equipment/EquipmentLoaderService'),
  );
  const { EquipmentNameMapper } = require(
    resolve(root, 'src/services/equipment/EquipmentNameMapper'),
  );
  const { EquipmentNameResolver } = require(
    resolve(root, 'src/services/conversion/EquipmentNameResolver'),
  );
  const conversion = new EquipmentNameResolver();
  const aliases = require(resolve(root, 'src/services/equipment/aliases'));
  const patterns = require(
    resolve(root, 'src/utils/construction/equipmentBV/normalizationPatterns'),
  );
  const { getWeaponData } = require(
    resolve(root, 'src/engine/adapters/CompendiumAdapter.weaponData'),
  );
  const hydration = require(
    resolve(root, 'src/simulation/runner/UnitHydrationCatalogLookup'),
  );
  const { catalogWeaponStatsForEquipmentEntry } = require(
    resolve(root, 'src/simulation/runner/UnitHydrationArtemis'),
  );
  const printing = require(
    resolve(root, 'src/services/printing/recordsheet/equipmentUtils'),
  );
  const { getEquipmentLookupService } = require(
    resolve(root, 'src/services/equipment/EquipmentLookupService'),
  );
  const { restoreCriticalSlotEquipment } = require(
    resolve(root, 'src/services/units/unitLoaderService/criticalSlotEquipment'),
  );
  const { resolveEquipmentId } = require(
    resolve(root, 'src/services/units/unitLoaderService/equipmentResolution'),
  );
  const registry = getEquipmentRegistry();
  assert.equal(await registry.initialize(), 'ready');
  await getEquipmentLookupService().initialize();
  const loader = getEquipmentLoader(),
    mapper = new EquipmentNameMapper();
  // Probe the corpus names, every baseline name and (below) catalog names.
  const probes = resolve(here, 'resolution-inputs.json');
  const names = new Set([
    ...(inputs.names ?? []),
    ...Object.keys(inputs.resolved ?? {}),
    ...(existsSync(probes) ? read(probes).names : []),
  ]);
  for (const name of Object.keys(conversion.getMappings())) names.add(name);
  const generatedAliases = new Map();
  const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [kind, items] of [
    ['weapon', loader.getAllWeapons()],
    ['ammo', loader.getAllAmmunition()],
    ['electronics', loader.getAllElectronics()],
    ['misc', loader.getAllMiscEquipment()],
  ])
    for (const item of items) {
      names.add(item.id);
      names.add(item.name);
      names.add(normalize(item.name));
      if (kind === 'weapon')
        aliases.addCommonWeaponAliases(
          item.id,
          item.name,
          item,
          generatedAliases,
          normalize,
        );
      if (kind === 'ammo')
        aliases.addAmmunitionAliases(item, generatedAliases, normalize);
      if (kind === 'misc')
        aliases.addMiscEquipmentAliases(item, generatedAliases);
    }
  aliases.addStaticAliasMappings(generatedAliases);
  for (const name of [
    ...generatedAliases.keys(),
    ...Object.keys(catalogs.NAME_MAPPINGS_DATA),
    ...Object.keys(patterns.DIRECT_ALIAS_MAP),
    ...Object.keys(patterns.ABBREVIATION_MAP),
  ])
    names.add(name);
  const weapons = hydration.buildWeaponLookupFromCatalogFiles(
    catalogs.WEAPON_CATALOG_FILES,
  );
  const ammo = hydration.buildAmmoLookupFromCatalogFiles(
    catalogs.AMMUNITION_CATALOG_FILES,
  );
  const apis = {
    unitLoaderIS: (name) =>
      resolveEquipmentId(name, TechBase.INNER_SPHERE, 'inner_sphere', undefined)
        .equipmentDef?.id,
    unitLoaderClan: (name) =>
      resolveEquipmentId(name, TechBase.CLAN, 'clan', undefined).equipmentDef
        ?.id,
    unitLoaderMixed: (name) =>
      resolveEquipmentId(name, TechBase.INNER_SPHERE, 'mixed', [name])
        .equipmentDef?.id,
    unitLoaderAmmoIS: (name) =>
      restoreCriticalSlotEquipment(
        [],
        [],
        TechBase.INNER_SPHERE,
        'inner_sphere',
        { RIGHT_TORSO: [name] },
      )[0]?.equipmentId,
    unitLoaderAmmoClan: (name) =>
      restoreCriticalSlotEquipment([], [], TechBase.CLAN, 'clan', {
        RIGHT_TORSO: [name],
      })[0]?.equipmentId,
    normalizer: (name) => {
      const id = bv.normalizeEquipmentId(name);
      return catalogsLoader.loadCatalogForEquipmentId(name).has(id) ? id : null;
    },
    equipment: (name) => bv.getEquipmentEntry(name)?.id,
    ammunition: (name) => bv.getAmmunitionEntry(name)?.id,
    physicalAmmo: (name) => bv.getAmmunitionWeightEntry(name)?.id,
    registry: (name) => registry.lookup(name).equipment?.id,
    mapper: (name) => mapper.mapName(name).equipmentId,
    mapperIS: (name) => mapper.mapName(name, TechBase.INNER_SPHERE).equipmentId,
    mapperClan: (name) => mapper.mapName(name, TechBase.CLAN).equipmentId,
    conversion: (name) => conversion.resolve(name, name).equipmentId,
    conversionIS: (name) =>
      conversion.resolve(name, name, TechBase.INNER_SPHERE).equipmentId,
    conversionClan: (name) =>
      conversion.resolve(name, name, TechBase.CLAN).equipmentId,
    compendium: (name) => getWeaponData(name)?.id,
    hydrationWeapon: (name) => weapons(name)?.id,
    hydrationAmmo: (name) => ammo(name)?.id,
    hydrationEquipment: (name) =>
      catalogWeaponStatsForEquipmentEntry({ id: name }, weapons)?.id,
    printingWeapon: (name) =>
      printing.lookupWeapon(loader.getAllWeapons(), name)?.id,
    printingWeaponExact: (name) =>
      printing.lookupWeapon(loader.getAllWeapons(), name, undefined, false)?.id,
    printingWeaponId: (name) =>
      printing.lookupWeapon(loader.getAllWeapons(), name, name)?.id,
    printingAmmo: (name) =>
      printing.lookupAmmoShots(
        loader
          .getAllAmmunition()
          .map((item) => ({ ...item, shotsPerTon: item.id })),
        name,
        name,
      ),
    printingAmmoShots: (name) =>
      printing.lookupAmmoShots(loader.getAllAmmunition(), name, name),
  };
  const ordered = [...names]
    .filter((name) => typeof name === 'string' && name.trim())
    .sort();
  // Lookups run API by API as before; the snapshot keeps only resolved
  // entries, keyed by name, as { target: [indexes into apis] }. Object keys
  // are strings, so a non-string target (printingAmmoShots' shot counts) is
  // stored as `#<json>`; a 15 -> "15" type change then shows as a shift.
  const results = Object.values(apis).map((lookup) =>
    ordered.map((name) => lookup(name) ?? null),
  );
  const targetKey = (target) =>
    typeof target === 'string' ? target : `#${JSON.stringify(target)}`;
  const resolved = {};
  ordered.forEach((name, i) => {
    const row = {};
    results.forEach((rows, k) => {
      if (rows[i] !== null) (row[targetKey(rows[i])] ??= []).push(k);
    });
    if (Object.keys(row).length) resolved[name] = row;
  });
  const generated = ['weapons', 'ammunition', 'miscellaneous'].flatMap(
    (kind) => {
      const file = resolve(
        root,
        `public/data/equipment/official/${kind}/java-registry.json`,
      );
      return existsSync(file)
        ? read(file).items.map((item) => ({ kind, id: item.id }))
        : [];
    },
  );
  const generatedIds = new Set(generated.map((item) => item.id));
  const provenanceFile = resolve(
    root,
    'scripts/equipment-catalog/provenance.json',
  );
  const identities = new Map(
    existsSync(provenanceFile)
      ? read(provenanceFile).identities.map((row) => [row.id, row.internalName])
      : [],
  );
  const directFailures = [],
    fallbackLeaks = [];
  for (const { kind, id } of generated) {
    const ownApis = [
      'normalizer',
      'equipment',
      'registry',
      'mapper',
      'conversion',
      ...(kind === 'weapons'
        ? [
            'compendium',
            'hydrationWeapon',
            'hydrationEquipment',
            'printingWeaponId',
          ]
        : kind === 'ammunition'
          ? ['ammunition', 'hydrationAmmo', 'printingAmmo']
          : []),
    ];
    for (const api of ownApis) {
      const target = apis[api](id);
      if (target !== id) directFailures.push({ api, id, target });
    }
    const native = identities.get(id) ?? id;
    if (
      kind === 'weapons' &&
      apis.printingWeapon(native) === id &&
      apis.printingWeaponExact(native) !== id
    )
      directFailures.push({
        api: 'printingWeaponExact',
        id,
        name: native,
        target: apis.printingWeaponExact(native),
      });
    for (const name of [
      `1-${id}`,
      `clan-${id}`,
      `similar ${id}`,
      `clan-${native}`,
      `CL${native}`,
    ]) {
      for (const [api, lookup] of Object.entries(apis)) {
        const target = lookup(name);
        if (
          generatedIds.has(target) &&
          catalogs.resolveRegistryId?.(name) !== target
        )
          fallbackLeaks.push({ api, name, target });
      }
      for (const target of registry.lookup(name).alternateIds ?? [])
        if (generatedIds.has(target))
          fallbackLeaks.push({ api: 'findSimilar', name, target });
    }
  }
  // Synthetic registry responses exercise boundaries that real catalog names
  // alone cannot cover, including the Missing Special Ammo regression.
  const service = getEquipmentLookupService();
  const originals = [service.getById, service.getAllEquipment, registry.lookup];
  const categoryFailures = [];
  try {
    for (const [name, candidate] of [
      ['Missing Special Ammo', originals[0].call(service, 'medium-laser')],
      [
        'Missing Special Weapon',
        service
          .getAllEquipment()
          .find((item) => item.category === 'Ammunition'),
      ],
      ...generated.map(({ id }) => [
        'Missing Special Weapon',
        originals[0].call(service, id),
      ]),
    ]) {
      assert(candidate, `Missing category probe candidate: ${name}`);
      service.getById = (id) =>
        name.endsWith('Ammo') || id === candidate.id ? candidate : undefined;
      service.getAllEquipment = () => [candidate];
      registry.lookup = () => ({ found: true, equipment: candidate });
      for (const api of ['unitLoaderIS', 'unitLoaderClan', 'unitLoaderMixed']) {
        const target = apis[api](name);
        if (target)
          categoryFailures.push({ api, name, candidate: candidate.id, target });
      }
    }
  } finally {
    [service.getById, service.getAllEquipment, registry.lookup] = originals;
  }
  return {
    baseline: inputs.baseline,
    provenance: inputs.provenance,
    apis: Object.keys(apis),
    resolved,
    directFailures,
    fallbackLeaks,
    categoryFailures,
  };
}

if (process.argv.includes('--capture')) {
  const output = resolve(option('--output'));
  const snapshot = await capture(
    resolve(option('--root')),
    read(option('--inputs')),
  );
  writeFileSync(output, JSON.stringify(snapshot) + '\n');
} else {
  test('every previously resolved catalog/native input retains its API identity', async (t) => {
    const beforeFile =
      process.env.CATALOG_RESOLUTION_BEFORE ??
      resolve(here, 'resolution-before.json');
    const before = read(beforeFile);
    // #2607 strips the pod (OMNIPOD) and rear markers from a critical-slot token
    // before lookup, as Java MtfFile.java:1010-1020 does, so a pod-mounted form
    // follows its bare name's approved reroute.
    const require = createRequire(resolve(process.cwd(), 'package.json'));
    require('tsx/cjs');
    const { parseCriticalSlotToken } = require(
      resolve(
        process.cwd(),
        'src/services/units/unitLoaderService/equipmentResolution',
      ),
    );
    const bareName = (name) => parseCriticalSlotToken(name).lookupToken;
    const file =
      process.env.CATALOG_RESOLUTION_AFTER ??
      resolve(tmpdir(), `catalog-resolution-${process.pid}.json`);
    if (!process.env.CATALOG_RESOLUTION_AFTER)
      t.after(() => {
        for (const path of [file, file.slice(0, -5) + '-shifts.json'])
          if (existsSync(path)) unlinkSync(path);
      });
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        '--capture',
        '--root',
        process.cwd(),
        '--inputs',
        beforeFile,
        '--output',
        file,
      ],
      { encoding: 'utf8', maxBuffer: 20e6, windowsHide: true },
    );
    assert.equal(result.status, 0, result.stderr);
    const after = read(file);
    // Target of (api, name) in a compact snapshot, or undefined if unresolved.
    const targetOf = (snapshot, api, name) =>
      Object.entries(snapshot.resolved[name] ?? {}).find(([, used]) =>
        used.includes(snapshot.apis.indexOf(api)),
      )?.[0];
    assert.deepEqual(
      after.directFailures,
      [],
      'Every generated id resolves exactly',
    );
    assert.deepEqual(
      after.fallbackLeaks,
      [],
      'Generated entries never join fallback candidates',
    );
    assert.deepEqual(
      after.categoryFailures,
      [],
      'Registry recovery preserves category and generated-entry boundaries',
    );
    const shifts = [],
      allowed = [],
      gains = {};
    const check = (api, name, oldTarget, newTarget) => {
      // Weapon-only APIs can retain a gun sharing an old ammo id. The canonical
      // equipment/ammo assertions below require the five exact new ammo/artillery targets.
      if (newTarget === oldTarget) return;
      const route = APPROVED_JAVA_REROUTES.find(
        (route) =>
          route.name.toLowerCase() === bareName(name).toLowerCase() &&
          route.oldTarget === oldTarget,
      );
      const row = { api, name, oldTarget, newTarget };
      if (route && newTarget === route.newTarget) allowed.push(row);
      else shifts.push(row);
    };
    for (const [name, row] of Object.entries(before.resolved))
      for (const [oldTarget, used] of Object.entries(row))
        for (const k of used) {
          const api = before.apis[k];
          check(api, name, oldTarget, targetOf(after, api, name) ?? null);
        }
    for (const [name, row] of Object.entries(after.resolved))
      for (const [newTarget, used] of Object.entries(row))
        for (const k of used) {
          const api = after.apis[k];
          if (targetOf(before, api, name) !== undefined) continue;
          // #2607 strips pod/rear markers in critical-slot lookup, so a newly
          // resolved pod-qualified slot is checked against its bare name's old
          // target (#2613), not counted as a gain.
          const bare = api.startsWith('unitLoaderAmmo')
            ? targetOf(before, api, bareName(name))
            : undefined;
          if (bare !== undefined) check(api, name, bare, newTarget);
          else gains[api] = (gains[api] ?? 0) + 1;
        }
    writeFileSync(
      file.replace(/\.json$/, '-shifts.json'),
      JSON.stringify({ shifts, allowed, gains }, null, 2) + '\n',
    );
    for (const route of APPROVED_JAVA_REROUTES) {
      assert.equal(
        targetOf(after, 'equipment', route.name),
        route.newTarget,
        route.name,
      );
      if (route.name !== 'Sniper')
        assert.equal(
          targetOf(after, 'ammunition', route.name),
          route.newTarget,
          route.name,
        );
    }
    for (const name of [
      'IS LB 2-X AC Ammo',
      'IS LB 5-X AC Ammo',
      'IS LB 5-X Cluster Ammo',
    ])
      for (const api of ['unitLoaderAmmoIS', 'unitLoaderAmmoClan']) {
        assert.equal(
          targetOf(after, api, `${name} (OMNIPOD)`),
          targetOf(after, api, name),
          `${api} ${name} (OMNIPOD) follows its bare form`,
        );
        assert.ok(
          targetOf(before, api, `${name} (OMNIPOD)`) !== undefined ||
            allowed.some(
              (row) => row.api === api && row.name === `${name} (OMNIPOD)`,
            ),
          `${api} ${name} (OMNIPOD) is guarded by the baseline, not a gain`,
        );
      }
    assert.deepEqual(shifts, [], JSON.stringify(shifts.slice(0, 30), null, 2));
  });
}
