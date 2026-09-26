/**
 * Pins for the roadmap loop's fold and park generators (U17 - R6.loop-harness).
 *
 * Council 2 section D item 3: the fold, closure, park and main-proof
 * generators lived only in the parent's scratchpad, so the loop was not
 * reproducible from main and every receipt on main was produced by a script
 * nobody else could run.
 *
 * SCOPE: U17 was split when its five product modules measured 1121 lines
 * against a 500-line cap. The fold, the park and the shared library ship here;
 * scripts/qc/roadmap-unit-closure.mjs and scripts/qc/roadmap-main-proof.mjs,
 * and the cases that hold them, are staged for the successor U17b at
 * .sisyphus/roadmap-completion-20260912/u17b-staging/ and are NOT asserted by
 * this file.
 *
 * These pins hold the three things that would let the shipped copies drift
 * into producing evidence the ledger cannot trust:
 *
 *  - the fold writing a stage receipt whose shape is not the shape already on
 *    main (compared key by key and type by type against U14's entries), or
 *    folding a unit that is not planned, or one whose lane receipt is missing
 *    or not ready,
 *  - the park writing a blocked unit without its blocked block or its finding,
 *  - the shared library accepting an unknown or value-less flag, a ledger
 *    directory that holds no units.json, or reporting a log line that is not
 *    there.
 *
 * Everything runs against a temporary COPY of the ledger directory, placed
 * under openspec/planning/ so that the copied validate-roadmap.mjs still
 * resolves the real repository root three levels up, and against a fabricated
 * planned unit. The real ledger is never written by this file.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const qc = (name: string): string => path.join(repoRoot, 'scripts/qc', name);
const FOLD = qc('roadmap-unit-fold.mjs');
const PARK = qc('roadmap-unit-park.mjs');
const LIB = qc('roadmap-ledger-lib.mjs');

const LEDGER_NAME = '2026-09-12-roadmap-completion';
const SOURCE_LEDGER = path.join(repoRoot, 'openspec/planning', LEDGER_NAME);
const UNIT = 'U91';
const DATE = '20260917';
const BASELINE = 'a'.repeat(40);
const PR_HEAD = 'b'.repeat(40);

interface IRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

interface IStageReceipt {
  [key: string]: unknown;
}

interface IUnit {
  id: string;
  state: string;
  baseline: string | null;
  prHead: string | null;
  mergeSha: string | null;
  taskKeys: string[];
  stageReceipts: Record<string, IStageReceipt | null>;
  [key: string]: unknown;
}

interface ILedger {
  units: IUnit[];
  findings?: Record<string, unknown>[];
  [key: string]: unknown;
}

let tempLedger = '';
let pristineUnits = '';

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as T;
const writeJson = (file: string, value: unknown): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const ledgerUnits = (): ILedger =>
  readJson<ILedger>(path.join(tempLedger, 'units.json'));
const unitOf = (id: string): IUnit => {
  const found = ledgerUnits().units.find((unit) => unit.id === id);
  if (!found) throw new Error(`no unit ${id}`);
  return found;
};

/** Run one of the generators with a PATH that puts the fake gh first. */
function run(script: string, args: string[], cwd = repoRoot): IRun {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/** The fabricated planned unit the generators are pointed at. */
function seedPlannedUnit(): void {
  const ledger = readJson<ILedger>(path.join(tempLedger, 'units.json'));
  ledger.units = ledger.units.filter((unit) => unit.id !== UNIT);
  ledger.units.push({
    id: UNIT,
    node: 'R6.loop-harness',
    taskKeys: [],
    behavior: 'Fabricated unit used only by the U17 pin.',
    ownershipPaths: ['scripts/qc'],
    ciClass: 'product',
    reviewClasses: ['routine'],
    caps: { maxFiles: 15, maxNonGeneratedLines: 500 },
    state: 'planned',
    baseline: null,
    prHead: null,
    mergeSha: null,
    stageReceipts: {
      admission: null,
      red: null,
      local: null,
      review: null,
      merge: null,
      mainProof: null,
      tick: null,
    },
    ownerGate: null,
  });
  writeJson(path.join(tempLedger, 'units.json'), ledger);
}

/** The three lane receipts the fold reads, in the shapes the lanes write. */
function seedLaneReceipts(localStatus = 'ready'): string {
  const evidence = path.join(tempLedger, 'evidence');
  writeJson(path.join(evidence, `u91-admission-${DATE}.json`), {
    unit: UNIT,
    stage: 'admission',
    at: '2026-09-17T10:00:00Z',
    baseline: BASELINE,
  });
  writeJson(path.join(evidence, `u91-red-${DATE}.json`), {
    unit: UNIT,
    stage: 'red',
    at: '2026-09-17T10:10:00Z',
    baseline: BASELINE,
  });
  writeJson(path.join(evidence, `u91-local-${DATE}.json`), {
    unit: UNIT,
    stage: 'local',
    at: '2026-09-17T10:20:00Z',
    baseline: BASELINE,
    status: localStatus,
  });
  return evidence;
}

function foldArgs(evidence: string): string[] {
  return [
    '--unit',
    UNIT,
    '--date',
    DATE,
    '--receipts-dir',
    evidence,
    '--red-summary',
    'pin written first: 3 failed with the module missing',
    '--local-summary',
    'implementation green; gates recorded',
    '--ledger-dir',
    tempLedger,
  ];
}

/** A proof log directory shaped like the ones the shell ladders produced. */
beforeAll(() => {
  // The temp- prefix puts the copy under .gitignore's temp-* rule, so a run
  // that crashes before afterAll leaves no untracked ledger copy behind.
  tempLedger = fs.mkdtempSync(
    path.join(repoRoot, 'openspec/planning', 'temp-u17-pin-'),
  );
  fs.cpSync(SOURCE_LEDGER, tempLedger, { recursive: true });
  pristineUnits = fs.readFileSync(path.join(tempLedger, 'units.json'), 'utf8');
});

describe('the pin temp ledger', () => {
  it('sits under a name git ignores', () => {
    const ignored = spawnSync('git', ['check-ignore', '-q', tempLedger], {
      cwd: repoRoot,
    });
    expect(ignored.status).toBe(0);
  });
});

afterAll(() => {
  if (tempLedger) fs.rmSync(tempLedger, { recursive: true, force: true });
});

beforeEach(() => {
  fs.writeFileSync(path.join(tempLedger, 'units.json'), pristineUnits);
  // Every u91 artefact goes too: a receipt left behind by the previous case
  // would let a "this file was not written" assertion pass on someone else's
  // output.
  const evidence = path.join(tempLedger, 'evidence');
  for (const name of fs.readdirSync(evidence)) {
    if (name.startsWith('u91-')) fs.rmSync(path.join(evidence, name));
  }
  seedPlannedUnit();
});

describe('roadmap-unit-fold', () => {
  it('folds the three lane receipts and leaves the unit local-verified', () => {
    const result = run(FOLD, foldArgs(seedLaneReceipts()));
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const unit = unitOf(UNIT);
    expect(unit.state).toBe('local-verified');
    expect(unit.baseline).toBe(BASELINE);
    expect(result.stdout).toContain('ROADMAP VALIDATION PASSED');
    expect(result.stdout).toContain(`${UNIT} local-verified`);
  });

  it('writes stage receipts shaped like the ones already on main', () => {
    run(FOLD, foldArgs(seedLaneReceipts()));
    const reference = readJson<ILedger>(
      path.join(SOURCE_LEDGER, 'units.json'),
    ).units.find((unit) => unit.id === 'U14');
    const folded = unitOf(UNIT).stageReceipts;
    if (!reference) throw new Error('U14 is missing from the ledger on main');

    // v3 records the parent decision on the unit entry instead of rewriting
    // the admission receipt, so the admission entry carries exactly one key
    // more than U14's. That difference is asserted, not hidden.
    expect(Object.keys(folded.admission ?? {}).sort()).toEqual(
      [
        ...Object.keys(reference.stageReceipts.admission ?? {}),
        'parentDecisionRecordedHere',
      ].sort(),
    );
    for (const stage of ['red', 'local'] as const) {
      expect(Object.keys(folded[stage] ?? {}).sort()).toEqual(
        Object.keys(reference.stageReceipts[stage] ?? {}).sort(),
      );
    }
    for (const stage of ['admission', 'red', 'local'] as const) {
      const wanted = reference.stageReceipts[stage] ?? {};
      const actual = folded[stage] ?? {};
      for (const key of Object.keys(wanted)) {
        expect(typeof actual[key]).toBe(typeof wanted[key]);
      }
    }
    expect(folded.admission?.path).toBe(`evidence/u91-admission-${DATE}.json`);
    expect(folded.red?.summary).toContain('pin written first');
    expect(folded.local?.summary).toContain('implementation green');
    expect(folded.admission?.parentDecisionRecordedHere).toBe(true);
  });

  it('refuses a unit that is not planned', () => {
    const args = foldArgs(seedLaneReceipts());
    expect(run(FOLD, args).status).toBe(0);
    const second = run(FOLD, args);
    expect(second.status).not.toBe(0);
    expect(second.stderr).toContain('local-verified');
  });

  it('refuses when a lane receipt is missing', () => {
    const evidence = seedLaneReceipts();
    fs.rmSync(path.join(evidence, `u91-red-${DATE}.json`));
    const result = run(FOLD, foldArgs(evidence));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`u91-red-${DATE}.json`);
    expect(unitOf(UNIT).state).toBe('planned');
  });

  it('refuses a local receipt that is not ready', () => {
    const result = run(FOLD, foldArgs(seedLaneReceipts('BLOCKED')));
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('local status');
    expect(unitOf(UNIT).state).toBe('planned');
  });
});

