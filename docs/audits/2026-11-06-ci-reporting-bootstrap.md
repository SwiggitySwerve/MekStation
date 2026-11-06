# Measured aggregate reporting bootstrap

PR-B adds the first aggregate display caps after #2928 deployed their optional
schema. The config remains `mekstation/ci-budgets/v1`. These caps do not control
review labels or workflow timeouts. Later increases/removals still require the
existing owner label and exact-head approval. Automatic timing ratchets remain
disabled; weekly collection remains main-push-only.

## Deployment prerequisite

[Guard 42220485257, attempt 1](https://github.com/SwiggitySwerve/MekStation/actions/runs/42220485257/attempts/1)
completed successfully at 2026-11-06T12:48:59Z for successful
[main push 42219382602, attempt 1](https://github.com/SwiggitySwerve/MekStation/actions/runs/42219382602/attempts/1).
Both source and checked-out trusted producer use
`e86866ba2de11bbcc032a6a1a06087863d2bc37b`, which contains #2928 merge
`c49b87f15`. Guard logs show the trusted default-branch checkout and successful
report/artifact publication. The report producer validates the config before
constructing its observation.

Canonical artifact `13502634431` (`ci-observation-42219382602-1.json`, archive
SHA-256 `63a883a4d0aee7886fae97b97e32371301ed6d0234ce154a127bd383530d8475`)
binds the actual source/producer run IDs, attempts and heads. Its config SHA-256
is `1c6f568540cf5d00afc79c49ebbafb55caa742a0c3b8c0e6df823adf89d2229f`,
matching the unchanged config at #2928 and current base
`4c54810012a5b386fd45e71302caf4b85f0a378f`. The latest inspected Guard,
42258430840, was schedule-sourced; it is not the main-push prerequisite.

## Bootstrap measurement

Reuse the frozen cohort from [the PR-A replay](2026-11-06-ci-report-noise-replay.md),
captured at 2026-11-06T08:59:03.478Z. No second timing collection or hosted rerun
was performed. Five complete comparable successful main pushes qualified from
the latest ten candidates; failed/cancelled/incomplete evidence stays retained
with exclusions in the original collection. The compact
[fixture](../../scripts/ci/fixtures/reporting-bootstrap.json) preserves each
sample's source head/attempt, values, comparable key and excluded candidates.
This historical bootstrap cohort is not a claim about a newly collected window.

| Metric                       |  Measured main p75 | Initial cap (p75 × 1.15) |
| ---------------------------- | -----------------: | -----------------------: |
| Job-minutes                  | 46.233333333333334 |        53.16833333333333 |
| Execution critical path (ms) |             536000 |                   616400 |

R7 quantiles use the shared statistics owner. The regression test first failed
against absent production reporting caps, then passed with the measured values.
It permits later explicit lowering while rejecting missing caps or an upward
reset above the bootstrap ceiling. Legacy optional-schema, scoped bootstrap,
raise/removal approval, projection and disabled automatic-ratchet tests remain.

Local verification: both TypeScript configs, lint (62 warnings, zero errors),
and full formatting pass. The focused CI/garden suite passes 136 tests with one
platform skip. An earlier broader batch was stopped after an unrelated Bash
background-step test hung on Windows temp-path translation; its log and two
generated files are retained in the evidence directory. It is not a passing
full-batch result. No product source or workflow changed.

## Bounded follow-up after PR-B

Assess one week's label rate using existing evidence only. If approximately
more than 30% of PRs remain labelled, propose either p75 with at least ten main
samples or a main-p90 comparator. This is a proposal-only follow-up: PR-B does
not change aggregate label semantics, ingest PR observations into garden,
create a watcher or automatically alter rules.

Raw prerequisite logs/artifact, red/green logs and the full measurement evidence
remain under
`E:/Projects/Personal/MekStation-wt/_reports/2026-10-30/claude-coordinator/normal-work/CI-report-noise/`.
