#!/usr/bin/env node
/** Refresh the audited PPC availability records from pinned MegaMek source.
 * Usage: node scripts/sync-equipment-availability.mjs [--check]
 * Production dates match the catalog's existing introduction-year convention.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const revision = 'fd2edfb36ac4bb06a0aa3fbfbdd38d79b7d62a60';
const sources = [
  {
    id: 'er-ppc',
    path: 'innerSphere/ISERPPC.java',
    advancement: 'IS',
    techBase: 'INNER_SPHERE',
  },
  {
    id: 'enhanced-er-ppc',
    path: 'clan/CLEnhancedPPC.java',
    advancement: 'Clan',
    techBase: 'CLAN',
  },
];
const file = fileURLToPath(
  new URL(
    '../public/data/equipment/official/weapons/energy-ppc.json',
    import.meta.url,
  ),
);
const original = await readFile(file, 'utf8');
const catalog = JSON.parse(original);
let changed = false;
for (const source of sources) {
  const url = `https://raw.githubusercontent.com/MegaMek/megamek/${revision}/megamek/src/megamek/common/weapons/ppc/${source.path}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot read ${url}: ${response.status}`);
  const java = await response.text();
  const match = java.match(
    new RegExp(`\\.set${source.advancement}Advancement\\(([^)]+)\\)`),
  );
  if (!match) throw new Error(`Missing advancement data for ${source.id}`);
  const dates = match[1].split(',').map((value) => value.trim());
  const readYear = (index) => {
    const value = dates[index];
    if (value === 'DATE_NONE') return undefined;
    if (!/^\d{4}$/.test(value ?? ''))
      throw new Error(`Invalid date for ${source.id}: ${value}`);
    return Number(value);
  };
  const item = catalog.items.find((entry) => entry.id === source.id);
  if (!item) throw new Error(`Catalog entry missing: ${source.id}`);
  const updates = {
    introductionYear: readYear(1),
    extinctionYear: readYear(3),
    reintroductionYear: readYear(4),
    techBase: source.techBase,
  };
  for (const [key, value] of Object.entries(updates)) {
    if (item[key] !== value) changed = true;
    if (value === undefined) delete item[key];
    else item[key] = value;
  }
  console.log(`${source.id}: ${JSON.stringify(updates)} (${url})`);
}
if (process.argv.includes('--check')) {
  if (changed)
    throw new Error(
      'Equipment availability differs from pinned source; run without --check',
    );
} else if (changed) {
  await writeFile(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
