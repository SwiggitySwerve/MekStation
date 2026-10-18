# Scenario pack regression baseline repair — 2026-10-18

This is a bounded repair of the Scenario Pack Recapture nightly failures.
The all-registered recapture now passes six packs and explicitly fails the two
unsupported co-op campaign genesis contracts. It does **not** establish a green
eight-pack nightly baseline or co-op runtime acceptance.

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

| Previously failing test/pack | Cause class                                                                      | Repair                                                                                                                           | Local proof                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| navigation-briefing          | Stale schema-1 baseline                                                          | Sanctioned re-mint and pin 2                                                                                                     | Parity PASS; recapture PASS                                                       |
| personnel-roster             | Stale schema-1 baseline                                                          | Sanctioned re-mint and pin 2                                                                                                     | Parity PASS; recapture PASS                                                       |
| experience-pilot             | Stale schema-1 baseline; intermittent create prerequisite                        | Sanctioned re-mint and pin 2; shared save diagnostics                                                                            | Parity PASS; recapture PASS                                                       |
| combat-midbattle             | Intermittent CI development-server PUT 404, obscured by a create-route URL match | Require successful PUT and a dashboard route; use production standalone in nightly; retain per-pack diagnostics                  | Injected PUT-404 diagnostic PASS; combat recapture PASS                           |
| coop-host-review             | Unsupported hand-authored campaign genesis, misclassified as a combat log        | Classify using payload kind as well as source prefix; fail explicitly before invoking combat or deterministic-finance invariants | Dispatch regression tests PASS; recapture FAIL with unsupported-genesis diagnosis |
| coop-guest-proposal          | Unsupported hand-authored campaign genesis, misclassified as a combat log        | Same kind-aware fail-closed dispatch                                                                                             | Dispatch regression tests PASS; recapture FAIL with unsupported-genesis diagnosis |

Co-op remains an owner dependency: neither entry has a sanctioned generator or a
declared campaign checkpoint invariant. The diagnosis assigns that front-door
identity/session capture contract to the co-op owner. This repair does not remove
either entry, skip its nightly check, fabricate session state, or claim that these
fixtures prove approval, proposal, or synchronization behavior.

The pre-existing invariant comparators and all timeouts/assertions remain intact.
The fresh combat capture is 62,713 bytes versus the committed 19,156 bytes; its
schema and existing seed-agnostic invariants pass. The fresh bytes are retained for
inspection, and the committed combat payload is unchanged.

## Validation and retained evidence

Implementation recapture head: `f41883dd3da5d13bc493aad41f2d06b3ba380044`.
The final documentation amendment does not change runtime or capture code.

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
