/**
 * Pins for the exact-main regression ladder contract (U9 - R6.loop-harness).
 * E2E-80 says a staged three-context subset SHALL rerun against exact main
 * after a major merge and SHALL archive its result with the milestone.
 * PK-e2e-80-ci-wiring ruled that obligation into a qc contract rather than a
 * workflow job, so the only thing standing between "rerun happened" and
 * "receipt says so" is this parser and this coverage rule. These pins hold
 * the three ways it could silently start lying: the milestone ladder naming
 * a group the runner does not register, a receipt for the wrong commit (or a
 * failing one) counting as coverage, and the CLI reporting success while
 * groups are missing.
 *
 * U9b adds the fourth way, the one U9's own main proof found
 * (FN-u9-rerun-parser-expects-labeled-line): --rerun reading the real ladder
 * runner's output. That runner inherits Playwright's stdio and prints no
 * `<group>:` label, so a rerun whose subset passed archived 0/0 and read
 * MISSING. The rerun cases below feed the captured bytes of that very run
 * back in, and pin what each Playwright summary word counts as.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const modulePath = path.join(
  repoRoot,
  'scripts/qc/validate-exact-main-regression-ladder.mjs',
);
const moduleUrl = pathToFileURL(modulePath).href;
const corePath = path.join(
  repoRoot,
  'scripts/qc/gm-two-player-campaign-core.cjs',
);
const ledgerEvidenceDir = path.join(
  repoRoot,
  'openspec/planning/2026-09-12-roadmap-completion/evidence',
);

const SHA_A = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
/** SHA_A with its last character changed, and nothing else. */
const SHA_A_OFF_BY_ONE = `${SHA_A.slice(0, 39)}9`;

/**
 * The captured tail's non-ASCII bytes, built by code point: the ANSI
 * escape, the micro sign in the web-server timings, and the single right-
 * pointing angle quote Playwright puts between a spec path and a title.
 * Naming them keeps this source pure ASCII, because a raw escape byte in a
 * test file is invisible in a diff. A \u sequence would have done as well:
 * oxfmt 0.28.0 leaves one exactly as written (checked for U39, which found
 * the earlier claim that the formatter rewrites it did not reproduce).
 */
const ESC = String.fromCharCode(0x1b);
const MICRO = String.fromCharCode(0xb5);
const ANGLE = String.fromCharCode(0x203a);

/**
 * The last ten lines of the U9 main proof's real rerun log, byte for byte:
 * seven ANSI-coloured web-server lines, the third per-test `ok` row, a blank
 * line, and Playwright's bare summary. Nothing here says `smoke:` - that
 * absence is the whole defect U9b repairs, and the noise is deliberate: a
 * parser that can be fooled by a web-server line fails this case.
 */
const REAL_RUNNER_TAIL =
  [
    `${ESC}[2m[WebServer] ${ESC}[22m[mp-socket] upgrade verified matchId=502fc652-1e1b-4671-a664-1aa50526d42e playerId=pid_4REBpNHpUU1tpS52N2L67TGB71fc`,
    `${ESC}[2m[WebServer] ${ESC}[22m[mp-socket] connection accepted matchId=502fc652-1e1b-4671-a664-1aa50526d42e channel=campaign playerId=pid_4REBpNHpUU1tpS52N2L67TGB71fc`,
    `${ESC}[2m[WebServer] ${ESC}[22m[mp-socket] bound matchId=502fc652-1e1b-4671-a664-1aa50526d42e channel=campaign`,
    `${ESC}[2m[WebServer] ${ESC}[22m[mp-socket] socket closed matchId=502fc652-1e1b-4671-a664-1aa50526d42e code=1008 reason=campaign-tactical-seats-full`,
    `${ESC}[2m[WebServer] ${ESC}[22m GET / ${ESC}[32m200${ESC}[39m in 82ms${ESC}[2m (next.js: 3ms, application-code: 79ms)${ESC}[22m`,
    `${ESC}[2m[WebServer] ${ESC}[22m DELETE /api/e2e/vault-identity ${ESC}[32m200${ESC}[39m in 1765${MICRO}s${ESC}[2m (next.js: 876${MICRO}s, application-code: 889${MICRO}s)${ESC}[22m`,
    `${ESC}[2m[WebServer] ${ESC}[22m DELETE /api/e2e/vault-identity ${ESC}[32m200${ESC}[39m in 1685${MICRO}s${ESC}[2m (next.js: 656${MICRO}s, application-code: 1029${MICRO}s)${ESC}[22m`,
    `  ok 3 [chromium] ${ANGLE} e2e\\gm-two-player-membership.smoke.spec.ts:65:5 ${ANGLE} binds GM and two tactical seats durably and refuses a fourth identity @membership-smoke (2.3s)`,
    '',
    '  3 passed (21.2s)',
  ].join('\n') + '\n';

