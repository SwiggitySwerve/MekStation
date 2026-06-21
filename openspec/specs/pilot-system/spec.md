# pilot-system Specification

## Purpose

Defines Pilot System requirements for Pilot-Facing SPA Browsing Surface, SPA Purchase from Pilot Detail, SPA Flaw XP Grant, and Origin-Only Gating, preserving the source-of-truth scope introduced by archived change add-spa-picker-component.

## Requirements
### Requirement: Pilot-Facing SPA Browsing Surface

The pilot system SHALL expose a single browsing surface — the `SPAPicker`
component — for any pilot-facing flow that needs to present the SPA
catalog (pilot creation, mid-campaign XP spend, designer previews).

#### Scenario: Pilot flows import the picker, not the catalog directly

- **GIVEN** a pilot flow needs to let the player browse SPAs
- **WHEN** the flow is implemented
- **THEN** it SHALL import `SPAPicker` from
  `@/components/spa/SPAPicker`
- **AND** it SHALL NOT render catalog entries with ad-hoc components
- **AND** it SHALL NOT duplicate catalog list logic

#### Scenario: Picker exposes the selection contract

- **GIVEN** a pilot flow mounts the `SPAPicker`
- **WHEN** the player selects an entry
- **THEN** the flow SHALL receive the selection as
  `{ spa: ISPADefinition, designation: ISPADesignation | undefined }`
- **AND** the flow SHALL be responsible for purchase, XP deduction, and
  persistence (the picker itself remains purely presentational)

### Requirement: SPA Purchase from Pilot Detail

The pilot system SHALL allow players to purchase SPAs from the pilot
detail page by spending the pilot's XP.

#### Scenario: Sufficient XP completes purchase

- **GIVEN** a pilot with 150 XP and no ability with id `weapon_specialist`
- **WHEN** the player selects `weapon_specialist` (xpCost 100) with a
  `weapon_type` designation of "Medium Laser" and confirms
- **THEN** `PilotService.purchaseSPA(pilotId, "weapon_specialist",
{ type: "weapon_type", value: "Medium Laser" })` SHALL be called
- **AND** the pilot's XP SHALL decrease from 150 to 50
- **AND** the pilot's `abilities` array SHALL include the new reference

#### Scenario: Insufficient XP rejects purchase

- **GIVEN** a pilot with 50 XP
- **WHEN** the player attempts to purchase an SPA with xpCost 100
- **THEN** the purchase SHALL be rejected with error message
  "Insufficient XP"
- **AND** the pilot record SHALL remain unchanged

#### Scenario: Duplicate purchase rejected

- **GIVEN** a pilot that already owns `blood_stalker`
- **WHEN** the player attempts to purchase `blood_stalker` again
- **THEN** the SPA picker SHALL show the entry as disabled via
  `excludedIds`
- **AND** even if the purchase call bypasses the UI, the service SHALL
  reject it with error message "Ability already owned"

### Requirement: SPA Flaw XP Grant

The pilot system SHALL treat entries with `isFlaw === true` as XP-granting
during the creation flow and SHALL apply the negative `xpCost` as a credit.

#### Scenario: Taking a flaw grants XP

- **GIVEN** a pilot in the creation flow with 100 XP
- **WHEN** the player takes a flaw with `isFlaw === true` and
  `xpCost = -200`
- **THEN** the pilot's XP SHALL increase from 100 to 300
- **AND** the flaw SHALL be recorded in the pilot's `abilities` array

#### Scenario: Flaws outside creation flow are rejected

- **GIVEN** a pilot outside the creation flow
- **WHEN** the player attempts to take a flaw
- **THEN** the service SHALL reject the action with message "Flaws can
  only be taken during pilot creation"

### Requirement: Origin-Only Gating

The pilot system SHALL restrict entries with `isOriginOnly === true` to
the pilot creation flow.

#### Scenario: Origin-only entry offered during creation

- **GIVEN** a pilot in the creation flow
- **WHEN** the player opens the SPA picker
- **THEN** origin-only entries SHALL render enabled and purchasable at
  their listed `xpCost` (typically 0)

#### Scenario: Origin-only entry gated post-creation

- **GIVEN** a pilot outside the creation flow
- **WHEN** the player opens the SPA picker
- **THEN** origin-only entries SHALL render disabled
- **AND** if the `purchaseSPA` service method is called with an
  origin-only id anyway, it SHALL reject with message "Origin-only
  abilities cannot be acquired after creation"

