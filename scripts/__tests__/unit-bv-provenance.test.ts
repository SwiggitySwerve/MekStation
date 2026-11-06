import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  validateSourceManifest,
  writeSourceManifest,
} from '../unit-bv-provenance';
import { main } from '../vehicle-aero-bv-delta';

it('refuses an unversioned converted payload even when its source hash still matches', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-stale-'));
  const argv = process.argv;
  const exitCode = process.exitCode;
  const stdout = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
  try {
    fs.mkdirSync(path.join(root, 'meks'));
    const source = 'Cockpit:Industrial\n';
    fs.writeFileSync(path.join(root, 'meks/unit.mtf'), source);
    // The native source is unchanged; an older converter lost the cockpit field.
    fs.writeFileSync(
      path.join(root, 'sources.ndjson'),
      JSON.stringify({
        path: 'meks/unit.mtf',
        sha256: createHash('sha256').update(source).digest('hex'),
        unit: { cockpit: 'STANDARD' },
      }) + '\n',
    );
    fs.writeFileSync(path.join(root, 'oracle.jsonl'), '');
    process.argv = [
      'node',
      'comparator',
      '--converted',
      path.join(root, 'sources.ndjson'),
      '--mekfiles',
      root,
      '--reference',
      path.join(root, 'oracle.jsonl'),
      '--out',
      path.join(root, 'report'),
    ];
    expect(() => main()).toThrow(/fresh strict export/i);
    expect(fs.existsSync(path.join(root, 'report'))).toBe(false);
  } finally {
    process.argv = argv;
    process.exitCode = exitCode;
    stdout.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it('accepts a real Python receipt and rejects stale converter bytes, payload changes and family subsets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-receipt-'));
  try {
    fs.mkdirSync(path.join(root, 'meks'));
    fs.writeFileSync(path.join(root, 'meks/unit.mtf'), 'Cockpit:Industrial\n');
    const out = path.join(root, 'out');
    execFileSync(
      'python',
      [
        '-B',
        'scripts/megameklab-conversion/export_vehicle_aero_json.py',
        root,
        out,
        '--strict',
      ],
      { timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const file = path.join(out, 'sources.ndjson');
    const bytes = fs.readFileSync(file);
    const manifestFile = file + '.manifest.json';
    const originalReceipt = fs.readFileSync(manifestFile);
    const receipt: {
      converterInputs: Record<string, string>;
      scope: string;
      sourceCount: number;
    } = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    expect(() => validateSourceManifest(file, bytes)).not.toThrow();
    // The trusted pipeline wrapper calls the same writer as the Python exporter.
    const fullReceipt: { folders: string[] } = JSON.parse(
      originalReceipt.toString('utf8'),
    );
    writeSourceManifest(file, bytes, fullReceipt.folders);
    expect(fs.readFileSync(manifestFile)).toEqual(originalReceipt);
    expect(() =>
      validateSourceManifest(file, Buffer.concat([bytes, Buffer.from('\n')])),
    ).toThrow(/payload hash mismatch/);
    fs.writeFileSync(
      manifestFile,
      JSON.stringify({ ...receipt, scope: 'battlemechs' }),
    );
    expect(() => validateSourceManifest(file, bytes)).toThrow(
      /full-corpus export/,
    );
    fs.writeFileSync(
      manifestFile,
      JSON.stringify({ ...receipt, sourceCount: 2 }),
    );
    expect(() => validateSourceManifest(file, bytes)).toThrow(
      /source count mismatch/,
    );
    fs.writeFileSync(
      manifestFile,
      JSON.stringify({
        ...receipt,
        converterInputs: {
          ...receipt.converterInputs,
          'scripts/megameklab-conversion/mtf_parser.py': '0'.repeat(64),
        },
      }),
    );
    expect(() => validateSourceManifest(file, bytes)).toThrow(
      /implementation or data inputs changed/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