/** The same run's first two `ok` rows, with no summary line after them. */
const OK_ROWS_ONLY =
  [
    `  ok 1 [chromium] ${ANGLE} e2e\\gm-two-player-fixture.smoke.spec.ts:14:5 ${ANGLE} creates three isolated future-role contexts @fixture-smoke (2.2s)`,
    `  ok 2 [chromium] ${ANGLE} e2e\\gm-two-player-fixture.smoke.spec.ts:123:5 ${ANGLE} E2E-78 incomplete evidence bundle fails closed and a complete one finalizes @E2E-78 (21ms)`,
  ].join('\n') + '\n';

interface IHarnessResult {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
}
interface IGroupRow {
  readonly group: string;
  readonly passed: number;
  readonly failed: number;
  readonly rejected?: string;
}
interface IVerdict {
  readonly verdict: string;
  readonly required: string[];
  readonly covered: string[];
  readonly missing: string[];
}
interface ILadderRun {
  readonly exitCode: number;
  readonly lines: string[];
  readonly idleCalls: number;
}

const readJson = (file: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;

/**
 * Read one named export of the contract in a real Node ESM context (the
 * established scripts/__tests__ pattern - jest transpiles this file to CJS
 * and cannot import a .mjs module directly). A function export is called
 * with `argument`; a value export is returned as-is. When `runnerScript` is
 * supplied the rerun branch's two collaborators are injected: the machine
 * idle wait and the ladder runner command. That is the ONLY way this pin
 * ever reaches the rerun branch - it never launches Playwright.
 */
function callExport(
  name: string,
  argument?: unknown,
  runnerScript?: string,
): IHarnessResult {
  const harness = `
import * as fs from 'node:fs';
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
let idleCalls = 0;
try {
  const mod = await import(${JSON.stringify(moduleUrl)});
  const member = mod[request.name];
  const injected = request.runnerScript
    ? {
        idleWait: async () => { idleCalls += 1; return []; },
        runnerCommand: (group) => ({
          command: process.execPath,
          args: [request.runnerScript, '--group=' + group],
        }),
      }
    : {};
  const argument = request.runnerScript
    ? { ...request.argument, ...injected }
    : request.argument;
  const value =
    typeof member === 'function' ? await member(argument) : member;
  process.stdout.write(JSON.stringify({ ok: true, value: { value, idleCalls } }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(error) }));
}`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', harness],
    {
      encoding: 'utf8',
      input: JSON.stringify({ name, argument, runnerScript }),
      cwd: repoRoot,
    },
  );
  expect(result.status).toBe(0);
  const parsed = JSON.parse(result.stdout) as {
    ok: boolean;
    value?: { value: unknown; idleCalls: number };
    error?: string;
  };
  if (!parsed.ok) return { ok: false, error: parsed.error };
  // The injected idle wait counts its calls; surface that count beside the
  // returned value so a rerun that skipped the wait is visible.
  const returned = parsed.value?.value;
  return {
    ok: true,
    value:
      runnerScript && returned && typeof returned === 'object'
        ? { ...returned, idleCalls: parsed.value?.idleCalls }
        : returned,
  };
}

function value<T>(result: IHarnessResult): T {
  expect(result.error).toBeUndefined();
  return result.value as T;
}

/** The runner's real group registry, read from the module this unit consumes. */
function registeredGroupNames(): string[] {
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `const { REGISTERED_GROUPS } = require(${JSON.stringify(corePath)});
       process.stdout.write(JSON.stringify(Object.keys(REGISTERED_GROUPS)));`,
    ],
    { encoding: 'utf8', cwd: repoRoot },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as string[];
}