### Requirement: SPA Removal Allowed Only in Creation

The pilot system SHALL allow SPA removal during pilot creation and SHALL
reject removal after creation.

#### Scenario: Remove ability during creation

- **GIVEN** a pilot in the creation flow that owns `iron_man` (xpCost 100)
- **WHEN** the player removes `iron_man`
- **THEN** `PilotService.removeSPA(pilotId, "iron_man")` SHALL be called
- **AND** the pilot's XP SHALL increase by 100 (refund)
- **AND** the ability SHALL be removed from the pilot's `abilities`
  array

#### Scenario: Remove ability after creation is rejected

- **GIVEN** a pilot outside the creation flow that owns `iron_man`
- **WHEN** the player attempts to remove `iron_man`
- **THEN** the Remove affordance SHALL render disabled
- **AND** a tooltip SHALL explain "Abilities cannot be removed after
  creation"
- **AND** if the service is called anyway, it SHALL reject with message
  "Abilities are permanent after creation"

### Requirement: Abilities Section on Pilot Detail Page

The pilot detail page SHALL expose the owned-abilities list and the
add-ability affordance as a cohesive section.

#### Scenario: Pilot with no abilities shows empty state

- **GIVEN** a pilot whose `abilities` array is empty
- **WHEN** the pilot detail page renders
- **THEN** the Abilities section SHALL display an empty state prompting
  "No special abilities — click Add Ability to purchase"
- **AND** the Add Ability button SHALL remain enabled if the pilot has
  XP or is in the creation flow

#### Scenario: Owned abilities render with designation

- **GIVEN** a pilot that owns `range_master` with designation
  `{ type: "range_bracket", value: "Medium" }`
- **WHEN** the Abilities section renders
- **THEN** the row SHALL display "Range Master (Medium)"
- **AND** the row SHALL show the Gunnery category color accent
- **AND** the row SHALL show the CamOps source badge

### Requirement: SPA Designation Data Shape

The pilot system SHALL define a single `ISPADesignation` discriminated
union that captures every designation supported by the SPA catalog.

#### Scenario: Weapon-type designation

- **GIVEN** an SPA with `designationType === "weapon_type"`
- **WHEN** a designation is constructed for it
- **THEN** the designation SHALL be `{ type: "weapon_type", value:
string }` where `value` is a weapon type id from the weapon catalog

#### Scenario: Target designation

- **GIVEN** an SPA with `designationType === "target"`
- **WHEN** a designation is constructed for it
- **THEN** the designation SHALL be `{ type: "target", value: string }`
  where `value` is a unit id

#### Scenario: Range-bracket designation

- **GIVEN** an SPA with `designationType === "range_bracket"`
- **WHEN** a designation is constructed for it
- **THEN** the designation SHALL be `{ type: "range_bracket", value:
"short" | "medium" | "long" }`

#### Scenario: Union covers every catalog designation type

- **GIVEN** the canonical SPA catalog lists the following
  `designationType` values: weapon_type, weapon_category, target,
  range_bracket, skill, terrain
- **WHEN** `ISPADesignation` is defined
- **THEN** the union SHALL include a variant for every one of those
  types
- **AND** no catalog entry SHALL reference a type absent from the union

### Requirement: Designation Persistence on Pilot Record

The pilot system SHALL persist each ability's designation alongside the
ability id on the pilot record.

#### Scenario: Ability ref carries designation

- **GIVEN** a pilot purchases `weapon_specialist` with designation
  `{ type: "weapon_type", value: "medium_laser" }`
- **WHEN** the purchase completes
- **THEN** the pilot's `abilities` array SHALL contain an
  `IPilotAbilityRef` whose `abilityId === "weapon_specialist"` and
  whose `designation === { type: "weapon_type", value: "medium_laser"
}`

#### Scenario: Absent designation permitted for non-designating SPAs

- **GIVEN** a pilot purchases `iron_man` (no designation required)
- **WHEN** the purchase completes
- **THEN** the stored ability ref SHALL have `designation === undefined`

#### Scenario: Designation required when catalog says so

- **GIVEN** a pilot attempts to purchase
  `weapon_specialist` without supplying a designation
- **WHEN** `PilotService.purchaseSPA` is called
- **THEN** the service SHALL reject with error "Designation required
  for Weapon Specialist"
