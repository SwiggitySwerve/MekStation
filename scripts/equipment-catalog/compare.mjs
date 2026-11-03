import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from 'tsx/cjs/api';

import { normalize, parseSources } from '../equipment-availability/sources.mjs';

export const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const canonical = (value) =>
  JSON.stringify(Array.isArray(value) ? [...value].sort() : value);
const variableQuantity = (field, value) =>
  !field.endsWith('Year') &&
  typeof value === 'number' &&
  (value < 0 || (value > 0 && value < 1e-30));
export function compareFields(item, expected, source) {
  const differences = [];
  for (const [field, java] of Object.entries(expected)) {
    if (java === undefined || variableQuantity(field, java)) continue;
    const catalog = item[field] ?? null;
    if (canonical(catalog) === canonical(java)) continue;
    const citation = typeof source === 'string' ? source : source(field);
    differences.push({ field, catalog, java, source: citation });
  }
  return differences;
}

const expressions = {
  battleValue: /\bbv\s*=/,
  weight: /\btonnage\s*=/,
  criticalSlots: /\b(?:criticals|criticalSlots)\s*=/,
  costCBills: /\bcost\s*=/,
  costPerTon: /\bcost\s*=/,
  techBase: /setTechBase\(/,
  rulesLevel: /setStaticTechLevel\(/,
  heat: /\bheat\s*=/,
  damage: /\b(?:damage|infantryDamage)\s*=/,
  shotsPerTon: /\bshots\s*=/,
  kgPerShot: /\bkgPerShot\s*=/,
  isExplosive: /\bexplosive\s*=/,
  flags: /\bflags\s*=/,
  compatibleWeaponIds: /isAmmoValid\(AmmoType/,
};
function citations(record, sources) {
  const lineage = [];
  let path = record.path;
  while (path && !lineage.some((row) => row.path === path)) {
    const text = sources[path];
    assert(text, `Missing source ${path}`);
    const start =
      record.key.startsWith('create') && path === record.path
        ? text.search(new RegExp(`\\b${record.key}\\(\\)\\s*\\{`))
        : 0;
    const next = start
      ? text
          .slice(start)
          .search(/\n    (?:public|private|protected) static \w+ create/)
      : -1;
    const body = text.slice(start, next < 0 ? undefined : start + next);
    lineage.push({ path, text: body, start });
    const parent = text.match(/\bclass\s+\w+\s+extends\s+(\w+)/)?.[1];
    path =
      parent &&
      Object.keys(sources).find((key) => key.endsWith(`/${parent}.java`));
  }
  return (field) => {
    const expression = field.startsWith('ranges.')
      ? new RegExp(`\\b${field.slice(7)}Range\\s*=`)
      : /Year$/.test(field)
        ? /set(?:IS|Clan)?Advancement\(/
        : expressions[field.replace(/allowedUnitTypes|isPrototype/, 'flags')];
    const candidates = [...lineage];
    if (field === 'compatibleWeaponIds') {
      const path = 'equipment/AmmoType.java';
      candidates.unshift({ path, text: sources[path], start: 0 });
    }
    for (const row of candidates) {
      const matches = [...row.text.matchAll(new RegExp(expression, 'g'))];
      if (matches.length)
        return matches
          .map(
            (match) =>
              `${row.path}:${sources[row.path].slice(0, row.start + match.index).split('\n').length}`,
          )
          .join('; ');
    }
    const getter =
      {
        battleValue: 'getBaseBV',
        weight: 'getBaseTonnage',
        criticalSlots: 'getBaseCriticalSlots',
        costCBills: 'getBaseCost',
        costPerTon: 'getBaseCost',
        isExplosive: 'isExplosive',
        rulesLevel: 'getStaticTechLevel',
        shotsPerTon: 'getShots',
      }[field] ??
      `get${field
        .replace(/^ranges\.(.*)/, '$1Range')
        .replace(/Year$/, 'Date')
        .replace(/^./, (c) => c.toUpperCase())}`;
    for (const path of [
      ...lineage.map((row) => row.path),
      'TechAdvancement.java',
    ]) {
      const text = sources[path];
      const offset = text.search(new RegExp(`public [\\w<>]+ ${getter}\\(`));
      if (offset >= 0)
        return `${path}:${text.slice(0, offset).split('\n').length}`;
    }
    throw new Error(`No source citation for ${record.key}.${field}`);
  };
}

export function sweep(input) {
  const { registry, facts, sources, catalog, units, resolveAlias } = input;
  const records = parseSources(sources);
  const mapping = new Map(),
    unmatched = [];
  const targets = new Map();
  for (const row of registry)
    for (const alias of new Set([row.internalName, row.name, ...row.aliases])) {
      const id = resolveAlias(alias);
      if (id) targets.set(id, new Set([...(targets.get(id) ?? []), row]));
    }
  for (const { file, item } of catalog) {
    const candidates = [...(targets.get(item.id) ?? [])];
    if (candidates.length !== 1)
      unmatched.push({
        file,
        id: item.id,
        reason: candidates.length ? 'ambiguous' : 'unmatched',
        candidates: candidates.map((row) => row.internalName),
      });
    else {
      const row = candidates[0];
      const path =
        row.javaClass
          .replace(/\$.*/, '')
          .replaceAll('.', '/')
          .replace(/^megamek\/common\//, '') + '.java';
      const definitions = records.filter(
        (record) =>
          record.path === path &&
          record.names.some((name) =>
            row.aliases.map(normalize).includes(normalize(name)),
          ),
      );
      const source =
        definitions.length === 1
          ? definitions[0]
          : { path, key: row.javaClass.split('.').at(-1) };
      mapping.set(item, { row, source, file });
    }
  }
  const represented = new Map();
  for (const [item, { row }] of mapping)
    represented.set(row.internalName, [
      ...(represented.get(row.internalName) ?? []),
      item.id,
    ]);
  const differences = [],
    variable = [];
  for (const [item, { row, source, file }] of mapping) {
    const fact = facts[row.internalName];
    assert(fact, `Missing Java facts ${row.internalName}`);
    const expected = {
      battleValue: row.bv,
      weight: row.tons,
      criticalSlots: fact.criticalSlots,
      [fact.kind === 'ammunition' ? 'costPerTon' : 'costCBills']: fact.cost,
      techBase: { IS: 'INNER_SPHERE', CLAN: 'CLAN', ALL: 'BOTH' }[row.tech],
      rulesLevel:
        fact.rulesLevel === 'INTRO' ? 'INTRODUCTORY' : fact.rulesLevel,
    };
    const fields =
      'introductionYear prototypeYear productionYear commonYear extinctionYear reintroductionYear heat damage kgPerShot isExplosive isPrototype flags allowedUnitTypes'.split(
        ' ',
      );
    for (const field of fields) {
      expected[field] = fact[field];
      if (/Year$/.test(field) && fact[field] === -1) expected[field] = null;
    }
    for (const [range, value] of Object.entries(fact.ranges ?? {}))
      expected[`ranges.${range}`] = value;
    if (fact.shots !== undefined) expected.shotsPerTon = fact.shots;
    if (fact.compatible) {
      expected.compatibleWeaponIds = [
        ...new Set(
          fact.compatible.flatMap(
            (name) => represented.get(name) ?? [`java:${name}`],
          ),
        ),
      ];
    }
    const observed = { ...item };
    for (const [range, value] of Object.entries(item.ranges ?? {}))
      observed[`ranges.${range}`] = value;
    for (const [field, value] of Object.entries(expected))
      if (variableQuantity(field, value))
        variable.push({ id: item.id, field, java: value });
    const impact = {};
    for (const unit of units)
      if (unit.ids.has(item.id))
        impact[unit.family] = (impact[unit.family] ?? 0) + 1;
    const found = compareFields(observed, expected, citations(source, sources));
    for (const difference of found)
      differences.push({
        file,
        id: item.id,
        javaName: row.internalName,
        ...difference,
        impact,
      });
  }
  differences.sort(
    (a, b) =>
      a.field.localeCompare(b.field, 'en') ||
      a.id.localeCompare(b.id, 'en') ||
      a.file.localeCompare(b.file, 'en'),
  );
  return {
    revision,
    entries: catalog.length,
    matched: mapping.size,
    differences,
    unmatched,
    variable,
  };
}

function main() {
  const [registryPath, factsPath, javaRoot, out] = process.argv.slice(2);
  assert(out, 'See compare.md for required arguments');
  const root = resolve('public/data/equipment/official'),
    common = join(javaRoot, 'megamek/src/megamek/common');
  const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const sources = Object.fromEntries(
    readdirSync(common, { recursive: true })
      .filter((file) => file.endsWith('.java'))
      .sort()
      .map((file) => [
        file.replaceAll('\\', '/'),
        readFileSync(join(common, file), 'utf8'),
      ]),
  );
  const catalog = Object.values(json(join(root, 'index.json')).files)
    .flatMap(Object.values)
    .sort()
    .flatMap((file) =>
      json(join(root, file)).items.map((item) => ({ file, item })),
    );
  const owner = '../../src/utils/construction/equipmentBVResolver.ts';
  register();
  const { getEquipmentEntry } = createRequire(import.meta.url)(owner);
  const unitFiles = execFileSync(
    'git',
    ['ls-files', '-z', 'public/data/units'],
    { encoding: 'utf8' },
  ).split('\0');
  const units = unitFiles
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => {
      const unit = json(file);
      const family = file.split('/')[3];
      const mounts = [
        ...(unit.equipment ?? []),
        unit.primaryWeapon,
        unit.secondaryWeapon,
        { id: unit.armorKit },
        ...Object.values(unit.manipulators ?? {}).map((id) => ({ id })),
      ].filter(Boolean);
      const ids = new Set(
        mounts.map(
          (mount) => getEquipmentEntry(mount.id || mount.name || '')?.id,
        ),
      );
      return [{ family, ids }];
    });
  const report = sweep({
    registry: json(registryPath),
    facts: json(factsPath),
    sources,
    catalog,
    units,
    resolveAlias: (name) => getEquipmentEntry(name)?.id,
  });
  mkdirSync(out, { recursive: true });
  const output = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(join(out, 'differences.json'), output);
  const lines = [
    `# Equipment differences at ${revision}`,
    '',
    `${report.matched}/${report.entries} uniquely mapped; see JSON for ambiguity, missing fields and variable quantities.`,
    '',
  ];
  const total = (row) => Object.values(row.impact).reduce((a, b) => a + b, 0);
  for (const field of new Set(report.differences.map((row) => row.field))) {
    const rows = report.differences.filter((row) => row.field === field);
    lines.push(`## ${field} (${rows.length})`, '');
    for (const row of rows.sort((a, b) => total(b) - total(a)))
      lines.push(
        `- ${row.id}: ${canonical(row.catalog)} → ${canonical(row.java)}; ${row.source}; units ${JSON.stringify(row.impact)}`,
      );
    lines.push('');
  }
  writeFileSync(join(out, 'DIFFERENCES.md'), lines.join('\n') + '\n');
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
