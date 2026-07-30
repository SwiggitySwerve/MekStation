## Context

Custom units already have server-backed CRUD and version history. `CustomUnitApiService.list()` exposes a durable id plus lightweight chassis, variant, tonnage, type, and version metadata. The campaign wizard already distinguishes its roster-instance `SelectedUnit.id` from the source design `SelectedUnit.unitRef`, and campaign submit already writes `unitRef` onto `IRosterUnitProjection`.

The missing seam is selection and resolution:

- `CreateCampaignPage.RosterStep.tsx` renders only four representative stock choices.
- `useCampaignRosterDraft` can add only a template-shaped input.
- `addTemplateUnitToRootForce` refuses a selected unit unless its name or tonnage matches a stock template, even though the root force needs only the roster-instance id.
- the Mech Bay enriches roster rows from the canonical index only.

Mission readiness already treats a non-empty `unitRef` as source identity and does not copy construction data. Combat adaptation remains canonical-only and is deliberately outside this wave.

## Goals / Non-Goals

**Goals:**

- Make saved custom BattleMechs selectable without hiding or replacing the four stock templates.
- Preserve the custom API id through draft, roster projection, root-force membership, save, and cold reload.
- Keep roster-instance identity distinct from source-design identity.
- Give loading, empty, failure, retry, keyboard, desktop, and 390px behavior explicit contracts.
- Prove authority from API/store/server persistence rather than screenshots alone.

**Non-Goals:**

- Making custom units combat-adaptable or claiming a custom design crossed the pre-battle launch boundary.
- Persisting full custom construction data inside a campaign.
- Broadening the picker to vehicles, aerospace, infantry, or invalid custom designs.
- Refactoring general unit-search or force-management architecture.

## Decisions

### D1 — Preserve reference identity, not construction snapshots

The saved design's custom-unit API id SHALL become `SelectedUnit.unitRef` and then `IRosterUnitProjection.unitRef`. Each add action SHALL still mint a new roster-instance `unitId`, so two campaign copies of the same saved design have different campaign identities but the same source-design reference.

Campaign persistence SHALL NOT duplicate the saved unit's serialized construction payload. Custom-unit version history remains authoritative for the design record; this wave records only the stable reference and cached display fields already owned by the roster projection.

### D2 — Use one saved-unit adapter at the campaign boundary

A focused campaign adapter SHALL convert `ICustomUnitIndexEntry` into the wizard's selectable metadata: stable ref, display name, tonnage, unit type, and saved-design provenance. The adapter SHALL admit BattleMechs only and SHALL preserve API ids without deriving identity from names.

The roster step SHALL render stock templates and saved designs as separate named groups. Stock controls remain available while saved designs load. Saved designs expose explicit loading, empty, and error-with-retry states.

### D3 — Root-force membership uses roster-instance identity

Campaign root-force membership SHALL append the selected roster instance's `unitId` for either stock or custom sources. It SHALL NOT gate membership by finding a matching `UNIT_TEMPLATES` entry and SHALL NOT substitute a representative stock design.

The roster projection separately retains `unitRef`. Tests SHALL assert that root force contains the new instance id while the roster contains the custom API id.

### D4 — Enrich Mech Bay through a merged metadata view

The Mech Bay SHALL merge the existing BV-enriched canonical index with saved-custom index metadata keyed by source `unitRef`. A custom roster row SHALL resolve its saved name and tonnage after reload; Battle Value SHALL be displayed when the source supplies it and otherwise remain explicitly unavailable rather than borrowing a stock value.

Failure to load saved-unit metadata SHALL not erase the roster row. The row keeps its cached campaign name and an honest unavailable-metadata state.

### D5 — Prove the same identity across authority boundaries

The browser trust anchor SHALL:

1. customize and save a canonical BattleMech, then read its custom API id;
2. select that exact id in campaign creation and submit;
3. inspect browser roster/root-force state and the server-backed campaign/force representation;
4. cold reload dashboard, Forces, Mech Bay, and mission readiness; and
5. reconcile the same roster-instance id and custom `unitRef` throughout.

Screenshots cover visual and accessibility claims only. API responses, store snapshots, persisted campaign/force reads, and post-reload state prove identity and durability.

## Risks / Trade-offs

- **[Risk] Custom-unit deletion after campaign creation leaves an unresolved reference** → preserve the roster row and cached name, show unavailable source metadata, and never silently substitute stock data.
- **[Risk] Fetch latency hides the existing stock choices** → load saved designs independently while stock templates remain interactive.
- **[Risk] Duplicate design additions collapse into one campaign unit** → mint a fresh roster-instance id per add and test two instances sharing one `unitRef`.
- **[Risk] A non-BattleMech custom record appears selectable** → filter at the adapter boundary and cover the exclusion with focused tests.
- **[Risk] This wave appears to promise custom-unit combat** → keep encounter adaptation explicitly out of scope and stop the trust anchor at mission readiness.

## Rollback

Revert the focused UI/adapter/state changes. Campaigns created during the wave retain additive custom `unitRef` values and cached roster display fields; older code treats unresolved refs honestly and does not require a destructive migration.
