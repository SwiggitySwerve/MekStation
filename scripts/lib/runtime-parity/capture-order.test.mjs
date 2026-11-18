// The capture's mocks must be registered before any product module loads. The Jest captures cannot be imported by plain
// Node, so this guards the import order in the source: in each runtime-parity module that loads product code, the
// relative ./install-mocks import comes before every `@/` (product) import, and the preview observer has no product
// import of its own (those live in preview-view.js, which sorts after ./install-mocks).
//   node --test scripts/lib/runtime-parity/capture-order.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const importsOf = (file) =>
  [
    ...fs
      .readFileSync(path.join(here, file), 'utf8')
      .matchAll(/^import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gms),
  ].map((m) => m[1]);

test('status-observer imports ./install-mocks before any product module', () => {
  const imports = importsOf('status-observer.js');
  const mocks = imports.indexOf('./install-mocks');
  assert.ok(mocks >= 0, 'status-observer.js imports ./install-mocks');
  assert.deepEqual(
    imports.slice(0, mocks).filter((s) => s.startsWith('@/')),
    [],
  );
});

test('preview-observer imports ./install-mocks first and carries no product import; preview-view sorts after it', () => {
  const imports = importsOf('preview-observer.js');
  assert.equal(imports[0], './install-mocks');
  assert.deepEqual(
    imports.filter((s) => s.startsWith('@/')),
    [],
  );
  // The relative imports sort ./install-mocks < ./preview-view < ./status-observer, so a formatter keeps them in this order.
  const relative = imports.filter((s) => s.startsWith('./'));
  assert.deepEqual(relative, [...relative].sort());
  assert.ok(importsOf('preview-view.js').some((s) => s.startsWith('@/')));
});

test('the install-mocks module is imported by both observers and registers the mechBV calculator probe', () => {
  const source = fs.readFileSync(path.join(here, 'install-mocks.js'), 'utf8');
  assert.match(
    source,
    /jest\.mock\('@\/utils\/construction\/mechBV\/calculator'/,
  );
  assert.match(source, /export const probe/);
});
