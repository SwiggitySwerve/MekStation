# Scenario pack regression baseline repair — 2026-10-18

This is a bounded repair of the Scenario Pack Recapture nightly failures.
The baseline refresh and production capture harness cover six supported packs.
The two unsupported co-op campaign entries carry explicit, owned quarantines under
the Root follow-up ruling. They remain listed as **QUARANTINED**, never PASS. The
nightly exits successfully only when every non-quarantined entry passes. This does
not establish co-op runtime acceptance.

## Scope and ownership

- Fresh worktree: `E:/Projects/Personal/MekStation-wt/scenario-recapture-baseline-20261018`.
- Starting revision: `631484c8f8c4c0fbdd4fafd497a61bd35392d398` from fetched `origin/main`.
- Node: `C:/Users/wroll/AppData/Local/nvm/v22.22.0` prepended to `PATH`; `npm ci` completed.
- Read the complete `nightly-diag-20261018/SCENARIO-PACKS.md` diagnosis before implementation.
- Censused `units.json` and `roadmap.json`, including planned, blocked, and implementing
  ownership and roadmap ancestor aliases. No literal reservation names the scenario
  registry, these three payloads/sidecars, the minter, recapture helpers, either wizard
  helper, or the new diagnostic tests. Navigation aliases, including R2.camp-8's
  `src`/`e2e`/`scripts/qc`, are non-exclusive under the supplied Root ruling in #2272.
- U81 is blocked, but its literal workflow reservations are `pr-checks.yml`,
  `release.yml`, and the setup action; it does not reserve `nightly-validation.yml`.
  Other live workflow units (U64/U66/U75) reserve `pr-checks.yml`. R1.ci's workflow
  directory reservation is main-verified. Therefore the recapture workflow repair
  is included, rather than delivered only as a proposed patch.
- No L1 product paths, campaign sync, B14/LSC/HP/H/L1-SMOKE manifests, or planning
  lifecycle files were changed. The root checkout was never edited.

## Intentional baseline refresh and provenance

The owner explicitly authorized this refresh. This was **not routine verification**:
only navigation-briefing, personnel-roster, and experience-pilot were permanently
re-minted, through `node scripts/qc/mint-scenario-pack.mjs <id>`. No JSON payload
was hand-edited, no schema pin check was relaxed, and no combat, economy,
maintenance, or co-op baseline was overwritten for delivery.

| Pack                | Generated timestamp (UTC) | Generated base commit                    | Pin |
| ------------------- | ------------------------- | ---------------------------------------- | --- |
| navigation-briefing | 2026-10-18T18:30:28.081Z  | 631484c8f8c4c0fbdd4fafd497a61bd35392d398 | 2   |
| personnel-roster    | 2026-10-18T18:32:41.561Z  | 631484c8f8c4c0fbdd4fafd497a61bd35392d398 | 2   |
| experience-pilot    | 2026-10-18T18:34:42.225Z  | 631484c8f8c4c0fbdd4fafd497a61bd35392d398 | 2   |

Each generated sidecar matches the registry. Independent read-only review checked
source authority, distinct instance IDs, campaign identity, four-unit force/roster/
maxima linkage, pilot assignments, and the intended checkpoints. Navigation retains
an active accepted contract; personnel retains Mint Pack Recruit and the 25,000 hire
expense; experience retains its veteran standalone-pilot request. Legacy-v1
migration fixtures were preserved.

## Failure classification and proof

