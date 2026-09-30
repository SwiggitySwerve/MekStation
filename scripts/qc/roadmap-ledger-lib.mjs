/**
 * Shared pieces of the roadmap loop's generators (U17 - R6.loop-harness).
 *
 * Council 2 section D item 3: the fold, closure, park and main-proof
 * generators existed only in the parent's scratchpad, so the loop could not be
 * reproduced from main. This module holds what all four of them need - where
 * the ledger is, how a flag list is parsed, how a refusal is spelled, and the
 * stage-1-3 fold that both the fold and the park perform - so that each
 * generator stays the size of its own behaviour.
 *
 * Nothing here contains an absolute path: the repository root is derived from
 * this file's own location, and `--ledger-dir` (the pin's injection point, and
 * the parent's escape hatch when the ledger being folded is not the one beside
 * the script) is the only way to point elsewhere.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const LEDGER_RELATIVE =
  'openspec/planning/2026-09-12-roadmap-completion';
export const DEFAULT_LEDGER_DIR = path.join(REPO_ROOT, LEDGER_RELATIVE);

export const HEX40 = /^[0-9a-f]{40}$/;
export const UNIT_ID = /^[A-Za-z][A-Za-z0-9]*$/;
export const DATE8 = /^\d{8}$/;

/** A refusal. `code` is what the CLI prints first; the message names the file or value. */
export class LoopScriptError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LoopScriptError';
    this.code = code;
  }
}

export const refuse = (code, message) => {
  throw new LoopScriptError(code, message);
};

const camel = (flag) =>
  flag
    .replace(/^--/, '')
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

/**
 * Parse `--flag value` pairs and bare boolean flags. An unknown flag is a
 * refusal rather than a silent ignore, because a mistyped flag in this loop
 * means a receipt written with a default nobody chose.
 */
export function parseFlags(args, { strings = [], booleans = [] } = {}) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (booleans.includes(flag)) {
      options[camel(flag)] = true;
      continue;
    }
    if (!strings.includes(flag))
      refuse('INVALID_ARGUMENT', `unknown flag ${flag}`);
    const value = args[index + 1];
    if (value === undefined)
      refuse('INVALID_ARGUMENT', `${flag} needs a value`);
    options[camel(flag)] = value;
    index += 1;
  }
  return options;
}

export function requireFlags(options, names) {
  for (const name of names) {
    if (options[name] === undefined || options[name] === '')
      refuse(
        'INVALID_ARGUMENT',
        `--${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`,
      );
  }
}

export const sha256 = (buffer) =>
  createHash('sha256').update(buffer).digest('hex');
export const nowIso = () => new Date().toISOString();
export const posix = (value) => value.split(path.sep).join('/');

