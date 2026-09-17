#!/usr/bin/env node
/**
 * Fold a lane's stage 1-3 receipts into the unit ledger (U17 - R6.loop-harness).
 *
 * The repository copy of unit-fold-stages-1-3-v3.js, with its LEDGER_DATE
 * environment variable and its positional worktree root replaced by flags and
 * its planning path derived from this file's own location.
 *
 *   npm run roadmap:fold -- --unit U18 --date 20260918 \
 *     --receipts-dir openspec/planning/2026-09-12-roadmap-completion/evidence \
 *     --red-summary "..." --local-summary "..."
 *
 * The unit moves planned -> local-verified and the validator runs afterwards.
 * It refuses a unit that is not planned, a missing lane receipt, a local
 * receipt whose status is neither `ready` nor `local-verified`, and an
 * admission receipt with no 40-hex baseline.
 *
 * `--ledger-dir` points the fold at a ledger directory other than the one
 * beside this script; the jest pin uses it to work on a temporary copy.
 */
import {
  DATE8,
  UNIT_ID,
  foldStages,
  loadUnits,
  parseFlags,
  printValidator,
  refuse,
  requireFlags,
  resolveLedgerDir,
  runCli,
  saveUnits,
} from './roadmap-ledger-lib.mjs';

const STRINGS = [
  '--unit',
  '--date',
  '--receipts-dir',
  '--red-summary',
  '--local-summary',
  '--ledger-dir',
];

function main(argv) {
  const options = parseFlags(argv, { strings: STRINGS });
  requireFlags(options, [
    'unit',
    'date',
    'receiptsDir',
    'redSummary',
    'localSummary',
  ]);
  if (!UNIT_ID.test(options.unit))
    refuse('INVALID_ARGUMENT', `--unit ${options.unit}`);
  if (!DATE8.test(options.date))
    refuse('INVALID_ARGUMENT', `--date ${options.date}`);

  const ledgerDir = resolveLedgerDir(options.ledgerDir);
  const ledger = loadUnits(ledgerDir);
  const { unit, baseline } = foldStages({
    ledgerDir,
    ledger,
    unitId: options.unit,
    date: options.date,
    receiptsDir: options.receiptsDir,
    redSummary: options.redSummary,
    localSummary: options.localSummary,
    acceptLocalStatus: /^(ready|local-verified)/i,
  });
  unit.state = 'local-verified';
  saveUnits(ledgerDir, ledger);

  printValidator(ledgerDir);
  console.log(
    unit.id,
    unit.state,
    'baseline',
    baseline.slice(0, 9),
    '| units:',
    ledger.units.map((entry) => `${entry.id}:${entry.state}`).join(' '),
  );
}

runCli(main, 'FOLD_ERROR');
