## Context

Custom units already have server-backed CRUD and version history. `CustomUnitApiService.list()` exposes a durable id plus lightweight chassis, variant, tonnage, type, and version metadata. The campaign wizard already distinguishes its roster-instance `SelectedUnit.id` from the source design `SelectedUnit.unitRef`, and campaign submit already writes `unitRef` onto `IRosterUnitProjection`.

Electron configures the packaged server with `HOSTNAME=127.0.0.1`, but the current production listener does not pass that hostname to `listen()` and can bind an unspecified interface. CAMP-00 repairs and process-tests that boundary before CAMP-01 writes custom campaign records. The base `api-layer` specification explicitly leaves authentication middleware as a future enhancement, so CAMP-01 proves server persistence and gameplay authority only inside the repaired local-first boundary; it does not claim tenant isolation or authorize exposing campaign/custom-unit routes on a shared remote host.

The missing seam is selection and resolution:

- `CreateCampaignPage.RosterStep.tsx` renders only four representative stock choices.
- `useCampaignRosterDraft` can add only a template-shaped input.
- `addTemplateUnitToRootForce` refuses a selected unit unless its name or tonnage matches a stock template, even though the root force needs only the roster-instance id.
- the Mech Bay enriches roster rows from the canonical index only.

Mission readiness currently treats any non-empty `unitRef` as sufficient source identity, even though encounter materialization remains canonical-only. This wave must preserve the custom ref for campaign authority while also preventing it from crossing the launch boundary.

## Goals / Non-Goals

**Goals:**

- Make saved custom BattleMechs selectable without hiding or replacing the four stock templates.
- Preserve the custom API id and explicit source kind through draft, roster projection, root-force membership, server save, and cold reload.
- Keep roster-instance identity distinct from source-design identity.
- Keep saved custom roster rows visible at mission readiness while blocking launch until combat adaptation exists.
- Preserve a usable canonical-only launch path for mixed rosters.
- Give loading, empty, failure, retry, keyboard, desktop, and 390px behavior explicit contracts.
- Prove authority from API/store/server persistence rather than screenshots alone.

**Non-Goals:**

- Making custom units combat-adaptable or claiming a custom design crossed the pre-battle launch boundary.
- Persisting full custom construction data inside a campaign.
- Broadening the picker to vehicles, aerospace, infantry, or invalid custom designs.
- Refactoring general unit-search or force-management architecture.

## Decisions

### D1 — Preserve reference identity, not construction snapshots

The saved design's custom-unit API id SHALL become `SelectedUnit.unitRef` and then `IRosterUnitProjection.unitRef`. The draft and roster projection SHALL also carry one shared `unitSource` discriminator with `canonical` and `custom` values. Each add action SHALL still mint a new roster-instance `unitId`, so two campaign copies of the same saved design have different campaign identities but the same source-design reference and source kind.

Campaign persistence SHALL NOT duplicate the saved unit's serialized construction payload. Custom-unit version history remains authoritative for the design record; this wave records only the stable reference, source kind, and cached display fields already owned by the roster projection. A raw persistence parser SHALL accept `unitSource` as `unknown` and produce `RosterUnitSourceResolution = valid(canonical | custom) | legacy(canonical) | invalid`; only an absent field may become legacy canonical, while a present unrecognized value remains invalid/non-launchable, never enters the typed source field, and cannot be automatically rewritten. Runtime behavior SHALL NOT infer source kind from names, tonnage, or id prefixes.

### D2 — Use one saved-unit adapter at the campaign boundary

A focused campaign adapter SHALL runtime-validate each `ICustomUnitIndexEntry` before converting it into wizard metadata: non-empty id/chassis/variant, exact BattleMech type, and finite positive tonnage. Invalid records SHALL be excluded with honest unavailable/error accounting. Valid records retain stable ref, display name, tonnage, unit type, and saved-design provenance. The adapter SHALL preserve API ids without deriving identity from names.

The roster step SHALL render stock templates and saved designs as separate named groups. Stock controls remain available while saved designs load. Saved designs expose explicit loading, empty, and error-with-retry states.

