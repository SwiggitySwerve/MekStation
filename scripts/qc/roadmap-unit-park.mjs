#!/usr/bin/env node
/**
 * Park a unit that cannot proceed (U17 - R6.loop-harness).
 *
 * The repository copy of u12-park.js, whose unit id, date, finding and cause
 * were all literals. GOAL.md ("How to park"): a unit blocked on a real finding
 * is recorded with its cause and its next independent action, never narrowed
 * and never guessed at.
 *
 *   npm run roadmap:park -- --unit U18 --date 20260918 \
 *     --receipts-dir <dir> --finding <finding.json> \
 *     --pr-head <40-hex> --pr 1840 --cause "..." --next-action "..."
 *
 * The three lane receipts are folded exactly as the fold folds them, except
 * that the local receipt must say BLOCKED rather than ready. The finding is
 * appended to `units.findings` (never duplicated by id), the unit moves to
 * `blocked` with a `blocked<date>` block, and the validator runs afterwards.
 *
 * `--red-summary` and `--local-summary` are optional here: without them each
 * stage summary falls back to the receipt's own `summary`, and then to a
 * pointer at the receipt. `--ledger-dir` is the pin's injection point.
 */
import {
  DATE8,
  HEX40,
  UNIT_ID,
  foldStages,
  loadUnits,
  nowIso,
  parseFlags,
  printValidator,
  readJson,
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
  '--finding',
  '--pr-head',
  '--pr',
  '--cause',
  '--next-action',
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
    'finding',
    'prHead',
    'pr',
    'cause',
    'nextAction',
  ]);
  if (!UNIT_ID.test(options.unit))
    refuse('INVALID_ARGUMENT', `--unit ${options.unit}`);
  if (!DATE8.test(options.date))
    refuse('INVALID_ARGUMENT', `--date ${options.date}`);
  if (!HEX40.test(options.prHead))
    refuse('INVALID_ARGUMENT', `--pr-head ${options.prHead}`);
  if (!/^\d+$/.test(options.pr))
    refuse('INVALID_ARGUMENT', `--pr ${options.pr}`);

  const finding = readJson(options.finding);
  if (!finding || typeof finding !== 'object' || !finding.id)
    refuse('FINDING_UNREADABLE', `the finding in ${options.finding} has no id`);

  const unitId = options.unit;
  const lc = unitId.toLowerCase();
  const date = options.date;
  const ledgerDir = resolveLedgerDir(options.ledgerDir);
  const ledger = loadUnits(ledgerDir);
  const { unit } = foldStages({
    ledgerDir,
    ledger,
    unitId,
    date,
    receiptsDir: options.receiptsDir,
    redSummary: options.redSummary,
    localSummary: options.localSummary,
    acceptLocalStatus: /^blocked/i,
  });

  unit.prHead = options.prHead;
  unit.state = 'blocked';
  unit[`blocked${date}`] = {
    cause: options.cause,
    parkedPr: Number(options.pr),
    nextIndependentAction: options.nextAction,
    proof: `evidence/${lc}-local-${date}.json findingsReportedNotFixed`,
  };

  ledger.findings = ledger.findings ?? [];
  if (!ledger.findings.some((entry) => entry.id === finding.id))
    ledger.findings.push({
      at: nowIso(),
      ...finding,
      status:
        finding.status ??
        `recorded; ${unitId} parked on PR ${options.pr} (head ${options.prHead.slice(0, 9)}); successor not yet planned`,
    });
  saveUnits(ledgerDir, ledger);

  printValidator(ledgerDir, { withNext: true });
  console.log(
    unitId,
    unit.state,
    'finding',
    finding.id,
    '| units:',
    ledger.units.map((entry) => `${entry.id}:${entry.state}`).join(' '),
  );
}

runCli(main, 'PARK_ERROR');
