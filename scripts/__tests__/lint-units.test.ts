/**
 * Pins for the unit lint target (U14 — R6.loop-harness). `npm run lint`
 * cannot see e2e/ or scripts/: the root config ignores both, so every unit
 * receipt that recorded a green root oxlint was recording a vacuous gate for
 * those trees. scripts/qc/lint-units.mjs lints them against the root rule
 * set and ratchets the count, and these pins hold the three things that can
 * silently make it vacuous again: the units config drifting from the root
 * rules, the ignore list growing an `e2e/**` or `**\/scripts/**` entry, and
 * the CLI reporting PASS while findings exceed the ceiling.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const wrapperPath = path.join(repoRoot, 'scripts/qc/lint-units.mjs');
const wrapperUrl = pathToFileURL(wrapperPath).href;
const unitsConfigPath = path.join(repoRoot, 'scripts/qc/oxlint-units.json');
const ceilingPath = path.join(repoRoot, 'scripts/qc/lint-units.ceiling.json');
const rootConfigPath = path.join(repoRoot, '.oxlintrc.json');

interface IHarnessResult {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
}

const readJson = (file: string): Record<string, unknown> =>
  JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;

/**
 * Call one named export of the wrapper in a real Node ESM context (the
 * established scripts/__tests__ pattern — jest transpiles this file to CJS
 * and cannot import a .mjs module directly).
 */
function callExport(name: string, argument: unknown): IHarnessResult {
  const harness = `
import * as fs from 'node:fs';
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
try {
  const mod = await import(${JSON.stringify(wrapperUrl)});
  const value = mod[request.name](request.argument);
  process.stdout.write(JSON.stringify({ ok: true, value }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(error) }));
}`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', harness],
    {
      encoding: 'utf8',
      input: JSON.stringify({ name, argument }),
      cwd: repoRoot,
    },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as IHarnessResult;
}

const buildArgs = (argument: unknown): IHarnessResult =>
  callExport('buildLintUnitsArgs', argument);
const evaluate = (argument: unknown): IHarnessResult =>
  callExport('evaluateLintUnits', argument);

/** Run the CLI itself; `cwd` is what oxlint resolves the lint paths against. */
function runCli(args: string[], cwd: string) {
  const result = spawnSync(process.execPath, [wrapperPath, ...args], {
    encoding: 'utf8',
    cwd,
  });
  const lines = result.stdout.trim().split(/\r?\n/);
  return { status: result.status, stdout: result.stdout, last: lines.at(-1) };
}

describe('lint:units argv builder', () => {
  const config = 'scripts/qc/oxlint-units.json';

  it('returns one argv per path, config and json format ahead of the path', () => {
    expect(
      buildArgs({ paths: ['e2e', 'scripts'], config, ceiling: 0 }).value,
    ).toEqual([
      ['--config', config, '--format', 'json', 'e2e'],
      [
        '--config',
        config,
        '--format',
        'json',
        '--allow',
        'no-console',
        'scripts',
      ],
    ]);
  });

  // The only rule difference from the root set. scripts/ is a tree of CLIs
  // that print by design, so a ceiling dominated by no-console there measures
  // nothing; e2e keeps no-console exactly as the root config sets it.
  it('allows no-console for scripts only', () => {
    const argvs = buildArgs({
      paths: ['e2e', '.', 'scripts'],
      config,
      ceiling: 0,
    }).value as string[][];
    expect(argvs.map((argv) => argv.includes('--allow'))).toEqual([
      false,
      false,
      true,
    ]);
    expect(argvs[2].filter((_value, index) => index >= 4)).toEqual([
      '--allow',
      'no-console',
      'scripts',
    ]);
  });

  it.each([
    ['no paths', { paths: [], config, ceiling: 0 }],
    ['a blank path', { paths: [''], config, ceiling: 0 }],
    ['no config', { paths: ['e2e'], config: '', ceiling: 0 }],
    ['a negative ceiling', { paths: ['e2e'], config, ceiling: -1 }],
    ['a fractional ceiling', { paths: ['e2e'], config, ceiling: 1.5 }],
  ])('rejects %s', (_label, argument) => {
    const result = buildArgs(argument);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('INVALID_ARGUMENT');
  });
});

