import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { hash as hashBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';

import routing from '../../public/data/equipment/registry-routing.json' with { type: 'json' };
const { normalizeEquipmentId } = tsxRequire(
  '../../src/utils/construction/equipmentBV/normalization.ts',
  import.meta.url,
);
export const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const techBases = { IS: 'INNER_SPHERE', CLAN: 'CLAN', ALL: 'BOTH' };
const slug = (name) => (name.toLowerCase().match(/[a-z0-9]+/g) ?? []).join('-');
// Java damage per hit of cluster-table launchers (DAMAGE_BY_CLUSTERTABLE, -2), by
// ammo type; the combat runner multiplies "<n>/missile" by the rack size.
// MissileWeaponHandler.java:308-318 (LRM via LRMHandler.java:489, MRM, RL, and
// LRT via MissileWeapon.java:84): 1. SRMHandler.java:66-78 (SRM, SRT) and
// StreakHandler.java:79-88 (Streak SRM): 2.
const missileDamagePerHit = {
  LRM: 1,
  LRM_TORPEDO: 1,
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
  for (const name of Object.keys(routing.reroute))
    if (types.has(name)) selected.add(name);
  const originalCatalog = new Map(before.map((entry) => [entry.id, entry]));
  const ids = new Set(originalCatalog.keys());
  const identities = new Map();
  for (const name of [...selected].sort()) {
    assert(types.has(name), `Unregistered gap ${name}`);
    const id =
      routing.reroute[name] ??
      routing.canonicalIds[name] ??
      `${slug(name)}-registry`;
    assert(id && !ids.has(id), `Catalog id collision: ${name} -> ${id}`);
    ids.add(id);
    identities.set(name, id);
  }
  const known = new Map(identities);
  const existingAliases = new Map();
  for (const [name, id] of Object.entries(mappings))
    existingAliases.set(name.toLowerCase(), { name, id });
  for (const type of java) {
    if (known.has(type.internalName)) continue;
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
    if (id) known.set(type.internalName, id);
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
            .map((weapon) => known.get(weapon))
            .filter(Boolean),
        ),
      );
      entry.costPerTon = fixed(fact.cost, 'cost');
      entry.isExplosive = fact.isExplosive;
      notes.push(`Java ammoType:rackSize ${fact.ammoType}:${fact.rackSize}`);
      notes.push(`Java munitions: ${(fact.munitions ?? []).join(',')}`);
      if (fact.compatible?.some((weapon) => !known.has(weapon)))
        notes.push(
          `Unrepresented compatible Java weapons: ${fact.compatible.filter((weapon) => !known.has(weapon)).join(', ')}`,
        );
    } else {
      entry.costCBills = fixed(fact.cost, 'cost');
      if (fact.kind === 'weapons') {
        entry.subType = type.javaClass.split('.').at(-1);
        entry.damage = weaponDamage(fact);
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
    const inputs = gap?.inputs?.map((input) => input.id) ?? [];
    const names = [name, type.name, ...type.aliases, ...inputs];
    for (const alias of new Set(names)) {
      const aliasKey = alias.toLowerCase();
      const sourceName = [name, ...type.aliases].find(
        (native) => slug(native) === alias,
      );
      const owner =
        lookups[aliasKey]?.default ??
        lookups[sourceName?.toLowerCase()]?.default;
      if (owner !== name) continue;
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
  return { items, aliases };
}
function runGenerator() {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const write = (file, value) =>
    writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  const hash = (file) => hashBytes('sha256', readFileSync(file));
  const [registryFile, gapsFile, factsFile] = process.argv.slice(2);
  assert(factsFile, 'Usage: generate.mjs <registry> <gaps> <facts>');
  const inputs = [...process.argv.slice(2), `${registryFile}.lookups.json`];
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
      ...['weapons', 'ammunition', 'miscellaneous'].map(
        (kind) => `${root}/official/${kind}/java-registry.json`,
      ),
      'scripts/equipment-catalog/*.json',
    ],
    { stdio: 'inherit', windowsHide: true },
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) runGenerator();