export function readJson(file) {
  if (!fs.existsSync(file)) refuse('FILE_MISSING', `${file} does not exist`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const writeJson = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/** The ledger directory to act on: `--ledger-dir` when given, else the one beside this file. */
export function resolveLedgerDir(given) {
  const dir = given ? path.resolve(given) : DEFAULT_LEDGER_DIR;
  if (!fs.existsSync(path.join(dir, 'units.json')))
    refuse('LEDGER_MISSING', `${dir} holds no units.json`);
  return dir;
}

export const unitsFile = (ledgerDir) => path.join(ledgerDir, 'units.json');
export const evidenceDirOf = (ledgerDir) => path.join(ledgerDir, 'evidence');
export const loadUnits = (ledgerDir) => readJson(unitsFile(ledgerDir));
export const saveUnits = (ledgerDir, ledger) =>
  writeJson(unitsFile(ledgerDir), ledger);

export function findUnit(ledger, unitId) {
  const unit = (ledger.units ?? []).find(
    (candidate) => candidate.id === unitId,
  );
  if (!unit) refuse('UNKNOWN_UNIT', `no unit ${unitId} in the ledger`);
  return unit;
}

/** The last line of a log matching `pattern`; '(no log)' when the file is absent. */
export function lastLine(dir, name, pattern) {
  const file = path.join(dir, `${name}.log`);
  if (!fs.existsSync(file)) return '(no log)';
  return (
    fs
      .readFileSync(file, 'utf8')
      .trim()
      .split(/\r?\n/)
      .filter((line) => pattern.test(line))
      .pop() || ''
  );
}

/**
 * Run validate-roadmap.mjs against this ledger and return the line that says
 * what happened. The validator reports a pass on stdout and a failure on
 * stderr, so both are read: printing only stdout would report an empty line
 * for exactly the run that matters.
 */
export function runValidator(ledgerDir, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [path.join(ledgerDir, 'validate-roadmap.mjs'), ...extraArgs],
    { cwd: path.resolve(ledgerDir, '..', '..', '..'), encoding: 'utf8' },
  );
  const lines = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const verdict = lines.filter((line) =>
    /ROADMAP VALIDATION (PASSED|FAILED)|^NONE-ADMISSIBLE|^[A-Z]\d/.test(line),
  );
  return { line: verdict.pop() ?? lines.pop() ?? '', status: result.status };
}

export function printValidator(ledgerDir, { withNext = false } = {}) {
  const main = runValidator(ledgerDir);
  console.log('validator:', main.line, 'exit', main.status);
  if (!withNext) return { main };
  const next = runValidator(ledgerDir, ['--next']);
  console.log('--next:', next.line, 'exit', next.status);
  return { main, next };
}

/**
 * Fold a lane's admission, red and local receipts onto the unit entry.
 *
 * Reproduces unit-fold-stages-1-3-v3: the admission receipt on disk is left
 * byte-identical to the copy the product PR carries (v2 rewrote it to add the
 * parent decision, and a rewritten receipt on main conflicted with the open
 * PR), and the decision is recorded on the unit entry with
 * `parentDecisionRecordedHere: true` instead.
 *
 * The caller decides which local statuses it accepts: the fold takes `ready`
 * or `local-verified`, the park takes `BLOCKED`. Neither invents one.
 */
export function foldStages({
  ledgerDir,
  ledger,
  unitId,
  date,
  receiptsDir,
  redSummary,
  localSummary,
  acceptLocalStatus,
}) {
  const unit = findUnit(ledger, unitId);
  if (unit.state !== 'planned')
    refuse('UNIT_NOT_PLANNED', `${unitId} is ${unit.state}, not planned`);
  const lc = unitId.toLowerCase();
  const source = path.resolve(receiptsDir);
  const evidence = evidenceDirOf(ledgerDir);
  const read = (stage) => {
    const file = path.join(source, `${lc}-${stage}-${date}.json`);
    if (!fs.existsSync(file))
      refuse('RECEIPT_MISSING', `${posix(file)} does not exist`);
    // The unit entry records `evidence/<name>`, and the validator checks that
    // path exists, so a lane that wrote its receipts somewhere else has them
    // copied in rather than recorded at a path that is not there.
    const target = path.join(evidence, path.basename(file));
    if (path.resolve(file) !== target) fs.copyFileSync(file, target);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  };
  const admission = read('admission');
  const red = read('red');
  const local = read('local');
  if (!acceptLocalStatus.test(String(local.status)))
    refuse(
      'LOCAL_STATUS_REFUSED',
      `local status not accepted: ${local.status}`,
    );
  const baseline = admission.baseline || red.baseline;
  if (!HEX40.test(String(baseline)))
    refuse('NO_BASELINE', 'admission receipt has no 40-hex baseline');

  const census = implementationCensus(local);
  const at = nowIso();
  const fallback = (stage, receipt) =>
    receipt.summary ?? `see evidence/${lc}-${stage}-${date}.json`;
  unit.baseline = baseline;
  unit.stageReceipts = unit.stageReceipts ?? {};
  unit.stageReceipts.admission = {
    path: `evidence/${lc}-admission-${date}.json`,
    baseline,
    at: admission.at || at,
    decision: admission.parentDecision?.decision ?? 'go',
    parentDecisionRecordedHere: true,
  };
  unit.stageReceipts.red = {
    path: `evidence/${lc}-red-${date}.json`,
    at: red.at || at,
    summary: redSummary ?? fallback('red', red),
  };
  unit.stageReceipts.local = {
    path: `evidence/${lc}-local-${date}.json`,
    at: local.at || at,
    summary: localSummary ?? fallback('local', local),
    ...(census
      ? { reviewContractVersion: 2, implementationActors: census }
      : {}),
  };
  return { unit, baseline };
}

// PRI: integrity/binding checks shared by closure and the portable consumer.
// Authentication still requires trusted independent observation of the live engine and contributors.
const identityCheck = (condition, message) => {
  if (!condition) refuse('REVIEW_IDENTITY_INVALID', message);
};
const exactKeys = (value, fields) => {
  identityCheck(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      isDeepStrictEqual(
        Object.keys(value).sort(),
        Object.keys(fields).sort(),
      ) &&
      Object.entries(fields).every(([key, rule]) =>
        typeof rule === 'function' ? rule(value[key]) : value[key] === rule,
      ),
    `invalid identity fields: ${Object.keys(fields).join(', ')}`,
  );
  return true;
};
const nonempty = (v) => typeof v === 'string' && v.trim().length > 0;
const TASK = /^st_[0-9a-f]{8}$/;
const SESSION =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const taskId = (v) => nonempty(v) && TASK.test(v);
const sessionId = (v) => nonempty(v) && SESSION.test(v);

export function reviewIdentityMode(value) {
  const modern =
    value &&
    ['reviewContractVersion', 'identityEvidence', 'implementationActors'].some(
      (k) => Object.hasOwn(value, k),
    );
  if (!modern) return 0;
  identityCheck(
    value.reviewContractVersion === 2,
    'partial, unknown or downgraded reviewContractVersion',
  );
  return 2;
}

export function implementationCensus(local) {
  if (!reviewIdentityMode(local)) return null;
  identityCheck(
    !Object.hasOwn(local, 'identityEvidence'),
    'local receipt cannot carry review identityEvidence',
  );
  const actors = local.implementationActors;
  identityCheck(
    Array.isArray(actors) && actors.length > 0,
    'implementationActors census missing',
  );
  for (const actor of actors) {
    exactKeys(actor, {
      role: (v) => ['author', 'finisher'].includes(v),
      task_id: taskId,
      child_session_id: sessionId,
      model: nonempty,
    });
  }
  identityCheck(
    actors.filter((a) => a.role === 'author').length === 1,
    'census must have exactly one author',
  );
  identityCheck(
    new Set(actors.map((a) => a.task_id)).size === actors.length &&
      new Set(actors.map((a) => a.child_session_id)).size === actors.length,
    'duplicate/shared implementation actor; deduplicate author/finisher',
  );
  return actors;
}

// Restrict every archive/live-record path before opening it, including junction/symlink aliases.
export function identityPath(base, relative) {
  identityCheck(
    typeof relative === 'string' &&
      relative.length > 0 &&
      !/[\\:]/.test(relative) &&
      !relative.startsWith('/') &&
      relative.split('/').every((p) => p && p !== '.' && p !== '..'),
    'unsafe relative identity path',
  );
  let file = path.resolve(base);
  for (const part of ['.', ...relative.split('/')]) {
    file = path.join(file, part);
    identityCheck(
      !fs.lstatSync(file).isSymbolicLink(),
      'identity path is a reparse alias',
    );
  }
  identityCheck(fs.statSync(file).isFile(), 'identity path is not a file');
  const inside = path.relative(fs.realpathSync(base), fs.realpathSync(file));
  identityCheck(
    inside && !inside.startsWith('..') && !path.isAbsolute(inside),
    'identity path escaped its root',
  );
  return file;
}

const checkRef = (ref) =>
  exactKeys(ref, {
    path: nonempty,
    sha256: nonempty,
    bytes: (v) => Number.isSafeInteger(v) && v > 0,
  });
const identityArtifact = (base, ref) => {
  checkRef(ref);
  const file = identityPath(base, ref.path);
  const bytes = fs.readFileSync(file);
  identityCheck(
    bytes.length === ref.bytes && sha256(bytes) === ref.sha256,
    'artifact hash/bytes mismatch',
  );
  return { file, bytes, value: JSON.parse(bytes.toString('utf8')) };
};
const observedEngine = (record) => ({
  task_id: record.task_id,
  child_session_id: record.child_session_id,
  model: record.model,
  execution_mode: record.execution_mode,
  agent_type: record.agent_type ?? null,
  resolved_model: {
    provider: record.resolved_model?.provider,
    model_id: record.resolved_model?.model_id,
  },
});
const checkEngine = (engine) =>
  exactKeys(engine, {
    task_id: taskId,
    child_session_id: sessionId,
    model: `${engine?.resolved_model?.provider}/${engine?.resolved_model?.model_id}`,
    execution_mode: nonempty,
    agent_type: (v) => v === null || nonempty(v),
    resolved_model: (r) =>
      exactKeys(r, { provider: nonempty, model_id: nonempty }),
  });

const localReviewEvidence = (ledgerDir, unit) => {
  const inline = unit.stageReceipts.local;
  const mode = reviewIdentityMode(inline);
  const file = mode
    ? identityPath(ledgerDir, inline.path)
    : inline?.path && path.resolve(ledgerDir, inline.path);
  const bytes = file && fs.existsSync(file) ? fs.readFileSync(file) : null;
  const external = bytes && JSON.parse(bytes.toString('utf8'));
  identityCheck(
    mode === reviewIdentityMode(external),
    'external modern local downgraded to legacy',
  );
  const actors = implementationCensus(external);
  identityCheck(
    !mode ||
      (external.unit === unit.id &&
        external.stage === 'local' &&
        isDeepStrictEqual(actors, implementationCensus(inline))),
    'local receipt/census disagrees with inline summary',
  );
  return { mode, actors, bytes };
};

export function validateReviewIdentity({
  ledgerDir,
  unit,
  review,
  manifestFile,
  engineRecordsDir,
  reviewBytes,
}) {
  identityCheck(
    reviewIdentityMode(review) === 2 &&
      !Object.hasOwn(review, 'implementationActors') &&
      review.unit === unit.id &&
      review.stage === 'review' &&
      review.head === review.reviewedHead &&
      HEX40.test(review.head) &&
      review.verdict === 'APPROVE',
    'modern review unit/head/verdict mismatch',
  );
  const { actors, bytes: localBytes } = localReviewEvidence(ledgerDir, unit);
  identityCheck(actors, 'modern local contributor census required');
  const manifestData = manifestFile
    ? {
        file: path.resolve(manifestFile),
        value: readJson(path.resolve(manifestFile)),
      }
    : identityArtifact(ledgerDir, review.identityEvidence);
  const manifest = manifestData.value;
  const output =
    reviewBytes ?? fs.readFileSync(identityPath(ledgerDir, review.outputPath));
  exactKeys(manifest, {
    reviewContractVersion: 2,
    unit: unit.id,
    sourceHead: review.head,
    reviewOutputSha256: (v) =>
      v === review.outputSha256 && v === sha256(output),
    localReceiptSha256: sha256(localBytes),
    author: checkRef,
    finishers: (refs) => Array.isArray(refs) && refs.every(checkRef),
    reviewer: checkRef,
  });
  const lines = output.toString('utf8').split(/\r?\n/);
  const prolog = lines.slice(0, 6);
  for (const [key, value] of Object.entries({
    Verdict: 'APPROVE',
    reviewedHead: review.head,
    reviewerModel: review.reviewerModel,
    reviewContractVersion: '2',
  })) {
    identityCheck(
      lines.filter((line) => line.startsWith(`${key}:`)).length === 1 &&
        prolog.includes(`${key}: ${value}`),
      `duplicate/conflicting/missing modern ${key} prolog`,
    );
  }
  const refs = [manifest.author, ...manifest.finishers, manifest.reviewer];
  identityCheck(
    new Set(refs.map((r) => r.path.toLowerCase())).size === refs.length,
    'aliased identity refs',
  );
  const snapshots = refs.map((ref) => {
    const artifact = identityArtifact(path.dirname(manifestData.file), ref);
    const snapshot = artifact.value;
    exactKeys(snapshot, {
      schemaVersion: 1,
      unit: manifest.unit,
      sourceHead: manifest.sourceHead,
      reviewOutputSha256: manifest.reviewOutputSha256,
      observedAt: (v) =>
        nonempty(v) &&
        /^\d{4}-\d{2}-\d{2}T/.test(v) &&
        Number.isFinite(Date.parse(v)),
      engine: checkEngine,
    });
    if (engineRecordsDir) {
      const record = readJson(
        identityPath(engineRecordsDir, `${snapshot.engine.task_id}.json`),
      );
      const observed = observedEngine(record);
      identityCheck(
        isDeepStrictEqual(observed, snapshot.engine),
        'snapshot disagrees with actual engine observation',
      );
    }
    return artifact;
  });
  const engines = snapshots.map((s) => s.value.engine);
  const author = engines[0];
  const reviewer = engines.at(-1);
  const contributors = [
    actors.find((a) => a.role === 'author'),
    ...actors.filter((a) => a.role === 'finisher'),
  ];
  identityCheck(
    contributors.length === engines.length - 1 &&
      contributors.every(
        (actor, i) =>
          ['task_id', 'child_session_id', 'model'].every(
            (k) => actor[k] === engines[i][k],
          ) &&
          reviewer.task_id !== actor.task_id &&
          reviewer.child_session_id !== actor.child_session_id,
      ),
    'manifest must cover EVERY contributor with independent reviewer task/session',
  );
  identityCheck(
    review.implementerModel === author.model &&
      review.reviewerModel === reviewer.model,
    'review/implementer model disagrees with observed actor',
  );
  identityCheck(
    !Object.hasOwn(review, 'finisherModel') ||
      (manifest.finishers.length === 1 &&
        review.finisherModel === engines[1].model),
    'finisherModel misrepresents the census',
  );
  return { manifest, snapshots };
}

export function validateReviewReceipt(ledgerDir, unit) {
  const inline = unit.stageReceipts.review;
  const { mode: localMode } = localReviewEvidence(ledgerDir, unit);
  if (!inline) return;
  const mode = reviewIdentityMode(inline);
  const externalFile = mode
    ? identityPath(ledgerDir, inline.path)
    : path.resolve(ledgerDir, inline.path);
  const external = fs.existsSync(externalFile) ? readJson(externalFile) : null;
  identityCheck(
    mode === reviewIdentityMode(external) && (!localMode || mode === 2),
    'inline/external/local review contract downgrade',
  );
  if (!mode) {
    const outputFile =
      external?.outputPath && path.resolve(ledgerDir, external.outputPath);
    if (outputFile && fs.existsSync(outputFile))
      identityCheck(
        !/^reviewContractVersion:/m.test(fs.readFileSync(outputFile, 'utf8')),
        'modern review prolog downgraded to legacy',
      );
    return;
  }
  for (const key of [
    'head',
    'reviewedHead',
    'reviewerModel',
    'implementerModel',
    'finisherModel',
    'outputSha256',
    'verdict',
    'identityEvidence',
  ])
    identityCheck(
      isDeepStrictEqual(inline[key], external[key]),
      `inline/external review disagreement: ${key}`,
    );
  validateReviewIdentity({ ledgerDir, unit, review: external });
}

export function archiveReviewIdentity(ledgerDir, verified) {
  const evidence = evidenceDirOf(ledgerDir);
  identityCheck(
    !fs.lstatSync(evidence).isSymbolicLink(),
    'evidence directory is a reparse alias',
  );
  const pending = [];
  const add = (kind, bytes) => {
    const hash = sha256(bytes);
    const ref = {
      path: `${kind}-${hash}.json`,
      sha256: hash,
      bytes: bytes.length,
    };
    pending.push({ ref, bytes });
    return ref;
  };
  const refs = verified.snapshots.map((s) => add('identity', s.bytes));
  const manifest = {
    ...verified.manifest,
    author: refs[0],
    finishers: refs.slice(1, -1),
    reviewer: refs.at(-1),
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const ref = add('review-identity', bytes);
  // Check ALL existing content before writing any archive; never overwrite a conflicting hash name.
  for (const p of pending) {
    const target = path.join(evidence, p.ref.path);
    if (fs.existsSync(target))
      identityCheck(
        fs.readFileSync(identityPath(evidence, p.ref.path)).equals(p.bytes),
        'existing identity archive content conflicts',
      );
  }
  for (const p of pending) {
    const target = path.join(evidence, p.ref.path);
    if (!fs.existsSync(target))
      fs.writeFileSync(target, p.bytes, { flag: 'wx' });
  }
  return { ...ref, path: `evidence/${ref.path}` };
}

/** One place for the CLI wrapper, so a refusal never exits 0 and never prints a stack. */
export function runCli(main, fallbackCode) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`${error.code ?? fallbackCode}: ${error.message}`);
    process.exitCode = 1;
  }
}
