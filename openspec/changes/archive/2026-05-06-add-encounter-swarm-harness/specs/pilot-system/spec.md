# pilot-system Spec Delta — Add Encounter Swarm Harness

## ADDED Requirements

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
