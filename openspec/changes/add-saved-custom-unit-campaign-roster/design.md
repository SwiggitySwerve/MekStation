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

### D8 — Deliver through nine dependency-ordered product waves

This OpenSpec change is one CAMP-01 outcome but SHALL be implemented through nine separately reviewed PRs. CAMP-00 and CAMP-01A–D are prerequisite authority seams; CAMP-01E–H deliver the original saved-design campaign-selection outcome, which remains incomplete until its production journey passes. Each line names its proof command and durable receipt:

1. **CAMP-00 — packaged loopback listener (budget ≤4 files/180 lines):** bind/process-test `127.0.0.1`; `npm run validate:multiplayer:packaged-socket` records the inspected listener address.
2. **CAMP-01A — trusted catalog/readiness boundary (≤10/400):** add provenance parsing, catalog snapshot, guard, readiness, and materializer protection; `npm.cmd test -- --runTestsByPath` over `src/types/campaign/__tests__/RosterUnitSource.test.ts`, `missionReadinessProjection.test.ts`, and `materializeCampaignMissionEncounter.test.ts` records invalid-source and zero-lookup/mutation results.
3. **CAMP-01B — authoritative co-op snapshot (≤14/480):** project source roster/force membership through registration/hydration; `npm run verify:qc:coop-campaign-journey` plus `CampaignSync`, entry-panel, registry, and mirror assertions records matching revision/membership.
4. **CAMP-01C — participation authorization (≤12/450):** replace client forces/identity with verified choice; the same co-op gate plus Protocol/binder/runtime assertions records accepted identity derivation and forged-payload rejection.
5. **CAMP-01D — launch-path enforcement (≤12/450):** wire mission/dashboard/Mech Bay/fast-forward/co-op; the co-op gate plus readiness/materializer/launch Jest records canonical success and zero blocked-path calls.
6. **CAMP-01E — saved-design picker and roster identity (≤10/450):** add adapter/UI and stable-source/fresh-instance propagation; focused roster-step/create tests plus `npm run qc:command:customizer-handoff:quick` records accessible selection and exact draft/root-force identity.
7. **CAMP-01F — durable creation commit (≤8/400):** require accepted persistence/conflict recovery; persistence/create tests plus the customizer-handoff quick gate records the real PUT, accepted identity, suppressed failure, and same-id retry.
8. **CAMP-01G — downstream Mech Bay resolution (≤7/350):** resolve/retain metadata after reload/deletion; Mech Bay tests plus the customizer-handoff quick gate records cold-reloaded identity and honest unavailable fields.
9. **CAMP-01H — authority journey and audit receipt (≤5/300):** extend `e2e/campaign-customizer-handoff.spec.ts`; `qc:command:browser:quick`, `qc:campaign-long:browser`, and `verify:qc:viewport-sweep` record the production journey, desktop/390px inspection, and audit reconciliation.

Each wave owns one user-visible outcome, stays within 15 files and 500 changed lines, runs its targeted and applicable gates, receives independent review, merges with a SHA guard, and is followed by an exact-main audit/prune before the next wave branches. A later wave SHALL NOT be bundled into an earlier PR to save time.

## Risks / Trade-offs

- **[Risk] Deleted sources or shared deployment create false authority** → preserve cached unresolved rows without substitution, and keep tenant authentication/ownership outside CAMP-01 as an explicit remote-deployment blocker.

## Rollback

Revert the focused UI/adapter/state changes. Campaigns created during the wave retain additive custom `unitRef`, `unitSource`, and cached roster display fields; older code ignores the additive source field, treats unresolved refs honestly, and does not require a destructive migration.
