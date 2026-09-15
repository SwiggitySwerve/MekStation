/**
 * The live probe's synthetic Playwright config must hold against the real
 * `playwright.config.ts`, not against a hand-maintained memory of it.
 *
 * The failure this exists for: `proof5d5-playwright-failure-traversal`
 * re-homes the repo-root config into an out-of-repo `mkdtemp` scratch
 * directory by spreading it, then hand-overrides the handful of inherited
 * keys that are meaningless there. Playwright resolves script-valued config
 * keys against the CONFIG FILE's own directory, not the process cwd, so any
 * repo-root-relative path the base declares and the override list forgets is
 * looked up under the scratch root instead. #1544 added
 * `globalSetup: './e2e/globalSetup.ts'` to the base config; the override list
 * did not absorb it, the Playwright CLI died at config load with
 * MODULE_NOT_FOUND before any test ran, the normalizer then found no raw
 * report, and the live tier stayed red for 13 days (last green run
 * 2026-09-02T14:49:45Z, first red run nine minutes later on the very next
 * commit).
 *
 * Nothing held the override list against the config it spreads, which is why
 * a one-line config addition could do that. This guard closes the class
 * rather than the instance: it reads the real config as TEXT, extracts every
 * top-level key whose value is a relative path literal, and requires the
 * generated synthetic config to neutralize or absolutize each one -- so the
 * NEXT relative path added to `playwright.config.ts` goes red here, in
 * pr-checks, instead of on main in a workflow that has no pull_request
 * trigger.
 *
 * Reading the config as text is deliberate, the same choice
 * `src/__tests__/unit/e2eHarness/warmupDeclaration.test.ts` made: importing
 * `playwright.config.ts` pulls `@playwright/test` into Jest and crashes
 * before a row can run. The `.mjs` probe module is reached through a spawned
 * ESM harness, the convention the rest of the camp01 script suite uses.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = process.cwd();
const CONFIG_PATH = path.join(REPO_ROOT, 'playwright.config.ts');

const probeUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-live-browser-adversarial.mjs'),
).href;

// The harness prints the exact text the probe would write to
// `<scratchRoot>/playwright.config.ts`, so every row below asserts against the
// real generator rather than a transcription of it.
const harness = `
import { failingPlaywrightConfig } from ${JSON.stringify(probeUrl)};
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const request = JSON.parse(raw);
process.stdout.write(
  failingPlaywrightConfig(request.baseConfigPath, request.testDirectory),
);
`;

/** The synthetic config the probe generates for a given base config + testDir. */
function generateSyntheticConfig(
  baseConfigPath: string,
  testDirectory: string,
): string {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    {
      input: JSON.stringify({ baseConfigPath, testDirectory }),
      encoding: 'utf8',
    },
  );
  if (!result.stdout)
    throw new Error(result.error?.message ?? result.stderr ?? 'no output');
  return result.stdout;
}

/**
 * Top-level keys in a `defineConfig({...})` source whose value is a relative
 * path literal. Top level is the two-space indent: `use`, `webServer`, and
 * every `projects[]` entry sit deeper, and only the top level survives the
 * `...baseConfig` spread as a directly inherited key.
 */
function declaredRelativePathKeys(configSource: string): string[] {
  const pattern = /^ {2}([A-Za-z_$][\w$]*): (['"])(\.\.?\/[^'"]*)\2\s*,/gm;
  return [...configSource.matchAll(pattern)].map((match) => match[1]);
}

/** The value the synthetic config assigns to `key`, or undefined if it assigns none. */
function overrideValueFor(
  generatedSource: string,
  key: string,
): string | undefined {
  const match = new RegExp(`^ {2}${key}: (.*),$`, 'm').exec(generatedSource);
  return match?.[1];
}

/**
 * Whether an override defuses the scratch-directory resolution.
 *
 * The bug class is narrow and so is this check: a repo-root-relative path
 * STRING copied into a config that lives somewhere else. Dropping the key
 * (`undefined`/`null`) defuses it, and so does an absolute path. Anything that
 * is not a relative string literal -- an object, an array, a number -- cannot
 * be resolved as a path against the scratch root at all.
 */
function isNeutralized(value: string | undefined): boolean {
  if (value === undefined) return false;
  if (value === 'undefined' || value === 'null') return true;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return true;
  }
  return typeof parsed === 'string' ? path.isAbsolute(parsed) : true;
}

/** Every relative-path key the base declares that the synthetic config leaves live. */
function unneutralizedRelativePathKeys(
  configSource: string,
  generatedSource: string,
): string[] {
  return declaredRelativePathKeys(configSource).filter(
    (key) => !isNeutralized(overrideValueFor(generatedSource, key)),
  );
}

describe('camp01 live probe synthetic Playwright config', () => {
  const configSource = readFileSync(CONFIG_PATH, 'utf-8');
  const generated = generateSyntheticConfig(
    CONFIG_PATH,
    path.join(REPO_ROOT, 'scratch-root', 'e2e'),
  );

  it('finds relative-path keys to hold the override list against', () => {
    // Without this row the guard could pass vacuously: a parser that matched
    // nothing would report zero unneutralized keys forever, which is exactly
    // the silence that let the outage through.
    expect(declaredRelativePathKeys(configSource).length).toBeGreaterThan(0);
  });

  it('neutralizes or absolutizes every relative-path key the config declares', () => {
    // The class-level assertion. `testDir` is absolutized, `globalSetup` is
    // dropped; the next one added to the config must be handled too.
    expect(unneutralizedRelativePathKeys(configSource, generated)).toEqual([]);
  });

  it('drops the server-dependent lifecycle hooks rather than re-pointing them', () => {
    // Absolutizing `globalSetup` would resolve, then fail differently: the hook
    // issues HTTP warm-up requests against the projects' baseURL, and this
    // config sets `webServer: undefined` on purpose, so there is no server to
    // warm. `globalTeardown` is dropped pre-emptively -- the base config
    // declares none today, and the day it does it breaks identically.
    expect(overrideValueFor(generated, 'globalSetup')).toBe('undefined');
    expect(overrideValueFor(generated, 'globalTeardown')).toBe('undefined');
  });

  it('goes red when the base config gains an unneutralized relative-path key', () => {
    // Proves the guard detects rather than merely agrees. A stub base config
    // carrying a key the generator has never heard of is the shape #1544 had.
    const stubConfigSource = [
      'export default defineConfig({',
      "  testDir: './e2e',",
      "  globalSetup: './e2e/globalSetup.ts',",
      "  storageStateSeed: './e2e/seedState.json',",
      '});',
    ].join('\n');

    expect(declaredRelativePathKeys(stubConfigSource)).toContain(
      'storageStateSeed',
    );
    expect(unneutralizedRelativePathKeys(stubConfigSource, generated)).toEqual([
      'storageStateSeed',
    ]);
  });
});
