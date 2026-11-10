import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  REPORT_FILES,
  ROW_FILES,
  readJson,
  sha256,
  recordCompletionStage,
  verifyCompletion,
} from './parity-scoreboard-artifacts.mjs';

function fixture(t) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-completeness-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  fs.mkdirSync(path.join(out, 'terms'));
  const write = (file, value) =>
    fs.writeFileSync(path.join(out, file), JSON.stringify(value) + '\n');
  const lines =
    ['one', 'two']
      .map((name) => JSON.stringify({ path: name, family: 'mek' }))
      .join('\n') + '\n';
  fs.writeFileSync(path.join(out, 'sources.ndjson'), lines);
  write('sources.ndjson.manifest.json', {
    sourceCount: 2,
    sourcesSha256: sha256(lines),
  });
  for (const prefix of ['', 'terms/']) {
    for (const file of REPORT_FILES) {
      if (ROW_FILES.includes(file))
        fs.writeFileSync(path.join(out, prefix + file), lines);
      else
        write(
          prefix + file,
          file === 'reference-provenance-report.json'
            ? { ok: true }
            : { byFamily: { mek: { rows: 2 } } },
        );
    }
  }
  write('execution.json', {
    families: [{ family: 'mek', production: 'fresh' }],
  });
  write('RESULTS.json', { bv: { rows: 2 } });
  return { out, write };
}

function complete(out) {
  for (const stage of ['pipeline', 'detailed', 'result'])
    recordCompletionStage(out, stage, 2);
}

test('completion manifest records hashes and expected/observed counts for every required file', (t) => {
  const { out } = fixture(t);
  complete(out);
  const manifest = verifyCompletion(out);
  assert.equal(manifest.expectedCorpusRows, 2);
  for (const file of [
    'sources.ndjson',
    'delta-report.json',
    'delta-rows.jsonl',
    'execution.json',
    'sources.ndjson.manifest.json',
    'reference-provenance-report.json',
    'RESULTS.json',
    ...REPORT_FILES.map((name) => 'terms/' + name),
  ]) {
    const entry = manifest.files[file];
    assert.equal(
      entry.sha256,
      sha256(fs.readFileSync(path.join(out, file))),
      file,
    );
    assert.equal(entry.rows, entry.expectedRows, file);
    assert.equal(
      entry.expectedRows,
      ['metadata', 'families'].includes(entry.rowCountKind) ? 1 : 2,
      file,
    );
  }
  assert.equal(
    manifest.files['terms/reference-provenance-report.json'].rowCountKind,
    'metadata',
  );
});

test('completion rejects truncated detailed rows and partial detailed reports', (t) => {
  const { out, write } = fixture(t);
  fs.writeFileSync(
    path.join(out, 'terms/construction-weight-rows.jsonl'),
    '{"path":"one"}\n',
  );
  assert.throws(() => recordCompletionStage(out, 'detailed', 2), /row count/);
  fs.writeFileSync(
    path.join(out, 'terms/construction-weight-rows.jsonl'),
    fs.readFileSync(path.join(out, 'sources.ndjson')),
  );
  write('terms/construction-weight-report.json', {
    byFamily: { mek: { rows: 1 } },
  });
  assert.throws(() => recordCompletionStage(out, 'detailed', 2), /row count/);
});

test('completion rechecks recorded hashes and refuses a same-count changed report', (t) => {
  const { out, write } = fixture(t);
  complete(out);
  write('terms/construction-weight-report.json', {
    byFamily: { mek: { rows: 2 } },
    changed: true,
  });
  assert.throws(() => verifyCompletion(out), /SHA-256 mismatch/);
});

test('completion refuses missing stages, removed entries and falsified expected counts', (t) => {
  const { out, write } = fixture(t);
  recordCompletionStage(out, 'pipeline', 2);
  assert.throws(() => verifyCompletion(out), /inventory/);
  complete(out);
  const manifest = readJson(path.join(out, 'scoreboard-completeness.json'));
  delete manifest.files['terms/construction-weight-report.json'];
  write('scoreboard-completeness.json', manifest);
  assert.throws(() => verifyCompletion(out), /inventory/);
  complete(out);
  const altered = readJson(path.join(out, 'scoreboard-completeness.json'));
  altered.files['sources.ndjson'].expectedRows = 1;
  write('scoreboard-completeness.json', altered);
  assert.throws(() => verifyCompletion(out), /evidence/);
});
