/** Ledger orchestration and compatibility facade for the roadmap loop generators. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  implementationCensus,
  reviewIdentityMode,
} from './review-identity/review.mjs';
import {
  HEX40,
  evidenceDirOf,
  nowIso,
  posix,
  readJson,
  refuse,
  writeJson,
} from './roadmap-loop-runtime.mjs';

export {
  DATE8,
  HEX40,
  UNIT_ID,
  LoopScriptError,
  evidenceDirOf,
  nowIso,
  parseFlags,
  posix,
  readJson,
  refuse,
  requireFlags,
  runCli,
  sha256,
  writeJson,
} from './roadmap-loop-runtime.mjs';
export {
  archiveReviewIdentity,
  identityPath,
  implementationCensus,
  nativeBytes,
  nativeFile,
  nativeCheck,
  nativePath,
  nativeText,
  reviewIdentityMode,
  validateReviewIdentity,
  validateReviewReceipt,
} from './review-identity/review.mjs';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const LEDGER_RELATIVE =
  'openspec/planning/2026-09-12-roadmap-completion';
export const DEFAULT_LEDGER_DIR = path.join(REPO_ROOT, LEDGER_RELATIVE);

export function resolveLedgerDir(given) {
  const dir = given ? path.resolve(given) : DEFAULT_LEDGER_DIR;
  if (!fs.existsSync(path.join(dir, 'units.json')))
    refuse('LEDGER_MISSING', `${dir} holds no units.json`);
  return dir;
}

export const unitsFile = (ledgerDir) => path.join(ledgerDir, 'units.json');
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

/** The last line of a log matching pattern; '(no log)' when the file is absent. */
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

/** Stage1–3 fold preserves admission bytes; the parent decision lives in the unit entry. */
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
      ? {
          reviewContractVersion: reviewIdentityMode(local),
          implementationActors: census,
        }
      : {}),
  };
  return { unit, baseline };
}
