# Campaign Personnel Architecture Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-05-02
**Dependencies**: campaign-management, pilot-system, personnel-management
**Affects**: personnel-progression, personnel-status-roles, repair, after-combat-report

---

## Overview

### Purpose

Crystallize the canonical architecture for personnel data in a campaign. Distinguish three orthogonal stores (vault, roster, force assignment) and codify the migration path away from the legacy `IPerson` god-type that conflated all three concerns. This spec is the source-of-truth for the post-`migrate-personnel-to-roster-employment` end state and for the in-flight `wire-iperson-hard-cutover` PRs that complete the cutover.

This spec supersedes the implicit conventions previously held by `derivePersonnelFromRoster`, `syncRosterFromPersonnel`, and the `ICampaign.personnel: Map<string, IPerson>` legacy field. After PR4 of `wire-iperson-hard-cutover` lands, the bridge functions are deleted and `campaign.personnel` no longer exists.

### Scope

**In Scope:**

- Three-store architecture: vault (`usePilotStore`) + roster (`useCampaignRosterStore`) + force assignment (separate force-slot mirror).
- Helper signature contract: every cross-store helper accepts `(entry: ICampaignRosterEntry, pilot: IPilot | null)` — the two-arg pattern (NOT a `IPersonnelView` god-type rename).
- Pre-join template: helpers operating in a loop receive a `Map<pilotId, IPilot>` from vault to avoid N² `find()` calls.
- NPC handling contract: domain helpers explicitly document whether they skip NPC entries (statblock-only, no vault pilot).
- Delta-return contract for cross-store mutations: helpers that mutate state return delta objects keyed by store, not in-place mutations.
- Bridge function deletion: `derivePersonnelFromRoster` and `syncRosterFromPersonnel` are NOT permanent infrastructure; they exist only during the cutover.
- `IPerson` deletion: the legacy god-type is removed entirely from `src/types/`.

**Out of Scope:**