function runCli(args: string[]): { status: number | null; stdout: string } {
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
  return { status: result.status, stdout: result.stdout };
}

/** A main-proof receipt of the shape the loop writes. */
const mainProofReceipt = (
  mergeCommit: string,
  playwright: string,
  verdict = 'PASS',
): Record<string, unknown> => ({
  unit: 'UX',
  stage: 'mainProof',
  mergeCommit,
  runtime: { playwright },
  verdict,
});

function temporaryDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'u9-exact-main-ladder-'));
}

/** A fake ladder runner that prints exactly `output` on stdout and exits 0. */
function fakeRunner(name: string, output: string): string {
  const runnerScript = path.join(temporaryDirectory(), name);
  fs.writeFileSync(
    runnerScript,
    `process.stdout.write(${JSON.stringify(output)});\n`,
  );
  return runnerScript;
}

/** One --rerun through an injected runner, with the rows it archived. */
function rerunThrough(runnerScript: string): {
  run: ILadderRun;
  archived: IGroupRow[];
  archiveDir: string;
} {
  const archiveDir = temporaryDirectory();
  const run = value<ILadderRun>(
    callExport(
      'runExactMainLadder',
      {
        sha: SHA_A,
        head: SHA_A,
        rerun: true,
        evidenceDir: temporaryDirectory(),
        archiveDir,
      },
      runnerScript,
    ),
  );
  const [archiveName] = fs
    .readdirSync(archiveDir)
    .filter((name) => name.endsWith('.json'));
  const receipt = readJson(path.join(archiveDir, archiveName)) as {
    groups: IGroupRow[];
  };
  return {
    run,
    // A rejected row keeps its reason; every other row reads as before.
    archived: receipt.groups.map(({ group, passed, failed, rejected }) => ({
      group,
      passed,
      failed,
      ...(rejected === undefined ? {} : { rejected }),
    })),
    archiveDir,
  };
}

describe('exact-main regression ladder milestone', () => {
  it('names only groups the ladder runner actually registers', () => {
    const ladder = value<{ milestone: string; groups: string[] }[]>(
      callExport('MILESTONE_LADDER'),
    );
    const registered = registeredGroupNames();
    expect(ladder.map((rung) => rung.milestone)).toEqual([
      'fixture-isolation',
      'membership',
      'strict-smoke',
    ]);
    for (const rung of ladder)
      for (const group of rung.groups) expect(registered).toContain(group);
  });

  it('resolves the real registry to the strict smoke milestone', () => {
    expect(
      value<string>(
        callExport('resolveMilestone', {
          registeredGroups: registeredGroupNames(),
        }),
      ),
    ).toBe('strict-smoke');
  });

  it('falls back to membership on a registry with no smoke group', () => {
    expect(
      value<string>(
        callExport('resolveMilestone', {
          registeredGroups: registeredGroupNames().filter(
            (group) => group !== 'smoke',
          ),
        }),
      ),
    ).toBe('membership');
  });

  it('falls back to fixture isolation with no membership-smoke either', () => {
    expect(
      value<string>(
        callExport('resolveMilestone', {
          registeredGroups: registeredGroupNames().filter(
            (group) => group !== 'smoke' && group !== 'membership-smoke',
          ),
        }),
      ),
    ).toBe('fixture-isolation');
  });
});