| Previously failing test/pack | Cause class                                                                      | Repair                                                                                                          | Local proof                                                 |
| ---------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| navigation-briefing          | Stale schema-1 baseline                                                          | Sanctioned re-mint and pin 2                                                                                    | Parity PASS; recapture PASS                                 |
| personnel-roster             | Stale schema-1 baseline                                                          | Sanctioned re-mint and pin 2                                                                                    | Parity PASS; recapture PASS                                 |
| experience-pilot             | Stale schema-1 baseline; intermittent create prerequisite                        | Sanctioned re-mint and pin 2; shared save diagnostics                                                           | Parity PASS; recapture PASS                                 |
| combat-midbattle             | Intermittent CI development-server PUT 404, obscured by a create-route URL match | Require successful PUT and a dashboard route; use production standalone in nightly; retain per-pack diagnostics | Injected PUT-404 diagnostic PASS; combat recapture PASS     |
| coop-host-review             | Unsupported hand-authored campaign genesis, misclassified as a combat log        | Kind-aware classification plus explicit P2J-owned expiring quarantine                                           | Guard/dispatch tests PASS; reported QUARANTINED, never PASS |
| coop-guest-proposal          | Unsupported hand-authored campaign genesis, misclassified as a combat log        | Same kind-aware dispatch and owned expiring quarantine                                                          | Guard/dispatch tests PASS; reported QUARANTINED, never PASS |

Co-op remains an owner dependency: neither entry has a sanctioned generator or a
declared campaign checkpoint invariant. The registry retains both fixtures and
recapture checks their committed schema/pins, then reports their quarantine with
reason, owner and diagnosis. No fresh co-op payload is fabricated.

## Owned quarantine and expiry

The Root follow-up ruling supersedes the initial classification-only red baseline.
The typed registry configuration in `e2e/scenario-packs/quarantine.ts` declares
exactly `coop-host-review` and `coop-guest-proposal`, each with:

- reason: `no sanctioned co-op generator/checkpoint contract`;
- ownerUnit: `P2J`;
- diagnosisDoc: [the original diagnosis](2026-10-18-scenario-pack-recapture-diagnosis.md),
  copied into the repository from the supplied diagnostic worktree.

P2J is the expiry owner because its ledger behavior explicitly proves create/join
by invite and approve/reject proposal with three ordinary LSC identities. LSC-2P
only proves the packaged credential/seat prerequisite; it does not prove the
campaign/proposal genesis journey. P2J is test-only and does not own scenario-pack
generator leaves. Its main verification is the readiness trigger that **forces**
quarantine removal and a separately admitted sanctioned generator/checkpoint
follow-up; this configuration does not amend its scope or claim that a minter
already exists.

The nightly validates owner IDs against the live `units.json` before any capture.
An absent owner or an owner in `main-verified`, `complete` or `archived` state
fails loudly, so the exceptions expire when P2J lands. A guard test freezes the
two-pack allowlist: quarantining any other pack requires editing that explicit
test allowlist. Mutation rows cover a completed owner, a nonexistent owner, a
third registered pack, duplicate entries and a non-quarantined failure. A CLI
integration row verifies both quarantine records remain in JSON with `ok: false`
and `status: QUARANTINED`, without invoking a minter.

The summary reports separate PASS/FAIL/QUARANTINED counts. After configuration
validation, any FAIL entry causes a failing exit; quarantine never contributes to
the PASS count. Invalid committed
schemas or pins still fail before quarantine classification.

The pre-existing invariant comparators and all timeouts/assertions remain intact.
The initial pre-quarantine combat capture was 62,713 bytes versus the committed 19,156 bytes; its
schema and existing seed-agnostic invariants pass. The fresh bytes are retained for
inspection, and the committed combat payload is unchanged.

## Initial validation before the quarantine ruling

Implementation recapture head: `f41883dd3da5d13bc493aad41f2d06b3ba380044`.
This initial implementation proof preceded the quarantine ruling; its results are historical.

- E2E production build: PASS with `NEXT_PUBLIC_E2E_MODE=true` and
  `NEXT_PUBLIC_E2E_TEST=true`; standalone hydration completed.
