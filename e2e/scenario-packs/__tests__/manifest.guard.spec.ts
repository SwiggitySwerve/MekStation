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
import fs from 'node:fs';
import path from 'node:path';

import { MANIFEST_VERSION } from '../../../src/lib/scenarioPacks/packSchemas';
import { manifestVersion, SCENARIO_PACK_MANIFEST } from '../manifest';

/** `e2e/scenario-packs/` — the registry root both the payload subdirs and this `__tests__/` dir live under. */
const SCENARIO_PACKS_DIR = path.resolve(__dirname, '..');

/** Payload subdirs + their extension (mirrors `manifest.ts`'s two `kind`s: `campaign/<id>.campaign.json`, `encounter/<id>.matchlog.json`) — `.provenance.json` sidecars are deliberately excluded, they are not payload files. */
const PAYLOAD_SUBDIRS: readonly { dir: string; extension: string }[] = [
  { dir: 'campaign', extension: '.campaign.json' },
  { dir: 'encounter', extension: '.matchlog.json' },
];

/** Every payload file actually committed on disk under `e2e/scenario-packs/`, as `<subdir>/<filename>` — the same shape `manifest.ts` entries' `payloadPath` field uses. */
function findPayloadFilesOnDisk(): string[] {
  const found: string[] = [];
  for (const { dir, extension } of PAYLOAD_SUBDIRS) {
    const absoluteDir = path.join(SCENARIO_PACKS_DIR, dir);
    if (!fs.existsSync(absoluteDir)) continue;
    for (const filename of fs.readdirSync(absoluteDir)) {
      if (filename.endsWith(extension)) {
        found.push(`${dir}/${filename}`);
      }
    }
  }
  return found;
}

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

  // spec scenario "Registry and manifest are one-to-one": every payload
  // file under e2e/scenario-packs/ SHALL have exactly one manifest entry,
  // and every manifest entry SHALL resolve to exactly one existing payload
  // file. Nothing else in the repo checks this (validateScenarioPackManifest
  // never touches the filesystem; the recapture job iterates the manifest,
  // never the directory, so an orphan payload is never visited) — this is
  // the one place both directions get asserted, naming the offending id or
  // path rather than a bare readFileSync ENOENT at loader runtime.
  test('every payload file on disk has exactly one manifest entry, and every manifest entry resolves to exactly one existing payload file', () => {
    const payloadFilesOnDisk = new Set(findPayloadFilesOnDisk());
    const manifestPayloadPaths = SCENARIO_PACK_MANIFEST.map(
      (entry) => entry.payloadPath,
    );

    // Entry without payload — every manifest entry's payloadPath must
    // resolve to a real committed file.
    const entriesWithMissingPayload = SCENARIO_PACK_MANIFEST.filter(
      (entry) => !payloadFilesOnDisk.has(entry.payloadPath),
    ).map((entry) => `${entry.id} -> ${entry.payloadPath}`);
    expect(entriesWithMissingPayload).toEqual([]);

    // Payload without entry — every payload file actually on disk must be
    // referenced by some manifest entry (an orphan left behind by, e.g., a
    // pack id rename rots silently otherwise).
    const manifestPayloadPathSet = new Set(manifestPayloadPaths);
    const orphanPayloadFiles = Array.from(payloadFilesOnDisk)
      .filter((payloadPath) => !manifestPayloadPathSet.has(payloadPath))
      .sort();
    expect(orphanPayloadFiles).toEqual([]);

    // "Exactly one" in both directions — two entries pointing at the same
    // payloadPath would pass both checks above but still violate
    // one-to-one (a typo'd rename that collided with a real path).
    expect(new Set(manifestPayloadPaths).size).toBe(
      manifestPayloadPaths.length,
    );
  });
});
