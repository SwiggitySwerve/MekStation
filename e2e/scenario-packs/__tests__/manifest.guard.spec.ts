/**
 * Scenario Pack Manifest Guard — task 3.2 acceptance: "a guard test asserts
 * the registry's declared manifestVersion equals the library's exported
 * constant" (spec: registry validation, design D2). A Playwright test (not
 * a jest test) because `e2e/scenario-packs/manifest.ts` lives under `e2e/`,
 * which jest ignores entirely (`jest.config.js:46`, design D5) — this guard
 * needs no browser, so it runs as a plain assertion under the `chromium`
 * project (this directory is excluded only from the three responsive
 * projects via `playwright.config.ts`'s `**\/scenario-packs/**` testIgnore,
 * design R8 — chromium itself keeps this file).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D2)
 */

import { expect, test } from '@playwright/test';

import { MANIFEST_VERSION } from '../../../src/lib/scenarioPacks/packSchemas';
import { manifestVersion, SCENARIO_PACK_MANIFEST } from '../manifest';

test.describe('scenario pack manifest registry', () => {
  test('declared manifestVersion equals the pack library exported constant', () => {
    expect(manifestVersion).toBe(MANIFEST_VERSION);
  });

  test('every registered pack id is unique and kebab-case', () => {
    const ids = SCENARIO_PACK_MANIFEST.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });
});
