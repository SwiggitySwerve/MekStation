/* Independent insertion facts; never regenerates the legacy BV flag tables. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mapFlags,
  readPinnedWeapons,
  readWeaponCatalog,
} from './weapon-bv-flags.mjs';

export function generate(input, catalog) {
  const facts = readPinnedWeapons(input);
  if (
    Object.values(facts).some(
      (row) => ![0, 1, 2].includes(row.oneShotAmmoMounts),
    )
  )
    throw Error(
      'Regenerate pinned facts with WeaponBVFlags.java for one-shot ammo mounts',
    );
  const mapped = mapFlags(facts, catalog, (row) => row.oneShotAmmoMounts);
  const entries = Object.fromEntries(
    [...mapped.canonical]
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return `// Generated from MegaMek 48fcb2f64; source field: oneShotAmmoMounts.\n// node scripts/equipment-catalog/one-shot-ammo-mounts.mjs <pinned-facts.json> <output.ts> [--check]\n// Entity.java:5120-5175; AmmoType.java:2443-2447. Positive insertion counts only.\nexport const nativeOneShotAmmoMounts: Readonly<Record<string, number>> = ${JSON.stringify(entries, null, 2)};\n`;
}

export function writeOrCheck(output, source, check) {
  if (check) {
    if (fs.readFileSync(output, 'utf8') !== source)
      throw Error(`Generated one-shot ammo mounts are stale: ${output}`);
  } else fs.writeFileSync(output, source);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [input, output, mode] = process.argv.slice(2);
  if (!input || !output || (mode !== undefined && mode !== '--check'))
    throw Error(
      'Expected pinned facts JSON, output TS path and optional --check',
    );
  // Match the repository formatter so --check compares the committed artifact exactly.
  const { spawnSync } = await import('node:child_process');
  const generated = generate(
    JSON.parse(fs.readFileSync(input)),
    readWeaponCatalog(),
  );
  const formatted = spawnSync(
    process.execPath,
    ['node_modules/oxfmt/bin/oxfmt', '--stdin-filepath', output],
    { input: generated, encoding: 'utf8', windowsHide: true },
  );
  if (formatted.status !== 0)
    throw Error(
      formatted.stderr || 'Could not format generated insertion facts',
    );
  writeOrCheck(output, formatted.stdout, mode === '--check');
}