describe('exact-main regression ladder receipt parsing', () => {
  it('reads the U7 main-proof receipt as conflict-pack 2 passed 0 failed', () => {
    const receipt = readJson(
      path.join(ledgerEvidenceDir, 'u7-mainproof-20260917.json'),
    );
    expect(
      value<IGroupRow[]>(callExport('parseReceiptGroups', receipt)),
    ).toEqual([{ group: 'conflict-pack', passed: 2, failed: 0 }]);
  });

  it('reads the U3 main-proof receipt as authority 17 passed 3 failed', () => {
    const receipt = readJson(
      path.join(ledgerEvidenceDir, 'u3-mainproof-20260917.json'),
    );
    expect(
      value<IGroupRow[]>(callExport('parseReceiptGroups', receipt)),
    ).toEqual([{ group: 'authority', passed: 17, failed: 3 }]);
  });

  it('yields no groups for a runtime line that names no group', () => {
    const receipt = readJson(
      path.join(ledgerEvidenceDir, 'u1-mainproof-20260916.json'),
    );
    expect(
      value<IGroupRow[]>(callExport('parseReceiptGroups', receipt)),
    ).toEqual([]);
  });

  it('yields no groups for an absent or unparseable runtime', () => {
    for (const receipt of [
      {},
      { runtime: {} },
      { runtime: { playwright: 'smoke: finished' } },
      { runtime: { playwright: 'jest pin: Tests: 62 passed, 62 total' } },
    ])
      expect(
        value<IGroupRow[]>(callExport('parseReceiptGroups', receipt)),
      ).toEqual([]);
  });

  it('reads its own archive receipt groups directly', () => {
    expect(
      value<IGroupRow[]>(
        callExport('parseReceiptGroups', {
          sha: SHA_A,
          verdict: 'SATISFIED',
          groups: [{ group: 'smoke', passed: 2, failed: 0, logSha256: 'ab' }],
        }),
      ),
    ).toEqual([{ group: 'smoke', passed: 2, failed: 0 }]);
  });
});

describe('exact-main regression ladder coverage rule', () => {
  const evaluate = (receipts: Record<string, unknown>[]): IVerdict =>
    value<IVerdict>(
      callExport('evaluateExactMain', {
        sha: SHA_A,
        milestone: 'strict-smoke',
        receipts,
      }),
    );

  it('is satisfied by a passing receipt on the exact sha', () => {
    expect(
      evaluate([mainProofReceipt(SHA_A, 'smoke:   2 passed (9.4s)')]),
    ).toEqual({
      verdict: 'SATISFIED',
      sha: SHA_A,
      milestone: 'strict-smoke',
      required: ['smoke'],
      covered: ['smoke'],
      missing: [],
    });
  });

  it.each([
    [
      'the sha differs by one character',
      mainProofReceipt(SHA_A_OFF_BY_ONE, 'smoke:   2 passed (9.4s)'),
    ],
    ['a row failed', mainProofReceipt(SHA_A, 'smoke: 1 failed / 1 passed')],
    ['nothing passed', mainProofReceipt(SHA_A, 'smoke:   0 passed (0.2s)')],
    [
      'the receipt verdict is not PASS',
      mainProofReceipt(SHA_A, 'smoke:   2 passed (9.4s)', 'FAIL'),
    ],
    [
      'the group name differs',
      mainProofReceipt(SHA_A, 'fixture-smoke:   2 passed (9.4s)'),
    ],
  ])('is missing when %s', (_case, receipt) => {
    expect(evaluate([receipt])).toEqual({
      verdict: 'MISSING',
      sha: SHA_A,
      milestone: 'strict-smoke',
      required: ['smoke'],
      covered: [],
      missing: ['smoke'],
    });
  });

  it('accepts this contract own archive receipt on the exact sha', () => {
    expect(
      evaluate([
        {
          sha: SHA_A,
          milestone: 'strict-smoke',
          verdict: 'SATISFIED',
          groups: [{ group: 'smoke', passed: 1, failed: 0, logSha256: 'ab' }],
        },
      ]).verdict,
    ).toBe('SATISFIED');
  });

  it.each([
    ['an archive receipt that records MISSING', 'MISSING'],
    ['an archive receipt wearing the main-proof word', 'PASS'],
  ])('is not covered by %s', (_case, verdict) => {
    expect(
      evaluate([
        {
          sha: SHA_A,
          milestone: 'strict-smoke',
          verdict,
          groups: [{ group: 'smoke', passed: 1, failed: 0, logSha256: 'ab' }],
        },
      ]).verdict,
    ).toBe('MISSING');
  });

  it('rejects a milestone that is not on the ladder', () => {
    expect(
      callExport('evaluateExactMain', {
        sha: SHA_A,
        milestone: 'everything',
        receipts: [],
      }).error,
    ).toContain('INVALID_ARGUMENT');
  });
});

