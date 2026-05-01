## Why

The MekStation campaign system has **four parallel personnel data layers**, only two of which are wired in production. `IPerson` / `usePersonnelStore` is half-wired (created but never seeded), `ICampaignPilotInstance` is purely aspirational (zero production callers), and 13 production features silently no-op because they read from `IPerson` while the store starts empty in every campaign. The OMO Council 2026-05-01 (`openspec/changes/archive/2026-05-01-superseded-add-campaign-roster-action-flows/` and `openspec/council-decisions/2026-05-01-personnel-architecture-path.md`) decided that ad-hoc fixes to any one layer would compound the architectural debt. Step 4 of the council's 4-step sequence is this change: **a design-only ADR that locks in the substrate-shape decision before code is repointed.** The implementation work is deferred to the follow-up `migrate-personnel-to-roster-employment` change.

The decision crux: does saved-campaign user data persist `IPerson` character-sheet fields that diverge from vault `IPilot`? The pre-step-2 code-side spike resolved **NO** — `IPerson` is half-wired vestigial code, never written by production paths, never persisted with divergent user data. This unlocks Oracle's **identity-vs-employment synthesis** as the destination architecture without a Path-B-style data migration.

## What Changes

This change is **design-only**. It produces no production code edits. It produces:

- An Architecture Decision Record (ADR) in `design.md` formalizing the identity-vs-employment synthesis: vault `IPilot` = identity, single campaign roster entry = employment.
- A migration plan enumerating the 13 silently-broken features, the order they will be repointed, the deletions (`IPerson`, `usePersonnelStore`, `ICampaignPilotInstance`, `pilotToPerson()`), and the rollback contract for `migrate-personnel-to-roster-employment`.
- A new spec requirement under `personnel-management` capability that **ADDs** the substrate-architecture decision so future authors target the agreed shape, not the legacy `IPerson` shape. Existing `IPerson` requirements are NOT removed in this change — they will be REMOVED in step 5 once code is repointed.
- A new spec requirement under `personnel-management` documenting the **employment record contract** (the single roster type that replaces Layer 2 + Layer 3) at the field-level, so the migration change has an unambiguous target.

**BREAKING (eventual, not in this change):** the synthesis commits to deleting `IPerson` / `usePersonnelStore` / `ICampaignPilotInstance` / `pilotToPerson()` in step 5. Any out-of-tree consumer of those APIs will break when step 5 ships. None exist today (they have zero production callers besides the half-wired store).

### Hard scope fence

Per the council's D-fence guard:

- ✅ IN scope: substrate-shape decision; identity-vs-employment line; field contract for the single roster entry; the 13 features that will migrate; deletion list.
- ❌ OUT of scope: support-personnel role expansion (techs, doctors, admins, astechs, vehicle-crew); MUL-vs-house-faction rank tables; salary formulae; turnover formulae; PSR/healing rule changes; pilot ability tree changes. Each is its own follow-up change.

### Non-goals

- Not implementing the migration. (Step 5 does that.)
- Not adding new personnel roles or attributes. (Out of scope.)
- Not modifying the existing 4,200+ unit data corpus. (No code changes.)
- Not deciding cross-campaign character continuity policy beyond what the council already affirmed (PCs vault-wide, NPCs campaign-scoped). The flag mechanism is locked but the UI for managing it ships in a separate change.

## Capabilities

### New Capabilities

None. This is an architectural decision capturing existing intent.

### Modified Capabilities

- `personnel-management`: ADDs two new requirements — (1) "Personnel Substrate Architecture (Identity vs Employment Split)" capturing the synthesis decision and (2) "Campaign Roster Employment Record Contract" specifying the field-level shape of the roster entry that replaces Layer 2 (`ICampaignPilotState`) + Layer 3 (`IPerson`) in step 5. Existing IPerson-shaped requirements remain UNCHANGED in this change; they are REMOVED in `migrate-personnel-to-roster-employment`.

## Impact

- **Affected specs:** `openspec/specs/personnel-management/spec.md` (gets two ADD'd requirements). No other spec touched.
- **Affected code:** ZERO. Design-only change.
- **APIs:** None changed. The plan in `design.md` enumerates which APIs/stores/actions get deleted in step 5 (`/api/personnel/*` endpoints, `usePersonnelStore`, `pilotToPerson()`, `CampaignInstanceService`).
- **Dependencies:** Unblocks `migrate-personnel-to-roster-employment` (the implementation change). Also unblocks any future `add-support-personnel-types` change (which would extend the new substrate, not the legacy `IPerson`).
- **Risk:** Spec drift — if the `migrate-personnel-to-roster-employment` change deviates from this ADR without amending it, future readers see contradicting requirements. Mitigation: step 5's tasks.md must include a "verify all design decisions in `decide-campaign-personnel-architecture` are honored" task.
- **Rollback:** Trivial. The change archives without merging if Council reconsidered. No code to revert.
