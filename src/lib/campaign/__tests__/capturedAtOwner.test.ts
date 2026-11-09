/**
 * `ICombatOutcome.capturedAt` is a WALL-CLOCK instant ("when this outcome was
 * derived"). A campaign's date is an in-game date on a different timeline, so
 * campaign code must not compare the two (that made applied battles vanish
 * from company morale for era campaigns, for the first day of a new campaign,
 * and for any campaign whose date lags the wall clock). The campaign's own time
 * for an applied outcome is `appliedOn` (see `appliedOutcomes.ts`).
 *
 * This guard lists the only non-test source files whose CODE mentions
 * `capturedAt`. A new mention fails here, so the question is asked again
 * instead of a reader being patched in quietly.
 *
 * @spec openspec/changes/fix-captured-at-time-domain/specs/campaign-refit-and-prestige/spec.md
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const SRC = join(__dirname, '..', '..', '..');

/** Files whose code legitimately names `capturedAt`, and why. */
const ALLOWED: Readonly<Record<string, string>> = {
  'types/combat/CombatOutcome.ts':
    'the field definition (wall-clock provenance)',
  'lib/combat/outcome/combatOutcome.ts':
    'the producer: stamps the wall clock unless a caller overrides it',
  'engine/InteractiveSession.lifecycle.ts':
    'passes the caller-supplied override through; reads nothing',
  'lib/campaign/salvage/salvageEngine.ts':
    'hands the value on as a record stamp; no date comparison',
  'lib/campaign/salvage/salvageUnitRecovery.ts':
    'a record stamp (`lastUpdated`); no date comparison',
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (
        name === '__tests__' ||
        name === '__fixtures__' ||
        name === 'fixtures' ||
        name === 'node_modules'
      )
        continue;
      out.push(...sourceFiles(full));
    } else if (
      /\.(ts|tsx)$/.test(name) &&
      !/\.(test|spec|stories)\.(ts|tsx)$/.test(name) &&
      !/test-helpers?\.(ts|tsx)$/.test(name)
    ) {
      out.push(full);
    }
  }
  return out;
}

/** Source with comments removed, so documentation can name the field. */
function codeOnly(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('capturedAt has one owner and no campaign-time readers', () => {
  const mentions = sourceFiles(SRC)
    .filter((file) =>
      codeOnly(readFileSync(file, 'utf8')).includes('capturedAt'),
    )
    .map((file) => relative(SRC, file).split(sep).join('/'))
    .sort();

  it('is named in code only by the producer, its definition, the override pass-through and the salvage record stamp', () => {
    expect(mentions).toEqual(Object.keys(ALLOWED).sort());
  });

  it('is not read by the campaign morale code, which uses appliedOn', () => {
    expect(mentions).not.toContain(
      'lib/campaign/prestige/gatherMoraleSignals.ts',
    );
    expect(mentions).not.toContain(
      'lib/campaign/processors/moraleProcessor.ts',
    );
    expect(mentions).not.toContain('lib/campaign/appliedOutcomes.ts');
  });
});
