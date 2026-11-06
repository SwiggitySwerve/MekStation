import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const official = 'public/data/equipment/official';

function assertIgnored(path, expected) {
  const result = spawnSync(
    'git',
    ['check-ignore', '--no-index', '-q', '--', path],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, expected ? 0 : 1, `${path}: ${result.stderr}`);
}

test('tracked electronics catalogs support ordinary Git restaging', () => {
  const paths = ['active-probe', 'c3', 'ecm', 'other'].map((name) =>
    resolve(root, official, 'electronics', `${name}.json`),
  );
  const result = spawnSync('git', ['add', '--dry-run', '--', ...paths], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('electronics is traversable while unreviewed contents remain ignored', () => {
  assertIgnored(`${official}/electronics`, false);
  for (const path of [
    'arbitrary-unreviewed.json',
    'nested/output.json',
    'java-registry.json',
    'c3.json',
  ]) {
    assertIgnored(`${official}/electronics/${path}`, true);
  }
});

test('existing generator exceptions and artifact exclusions remain narrow', () => {
  for (const category of ['ammunition', 'miscellaneous', 'weapons']) {
    assertIgnored(`${official}/${category}/java-registry.json`, false);
    assertIgnored(`${official}/${category}/arbitrary-unreviewed.json`, true);
  }
  for (const path of [
    'public/data/equipment/registry-routing.json',
    'public/data/equipment/_schema/unit-schema.json',
    'docs/data/portable-source-provenance.md',
  ]) {
    assertIgnored(path, false);
  }
  for (const path of [
    `${official}/arbitrary-unreviewed.json`,
    `${official}/unreviewed/output.json`,
    'public/data/equipment/_schema/arbitrary-unreviewed.json',
    '.next/ignore-hygiene-probe.json',
    'node_modules/ignore-hygiene-probe.json',
  ]) {
    assertIgnored(path, true);
  }
});