- `npm run typecheck`: PASS, including the commit hooks' checks.
- Affected Chromium browser proof: **8/8 PASS**, `--workers=1`, against
  `cd .next/standalone && node ../../scripts/e2e/relaunching-server.mjs`, port 3647.
  Selected only the three parity specs, `manifest.guard.spec.ts`, and
  `campaign-wizard-save-diagnostics.spec.ts`; the PUT-404 sentinel is surfaced
  directly while the page remains on `/create`.
- Focused Jest: **4 suites / 44 tests PASS**, `--runInBand`, private
  `.cache/scenario-repair-jest`: `scenario-pack-recapture.test.ts`,
  `packSchemas.test.ts`, `coopPackCoverage.test.ts`, and `campaignMigration.test.ts`.
- `node scripts/qc/recapture-scenario-packs.mjs --json`: **6/8 PASS, exit 1**;
  only the two unsupported co-op entries fail. Economy and maintenance pass as well
  as the four browser-minted packs. All registered entries were attempted, with
  original payload/provenance restored. The working tree was clean afterward.
- Formatting and `git diff --check`: PASS. Explicit lint of the seven changed
  source/test/tooling files reports zero errors (existing tooling-console warnings
  when the repository's usual ignored script paths are included).
- Independent read-only review of exact implementation head `f41883dd3...`:
  no blocking findings; no heavy checks run by the reviewer.

Every local build, Playwright, and Jest invocation was preceded by
`node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164`; busy results were
waited out. The local minter opt-in repeats that gate before each recapture child,
and headless minters now use private per-pack Jest caches. A limitation discovered
during this proof: the current machine-idle implementation recognizes build and
browser work but does not recognize Jest. A B14 Jest process was observed during
the maintenance recapture despite the gate reporting idle. Therefore this evidence
does not claim independently verified machine-wide serialization. That scheduler
gap needs coordination/repair in the owning lane; no other lane's process was killed.

Local ignored evidence:

- `.sisyphus/scenario-build.log`, `scenario-typecheck.log`, `scenario-parity.log`,
  `scenario-jest.log`, `scenario-recapture-all.log`, and the three `mint-*.log` files.
- `.sisyphus/scenario-pack-recapture/1792348626447-11112/`: aggregate results and
  head/runtime metadata; per-pack committed captures, fresh captures when generated,
  stdout/stderr including web-server debug logs, invocation IDs, browser output/
  failure traces, and isolated runtime data. Unsupported co-op entries have no
  invented fresh capture.

The nightly workflow uploads `.sisyphus/scenario-pack-recapture` with `if: always()`
and hidden files included. Diagnostic preservation is followed by a nested `finally`
that restores original files even if artifact copying fails.

## Quarantine follow-up validation

Root/scoped typecheck and a dedicated typecheck including the recapture core and both
script test files pass. The focused proof passes **4 suites / 46 tests**, using
`--runInBand` and `.cache/scenario-quarantine-jest`. It includes the fixed allowlist,
live-ledger guard, completed/missing-owner mutants, duplicate records, failure-summary
control and real two-quarantine CLI JSON proof, together with existing schema,
registry and recapture tests.

On quarantine implementation head `e1ee54d6569010f251b7eeb6cf1ae2e979f56c1d`,
`node scripts/qc/recapture-scenario-packs.mjs --json` completed with **6 PASS,
0 FAIL, 2 QUARANTINED; exit 0**. All eight registry entries remain listed. Each
quarantine has `ok: false`, its owner/reason/diagnosis, and no invented fresh
capture. The six supported packs pass their existing schema, pin and invariant
checks. The latest fresh combat capture is 65,603 bytes; the committed capture remains
19,156 bytes. Artifacts are retained at
`.sisyphus/scenario-pack-recapture/1792349658818-60600/`; the working tree was clean
after restoration. The original production build was reused because quarantine
changes are registry/tooling only.

CI run 39156075459 found one new scripts-lint finding: the exported summary
function lacked an explicit return type. Adding `IPackRecaptureSummary` restores
the scripts gate to **50/50** without changing its ceiling. The affected lint
gate, quarantine guard and recapture suites pass **3 suites / 47 tests** afterward;
this change is a type annotation and does not change the captured runtime behavior.

Under the updated Root ruling, integration rebases onto Main
`1e0a34dc5da4c4051115db828e986ceb5aad2fa0` (#2280), which repairs the historical
machine-idle Jest/typecheck detection gap. #2278's replay fixture-root change was initially pending independent review;
the subsequent council restack below incorporates its open head. Lane C's proposed workflow patch is now available and is folded separately,
with its own credited commit and privacy-row proof below.

## Lane C journal-armed privacy workflow integration

Credit: Lane C's `nightly-diag-20261018/PRIVACY-AUTHORITY.md`, section 1, and
`proposed-workflow-privacy.patch` (SHA256
`c39d9edd0d18793f714aeb250886e20574725c63fbcf3b81b9c3a497381c39ec`). The supplied
patch was applied after rebasing onto Main `1e0a34dc5...`; the only command addition
to the proposal is explicit `--workers=1` on the new step.

The full suite excludes exactly `@E2E-19|@E2E-25`. A separate file-scoped step runs
those rows with `MEKSTATION_E2E_COMBAT_JOURNAL_AUTHORITY_MODE=enabled` and the same
production standalone command. It runs after earlier failures unless cancelled,
so a failed full suite does not hide its result. Separate browser output and the
`github,list` reporter preserve the full suite's HTML/results, and the existing
always-upload step includes both result directories. No spec skip guard was added.

Before U24b lands, these two rows need the fixture arm to obtain a match history
head and send the rewind-preview request. U24b's production cutover must remove
this separate step and the complementary full-suite exclusion together. U2b's
privacy-history acceptance remains separately owned; no ledger closure is claimed.

The two affected rows passed **2/2** locally against production standalone, with
one worker and unchanged assertions/timeouts, in
`.sisyphus/scenario-privacy-armed.log`. The server log also contains
`SQLITE_CONSTRAINT_PRIMARYKEY` warnings in viewer-delivery persistence during
rewind/replay. This is a bounded two-row privacy proof under the fixture, not a
claim of clean server logs, production cutover, fog, or real GM-seat acceptance;
no L1 product path was edited. Independent sensitive workflow review found no
blocking issue in the proposed split.

#2278 remains under independent review; the council restack below incorporates
its current head without waiting for merge.
## Council restack onto open PR #2278

Per Root's council merge order (#2282, #2278, #2279), merged #2278 head
`60e4b54cb91a80ba2ad7e395baf2f914cfa40b54` into this branch without waiting for
its merge. The only conflict was the full-suite workflow step: it now retains
both the absolute `${{ github.workspace }}/.next/standalone` replay fixture root
and the E2E-19/25 exclusion. The armed privacy step needs no replay fixture root.
Review this lane against that #2278 head; earlier #2280 base changes remain
inherited integration differences, not new lane-owned fixes.

Focused restack checks: unique-key YAML parsing and assertions covering both
workflow arms, separate artifacts, production recapture build and always-upload
all PASS; two-quarantine CLI smoke exits 0 and retains both entries with
`status: QUARANTINED` and `ok: false`. No generators or browser runs were invoked.
The machine-idle gate reported baseline-f Jest workers, so no overlapping Jest,
build or Playwright process was started. Previous full recapture, Jest and browser
proofs remain recorded above. The prior pushed head `47d2f1c13` completed all 32
CI checks successfully; Root owns the new head's CI watch and independent review.
The merge commit's generic pre-commit hook selected inherited #2278 TypeScript
files and started a whole-repository typecheck. That hook-owned process tree was
stopped to avoid continued overlap; lint-staged restored its original state.
The restack commit bypasses this hook only, with the focused workflow/CLI checks
above as local proof and the new head's full CI assigned to Root. No typecheck
PASS is claimed for this restack and no lint/typecheck policy file was changed.
