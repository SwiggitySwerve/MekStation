/** Full strict corpus runner: bounded family work, disposable cache, one authoritative report. */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';

import families from './megameklab-conversion/strict-families.json';
import { decodeComputedRows } from './unit-bv-artifacts';
import { boundedMap, fingerprint, runCachedFamily } from './unit-bv-execution';
import { runCommand } from './unit-bv-family-worker';
import {
  validateSourceManifest,
  writeSourceManifest,
  readTrustedReferences,
} from './unit-bv-provenance';
import {
  ReferenceTrustMode,
  type IReferenceTrustMode,
} from './unit-bv-reference';
import {
  buildDeltaReport,
  FAMILIES,
  JavaReference,
  writeDeltaReport,
  type IComputedRow,
} from './vehicle-aero-bv-delta';

interface IPipelineOptions {
  mekfiles: string;
  reference: string;
  referencePolicy?: string;
  referenceTrust?: IReferenceTrustMode;
  out: string;
  python: string;
  workers: number;
  cacheDir?: string;
  verifyHits: number;
  uncached: boolean;
  perTerm: boolean;
}

function runtimeKey(python: string): string | null {
  try {
    // Include the actual Python interpreter and loaded stdlib/extensions, not just its version.
    return execFileSync(
      python,
      [
        '-B',
        '-c',
        "import sys,json,hashlib;from pathlib import Path;sys.path.insert(0,'scripts/megameklab-conversion');import export_vehicle_aero_json,blk_capital_converter,mtf_converter;files=sorted(set([sys.executable]+[f for m in list(sys.modules.values()) for f in [getattr(m,'__file__',None),getattr(m,'__cached__',None)] if f and Path(f).exists()]));print(json.dumps([sys.version,sys.path,[(f,hashlib.sha256(Path(f).read_bytes()).hexdigest()) for f in files]]))",
      ],
      {
        encoding: 'utf8',
        timeout: 30000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch {
    return null;
  }
}

function requireScratch(directory: string): void {
  const protectedData = fs.realpathSync(path.resolve('public/data'));
  // Resolve existing ancestors to see through output junctions before writing anything.
  let ancestor = path.resolve(directory);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realAncestor = fs.realpathSync(ancestor);
  const relative = path.relative(protectedData, realAncestor);
  if (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
    throw new Error(
      'export output must be a scratch directory, not under public/data',
    );
}

export async function runPipeline(options: IPipelineOptions): Promise<boolean> {
  const deadline = Date.now() + 780000;
  const { mekfiles, reference, out, python } = options;
  if (!Number.isInteger(options.verifyHits) || options.verifyHits < 0)
    throw new Error('verify-hits must be a non-negative integer');
  if (
    JSON.stringify(Object.keys(families).sort()) !==
    JSON.stringify([...FAMILIES].sort())
  )
    throw new Error('Family manifest differs from comparator');
  requireScratch(out);
  if (options.cacheDir) requireScratch(options.cacheDir);
  const refs = readTrustedReferences(
    reference,
    options.referencePolicy,
    out,
    options.referenceTrust,
  ).map((row) => JavaReference.parse(row));
  const cacheEnabled =
    Boolean(options.cacheDir) &&
    !options.uncached &&
    !['push', 'schedule'].includes(process.env.GITHUB_EVENT_NAME ?? '');
  // Custom loaders/import roots can hide inputs outside the audited runtime.
  const runtimeKnown =
    !['NODE_OPTIONS', 'NODE_PATH', 'PYTHONPATH', 'PYTHONHOME'].some(
      (key) => process.env[key],
    ) &&
    JSON.stringify(process.execArgv) ===
      JSON.stringify(['--require', 'tsx/cjs']);
  const pythonIdentity =
    cacheEnabled && runtimeKnown ? runtimeKey(python) : null;
  const environment = Object.fromEntries(
    Object.entries(process.env)
      .filter(([key]) => !key.startsWith('HEAVY_'))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const inputs = [
    'src',
    'scripts',
    'public/data/equipment',
    'config',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next.config.ts',
    reference,
    process.execPath,
    ...Object.keys(require.cache),
    ...new Set(
      Object.keys(require.cache)
        .filter((file) => file.includes('node_modules'))
        .map((file) => {
          // Include package binaries and lazily loaded files as well as loaded JS.
          const parts = file.split(path.sep);
          const boundary = parts.lastIndexOf('node_modules') + 1;
          return parts
            .slice(0, boundary + (parts[boundary].startsWith('@') ? 2 : 1))
            .join(path.sep);
        }),
    ),
  ];
  const sharedKey = pythonIdentity
    ? fingerprint(inputs, {
        version: 1,
        pythonIdentity,
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        environment,
      })
    : null;
  fs.mkdirSync(out, { recursive: true });
  const working = fs.mkdtempSync(path.join(out, '.families-'));
  try {
    let verified = 0;
    const results = await boundedMap(
      Object.entries(families),
      options.workers,
      async ([family, folders]) => {
        const key = sharedKey
          ? fingerprint(
              folders.map((folder) => path.join(mekfiles, folder)),
              sharedKey,
            )
          : null;
        // Deterministic sample; every cache hit is checked by the full strict report below.
        const verify = () => verified++ < options.verifyHits;
        const result = await runCachedFamily({
          cacheDir: cacheEnabled ? options.cacheDir : undefined,
          family,
          key,
          verify,
          validate: ({ sources, manifest }) => {
            if (!manifest) throw new Error(`Missing family receipt: ${family}`);
            validateSourceManifest(
              'cached-family',
              sources,
              family,
              python,
              manifest,
            );
          },
          produce: async () => {
            const familyOut = path.join(working, family);
            await runCommand(
              process.execPath,
              [
                '--require',
                'tsx/cjs',
                'scripts/unit-bv-family-worker.ts',
                family,
                mekfiles,
                familyOut,
                python,
              ],
              Math.max(1, deadline - Date.now()),
            );
            return {
              sources: fs.readFileSync(path.join(familyOut, 'sources.ndjson')),
              computed: fs.readFileSync(path.join(familyOut, 'computed.bin')),
              manifest: fs.readFileSync(
                path.join(familyOut, 'sources.ndjson.manifest.json'),
              ),
            };
          },
        });
        return { family, ...result };
      },
    );
    const sources = Buffer.concat(
      results.map((result) => result.artifacts.sources),
    );
    fs.writeFileSync(path.join(out, 'sources.ndjson'), sources);
    const computed: IComputedRow[] = results.flatMap((result) => {
      // Cache bytes are integrity-checked; source/computation correspondence is checked independently.
      const rows: unknown = decodeComputedRows(result.artifacts.computed);
      const sourceRows: unknown[] = result.artifacts.sources
        .toString('utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as unknown);
      if (
        !Array.isArray(rows) ||
        rows.length !== sourceRows.length ||
        rows.some((row: unknown, index: number) => {
          if (typeof row !== 'object' || row === null) return true;
          const source = sourceRows[index];
          if (
            typeof source !== 'object' ||
            source === null ||
            !('path' in source) ||
            !('sha256' in source)
          )
            return true;
          return (
            !('path' in row) ||
            !('sha256' in row) ||
            row.path !== source.path ||
            row.sha256 !== source.sha256
          );
        })
      )
        throw new Error(`Invalid computed family: ${result.family}`);
      return rows as IComputedRow[];
    });
    writeSourceManifest(
      path.join(out, 'sources.ndjson'),
      sources,
      Object.values(families).flat(),
      'full',
      python,
    );
    const report = buildDeltaReport(computed, refs, undefined, options.perTerm);
    writeDeltaReport(report, out);
    fs.writeFileSync(
      path.join(out, 'execution.json'),
      JSON.stringify(
        {
          workers: options.workers,
          cacheEnabled,
          cacheInputsKnown: Boolean(sharedKey),
          families: results.map(({ family, hit, verified }) => ({
            family,
            hit,
            verified,
            production: hit && !verified ? 'cached' : 'fresh',
          })),
        },
        null,
        2,
      ) + '\n',
    );
    return report.ok;
  } finally {
    fs.rmSync(working, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const { values } = parseArgs({
    options: {
      mekfiles: { type: 'string' },
      reference: { type: 'string' },
      'reference-policy': { type: 'string' },
      'reference-trust': { type: 'string' },
      out: { type: 'string' },
      python: { type: 'string', default: 'python' },
      workers: { type: 'string', default: '2' },
      'cache-dir': { type: 'string' },
      'verify-hits': { type: 'string', default: '0' },
      uncached: { type: 'boolean', default: false },
      'per-term': { type: 'boolean', default: false },
    },
  });
  if (!values.mekfiles || !values.reference || !values.out)
    throw new Error('Required: --mekfiles --reference --out');
  runPipeline({
    mekfiles: path.resolve(values.mekfiles),
    reference: path.resolve(values.reference),
    referencePolicy: values['reference-policy']
      ? path.resolve(values['reference-policy'])
      : undefined,
    referenceTrust: ReferenceTrustMode.parse(values['reference-trust']),
    out: path.resolve(values.out),
    python: values.python,
    workers: Number(values.workers),
    cacheDir: values['cache-dir'],
    verifyHits: Number(values['verify-hits']),
    uncached: values.uncached,
    perTerm: values['per-term'],
  })
    .then((ok) => {
      process.exitCode = ok ? 0 : 1;
    })
    .catch((error: unknown) => {
      process.stderr.write(String(error) + '\n');
      process.exitCode = 1;
    });
}