### D3 — Root-force membership uses roster-instance identity

Campaign root-force membership SHALL append the selected roster instance's `unitId` for either stock or custom sources. It SHALL NOT gate membership by finding a matching `UNIT_TEMPLATES` entry and SHALL NOT substitute a representative stock design.

The roster projection separately retains `unitRef` and `unitSource`. Tests SHALL assert that root force contains the new instance id while the roster contains the custom API id and `custom` source kind.

### D4 — Enrich Mech Bay through a merged metadata view

The Mech Bay SHALL merge the existing BV-enriched canonical index with saved-custom index metadata keyed by source `unitRef`. A custom roster row SHALL resolve its saved name and tonnage after reload; Battle Value SHALL be displayed when the source supplies it and otherwise remain explicitly unavailable rather than borrowing a stock value.

Failure to load saved-unit metadata SHALL not erase the roster row. The row keeps its cached campaign name and an honest unavailable-metadata state.

### D5 — Prove the same identity across authority boundaries

The browser trust anchor SHALL:

1. customize and save a canonical BattleMech, then read its custom API id;
2. select that exact id in campaign creation and submit;
3. inspect browser roster/root-force state and the accepted server-backed campaign/force representation written by the production wizard submit path;
4. cold reload dashboard, Forces, Mech Bay, and mission readiness; and
5. reconcile the same roster-instance id, custom `unitRef`, and source kind throughout while proving the custom row remains outside the launch selection.

Screenshots cover visual and accessibility claims only. API responses, store snapshots, persisted campaign/force reads, and post-reload state prove identity and durability.

### D6 — Stop custom identity at the canonical combat boundary

A saved custom `unitRef` SHALL remain valid campaign source identity but SHALL NOT be treated as a resolvable canonical combat record. One shared combat-adaptability guard SHALL govern mission readiness and materializer preflight. The guard SHALL require both `unitSource === canonical` and membership of the exact `unitRef` in a trusted `CanonicalCombatCatalogSnapshot`; a client-supplied source label alone is never sufficient.

The snapshot SHALL be a runtime-only discriminated result: `loading`, `ready` with exact canonical refs, or `unavailable` with a recoverable reason. Browser surfaces SHALL build it from the authoritative `/api/units?includeBV=true` response before synchronous readiness/materializer execution; Node fast-forward SHALL build it from `NodeCanonicalUnitService`. The loader SHALL validate the response and SHALL NOT turn transport, parse, or empty-catalog failure into a successful empty snapshot. Mission launch, campaign dashboard, Mech Bay readiness, and fast-forward production call sites SHALL pass this snapshot explicitly.

Mission readiness SHALL keep custom or invalid-source roster instances visible, mark them non-launchable with a per-unit canonical-combat-unavailable reason, and block any selection containing them. Default selection SHALL exclude custom-blocked rows. An unselected custom row remains visible but cannot be selected; a stale or restored selected custom row remains operable only so the player can deselect it. A canonical-only selection in a mixed roster may proceed. A loading or unavailable catalog SHALL instead block the surface with honest status and retry, not misclassify every canonical ref as missing.

Materializer input SHALL require the caller's snapshot and SHALL perform no catalog I/O. Snapshot/source validation SHALL be its first operation, before diagnostics, scenario-reuse lookup/return, network access, or mutation. The accepted host CampaignSync snapshot SHALL bind campaign, match, and monotonic revision to validated `unitId`/`unitRef`/`unitSource` records plus authoritative `forceId -> unitIds` membership built from the real campaign roster and forces. `CampaignCoopEntryPanel`, match registration, the host registry, and guest mirror SHALL preserve that revision-bound projection. Participation SHALL send only `{ missionId, forceId, choice }`; the binder derives match, player, and role from verified connection/registry state and rejects full-force or client-authored identity fields. `launchCoopMission` SHALL resolve force membership and every unit source through the latest accepted snapshot, then apply the catalog guard before composition or `launchCampaignEncounter`; missing, foreign, stale, or mismatched authority SHALL block. The blocked path SHALL NOT look up/reuse/create an encounter, mutate a force, launch a session, or substitute a stock ref. A later custom-combat wave may change this boundary only with its own adaptation and authority contract.

