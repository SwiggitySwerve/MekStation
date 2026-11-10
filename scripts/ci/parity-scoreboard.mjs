// C1's combined.cjs census, with portable inputs and report-only exit mapping.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gunzipSync } from 'node:zlib';

const directory = path.dirname(fileURLToPath(import.meta.url));
const manifestFile = path.resolve(
  directory,
  '../../config/reference/parity-scoreboard.json',
);
export const ROW_FILES = [
  'delta-rows.jsonl',
  'construction-validity-rows.jsonl',
  'construction-weight-rows.jsonl',
  'construction-quantity-rows.jsonl',
];
export const REPORT_FILES = [
  'delta-report.json',
  'construction-validity-report.json',
  'construction-weight-report.json',
  'construction-quantity-report.json',
  'reference-provenance-report.json',
  ...ROW_FILES,
];
export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const readRows = (file) =>
  fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
const hash = (file) => sha256(fs.readFileSync(file));
const save = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const git = (root, ...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();

export function verifySha256(bytes, expected, label) {
  if (!/^[a-f0-9]{64}$/.test(expected) || sha256(bytes) !== expected)
    throw new Error(`${label} SHA-256 mismatch`);
}

export function prepareReference(root, out, reference) {
  const compressed = fs.readFileSync(path.join(root, reference.file));
  verifySha256(compressed, reference.gzipSha256, 'gzip');
  const bytes = gunzipSync(compressed);
  verifySha256(bytes, reference.sha256, 'reference');
  const sidecar = fs.readFileSync(path.join(root, reference.sidecar));
  verifySha256(sidecar, reference.sidecarSha256, 'sidecar');
  fs.mkdirSync(out, { recursive: true });
  const file = path.join(out, 'reference-full.jsonl');
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(file + '.provenance.json', sidecar);
  return file;
}

export function assertClean(root) {
  const status = git(root, 'status', '--porcelain=v1');
  if (status) throw new Error(`Dirty checkout: ${status}`);
}

export function assertDetailedRan(result) {
  if (result.error || result.signal || ![0, 1].includes(result.status))
    throw new Error(
      `Detailed execution failed (${result.status ?? result.signal ?? 'spawn error'}): ${result.error?.message ?? ''}`,
    );
}

function verifyPipelineCompletion(out, expectedRows, expectedFamilies) {
  try {
    if (
      !Number.isSafeInteger(expectedRows) ||
      expectedRows < 1 ||
      !Array.isArray(expectedFamilies) ||
      !expectedFamilies.length
    )
      throw new Error('Missing expected corpus inventory');
    const sources = readRows(path.join(out, 'sources.ndjson'));
    const rows = readRows(path.join(out, 'delta-rows.jsonl'));
    for (const items of [sources, rows]) {
      if (
        items.length !== expectedRows ||
        items.some((row) => typeof row?.path !== 'string' || !row.path) ||
        new Set(items.map((row) => row.path)).size !== expectedRows
      )
        throw new Error('Missing, partial or duplicate corpus rows');
    }
    const report = readJson(path.join(out, 'delta-report.json'));
    const execution = readJson(path.join(out, 'execution.json'));
    const families = [...expectedFamilies].sort();
    if (
      typeof report.ok !== 'boolean' ||
      !report.byFamily ||
      JSON.stringify(Object.keys(report.byFamily).sort()) !==
        JSON.stringify(families)
    )
      throw new Error('Aggregate family inventory incomplete');
    let total = 0;
    for (const family of families) {
      const count = report.byFamily[family]?.rows;
      if (
        !Number.isSafeInteger(count) ||
        count < 0 ||
        rows.filter((row) => row.family === family).length !== count
      )
        throw new Error('Aggregate family row count incomplete');
      total += count;
    }
    if (total !== expectedRows) throw new Error('Aggregate total incomplete');
    if (
      execution.cacheEnabled !== false ||
      !Array.isArray(execution.families) ||
      execution.families.some((entry) => entry.production !== 'fresh') ||
      JSON.stringify(execution.families.map((entry) => entry.family).sort()) !==
        JSON.stringify(families)
    )
      throw new Error('Pipeline completion marker incomplete');
    if (
      readJson(path.join(out, 'reference-provenance-report.json')).ok !== true
    )
      throw new Error('Reference trust rejected');
  } catch (error) {
    throw new Error(`Aggregate pipeline incomplete: ${error.message}`, {
      cause: error,
    });
  }
}

export function assertPipelineRan(
  result,
  { reportMode = false, out, expectedRows, expectedFamilies } = {},
) {
  if (
    result.error ||
    result.signal ||
    !(reportMode ? [0, 1] : [0]).includes(result.status)
  )
    throw new Error('Aggregate pipeline failed');
  // The pipeline writes execution.json only after all families, sources and the
  // aggregate report have completed. Exit 1 alone also represents crashes.
  if (reportMode) verifyPipelineCompletion(out, expectedRows, expectedFamilies);
}

export function clearCensusOutputs(out) {
  fs.mkdirSync(path.join(out, 'terms'), { recursive: true });
  for (const name of [
    'RESULTS.json',
    'sources.ndjson',
    'execution.json',
    'scoreboard-row-index.json',
    'scoreboard-diff.json',
    'scoreboard-summary.md',
    ...REPORT_FILES,
    ...REPORT_FILES.map((file) => path.join('terms', file)),
  ]) {
    const file = path.join(out, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

// Preserve C1's category grouping, optional-total equality, ordering and counters.
export function tallyBv(rows) {
  const category = (term) => {
    const p = term.split('.');
    if (p[0] === 'trooper')
      return (
        'trooper.' +
        (p[2] === 'ammo'
          ? 'ammo.' +
            (p.find((x) => ['cap', 'available', 'arc'].includes(x)) ?? '')
          : p[2])
      );
    if (['infantry', 'equipment'].includes(p[0]))
      return p.slice(0, 2).join('.');
    if (p[0] === 'ammo')
      return (
        'ammo.' +
        (p.find((x) => ['cap', 'available', 'arc'].includes(x)) ?? p[1])
      );
    return p[0];
  };
  const bv = {},
    finiteByFamily = {};
  let finite = 0,
    nonfinite = 0,
    missing = 0;
  for (const r of rows) {
    const f = (bv[r.family] ??= {
      rows: 0,
      exactTotals: 0,
      matched: 0,
      diagnostic: 0,
      missing: 0,
      byCategory: {},
    });
    finiteByFamily[r.family] ??= 0;
    f.rows++;
    if (r.ours?.total === r.java?.total) f.exactTotals++;
    const d = r.termDifferences ?? [];
    if (d.length) f.diagnostic++;
    else f.matched++;
    for (const t of d) {
      if (t.issues.includes('different')) {
        finite++;
        finiteByFamily[r.family]++;
      }
      if (t.issues.some((i) => i.startsWith('nonfinite'))) nonfinite++;
      if (t.issues.includes('missingLocal')) {
        missing++;
        f.missing++;
        const c = category(t.term);
        f.byCategory[c] = (f.byCategory[c] ?? 0) + 1;
      }
    }
  }
  return {
    bv: {
      rows: rows.length,
      exactTotals: rows.filter((r) => r.ours?.total === r.java?.total).length,
      aggregatePasses: rows.filter(
        (r) =>
          r.comparison?.defensive?.withinTolerance &&
          r.comparison?.offensive?.withinTolerance,
      ).length,
      finiteDifferences: finite,
      nonfinite,
      missingLocal: missing,
      families: bv,
    },
    finiteByFamily,
  };
}

export function readCensusResults(out, run) {
  const terms = path.join(out, 'terms');
  if (!readJson(path.join(terms, 'reference-provenance-report.json')).ok)
    throw new Error('Reference trust rejected');
  // An exit 1 is meaningful only when every requested report actually exists.
  for (const file of REPORT_FILES) fs.accessSync(path.join(terms, file));
  const { bv } = tallyBv(readRows(path.join(terms, 'delta-rows.jsonl')));
  const validity = readJson(
    path.join(terms, 'construction-validity-report.json'),
  );
  const weight = readJson(path.join(terms, 'construction-weight-report.json'));
  const quantity = readJson(
    path.join(terms, 'construction-quantity-report.json'),
  );
  const tally = (items, keyOf) =>
    items.reduce((m, x) => ((m[keyOf(x)] = (m[keyOf(x)] ?? 0) + 1), m), {});
  const settingsTally = {};
  for (const c of quantity.settings.cells)
    for (const x of c.results)
      settingsTally[x.status] = (settingsTally[x.status] ?? 0) + 1;
  return {
    head: run.head,
    tree: run.tree,
    bv,
    validity: {
      ok: validity.ok,
      errors: validity.errors,
      byFamily: Object.fromEntries(
        Object.entries(validity.byFamily).map(([k, v]) => [
          k,
          {
            rows: v.rows,
            matched: v.matched,
            different: v.different,
            missingLocal: v.missingLocal,
            failedLocal: v.failedLocal,
          },
        ]),
      ),
    },
    weight: {
      ok: weight.ok,
      errorCount: weight.errors.length,
      errorTypes: tally(weight.errors, (e) => e.split(':')[0]),
      byFamily: weight.byFamily,
      byComponent: weight.byComponent,
      pendingInputs: weight.pendingInputs,
      referenceSha256: weight.referenceSha256,
      extraInputSha256: weight.extraInputSha256,
    },
    quantity: {
      ok: quantity.ok,
      byFamily: quantity.byFamily,
      byQuantity: quantity.byQuantity,
      settings: settingsTally,
      inapplicableCandidates: quantity.settings.inapplicableCandidates.length,
      drift: quantity.drift,
    },
  };
}

export function runCensus({
  root,
  out,
  reference,
  mekfiles,
  python,
  extra,
  reportMode = false,
}) {
  const config = readJson(manifestFile);
  root = path.resolve(root);
  out = path.resolve(out);
  // Keep runtime inputs and output outside the target checkout.
  for (const file of [out, reference, mekfiles, ...(extra ? [extra] : [])]) {
    const relative = path.relative(root, path.resolve(file));
    if (
      !relative.startsWith('..' + path.sep) &&
      relative !== '..' &&
      !path.isAbsolute(relative)
    )
      throw new Error(
        'Census input/output must be outside the target checkout',
      );
  }
  assertClean(root);
  verifySha256(
    fs.readFileSync(reference),
    config.reference.sha256,
    'reference',
  );
  verifySha256(
    fs.readFileSync(reference + '.provenance.json'),
    config.reference.sidecarSha256,
    'sidecar',
  );
  if (extra)
    verifySha256(
      fs.readFileSync(extra),
      config.compatibilityExtra.sha256,
      'W2 extra',
    );
  // Reusing a label is allowed, but never let stale successful files mask a crash.
  clearCensusOutputs(out);
  const policy = 'config/reference-policy/expected-reference-policy.json';
  const run = {
    started: new Date().toISOString(),
    head: git(root, 'rev-parse', 'HEAD'),
    tree: git(root, 'rev-parse', 'HEAD^{tree}'),
    node: process.version,
    reportMode,
    python,
    pythonVersion: execFileSync(python, ['--version'], {
      encoding: 'utf8',
      windowsHide: true,
    }).trim(),
    reference,
    referenceSha256: hash(reference),
    sidecarSha256: hash(reference + '.provenance.json'),
    policySha256: hash(path.join(root, policy)),
    mekfiles,
    extra: extra ?? null,
    extraSha256: extra ? hash(extra) : null,
    pins: config.pins,
    harnessSha256: hash(fileURLToPath(import.meta.url)),
  };
  if (!/^Python 3\.12\./.test(run.pythonVersion))
    throw new Error(`Python 3.12 required: ${run.pythonVersion}`);
  const provenance = () => save(path.join(out, 'run-provenance.json'), run);
  const execute = (name, args) => {
    const fd = fs.openSync(path.join(out, name + '.log'), 'w'),
      start = Date.now();
    let result;
    try {
      result = spawnSync(process.execPath, args, {
        cwd: root,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
        stdio: ['ignore', fd, fd],
        windowsHide: true,
        timeout: 2400000,
      });
    } finally {
      fs.closeSync(fd);
    }
    run[name] = {
      args,
      status: result.status,
      signal: result.signal,
      error: result.error?.message,
      seconds: Math.round((Date.now() - start) / 1000),
    };
    provenance();
    return result;
  };
  provenance();
  try {
    let extraInfantry;
    if (extra) {
      const infantry = fs
        .readFileSync(extra, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .filter((line) => JSON.parse(line).path?.startsWith('infantry/'));
      if (infantry.length !== config.compatibilityExtra.infantryRows)
        throw new Error('W2 infantry extra row count mismatch');
      extraInfantry = out + '/w2-infantry-extra.jsonl';
      fs.writeFileSync(extraInfantry, infantry.join('\n') + '\n');
    }
    const trust = [
      '--reference-trust',
      'blocking',
      '--reference-policy',
      policy,
    ];
    const pipeline = execute('pipeline', [
      '--require',
      'tsx/cjs',
      'scripts/unit-bv-pipeline.ts',
      '--mekfiles',
      mekfiles,
      '--reference',
      reference,
      ...trust,
      '--out',
      out,
      '--python',
      python,
      '--workers',
      '2',
      '--uncached',
      '--verify-hits',
      '1',
    ]);
    assertPipelineRan(pipeline, {
      reportMode,
      out,
      expectedRows: config.reference.rows,
      expectedFamilies: reportMode
        ? Object.keys(
            readJson(
              path.join(
                root,
                'scripts/megameklab-conversion/strict-families.json',
              ),
            ),
          )
        : undefined,
    });
    run.sourcesSha256 = hash(out + '/sources.ndjson');
    const detailed = execute('detailed', [
      '--max-old-space-size=8192',
      'node_modules/tsx/dist/cli.mjs',
      'scripts/vehicle-aero-bv-delta.ts',
      '--converted',
      out + '/sources.ndjson',
      '--mekfiles',
      mekfiles,
      '--reference',
      reference,
      ...trust,
      '--out',
      out + '/terms',
      '--per-term',
      '--construction-validity',
      '--construction-weights',
      '--construction-quantities',
      ...(extraInfantry ? ['--weight-terms-extra', extraInfantry] : []),
    ]);
    assertDetailedRan(detailed);
    const result = readCensusResults(out, run);
    assertClean(root);
    if (
      git(root, 'rev-parse', 'HEAD') !== run.head ||
      git(root, 'rev-parse', 'HEAD^{tree}') !== run.tree
    )
      throw new Error('Checkout changed during run');
    verifySha256(fs.readFileSync(reference), run.referenceSha256, 'reference');
    verifySha256(
      fs.readFileSync(reference + '.provenance.json'),
      run.sidecarSha256,
      'sidecar',
    );
    verifySha256(
      fs.readFileSync(path.join(root, policy)),
      run.policySha256,
      'policy',
    );
    if (extra)
      verifySha256(fs.readFileSync(extra), run.extraSha256, 'W2 extra');
    save(path.join(out, 'RESULTS.json'), result);
    return result;
  } catch (error) {
    run.failure = error.message;
    throw error;
  } finally {
    run.finished = new Date().toISOString();
    provenance();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      ...Object.fromEntries(
        [
          'root',
          'out',
          'reference',
          'mekfiles',
          'python',
          'extra',
          'archive',
        ].map((key) => [key, { type: 'string' }]),
      ),
      'report-mode': { type: 'boolean', default: false },
    },
  });
  const config = readJson(manifestFile);
  if (positionals[0] === 'prepare') {
    prepareReference(path.dirname(manifestFile), values.out, config.reference);
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `mm-data-pin=${config.mmData.commit}\nmm-data-url=${config.mmData.url}\n`,
      );
  } else if (positionals[0] === 'verify-mm-data') {
    verifySha256(
      fs.readFileSync(values.archive),
      config.mmData.tarballSha256,
      'mm-data tarball',
    );
  } else if (positionals[0] === 'run') {
    runCensus({
      ...values,
      reportMode: values['report-mode'],
      root: values.root ?? process.cwd(),
      python: values.python ?? 'python',
    });
  } else throw new Error('Expected prepare, verify-mm-data, or run');
}
