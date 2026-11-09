import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import source from './allowed-unit-types-source.json' with { type: 'json' };
import { revision } from './generate.mjs';
import { assertPinnedInputs } from './vehicle-slots.mjs';

/** Plan the approved field additions before writing any catalog or baseline. */
export function planUnitTypeUpdates(manifest, facts, documents, baseline) {
  assert.equal(manifest.revision, revision, 'Wrong Java revision');
  assert(manifest.entries.length > 0, 'Empty applicability manifest');
  const updated = structuredClone(documents);
  const frozen = structuredClone(baseline);
  const ids = new Set();
  const changed = [];
  for (const entry of manifest.entries) {
    const { id, file, javaNames, allowedUnitTypes } = entry;
    assert(!ids.has(id), `Duplicate approved id: ${id}`);
    ids.add(id);
    assert(
      /^(weapons|electronics)\/[a-z0-9-]+\.json$/.test(file),
      `Unapproved catalog path: ${file}`,
    );
    assert(allowedUnitTypes.length > 0, `Held empty list: ${id}`);
    assert(javaNames.length > 0, `Missing Java identity: ${id}`);
    for (const name of javaNames) {
      const fact = facts[name];
      assert.equal(fact?.kind, 'weapons', `Not a pinned WeaponType: ${name}`);
      assert.deepEqual(
        fact.allowedUnitTypes,
        allowedUnitTypes,
        `Conflicting pinned flags: ${name}`,
      );
    }
    const items = updated.get(file)?.items;
    assert(items, `Missing catalog file: ${file}`);
    const matches = items.flatMap((item, index) =>
      item.id === id ? [index] : [],
    );
    assert.equal(matches.length, 1, `Missing or ambiguous catalog id: ${id}`);
    const index = matches[0];
    const before = documents.get(file).items[index];
    const rows = frozen.filter((row) => row.file === file && row.id === id);
    assert.equal(rows.length, 1, `Missing or ambiguous baseline: ${id}`);
    const row = rows[0];
    assert.equal(row.index, index, `Moved baseline: ${id}`);
    assert.deepEqual(row.item, before, `Stale baseline: ${id}`);
    assert.equal(
      row.sha256,
      hash('sha256', JSON.stringify(before)),
      `Invalid baseline hash: ${id}`,
    );
    if (Object.hasOwn(before, 'allowedUnitTypes')) {
      assert.deepEqual(before.allowedUnitTypes, allowedUnitTypes, id);
      continue;
    }
    // The extractor owns the array; the manifest authorizes its identity only.
    const after = {
      ...before,
      allowedUnitTypes: facts[javaNames[0]].allowedUnitTypes,
    };
    items[index] = after;
    row.item = after;
    row.sha256 = hash('sha256', JSON.stringify(after));
    changed.push(id);
  }
  return { documents: updated, baseline: frozen, changed };
}

/** Append the field without reserializing existing inline ranges or slot facts. */
export function appendUnitTypeField(text, id, flags) {
  const marker = `\n      "id": ${JSON.stringify(id)},`;
  const start = text.indexOf(marker);
  assert(
    start >= 0 && text.indexOf(marker, start + 1) < 0,
    `Ambiguous item: ${id}`,
  );
  const end = text.indexOf('\n    }', start);
  assert(end >= 0, `Missing item end: ${id}`);
  return `${text.slice(0, end)},\n      "allowedUnitTypes": ${JSON.stringify(flags)}${text.slice(end)}`;
}

export function updateBaselineText(text, before, after, flags) {
  const marker = `\n    "file": ${JSON.stringify(before.file)},\n    "index": ${before.index},\n    "id": ${JSON.stringify(before.id)},`;
  const start = text.indexOf(marker);
  assert(start >= 0, `Missing baseline row: ${before.file}:${before.id}`);
  const end = text.indexOf('\n  }', start);
  assert(end >= 0, `Missing baseline row end: ${before.id}`);
  const block = appendUnitTypeField(text.slice(start, end), before.id, flags);
  const oldHash = `"sha256": "${before.sha256}"`;
  assert(block.includes(oldHash), `Missing baseline hash: ${before.id}`);
  return (
    text.slice(0, start) +
    block.replace(oldHash, `"sha256": "${after.sha256}"`) +
    text.slice(end)
  );
}

function main() {
  const [factsFile] = process.argv.slice(2);
  assert(factsFile, 'Usage: allowed-unit-types.mjs <pinned-java-facts.json>');
  assertPinnedInputs([factsFile], {
    [basename(factsFile)]: source.factsSha256,
  });
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const root = resolve('public/data/equipment/official');
  const documents = new Map(
    [...new Set(source.entries.map((entry) => entry.file))].map((file) => [
      file,
      read(resolve(root, file)),
    ]),
  );
  const baselineFile = new URL('./baseline.json', import.meta.url);
  const baseline = read(baselineFile);
  const plan = planUnitTypeUpdates(
    source,
    read(factsFile),
    documents,
    baseline,
  );
  const output = new Map();
  let frozenText = readFileSync(baselineFile, 'utf8');
  for (const id of plan.changed) {
    const entry = source.entries.find((row) => row.id === id);
    const file = resolve(root, entry.file);
    output.set(
      file,
      appendUnitTypeField(
        output.get(file) ?? readFileSync(file, 'utf8'),
        id,
        entry.allowedUnitTypes,
      ),
    );
    const oldRow = baseline.find(
      (row) => row.file === entry.file && row.id === id,
    );
    const newRow = plan.baseline.find(
      (row) => row.file === entry.file && row.id === id,
    );
    frozenText = updateBaselineText(
      frozenText,
      oldRow,
      newRow,
      entry.allowedUnitTypes,
    );
  }
  // Verify every rendered file before the first write, including field ordering.
  for (const [file, text] of output) {
    const relative = file.slice(root.length + 1).replaceAll('\\', '/');
    assert.equal(
      JSON.stringify(JSON.parse(text)),
      JSON.stringify(plan.documents.get(relative)),
    );
  }
  assert.equal(
    JSON.stringify(JSON.parse(frozenText)),
    JSON.stringify(plan.baseline),
  );
  for (const [file, text] of output) writeFileSync(file, text);
  if (plan.changed.length) writeFileSync(baselineFile, frozenText);
  console.log(
    JSON.stringify({ changed: plan.changed, catalogFiles: output.size }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
