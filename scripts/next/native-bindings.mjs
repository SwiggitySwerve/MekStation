import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Fixture-only escape hatch: hydrate tests build images from fake bindings.
// No workflow or package script may set it (asserted in native-bindings.test.ts).
export const NATIVE_CHECK_SKIP_ENV =
  'MEKSTATION_FIXTURE_SKIP_NATIVE_LOAD_CHECK';

/** Every `*.node` binding under root, without following links. */
export function findNativeBindings(root) {
  const found = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.node')) found.push(file);
    }
  }
  visit(root);
  return found.sort();
}

/**
 * Load each binding in a child Node process. A binding that ships without its
 * shared libraries (for example sharp without libvips, PARITY-PLAN 1.0.53)
 * fails here instead of silently at runtime.
 */
export function nativeLoadFailures(root, files = findNativeBindings(root)) {
  const failures = [];
  for (const file of files) {
    const result = spawnSync(
      process.execPath,
      ['-e', 'process.dlopen({ exports: {} }, process.argv[1])', file],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) {
      const message = `${result.stderr ?? ''}${result.error?.message ?? ''}`
        .split('\n')
        .find((line) => /error/i.test(line));
      failures.push({ file, error: (message ?? 'load failed').trim() });
    }
  }
  return failures;
}

/** Throw naming every binding under root that cannot load on this platform. */
export function assertNativeBindingsLoad(root) {
  const failures = nativeLoadFailures(root);
  if (failures.length > 0) {
    throw new Error(
      [
        `Native bindings that cannot load on ${process.platform}-${process.arch}:`,
        ...failures.map(
          ({ file, error }) => `  ${path.relative(root, file)}: ${error}`,
        ),
      ].join('\n'),
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const root = path.resolve(process.argv[2] ?? '.next/standalone');
  const files = findNativeBindings(root);
  assertNativeBindingsLoad(root);
  console.log(`native bindings load: ${files.length} under ${root}`);
}
