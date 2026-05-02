# Delta Spec: campaign-personnel-architecture

> Adds the `campaign-personnel-architecture` capability to the source-of-truth spec at `openspec/specs/campaign-personnel-architecture/spec.md`. This delta is a NEW spec — no MODIFIED or REMOVED requirements (the capability did not exist as a standalone spec before; previous personnel architecture was implicit in `personnel-management` and the archived `migrate-personnel-to-roster-employment` change).

## ADDED Requirements

### Requirement: Personnel are stored across three orthogonal stores

The system SHALL maintain personnel data across three stores with no overlapping ownership: vault (`usePilotStore`), roster (`useCampaignRosterStore`), and force assignment.

#### Scenario: Pilot identity lives in vault

- **WHEN** a new pilot is created
- **THEN** identity (id, name, base skills, career stats, abilities) is written to `usePilotStore`
- **AND** no copy of these fields appears on `ICampaignRosterEntry`.

#### Scenario: Campaign employment lives on roster

- **WHEN** a vault pilot is hired into a campaign
- **THEN** an `ICampaignRosterEntry` is created with `pilotId` referencing the vault pilot
- **AND** the entry carries only campaign-scoped fields.

### Requirement: Cross-store helpers accept the two-arg signature

Helper functions that operate on personnel data SHALL accept `(entry: ICampaignRosterEntry, pilot: IPilot | null)`. They SHALL NOT accept `IPerson` (deleted) or `IPersonnelView` (REFUSED).

#### Scenario: Medical helper signature

- **WHEN** a medical helper computes healing rate
- **THEN** it accepts `(entry: ICampaignRosterEntry, pilot: IPilot | null)`.

#### Scenario: NPC entries pass null pilot

- **WHEN** a helper is called for an NPC roster entry
- **THEN** the second arg is `null`
- **AND** the helper handles `pilot === null` per its NPC contract.

### Requirement: Pre-join template avoids N² find() calls

Helpers operating over a list of roster entries SHALL receive a pre-built `Map<pilotId, IPilot>` rather than calling `vault.find(...)` per iteration.

#### Scenario: Daily processor pre-joins vault

- **WHEN** `dayAdvancement` iterates campaign roster entries
- **THEN** it builds `pilotsByPilotId: Map<string, IPilot>` once from vault
- **AND** no helper internally calls `vault.find(...)`.

### Requirement: NPC handling is documented per helper

Each domain helper SHALL document whether it processes or skips NPC entries (entries where `vaultPilot === null`).

#### Scenario: Vocational training skips NPCs

- **WHEN** `vocationalTrainingProcessor` encounters an NPC roster entry
- **THEN** it skips the entry.

#### Scenario: Salary processing applies to NPCs

- **WHEN** `salaryService` encounters an NPC roster entry
- **THEN** it applies the entry's `salary` field regardless of vault pilot presence.

### Requirement: Cross-store mutations return delta objects

Helpers that change state in multiple stores SHALL return delta objects keyed by store, not perform in-place mutations.

#### Scenario: Skill progression returns dual delta

- **WHEN** a progression helper increases vault skill AND records campaign XP spent
- **THEN** it returns `{ vault: { pilotId, skillUpdates }, roster: { pilotId, xpDelta } }`.

### Requirement: Bridge functions are transitional infrastructure

`derivePersonnelFromRoster()` and `syncRosterFromPersonnel()` SHALL exist only during the cutover. After PR4 lands, both functions SHALL be deleted.

#### Scenario: Bridge functions absent post-PR4

- **WHEN** searching `src/` for `derivePersonnelFromRoster` or `syncRosterFromPersonnel`
- **THEN** the count SHALL be 0.

#### Scenario: Lossy Critical→Wounded round-trip is fixed

- **WHEN** a pilot has `CampaignPilotStatus.Critical` on their roster entry
- **AND** a save/load round-trip occurs
- **THEN** the status remains `Critical` (NOT downgraded to `Wounded`).

### Requirement: ICampaign.personnel field is removed entirely

`ICampaign` SHALL NOT contain a `personnel` field after PR4.

#### Scenario: Legacy field absent

- **WHEN** searching `ICampaign` interface for a `personnel` field
- **THEN** the field is absent.

#### Scenario: isCampaign() guard not coupled to personnel

- **WHEN** the `isCampaign(value)` type guard runs
- **THEN** it does NOT check for `value.personnel`.

### Requirement: IPerson type is deleted from src/

After PR5 lands, `IPerson` SHALL have zero references in `src/`. The `rosterEntryToPerson.ts` shim and tests SHALL also be deleted.

#### Scenario: IPerson grep returns zero

- **WHEN** running `grep -rn "IPerson\b" src/`
- **THEN** the count SHALL be 0.

#### Scenario: rosterEntryToPerson shim absent

- **WHEN** searching for `src/lib/campaign/utils/rosterEntryToPerson.ts`
- **THEN** the file SHALL NOT exist.
