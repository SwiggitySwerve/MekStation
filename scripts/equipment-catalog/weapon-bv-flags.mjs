/* Maps pinned WeaponType flag facts to existing catalog identities; never writes catalogs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const key = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const mask = (row) =>
  Number(row.directFire) |
  (Number(row.artemis) << 1) |
  (Number(row.riscLaser) << 2) |
  (Number(row.apollo) << 3);

function mapFlags(facts, catalog, mask) {
  const aliases = new Map(),
    ambiguous = new Set();
  const byName = new Map();
  for (const [javaClass, row] of Object.entries(facts)) {
    for (const name of new Set([row.name, row.internalName, ...row.aliases])) {
      const normalized = key(name);
      const candidates = byName.get(normalized) ?? [];
      candidates.push({ javaClass, ...row });
      byName.set(normalized, candidates);
      const previous = aliases.get(normalized),
        value = mask(row);
      if (previous !== undefined && previous !== value)
        ambiguous.add(normalized);
      aliases.set(normalized, value);
    }
  }
  for (const name of ambiguous) aliases.delete(name);
  const canonical = new Map(),
    unmapped = [];
  for (const item of catalog) {
    const sourceClass = (item.special ?? [])
      .map((s) => s.match(/\/([^/]+)\.java/))
      .find(Boolean)?.[1];
    const plain = item.name
      .replace(/\s*\((?:Clan|IS)\)\s*$/i, '')
      .replace(/^(?:Clan|IS)\s+/i, '');
    const names = [
      item.id,
      item.name,
      plain,
      (item.techBase === 'CLAN' ? 'Clan ' : 'IS ') + plain,
    ];
    let rows =
      sourceClass && facts[sourceClass]
        ? [facts[sourceClass]]
        : facts[item.subType]
          ? [facts[item.subType]]
          : names.flatMap((name) => byName.get(key(name)) ?? []);
    const tech = rows.filter(
      (row) => item.techBase === 'BOTH' || row.tech === item.techBase,
    );
    if (tech.length) rows = tech;
    const values = [...new Set(rows.map(mask))];
    if (values.length === 1) canonical.set(item.id, values[0]);
    else unmapped.push({ id: item.id, name: item.name, values });
  }
  return { canonical, aliases, unmapped, ambiguous };
}

function readPinnedWeapons(input) {
  if (
    input.revision !== '48fcb2f64a1b3f2d575707ce5653dad64927b587' ||
    !input.weapons
  )
    throw Error('Expected the pinned WeaponType facts envelope');
  const facts = input.weapons;
  if (Object.values(facts).some((row) => typeof row.infantry !== 'boolean'))
    throw Error(
      'Regenerate pinned facts with WeaponBVFlags.java for F_INFANTRY',
    );
  return facts;
}

function generate(input, catalog) {
  const facts = readPinnedWeapons(input);
  const { canonical, aliases, unmapped, ambiguous } = mapFlags(
    facts,
    catalog,
    mask,
  );
  // Resolve the new fact independently: an ambiguous infantry alias must not
  // erase an already represented direct-fire or linking flag.
  const infantry = mapFlags(facts, catalog, (row) => Number(row.infantry) << 4);
  const packed = (map) =>
    [...map]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, bits]) => `${name}:${bits}`)
      .join(' ');
  const source = `// Generated from MegaMek 48fcb2f64 WeaponType flags; regenerate with\n// scripts/equipment-catalog/weapon-bv-flags.mjs <pinned-facts.json> <output.ts>.\n// Packed tables keep generated facts separate from the lookup rule.\nconst canonical = unpack(${JSON.stringify(packed(canonical))});\nconst native = unpack(${JSON.stringify(packed(aliases))});\nconst infantryCanonical = unpack(${JSON.stringify(packed(infantry.canonical))});\nconst infantryNative = unpack(${JSON.stringify(packed(infantry.aliases))});\nconst bits = { directFire: 1, artemis: 2, riscLaser: 4, apollo: 8, infantry: 16 } as const;\n\nfunction unpack(data: string): ReadonlyMap<string, number> {\n  return new Map(data.split(' ').map(item => {\n    const [id, value] = item.split(':');\n    return [id, Number(value)] as const;\n  }));\n}\n\nexport function hasNativeWeaponBVFlag(id: string, flag: keyof typeof bits): boolean | undefined {\n  const [ids, names] = flag === 'infantry' ? [infantryCanonical, infantryNative] : [canonical, native];\n  const value = ids.get(id) ?? names.get(id.toLowerCase().replace(/[^a-z0-9]/g, ''));\n  return value === undefined ? undefined : (value & bits[flag]) !== 0;\n}\n`;
  return {
    source,
    unmapped,
    counts: {
      canonical: canonical.size,
      native: aliases.size,
      ambiguous: ambiguous.size,
    },
  };
}

function readWeaponCatalog() {
  const directory = 'public/data/equipment/official/weapons';
  return fs
    .readdirSync(directory)
    .filter((name) => name.endsWith('.json'))
    .flatMap(
      (name) =>
        JSON.parse(fs.readFileSync(path.join(directory, name))).items ?? [],
    );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw Error('Expected pinned facts JSON and output TS paths');
  const result = generate(
    JSON.parse(fs.readFileSync(input)),
    readWeaponCatalog(),
  );
  fs.writeFileSync(output, result.source);
  fs.writeFileSync(
    output + '.mapping.json',
    JSON.stringify(
      { counts: result.counts, unmapped: result.unmapped },
      null,
      2,
    ) + '\n',
  );
  console.log(JSON.stringify(result.counts));
}
export { generate, mapFlags, readPinnedWeapons, readWeaponCatalog };
