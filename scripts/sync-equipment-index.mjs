#!/usr/bin/env node
/** Recount the existing equipment index; preserve its file map and provenance. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const mode = process.argv[2] ?? '--check';
assert.ok(
  process.argv.length <= 3 && ['--check', '--write'].includes(mode),
  'Usage: node scripts/sync-equipment-index.mjs [--check|--write]',
);
const directory = new URL(
  '../public/data/equipment/official/',
  import.meta.url,
);
const indexPath = new URL('index.json', directory);
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const counts = {};
for (const [group, files] of Object.entries(index.files)) {
  let count = 0;
  for (const [kind, relativePath] of Object.entries(files)) {
    // The existing index counts ranged weapons; physical weapons are separate
    // in the combat catalog contract despite sharing the weapons directory.
    if (group === 'weapons' && kind === 'physical') continue;
    const catalog = JSON.parse(
      readFileSync(new URL(relativePath, directory), 'utf8'),
    );
    assert.ok(Array.isArray(catalog.items), `${relativePath}: missing items`);
    count += catalog.items.length;
  }
  counts[group] = count;
}
if (JSON.stringify(index.totalItems) !== JSON.stringify(counts)) {
  if (mode === '--check') {
    console.error('Equipment index counts are stale:', counts);
    process.exitCode = 1;
  } else {
    index.totalItems = counts;
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  }
}
