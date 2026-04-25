#!/usr/bin/env node
/**
 * generate-zod-schemas.mjs
 *
 * Phase A schema-bridge generator. Reads each equipment-shape JSON Schema
 * under `public/data/equipment/_schema/` and emits a matching Zod module
 * under `src/types/contracts/generated/<name>.zod.ts`.
 *
 * Generated files are committed and never hand-edited. The companion
 * `--check` mode regenerates into a tmp directory and diffs against the
 * committed output, exiting non-zero on drift. The CI `schema-bridge`
 * job runs `--check` to gate Python writers and TS readers against the
 * canonical JSON Schemas.
 *
 * In PR-A1 only the weapon shape is wired through the full pipeline
 * (round-trip tests, loader integration). The remaining 5 shapes are
 * generated for completeness and consumed by PR-A2.
 *
 * Usage:
 *   node scripts/generate-zod-schemas.mjs           # write to src/types/contracts/generated
 *   node scripts/generate-zod-schemas.mjs --check   # diff-only, no writes
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { jsonSchemaToZod } from 'json-schema-to-zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

const SCHEMA_DIR = join(REPO_ROOT, 'public', 'data', 'equipment', '_schema');
const OUTPUT_DIR = join(REPO_ROOT, 'src', 'types', 'contracts', 'generated');

// PR-A1 ships only the weapon shape through to consumers; the other
// shapes still get generated so PR-A2 can wire them with a single edit
// to the contracts barrel.
const SHAPES = [
  { file: 'weapon-schema.json', stem: 'weapon', exportName: 'WeaponContract' },
  { file: 'unit-schema.json', stem: 'unit', exportName: 'UnitContract' },
  { file: 'ammunition-schema.json', stem: 'ammunition', exportName: 'AmmunitionContract' },
  { file: 'electronics-schema.json', stem: 'electronics', exportName: 'ElectronicsContract' },
  { file: 'misc-equipment-schema.json', stem: 'misc-equipment', exportName: 'MiscEquipmentContract' },
  { file: 'physical-weapon-schema.json', stem: 'physical-weapon', exportName: 'PhysicalWeaponContract' },
];

const HEADER = (sourceRel) => `// @generated — do not edit; run \`npm run schema:gen\` to regenerate.
// Source: ${sourceRel}
// Regeneration: \`node scripts/generate-zod-schemas.mjs\` (see \`scripts/generate-zod-schemas.mjs\`).
//
// PR-A1 ships only the weapon shape through round-trip tests + loader
// validation; PR-A2 wires the rest. The schema-bridge CI job verifies
// these files match the JSON Schema source via \`--check\` mode.
`;

function generateOne(shape) {
  const sourcePath = join(SCHEMA_DIR, shape.file);
  const sourceRel = `public/data/equipment/_schema/${shape.file}`;
  const json = JSON.parse(readFileSync(sourcePath, 'utf-8'));
  // Use ESM module output and emit a named export plus an inferred type.
  const body = jsonSchemaToZod(json, {
    module: 'esm',
    name: shape.exportName,
    type: true,
  });
  return HEADER(sourceRel) + '\n' + body;
}

function writeAll(targetDir) {
  mkdirSync(targetDir, { recursive: true });
  const written = [];
  for (const shape of SHAPES) {
    const out = generateOne(shape);
    const outPath = join(targetDir, `${shape.stem}.zod.ts`);
    writeFileSync(outPath, out, 'utf-8');
    written.push(outPath);
  }
  // Run oxfmt across the freshly written files so the on-disk output
  // matches `npm run format:check` and stays stable across re-runs.
  // Without this, write-mode and check-mode disagree (write produces
  // raw `json-schema-to-zod` output; check then hits a phantom drift
  // because committed files were formatted).
  formatFiles(written);
  return written;
}

function formatFiles(paths) {
  if (paths.length === 0) return;
  // Use the local oxfmt binary. On Windows the npm shim is `oxfmt.cmd`,
  // which `spawnSync` cannot launch directly without `shell: true`
  // (EINVAL on Node 20+). Pass the directory so oxfmt walks recursively.
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'oxfmt.cmd' : 'oxfmt';
  const binPath = join(REPO_ROOT, 'node_modules', '.bin', binName);
  // All `paths` share the same parent directory by construction.
  const dir = dirname(paths[0]);
  const result = spawnSync(binPath, ['--write', dir], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: isWin,
  });
  if (result.status !== 0) {
    console.error('schema-bridge: oxfmt failed; output may be unformatted.');
    process.exit(result.status ?? 1);
  }
}

function checkMode() {
  const tmp = join(tmpdir(), `schema-bridge-${process.pid}-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  try {
    writeAll(tmp);
    let drift = 0;
    for (const shape of SHAPES) {
      const fileName = `${shape.stem}.zod.ts`;
      const expectedPath = join(OUTPUT_DIR, fileName);
      const actualPath = join(tmp, fileName);
      let expected = '';
      try {
        expected = readFileSync(expectedPath, 'utf-8');
      } catch {
        console.error(`MISSING committed file: src/types/contracts/generated/${fileName}`);
        drift++;
        continue;
      }
      const actual = readFileSync(actualPath, 'utf-8');
      if (expected !== actual) {
        console.error(`DRIFT in src/types/contracts/generated/${fileName}`);
        // Emit a tiny first-difference excerpt to help the CI log.
        const eLines = expected.split('\n');
        const aLines = actual.split('\n');
        const max = Math.min(eLines.length, aLines.length);
        for (let i = 0; i < max; i++) {
          if (eLines[i] !== aLines[i]) {
            console.error(`  line ${i + 1}:`);
            console.error(`    committed: ${eLines[i]}`);
            console.error(`    generated: ${aLines[i]}`);
            break;
          }
        }
        drift++;
      }
    }
    if (drift > 0) {
      console.error(
        `\nschema-bridge: ${drift} file(s) out of sync with JSON Schema source.\n` +
          'Run `npm run schema:gen` and commit the result.',
      );
      process.exit(1);
    }
    console.log('schema-bridge: generated Zod matches committed.');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function writeMode() {
  const written = writeAll(OUTPUT_DIR);
  console.log(`schema-bridge: wrote ${written.length} file(s):`);
  for (const p of written) console.log(`  ${p.replace(REPO_ROOT, '').replace(/\\/g, '/')}`);
}

const args = process.argv.slice(2);
if (args.includes('--check')) {
  checkMode();
} else {
  writeMode();
}
