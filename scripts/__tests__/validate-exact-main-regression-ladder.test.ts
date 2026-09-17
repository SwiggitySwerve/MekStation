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

interface IHarnessResult {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
}
interface IGroupRow {
  readonly group: string;
  readonly passed: number;
  readonly failed: number;
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
    const runnerScript = path.join(temporaryDirectory(), 'fake-runner.mjs');
    fs.writeFileSync(
      runnerScript,
      "process.stdout.write(process.argv[2].split('=')[1] + ':   1 passed (0.4s)\\n');\n",
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
    ).toContain('smoke:   1 passed');

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
