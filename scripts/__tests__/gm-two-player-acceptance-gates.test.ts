/**
 * Pins for the umbrella acceptance run's resolution rule: the requirement
 * 'Acceptance Run Excludes Only Named-Gate Rows' in the e2e-testing delta of
 * harden-gm-two-player-campaign-sessions, over the gated-absent manifest
 * scripts/qc/gm-two-player-acceptance-gates.cjs (roadmap unit U29).
 *
 * The manifest only lists; these pins decide. They read three things and run
 * no browser: the catalogue ids from the delta's scenario headings, the test
 * titles of the spec files the runner's `all` plan hands Playwright, and the
 * manifest. Each catalogue id must resolve exactly once - to its authored
 * rows, to the E2E-80 exact-main contract, or to one gated-absent entry - and
 * the run's spec files must carry no fixme, no test.fail without a named gate
 * tag, and no skip the manifest does not name as runner-guarded.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

interface IGatedAbsent {
  readonly id: string;
  readonly gateTag: string;
  readonly holder: string;
  readonly source: string;
}
interface IRunnerGuardedSkip {
  readonly file: string;
  readonly mark: string;
  readonly count: number;
  readonly env: string;
}
interface IRunPlan {
  readonly args: readonly string[];
  readonly environment: Record<string, string>;
}

const repoRoot = path.resolve(__dirname, '../..');
// The qc modules are CommonJS; createRequire loads them without a bare require.
const load = createRequire(__filename);
const core = load('../qc/gm-two-player-campaign-core.cjs') as {
  REGISTERED_GROUPS: Record<string, number>;
  buildRunPlan: (input: {
    group: string;
    runId: string;
    repoRoot: string;
  }) => IRunPlan;
};
const gates = load('../qc/gm-two-player-acceptance-gates.cjs') as {
  EXACT_MAIN_CONTRACT: { readonly id: string; readonly path: string };
  NAMED_GATES: Record<string, string>;
  GATED_ABSENT: readonly IGatedAbsent[];
  RUNNER_GUARDED_SKIPS: readonly IRunnerGuardedSkip[];
};

const DELTA =
  'openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md';

/** Reads a repository file as UTF-8 text. */
const read = (file: string): string =>
  readFileSync(path.join(repoRoot, file), 'utf8');

/** The e2e spec files a registered group's plan hands Playwright, or null when the group throws NOT_IMPLEMENTED. */
function planSpecs(group: string): IRunPlan | null {
  try {
    return core.buildRunPlan({
      group,
      runId: 'u29-acceptance-gates',
      repoRoot,
    });
  } catch {
    return null;
  }
}

const allPlan = planSpecs('all') as IRunPlan;
const runSpecs = allPlan.args.filter((arg) => arg.startsWith('e2e/'));

