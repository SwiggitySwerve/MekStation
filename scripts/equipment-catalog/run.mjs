import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { generateEntries, revision } from './generate.mjs';

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const hash = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
const [registryFile, gapsFile, factsFile] = process.argv.slice(2);
if (!factsFile)
  throw Error(
    'Usage: node scripts/equipment-catalog/run.mjs <java-registry.json> <catalog-gaps-by-java.json> <java-facts.json>',
  );
const inputs = [
  registryFile,
  `${registryFile}.lookups.json`,
  gapsFile,
  factsFile,
];
const hashes = read(new URL('./source-pins.json', import.meta.url));
for (const file of inputs) {
  const name = file.replaceAll('\\', '/').split('/').at(-1);
  if (hash(file) !== hashes[name]) throw Error(`Pinned input changed: ${name}`);
}
const root = resolve('public/data/equipment'),
  index = read(`${root}/official/index.json`);
const originals = Object.values(index.files)
  .flatMap(Object.values)
  .filter((file) => !file.endsWith('/java-registry.json'));
const before = originals.flatMap(
  (file) => read(`${root}/official/${file}`).items,
);
const mappings = read(`${root}/name-mappings.json`);
const result = generateEntries(
  read(registryFile),
  read(gapsFile),
  read(factsFile),
  read(`${registryFile}.lookups.json`),
  before,
  {
    ...read(new URL('./protected-aliases.json', import.meta.url)),
    ...mappings,
  },
);
for (const kind of ['weapons', 'ammunition', 'miscellaneous']) {
  const items = result.items
    .filter((item) => item.kind === kind)
    .map((item) => item.entry);
  const schema = {
    weapons: 'weapon',
    ammunition: 'ammunition',
    miscellaneous: 'misc-equipment',
  }[kind];
  write(`${root}/official/${kind}/java-registry.json`, {
    $schema: `../../_schema/${schema}-schema.json`,
    items,
  });
  index.files[kind]['java-registry'] = `${kind}/java-registry.json`;
  index.totalItems[kind] = originals
    .filter((file) => file.startsWith(`${kind}/`))
    .reduce(
      (total, file) => total + read(`${root}/official/${file}`).items.length,
      items.length,
    );
}
write(`${root}/name-mappings.json`, { ...mappings, ...result.aliases });
write(`${root}/official/index.json`, index);
write(new URL('./provenance.json', import.meta.url), {
  revision,
  inputs: hashes,
  identities: result.items.map(({ internalName, entry }) => ({
    internalName,
    id: entry.id,
  })),
});
const format = spawnSync(
  process.execPath,
  [
    'node_modules/oxfmt/bin/oxfmt',
    '--write',
    `${root}/official/index.json`,
    `${root}/name-mappings.json`,
    `${root}/official/**/java-registry.json`,
    'scripts/equipment-catalog/*.json',
  ],
  { stdio: 'inherit', windowsHide: true },
);
if (format.status !== 0) throw Error(`oxfmt failed: ${format.status}`);
