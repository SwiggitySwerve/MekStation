import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { hash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'tsx/cjs/api';

// Java per-item vehicle slots (SweepFacts.java tankSlots / supportVehicleSlots).
// Ammunition never carries them: Tank.java:2581-2640 and
// TestSupportVehicle.java:1618-1640 count one slot per distinct ammo type.
export function vehicleSlots(fact) {
  assert(fact && 'tankSlots' in fact && 'supportVehicleSlots' in fact);
  return { tank: fact.tankSlots, supportVehicle: fact.supportVehicleSlots };
}

// Ground movement modes Java rejects the item on (SweepFacts.java, from
// TestTank.legalForMotiveType); null when it fits every mode.
export function motiveCompatibility(fact) {
  assert(
    fact && 'motiveIncompatible' in fact && 'motiveIncompatibleSupport' in fact,
  );
  const value = {
    incompatibleCombat: fact.motiveIncompatible,
    incompatibleSupport: fact.motiveIncompatibleSupport,
  };
  return value.incompatibleCombat.length || value.incompatibleSupport.length
    ? value
    : null;
}

const techBases = { IS: 'INNER_SPHERE', CLAN: 'CLAN', ALL: 'BOTH' };
const vehicleFlags = [
  'F_TANK_WEAPON',
  'F_TANK_EQUIPMENT',
  'F_SUPPORT_TANK_EQUIPMENT',
];

// Same identity owner as compare.mjs: every Java alias resolves through the BV
// alias owner. Candidates keep generate.mjs's tech-base rule and, when any of
// them mounts on vehicles, only those. A value is set only when all remaining agree.
export function assignSlots(
  items,
  registry,
  facts,
  resolveAlias,
  valueOf = vehicleSlots,
) {
  const targets = new Map();
  for (const row of registry) {
    if (facts[row.internalName]?.kind === 'ammunition') continue;
    for (const alias of new Set([row.internalName, row.name, ...row.aliases])) {
      const id = resolveAlias(alias);
      if (id) targets.set(id, new Set([...(targets.get(id) ?? []), row]));
    }
  }
  const assigned = new Map(),
    skipped = [];
  for (const item of new Map(items.map((item) => [item.id, item])).values()) {
    const id = item.id;
    let rows = [...(targets.get(id) ?? [])].filter(
      (row) =>
        row.tech === 'ALL' ||
        [techBases[row.tech], 'BOTH'].includes(item.techBase ?? 'BOTH'),
    );
    const mounted = rows.filter((row) =>
      facts[row.internalName].flags?.some((flag) =>
        vehicleFlags.includes(flag),
      ),
    );
    if (mounted.length) rows = mounted;
    const java = rows.map((row) => row.internalName);
    const values = new Set(
      java.map((name) => JSON.stringify(valueOf(facts[name]))),
    );
    if (values.size === 1)
      assigned.set(id, { slots: JSON.parse([...values][0]), java });
    else
      skipped.push({
        id,
        reason: java.length ? 'disagree' : 'unmatched',
        java,
      });
  }
  return { assigned, skipped };
}

// Inserts `"<key>": {...}` after the vehicleSlots (or criticalSlots) line of every
// record with this id (miscellaneous/other.json has two "cargo" records), touching
// nothing else. Values other than vehicleSlots are laid out by oxfmt afterwards.
export function insertField(text, id, slots, key = 'vehicleSlots') {
  const marker = `"id": ${JSON.stringify(id)},`;
  const starts = [];
  for (
    let at = text.indexOf(marker);
    at >= 0;
    at = text.indexOf(marker, at + 1)
  )
    starts.push(text.lastIndexOf('{', at));
  assert(starts.length, `No record ${id}`);
  const value =
    key === 'vehicleSlots'
      ? `{ "tank": ${slots.tank}, "supportVehicle": ${slots.supportVehicle} }`
      : JSON.stringify(slots);
  for (const start of starts.reverse()) {
    const block = text.slice(start, text.indexOf('\n    }', start));
    const existing = new RegExp(`\\n\\s*"${key}": (\\{[^}]*\\})`).exec(block);
    if (existing) {
      assert.deepEqual(JSON.parse(existing[1]), slots, `Conflicting ${id}`);
      continue;
    }
    const line =
      /\n(\s*)"vehicleSlots": [^\n]+,\n/.exec(block) ??
      /\n(\s*)"criticalSlots": [^,\n]+,\n/.exec(block);
    assert(line, `No criticalSlots line in ${id}`);
    const cut = start + line.index + line[0].length;
    text = `${text.slice(0, cut)}${line[1]}"${key}": ${value},\n${text.slice(cut)}`;
  }
  return text;
}

// Same pin check as generate.mjs: only one sweep-facts extraction reproduces the
// committed catalog (follow-up 112), so an input must match source-pins.json.
export function assertPinnedInputs(files, pins) {
  for (const file of files) {
    const name = file.replaceAll('\\', '/').split('/').at(-1);
    if (!existsSync(file) || hash('sha256', readFileSync(file)) !== pins[name])
      throw Error(`Pinned input changed: ${name}`);
  }
}

function main() {
  const [registryFile, factsFile] = process.argv.slice(2);
  assert(factsFile, 'Usage: vehicle-slots.mjs <java-registry> <sweep-facts>');
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  assertPinnedInputs(
    [registryFile, factsFile],
    read(new URL('./source-pins.json', import.meta.url)),
  );
  const root = resolve('public/data/equipment/official');
  const files = Object.entries(read(`${root}/index.json`).files)
    .filter(([kind]) => kind !== 'ammunition')
    .flatMap(([, group]) => Object.values(group))
    .sort();
  const items = files.flatMap((file) => read(`${root}/${file}`).items);
  register();
  const { getEquipmentEntry } = createRequire(import.meta.url)(
    '../../src/utils/construction/equipmentBVResolver.ts',
  );
  const args = [
    read(registryFile),
    read(factsFile),
    (name) => getEquipmentEntry(name)?.id,
  ];
  const { assigned, skipped } = assignSlots(items, ...args);
  const motive = assignSlots(items, ...args, motiveCompatibility).assigned;
  const fields = { vehicleSlots: assigned, motiveCompatibility: motive };
  for (const file of files) {
    const path = `${root}/${file}`;
    let text = readFileSync(path, 'utf8');
    for (const item of JSON.parse(text).items)
      for (const [key, values] of Object.entries(fields)) {
        const value = values.get(item.id)?.slots;
        if (value) text = insertField(text, item.id, value, key);
        else assert(!item[key], `Stale ${key}: ${item.id}`);
      }
    writeFileSync(path, text);
  }
  // CAT-Q2's frozen baseline (generate.test.mjs) takes exactly the added fields.
  const baselineFile = new URL('./baseline.json', import.meta.url);
  const baseline = read(baselineFile);
  const without = (item) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(item).filter(([key]) => !(key in fields)),
      ),
    );
  for (const row of baseline) {
    const now = read(`${root}/${row.file}`).items[row.index];
    assert.equal(now?.id, row.id, `Moved ${row.file}:${row.index}`);
    assert.equal(without(now), without(row.item), row.id);
    for (const [key, values] of Object.entries(fields)) {
      assert(
        row.item[key] === undefined || now[key],
        `Removed ${row.id}.${key}`,
      );
      if (now[key])
        assert.deepEqual(now[key], values.get(row.id).slots, row.id);
    }
    if (JSON.stringify(now) === JSON.stringify(row.item)) continue;
    row.item = now;
    row.sha256 = hash('sha256', JSON.stringify(now));
  }
  writeFileSync(baselineFile, JSON.stringify(baseline, null, 2) + '\n');
  execFileSync(
    process.execPath,
    [
      'node_modules/oxfmt/bin/oxfmt',
      '--write',
      fileURLToPath(baselineFile),
      ...files.map((file) => `${root}/${file}`),
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  const count = (reason) => skipped.filter((row) => row.reason === reason);
  console.log(
    JSON.stringify({
      records: items.length,
      ids: assigned.size + skipped.length,
      assigned: assigned.size,
      motiveRestricted: [...motive]
        .filter(([, v]) => v.slots)
        .map(([id]) => id),
      unmatched: count('unmatched').map((row) => row.id),
      disagree: count('disagree'),
    }),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
