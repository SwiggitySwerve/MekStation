/** Independent pinned infantry clip facts. Never writes catalogs or weapon flags. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const defaultOutput = path.join(
  root,
  'src/utils/construction/equipmentBV/nativeInfantryClipFacts.ts',
);
const key = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function generate(input) {
  assert.equal(input?.revision, revision, 'Expected the pinned clip facts');
  assert.equal(input.genericAmmo?.group, 'INFANTRY:0');
  assert.equal(input.genericAmmo?.battleValue, 0, 'Nonzero implicit ammo BV');
  assert(input.weapons && Object.keys(input.weapons).length > 0);
  const classes = new Map(),
    aliases = new Map(),
    ambiguous = new Set();
  for (const row of Object.values(input.weapons)) {
    for (const field of ['javaClass', 'name', 'internalName', 'ammoType'])
      assert.equal(typeof row[field], 'string', `Missing ${field}`);
    for (const field of ['infantryWeapon', 'oneShot'])
      assert.equal(typeof row[field], 'boolean', `Missing ${field}`);
    assert(
      row.oneShotAmmoAdmitted === null ||
        typeof row.oneShotAmmoAdmitted === 'boolean',
      'Missing oneShotAmmoAdmitted',
    );
    for (const field of ['rackSize', 'clipShots'])
      assert(Number.isSafeInteger(row[field]) && row[field] >= 0, field);
    assert(
      Array.isArray(row.aliases) &&
        row.aliases.every((s) => typeof s === 'string'),
    );
    if (row.infantryWeapon) {
      assert(
        Array.isArray(row.admissionByYear) && row.admissionByYear.length > 0,
      );
      let previous = -2147483649;
      for (const [year, admitted] of row.admissionByYear) {
        assert(Number.isInteger(year) && year > previous && year <= 2147483647);
        assert(admitted === null || typeof admitted === 'boolean');
        previous = year;
      }
      assert.equal(row.admissionByYear[0][0], -2147483648);
      const facts = Object.fromEntries(
        [
          'infantryWeapon',
          'ammoType',
          'rackSize',
          'clipShots',
          'oneShot',
          'oneShotAmmoAdmitted',
          'admissionByYear',
        ].map((field) => [field, row[field]]),
      );
      if (classes.has(row.javaClass))
        assert.deepEqual(
          classes.get(row.javaClass),
          facts,
          'Ambiguous infantry class',
        );
      classes.set(row.javaClass, facts);
    }
    for (const name of new Set([row.name, row.internalName, ...row.aliases])) {
      const normalized = key(name);
      const owner = row.infantryWeapon ? row.javaClass : null;
      if (aliases.has(normalized) && aliases.get(normalized) !== owner)
        ambiguous.add(normalized);
      aliases.set(normalized, owner);
    }
  }
  const ordered = (entries) =>
    Object.fromEntries(
      [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  const native = ordered(
    [...aliases].filter(([name, owner]) => owner && !ambiguous.has(name)),
  );
  const state = (value) => (value === null ? '?' : value ? '1' : '0');
  const packedClasses = Object.entries(ordered(classes))
    .map(([name, row]) =>
      [
        name,
        row.ammoType,
        row.rackSize,
        row.clipShots,
        Number(row.oneShot),
        state(row.oneShotAmmoAdmitted),
        row.admissionByYear
          .map(([year, admitted]) => `${year}~${state(admitted)}`)
          .join(','),
      ].join('|'),
    )
    .join(' ');
  const packedAliases = Object.entries(native)
    .map(([name, owner]) => `${name}:${owner}`)
    .join(' ');
  return `// Generated independently from MegaMek ${revision}; do not edit.
// Reproduce with scripts/equipment-catalog/infantry-clip-facts.mjs --check.
export interface INativeInfantryClipFacts {
  readonly infantryWeapon: true;
  readonly ammoType: string;
  readonly rackSize: number;
  readonly clipShots: number;
  readonly oneShot: boolean;
  /** null means missing year or mixed-tech context; it must not invent a clip. */
  readonly oneShotAmmoAdmitted: boolean | null;
}
export const NATIVE_INFANTRY_CLIP_AMMO = ${JSON.stringify({ group: input.genericAmmo.group, battleValue: input.genericAmmo.battleValue })} as const;
interface IStoredClipFacts extends INativeInfantryClipFacts {
  readonly admissionByYear: readonly (readonly [number, boolean | null])[];
}
const classes = unpack(${JSON.stringify(packedClasses)});
const native = new Map(${JSON.stringify(packedAliases)}.split(' ').map(item => {
  const [name, owner] = item.split(':');
  return [name, owner] as const;
}));
function state(value: string): boolean | null { return value === '?' ? null : value === '1'; }
function unpack(data: string): ReadonlyMap<string, IStoredClipFacts> {
  return new Map(data.split(' ').map(item => {
    const [name, ammoType, rack, shots, oneShot, admitted, timeline] = item.split('|');
    const facts: IStoredClipFacts = {
      infantryWeapon: true, ammoType, rackSize: Number(rack), clipShots: Number(shots),
      oneShot: oneShot === '1', oneShotAmmoAdmitted: state(admitted),
      admissionByYear: timeline.split(',').map(item => {
        const [year, value] = item.split('~'); return [Number(year), state(value)] as const;
      }),
    };
    return [name, facts] as const;
  }));
}
/** Callers resolve catalog identity first; ambiguous native aliases stay absent. */
export function getNativeInfantryClipFacts(name: string, javaClass?: string, year?: number): INativeInfantryClipFacts | undefined {
  const facts = classes.get(javaClass ?? '') ?? classes.get(native.get(name.toLowerCase().replace(/[^a-z0-9]/g, '')) ?? '');
  if (!facts || year === undefined) return facts;
  if (!Number.isInteger(year) || year < -2147483648 || year > 2147483647) return undefined;
  let admitted = facts.oneShotAmmoAdmitted;
  for (const [start, value] of facts.admissionByYear) {
    if (year < start) break;
    admitted = value;
  }
  return { ...facts, oneShotAmmoAdmitted: admitted };
}
`;
}

function execute(command, args, options = {}) {
  const result = spawnSync(command, args, {
    windowsHide: true,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 240000,
    ...options,
  });
  assert.equal(
    result.status,
    0,
    result.error?.message ?? result.stderr ?? result.stdout,
  );
  return result.stdout;
}

export function writeModule(input, output, check = false) {
  const source = execute(
    process.execPath,
    [
      path.join(root, 'node_modules/oxfmt/bin/oxfmt'),
      '--stdin-filepath',
      output,
    ],
    { input: generate(input) },
  );
  if (check)
    assert.equal(
      fs.readFileSync(output, 'utf8'),
      source,
      'Generated clip module drift',
    );
  else fs.writeFileSync(output, source);
}

function extract({ megamek, classpathFile, java, temp }) {
  assert.equal(
    execute('git', ['-C', megamek, 'rev-parse', 'HEAD']).trim(),
    revision,
  );
  execute('git', [
    '-C',
    megamek,
    'diff',
    '--exit-code',
    revision,
    '--',
    'megamek/src',
  ]);
  const classpath = fs.readFileSync(classpathFile, 'utf8').trim();
  const expectedClasses = path.resolve(
    megamek,
    'megamek/build/classes/java/main',
  );
  assert(
    classpath
      .split(path.delimiter)
      .some((entry) => path.resolve(entry) === expectedClasses),
    'Classpath must use the pinned checkout classes',
  );
  const factsFile = path.join(temp, 'facts.json');
  execute(java, [
    '-cp',
    classpath,
    path.join(directory, 'InfantryClipFacts.java'),
    factsFile,
  ]);
  return JSON.parse(fs.readFileSync(factsFile, 'utf8'));
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      facts: { type: 'string' },
      megamek: { type: 'string' },
      'classpath-file': { type: 'string' },
      java: { type: 'string', default: 'java' },
      out: { type: 'string', default: defaultOutput },
      check: { type: 'boolean', default: false },
    },
  });
  if (!values.facts && (!values.megamek || !values['classpath-file']))
    throw Error(
      'Provide --megamek <pinned compiled checkout> --classpath-file <runtime-classpath.txt>, or --facts <extracted.json>',
    );
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'mekstation-infantry-clips-'),
  );
  try {
    const input = values.facts
      ? JSON.parse(fs.readFileSync(values.facts, 'utf8'))
      : extract({
          megamek: path.resolve(values.megamek),
          classpathFile: values['classpath-file'],
          java: values.java,
          temp,
        });
    writeModule(input, path.resolve(values.out), values.check);
    process.stdout.write(
      `${values.check ? 'Verified' : 'Generated'} independent infantry clip facts\n`,
    );
  } finally {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true });
  }
}