### D7 — Creation success means accepted server persistence

The production wizard submit path SHALL first commit the assembled campaign/roster/root-force state locally, then call the existing campaign persistence store and await an accepted server record. Success toast and dashboard navigation occur only after the server result is `saved` and contains the same campaign id, roster-instance id, custom `unitRef`, and `unitSource`.

An error or unresolved conflict SHALL keep the player on an honest recovery surface, suppress success feedback/navigation, and offer a retry of the same campaign id rather than creating a duplicate campaign. Creation persistence SHALL NOT automatically re-submit the full local snapshot using a conflicting server version; a `409` remains explicit conflict state and cannot silently overwrite the intervening record. Browser proof SHALL exercise this production path; test-only persistence helpers cannot satisfy the requirement.

Journey fixtures SHALL be synthetic. Receipts SHALL attach allowlisted equality/boolean fields needed for authority proof rather than raw campaign, custom-unit construction, finance, narrative, or store dumps. Screenshots, traces, and videos SHALL contain no real user data.

### D8 — Deliver through ten dependency-ordered waves

This specification-only parent SHALL be decomposed into the ten child OpenSpec changes named in the proposal, all separately authored, reviewed, merged, and ledger-accounted before any product implementation; each implementation PR applies only its merged child change, and audit reconciliation records that the newer wave contract supersedes only the audit's delivery shape, not its CAMP-01 outcome or proof. **CAMP-PROOF (≤5 files/360 lines)** adds `camp01-authority-receipt.mjs`, its validator, tests, package wiring, and opt-in JSON-reporter support in `scripts/playwright/run-playwright.mjs`. Its literal versioned `WAVE_CONTRACTS` table uses strict `camp01-authority-receipt/v1`; every row has exact `childChange`, mandatory `specProvenance=[childChange,specPr,specMergeSha,specApprovalId,specReviewer]`, and mode-specific `productProvenance=[productPr,productHeadSha,productApprovalId,productReviewer,productMergeSha|pending]`. The writer accepts a new `--run-root` but rejects caller `--input`, `--run-id`, or pre-existing finalized roots; it generates a cryptographically random run id, creates an exclusive temporary artifact directory, exports `CAMP01_RUN_ID`/`CAMP01_ARTIFACT_DIR` to the exact `--command`, requires every JSON recorder output to carry that run id, and atomically publishes only the row's exact artifact set plus writer-owned `command-result.json` beneath `<run-root>/<run-id>/` after success. Each nested Playwright wrapper writes a unique JSON report in that directory; the writer normalizes HEAD/wave/run/argv/exit code/per-invocation command id/counts/exact test ids/statuses, records every artifact digest, and rejects stale, pre-created, cross-run, extra, or missing artifacts. The validator requires exactly one finalized child under the new run root. For every wave it verifies same-repository spec/product PRs, non-author approvals on their exact heads, the child OpenSpec tree plus ledger entry at `specMergeSha`, and that every product PR commit descends from `specMergeSha`; reviewed-head requires `productHeadSha === receipt.sha` and `productMergeSha=pending`, while `exact-main` fetches `origin/main`, requires `HEAD === receipt.sha === refs/remotes/origin/main`, verifies the product merge, and retains both resolved tuples and immutable PR/review ids. H additionally generates `proof02-repairs.json` only from `--repair="<test-id>|<cause>|<owner>|<child-change>|<spec-pr>|<spec-merge-sha>|<spec-approval-id>|<spec-reviewer>|<product-pr>|<product-head-sha>|<product-merge-sha>|<product-approval-id>|<product-reviewer>"`, applying the same spec tree/ledger/review and product ancestry/review checks; repair product SHAs must be exact-main ancestors and distinct causes require pairwise-distinct product authors. The writer applies each literal `===true`, `===0`, `===1`, or `>=1` predicate and rejects caller-authored result/repair substitutes, missing/wrong provenance, unledgered/post-SHA child specs, pre-spec product commits, extra/missing keys, unrecognized test ids, branch-head exact-main claims, foreign/unmerged/wrong-SHA PRs, author mismatch, self/wrong-head approval, same-owner distinct causes, or SHA/path/digest/run-id drift. CAMP-PROOF has `wave=camp-proof`, `childChange=add-camp01-authority-receipts`, run root `camp-proof-<sha>`, `assertions=[unknownFieldsRejected===true,missingFieldsRejected===true,headShaMatched===true,pathShaMatched===true,inputDigestsMatched===true,exactMainRegenerated===true]`, `artifacts=[command-result.json,wave-result.json]`. Every row runs `write --wave=<id> --run-root=<path> --sha=<sha> --spec="<spec tuple>" --product="<product tuple>" --command="<literal command>"` then `validate --wave=<id> --run-root=<path>`, and repeats both with a new exact-main run root plus merged product provenance and `mode=exact-main`. CAMP-PROOF through CAMP-01D are prerequisites; CAMP-01E–H deliver the original outcome.

