import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  renderCommittedCatalogSummary,
  writeCommittedCatalogScoreboard,
} from './committed-catalog-scoreboard.mjs';
import { sha256 } from './parity-scoreboard-io.cjs';

const report = {
  catalogCommit: 'a'.repeat(40),
  indexed: 2,
  joined: 2,
  aliases: 1,
  errors: [],
  unjoinables: [{ file: 'fixture.json' }],
  joins: [
    { family: 'battlearmor', evaluation: 'identity-only/source-text' },
    { family: 'battlemechs', evaluation: 'committed-unit' },
  ],
  objectParity: {
    status: 'measured',
    byFamily: {
      battlearmor: { rows: 1, equal: 1, drifted: 0, unavailable: 0 },
      battlemechs: { rows: 1, equal: 0, drifted: 1, unavailable: 0 },
    },
    ledger: [
      {
        family: 'battlemechs',
        catalogFile: 'Mech.json',
        path: 'meks/Mech.mtf',
        fields: [
          {
            path: 'rulesLevel',
            committed: { present: true, value: 'ADVANCED' },
            regenerated: { present: true, value: 'STANDARD' },
          },
        ],
      },
    ],
    knownClasses: [
      {
        name: 'rules level',
        fields: 'rulesLevel',
        owner: 'C2',
        direction: 'catalog-behind',
        measuredCommit: 'b'.repeat(40),
      },
    ],
    errors: [],
  },
};

test('identity, object parity and source-text numeric parity occupy separate lines', () => {
  const text = renderCommittedCatalogSummary(report);
  const lines = text.split('\n');
  assert.match(lines[0], /^Identity:.*2\/2.*unjoinable=1.*errors=0/);
  assert.match(lines[1], /^Object parity:.*equal=1.*drifted=1.*unavailable=0/);
  assert.match(lines[2], /^Source-text numeric parity: not measured/);
  assert.match(text, /BV from source text; runtime-path BV not measured in CI/);
  assert.match(text, /rulesLevel/);
  assert.match(text, /C2.*catalog-behind/);
  assert.doesNotMatch(text, /drift.*fail/i);
});

test('personnel numbers have source-text scope and do not acquire committed runtime scope', () => {
  const result = {
    bv: {
      families: {
        battlearmor: { rows: 1, exactTotals: 1 },
        battlemechs: { rows: 1, exactTotals: 0 },
      },
    },
  };
  const text = renderCommittedCatalogSummary(report, result);
  assert.match(text.split('\n')[2], /^Source-text numeric parity: exact=1\/1/);
  assert.match(
    text,
    /battlearmor.*BV from source text; runtime-path BV not measured in CI/,
  );
});

test('null regenerated objects stay unavailable and are never counted equal', () => {
  const missing = {
    ...report,
    objectParity: {
      ...report.objectParity,
      status: 'not-measured',
      byFamily: {
        battlearmor: { rows: 1, equal: 0, drifted: 0, unavailable: 1 },
      },
      ledger: [],
    },
  };
  assert.match(
    renderCommittedCatalogSummary(missing).split('\n')[1],
    /not-measured.*equal=0.*drifted=0.*unavailable=1/,
  );
});

test('reference-only summaries report identity scope and retain the personnel limit', () => {
  const identity = {
    ...report,
    inputMode: 'committed-reference',
    joins: report.joins.map((join) => ({
      ...join,
      sourceOnly: join.family === 'battlearmor',
      evaluation: 'identity-only/reference',
    })),
  };
  const text = renderCommittedCatalogSummary(identity);
  assert.match(text, /Source-text numeric parity: not measured/);
  assert.match(
    text,
    /battlearmor.*BV from source text; runtime-path BV not measured in CI/,
  );
  assert.match(
    text,
    /battlemechs.*Identity only; runtime-path BV not measured in CI/,
  );
  assert.doesNotMatch(text, /Committed-object BV/);
});

test('scoreboard rejects interrupted, other-commit and altered-payload evidence', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'committed-scoreboard-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const emitted = path.join(out, 'emitted'),
    census = path.join(out, 'census');
  fs.mkdirSync(emitted);
  fs.mkdirSync(census);
  const bytes = Buffer.from('{"path":"fixture"}\n');
  const save = (file, value) =>
    fs.writeFileSync(file, JSON.stringify(value) + '\n');
  fs.writeFileSync(path.join(emitted, 'sources.ndjson'), bytes);
  save(path.join(emitted, 'sources.ndjson.manifest.json'), {
    sourcesSha256: sha256(bytes),
    committedCatalog: report,
  });
  save(path.join(emitted, 'committed-catalog-report.json'), report);
  assert.match(
    writeCommittedCatalogScoreboard(emitted),
    /Source-text numeric parity: not measured/,
  );
  for (const run of [
    { head: report.catalogCommit, finished: 'done', status: 'interrupted' },
    { head: 'c'.repeat(40), finished: 'done' },
    { head: report.catalogCommit },
    { head: report.catalogCommit, finished: 'done', failure: 'crash' },
  ]) {
    save(path.join(census, 'run-provenance.json'), run);
    assert.throws(
      () => writeCommittedCatalogScoreboard(emitted, census),
      /Census is incomplete/,
    );
  }
  save(path.join(census, 'run-provenance.json'), {
    head: report.catalogCommit,
    finished: 'done',
    sourcesSha256: 'f'.repeat(64),
  });
  assert.throws(
    () => writeCommittedCatalogScoreboard(emitted, census),
    /did not evaluate/,
  );
  const identity = { ...report, inputMode: 'committed-reference' };
  save(path.join(emitted, 'sources.ndjson.manifest.json'), {
    sourcesSha256: sha256(bytes),
    committedCatalog: identity,
  });
  save(path.join(emitted, 'committed-catalog-report.json'), identity);
  assert.throws(
    () => writeCommittedCatalogScoreboard(emitted, census),
    /Identity-only reference output cannot supply a numerical census/,
  );
  fs.writeFileSync(path.join(emitted, 'sources.ndjson'), 'changed');
  assert.throws(
    () => writeCommittedCatalogScoreboard(emitted),
    /SHA-256 mismatch/,
  );
});
