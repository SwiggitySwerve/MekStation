import { execFileSync } from 'node:child_process';
/** External conversion receipts; these checks run before any BV calculation. */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

const hash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const Manifest = z.object({
  version: z.literal(1),
  scope: z.string(),
  folders: z.array(z.string()).min(1),
  sourceCount: z.number().int().nonnegative(),
  sourcesSha256: digest,
  converterInputs: z.record(z.string(), digest),
});

function callOwner(
  code: string,
  args: string[] = [],
  input?: Buffer,
  python = 'python',
): string {
  return execFileSync(
    python,
    [
      '-B',
      '-c',
      "import sys,json;from pathlib import Path;sys.path.insert(0,'scripts/megameklab-conversion');from strict_provenance import converter_inputs,write_source_manifest;" +
        code,
      ...args,
    ],
    {
      cwd: path.resolve(__dirname, '..'),
      input,
      encoding: 'utf8',
      timeout: 30000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
}

/** Trusted producers may publish receipts for bytes they just produced or validated. */
export function writeSourceManifest(
  file: string,
  sources: Buffer,
  folders: readonly string[],
  scope = 'full',
  python = 'python',
): void {
  callOwner(
    'write_source_manifest(Path(sys.argv[1]),json.loads(sys.argv[2]),None if sys.argv[3]=="full" else sys.argv[3],sys.stdin.buffer.read())',
    [path.dirname(path.resolve(file)), JSON.stringify(folders), scope],
    sources,
    python,
  );
}

export function validateSourceManifest(file: string, sources: Buffer): void {
  try {
    const raw: unknown = JSON.parse(
      fs.readFileSync(file + '.manifest.json', 'utf8'),
    );
    const manifest = Manifest.parse(raw);
    const rawInputs: unknown = JSON.parse(
      callOwner('print(json.dumps(converter_inputs()))'),
    );
    const current = z.record(z.string(), digest).parse(rawInputs);
    if (manifest.scope !== 'full')
      throw new Error('A full-corpus export is required');
    if (manifest.sourcesSha256 !== hash(sources))
      throw new Error('Converted payload hash mismatch');
    const count = sources
      .toString('utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim()).length;
    if (manifest.sourceCount !== count)
      throw new Error('Converted source count mismatch');
    const keys = Object.keys(current);
    if (
      keys.length !== Object.keys(manifest.converterInputs).length ||
      keys.some((key) => current[key] !== manifest.converterInputs[key])
    ) {
      throw new Error('Converter implementation or data inputs changed');
    }
  } catch (error) {
    throw new Error(
      `Converted-input provenance rejected: ${String(error)}. Run a fresh strict export with scripts/megameklab-conversion/export_vehicle_aero_json.py <mekfiles> <new-scratch> --strict`,
    );
  }
}