1. **CAMP-00 — loopback (child `bind-packaged-server-to-loopback`, ≤4/180):** `validate:multiplayer:packaged-socket`; run root `camp00-loopback-<sha>`; `assertions=[boundAddressIsLoopback===true,expectedAddressMatched===true,unspecifiedAddressRejected===true]`; `artifacts=[command-result.json,listener-result.json]`.
2. **CAMP-01A — catalog/readiness (child `add-campaign-roster-source-readiness`, ≤10/400):** exact source/readiness/materializer Jest command; run root `camp01a-catalog-<sha>`; `assertions=[legacySourceResolvedCanonical===true,unknownSourceRejected===true,canonicalExactRefResolved===true,blockerPresent===true,encounterLookupCount===0,reuseResultCount===0,routeCallCount===0,mutationCount===0,downgradeRejected===true]`; `artifacts=[command-result.json,wave-result.json]`.
3. **CAMP-01B — co-op snapshot (child `add-authoritative-campaign-coop-snapshot`, ≤14/480):** exact CampaignSync/entry-panel/registry/shared-state Jest command plus `verify:qc:coop-campaign-journey`; run root `camp01b-snapshot-<sha>`; `assertions=[campaignIdMatched===true,matchIdMatched===true,revisionMatched===true,forceMembershipMatched===true,sourceIdentityMatched===true,guestMirrorHydrated===true]`; `artifacts=[command-result.json,wave-result.json]`.
4. **CAMP-01C — participation (child `authorize-campaign-coop-participation`, ≤12/450):** exact Protocol/binder/runtime Jest command plus co-op gate; run root `camp01c-participation-<sha>`; `assertions=[serverPlayerDerived===true,serverRoleDerived===true,authorizedChoiceAccepted===true,fullForceRejected===true,forgedIdentityRejected===true,foreignForceRejected===true,staleRevisionRejected===true]`; `artifacts=[command-result.json,wave-result.json]`.
5. **CAMP-01D — launch enforcement (child `enforce-campaign-unit-source-launch-boundary`, ≤12/450):** exact fast-forward/dashboard/`launchCoopMission` Jest command plus readiness/co-op gates; run root `camp01d-launch-<sha>`; `assertions=[catalogReady===true,canonicalSelection.launchSucceeded===true,canonicalSelection.launchEncounterCount===1,blockedSelection.encounterLookupCount===0,blockedSelection.reuseResultCount===0,blockedSelection.createEncounterCount===0,blockedSelection.launchEncounterCount===0]`; `artifacts=[command-result.json,wave-result.json]`.
6. **CAMP-01E — picker/identity (child `add-saved-custom-unit-campaign-picker`, ≤10/450):** exact adapter/roster Jest plus picker Playwright command; run root `camp01e-picker-<sha>`; `assertions=[savedDesignIdPresent===true,rosterInstanceIdPresent===true,unitRefMatched===true,unitSourceCustom===true,rootForceContainsInstance===true,programmaticNamesPresent===true,narrowViewportUsable===true]`; `artifacts=[command-result.json,wave-result.json,desktop.png,mobile-390x844.png]`.
7. **CAMP-01F — creation commit (child `persist-saved-custom-unit-campaign-creation`, ≤8/400):** exact submit/persistence Jest plus production-submit Playwright command; run root `camp01f-persistence-<sha>`; `assertions=[requestMethodPut===true,responseAccepted===true,campaignIdMatched===true,unitRefMatched===true,unitSourceCustom===true,successSuppressedOnFailure===true,sameIdRetried===true,conflictOverwritePrevented===true]`; `artifacts=[command-result.json,wave-result.json]`.
8. **CAMP-01G — Mech Bay (child `resolve-saved-custom-units-in-mech-bay`, ≤7/350):** readiness-stable plus Mech Bay browser command; run root `camp01g-mech-bay-<sha>`; `assertions=[coldReloaded===true,rosterInstanceIdPresent===true,unitRefMatched===true,unitSourceCustom===true,cachedNamePreserved===true,tonnagePreserved===true,bvAvailabilityHonest===true,unresolvedSourceVisible===true]`; `artifacts=[command-result.json,wave-result.json]`.
9. **CAMP-01H — journey/audit (child `prove-saved-custom-unit-campaign-journey`, ≤5/300):** handoff, long-browser, viewport commands; run root `camp01h-journey-<sha>`; the `commandBrowser*` predicates are derived specifically from the normalized `qc:command:browser:quick` invocation, not later H invocations; `assertions=[routeSequenceMatched===true,apiIdentityMatched===true,storeIdentityMatched===true,persistenceIdentityMatched===true,reloadIdentityMatched===true,desktopInspected===true,mobileInspected===true,commandBrowserObservedCount>=1,commandBrowserFailureCount===0,developmentMimeRegressionCovered===true,guestBadgeRegressionCovered===true,saveConflictRegressionCovered===true,proof02RepairsVerified===true]`; H requires passed command-result statuses for exact ids `e2e/campaign-starmap-logistics.spec.ts::campaign starmap logistics::previews, approves, and reloads campaign travel consequences`, `e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::guest direct route shows only player-safe ledger projection`, and `e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::saves and reloads a player-safe merchant reversal from the server campaign list`; `artifacts=[command-result.json,wave-result.json,proof02-repairs.json,desktop.png,mobile-390x844.png,audit-reconciliation.json]`.

