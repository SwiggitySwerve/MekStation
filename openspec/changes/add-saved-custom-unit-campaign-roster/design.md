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

Campaign persistence SHALL NOT duplicate the saved unit's serialized construction payload. Custom-unit version history remains authoritative for the design record; this wave records only the stable reference, source kind, and cached display fields already owned by the roster projection. Legacy projections with an absent `unitSource` normalize to `canonical` because saved custom campaign entries did not exist before this change. A present but unrecognized source value SHALL remain invalid and non-launchable; it SHALL NOT be coerced to `canonical`. Runtime behavior SHALL NOT infer source kind from names, tonnage, or id prefixes.

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

Materializer input SHALL require the caller's snapshot and SHALL perform no catalog I/O. Preflight SHALL reject a non-ready snapshot, forged `canonical` label, stale state, or unresolved ref before its first side-effecting fetch, so direct invocation cannot bypass the UI. Co-op launch SHALL map every contributed force `unitId` to its source-bearing campaign roster projection and apply the same snapshot guard inside `launchCoopMission` before composition or `launchCampaignEncounter`; missing mappings SHALL block. The blocked path SHALL NOT create or mutate an encounter, launch force, or game session and SHALL NOT replace the custom ref with a stock template. A later custom-combat wave may change this boundary only with its own adaptation and authority contract.

### D7 — Creation success means accepted server persistence

The production wizard submit path SHALL first commit the assembled campaign/roster/root-force state locally, then call the existing campaign persistence store and await an accepted server record. Success toast and dashboard navigation occur only after the server result is `saved` and contains the same campaign id, roster-instance id, custom `unitRef`, and `unitSource`.

An error or unresolved conflict SHALL keep the player on an honest recovery surface, suppress success feedback/navigation, and offer a retry of the same campaign id rather than creating a duplicate campaign. Creation persistence SHALL NOT automatically re-submit the full local snapshot using a conflicting server version; a `409` remains explicit conflict state and cannot silently overwrite the intervening record. Browser proof SHALL exercise this production path; test-only persistence helpers cannot satisfy the requirement.

Journey fixtures SHALL be synthetic. Receipts SHALL attach allowlisted equality/boolean fields needed for authority proof rather than raw campaign, custom-unit construction, finance, narrative, or store dumps. Screenshots, traces, and videos SHALL contain no real user data.

### D8 — Deliver through seven dependency-ordered product waves

This OpenSpec change is one CAMP-01 outcome but SHALL be implemented through seven separately reviewed PRs:

1. **CAMP-00 — packaged loopback listener (budget ≤4 files/180 lines):** bind and process-test the actual `127.0.0.1` listener.
2. **CAMP-01A — trusted catalog/readiness boundary (≤10/400):** add source provenance, typed catalog snapshot, shared guard, readiness behavior, and direct materializer protection.
3. **CAMP-01B — launch-path enforcement (≤12/450):** inject the boundary into mission launch, dashboard, Mech Bay, fast-forward, and co-op contribution/launch paths.
4. **CAMP-01C — saved-design picker and roster identity (≤10/450):** add the adapter/UI and propagate stable source plus fresh roster-instance identity into the root force.
5. **CAMP-01D — durable creation commit (≤8/400):** require accepted server persistence, explicit conflict behavior, and same-campaign retry.
6. **CAMP-01E — downstream Mech Bay resolution (≤7/350):** resolve or honestly retain saved-custom metadata after reload/deletion.
7. **CAMP-01F — authority journey and audit receipt (≤5/300):** run the full cold-reload browser trust anchor with desktop/390px evidence and reconcile the audit.

Each wave owns one user-visible outcome, stays within 15 files and 500 changed lines, runs its targeted and applicable gates, receives independent review, merges with a SHA guard, and is followed by an exact-main audit/prune before the next wave branches. A later wave SHALL NOT be bundled into an earlier PR to save time.

## Risks / Trade-offs

- **[Risk] Custom-unit deletion after campaign creation leaves an unresolved reference** → preserve the roster row and cached name, show unavailable source metadata, and never silently substitute stock data.
- **[Risk] Fetch latency hides the existing stock choices** → load saved designs independently while stock templates remain interactive.
- **[Risk] Duplicate design additions collapse into one campaign unit** → mint a fresh roster-instance id per add and test two instances sharing one `unitRef`.
- **[Risk] A non-BattleMech custom record appears selectable** → filter at the adapter boundary and cover the exclusion with focused tests.
- **[Risk] This wave appears to promise custom-unit combat** → require an explicit readiness blocker, prove that materialization never starts, and stop the trust anchor at that boundary.
- **[Risk] Server persistence failure creates duplicate campaigns on retry** → retain the pending campaign id and retry only the persistence commit.
- **[Risk] Catalog failure looks like an empty catalog or forged source labels bypass combat safety** → require the typed trusted snapshot, explicit unavailable recovery, exact-ref membership, and materializer rejection before side effects.
- **[Risk] Shared or remote hosting exposes unauthenticated local-first APIs** → keep tenant authentication/ownership outside CAMP-01 but record it as an explicit deployment blocker governed by the future `api-layer` authentication capability.

## Rollback

Revert the focused UI/adapter/state changes. Campaigns created during the wave retain additive custom `unitRef`, `unitSource`, and cached roster display fields; older code ignores the additive source field, treats unresolved refs honestly, and does not require a destructive migration.
