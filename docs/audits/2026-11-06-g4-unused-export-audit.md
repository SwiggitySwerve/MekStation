# G4 unused-export audit — 2026-11-06

This bounded maintenance pass starts at fetched main
`3502cf6c80a89f7b8bd3a0e028924e1b592f998d`. It covers unused exports,
dependencies, scripts, fixtures and a small duplicate-helper sample. Raw text
matches are candidates, not defects. No domain behavior or numerical rule changes
are proposed.

## Confirmed batch

| Owner and concern                                                                   | Unused export            | Tracked matches | References outside owner |
| ----------------------------------------------------------------------------------- | ------------------------ | --------------: | -----------------------: |
| `src/components/award/awardIcons.tsx`: award icon presentation                      | `getCategoryDefaultIcon` |               1 |                        0 |
| `src/utils/effects/heatVisualMap.ts`: heat presentation                             | `mapHeatToVisualState`   |               1 |                        0 |
| Same heat presentation owner                                                        | `resolveHeatVisualState` |               1 |                        0 |
| `src/components/customizer/preview/previewToolbarStyles.ts`: preview control styles | `PREVIEW_SEGMENT_CLASS`  |               1 |                        0 |

These are low structural debt, with no existing runtime defect claimed. Before
removal, each census used this command with the exact symbol substituted:

```sh
git grep -n -w -e SYMBOL -- .
```

Module-path searches also traced imports, re-exports, namespace access, dynamic
loaders, package scripts, workflows, documentation and OpenSpec. The consumers
import retained symbols by name. None of the four targets has a lifecycle marker
or appears in a public barrel. The package is private, with no `main`, `exports`
or `bin` surface. Owner-wide GitHub code searches for the award helper and one
heat alias returned no results; unknown private consumers cannot be ruled out by
that search alone. All four exact symbols were traced in the repository.

Batch A removes only these declarations, their attached comments and the now
unused `AwardCategory` import. The live award mapping, rarity widths, heat
thresholds/default export and preview class strings retain their behavior.

## Refuted candidates

| Candidate                           | Why it stays                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/monitor-file-sizes.sh`     | Still exposed by `analyze:files` and `analyze:files:report`. Its stale root is documented; deletion would break those CLI entry points. |
| `@tailwindcss/postcss`              | Registered by string in `postcss.config.mjs`.                                                                                           |
| `@storybook/blocks`                 | Imported by the MDX files in `src/docs/`.                                                                                               |
| Story exports with no named callers | Storybook discovers `src/**/*.stories.*` through its configuration.                                                                     |
| `useQuickGameStore.selectors.ts`    | Re-exported by the store facade, an intentionally preserved interface.                                                                  |

The source/config candidate scan read 9,400 files and emitted 521
single-occurrence export candidates: 313 story exports, four confirmed removals
and 204 other candidates retained without a verdict. It also emitted 22
low-reference dependency candidates and no fixture-path candidate. Counts were
computed from the saved JSON ledger. Unverified candidates are excluded from the
confirmed findings; their absence of callers has not been established.

The existing duplicate scanner reported no clusters in the six source files
under `src/utils/formatting` and `src/utils/simulation-viewer`. Different units,
guards and rounding remain separate. No repository-wide duplicate or orphan
fixture claim follows from this sample. No knip/depcheck dependency was installed.

## Proof and limits

Before repair: repository typecheck, lint and formatting passed; lint reported
62 existing warnings and no errors. Three related Jest suites passed all 23
tests with `--ci --watchAll=false --maxWorkers=2 --runTestsByPath` and closed
stdin. A live award characterization captured every configured icon, unknown-ID
fallback and all rarity stroke widths for comparison after repair.

After repair, the same typecheck, lint, formatting and 23 tests passed. The award
output matched byte for byte. CI remains the production-build and full-suite
proof. No new tests assert the
absence of dead declarations. No BV code, canonical dataset, seed/guard module,
CI tooling or shared dependency installation changes. Broader or unsupported
deletions remain parked for their owners.
