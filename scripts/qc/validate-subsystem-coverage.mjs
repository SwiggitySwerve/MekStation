#!/usr/bin/env node
/**
 * Subsystem coverage ledger validator (W6 task 3.2 — spec: e2e-testing
 * "Subsystem Validation Coverage").
 *
 * Validates `docs/qc/mekstation-subsystem-coverage.json` — the machine-checked
 * replacement for the 19-spec fiction (design D7): one row per fine-grained
 * subsystem, each naming its six-tag facet, covering specs, and an honest
 * status. Fails on:
 *   - missing / extra / duplicate rows vs the closed 19-id set
 *   - invalid facet or status
 *   - a dangling coveringSpecs path
 *   - a non-deferred row whose named spec lacks the row's `@subsystem:<facet>`
 *     tag literal
 *   - a `deferred` row without a followUpRef
 *   - (lane cross-check, design D8 — activates only when the nightly workflow
 *     declares the `subsystem-lanes` job) a lane matrix tag with no tagged
 *     covering spec, or a facet with tagged non-deferred rows but no lane
 *
 * The core is a pure function over injected probes so the jest wrapper can
 * pin every failure class in-memory; the CLI wires the real filesystem.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The closed 19-subsystem id set (spec: Subsystem Validation Coverage). */
export const REQUIRED_SUBSYSTEM_IDS = [
  'hiring',
  'xp-leveling',
  'medical',
  'salvage',
  'repair',
  'refit',
  'loans',
  'contract-market',
  'contract-negotiation',
  'faction-reputation',
  'random-events',
  'morale',
  'force-hierarchy',
  'turnover',
  'aging',
  'awards',
  'rank-pay',
  'unit-market',
  'maintenance',
];

export const ALLOWED_FACETS = new Set([
  'navigation',
  'combat',
  'economy',
  'maintenance',
  'personnel',
  'experience',
]);

export const ALLOWED_STATUSES = new Set([
  'asserting',
  'render-only',
  'deferred',
]);

function issue(message) {
  return { severity: 'error', message };
}

/**
 * Validate the ledger. `probes` injects the environment:
 *   - specExists(specPath) → boolean
 *   - specContains(specPath, literal) → boolean
 *   - nightlyMatrixTags → string[] when the nightly `subsystem-lanes` job
 *     exists, or null when it is absent (the cross-check then stays dormant)
 *   - laneTagTenanted(tag) -> whether any e2e spec file carries the lane
 *     tag literal (parity specs count as tenants)
 */
