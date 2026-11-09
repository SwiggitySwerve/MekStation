import { execFileSync } from 'node:child_process';
/** External input/reference evidence; these checks precede BV calculation. */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

import {
  buildReferenceTrustReport,
  ReferenceTrustMode,
  type IReferenceMismatch,
  type IReferenceTrustReport,
  type IReferenceTrustMode,
} from './unit-bv-reference';

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

const parseJsonLines = (bytes: Buffer): unknown[] =>
  bytes
    .toString('utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as unknown);

export const readJsonLines = (file: string): unknown[] =>
  parseJsonLines(fs.readFileSync(file));

const ReferenceIdentity = z.object({
  megamekCommit: z.string().regex(/^[a-f0-9]{40}$/),
  verifierConfigSha256: digest,
});
export type IReferenceIdentity = z.infer<typeof ReferenceIdentity>;
interface ITrustedReferences {
  rows: unknown[];
  identity: IReferenceIdentity | undefined;
}

/** A separately approved policy must never be inferred from the supplied oracle. */
export function readTrustedReferences(
  reference: string,
  policyFile: string | undefined,
  out: string,
  mode: IReferenceTrustMode | undefined,
  includeIdentity: true,
): ITrustedReferences;
export function readTrustedReferences(
  reference: string,
  policyFile: string | undefined,
  out: string,
  mode?: IReferenceTrustMode,
): unknown[];
export function readTrustedReferences(
  reference: string,
  policyFile: string | undefined,
  out: string,
  mode?: IReferenceTrustMode,
  includeIdentity = false,
): unknown[] | ITrustedReferences {
  const trustMode = ReferenceTrustMode.parse(mode);
  const failures: IReferenceMismatch[] = [];
  const read = (file: string | undefined, field: string): Buffer => {
    try {
      if (file === undefined)
        throw new Error('No independently approved policy supplied');
      return fs.readFileSync(file);
    } catch (error) {
      failures.push({
        field,
        expected: 'readable evidence',
        actual: null,
        reason: String(error),
      });
      return Buffer.alloc(0);
    }
  };
  const bytes = read(reference, 'reference');
  const receipt = read(reference + '.provenance.json', 'referenceProvenance');
  const policy = read(policyFile, 'expectedReference');
  const decode = (input: Buffer, field: string, jsonLines = false): unknown => {
    try {
      return jsonLines
        ? parseJsonLines(input)
        : (JSON.parse(input.toString('utf8')) as unknown);
    } catch (error) {
      failures.push({
        field,
        expected: 'valid JSON evidence',
        actual: null,
        reason: String(error),
      });
      return undefined;
    }
  };
  const rows = decode(bytes, 'reference', true);
  const actual = decode(receipt, 'referenceProvenance');
  const expected = decode(policy, 'expectedReference');
  const references: unknown[] = Array.isArray(rows) ? rows : [];
  const report: IReferenceTrustReport = failures.length
    ? { ok: false, referenceSha256: hash(bytes), mismatches: failures }
    : buildReferenceTrustReport(references, expected, actual, hash(bytes));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, 'reference-provenance-report.json'),
    JSON.stringify(
      {
        ...report,
        mode: trustMode,
        expectedPolicySha256: hash(policy),
        provenanceSha256: hash(receipt),
      },
      null,
      2,
    ) + '\n',
  );
  if (!report.ok) {
    process.stderr.write(
      `Reference provenance violations (${trustMode}): ${JSON.stringify(report.mismatches)}\n`,
    );
    if (trustMode === 'blocking')
      throw new Error(
        `Reference provenance rejected: ${report.mismatches.map((issue) => issue.field).join(', ')}`,
      );
  }
  // Report-only changes trust enforcement, not ordinary reference input validity.
  if (failures.some((issue) => issue.field === 'reference'))
    throw new Error('Reference input could not be read or decoded');
  if (!includeIdentity) return references;
  const identity = z.object({ runtime: ReferenceIdentity }).safeParse(actual);
  // report.ok binds this receipt to the exact reference bytes and independent
  // policy. Report-only violations must never authorize an exclusion.
  return {
    rows: references,
    identity: report.ok && identity.success ? identity.data.runtime : undefined,
  };
}

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
      "import sys,json;from pathlib import Path;sys.path.insert(0,'scripts/megameklab-conversion');from strict_provenance import converter_inputs,write_source_manifest,source_folders;" +
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

export function validateSourceManifest(
  file: string,
  sources: Buffer,
  scope = 'full',
  python = 'python',
  receipt?: Buffer,
): void {
  try {
    const raw: unknown = JSON.parse(
      (receipt ?? fs.readFileSync(file + '.manifest.json')).toString('utf8'),
    );
    const manifest = Manifest.parse(raw);
    if (manifest.scope !== scope)
      throw new Error(
        `Expected ${scope} conversion scope; full-corpus export is required for the external CLI`,
      );
    const rawInputs: unknown = JSON.parse(
      callOwner(
        'print(json.dumps({"inputs":converter_inputs(),"folders":source_folders(sys.argv[1])}))',
        [scope],
        undefined,
        python,
      ),
    );
    const current = z
      .object({
        inputs: z.record(z.string(), digest),
        folders: z.array(z.string()),
      })
      .parse(rawInputs);
    if (JSON.stringify(manifest.folders) !== JSON.stringify(current.folders))
      throw new Error('Conversion folders differ from the declared scope');
    if (manifest.sourcesSha256 !== hash(sources))
      throw new Error('Converted payload hash mismatch');
    const count = sources
      .toString('utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim()).length;
    if (manifest.sourceCount !== count)
      throw new Error('Converted source count mismatch');
    const keys = Object.keys(current.inputs);
    if (
      keys.length !== Object.keys(manifest.converterInputs).length ||
      keys.some((key) => current.inputs[key] !== manifest.converterInputs[key])
    ) {
      throw new Error('Converter implementation or data inputs changed');
    }
  } catch (error) {
    throw new Error(
      `Converted-input provenance rejected: ${String(error)}. Run a fresh strict export with scripts/megameklab-conversion/export_vehicle_aero_json.py <mekfiles> <new-scratch> --strict`,
    );
  }
}
