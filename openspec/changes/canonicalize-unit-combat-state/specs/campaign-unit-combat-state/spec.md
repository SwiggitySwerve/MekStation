# Delta Spec: campaign-unit-combat-state

> Adds the `campaign-unit-combat-state` capability to the source-of-truth spec at `openspec/specs/campaign-unit-combat-state/spec.md`. This delta is a NEW spec — no MODIFIED or REMOVED requirements (the capability did not exist before).

## ADDED Requirements

### Requirement: ICampaign owns the canonical unit combat state map

`ICampaign` SHALL declare `unitCombatStates: Readonly<Record<string, IUnitCombatState>>` as a first-class field. All callers SHALL access the map directly. Cast-through patterns SHALL be removed.

#### Scenario: Reading current armor for a deployed unit

- **WHEN** a consumer needs current armor for unit `u-42`
- **THEN** it reads `campaign.unitCombatStates['u-42']?.currentArmorPerLocation['LT']`
- **AND** it SHALL NOT read `campaign.roster.units[*].armorDamage` (deleted shape).

#### Scenario: Missing entry indicates undeployed unit

- **WHEN** `campaign.unitCombatStates['u-42']` is `undefined`
- **THEN** the unit has not yet been deployed
- **AND** `createInitialCombatState` SHALL run on first deploy to populate the entry.

#### Scenario: ICampaignUnitState is removed from the type system

- **WHEN** searching `src/` for `ICampaignUnitState` references
- **THEN** the count SHALL be 0.

### Requirement: Combat state shape is normative and positive-space

`IUnitCombatState` SHALL store current remaining values, not damage-taken deltas. Numeric maps keyed by location SHALL hold the post-damage current value. Destroyed components SHALL be deduped by `(location, slot)`. Ammo SHALL be keyed by ammo bin id, not weapon name.

#### Scenario: Armor encoding

- **WHEN** a location loses 4 of 12 armor in battle
- **THEN** `currentArmorPerLocation['RT']` is `8` (remaining)
- **AND** the value `4` (damage taken) SHALL NOT appear anywhere in combat state.

#### Scenario: Destroyed component dedup

- **WHEN** the same critical slot is reported destroyed by multiple match outcomes
- **THEN** `destroyedComponents` contains exactly one entry for that `(location, slot)` pair.

### Requirement: Initial combat state is derived from construction at deploy time

`createInitialCombatState` SHALL accept full-health values from the construction layer and SHALL NOT introspect `unit-entity-model` types directly.

#### Scenario: Construction layer is the source of max values

- **WHEN** `createInitialCombatState` is called
- **THEN** the caller SHALL pass armor / structure / ammo from construction
- **AND** combat state SHALL NOT call into construction services itself.

### Requirement: Post-battle merge is idempotent

`postBattleProcessor` SHALL track `lastCombatOutcomeId` on each `IUnitCombatState`. Re-applying an outcome with the same `matchId` SHALL produce a structurally equal state.

#### Scenario: Same matchId applied twice

- **WHEN** an outcome with `matchId='m-7'` is applied to a unit, then applied again
- **THEN** `destroyedComponents` length is unchanged after the second application.

### Requirement: Deploy gate predicate is centralized

`isUnitCombatReady(state: IUnitCombatState): boolean` SHALL be the only place encoding deploy eligibility.

#### Scenario: Combat-ready flag false

- **WHEN** `state.combatReady` is `false`
- **THEN** `isUnitCombatReady` returns `false`.

#### Scenario: CT destroyed

- **WHEN** `state.currentStructurePerLocation['CT']` is `0`
- **THEN** `isUnitCombatReady` returns `false` regardless of `combatReady`.

#### Scenario: Non-mech unit with absent CT entry

- **WHEN** `state.currentStructurePerLocation['CT']` is `undefined` AND `state.combatReady` is `true`
- **THEN** `isUnitCombatReady` returns `true`.

### Requirement: Combat state SHALL NOT carry display, cost, or roster fields

`IUnitCombatState` SHALL NOT contain `unitName`, `pilotId`, `repairCost`, `repairTime`, or a `status` enum.

#### Scenario: No display name field

- **WHEN** searching `IUnitCombatState` for `unitName`
- **THEN** the field is absent (display name is cached on `ICampaignRosterEntry`).

#### Scenario: No repair cost field

- **WHEN** searching `IUnitCombatState` for `repairCost` or `repairTime`
- **THEN** both fields are absent (computed on demand by `repair` spec).

#### Scenario: No status enum field

- **WHEN** searching `IUnitCombatState` for `status` or `CampaignUnitStatus`
- **THEN** both are absent.

### Requirement: Roster store consumes combat state via thin projection type

`useCampaignRosterStore` SHALL expose a thin display projection (named `IRosterUnitProjection`) carrying only roster-identity and derived display fields. Components needing damage values SHALL read from `campaign.unitCombatStates[unitId]` directly.

#### Scenario: Damage bar rendering

- **WHEN** `RosterStateCards.tsx` renders a damage bar
- **THEN** it reads `currentArmorPerLocation` from `IUnitCombatState`
- **AND** computes the bar percentage against `IUnitMaxState.maxArmorPerLocation`
- **AND** does not read `armorDamage` from a roster projection (deleted field).

#### Scenario: Projection name does not collide

- **WHEN** the projection type is named
- **THEN** it SHALL NOT be `IUnitDamageState`.