export function validateSubsystemCoverage(ledger, probes) {
  const issues = [];
  if (!Array.isArray(ledger?.subsystems)) {
    issues.push(issue('Ledger must declare a subsystems array.'));
    return issues;
  }
  const seen = new Set();
  for (const row of ledger.subsystems) {
    const id = typeof row.id === 'string' ? row.id : '<missing id>';
    if (!REQUIRED_SUBSYSTEM_IDS.includes(id)) {
      issues.push(issue(`Unknown subsystem row ${id}.`));
      continue;
    }
    if (seen.has(id)) {
      issues.push(issue(`Duplicate subsystem row ${id}.`));
      continue;
    }
    seen.add(id);
    if (!ALLOWED_FACETS.has(row.facet)) {
      issues.push(issue(`${id}: invalid facet ${row.facet}.`));
    }
    if (!ALLOWED_STATUSES.has(row.status)) {
      issues.push(issue(`${id}: invalid status ${row.status}.`));
      continue;
    }
    if (!Array.isArray(row.coveringSpecs)) {
      issues.push(issue(`${id}: coveringSpecs must be an array.`));
      continue;
    }
    for (const specPath of row.coveringSpecs) {
      if (!probes.specExists(specPath)) {
        issues.push(
          issue(`${id}: coveringSpecs path ${specPath} does not exist.`),
        );
      }
    }
    if (row.status === 'deferred') {
      if (
        typeof row.followUpRef !== 'string' ||
        row.followUpRef.trim() === ''
      ) {
        issues.push(issue(`${id}: deferred row must declare a followUpRef.`));
      }
    } else {
      // Non-deferred rows must name at least one spec, and each named spec
      // must carry the row's tag literal — the linkage the old requirement
      // never enforced.
      if (row.coveringSpecs.length === 0) {
        issues.push(issue(`${id}: ${row.status} row must name coveringSpecs.`));
      }
      // The QUOTED form only appears inside native `tag: [...]` arrays —
      // a docblock comment mentioning the tag is NOT coverage (spec:
      // "A docblock tag is not coverage").
      const literal = `'@subsystem:${row.facet}'`;
      for (const specPath of row.coveringSpecs) {
        if (
          probes.specExists(specPath) &&
          !probes.specContains(specPath, literal)
        ) {
          issues.push(
            issue(`${id}: spec ${specPath} lacks the ${literal} tag.`),
          );
        }
      }
    }
  }
  for (const requiredId of REQUIRED_SUBSYSTEM_IDS) {
    if (!seen.has(requiredId)) {
      issues.push(issue(`Missing subsystem row ${requiredId}.`));
    }
  }
  // Lane cross-check (design D8): dormant until the nightly job exists.
  // Direction 1 (lane -> tenant) asks whether ANY spec file carries the
  // lane tag literal -- pack parity specs are legitimate lane tenants
  // without being subsystem-coverage rows (W6 task 7.1). Direction 2
  // (tenanted facet -> lane) stays ledger-based.
  if (Array.isArray(probes.nightlyMatrixTags)) {
    const tagsWithTaggedRows = new Set(
      ledger.subsystems
        .filter(
          (row) =>
            row.status !== 'deferred' &&
            ALLOWED_FACETS.has(row.facet) &&
            Array.isArray(row.coveringSpecs) &&
            row.coveringSpecs.length > 0,
        )
        .map((row) => row.facet),
    );
    for (const laneTag of probes.nightlyMatrixTags) {
      if (!probes.laneTagTenanted(laneTag)) {
        issues.push(
          issue(`Nightly lane tag ${laneTag} has no tagged covering spec.`),
        );
      }
    }
    for (const facet of tagsWithTaggedRows) {
      if (!probes.nightlyMatrixTags.includes(facet)) {
        issues.push(
          issue(
            `Facet ${facet} has tagged non-deferred rows but no nightly lane.`,
          ),
        );
      }
    }
  }
  return issues;
}

/**
 * Parse the nightly workflow for the `subsystem-lanes` job's matrix tag list.
 * Returns null when the job id is absent (the cross-check stays dormant —
 * group 6 activates it by landing the job).
 */
export function parseNightlyMatrixTags(yamlText) {
  if (!/^\s{2}subsystem-lanes:/m.test(yamlText)) return null;
  const match = yamlText.match(/subsystem:\s*\[([^\]]*)\]/);
  if (!match) return null;
  return match[1]
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  const repoRoot = process.cwd();
  const ledger = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'docs/qc/mekstation-subsystem-coverage.json'),
      'utf8',
    ),
  );
  const nightlyPath = path.join(
    repoRoot,
    '.github/workflows/nightly-validation.yml',
  );
  const nightlyMatrixTags = fs.existsSync(nightlyPath)
    ? parseNightlyMatrixTags(fs.readFileSync(nightlyPath, 'utf8'))
    : null;
  // Direction-1 tenancy scans every e2e spec file for the tag literal --
  // parity specs under e2e/scenario-packs/ are legitimate lane tenants.
  const specFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.spec.ts')) specFiles.push(full);
    }
  };
  walk(path.join(repoRoot, 'e2e'));
  const laneTagTenanted = (tag) =>
    specFiles.some((file) =>
      fs.readFileSync(file, 'utf8').includes("'@subsystem:" + tag + "'"),
    );
  const issues = validateSubsystemCoverage(ledger, {
    laneTagTenanted,
    specExists: (specPath) => fs.existsSync(path.join(repoRoot, specPath)),
    specContains: (specPath, literal) =>
      fs.readFileSync(path.join(repoRoot, specPath), 'utf8').includes(literal),
    nightlyMatrixTags,
  });
  for (const entry of issues) {
    console.error(`ERROR: ${entry.message}`);
  }
  const rows = Array.isArray(ledger.subsystems) ? ledger.subsystems.length : 0;
  console.log(
    `[qc:subsystem-coverage] rows=${rows} lanes=${nightlyMatrixTags ? nightlyMatrixTags.join(',') : 'dormant'} errors=${issues.length}`,
  );
  if (issues.length > 0) process.exit(1);
}
