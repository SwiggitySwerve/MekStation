import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { hash as hashBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import routing from '../../public/data/equipment/registry-routing.json' with { type: 'json' };

export const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const techBases = { IS: 'INNER_SPHERE', CLAN: 'CLAN', ALL: 'BOTH' };
const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const number = (value, label) => {
  assert(Number.isFinite(value), `Missing/nonfinite ${label}`);
  return value;
};

export function assertAdditive(before, after) {
  for (const id of new Set(before.map((entry) => entry.id))) {
    const entries = after.filter((entry) => entry.id === id);
    assert(entries.length, `Removed existing id ${id}`);
    assert.equal(
      JSON.stringify(entries),
      JSON.stringify(before.filter((entry) => entry.id === id)),
      `Changed existing id ${id}`,
    );
  }
}

export function generateEntries(java, gaps, facts, lookups, before, mappings) {
  const selected = new Set(gaps.map((gap) => gap.java.internalName));
  for (const [name, fact] of Object.entries(facts))
    if (fact.damageDivisor !== undefined || fact.usedByProto)
      selected.add(name);
  const types = new Map(java.map((row) => [row.internalName, row]));
  assert.equal(types.size, java.length, 'Duplicate Java internal name');
  for (const name of Object.keys(routing.reroute))
    if (types.has(name)) selected.add(name);
  const ids = new Set(before.map((entry) => entry.id));
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
  for (const type of java) {
    if (known.has(type.internalName)) continue;
    const id = [type.internalName, ...type.aliases]
      .map((alias) => mappings[alias])
      .find((id) => {
        const entry = before.find((entry) => entry.id === id);
        return (
          entry &&
          entry.battleValue === type.bv &&
          entry.weight === type.tons &&
          [techBases[type.tech], 'BOTH'].includes(entry.techBase)
        );
      });
    if (id) known.set(type.internalName, id);
  }
  const items = [];
  const aliases = {};
  const existingAliases = new Set(
    Object.keys(mappings).map((key) => key.toLowerCase()),
  );
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
      category: fact.kind === 'weapons' ? fact.category : 'Miscellaneous',
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
      entry.category = fact.category;
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
      entry.compatibleWeaponIds = [
        ...new Set(
          (fact.compatible ?? [])
            .map((weapon) => known.get(weapon))
            .filter(Boolean),
        ),
      ];
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
        entry.damage =
          fact.damage < 0
            ? `Java variable damage (${fact.damage})`
            : number(fact.damage, 'damage');
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
    for (const alias of new Set([
      name,
      type.name,
      ...type.aliases,
      ...inputs,
    ])) {
      const sourceName = [name, ...type.aliases].find(
        (native) => slug(native) === alias,
      );
      const owner =
        lookups[alias.toLowerCase()]?.default ??
        lookups[sourceName?.toLowerCase()]?.default;
      if (
        (owner
          ? owner !== name
          : !inputs.includes(alias) ||
            gaps.some(
              (gap) =>
                gap.java.internalName !== name &&
                gap.inputs?.some((input) => input.id === alias),
            )) ||
        (existingAliases.has(alias.toLowerCase()) &&
          !(
            Object.hasOwn(routing.reroute, name) &&
            (type.tech !== 'IS' || alias.toLowerCase().startsWith('is'))
          ))
      )
        continue;
      aliases[alias] = id;
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
  if (!factsFile)
    throw Error(
      'Usage: node scripts/equipment-catalog/generate.mjs <java-registry.json> <catalog-gaps-by-java.json> <java-facts.json>',
    );
  const inputs = [...process.argv.slice(2), `${registryFile}.lookups.json`];
  const hashes = read(new URL('./source-pins.json', import.meta.url));
  for (const file of inputs) {
    const name = file.replaceAll('\\', '/').split('/').at(-1);
    if (hash(file) !== hashes[name])
      throw Error(`Pinned input changed: ${name}`);
  }
  const root = resolve('public/data/equipment'),
    index = read(`${root}/official/index.json`);
  const originals = Object.values(index.files)
    .flatMap(Object.values)
    .filter((file) => !file.endsWith('/java-registry.json'));
  const before = originals.flatMap(
    (file) => read(`${root}/official/${file}`).items,
  );
  const mappings = read(`${root}/name-mappings.json`);
  const result = generateEntries(
    read(registryFile),
    read(gapsFile),
    read(factsFile),
    read(`${registryFile}.lookups.json`),
    before,
    {
      ...read(new URL('./protected-aliases.json', import.meta.url)),
      ...mappings,
    },
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
    index.totalItems[kind] = originals
      .filter((file) => file.startsWith(`${kind}/`))
      .reduce(
        (total, file) => total + read(`${root}/official/${file}`).items.length,
        items.length,
      );
  }
  write(`${root}/name-mappings.json`, { ...mappings, ...result.aliases });
  write(`${root}/official/index.json`, index);
  write(new URL('./provenance.json', import.meta.url), {
    revision,
    inputs: hashes,
    identities: result.items.map(({ internalName, entry }) => ({
      internalName,
      id: entry.id,
    })),
  });
  const format = spawnSync(
    process.execPath,
    [
      'node_modules/oxfmt/bin/oxfmt',
      '--write',
      `${root}/official/index.json`,
      `${root}/name-mappings.json`,
      `${root}/official/**/java-registry.json`,
      'scripts/equipment-catalog/*.json',
    ],
    { stdio: 'inherit', windowsHide: true },
  );
  if (format.status !== 0) throw Error(`oxfmt failed: ${format.status}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) runGenerator();