describe('roadmap-unit-park', () => {
  it('folds the receipts, records the finding and blocks the unit', () => {
    const evidence = seedLaneReceipts('BLOCKED');
    const finding = path.join(tempLedger, 'finding.json');
    writeJson(finding, {
      id: 'FN-u91-pin-finding',
      foundBy: 'the U17 pin',
      class: 'unit premise false',
      summary: 'the mechanism the unit needed is unavailable',
      evidence: `evidence/u91-local-${DATE}.json`,
      ownership: 'R6.loop-harness',
      recommendedSuccessor: 'a narrower successor',
    });
    const result = run(PARK, [
      '--unit',
      UNIT,
      '--date',
      DATE,
      '--receipts-dir',
      evidence,
      '--finding',
      finding,
      '--pr-head',
      PR_HEAD,
      '--pr',
      '1836',
      '--cause',
      'FN-u91-pin-finding: the premise is false',
      '--next-action',
      'write the narrower successor',
      '--ledger-dir',
      tempLedger,
    ]);
    expect(result.status).toBe(0);
    const unit = unitOf(UNIT);
    expect(unit.state).toBe('blocked');
    expect(unit.prHead).toBe(PR_HEAD);
    expect(unit.baseline).toBe(BASELINE);
    expect(unit.stageReceipts.local).not.toBeNull();
    const block = unit[`blocked${DATE}`] as Record<string, unknown>;
    expect(block.cause).toContain('FN-u91-pin-finding');
    expect(block.parkedPr).toBe(1836);
    expect(block.nextIndependentAction).toBe('write the narrower successor');
    expect(String(block.proof)).toContain(`u91-local-${DATE}.json`);
    const findings = ledgerUnits().findings ?? [];
    expect(findings.some((entry) => entry.id === 'FN-u91-pin-finding')).toBe(
      true,
    );
    expect(result.stdout).toContain('ROADMAP VALIDATION PASSED');
  });

  it('refuses a finding file with no id', () => {
    const evidence = seedLaneReceipts('BLOCKED');
    const finding = path.join(tempLedger, 'bad-finding.json');
    writeJson(finding, { summary: 'no id here' });
    const result = run(PARK, [
      '--unit',
      UNIT,
      '--date',
      DATE,
      '--receipts-dir',
      evidence,
      '--finding',
      finding,
      '--pr-head',
      PR_HEAD,
      '--pr',
      '1836',
      '--cause',
      'cause',
      '--next-action',
      'next',
      '--ledger-dir',
      tempLedger,
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('finding');
    expect(unitOf(UNIT).state).toBe('planned');
  });
});

describe('roadmap-ledger-lib', () => {
  /**
   * Call one named export of the library in a real Node ESM context (the
   * established scripts/__tests__ pattern - jest transpiles this file to CJS
   * and cannot import a .mjs module directly). A refusal comes back as its
   * code, which is what the CLIs print. `lastLine` takes a RegExp, which JSON
   * cannot carry, so the harness rebuilds it on the other side.
   */
  const call = (
    name: string,
    args: unknown[],
  ): { ok: boolean; value?: unknown; code?: string } => {
    const harness = `
import * as fs from 'node:fs';
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const mod = await import(${JSON.stringify(pathToFileURL(LIB).href)});
const args = request.name === 'lastLine'
  ? [request.args[0], request.args[1], new RegExp(request.args[2])]
  : request.args;
try {
  process.stdout.write(JSON.stringify({ ok: true, value: mod[request.name](...args) }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, code: error.code ?? String(error) }));
}`;
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', harness],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        input: JSON.stringify({ name, args }),
      },
    );
    expect(result.status).toBe(0);
    return JSON.parse(result.stdout) as {
      ok: boolean;
      value?: unknown;
      code?: string;
    };
  };

  it('parses flag pairs and bare booleans into camelCase options', () => {
    const parsed = call('parseFlags', [
      ['--unit', 'U91', '--red-summary', 'a summary', '--dry-run'],
      { strings: ['--unit', '--red-summary'], booleans: ['--dry-run'] },
    ]);
    expect(parsed.ok).toBe(true);
    expect(parsed.value).toEqual({
      unit: 'U91',
      redSummary: 'a summary',
      dryRun: true,
    });
  });

  it('refuses an unknown flag rather than ignoring it', () => {
    const parsed = call('parseFlags', [
      ['--unti', 'U91'],
      { strings: ['--unit'] },
    ]);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe('INVALID_ARGUMENT');
  });

  it('refuses a flag with no value', () => {
    const parsed = call('parseFlags', [['--unit'], { strings: ['--unit'] }]);
    expect(parsed.ok).toBe(false);
    expect(parsed.code).toBe('INVALID_ARGUMENT');
  });

  it('refuses a missing required flag', () => {
    const required = call('requireFlags', [
      { unit: 'U91' },
      ['unit', 'receiptsDir'],
    ]);
    expect(required.ok).toBe(false);
    expect(required.code).toBe('INVALID_ARGUMENT');
  });

  it('refuses a ledger directory that holds no units.json', () => {
    const empty = fs.mkdtempSync(path.join(tempLedger, 'not-a-ledger-'));
    const resolved = call('resolveLedgerDir', [empty]);
    expect(resolved.ok).toBe(false);
    expect(resolved.code).toBe('LEDGER_MISSING');
  });

  it('reads the last matching line of a log and says so when there is none', () => {
    const dir = fs.mkdtempSync(path.join(tempLedger, 'logs-'));
    fs.writeFileSync(
      path.join(dir, 'validator.log'),
      'ROADMAP VALIDATION FAILED\nROADMAP VALIDATION PASSED: 75 nodes\nexit 0\n',
    );
    expect(call('lastLine', [dir, 'validator', 'PASSED|FAILED']).value).toBe(
      'ROADMAP VALIDATION PASSED: 75 nodes',
    );
    expect(call('lastLine', [dir, 'absent', '.']).value).toBe('(no log)');
  });
});