- **AND** the pilot record SHALL remain unchanged

#### Scenario: Designation type must match SPA

- **GIVEN** a pilot attempts to purchase `weapon_specialist` with a
  designation of type `range_bracket`
- **WHEN** `PilotService.purchaseSPA` is called
- **THEN** the service SHALL reject with error "Designation type
  mismatch"

### Requirement: Designation Retrieval Helper

The pilot system SHALL expose a pure `getPilotDesignation(pilot,
spaId)` helper that the combat layer uses to resolve designations.

#### Scenario: Helper returns stored designation

- **GIVEN** a pilot that owns `range_master` with designation
  `{ type: "range_bracket", value: "medium" }`
- **WHEN** `getPilotDesignation(pilot, "range_master")` is called
- **THEN** it SHALL return `{ type: "range_bracket", value: "medium" }`

#### Scenario: Helper resolves legacy alias ids

- **GIVEN** a pilot that owns `range_master` and the caller passes the
  legacy alias id registered in `SPA_LEGACY_ALIASES`
- **WHEN** `getPilotDesignation(pilot, legacyId)` is called
- **THEN** the helper SHALL resolve the legacy id to the canonical id
  first, then return the stored designation

#### Scenario: Helper returns undefined when SPA not owned

- **GIVEN** a pilot that does not own the requested SPA
- **WHEN** `getPilotDesignation(pilot, spaId)` is called
- **THEN** the helper SHALL return `undefined`

#### Scenario: Helper returns undefined when designation absent

- **GIVEN** a pilot that owns the SPA but whose stored ref has
  `designation === undefined`
- **WHEN** `getPilotDesignation(pilot, spaId)` is called
- **THEN** the helper SHALL return `undefined`

### Requirement: Backward Compatibility for Stored Pilots

The pilot system SHALL treat existing stored pilots (written before this
change) as valid, with missing designations interpreted as "not yet
designated".

#### Scenario: Legacy pilot loads without error

- **GIVEN** a stored pilot JSON predating this change, where every
  `IPilotAbilityRef` has no `designation` field
- **WHEN** the pilot is loaded from persistence
- **THEN** the load SHALL succeed
- **AND** `getPilotDesignation(pilot, spaId)` SHALL return `undefined`
  for each of those abilities
- **AND** the combat layer SHALL fall back to its existing placeholder
  behaviour for designation-dependent SPAs until a designation is set

### Requirement: Special Abilities Section on Pilot Detail Sheet

The pilot detail sheet at `/gameplay/pilots/[id]` SHALL include a
"Special Abilities" section that groups owned SPAs by category and
renders them as expanded badges.

#### Scenario: Section renders grouped by category

- **GIVEN** a pilot that owns one Gunnery SPA and one Piloting SPA
- **WHEN** the pilot detail sheet renders
- **THEN** the Special Abilities section SHALL contain a "Gunnery"
  subheader followed by the gunnery badge
- **AND** a "Piloting" subheader followed by the piloting badge

#### Scenario: Expanded badges render designation and description

- **GIVEN** a pilot that owns `range_master` with designation
  `{ type: "range_bracket", value: "Long" }`
- **WHEN** the Special Abilities section renders the row
- **THEN** the expanded badge SHALL display "Range Master (Long)"
- **AND** the description from the catalog SHALL render inline below
  the displayName

#### Scenario: Empty pilot shows "No special abilities" text

- **GIVEN** a pilot with no abilities
- **WHEN** the pilot detail sheet renders
- **THEN** the Special Abilities section SHALL display "No special
  abilities." in place of the grouped list

#### Scenario: Unknown ability id is skipped silently

- **GIVEN** a pilot whose `abilities` array contains an id unknown to
  the catalog
- **WHEN** the Special Abilities section renders
- **THEN** the unknown id SHALL be omitted from the output
- **AND** remaining abilities SHALL render normally
- **AND** no runtime error SHALL be thrown

### Requirement: Vault-Sample vs Template-Synthesis Pilot Generation

The pilot system SHALL expose two pilot-generation strategies for swarm-harness consumption: vault sampling and template synthesis.

The chosen strategy SHALL be determined by the swarm-harness CLI's `--pilots <vault|template>` flag. The default SHALL be `template` so the CLI runs cleanly without a populated vault (e.g., on a fresh checkout, in CI).

