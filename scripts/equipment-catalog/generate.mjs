import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { hash as hashBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';

import routing from '../../public/data/equipment/registry-routing.json' with { type: 'json' };
import capitalAliasInputs from './capital-alias-inputs.json' with { type: 'json' };
import capitalSource from './capital-source.json' with { type: 'json' };
import prototypeDamage from './prototype-damage.json' with { type: 'json' };
import {
  retainNativeTechnologyReferences,
  verifyTechnologyExtraction,
} from './technology-advancement.mjs';
const { normalizeEquipmentId } = tsxRequire(
  '../../src/utils/construction/equipmentBV/normalization.ts',
  import.meta.url,
);
export const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const techBases = { IS: 'INNER_SPHERE', CLAN: 'CLAN', ALL: 'BOTH' };
const slug = (name) => (name.toLowerCase().match(/[a-z0-9]+/g) ?? []).join('-');
const convertedCapitalInputs = new Set(capitalAliasInputs);
// Java damage per hit of cluster-table launchers (DAMAGE_BY_CLUSTERTABLE, -2), by
// ammo type; the combat runner multiplies "<n>/missile" by the rack size.
// MissileWeaponHandler.java:308-318 (LRM via LRMHandler.java:489, MRM, RL, and
// LRT via MissileWeapon.java:84): 1. SRMHandler.java:66-78 (SRM, SRT) and
// StreakHandler.java:79-88 (Streak SRM): 2. MekMortarHandler.java:126-137 (mech
// mortar shells, outside the infantry direct-blow case): 2.
const missileDamagePerHit = {
  LRM: 1,
  LRM_TORPEDO: 1,
  MEK_MORTAR: 2,
  MRM: 1,
  ROCKET_LAUNCHER: 1,
  SRM: 2,
  SRM_STREAK: 2,
  SRM_TORPEDO: 2,
};
// Artillery (DAMAGE_ARTILLERY, -5) deals its rack size per hit
// (ArtilleryWeaponDistantFireHandler.java:746-747).
const artilleryAmmoTypes = new Set(['LONG_TOM', 'SNIPER', 'THUMPER']);
const weaponDamage = (fact) => {
  if (fact.damage === -2 && missileDamagePerHit[fact.ammoType])
    return `${missileDamagePerHit[fact.ammoType]}/missile`;
  if (fact.damage === -5 && artilleryAmmoTypes.has(fact.ammoType))
    return number(fact.rackSize, 'rackSize');
  return fact.damage < 0
    ? `Java variable damage (${fact.damage})`
    : number(fact.damage, 'damage');
};
const number = (value, label) => {
  assert(Number.isFinite(value), `Missing/nonfinite ${label}`);
  return value;
};
export function generateEntries(java, gaps, facts, lookups, before, mappings) {
  const selected = new Set(gaps.map((gap) => gap.java.internalName));
  for (const [name, fact] of Object.entries(facts))
    if (fact.damageDivisor !== undefined || fact.usedByProto)
      selected.add(name);
  const types = new Map(java.map((row) => [row.internalName, row]));
  assert.equal(types.size, java.length, 'Duplicate Java internal name');
  const slugOwners = new Map();
  for (const type of java)
    for (const alias of [type.internalName, ...type.aliases]) {
      if (lookups[alias.toLowerCase()]?.default !== type.internalName) continue;
      const key = slug(alias);
      if (!slugOwners.has(key)) slugOwners.set(key, new Set());
      slugOwners.get(key).add(type.internalName);
    }
  for (const name of Object.keys(routing.reroute))
    if (types.has(name)) selected.add(name);
  const legacySelected = new Set(selected);
  const extra = Object.keys(capitalSource)
    .filter((name) => types.has(name) && !selected.has(name))
    .sort();
  const prototypes = Object.entries(facts)
    .filter(
      ([name, fact]) =>
        fact.isPrototype &&
        types.has(name) &&
        !selected.has(name) &&
        !extra.includes(name),
    )
    .map(([name]) => name)
    .sort();
  const ordered = [...selected].sort().concat(extra, prototypes);
  const originalCatalog = new Map(before.map((entry) => [entry.id, entry]));
  const ids = new Set(originalCatalog.keys());
  const identities = new Map();
  for (const name of ordered) {
    assert(types.has(name), `Unregistered gap ${name}`);
    const id =
      routing.reroute[name] ??
      routing.canonicalIds[name] ??
      `${slug(name)}-registry`;
    assert(id && !ids.has(id), `Catalog id collision: ${name} -> ${id}`);
    ids.add(id);
    identities.set(name, id);
  }
  const legacyKnown = new Map(
    [...identities].filter(([name]) => legacySelected.has(name)),
  );
  const existingAliases = new Map();
  for (const [name, id] of Object.entries(mappings))
    existingAliases.set(name.toLowerCase(), { name, id });
  for (const type of java) {
    if (legacyKnown.has(type.internalName)) continue;
    const id = [type.internalName, ...type.aliases]
      .flatMap((alias) => [
        existingAliases.get(alias.toLowerCase())?.id,
        normalizeEquipmentId(alias, originalCatalog, false),
      ])
      .find((id) => {
        const entry = before.find((entry) => entry.id === id);
        return (
          entry &&
          (facts[type.internalName]?.kind !== 'weapons' || entry.ranges) &&
          (entry.name === type.name ||
            (entry.battleValue === type.bv && entry.weight === type.tons)) &&
          (type.tech === 'ALL' ||
            [techBases[type.tech], 'BOTH'].includes(entry.techBase))
        );
      });
    if (id) legacyKnown.set(type.internalName, id);
  }
  const known = new Map([...legacyKnown, ...identities]);
  // Java BA ammo (AmmoType.F_BATTLEARMOR, AmmoType.java:282) is valued per
  // shot (BattleArmorBVCalculator.java:329-331). Its existing records gain
  // only the intrinsic kgPerShot fact; unrepresented types are not added here.
  const perShot = {};
  for (const [name, id] of known)
    if (facts[name]?.battleArmor === true && originalCatalog.has(id)) {
      const kg = number(facts[name].kgPerShot, `${name}.kgPerShot`);
      assert((perShot[id] ?? kg) === kg, `Conflicting kgPerShot for ${id}`);
      perShot[id] = kg;
    }
  const items = [];
  const aliases = {};
  for (const [name, id] of identities) {
    const type = types.get(name),
      fact = facts[name];
    assert(fact, `Missing Java facts: ${name}`);
    const notes = [
      `https://github.com/MegaMek/megamek/blob/${revision}/megamek/src/${type.javaClass.replaceAll('.', '/')}.java: ${name}`,
    ];
    const fixed = (value, label) => {
      number(value, `${name}.${label}`);
      if (value < 0 || (value > 0 && value < 1e-30)) {
        notes.push(`Java variable ${label}: ${value}`);
        return 0;
      }
      return value;
    };
    const entry = {
      id,
      name: type.name,
      category: fact.category ?? 'Miscellaneous',
      techBase: techBases[type.tech],
      rulesLevel:
        fact.rulesLevel === 'INTRO' ? 'INTRODUCTORY' : fact.rulesLevel,
      weight: fixed(type.tons, 'weight'),
      criticalSlots: fixed(fact.criticalSlots, 'criticalSlots'),
      battleValue: fixed(type.bv, 'battleValue'),
      introductionYear: number(fact.introductionYear, 'introductionYear'),
    };
    assert(entry.techBase, `Unknown tech base: ${type.tech}`);
    if (fact.allowedUnitTypes?.length)
      entry.allowedUnitTypes = fact.allowedUnitTypes;
    for (const key of ['extinctionYear', 'reintroductionYear'])
      if (fact[key] !== -1 && fact[key] !== undefined)
        entry[key] = number(fact[key], key);
    // Preserve existing ammo records when newly represented weapons are added.
    const compatibleIds = legacySelected.has(name) ? legacyKnown : known;
    if (fact.kind === 'ammunition') {
      entry.variant =
        {
          M_STANDARD: 'Standard',
          M_CLUSTER: 'Cluster',
          M_INFERNO: 'Inferno',
          M_FRAGMENTATION: 'Fragmentation',
          M_SMOKE: 'Smoke',
        }[fact.munitions?.join(',')] ?? 'Other';
      entry.shotsPerTon = number(fact.shots, `${name}.shots`);
      entry.kgPerShot = number(fact.kgPerShot, `${name}.kgPerShot`);
      entry.compatibleWeaponIds = Array.from(
        new Set(
          (fact.compatible ?? [])
            .map((weapon) => compatibleIds.get(weapon))
            .filter(Boolean),
        ),
      );
      entry.costPerTon = fixed(fact.cost, 'cost');
      entry.isExplosive = fact.isExplosive;
      notes.push(`Java ammoType:rackSize ${fact.ammoType}:${fact.rackSize}`);
      notes.push(`Java munitions: ${(fact.munitions ?? []).join(',')}`);
      if (fact.compatible?.some((weapon) => !compatibleIds.has(weapon)))
        notes.push(
          `Unrepresented compatible Java weapons: ${fact.compatible.filter((weapon) => !compatibleIds.has(weapon)).join(', ')}`,
        );
    } else {
      entry.costCBills = fixed(fact.cost, 'cost');
      if (fact.kind === 'weapons') {
        entry.subType = type.javaClass.split('.').at(-1);
        entry.damage = prototypeDamage.values[name] ?? weaponDamage(fact);
        if (prototypeDamage.values[name]) notes.push(prototypeDamage.source);
        entry.heat = number(fact.heat, 'heat');
        entry.ranges = fact.ranges;
      }
      if (fact.damageDivisor !== undefined) {
        entry.damageDivisor = number(fact.damageDivisor, 'damageDivisor');
        entry.allowedUnitTypes = ['Infantry'];
      }
    }
    entry.special = notes;
    items.push({ kind: fact.kind, entry, internalName: name });
    const gap = gaps.find((gap) => gap.java.internalName === name);
    const inputs =
      gap?.inputs?.map(({ id }) => {
        const bare =
          fact.kind === 'ammunition' && capitalSource[name]
            ? id.replace(/:\d+$/, '')
            : id;
        return originalCatalog.has(bare.toLowerCase()) ? id : bare;
      }) ?? [];
    const names = [name, type.name, ...type.aliases, ...inputs];
    // Conversion emits slugs even for registered types absent from the gap list.
    // Only native aliases with a unique Java owner may acquire this spelling.
    for (const alias of new Set([
      ...names,
      ...[name, ...type.aliases]
        .map(slug)
        .filter((alias) => convertedCapitalInputs.has(alias)),
    ])) {
      const aliasKey = alias.toLowerCase();
      if (!names.includes(alias) && slugOwners.get(alias)?.size !== 1) continue;
      const sourceName = [name, ...type.aliases].find(
        (native) => slug(native) === alias,
      );
      const owner =
        lookups[aliasKey]?.default ??
        lookups[sourceName?.toLowerCase()]?.default;
      if (owner !== name) continue;
      const priorId = normalizeEquipmentId(alias, originalCatalog, false);
      if (!names.includes(alias) && originalCatalog.has(priorId)) continue;
      if (prototypes.includes(name) && originalCatalog.has(priorId)) continue;
      const previous = existingAliases.get(aliasKey);
      if (previous && originalCatalog.has(previous.id)) {
        // Same route semantics as registryPreviousId (equipmentBVCatalogData.ts).
        const route = routing.nativeNames[id];
        if (route !== undefined && typeof route === 'object') {
          // An approved per-name identity fix names its exact previous id.
          const native = Object.keys(route).find(
            (n) => n.toLowerCase() === aliasKey,
          );
          if (!native || route[native] !== previous.id) continue;
        } else {
          if (
            previous.id !== routing.previousIds[id] ||
            route?.toLowerCase() !== aliasKey
          )
            continue;
          if (type.tech === 'IS' && !aliasKey.startsWith('is')) continue;
        }
      }
      const aliasName = previous?.name ?? alias;
      aliases[aliasName] = id;
      existingAliases.set(aliasKey, { name: aliasName, id });
    }
  }
  return { items, aliases, perShot };
}
export function generateCapitalBVFacts(items, originalEntries = []) {
  const facts = Object.fromEntries(
    items
      .filter(({ internalName }) => capitalSource[internalName])
      .map(({ internalName, entry }) => [
        entry.id,
        {
          ...capitalSource[internalName],
          source: entry.special[0],
        },
      ]),
  );
  for (const { entry } of items) {
    if (!facts[entry.id]) continue;
    for (const previous of originalEntries) {
      const sameFiringFacts =
        entry.shotsPerTon !== undefined
          ? previous.shotsPerTon === entry.shotsPerTon
          : previous.ranges &&
            previous.category === entry.category &&
            previous.heat === entry.heat;
      if (
        previous.name === entry.name &&
        previous.battleValue === entry.battleValue &&
        sameFiringFacts
      )
        facts[previous.id] = facts[entry.id];
    }
  }
  return facts;
}
/** Existing registry records may need converted spellings without re-emission. */
export function generateAliasAdditions(aliases, before, existingIds) {
  const result = { ...before };
  for (const [name, id] of Object.entries(aliases)) {
    assert(existingIds.has(id), `Alias target is absent: ${name} -> ${id}`);
    assert(
      result[name] === undefined || result[name] === id,
      `Alias target changed: ${name}`,
    );
    result[name] = id;
  }
  return result;
}
function runGenerator() {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const write = (file, value) =>
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  const hash = (file) => hashBytes('sha256', readFileSync(file));
  const [registryFile, gapsFile, factsFile] = process.argv.slice(2);
  assert(factsFile, 'Usage: generate.mjs <registry> <gaps> <facts>');
  const inputs = [
    ...process.argv.slice(2, 5),
    `${registryFile}.lookups.json`,
    fileURLToPath(new URL('./capital-source.json', import.meta.url)),
    fileURLToPath(new URL('./prototype-damage.json', import.meta.url)),
    fileURLToPath(new URL('./capital-alias-inputs.json', import.meta.url)),
  ];
  const hashes = read(new URL('./source-pins.json', import.meta.url));
  for (const file of inputs) {
    const name = file.replaceAll('\\', '/').split('/').at(-1);
    if (hash(file) !== hashes[name])
      throw Error(`Pinned input changed: ${name}`);
  }
  const root = resolve('public/data/equipment'),
    index = read(`${root}/official/index.json`);
  const originalItems = (kind) =>
    Object.values(index.files[kind])
      .filter((file) => !file.endsWith('/java-registry.json'))
      .flatMap((file) => read(`${root}/official/${file}`).items);
  const before = Object.keys(index.files).flatMap(originalItems);
  const mappings = read(new URL('./protected-aliases.json', import.meta.url));
  const result = generateEntries(
    read(registryFile),
    read(gapsFile),
    read(factsFile),
    read(`${registryFile}.lookups.json`),
    before,
    mappings,
  );
  if (process.argv.includes('--aliases-only')) {
    const ids = new Set(
      Object.values(index.files).flatMap((group) =>
        Object.values(group).flatMap((file) =>
          read(`${root}/official/${file}`).items.map((item) => item.id),
        ),
      ),
    );
    write(
      `${root}/name-mappings.json`,
      generateAliasAdditions(
        result.aliases,
        read(`${root}/name-mappings.json`),
        ids,
      ),
    );
    execFileSync(
      process.execPath,
      ['node_modules/oxfmt/bin/oxfmt', '--write', `${root}/name-mappings.json`],
      { stdio: 'inherit', windowsHide: true },
    );
    return;
  }
  // Complete this preflight before the first full-generation write. Metadata
  // added by released D batches cannot disappear when registry entries rebuild.
  const documents = new Map(
    Object.values(index.files).flatMap((group) =>
      Object.values(group).map((file) => [
        file,
        read(`${root}/official/${file}`),
      ]),
    ),
  );
  let technologyFacts;
  if (
    [...documents.values()].some(({ items }) =>
      items.some((item) => Object.hasOwn(item, 'nativeTechnologyNames')),
    )
  ) {
    const option = process.argv.indexOf('--technology-facts');
    assert(
      option >= 0 && process.argv[option + 1],
      'Metadata-bearing regeneration requires --technology-facts <verified-extraction.json>',
    );
    technologyFacts = verifyTechnologyExtraction(
      readFileSync(process.argv[option + 1]),
      read(
        new URL('./technology-advancement-provenance.json', import.meta.url),
      ),
      readFileSync(
        new URL('./TechnologyAdvancementFacts.java', import.meta.url),
      ),
    );
  }
  result.items = retainNativeTechnologyReferences(
    result.items,
    documents,
    technologyFacts,
  );
  const expectationsFile = new URL('./java-additions.json', import.meta.url);
  const expectations = read(expectationsFile);
  const expectedIds = new Set(expectations.map((row) => row.values.id));
  const sourceTypes = new Map(
    read(registryFile).map((row) => [row.internalName, row]),
  );
  const sourceFacts = read(factsFile);
  for (const { kind, entry, internalName } of result.items)
    if (!expectedIds.has(entry.id))
      expectations.push({
        native: internalName,
        kind,
        source: entry.special[0],
        values: entry,
        java: {
          ...sourceTypes.get(internalName),
          ...sourceFacts[internalName],
        },
      });
  write(expectationsFile, expectations);
  // Additive kgPerShot on existing ammunition records (baseline.json tracks them).
  const perShotFiles = [];
  for (const file of Object.values(index.files.ammunition)) {
    if (file.endsWith('/java-registry.json')) continue;
    const data = read(`${root}/official/${file}`);
    let changed = false;
    data.items = data.items.map((item) => {
      const kg = result.perShot[item.id];
      if (kg === undefined) return item;
      if (item.kgPerShot !== undefined) {
        assert.equal(item.kgPerShot, kg, `kgPerShot differs: ${item.id}`);
        return item;
      }
      changed = true;
      const entries = Object.entries(item);
      const at = entries.findIndex(([key]) => key === 'shotsPerTon') + 1;
      entries.splice(at || entries.length, 0, ['kgPerShot', kg]);
      return Object.fromEntries(entries);
    });
    if (changed) {
      write(`${root}/official/${file}`, data);
      perShotFiles.push(`${root}/official/${file}`);
    }
  }
  for (const kind of ['weapons', 'ammunition', 'miscellaneous']) {
    const items = result.items
      .filter((item) => item.kind === kind)
      .map((item) => item.entry);
    const schema = {
      weapons: 'weapon',
      ammunition: 'ammunition',
      miscellaneous: 'misc-equipment',
    }[kind];
    write(`${root}/official/${kind}/java-registry.json`, {
      $schema: `../../_schema/${schema}-schema.json`,
      items,
    });
    index.files[kind]['java-registry'] = `${kind}/java-registry.json`;
    index.totalItems[kind] =
      items.length +
      originalItems(kind).filter((item) => kind !== 'weapons' || item.ranges)
        .length;
  }
  write(
    new URL('./capital-bv.json', import.meta.url),
    generateCapitalBVFacts(result.items, before),
  );
  const addedIds = new Set(result.items.map((item) => item.entry.id));
  const originalMappings = Object.fromEntries(
    Object.entries(mappings).filter(([, id]) => !addedIds.has(id)),
  );
  write(`${root}/name-mappings.json`, {
    ...originalMappings,
    ...result.aliases,
  });
  write(`${root}/official/index.json`, index);
  write(new URL('./provenance.json', import.meta.url), {
    revision,
    inputs: hashes,
    identities: result.items.map(({ internalName, entry }) => ({
      internalName,
      id: entry.id,
    })),
  });
  execFileSync(
    process.execPath,
    [
      'node_modules/oxfmt/bin/oxfmt',
      '--write',
      `${root}/official/index.json`,
      `${root}/name-mappings.json`,
      ...perShotFiles,
      ...['weapons', 'ammunition', 'miscellaneous'].map(
        (kind) => `${root}/official/${kind}/java-registry.json`,
      ),
      ...['provenance.json', 'capital-bv.json', 'java-additions.json'].map(
        (name) => fileURLToPath(new URL(name, import.meta.url)),
      ),
    ],
    { stdio: 'inherit', windowsHide: true },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) runGenerator();
