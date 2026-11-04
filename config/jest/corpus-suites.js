/**
 * Jest suites that are split out of the regular `unit` project when
 * JEST_SPLIT_CORPUS=true (see jest.config.js). Repo-relative POSIX paths.
 *
 * corpus  - whole-catalog suites: each replays thousands of committed units
 *           (public/data/**) and takes 30-220 s alone; they pinned every unit
 *           shard. They run as their own project/matrix, path-gated on PRs and
 *           always on main push and nightly.
 * roadmap - roadmap tooling tests (spawn the scripts/qc roadmap tools against
 *           temp ledgers); only relevant when roadmap/qc tooling changes.
 *
 * Nothing here is skipped: with the flag unset (the default) every suite below
 * stays in `unit`; with it set, `corpus` and `roadmap` select exactly these
 * files and `unit` ignores exactly these files.
 */
const catalogFamilies = [
  'battlemechs',
  'vehicles',
  'aerospace',
  'battlearmor',
  'infantry',
  'protomechs',
];

const corpusSuites = [
  ...catalogFamilies.map(
    (family) =>
      `src/__tests__/service/printing/catalogRecordSheets.${family}.test.ts`,
  ),
  'src/services/units/__tests__/realCatalog.battlemechs.1.test.ts',
  'src/services/units/__tests__/realCatalog.battlemechs.2.test.ts',
  'src/services/units/__tests__/realCatalog.battlemechs.3.test.ts',
  'src/services/units/__tests__/realCatalog.families.test.ts',
  'src/utils/construction/__tests__/bvAdapter.catalog.test.ts',
  'src/types/contracts/__tests__/unit.tonnage.contract.test.ts',
  'src/types/contracts/__tests__/unit.contract.test.ts',
  'src/lib/campaign/wizard/__tests__/representativeUnits.dataTest.test.ts',
  'src/services/units/handlers/__tests__/AerospaceSourceValidity.test.ts',
];

const roadmapSuites = [
  'scripts/__tests__/roadmap-codex-identity-capture.test.ts',
  'scripts/__tests__/roadmap-codex-review-identity.test.ts',
  'scripts/__tests__/roadmap-loop-closure-proof.test.ts',
  'scripts/__tests__/roadmap-loop-scripts.test.ts',
];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** testPathIgnorePatterns entry matching exactly one repo-relative file. */
const toIgnorePattern = (file) =>
  escapeRegex(file).replace(/\//g, '[/\\\\]') + '$';

/** testMatch glob matching exactly one repo-relative file. */
const toTestMatch = (file) => `**/${file}`;

module.exports = {
  corpusSuites,
  roadmapSuites,
  toIgnorePattern,
  toTestMatch,
};
