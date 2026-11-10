import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';

import {
  appendCatalogField,
  updateBaselineText,
} from './allowed-unit-types.mjs';

const { TechnologyAdvancementsContract } = tsxRequire(
  '../../src/types/contracts/generated/technology-advancements.zod.ts',
  import.meta.url,
);
const { WeaponContract } = tsxRequire(
  '../../src/types/contracts/generated/weapon.zod.ts',
  import.meta.url,
);
const namesContract = WeaponContract.shape.nativeTechnologyNames.unwrap();
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const { goalPins } = read(
  new URL('../../config/reference-policy/derivation.json', import.meta.url),
);
const field = 'nativeTechnologyNames';
const sha = (value) => hash('sha256', value);
const itemHash = (item) => sha(JSON.stringify(item));
const validateFacts = (facts) => TechnologyAdvancementsContract.parse(facts);

function assertCatalogPath(file) {
  assert(
    /^(weapons|ammunition|electronics|miscellaneous)\/[a-z0-9-]+\.json$/.test(
      file,
    ),
    `Unapproved catalog path: ${file}`,
  );
}

/** Verify exact extraction bytes against the receipt, not a reserialized map. */
export function verifyTechnologyExtraction(bytes, receipt, producer) {
  assert.equal(receipt.revision, goalPins.megamek, 'Wrong Java revision');
  assert.equal(sha(producer), receipt.extractorSha256, 'Changed Java producer');
  assert.equal(sha(bytes), receipt.factsSha256, 'Invalid extraction hash');
  return validateFacts(JSON.parse(bytes.toString('utf8')));
}

function requireNames(item, facts) {
  const names = namesContract.parse(item[field]);
  for (const name of names)
    assert(Object.hasOwn(facts, name), `Missing native fact: ${name}`);
  return names;
}

/** Pure scratch planner. Identity approval/release is deliberately outside G1. */
export function planTechnologyUpdates(
  manifest,
  facts,
  documents,
  baseline,
  sidecar = {},
) {
  assert.equal(manifest.revision, goalPins.megamek, 'Wrong Java revision');
  assert(
    Array.isArray(manifest.entries) && manifest.entries.length > 0,
    'Empty technology manifest',
  );
  validateFacts(facts);
  if (Object.keys(sidecar).length) validateFacts(sidecar);
  const updated = structuredClone(documents),
    frozen = structuredClone(baseline);
  const shared = structuredClone(sidecar),
    seen = new Set(),
    changed = [];
  for (const entry of manifest.entries) {
    const { file, index, id } = entry;
    assertCatalogPath(file);
    assert(
      Number.isSafeInteger(index) && index >= 0,
      `Invalid identity index: ${id}`,
    );
    const key = `${file}:${index}:${id}`;
    assert(!seen.has(key), `Duplicate binding: ${key}`);
    seen.add(key);
    const names = requireNames(entry, facts);
    const items = updated.get(file)?.items;
    assert(
      items &&
        items[index]?.id === id &&
        items.filter((item) => item.id === id).length === 1,
      `Missing or ambiguous catalog identity: ${key}`,
    );
    const before = documents.get(file).items[index];
    const rows = frozen.filter((row) => row.file === file && row.id === id);
    assert.equal(rows.length, 1, `Missing or ambiguous baseline: ${key}`);
    const row = rows[0];
    assert.equal(row.index, index, `Moved baseline: ${key}`);
    assert.deepEqual(row.item, before, `Stale baseline: ${key}`);
    assert.equal(row.sha256, itemHash(before), `Invalid baseline hash: ${key}`);
    for (const name of names) {
      if (Object.hasOwn(shared, name))
        assert.deepEqual(
          shared[name],
          facts[name],
          `Conflicting shared fact: ${name}`,
        );
      else
        Object.defineProperty(shared, name, {
          value: structuredClone(facts[name]),
          enumerable: true,
          writable: true,
          configurable: true,
        });
    }
    if (Object.hasOwn(before, field)) {
      assert.deepEqual(
        before[field],
        names,
        `Conflicting native binding: ${key}`,
      );
      continue;
    }
    const after = { ...before, [field]: names };
    items[index] = after;
    row.item = after;
    row.sha256 = itemHash(after);
    changed.push({ file, index, id });
  }
  // Existing bindings must remain resolvable, including records outside this batch.
  for (const { items } of updated.values())
    for (const item of items)
      if (Object.hasOwn(item, field)) requireNames(item, shared);
  return {
    documents: updated,
    baseline: frozen,
    sidecar: Object.fromEntries(
      Object.entries(shared).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ),
    changed,
  };
}