Both strategies SHALL accept a `count: number` plus a `SeededRandom` for determinism, and SHALL return `readonly IPilot[]` typed identically — the swarm harness SHALL NOT branch on strategy beyond the initial dispatch.

#### Scenario: Default strategy is template synthesis

- **GIVEN** a CLI invocation without `--pilots` flag
- **WHEN** the swarm harness selects a pilot-generation strategy
- **THEN** the strategy SHALL be `template` synthesis
- **AND** an empty or absent `usePilotStore` SHALL NOT cause the CLI to fail

#### Scenario: Vault strategy samples from existing pilots

- **GIVEN** `usePilotStore.getState().pilots` contains 20 active pilots
- **AND** `--pilots vault --pilots-count 5`
- **WHEN** `generateRandomPilots({ strategy: 'vault', count: 5, vault, random })` is called
- **THEN** the result SHALL be exactly 5 pilots
- **AND** each result SHALL be a reference to a pilot present in the input vault (same `id`, same `skills`)
- **AND** the same seed SHALL produce the same 5 pilots in the same order

#### Scenario: Vault strategy with N greater than vault size samples with replacement

- **GIVEN** a vault with 3 pilots and `count = 10`
- **WHEN** vault sampling runs
- **THEN** the result SHALL contain 10 pilots
- **AND** at least one pilot ID SHALL appear more than once
- **AND** the result SHALL be tagged `metadata.sampledWithReplacement: true`

#### Scenario: Strategies are interface-equivalent

- **GIVEN** two `generateRandomPilots` calls with the same `count` but different strategies
- **WHEN** both return
- **THEN** both SHALL return `readonly IPilot[]` with `length === count`
- **AND** both SHALL produce IDs unique-within-result (template synthesis) OR sourced-from-vault (vault sampling)
- **AND** the swarm harness consumer code path SHALL be identical from this point forward

### Requirement: Synthesized Pilots Bypass Vault Persistence

Pilots generated via the template-synthesis strategy SHALL NOT be persisted to the `usePilotStore` vault. They SHALL exist only for the lifetime of the swarm run that created them.

`usePilotStore.api.ts`'s `createPilotLogic` and equivalent persistence helpers SHALL NOT be invoked by `randomPilotGenerator.ts`. The synthesized pilots are pure in-memory objects keyed only by their UUIDs for the per-run encounter binding.

#### Scenario: No vault writes during synthesis

- **GIVEN** a swarm-harness run with `--pilots template --runs 100 --pilots-per-side 4`
- **WHEN** the run completes
- **THEN** `usePilotStore` SHALL contain zero new pilots compared to its pre-run state
- **AND** no network calls SHALL have been made to `/api/pilots` endpoints
- **AND** no SQLite writes SHALL have occurred against the pilot table

#### Scenario: Synthesized pilots resolvable for the run

- **GIVEN** synthesized pilots in a swarm run
- **WHEN** `encounterToGameSession.buildGameUnitsForForce` calls `getPilotById(synthesizedId)`
- **THEN** the lookup SHALL resolve via an in-memory map seeded with the synthesized pilots for this run only
- **AND** after the run completes, `getPilotById(synthesizedId)` SHALL no longer resolve those IDs

### Requirement: Pilot Skill Bands for Template Synthesis

`IPilotSkillTemplate` (existing type) SHALL be the canonical input for template synthesis. The template SHALL carry `gunneryRange: [min, max]` and `pilotingRange: [min, max]` fields, and synthesis SHALL draw uniformly from those inclusive ranges.

The CLI SHALL accept `--pilot-skill-band <name>` as a shortcut that resolves to a named preset (e.g., `green` = `gunneryRange: [5, 6]`, `regular` = `[4, 5]`, `veteran` = `[3, 4]`, `elite` = `[2, 3]`). The exact preset table SHALL be defined alongside `behaviorVariants.ts` and SHALL be configurable.

#### Scenario: Named band resolves to template

- **GIVEN** `--pilot-skill-band veteran`
- **WHEN** template synthesis runs
- **THEN** every synthesized pilot's `skills.gunnery` SHALL fall in [3, 4]
- **AND** every synthesized pilot's `skills.piloting` SHALL fall in [3, 4]

#### Scenario: Custom template overrides band