- `IPersonnelView` god-type rename (REFUSED by Council #2 — would re-conflate roles).
- `PersonnelStatus` (37 values, `personnel-status-roles` spec) vs `CampaignPilotStatus` (5 values, roster-only) reconciliation. They serve different audiences; reconciliation is a separate spec change.
- Vault/roster store split architecture (already shipped via `migrate-personnel-to-roster-employment`).
- Memoization of derived views (premature; current N² is acceptable for current campaign sizes).
- `IAttributes` aspirational fields on roster entry.
- Pilot consciousness on `ICampaignRosterEntry` (combat-resolution Wave 5 gate; tracked under `campaign-unit-combat-state` deferred extensions).

### Key Concepts

- **Vault** (`usePilotStore`) — long-lived persistent pilot identities. One pilot can be hired by multiple campaigns over their career. Owns: identity, vault skills, lifetime career stats, awards, ability/SPA progression.
- **Roster** (`useCampaignRosterStore`) — per-campaign employment record. Joins to vault via `pilotId`. Owns: campaign-scoped wounds, recovery time, salary override, hire date, departure reason, campaign XP earned, campaign kills, campaign missions.
- **Force assignment** — slot-mirrored on `ICampaignRosterEntry.assignedUnitId`; the canonical force structure lives elsewhere.
- **Bridge functions** — `derivePersonnelFromRoster()` and `syncRosterFromPersonnel()` synthesize the legacy `IPerson` shape from `(entry, pilot)`. Transitional infrastructure only.

---

## Requirements

### Requirement: Personnel are stored across three orthogonal stores

The system SHALL maintain personnel data across three stores with no overlapping ownership: vault (pilot identity), roster (per-campaign employment), and force assignment (unit-slot membership). No store SHALL hold a copy of another store's canonical fields.

#### Scenario: Pilot identity lives in vault

- **WHEN** a new pilot is created
- **THEN** the pilot's identity (id, name, base skills, career stats, abilities) is written to `usePilotStore`
- **AND** no copy of these identity fields appears on `ICampaignRosterEntry`.

#### Scenario: Campaign employment lives on roster

- **WHEN** a vault pilot is hired into a campaign
- **THEN** an `ICampaignRosterEntry` is created with `pilotId` referencing the vault pilot
- **AND** the entry carries only campaign-scoped fields (wounds, recoveryTime, salary, hireDate, campaign XP/kills/missions).

#### Scenario: Force assignment is a slot mirror

- **WHEN** a roster pilot is assigned to a unit
- **THEN** `ICampaignRosterEntry.assignedUnitId` is set
- **AND** the canonical force-slot record lives in the force store, not on the roster entry.

### Requirement: ICampaignRosterEntry carries the campaign-scoped fields production needs

`ICampaignRosterEntry` SHALL carry the per-campaign personnel fields that production helpers branch on. The bridge function `rosterEntryToPerson` SHALL forward these fields verbatim, NOT synthesize defaults. (Per Council #4 2026-05-02; replaces the prior implicit "bridge synthesizes everything" assumption that produced 4 live bugs in salaryService role-categorization, getBestAvailableDoctor filtering, rankService promotion gating, and aging/vocationalTrainingProcessor trait persistence.)

#### Scenario: Required campaign-scoped fields

- **WHEN** an `ICampaignRosterEntry` is constructed
- **THEN** it carries `primaryRole: CampaignPersonnelRole` (required) AND `rankIndex: number` (required) AND pre-existing required fields (`pilotId`, `joinedAt`, `status`, etc.)
- **AND** the deserialize migration defaults legacy stored entries to `primaryRole: PILOT` and `rankIndex: 0` for backward read compatibility.

#### Scenario: Optional campaign-scoped fields

- **WHEN** a campaign-specific behavior applies to a roster entry
- **THEN** the corresponding optional field exists on the entry: `traits?: IPersonTraits`, `lastPromotionDate?: Date`, `isFounder?: boolean`, `isCommander?: boolean`, in addition to pre-existing optional fields (`salary?`, `departureReason?`, etc.).

#### Scenario: Bridge forwards instead of synthesizing

- **WHEN** `rosterEntryToPerson(entry, pilot)` runs
- **THEN** it forwards `primaryRole`, `traits`, `rankIndex`, `lastPromotionDate`, `isFounder`, `isCommander` verbatim from the roster entry
- **AND** it SHALL NOT hardcode `primaryRole: PILOT`, `rankIndex: 0`, omit `traits`, or omit `lastPromotionDate`.

#### Scenario: Live bug regression coverage

- **WHEN** a non-PILOT roster entry (DOCTOR, MEK_TECH, TECH, SOLDIER, DEPENDENT) is processed by `salaryService`
- **THEN** the salary category SHALL match the role
- **AND** `getBestAvailableDoctor` SHALL include DOCTOR/MEDIC entries (not filter them out as non-PILOT)
- **AND** `rankService.processPromotion` SHALL succeed for entries with `rankIndex > 0` baseline
- **AND** `aging.ts` and `vocationalTrainingProcessor.ts` SHALL preserve `traits.glassJaw`, `traits.slowLearner`, and `traits.vocationalXPTimer` across processing passes.

### Requirement: Cross-store helpers accept the two-arg signature

Helper functions that operate on personnel data SHALL accept `(entry: ICampaignRosterEntry, pilot: IPilot | null)` as their primary signature. Helpers SHALL NOT accept `IPerson` (deleted) or `IPersonnelView` (REFUSED by Council #2).

#### Scenario: Medical helper signature

- **WHEN** a medical helper computes healing rate
- **THEN** it accepts `(entry: ICampaignRosterEntry, pilot: IPilot | null)`
- **AND** reads wounds/recoveryTime from `entry`, vault medical bonuses from `pilot`.

#### Scenario: NPC entries pass null pilot

- **WHEN** a helper is called for an NPC roster entry (statblock-only, no vault pilot)
- **THEN** the second arg is `null`
- **AND** the helper handles `pilot === null` per its NPC contract.

### Requirement: Pre-join template avoids N² find() calls

Helpers operating over a list of roster entries SHALL receive a pre-built `Map<pilotId, IPilot>` rather than calling `vault.find(p => p.id === entry.pilotId)` per iteration.

#### Scenario: Daily processor pre-joins vault

- **WHEN** `dayAdvancement` iterates campaign roster entries
- **THEN** it builds `pilotsByPilotId: Map<string, IPilot>` once from vault
- **AND** passes the lookup map (or per-entry pre-resolved pilot) into each helper
- **AND** no helper internally calls `vault.find(...)` on the vault array.

#### Scenario: NPC pilot resolves to undefined

- **WHEN** `pilotsByPilotId.get(entry.pilotId)` returns undefined for an NPC
- **THEN** the caller passes `null` (not `undefined`) as the second arg to helpers.

### Requirement: NPC handling is documented per helper

Each domain helper SHALL document whether it processes or skips NPC entries (entries where `vaultPilot === null`). NPC-skipping helpers SHALL early-return without mutating state.

#### Scenario: Vocational training skips NPCs

- **WHEN** `vocationalTrainingProcessor` encounters an NPC roster entry
- **THEN** it skips the entry (no XP awarded, no skill increase rolled).

#### Scenario: Salary processing applies to NPCs

- **WHEN** `salaryService` encounters an NPC roster entry
- **THEN** it applies the entry's `salary` field (with `BASE_MONTHLY_SALARY` fallback) regardless of vault pilot presence.

### Requirement: Cross-store mutations return delta objects

Helpers that change state in multiple stores SHALL return delta objects keyed by store, not perform in-place mutations. Callers (processors) SHALL apply deltas atomically.

#### Scenario: Skill progression returns dual delta

- **WHEN** a progression helper increases vault skill AND records campaign XP spent
- **THEN** it returns `{ vault: { pilotId, skillUpdates }, roster: { pilotId, xpDelta } }`
- **AND** the calling processor commits each delta to the right store in one atomic transaction.

### Requirement: Bridge functions are transitional infrastructure

`derivePersonnelFromRoster()` and `syncRosterFromPersonnel()` SHALL exist only during the `wire-iperson-hard-cutover` migration. After PR4 of that change lands, both functions SHALL be deleted.

#### Scenario: Bridge functions absent post-PR4

- **WHEN** searching `src/` for `derivePersonnelFromRoster` or `syncRosterFromPersonnel`
- **THEN** the count SHALL be 0 (after PR4 lands).

#### Scenario: Lossy Critical→Wounded round-trip is fixed

- **WHEN** a pilot has `CampaignPilotStatus.Critical` on their roster entry
- **THEN** the round-trip through bridge functions historically downgraded the status to `Wounded` (the bug)
- **AND** PR4 fixes this by deleting the round-trip entirely (no derivation, no sync).

### Requirement: ICampaign.personnel field is removed entirely

`ICampaign` SHALL NOT contain a `personnel` field after PR4 of `wire-iperson-hard-cutover` lands. Production code SHALL read personnel via `useCampaignRosterStore` + `usePilotStore` directly.

#### Scenario: Legacy field absent

- **WHEN** searching `ICampaign` interface for a `personnel` field
- **THEN** the field is absent.

#### Scenario: isCampaign() guard not coupled to personnel

- **WHEN** the `isCampaign(value): value is ICampaign` type guard runs
- **THEN** it does NOT check for `value.personnel` (decoupled in PR4).

### Requirement: IPerson type is deleted from src/

After PR5 of `wire-iperson-hard-cutover` lands, `IPerson` SHALL have zero references in `src/`. The `rosterEntryToPerson.ts` shim and its tests SHALL also be deleted.

#### Scenario: IPerson grep returns zero

- **WHEN** `grep -rn "IPerson" src/`
- **THEN** the count SHALL be 0 (after PR5 lands).

#### Scenario: rosterEntryToPerson shim absent

- **WHEN** searching for `src/lib/campaign/utils/rosterEntryToPerson.ts`
- **THEN** the file SHALL NOT exist (after PR5 lands).

### Requirement: Cross-spec consumption boundaries

Other specs that reference personnel data SHALL consume the split contract defined here (vault + roster + force assignment) and SHALL NOT reference the deleted `IPerson` type after PR5 of `wire-iperson-hard-cutover` lands.

#### Scenario: personnel-management spec consumes the architecture

- **WHEN** `personnel-management/spec.md` describes Person Entity attributes
- **THEN** the attributes are split between vault (`usePilotStore.IPilot`) and roster (`useCampaignRosterStore.ICampaignRosterEntry`) per this spec
- **AND** legacy `IPerson` references in `personnel-management/spec.md` are updated post-PR5 to reference the split.

#### Scenario: personnel-progression spec consumes the contract

- **WHEN** `personnel-progression/spec.md` describes XP spending and skill increase
- **THEN** the helpers it references SHALL accept the two-arg `(entry, pilot)` signature.

---

## Migration notes

This spec is authored post-PR1 of `wire-iperson-hard-cutover` (already shipped as PR #486 — test fixture migration). PR2-PR5 implement the remainder per Council #2's staged cutover. Implementation tracked at `openspec/changes/wire-iperson-hard-cutover/`.

Pre-release context (zero released users, hard-cutover policy): no Zustand `persist` migration callback required. First load post-PR4 rebuilds localStorage from defaults.