/** The catalogue ids, in heading order, from the delta's "#### Scenario: E2E-NN" lines. */
const catalogue = [
  ...read(DELTA).matchAll(/^#### Scenario: (E2E-\d{2}) /gm),
].map((match) => match[1]);

/** Every @E2E-NN tag inside the title (first string argument) of a bare test( call. */
const titleIds = (text: string): string[] =>
  [...text.matchAll(/\btest\(\s*(['"`])((?:(?!\1)[\s\S])*)\1/g)].flatMap(
    (match) => [...match[2].matchAll(/@(E2E-\d{2})\b/g)].map((tag) => tag[1]),
  );

/**
 * The sources resolving each catalogue id: 'row' once when any run spec has a
 * titled row for it, 'exact-main contract' for EXACT_MAIN_CONTRACT, and one
 * 'gated-absent <tag>' per manifest entry (a duplicate entry counts twice).
 * Ids that are not in the catalogue are returned under their own key too.
 */
function resolveCatalogue(): Map<string, string[]> {
  const sources = new Map<string, string[]>(catalogue.map((id) => [id, []]));
  const add = (id: string, source: string) =>
    sources.set(id, [...(sources.get(id) ?? []), source]);
  const rowed = new Set(runSpecs.flatMap((file) => titleIds(read(file))));
  for (const id of rowed) add(id, 'row');
  add(gates.EXACT_MAIN_CONTRACT.id, 'exact-main contract');
  for (const entry of gates.GATED_ABSENT)
    add(entry.id, `gated-absent ${entry.gateTag}`);
  return sources;
}

/** The 1-based line of a character offset in a text. */
const lineOf = (text: string, offset: number): number =>
  text.slice(0, offset).split('\n').length;

/**
 * Every skip, fixme or fail mark in the run's spec files that the manifest
 * does not account for, as "<file>:<line> <mark>". A fail mark is accounted
 * for when its call text names a NAMED_GATES tag; a skip mark when it is one
 * of the file's RUNNER_GUARDED_SKIPS marks and the file carries exactly the
 * entry's count of them; a fixme mark never is.
 */
function unaccountedMarks(): string[] {
  const found: string[] = [];
  for (const file of runSpecs) {
    const text = read(file);
    const guarded = gates.RUNNER_GUARDED_SKIPS.filter(
      (entry) => entry.file === file,
    );
    const seen = new Map<IRunnerGuardedSkip, number>();
    for (const match of text.matchAll(
      /\btest(?:\.describe)?(?:\.(?:serial|parallel))?\.(skip|fixme|fail)\s*\(/g,
    )) {
      const offset = match.index ?? 0;
      const call = text.slice(offset, text.indexOf(');', offset) + 2);
      const where = `${file}:${lineOf(text, offset)} ${call.split('\n')[0]}`;
      if (match[1] === 'fail') {
        const named = Object.keys(gates.NAMED_GATES).some((tag) =>
          call.includes(tag),
        );
        if (!named) found.push(where);
        continue;
      }
      const entry =
        match[1] === 'skip'
          ? guarded.find((candidate) => call.startsWith(candidate.mark))
          : undefined;
      if (entry) seen.set(entry, (seen.get(entry) ?? 0) + 1);
      else found.push(where);
    }
    for (const entry of guarded)
      if ((seen.get(entry) ?? 0) !== entry.count)
        found.push(
          `${file} expected ${entry.count} x ${entry.mark}, found ${seen.get(entry) ?? 0}`,
        );
  }
  return found;
}

describe('GM two-player acceptance gates manifest (U29)', () => {
  it('reads the catalogue E2E-01..80 from the e2e-testing delta', () => {
    expect(catalogue).toEqual(
      Array.from(
        { length: 80 },
        (_, index) => `E2E-${String(index + 1).padStart(2, '0')}`,
      ),
    );
  });

  it('resolves every catalogue id exactly once', () => {
    const sources = resolveCatalogue();
    const unresolved = [...sources]
      .filter(([, from]) => from.length === 0)
      .map(([id]) => id);
    const doublyResolved = [...sources]
      .filter(([, from]) => from.length > 1)
      .map(([id, from]) => `${id} <- ${from.join(' + ')}`);
    const outsideCatalogue = [...sources.keys()].filter(
      (id) => !catalogue.includes(id),
    );
    expect({ unresolved, doublyResolved, outsideCatalogue }).toEqual({
      unresolved: [],
      doublyResolved: [],
      outsideCatalogue: [],
    });
  });

  it('names a gate tag, a holder and a source for every gated-absent id', () => {
    const malformed = gates.GATED_ABSENT.filter(
      (entry) =>
        !/^E2E-\d{2}$/.test(entry.id) ||
        !/^@until-\S+$/.test(entry.gateTag) ||
        !entry.holder.trim() ||
        !entry.source.trim(),
    ).map((entry) => entry.id);
    expect(malformed).toEqual([]);
  });

  it('leaves no skip, fixme or unnamed test.fail mark in the run', () => {
    expect(runSpecs.length).toBeGreaterThan(0);
    expect(unaccountedMarks()).toEqual([]);
  });

  it('names only skips that cannot fire because every plan running them sets their variable', () => {
    const groups = Object.keys(core.REGISTERED_GROUPS);
    for (const entry of gates.RUNNER_GUARDED_SKIPS) {
      expect(runSpecs).toContain(entry.file);
      const plans = groups
        .map(planSpecs)
        .filter((plan): plan is IRunPlan => !!plan?.args.includes(entry.file));
      expect(plans.length).toBeGreaterThan(0);
      for (const plan of plans)
        expect(plan.environment[entry.env]).toMatch(/\S/);
      // Each mark must sit directly under the line binding runId to the
      // variable, so the variable the plans set is the one the mark reads.
      const literal = (text: string) =>
        text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const bound = new RegExp(
        `${literal(`const runId = process.env.${entry.env};`)}\\s*${literal(entry.mark)}`,
        'g',
      );
      expect(read(entry.file).match(bound)?.length ?? 0).toBe(entry.count);
    }
  });

  it('keeps E2E-80 on the exact-main regression contract file', () => {
    expect(gates.EXACT_MAIN_CONTRACT.id).toBe('E2E-80');
    expect(
      existsSync(path.join(repoRoot, gates.EXACT_MAIN_CONTRACT.path)),
    ).toBe(true);
    expect(read(gates.EXACT_MAIN_CONTRACT.path)).toContain('E2E-80');
  });
});
