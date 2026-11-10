import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { readCatalog } from '../ci/committed-catalog-inputs';
import {
  catalogModel,
  emitCommittedCatalog,
  joinCatalog,
  MECH_UNKNOWN_MODEL_ALIAS,
  sourceIdentity,
  type ISource,
} from '../ci/committed-catalog-sources';
import folders from '../megameklab-conversion/strict-families.json';
import { sourceHash } from '../vehicle-aero-bv-delta';

const text =
  '<UnitType>FixedWingSupport</UnitType>\r\n<Name>Plane</Name>\r\n<Model>A</Model>\r\n';
const source: ISource = {
  ...sourceIdentity('vehicles/plane.blk', text),
  path: 'vehicles/plane.blk',
  sha256: sourceHash(Buffer.from(text)),
  sourceText: text,
};
const catalog = [
  {
    family: 'aerospace',
    file: 'plane.json',
    blob: 'a'.repeat(40),
    unit: { chassis: 'Plane', model: 'A', extra: { keep: true } },
  },
];
const reference = [{ path: source.path, sha256: source.sha256 }];

it('names and confines the mech Unknown-to-empty model alias', () => {
  expect(MECH_UNKNOWN_MODEL_ALIAS).toBe(
    'mech-catalog-Unknown-to-empty-source-model',
  );
  expect(catalogModel('battlemechs', 'Unknown')).toBe('');
  expect(catalogModel('vehicles', 'Unknown')).toBe('Unknown');
  expect(catalogModel('battlemechs', 'unknown')).toBe('unknown');
  expect(sourceIdentity('meks/a.mtf', 'chassis:Mech\nmodel:\n').model).toBe('');
  const result = joinCatalog(
    [
      {
        ...catalog[0],
        family: 'battlemechs',
        unit: { chassis: 'Mech', model: 'Unknown' },
      },
    ],
    [{ ...source, family: 'battlemechs', chassis: 'Mech', model: '' }],
    reference,
    false,
  );
  expect(result.errors).toEqual([]);
  expect(result.aliases).toBe(1);
});

it('uses unquoted Git listings and retains non-ASCII filenames and committed ids', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'committed-unicode-'));
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      windowsHide: true,
    });
  try {
    git('init');
    git('config', 'core.quotepath', 'true');
    const dir = path.join(repo, 'public/data/units/battlemechs');
    fs.mkdirSync(dir, { recursive: true });
    const filename = "Alfar AL-D1 'Dökkálfar'.json";
    const unit = {
      chassis: "Alfar 'Dökkálfar'",
      model: 'AL-D1',
      id: 'committed-id-collision-suffix',
    };
    fs.writeFileSync(
      path.join(dir, 'index.json'),
      JSON.stringify({ totalUnits: 1, units: [{ path: filename }] }),
    );
    fs.writeFileSync(path.join(dir, filename), JSON.stringify(unit));
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-m',
      'fixture',
    );
    const native =
      jest.requireActual<typeof import('node:child_process')>(
        'node:child_process',
      );
    const spy = jest.spyOn(native, 'execFileSync');
    try {
      const result = readCatalog(repo, 'HEAD', ['battlemechs'], 'python');
      expect(result.errors).toEqual([]);
      expect(result.entries[0].file).toBe(
        'public/data/units/battlemechs/' + filename,
      );
      expect(result.entries[0].unit).toEqual(unit);
      const listings = spy.mock.calls.filter(
        (call) => Array.isArray(call[1]) && call[1].includes('ls-tree'),
      );
      expect(listings).toHaveLength(1);
      expect(listings[0][1]).toEqual(
        expect.arrayContaining(['-c', 'core.quotepath=false']),
      );
    } finally {
      spy.mockRestore();
    }
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