/** Render every output in memory; compare full preimages before any future apply. */
export function renderTechnologyUpdates(input, plan, texts, baselineText) {
  assert.deepEqual(
    JSON.parse(baselineText),
    input.baseline,
    'Stale baseline text preimage',
  );
  const output = new Map(texts);
  for (const [file, document] of input.documents)
    assert.deepEqual(
      JSON.parse(texts.get(file)),
      document,
      `Stale catalog text preimage: ${file}`,
    );
  let frozen = baselineText;
  for (const { file, index, id } of plan.changed) {
    const before = input.baseline.find(
      (row) => row.file === file && row.index === index && row.id === id,
    );
    const after = plan.baseline.find(
      (row) => row.file === file && row.index === index && row.id === id,
    );
    const names = after.item[field];
    output.set(file, appendCatalogField(output.get(file), id, field, names));
    frozen = updateBaselineText(frozen, before, after, names, field);
  }
  for (const [file, text] of output)
    assert.deepEqual(
      JSON.parse(text),
      plan.documents.get(file),
      `Invalid catalog rendering: ${file}`,
    );
  assert.deepEqual(
    JSON.parse(frozen),
    plan.baseline,
    'Invalid baseline rendering',
  );
  return { documents: output, baseline: frozen };
}

/** Full regeneration must preserve published references, or fail before writing. */
export function retainNativeTechnologyReferences(generated, documents, facts) {
  const metadata = [...documents].flatMap(([file, { items }]) =>
    items
      .filter((item) => Object.hasOwn(item, field))
      .map((item) => ({ file, item })),
  );
  if (!metadata.length) return generated;
  assert(
    facts,
    'Native technology metadata requires verified extraction facts',
  );
  validateFacts(facts);
  const result = structuredClone(generated);
  for (const { file, item } of metadata) {
    const names = requireNames(item, facts);
    if (!file.endsWith('/java-registry.json')) continue;
    const matches = result.filter(
      (row) =>
        `${row.kind}/java-registry.json` === file && row.entry.id === item.id,
    );
    assert.equal(
      matches.length,
      1,
      `Native metadata would be lost: ${file}:${item.id}`,
    );
    const target = matches[0].entry;
    if (Object.hasOwn(target, field))
      assert.deepEqual(
        target[field],
        names,
        `Conflicting regenerated binding: ${item.id}`,
      );
    else target[field] = structuredClone(names);
  }
  return result;
}

function main() {
  const [mode, manifestFile, factsFile] = process.argv.slice(2);
  assert(
    ['--plan', '--check'].includes(mode) && factsFile,
    'Usage: technology-advancement.mjs <--plan|--check> <scratch-manifest.json> <extraction.json>',
  );
  const source = read(
    new URL('./technology-advancement-source.json', import.meta.url),
  );
  assert.equal(
    source.status,
    'unreleased',
    'Review the released apply contract before writing data',
  );
  const facts = verifyTechnologyExtraction(
    readFileSync(factsFile),
    read(new URL('./technology-advancement-provenance.json', import.meta.url)),
    readFileSync(new URL('./TechnologyAdvancementFacts.java', import.meta.url)),
  );
  const manifest = read(manifestFile);
  // Validate all paths before reading any path supplied by the scratch manifest.
  for (const { file } of manifest.entries) assertCatalogPath(file);
  const root = new URL(
    '../../public/data/equipment/official/',
    import.meta.url,
  );
  const texts = new Map(
    [...new Set(manifest.entries.map((row) => row.file))].map((file) => [
      file,
      readFileSync(new URL(file, root), 'utf8'),
    ]),
  );
  const documents = new Map(
    [...texts].map(([file, text]) => [file, JSON.parse(text)]),
  );
  const baselineText = readFileSync(
    new URL('./baseline.json', import.meta.url),
    'utf8',
  );
  const sidecarPath = new URL(
    '../../public/data/equipment/technology-advancements.json',
    import.meta.url,
  );
  let sidecar = {};
  try {
    sidecar = read(sidecarPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const input = { documents, baseline: JSON.parse(baselineText) };
  const plan = planTechnologyUpdates(
    manifest,
    facts,
    documents,
    input.baseline,
    sidecar,
  );
  renderTechnologyUpdates(input, plan, texts, baselineText);
  if (mode === '--check') {
    assert.equal(plan.changed.length, 0, 'Catalog references are not current');
    assert.deepEqual(plan.sidecar, sidecar, 'Sidecar is not current');
  }
  // This command never writes catalogs, baseline, or sidecar. D releases own apply.
  process.stdout.write(
    JSON.stringify({
      status: 'scratch-plan-only',
      changed: plan.changed,
      nativeFacts: Object.keys(plan.sidecar).length,
    }) + '\n',
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
