## Why

Twelve campaign features silently no-op in production because they read from `usePersonnelStore`, which is half-wired vestigial code that never gets seeded. The OMO Council 2026-05-01 (`openspec/council-decisions/2026-05-01-personnel-architecture-path.md`) and the just-archived [`decide-campaign-personnel-architecture`](../archive/2026-05-01-decide-campaign-personnel-architecture/) ADR locked the destination architecture: vault `IPilot` = identity, single campaign roster entry (`ICampaignRosterEntry`) = employment.

This is step 5 — the implementation. **Scope was narrowed during apply** after pre-flight reconnaissance discovered the original scope estimate was wrong: the `IPerson` type is woven into 72 production files as a **helper-function parameter signature** (`salaryService.calculatePersonSalary(person: IPerson)`, medical/turnover/awards/ranks/skills/progression). The spike result that "`IPerson` carries no divergent persisted user state" is correct — but type signatures are a separate scope from runtime state. Deleting the `IPerson` type wholesale would touch 72 files and explode this from M-effort to L-effort.

**Narrowed scope:** repoint the 12 features' DATA SOURCES from `usePersonnelStore` to `useCampaignRosterStore`, synthesize `IPerson`-shaped data on-the-fly via a shim function so existing helpers continue to work unchanged, delete the substrate stores/services that have zero callers (`usePersonnelStore`, `CampaignInstanceService`, the unused API routes), but **preserve the `IPerson` type itself** for the helper-signature migration that lives in a follow-up change.

## What Changes

### Inside scope

- Extend `ICampaignPilotState` (`src/types/campaign/CampaignInterfaces.types.ts:141`) into `ICampaignRosterEntry` with the employment + state + statistics + assignment + training fields locked by the ADR. Re-export the old name as a deprecated alias for one PR cycle.
- Update `useCampaignRosterStore` to seed the new fields at campaign creation; round-trip them through persistence.
- Add a shim helper `rosterEntryToPerson(rosterEntry, vaultPilot): IPerson` that synthesizes the legacy `IPerson` shape from the new substrate. Position is derived from vault role; salary/lifestyle/recruitment/etc. come from roster entry's employment fields. The shim lives at `src/lib/campaign/utils/rosterEntryToPerson.ts` and replaces the unused `pilotToPerson()`.
- Repoint the 12 silently-broken features (file:line precise in design.md) to read from `useCampaignRosterStore`, synthesize IPerson via the shim, and call helper functions unchanged. Add ~12 rendered-DOM / observable-side-effect tests.
- Delete `usePersonnelStore` (the empty store), `pilotToPerson()` (the unused migration helper), `ICampaignPilotInstance` + `CampaignInstanceService` + related state services (zero production callers), and `/api/personnel/*` + `/api/campaign-instances/*` API routes IF the per-route grep confirms zero external callers.
- Drop the legacy `personnel: Map<string, IPerson>` field from `useCampaignStore`'s serialization; one-shot warn-log if non-empty on rehydrate (would contradict the spike).
- Update `personnel-management` spec: REMOVE the requirements coupled to `usePersonnelStore` (Personnel Store CRUD Operations, Personnel Query Operations, Personnel Store Persistence, Backwards Compatibility with Pilot). KEEP the requirements describing `IPerson` as a structural type (Person Entity, Personnel Status Management, Personnel Roles, etc.) — they are still load-bearing for the 72 helpers.

### Out of scope (deferred to follow-up changes)

- **`refactor-helper-signatures-to-roster-entry`** (separate L-effort change after this one ships): migrate 72 files' `IPerson` parameter types to `ICampaignRosterEntry` directly, eliminating the `rosterEntryToPerson` shim. After that change ships, the `IPerson` type itself can be deleted in a final cleanup change.
- **`add-support-personnel-types`**: add `kind` discriminator on roster entry + tech/doctor/admin/astech/vehicle-crew shapes.
- **`add-cross-campaign-character-browser`**: UX for "in which campaigns is X active?".
- **`add-npc-graduation-flow`**: NPC → PC promotion UI.
- **`migrate-rank-fields-to-roster`**: rank promotion/demotion fields move from `IPerson` to roster entry. Rank fields are not read by the 12 features being repointed in this change.

### Non-goals

- No salary/turnover/healing/medical formula changes. Same math, different data source.
- No new API routes that aren't replacements for deleted ones (and there are no replacements — the deleted routes had no production callers).
- No touching the unit construction system, BV calculator, or any non-personnel surface.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `personnel-management`: REMOVES 4 requirements coupled to `usePersonnelStore` (Personnel Store CRUD Operations, Personnel Query Operations, Personnel Store Persistence, Backwards Compatibility with Pilot). The remaining requirements describing `IPerson` as a structural type are UNCHANGED in this change — they remain valid because `IPerson` itself is preserved. The two ADD'd requirements from step 4 (Personnel Substrate Architecture + Campaign Roster Employment Record Contract) become the canonical substrate description and coexist with the `IPerson` requirements until the follow-up `refactor-helper-signatures-to-roster-entry` change.

## Impact

- **Affected specs:** `openspec/specs/personnel-management/spec.md` — 4 REMOVEs (down from the original 13). The follow-up change handles the remaining REMOVEs once helpers are migrated.
- **Affected code (this change):** ~15-20 files in `src/types/campaign/`, `src/stores/campaign/`, `src/lib/campaign/processors/`, `src/lib/finances/`, `src/lib/campaign/turnover/`, `src/lib/campaign/awards/`, `src/lib/campaign/utils/`, `src/pages/api/personnel/`, `src/pages/api/campaign-instances/`. The 72 helper files touched by `IPerson` type imports are NOT modified in this change.
- **APIs:** Deletes `/api/personnel/*` and `/api/campaign-instances/*` routes after per-route grep confirms zero production callers (and the routes are truly orphaned).
- **Dependencies:** Unblocks `refactor-helper-signatures-to-roster-entry` (next), then `add-support-personnel-types`, `add-cross-campaign-character-browser`, `add-npc-graduation-flow`, `migrate-rank-fields-to-roster`.
- **Risk:** The `rosterEntryToPerson` shim is the load-bearing bridge between the new substrate and the legacy helpers. If the shim's field mapping is wrong, every helper produces wrong values silently. Mitigation: shim has a dedicated unit test asserting field-by-field equality between a `(rosterEntry, vaultPilot)` input pair and the expected `IPerson` output.
- **Tests:** ~12-15 new rendered-DOM / observable-side-effect tests for the 12 repointed features + ~3 new tests for the shim. Tests targeting `usePersonnelStore` directly are deleted. Net coverage may move ±0.5%.
- **Rollback:** Substrate-rename commit lands LAST. If any earlier phase fails post-merge, individual feature reverts are clean. Trunk stays valid through every commit because the legacy `ICampaignPilotState` alias remains in tree until the very last commit.