it('emits identical payloads/manifests, accounts for six fixtures, and publishes no payload on reference failure', () => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'committed-catalog-full-'),
  );
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      windowsHide: true,
    });
  try {
    git('init');
    for (const family of Object.keys(folders).map((f) =>
      f === 'protomeks' ? 'protomechs' : f,
    )) {
      const dir = path.join(repo, 'public/data/units', family);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'index.json'),
        JSON.stringify({
          totalUnits: ['aerospace', 'battlearmor'].includes(family) ? 1 : 0,
          units:
            family === 'aerospace'
              ? [{ path: 'plane.json' }]
              : family === 'battlearmor'
                ? [{ path: 'armor.json' }]
                : [],
        }),
      );
      if (family === 'aerospace')
        fs.writeFileSync(
          path.join(dir, 'plane.json'),
          JSON.stringify(catalog[0].unit),
        );
      if (family === 'battlearmor')
        fs.writeFileSync(
          path.join(dir, 'armor.json'),
          JSON.stringify({ chassis: 'Armor', model: '' }),
        );
    }
    for (const [family, fixtures] of Object.entries({
      battlearmor: [
        'clan-sylph-sqd5.json',
        'elemental-standard-sqd5.json',
        'is-cavalier-sqd4.json',
      ],
      infantry: [
        'foot-rifle-platoon.json',
        'jump-srm-platoon.json',
        'mechanized-tracked-platoon.json',
      ],
    }))
      for (const fixture of fixtures)
        fs.writeFileSync(
          path.join(repo, 'public/data/units', family, fixture),
          '{}',
        );
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-m',
      'fixture',
    );
    const mekfiles = path.join(root, 'mekfiles');
    for (const folder of Object.values(folders).flat())
      fs.mkdirSync(path.join(mekfiles, folder), { recursive: true });
    fs.writeFileSync(path.join(mekfiles, source.path), text);
    const armorText =
      '<UnitType>BattleArmor</UnitType>\r\n<Name>Armor</Name>\r\n';
    fs.writeFileSync(path.join(mekfiles, 'battlearmor/armor.blk'), armorText);
    const ref = path.join(root, 'reference.jsonl');
    fs.writeFileSync(
      ref,
      [
        ...reference,
        {
          path: 'battlearmor/armor.blk',
          sha256: sourceHash(Buffer.from(armorText)),
        },
      ]
        .map((row) => JSON.stringify(row))
        .join('\n') + '\n',
    );
    const options = {
      repo,
      commit: 'HEAD',
      mekfiles,
      reference: ref,
      python: 'python',
      allowIdentityOnly: true,
    };
    for (const label of ['first', 'second'])
      expect(
        emitCommittedCatalog({ ...options, out: path.join(root, label) }),
      ).toBe(true);
    fs.writeFileSync(
      path.join(mekfiles, source.path),
      text.replace(/\r\n/g, '\n'),
    );
    fs.writeFileSync(
      path.join(mekfiles, 'battlearmor/armor.blk'),
      armorText.replace(/\r\n/g, '\n'),
    );
    expect(
      emitCommittedCatalog({ ...options, out: path.join(root, 'lf-checkout') }),
    ).toBe(true);
    for (const file of [
      'sources.ndjson',
      'sources.ndjson.manifest.json',
      'committed-catalog-report.json',
    ]) {
      expect(fs.readFileSync(path.join(root, 'first', file))).toEqual(
        fs.readFileSync(path.join(root, 'second', file)),
      );
      expect(fs.readFileSync(path.join(root, 'first', file))).toEqual(
        fs.readFileSync(path.join(root, 'lf-checkout', file)),
      );
    }
    const report = JSON.parse(
      fs.readFileSync(
        path.join(root, 'first/committed-catalog-report.json'),
        'utf8',
      ),
    );
    expect(report.unjoinables).toHaveLength(6);
    expect(report.errors).toEqual([]);
    expect(report.objectParity.status).toBe('not-measured');
    const regenerated = path.join(root, 'catalog-objects.ndjson');
    fs.writeFileSync(
      regenerated,
      [
        {
          ...reference[0],
          unit: { ...catalog[0].unit, extra: { keep: false } },
        },
        {
          path: 'battlearmor/armor.blk',
          sha256: sourceHash(Buffer.from(armorText)),
          unit: { chassis: 'Armor', model: '' },
        },
      ]
        .map((row) => JSON.stringify(row))
        .join('\n') + '\n',
    );
    expect(
      emitCommittedCatalog({
        ...options,
        regenerated,
        out: path.join(root, 'object-drift'),
      }),
    ).toBe(true);
    const drift = JSON.parse(
      fs.readFileSync(
        path.join(root, 'object-drift/committed-catalog-report.json'),
        'utf8',
      ),
    );
    expect(drift.errors).toEqual([]);
    expect(drift.objectParity.byFamily.aerospace.drifted).toBe(1);
    expect(drift.objectParity.byFamily.battlearmor.equal).toBe(1);
    expect(drift.objectParity.ledger[0].fields[0].path).toBe('extra.keep');
    expect(
      fs.readFileSync(path.join(root, 'object-drift/sources.ndjson')),
    ).toEqual(fs.readFileSync(path.join(root, 'first/sources.ndjson')));
    fs.writeFileSync(
      ref,
      JSON.stringify({ ...reference[0], sha256: 'b'.repeat(64) }) + '\n',
    );
    expect(
      emitCommittedCatalog({ ...options, out: path.join(root, 'failed') }),
    ).toBe(false);
    expect(fs.existsSync(path.join(root, 'failed/sources.ndjson'))).toBe(false);
    expect(
      fs.existsSync(path.join(root, 'failed/sources.ndjson.manifest.json')),
    ).toBe(false);
    expect(
      fs.readFileSync(
        path.join(root, 'failed/committed-catalog-report.json'),
        'utf8',
      ),
    ).toContain('reference-verification-failed');
    fs.writeFileSync(ref, '');
    expect(
      emitCommittedCatalog({
        ...options,
        out: path.join(root, 'empty-reference'),
      }),
    ).toBe(false);
    expect(
      fs.readFileSync(
        path.join(root, 'empty-reference/committed-catalog-report.json'),
        'utf8',
      ),
    ).toContain('Reference contains no rows');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}, 60000);