CAMP-PROOF owns only the shared verification seam; each product wave owns one user-visible outcome. Every wave stays under 15 files/500 lines, runs targeted/applicable gates, receives independent review, merges with a SHA guard, and is followed by exact-main audit/prune before the next branch. A later wave SHALL NOT be bundled into an earlier PR. CAMP-01H SHALL NOT branch while audit finding PROOF-02 remains reproducible: the development MIME diagnostic, guest-badge timing, and save-conflict timing SHALL first receive separately authored OpenSpec ownership and independently verified PRs when their causes differ, and exact main SHALL record zero failures across the complete observed `qc:command:browser:quick` aggregate while retaining coverage for all three regressions; CAMP-01 SHALL neither absorb nor waive those repairs.

## Risks / Trade-offs
- **[Risk] Deleted sources or shared deployment create false authority** → preserve cached unresolved rows without substitution, and keep tenant authentication/ownership outside CAMP-01 as an explicit remote-deployment blocker.
## Rollback

UI/adapter changes MAY be reverted, but the raw-source parser, persisted provenance, and canonical launch guard are the compatibility floor. A downgrade SHALL refuse to start or load a campaign while custom/invalid provenance exists unless a separately verified migration removes it; regression proof SHALL keep custom/invalid refs from lookup, reuse, routing, or mutation. No rollback may run current truthy-`unitRef` readiness/materialization against CAMP-01 data.
