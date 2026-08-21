/**
 * PR-lane wrapper + failure-class pins for the subsystem coverage ledger
 * validator (W6 task 3.2 — spec: e2e-testing "Subsystem Validation
 * Coverage"). The real-artifact test is the enforcement the old 19-spec
 * requirement never had; the in-memory cases pin every failure class so a
 * validator regression cannot silently reopen one.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const validatorUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/validate-subsystem-coverage.mjs'),
).href;

interface IHarnessResult {
  readonly ok: boolean;
  readonly messages?: string[];
  readonly error?: string;
}

/**
 * Run validateSubsystemCoverage in a real Node ESM context (the established
 * scripts/__tests__ pattern) against an in-memory ledger + probe fixture.
 * `specFiles` maps spec path → file content for the exists/contains probes;
 * `nightlyMatrixTags` mirrors the parsed lane matrix (null = job absent).
 */
function runValidator(request: {
  ledger: unknown;
  specFiles: Record<string, string>;
  nightlyMatrixTags: string[] | null;
}): IHarnessResult {
  const harness = `
import * as fs from 'node:fs';
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
try {
  const mod = await import(${JSON.stringify(validatorUrl)});
  const issues = mod.validateSubsystemCoverage(request.ledger, {
    specExists: (p) => Object.prototype.hasOwnProperty.call(request.specFiles, p),
    specContains: (p, literal) => (request.specFiles[p] ?? '').includes(literal),
    nightlyMatrixTags: request.nightlyMatrixTags,
    laneTagTenanted: (tag) =>
      Object.values(request.specFiles).some((content) =>
        content.includes("'@subsystem:" + tag + "'"),
      ),
  });
  process.stdout.write(JSON.stringify({ ok: true, messages: issues.map((i) => i.message) }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: String(error) }));
  process.exitCode = 1;
}`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', harness],
    { encoding: 'utf8', input: JSON.stringify(request) },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as IHarnessResult;
}

/** A minimal valid ledger covering all 19 ids, derived from the real one. */
function realLedger(): { subsystems: Array<Record<string, unknown>> } {
  return JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'docs/qc/mekstation-subsystem-coverage.json'),
      'utf8',
    ),
  );
}

/** Probe fixture mirroring the real specs the real ledger names. */
function realSpecFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const row of realLedger().subsystems) {
    for (const specPath of (row.coveringSpecs as string[]) ?? []) {
      files[specPath] = fs.readFileSync(path.join(repoRoot, specPath), 'utf8');
    }
  }
  return files;
}

describe('subsystem coverage ledger', () => {
  it('validates the checked-in ledger against the real tree (CLI)', () => {
    // The CLI is what the mutation proofs and local runs use — run it whole
    // so path wiring and the nightly-matrix parse are covered too.
    const result = spawnSync(
      process.execPath,
      ['scripts/qc/validate-subsystem-coverage.mjs'],
      { encoding: 'utf8', cwd: repoRoot },
    );
    expect(result.stdout).toContain('errors=0');
    expect(result.status).toBe(0);
  });

  it('fails on a missing row', () => {
    const ledger = realLedger();
    ledger.subsystems = ledger.subsystems.filter((row) => row.id !== 'morale');
    const result = runValidator({
      ledger,
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(result.messages).toContain('Missing subsystem row morale.');
  });

  it('fails on an extra (unknown) row', () => {
    const ledger = realLedger();
    ledger.subsystems.push({
      id: 'warcrimes',
      facet: 'combat',
      coveringSpecs: [],
      status: 'deferred',
      followUpRef: 'nope',
    });
    const result = runValidator({
      ledger,
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(result.messages).toContain('Unknown subsystem row warcrimes.');
  });

  it('fails on a duplicate row', () => {
    const ledger = realLedger();
    ledger.subsystems.push({ ...ledger.subsystems[0] });
    const result = runValidator({
      ledger,
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(
      result.messages?.some((m) => m.startsWith('Duplicate subsystem row')),
    ).toBe(true);
  });

  it('fails on an invalid facet and an invalid status', () => {
    const ledger = realLedger();
    const hiring = ledger.subsystems.find((row) => row.id === 'hiring');
    const loans = ledger.subsystems.find((row) => row.id === 'loans');
    if (hiring) hiring.facet = 'vibes';
    if (loans) loans.status = 'aspirational';
    const result = runValidator({
      ledger,
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(result.messages).toContain('hiring: invalid facet vibes.');
    expect(result.messages).toContain('loans: invalid status aspirational.');
  });

  it('fails on a dangling coveringSpecs path', () => {
    const ledger = realLedger();
    const awards = ledger.subsystems.find((row) => row.id === 'awards');
    if (awards) awards.coveringSpecs = ['e2e/does-not-exist.spec.ts'];
    const result = runValidator({
      ledger,
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(result.messages).toContain(
      'awards: coveringSpecs path e2e/does-not-exist.spec.ts does not exist.',
    );
  });

  it('fails on a non-deferred row whose spec lacks the @subsystem tag', () => {
    const specFiles = realSpecFiles();
    specFiles['e2e/awards.spec.ts'] = 'no tags here';
    const result = runValidator({
      ledger: realLedger(),
      specFiles,
      nightlyMatrixTags: null,
    });
    expect(result.messages).toContain(
      "awards: spec e2e/awards.spec.ts lacks the '@subsystem:experience' tag.",
    );
  });

  it('fails on a deferred row without a followUpRef', () => {
    const ledger = realLedger();
    const morale = ledger.subsystems.find((row) => row.id === 'morale');
    if (morale) delete morale.followUpRef;
    const result = runValidator({
      ledger,
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(result.messages).toContain(
      'morale: deferred row must declare a followUpRef.',
    );
  });

  it('lane cross-check stays dormant while the nightly job is absent', () => {
    const result = runValidator({
      ledger: realLedger(),
      specFiles: realSpecFiles(),
      nightlyMatrixTags: null,
    });
    expect(result.messages).toEqual([]);
  });

  it('lane cross-check fails both directions once the job exists', () => {
    // combat has no tagged rows → a combat lane is untenanted; economy has
    // tagged rows → omitting its lane fails the reverse direction.
    const result = runValidator({
      ledger: realLedger(),
      specFiles: realSpecFiles(),
      nightlyMatrixTags: ['combat'],
    });
    expect(result.messages).toContain(
      'Nightly lane tag combat has no tagged covering spec.',
    );
    expect(result.messages).toContain(
      'Facet economy has tagged non-deferred rows but no nightly lane.',
    );
  });
});