it('hashes only CRLF pairs as LF, preserving lone CR and UTF-8 bytes', () => {
  expect(sourceHash(Buffer.from('é\r\nx\r'))).toBe(
    sourceHash(Buffer.from('é\nx\r')),
  );
  expect(sourceHash(Buffer.from('é\nx\r'))).not.toBe(
    sourceHash(Buffer.from('é\nx')),
  );
});

it('maps vehicles/ FixedWingSupport to aerospace and preserves the committed object', () => {
  expect(source.family).toBe('aerospace');
  expect(sourceIdentity('protomeks/a.blk', '<Name>Proto</Name>').family).toBe(
    'protomechs',
  );
  expect(sourceIdentity('smallcraft/a.blk', '<Name>Craft</Name>').family).toBe(
    'aerospace',
  );
  expect(sourceIdentity('warship/a.blk', '<Name>Ship</Name>').family).toBe(
    'capital',
  );
  const result = joinCatalog(catalog, [source], reference, false);
  expect(result.errors).toEqual([]);
  expect(result.rows[0].unit).toEqual(catalog[0].unit);
  expect(result.rows[0]).not.toHaveProperty('sourceText');
});

it('rejects zero, case-mismatched, multiple source matches and duplicate catalog identities', () => {
  expect(joinCatalog(catalog, [], reference, false).errors.join()).toContain(
    'zero-source-matches',
  );
  expect(
    joinCatalog(
      catalog,
      [{ ...source, chassis: 'plane' }],
      reference,
      false,
    ).errors.join(),
  ).toContain('zero-source-matches');
  expect(
    joinCatalog(
      catalog,
      [source, { ...source, path: 'vehicles/other.blk' }],
      reference,
      false,
    ).errors.join(),
  ).toContain('multiple-source-matches');
  const duplicate = joinCatalog(
    [...catalog, { ...catalog[0], file: 'other.json' }],
    [source],
    reference,
    false,
  );
  expect(duplicate.errors.join()).toContain('multiple-catalog-matches');
  expect(duplicate.rows).toEqual([]);
});

