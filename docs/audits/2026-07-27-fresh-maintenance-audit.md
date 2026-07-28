# Fresh Maintenance Audit — 2026-07-27

Evidence-first audit of `main` at
`3056a99d4f1922fc267be0e4a438715e1a247a26`, after dependency/runtime PR
#1059 and hierarchical guidance PR #1060 merged.

Open Brain was not used. The active `add-subsystem-lanes-and-ci` OpenSpec
change was treated as separately authorized in-flight work and was not
implemented or modified during this audit.

## Verdict

One confirmed high-severity CI integrity defect remains. No critical defects
or confirmed high-severity product-runtime defects were found.

| Severity | Count | Disposition                                       |
| -------- | ----: | ------------------------------------------------- |
| Critical |     0 | No action                                         |
| High     |     1 | Fix in small serial PRs                           |
| Advisory |     3 | Track; no broad cleanup in the high-priority lane |

## Confirmed High

### H-1 — Determinism audit silently passes when `rg` is unavailable

- **Surface:** `.github/workflows/pr-checks.yml:436-463`
- **Trigger:** the `Determinism Audit` job runs on GitHub's
  `ubuntu-latest` image, where `rg` is not currently available.
- **State transition:** `rg` exits with command-not-found, but the command
  substitution ends in `|| true`, converting the tool failure into an empty
  `matches` string.
- **Observable failure:** the job prints
  `Determinism audit passed: no unseeded dice in combat pipeline.` and exits
  successfully without scanning the repository.
- **Production evidence:** PR #1060 run `30321352125`, job log at
  `2026-07-28T01:50:01Z`, contains
  `/home/runner/...sh: line 17: rg: command not found` immediately before the
  false pass message.
- **Local Linux reproduction:** running the same script with `rg` installed
  exits non-zero and reports:
  - `src/utils/gameplay/battlearmor/vibroClaw.ts:38`
  - `src/utils/gameplay/gameSessionHeat.ts:50`

The two reported call sites violate the workflow's stated “single
`defaultD6Roller` seam” contract, but they are not independently classified as
high product defects:

- the reachable vibro-claw dispatch passes `input.d6Roller`;
- `GameEngine` and `InteractiveSession` pass a seeded
  `maxTechCriticalLocationRoller`;
- no concrete live engine path that consumes either ambient fallback was
  found.

They should be centralized through the existing dice seam in one
behavior-preserving prerequisite PR, followed by a second PR that makes the CI
job fail closed when its scanner is unavailable.

## Advisory Findings

| Item                        | Evidence                                                                                                                                                                        | Disposition                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| React hook dependency noise | `npm run lint` reports 41 `react-hooks/exhaustive-deps` warnings. Four inspected surfaces list every scalar actually read.                                                      | Refuted as high; retain as lint debt.                    |
| Campaign routing effect     | `src/pages-modules/gameplay/campaigns/campaignPageShell.tsx` omits `campaign.coopSession.mode` from one effect dependency list. No reachable stale-load failure was reproduced. | Track as unconfirmed advisory.                           |
| File size and duplication   | Full maintenance scan reports 375 file-bloat and 128 near-duplicate info findings.                                                                                              | Informational; no structural-referral threshold was met. |

## Verification Evidence

| Check                                                              | Result                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| `openspec.cmd validate --all --strict`                             | 218 passed, 0 failed                                 |
| `node scripts/maintenance/scan-maintenance.mjs --json --limit=500` | 0 critical/high; 0 baseline regressions              |
| `npm run maintain:scan:gate`                                       | 0 critical/high; 0 baseline regressions              |
| `npm run lint`                                                     | 0 errors; 71 warnings                                |
| Root `npm audit --audit-level=high`                                | Pass; 3 moderate Storybook/uuid advisories           |
| Desktop `npm audit --audit-level=high`                             | 0 vulnerabilities                                    |
| PR #1060 Actions run `30321352125`                                 | 29/29 checks green, including all platform builds    |
| Linux determinism-script reproduction with `rg` installed          | Fails and reports the two non-allowlisted call sites |

The green Actions result does not validate determinism because H-1 invalidates
that single job's proof. The remaining 28 checks retain their ordinary
evidentiary value.

## Repair Sequence

1. Centralize the two ambient fallbacks through the existing dice seam and run
   focused gameplay/determinism tests.
2. Make the determinism job verify/install its scanner and preserve scanner
   failures instead of collapsing them into an empty match set.
3. Run the repaired audit, focused tests, the maintenance gate, and full PR CI.
4. Re-run the fresh critical/high audit after both PRs merge.

Each repair must merge independently before the next begins; no stacked or
giant pending diff is authorized.
