import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  assertClean,
  assertDetailedRan,
  assertPipelineRan,
  clearCensusOutputs,
  prepareReference,
  readCensusResults,
  verifySha256,
  verifyMekfiles,
} from './parity-scoreboard.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const temporary = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-scoreboard-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('committed oracle sidecar retains its original SHA-256 and CRLF bytes', () => {
  const bytes = fs.readFileSync(
    'config/reference/reference-full.jsonl.provenance.json',
  );
  assert.equal(
    sha(bytes),
    'eaebbd8208d0075f63d862d762d8fea48a8adb8e932791eea8d7fac977f97c9a',
  );
  assert.ok(bytes.includes(Buffer.from('\r\n')));
});

test('only detailed exits 0 and 1 mean ran; errors, signals and exit 2 fail', () => {
  for (const status of [0, 1])
    assert.doesNotThrow(() => assertDetailedRan({ status }));
  for (const result of [
    { status: 2 },
    { status: 137 },
    { status: null },
    { status: 0, error: new Error('spawn failed') },
    { status: 1, signal: 'SIGTERM' },
  ])
    assert.throws(() => assertDetailedRan(result), /Detailed execution failed/);
});

const pipelineFixture = (out) => {
  const rows = ['one', 'two'].map((name) => ({
    path: `meks/${name}.mtf`,
    sha256: 'a'.repeat(64),
    family: 'battlemechs',
  }));
  const write = (name, value) =>
    fs.writeFileSync(path.join(out, name), JSON.stringify(value));
  const lines = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  fs.writeFileSync(path.join(out, 'sources.ndjson'), lines);
  write('sources.ndjson.manifest.json', {
    sourceCount: rows.length,
    sourcesSha256: sha(lines),
  });
  fs.writeFileSync(path.join(out, 'delta-rows.jsonl'), lines);
  write('delta-report.json', {
    ok: false,
    byFamily: { battlemechs: { rows: 2 } },
  });
  write('reference-provenance-report.json', { ok: true });
  write('execution.json', {
    cacheEnabled: false,
    families: [{ family: 'battlemechs', production: 'fresh' }],
  });
  return {
    reportMode: true,
    out,
    expectedRows: 2,
    expectedFamilies: ['battlemechs'],
  };
};

test('report mode accepts pipeline exit 1 only with complete outputs; local default stays strict', (t) => {
  const options = pipelineFixture(temporary(t));
  assert.doesNotThrow(() => assertPipelineRan({ status: 1 }, options));
  assert.doesNotThrow(() =>
    assertPipelineRan({ status: 0 }, { ...options, reportMode: false }),
  );
  assert.throws(
    () => assertPipelineRan({ status: 1 }, { ...options, reportMode: false }),
    /Aggregate pipeline failed/,
  );
  for (const result of [
    { status: 2 },
    { status: null },
    { status: 1, signal: 'SIGTERM' },
    { status: 1, error: new Error('crash') },
  ])
    assert.throws(
      () => assertPipelineRan(result, options),
      /Aggregate pipeline failed/,
    );
  assert.equal(
    JSON.parse(fs.readFileSync('config/reference/parity-scoreboard.json'))
      .reference.rows,
    9815,
  );
});

test('report mode refuses pipeline exit 1 with missing or partial completed outputs', (t) => {
  const out = temporary(t);
  for (const name of [
    'sources.ndjson',
    'sources.ndjson.manifest.json',
    'delta-report.json',
    'delta-rows.jsonl',
    'execution.json',
    'reference-provenance-report.json',
  ]) {
    const options = pipelineFixture(out);
    fs.unlinkSync(path.join(out, name));
    assert.throws(
      () => assertPipelineRan({ status: 1 }, options),
      /Aggregate pipeline incomplete/,
      name,
    );
  }
  for (const [name, value] of [
    ['sources.ndjson', '{"path":"one"}\n'],
    ['sources.ndjson', 'invalid JSON\n'],
    ['delta-rows.jsonl', '{"path":"one"}\n'],
    ['delta-report.json', '{"ok":false,"byFamily":{"battlemechs":{"rows":1}}}'],
    ['execution.json', '{"cacheEnabled":false,"families":[]}'],
    ['reference-provenance-report.json', '{"ok":false}'],
  ]) {
    const options = pipelineFixture(out);
    fs.writeFileSync(path.join(out, name), value);
    assert.throws(
      () => assertPipelineRan({ status: 1 }, options),
      /Aggregate pipeline incomplete/,
      name,
    );
  }
});

test('report mode fails truncated sources and same-count source hash tampering', (t) => {
  const out = temporary(t);
  for (const status of [0, 1]) {
    const options = pipelineFixture(out);
    const file = path.join(out, 'sources.ndjson');
    const original = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, original.split('\n').slice(0, 1).join('\n') + '\n');
    assert.throws(
      () => assertPipelineRan({ status }, options),
      /Aggregate pipeline incomplete/,
    );
    fs.writeFileSync(file, original.replace('one.mtf', 'other.mtf'));
    assert.throws(
      () => assertPipelineRan({ status }, options),
      /SHA-256 mismatch/,
    );
  }
});