- **GIVEN** a swarm config that supplies an explicit `pilotSkillTemplate: { gunneryRange: [1, 2], pilotingRange: [2, 3] }`
- **WHEN** the CLI runs (with no `--pilot-skill-band` override)
- **THEN** synthesized pilots SHALL use the explicit template
- **AND** the named-band defaults SHALL NOT apply

### Requirement: Pilot Match Terminal State Closed Enum

When a match ends, every pilot SHALL have a `matchTerminalState` field on their per-match summary record. The field SHALL be a closed snake_case enum with exactly five values: `'unhurt' | 'wounded' | 'unconscious' | 'kia' | 'ejected'`. This is a per-match outcome distinct from the campaign-level `PilotStatus` at `src/types/pilot/PilotInterfaces.ts:30` (which derives from the match-terminal state plus campaign rules).

The match-terminal state taxonomy:
- **`unhurt`** — pilot took zero wounds during the match
- **`wounded`** — pilot took 1-5 wounds, did NOT fail consciousness, did NOT eject
- **`unconscious`** — pilot failed a consciousness roll AND did not subsequently regain consciousness before match end
- **`kia`** — pilot reached 6 wounds OR was killed by head-destruction event
- **`ejected`** — pilot voluntarily ejected from the mech and (regardless of mech fate) survived the ejection sequence

#### Scenario: Match ends with no pilot wounds → unhurt

- **GIVEN** a pilot with 0 wounds at match end
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'unhurt'`

#### Scenario: Match ends with 3 wounds → wounded

- **GIVEN** a pilot with 3 wounds at match end
- **AND** all consciousness rolls passed
- **AND** no ejection event
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'wounded'`

#### Scenario: Pilot reaches 6 wounds → kia

- **GIVEN** a pilot taking head damage that reaches 6 cumulative wounds
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'kia'`
- **AND** the corresponding `UnitDestroyed.cause` MUST be `'pilot_death'` per the closed set in `damage-system`

#### Scenario: Head location destroyed → kia regardless of wound count

- **GIVEN** a pilot in a unit whose HEAD location is destroyed (armor + structure both zeroed)
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'kia'`
- **AND** the corresponding `UnitDestroyed.cause` MUST be `'head_destroyed'`

#### Scenario: Failed consciousness roll without recovery → unconscious

- **GIVEN** a pilot fails a consciousness roll mid-match
- **AND** the pilot does NOT regain consciousness before match end
- **AND** the pilot does not reach 6 wounds
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'unconscious'`

#### Scenario: Voluntary ejection → ejected

- **GIVEN** a pilot voluntarily ejects from the mech mid-match
- **AND** the ejection sequence resolves with the pilot alive
- **WHEN** the per-match summary is recorded
- **THEN** the pilot's `matchTerminalState` MUST be `'ejected'`
- **AND** the pilot's wound count carries over per ejection rules

#### Scenario: matchTerminalState is mutually exclusive

- **GIVEN** a single pilot's match summary record
- **WHEN** the engine determines the match-terminal state
- **THEN** exactly ONE of the 5 enum values MUST be assigned
- **AND** the values MUST NOT be combined (no `'wounded_and_unconscious'`)

### Requirement: Pilot State Transitions Are Monotonic Within a Match

Within a single match, a pilot's match-terminal state SHALL transition only in the canonical direction `unhurt → wounded → unconscious → kia` (or laterally to `ejected` from any non-kia state). Once a pilot reaches `kia`, no further transitions occur. Once a pilot reaches `ejected`, no further wound damage applies.

#### Scenario: Wounded pilot taking more damage stays wounded until KIA threshold

- **GIVEN** a pilot at 3 wounds (currently `'wounded'`)
- **WHEN** the pilot takes 1 more wound (now 4)
- **THEN** the running terminal state MUST remain `'wounded'` until the consciousness roll either succeeds (stays `'wounded'`) or fails (transitions to `'unconscious'`)
- **AND** the state MUST NOT regress to `'unhurt'` even if the wound counter were somehow decremented

#### Scenario: Ejected pilot's mech destruction does not change pilot terminal state

- **GIVEN** a pilot has ejected (`matchTerminalState: 'ejected'`)
- **WHEN** the abandoned mech is subsequently destroyed
- **THEN** the pilot's `matchTerminalState` MUST remain `'ejected'`
- **AND** the pilot's wound count MUST NOT increase from the mech destruction