describe('lint:units verdict', () => {
  it.each([
    ['PASS', 100, 100],
    ['PASS', 99, 100],
    ['FAIL', 101, 100],
    ['PASS', 0, 0],
    ['FAIL', 1, 0],
  ])(
    'is %s at %i findings against a ceiling of %i',
    (verdict, findings, ceiling) => {
      expect(evaluate({ findings, ceiling }).value).toEqual({
        verdict,
        findings,
        ceiling,
        failures: verdict === 'PASS' ? [] : [`total ${findings}/${ceiling}`],
      });
    },
  );

  it.each([
    ['negative findings', { findings: -1, ceiling: 0 }],
    ['a fractional ceiling', { findings: 0, ceiling: 0.5 }],
  ])('rejects %s', (_label, argument) => {
    const result = evaluate(argument);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('INVALID_ARGUMENT');
  });
});

describe('lint:units ceiling file', () => {
  it('parses, and its ceiling is the sum of perPath', () => {
    const ceiling = readJson(ceilingPath);
    const perPath = ceiling.perPath as Record<string, number>;
    expect(Object.keys(perPath).sort()).toEqual([
      'e2e',
      'scripts',
      'src-tests',
      'src/pages/api',
    ]);
    expect(Object.values(perPath).every(Number.isInteger)).toBe(true);
    expect(ceiling.ceiling).toBe(
      Object.values(perPath).reduce((sum, count) => sum + count, 0),
    );
    expect(ceiling.measuredAt).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe('lint:units config', () => {
  it('never re-hides the unit paths it exists to lint', () => {
    const ignorePatterns = readJson(unitsConfigPath).ignorePatterns as string[];
    expect(ignorePatterns).not.toContain('e2e/**');
    expect(ignorePatterns).not.toContain('**/scripts/**');
    expect(
      ignorePatterns.filter((pattern) => /e2e|scripts/.test(pattern)),
    ).toEqual([]);
  });

  // Drift pin: the units config carries the root blocks verbatim because
  // `extends` alone loses rule options (measured on oxlint 1.43.0:
  // jsx-a11y/alt-text and no-empty arrive without their option objects, and
  // plugins/env/categories/overrides are not inherited at all).
  it.each(['rules', 'plugins', 'env', 'categories', 'overrides'])(
    'carries the root %s block verbatim',
    (block) => {
      expect(readJson(unitsConfigPath)[block]).toEqual(
        readJson(rootConfigPath)[block],
      );
    },
  );

  it('extends the root config so a new root rule cannot be missed', () => {
    expect(readJson(unitsConfigPath).extends).toEqual(['../../.oxlintrc.json']);
  });

  // The deliberate finding the integration case below relies on.
  it('inherits no-explicit-any as an error', () => {
    const rules = readJson(rootConfigPath).rules as Record<string, unknown>;
    expect(rules['@typescript-eslint/no-explicit-any']).toBe('error');
  });
});

describe('lint:units package script', () => {
  it('is wired exactly once, with no `|| true`', () => {
    const scripts = readJson(path.join(repoRoot, 'package.json'))
      .scripts as Record<string, string>;
    expect(scripts['lint:units']).toBe('node scripts/qc/lint-units.mjs');
  });
});

describe('lint:units CLI', () => {
  let temporaryDirectory = '';

  beforeAll(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-units-'));
    fs.writeFileSync(
      path.join(temporaryDirectory, 'deliberate.ts'),
      'export const value: any = 1;\n',
    );
  });

  afterAll(() => {
    if (temporaryDirectory)
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('fails, and exits 1, when the deliberate finding is over the ceiling', () => {
    const result = runCli(
      ['--path', '.', '--ceiling', '0'],
      temporaryDirectory,
    );
    expect(result.last).toBe('LINT_UNITS_FAIL 1/0');
    expect(result.stdout).toContain('no-explicit-any');
    expect(result.stdout).toContain('deliberate.ts');
    expect(result.status).toBe(1);
  });

  it('passes, and exits 0, when the ceiling admits it', () => {
    const result = runCli(
      ['--path', '.', '--ceiling', '1'],
      temporaryDirectory,
    );
    expect(result.last).toBe('LINT_UNITS_PASS 1/1');
    expect(result.status).toBe(0);
  });

  it.each([
    ['an unknown flag', ['--nope']],
    ['a non-numeric ceiling', ['--path', '.', '--ceiling', 'many']],
    ['a ceiling flag with no value', ['--path', '.', '--ceiling']],
  ])('rejects %s and exits 1', (_label, args) => {
    const result = runCli(args, temporaryDirectory);
    expect(result.status).toBe(1);
    expect(result.last).toContain('LINT_UNITS_ERROR');
  });
});

describe('lint:units per-path gates', () => {
  const recorded = readJson(ceilingPath) as {
    ceiling: number;
    perPath: Record<string, number>;
  };
  let temporaryDirectory = '';

  // e2e/ holds one finding more than the recorded e2e ceiling; empty-path
  // holds nothing, so oxlint walks zero files there.
  beforeAll(() => {
    temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lint-units-paths-'),
    );
    fs.mkdirSync(path.join(temporaryDirectory, 'empty-path'));
    fs.mkdirSync(path.join(temporaryDirectory, 'e2e'));
    fs.writeFileSync(
      path.join(temporaryDirectory, 'e2e', 'over-ceiling.ts'),
      Array.from(
        { length: recorded.perPath.e2e + 1 },
        (_value, index) => `export const value${index}: any = ${index};\n`,
      ).join(''),
    );
  });

  afterAll(() => {
    if (temporaryDirectory)
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it.each(['empty-path', 'no-such-path'])(
    'fails, and exits 1, when %s lints zero files',
    (target) => {
      const result = runCli(
        ['--path', target, '--ceiling', '5'],
        temporaryDirectory,
      );
      expect(result.stdout).toContain(
        `LINT_UNITS_PATH ${target} files=0 findings=0 ceiling=none FAIL`,
      );
      expect(result.last).toBe('LINT_UNITS_FAIL 0/5');
      expect(result.status).toBe(1);
    },
  );

  it('fails, and exits 1, when a path exceeds its perPath ceiling under the total', () => {
    const over = recorded.perPath.e2e + 1;
    expect(over).toBeLessThan(recorded.ceiling);
    const result = runCli(['--path', 'e2e'], temporaryDirectory);
    expect(result.stdout).toContain(
      `LINT_UNITS_PATH e2e files=1 findings=${over} ceiling=${recorded.perPath.e2e} FAIL`,
    );
    expect(result.last).toBe(`LINT_UNITS_FAIL ${over}/${recorded.ceiling}`);
    expect(result.status).toBe(1);
  });

  // The ratchet on the real tree: every default path lints files and sits at
  // or under its recorded ceiling, and so does the total. Findings may fall
  // below a ceiling; this row never requires a ceiling to be lowered.
  it('holds every default path and the total at or under its ceiling', () => {
    const result = runCli([], repoRoot);
    const rows = [
      ...result.stdout.matchAll(
        /^LINT_UNITS_PATH (\S+) files=(\d+) findings=(\d+) ceiling=(\S+) (PASS|FAIL)$/gm,
      ),
    ].map(([, target, files, findings, ceiling, verdict]) => ({
      target,
      files: Number(files),
      findings: Number(findings),
      ceiling: Number(ceiling),
      verdict,
    }));
    expect(rows.map((row) => row.target).sort()).toEqual(
      Object.keys(recorded.perPath).sort(),
    );
    expect(
      rows.filter(
        (row) =>
          row.verdict !== 'PASS' ||
          row.files === 0 ||
          row.findings > recorded.perPath[row.target],
      ),
    ).toEqual([]);
    const total = rows.reduce((sum, row) => sum + row.findings, 0);
    expect(total).toBeLessThanOrEqual(recorded.ceiling);
    expect(result.last).toBe(`LINT_UNITS_PASS ${total}/${recorded.ceiling}`);
    expect(result.status).toBe(0);
  }, 120_000);
});