describe('exact-main regression ladder CLI', () => {
  it('prints SATISFIED and exits 0 when the evidence covers the sha', () => {
    const evidenceDir = temporaryDirectory();
    fs.writeFileSync(
      path.join(evidenceDir, 'fabricated-mainproof.json'),
      JSON.stringify(mainProofReceipt(SHA_A, 'smoke:   2 passed (9.4s)')),
    );
    const result = runCli([
      '--sha',
      SHA_A,
      '--evidence-dir',
      evidenceDir,
      '--archive-dir',
      temporaryDirectory(),
    ]);
    expect(result.stdout.trim()).toBe(
      `EXACT_MAIN_LADDER_SATISFIED ${SHA_A} milestone=strict-smoke groups=smoke`,
    );
    expect(result.status).toBe(0);
  });

  it('prints MISSING and exits 1 when only another sha is covered', () => {
    const evidenceDir = temporaryDirectory();
    fs.writeFileSync(
      path.join(evidenceDir, 'fabricated-mainproof.json'),
      JSON.stringify(
        mainProofReceipt(SHA_A_OFF_BY_ONE, 'smoke:   2 passed (9.4s)'),
      ),
    );
    const result = runCli([
      '--sha',
      SHA_A,
      '--evidence-dir',
      evidenceDir,
      '--archive-dir',
      temporaryDirectory(),
    ]);
    expect(result.stdout.trim()).toBe(
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    );
    expect(result.status).toBe(1);
  });

  it('refuses --rerun at a head that is not the sha, and exits 2', () => {
    const result = runCli([
      '--sha',
      SHA_A,
      '--evidence-dir',
      temporaryDirectory(),
      '--archive-dir',
      temporaryDirectory(),
      '--rerun',
    ]);
    expect(result.stdout.trim()).toMatch(
      /^EXACT_MAIN_LADDER_REFUSED head-mismatch [0-9a-f]{40}$/,
    );
    expect(result.stdout).not.toContain(SHA_A);
    expect(result.status).toBe(2);
  });

  it('rejects an argument that is not a 40-hex sha', () => {
    const result = runCli(['--sha', 'main']);
    expect(result.stdout).toContain('EXACT_MAIN_LADDER_ERROR');
    expect(result.status).toBe(1);
  });
});

