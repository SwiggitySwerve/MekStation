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
  if (!withNext) return;
  const next = runValidator(ledgerDir, ['--next']);
  console.log('--next:', next.line, 'exit', next.status);
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
  };
  return { unit, baseline };
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