test('reusing an output label removes stale completion evidence before execution', (t) => {
  const out = temporary(t);
  pipelineFixture(out);
  fs.mkdirSync(path.join(out, 'terms'));
  fs.writeFileSync(path.join(out, 'terms/delta-report.json'), '{}');
  fs.writeFileSync(path.join(out, 'RESULTS.json'), '{}');
  fs.writeFileSync(path.join(out, 'scoreboard-completeness.json'), '{}');
  fs.writeFileSync(path.join(out, 'notes.txt'), 'keep');
  clearCensusOutputs(out);
  for (const name of [
    'execution.json',
    'sources.ndjson',
    'delta-report.json',
    'delta-rows.jsonl',
    'reference-provenance-report.json',
    'RESULTS.json',
    'scoreboard-completeness.json',
    'sources.ndjson.manifest.json',
    'terms/delta-report.json',
  ])
    assert.equal(fs.existsSync(path.join(out, name)), false, name);
  assert.equal(fs.readFileSync(path.join(out, 'notes.txt'), 'utf8'), 'keep');
});

test('SHA verification rejects altered bytes', () => {
  assert.doesNotThrow(() =>
    verifySha256(Buffer.from('oracle'), sha('oracle'), 'reference'),
  );
  assert.throws(
    () => verifySha256(Buffer.from('changed'), sha('oracle'), 'reference'),
    /reference.*SHA-256/,
  );
});

test('mekfile preflight accepts raw LF bytes and rejects a CRLF copy', (t) => {
  const root = temporary(t);
  const lf = Buffer.from('Version:1.0\nchassis:Test\nmodel:TST-1\n');
  const file = path.join(root, 'Test.mtf');
  const references = [{ path: 'Test.mtf', sha256: sha(lf) }];
  fs.writeFileSync(file, lf);
  assert.deepEqual(verifyMekfiles(references, root, 1), {
    expectedRows: 1,
    matchedRows: 1,
    lfFiles: 1,
  });
  assert.deepEqual(fs.readFileSync(file), lf);
  const crlf = Buffer.from(lf.toString('utf8').replace(/\n/g, '\r\n'));
  fs.writeFileSync(file, crlf);
  assert.equal(
    sha(Buffer.from(crlf.toString('utf8').replace(/\r\n/g, '\n'))),
    references[0].sha256,
  );
  assert.throws(
    () => verifyMekfiles(references, root, 1),
    /Mekfile.*raw.*SHA-256 mismatch/,
  );
  assert.deepEqual(fs.readFileSync(file), crlf);
});

test('mekfile preflight rejects partial or duplicate reference inventories and escaped paths', (t) => {
  const root = temporary(t);
  const row = { path: 'Test.mtf', sha256: sha('test\n') };
  assert.throws(() => verifyMekfiles([row], root, 2), /Reference row count/);
  assert.throws(
    () => verifyMekfiles([row, row], root, 2),
    /Duplicate reference path/,
  );
  assert.throws(
    () => verifyMekfiles([{ ...row, path: '../outside.mtf' }], root, 1),
    /Mekfile path escapes/,
  );
  assert.throws(() => verifyMekfiles([row], root, 1), /ENOENT/);
});

test('reference preparation verifies gzip, decompressed data and unmodified sidecar', (t) => {
  const root = temporary(t),
    out = path.join(root, 'out');
  const data = Buffer.from('{"path":"mek/test"}\n'),
    compressed = gzipSync(data);
  const sidecar = Buffer.from('{"version":1}\n');
  fs.writeFileSync(path.join(root, 'reference-full.jsonl.gz'), compressed);
  fs.writeFileSync(
    path.join(root, 'reference-full.jsonl.provenance.json'),
    sidecar,
  );
  const reference = {
    file: 'reference-full.jsonl.gz',
    gzipSha256: sha(compressed),
    sha256: sha(data),
    sidecar: 'reference-full.jsonl.provenance.json',
    sidecarSha256: sha(sidecar),
  };
  const file = prepareReference(root, out, reference);
  assert.deepEqual(fs.readFileSync(file), data);
  assert.deepEqual(fs.readFileSync(file + '.provenance.json'), sidecar);
  assert.throws(
    () => prepareReference(root, out, { ...reference, sha256: sha('wrong') }),
    /reference.*SHA-256/,
  );
  assert.throws(
    () =>
      prepareReference(root, out, { ...reference, gzipSha256: sha('wrong') }),
    /gzip.*SHA-256/,
  );
  fs.writeFileSync(path.join(root, reference.sidecar), 'changed');
  assert.throws(
    () => prepareReference(root, out, reference),
    /sidecar.*SHA-256/,
  );
});

test('dirty-tree refusal covers tracked changes and untracked files', (t) => {
  const root = temporary(t);
  execFileSync('git', ['init', '--quiet', root]);
  assert.doesNotThrow(() => assertClean(root));
  fs.writeFileSync(path.join(root, 'input'), 'original');
  assert.throws(() => assertClean(root), /Dirty checkout/);
  execFileSync('git', ['-C', root, 'add', 'input']);
  assert.throws(() => assertClean(root), /Dirty checkout/);
});

test('missing census output and rejected trust cannot count as a completed run', (t) => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, 'terms'));
  assert.throws(
    () => readCensusResults(root, { head: 'a', tree: 'b' }),
    /ENOENT/,
  );
  fs.writeFileSync(
    path.join(root, 'terms/reference-provenance-report.json'),
    '{"ok":false}',
  );
  assert.throws(
    () => readCensusResults(root, { head: 'a', tree: 'b' }),
    /Reference trust rejected/,
  );
});