describe('exact-main regression ladder rerun branch', () => {
  it('waits for idle, runs the missing group, and archives the result', () => {
    const archiveDir = temporaryDirectory();
    // Playwright's bare summary, the only shape the real runner prints (a
    // labelled `smoke:` line is rejected since U39).
    const runnerScript = path.join(temporaryDirectory(), 'fake-runner.mjs');
    fs.writeFileSync(
      runnerScript,
      "process.stdout.write('  1 passed (0.4s)\\n');\n",
    );
    const run = value<ILadderRun>(
      callExport(
        'runExactMainLadder',
        {
          sha: SHA_A,
          head: SHA_A,
          rerun: true,
          evidenceDir: temporaryDirectory(),
          archiveDir,
        },
        runnerScript,
      ),
    );
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_SATISFIED ${SHA_A} milestone=strict-smoke groups=smoke`,
    ]);
    expect(run.exitCode).toBe(0);
    expect(run.idleCalls).toBe(1);

    const archived = fs
      .readdirSync(archiveDir)
      .filter((name) => name.endsWith('.json'));
    expect(archived).toHaveLength(1);
    expect(archived[0]).toMatch(
      new RegExp(
        `^exact-main-ladder-${SHA_A.slice(0, 12)}-\\d{4}-\\d{2}-\\d{2}\\.json$`,
      ),
    );
    const receipt = readJson(path.join(archiveDir, archived[0])) as {
      sha: string;
      milestone: string;
      at: string;
      verdict: string;
      groups: {
        group: string;
        passed: number;
        failed: number;
        logSha256: string;
      }[];
    };
    expect(receipt.sha).toBe(SHA_A);
    expect(receipt.milestone).toBe('strict-smoke');
    expect(receipt.verdict).toBe('SATISFIED');
    expect(Date.parse(receipt.at)).not.toBeNaN();
    expect(receipt.groups).toHaveLength(1);
    expect(receipt.groups[0].group).toBe('smoke');
    expect(receipt.groups[0].passed).toBe(1);
    expect(receipt.groups[0].failed).toBe(0);
    expect(receipt.groups[0].logSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(
      fs.readFileSync(path.join(archiveDir, 'smoke.log'), 'utf8'),
    ).toContain('  1 passed (0.4s)');

    // The round trip: a later check-mode run reading the archived receipt
    // back must agree that the sha is now covered.
    const recheck = runCli([
      '--sha',
      SHA_A,
      '--evidence-dir',
      archiveDir,
      '--archive-dir',
      temporaryDirectory(),
    ]);
    expect(recheck.stdout.trim()).toBe(
      `EXACT_MAIN_LADDER_SATISFIED ${SHA_A} milestone=strict-smoke groups=smoke`,
    );
    expect(recheck.status).toBe(0);
  });

  it('stays MISSING and exits 1 when the rerun proves nothing', () => {
    const archiveDir = temporaryDirectory();
    const runnerScript = path.join(temporaryDirectory(), 'silent-runner.mjs');
    fs.writeFileSync(runnerScript, "process.stdout.write('no rows\\n');\n");
    const run = value<ILadderRun>(
      callExport(
        'runExactMainLadder',
        {
          sha: SHA_A,
          head: SHA_A,
          rerun: true,
          evidenceDir: temporaryDirectory(),
          archiveDir,
        },
        runnerScript,
      ),
    );
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });
});

describe('exact-main regression ladder rerun reads the real runner', () => {
  it('archives smoke 3/0 and is SATISFIED on the runner real bytes', () => {
    const { run, archived, archiveDir } = rerunThrough(
      fakeRunner('verbatim-runner.mjs', REAL_RUNNER_TAIL),
    );
    expect(archived).toEqual([{ group: 'smoke', passed: 3, failed: 0 }]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_SATISFIED ${SHA_A} milestone=strict-smoke groups=smoke`,
    ]);
    expect(run.exitCode).toBe(0);

    // The round trip U9's main proof never reached: check mode reading the
    // archived receipt back must now agree the sha is covered.
    const recheck = runCli([
      '--sha',
      SHA_A,
      '--evidence-dir',
      archiveDir,
      '--archive-dir',
      temporaryDirectory(),
    ]);
    expect(recheck.stdout.trim()).toBe(
      `EXACT_MAIN_LADDER_SATISFIED ${SHA_A} milestone=strict-smoke groups=smoke`,
    );
    expect(recheck.status).toBe(0);
  });

  it('archives 2/1 and stays MISSING when the summary reports a failure', () => {
    const { run, archived } = rerunThrough(
      fakeRunner('failing-runner.mjs', '  1 failed\n  2 passed (8.1s)\n'),
    );
    expect(archived).toEqual([{ group: 'smoke', passed: 2, failed: 1 }]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });

  it('archives 0/0 and stays MISSING when only ok rows are printed', () => {
    const { run, archived } = rerunThrough(
      fakeRunner('ok-rows-runner.mjs', OK_ROWS_ONLY),
    );
    expect(archived).toEqual([{ group: 'smoke', passed: 0, failed: 0 }]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });

  // A row that only went green on retry is not "ran clean against this exact
  // commit", so flaky is counted as failed and a flaky rerun is not coverage.
  it('archives 2/1 and stays MISSING when the summary reports a flake', () => {
    const { run, archived } = rerunThrough(
      fakeRunner('flaky-runner.mjs', '  1 flaky\n  2 passed (9.9s)\n'),
    );
    expect(archived).toEqual([{ group: 'smoke', passed: 2, failed: 1 }]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });

  // Playwright prints `N interrupted` for a run that never finished - a
  // worker crash, the global timeout, --max-failures, or a SIGINT. It rides
  // beside a clean `N passed` line with no `failed` line at all, so a parser
  // blind to the word reads an aborted run as coverage. It counts as failed.
  it('archives 2/1 and stays MISSING when the summary reports an interruption', () => {
    const { run, archived } = rerunThrough(
      fakeRunner(
        'interrupted-runner.mjs',
        '  1 interrupted\n  2 passed (7.4s)\n',
      ),
    );
    expect(archived).toEqual([{ group: 'smoke', passed: 2, failed: 1 }]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });

  // The one summary token that counts errors rather than tests. Playwright
  // prints it only when at least one test ran, so it rides directly behind a
  // clean `N passed` line - the same false-coverage shape as an interruption.
  it('archives 2/1 and stays MISSING when a fatal error rode beside the passes', () => {
    const { run, archived } = rerunThrough(
      fakeRunner(
        'fatal-error-runner.mjs',
        '  2 passed (6.2s)\n  1 error was not a part of any test, see above for details\n',
      ),
    );
    expect(archived).toEqual([{ group: 'smoke', passed: 2, failed: 1 }]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });

  // U39: runGroup spawns the runner once per group, so its output holds one
  // Playwright summary block. Two blocks mean two runs (or a runner that
  // retried the whole group), and their passes must not be added into one
  // clean-looking row.
  it('archives 0/0 as rejected and stays MISSING on two summary blocks', () => {
    const { run, archived } = rerunThrough(
      fakeRunner(
        'two-block-runner.mjs',
        '  2 passed (5.0s)\n\nRunning 3 tests using 1 worker\n  3 passed (4.1s)\n',
      ),
    );
    expect(archived).toEqual([
      { group: 'smoke', passed: 0, failed: 0, rejected: 'two-summary-blocks' },
    ]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });

  // The real runner never prints `<group>:` at column 0; such a line is a
  // runner that labels (or fakes) its own verdict, and is not read as one.
  it('archives 0/0 as rejected and stays MISSING on a column-0 group line', () => {
    const { run, archived } = rerunThrough(
      fakeRunner('labelled-runner.mjs', 'smoke:   1 passed (0.4s)\n'),
    );
    expect(archived).toEqual([
      {
        group: 'smoke',
        passed: 0,
        failed: 0,
        rejected: 'column-0-group-line',
      },
    ]);
    expect(run.lines).toEqual([
      `EXACT_MAIN_LADDER_MISSING ${SHA_A} milestone=strict-smoke missing=smoke`,
    ]);
    expect(run.exitCode).toBe(1);
  });
});

describe('exact-main regression ladder runner output reader', () => {
  const read = (output: string): IGroupRow =>
    value<IGroupRow>(
      callExport('parseRunnerOutput', { group: 'smoke', output }),
    );

  it.each<[string, string, string]>([
    [
      'a labelled line for the group',
      'smoke: 4 passed (1.1s)\n  9 passed (2s)',
      'column-0-group-line',
    ],
    [
      'a labelled line for another group',
      '  2 passed (2s)\nfixture-smoke: 1 passed',
      'column-0-group-line',
    ],
    [
      'a repeated passed summary',
      '  1 passed (1s)\n  2 passed (2s)',
      'two-summary-blocks',
    ],
    [
      'a second block that starts again at failed',
      '  3 passed (2s)\n  1 failed\n  4 passed (3s)',
      'two-summary-blocks',
    ],
  ])('rejects %s', (_case, output, rejected) => {
    expect(read(output)).toEqual({
      group: 'smoke',
      passed: 0,
      failed: 0,
      rejected,
    });
  });

  it.each<[string, string, number, number]>([
    [
      'one full block with its listed tests',
      '  1 failed\n    [chromium] > a.spec.ts:1:1 > t\n  1 flaky\n    [chromium] > b.spec.ts:2:1 > u\n  1 skipped\n  2 passed (3s)',
      2,
      2,
    ],
    ['a skipped row counts as neither', '  1 skipped\n  2 passed (3.3s)', 2, 0],
    [
      'a did-not-run row counts as failed',
      '  2 did not run\n  1 passed (5s)',
      1,
      2,
    ],
    [
      'an interrupted row counts as failed',
      '  1 interrupted\n  2 passed (5.1s)',
      2,
      1,
    ],
    [
      'the plural fatal-error token counts as failed',
      '  2 passed (4s)\n  3 errors were not a part of any test, see above for details',
      2,
      3,
    ],
    ['prose that is not a summary', 'Running 3 tests using 1 worker', 0, 0],
  ])('reads %s', (_case, output, passed, failed) => {
    expect(read(output)).toEqual({ group: 'smoke', passed, failed });
  });
});

describe('exact-main regression ladder package script', () => {
  it('is wired as qc:exact-main-ladder', () => {
    const manifest = readJson(path.join(repoRoot, 'package.json')) as {
      scripts: Record<string, string>;
    };
    expect(manifest.scripts['qc:exact-main-ladder']).toBe(
      'node scripts/qc/validate-exact-main-regression-ladder.mjs',
    );
  });
});
