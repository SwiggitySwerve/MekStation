## Decision

Extend `CampaignPilotStatus` with `Retired = 'retired'` and
`Deserted = 'deserted'`. Keep the existing departure reason and payout formula.
The existing personnel owner, `src/lib/campaign/personnel/statusRules.ts`, owns
roster departure detection, salary eligibility, deployability, and normalization.
Consumers must treat any non-null departure reason as departed, including
unknown legacy reasons, without guessing a classification.

Settlement checks the live roster and ignores missing, already-departed, and
duplicate report entries before patching status or debiting finances.
Payroll and its billable-count projection share one eligibility rule.
Readiness blocks an assigned departed pilot. The medical projection excludes
departed pilots so they cannot appear ready to return from treatment.

## Persistence and compatibility

The only persisted-format impact is two additional status strings. Record shape,
schema version, event payloads, and replay schema packs stay unchanged.
Older builds may not understand the new status strings.

At Zustand hydration (including current-version saves) and durable campaign
restore, normalize an Active pilot with `departureReason = 'retired'` or
`'deserted'` to the corresponding terminal status. Preserve other statuses and
unknown reason strings; the shared departure guard still excludes them.
Normalization happens on load, without enumerating or rewriting stored saves.
Normal persistence retains corrected values. Do not issue refunds, add payouts,
or rewrite historical transactions while loading.

## Pinned MekHQ evidence

Read from Git objects with `git -C E:/Projects/Personal/mekhq show
e7adc2c:<file>`; the supplied archive snapshot's PINS.md identifies this clone.
All paths below are relative to `MekHQ/src/mekhq/`, commit
`e7adc2c6f3b17ec8ad243d30843e22207fe935e4`.

- `campaign/Campaign.java:764-796`: settlement changes personnel to terminal
  statuses including RETIRED, RESIGNED, DEFECTED, and SACKED.
- `campaign/personnel/enums/PersonnelStatus.java:72-77,656-657,677-688`:
  RETIRED/DESERTED exist, are departed, and are not salary eligible.
- `campaign/ForceHumanResources.java:235-243,274-281`: active-personnel and
  salary filters exclude departed statuses.
- `campaign/personnel/turnoverAndRetention/RetirementDefectionTracker.java:418`:
  turnover targets come from active personnel.
- The same tracker, `880-900`: preserve pending results and skip existing
  payouts to avoid re-rolling. `campaign/Campaign.java:753-755,883` debits the
  settlement, changes statuses, and resolves pending payouts; tracker
  `1038-1041` clears them.

No classification parity claimed: MekHQ's classification is richer than the
existing MekStation retired/deserted outcomes. This change fixes their lifecycle.

## Boundaries and verification

Leave `CampaignInterfaces.runtime.ts` and `CampaignInterfaces.test.ts` untouched
for PR #3020. Limit the persistence-store edit to normalization on restore for
PR #3012. Leave K2/K3 files and loan servicing untouched. Critical/MIA healing
remains a follow-up because it belongs to a separate writer.

Record failing regressions before implementation. Cover terminal status, both
salary modes, blocked launch, no next-month roll/event/payout, repeated report
settlement, and both legacy load paths. Deliberately remove the already-departed
settlement guard and prove the replay regression fails, then restore green.

## Local evidence (2026-11-07)

Base updated to `7f10c0d85e378ff920cd6afaefb624d9a662851f`, including
PRs #3012, #3018, and #3019, before repeating the final gates. The ledger
append conflict was resolved by retaining every entry. The persistence-store diff is limited to the
normalization import and call during roster restoration.

- Red, unchanged implementation: 28 failed / 198 passed, 10 suites.
- Initial green: 226 passed, 10 suites.
- Killed mutant: removing `isRosterPilotDeparted(entry)` from the settlement
  guard made the replay regression fail with two transactions instead of one.
  The source was restored immediately after the run.
- Restored and broadened green: 408 passed, 19 suites, including all three
  `src/__tests__/integration/fastForward*.test.ts` suites, the unit-lint Jest
  suite, processor-registration and finance suites, and K10 loan-servicing
  integration/daily-cost regressions.
- `npm run typecheck`: both root and scripts configurations passed.
- `npm run lint:units`: 17078/17085; every per-path ceiling passed.
- `npm run lint`: 63 warnings, zero errors.
- `npx oxfmt` and `npm run format:check`: passed. OpenSpec files were also
  formatted explicitly with `--ignore-path .gitignore` because the default
  formatter ignore list excludes OpenSpec.
- `node scripts/ci/budget-check.mjs`: passed; 57 unkeyable and 91 repo-wide
  test keys before and after, with no newly unkeyable tests.
- Strict validation of this change and `npm run qc:openspec-ci:validate`: passed.

The shared SQLite binding targets Node 22. Running fast-forward suites with the
installed Node 22.22.0 executable passed; the default Node 24 runtime initially
failed at native-module loading (ABI 127 versus 137). No shared binding was
rebuilt. Logs are in the local audit scratch directory as `K1-red.log`,
`K1-green-initial.log`, `K1-mutant.log`, `K1-green-final.log`, and `K1-*.log`.
Hosted CI remains pending; this evidence does not claim hosted completion.

## Main merge verification

Merged `6065c5b333a76d32beb06faf40560b49c4c5dd25`, including K2, K3,
and the legacy campaign overview deletion. Only the append-only OpenSpec
ledger conflicted; all 21 entries were retained. No code conflicts occurred.

The merged tree passed 493 tests across 24 suites, including turnover, both
payroll paths, readiness, persistence round trips and crash-window coverage,
all three fastForward integration suites, K2's terminal-contract regression,
K10 loan-servicing regressions, and the unit-lint Jest suite. Both tsc configs,
unit lint (17078/17085 within every per-path ceiling), root lint (63 warnings,
zero errors), oxfmt, all 242 strict OpenSpec items, and OpenSpec CI accounting
passed. The CI budget passed at 57 unkeyable tests with no newly unkeyable
graphs. Logs use the `K1-main6065-` prefix in the local audit scratch directory.