it('rejects absent, duplicated and hash-mismatched reference rows before emitting', () => {
  for (const refs of [
    [],
    [...reference, ...reference],
    [{ ...reference[0], sha256: 'b'.repeat(64) }],
  ]) {
    const result = joinCatalog(catalog, [source], refs, false);
    expect(result.errors.join()).toContain('reference');
    expect(result.rows).toEqual([]);
  }
});

it('requires explicit acknowledgement for source-only families and keeps their unit null', () => {
  const entries = [{ ...catalog[0], family: 'infantry' }];
  const sources = [{ ...source, family: 'infantry' }];
  expect(
    joinCatalog(entries, sources, reference, false).errors.join(),
  ).toContain('source-only-families-identity-only');
  const result = joinCatalog(entries, sources, reference, true);
  expect(result.errors).toEqual([]);
  expect(result.rows[0]).toEqual({
    path: source.path,
    sha256: source.sha256,
    unit: null,
    sourceText: text,
  });
  expect(result.joins[0].evaluation).toBe('identity-only/source-text');
});

it('produces byte-stable ordering independent of source/catalog/reference enumeration', () => {
  const entries = [
    ...catalog,
    { ...catalog[0], file: 'b.json', unit: { chassis: 'Plane', model: 'B' } },
  ];
  const sources = [source, { ...source, path: 'vehicles/b.blk', model: 'B' }];
  const refs = sources.map(({ path, sha256 }) => ({ path, sha256 }));
  expect(JSON.stringify(joinCatalog(entries, sources, refs, false))).toBe(
    JSON.stringify(
      joinCatalog(entries.reverse(), sources.reverse(), refs.reverse(), false),
    ),
  );
});

it('reads only indexed committed blobs, reports fixtures, and ignores dirty/untracked files', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'committed-catalog-'));
  const git = (...args: string[]) =>
    execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      windowsHide: true,
    });
  try {
    git('init');
    const dir = path.join(repo, 'public/data/units/battlearmor');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'index.json'),
      JSON.stringify({ totalUnits: 1, units: [{ path: 'unit.json' }] }),
    );
    fs.writeFileSync(
      path.join(dir, 'unit.json'),
      JSON.stringify({ chassis: 'Unit', model: '' }),
    );
    for (const [family, fixtures] of Object.entries({
      battlearmor: [
        'clan-sylph-sqd5.json',
        'elemental-standard-sqd5.json',
        'is-cavalier-sqd4.json',
      ],
      infantry: [
        'foot-rifle-platoon.json',
        'jump-srm-platoon.json',
        'mechanized-tracked-platoon.json',
      ],
    })) {
      const familyDir = path.join(repo, 'public/data/units', family);
      fs.mkdirSync(familyDir, { recursive: true });
      for (const fixture of fixtures)
        fs.writeFileSync(path.join(familyDir, fixture), '{}');
    }
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '-m',
      'fixture',
    );
    fs.writeFileSync(path.join(dir, 'untracked.json'), '{}');
    fs.writeFileSync(path.join(dir, 'unit.json'), '{}');
    const result = readCatalog(repo, 'HEAD', ['battlearmor'], 'python');
    expect(result.entries.map((e) => e.unit)).toEqual([
      { chassis: 'Unit', model: '' },
    ]);
    expect(result.unjoinables).toHaveLength(3);
    expect(
      result.unjoinables.every(
        (e) => e.reason === 'legacy_fixture_not_in_index',
      ),
    ).toBe(true);
    expect(
      JSON.stringify(readCatalog(repo, 'HEAD', ['battlearmor'], 'python')),
    ).toBe(JSON.stringify(result));
    git('show', 'HEAD:public/data/units/battlearmor/unit.json');
    fs.writeFileSync(path.join(dir, 'index.json'), '{}');
    expect(readCatalog(repo, 'HEAD', ['battlearmor'], 'python')).toEqual(
      result,
    );
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
