# simulation-system Spec Delta — Add Encounter Swarm Harness

## MODIFIED Requirements

### Requirement: SeededRandom for All Combat Randomness

All combat randomness in the simulation SHALL flow through `SeededRandom` to ensure reproducibility, AND randomness in force generation, pilot synthesis, and AI variant selection SHALL also flow through `SeededRandom` instances seeded deterministically from the per-run seed (e.g., `baseSeed + runIndex`).

#### Scenario: Simulation uses SeededRandom for combat rolls

- **WHEN** the simulation resolves attacks, critical hits, PSRs, and other random events
- **THEN** all dice rolls SHALL use `SeededRandom` (or an injectable `DiceRoller` backed by `SeededRandom`)
- **AND** the same seed SHALL produce identical simulation results

#### Scenario: Swarm runs are seed-deterministic end to end

- **GIVEN** a swarm run invoked with `--config <path> --seed 42 --runs 10`
- **WHEN** the run completes
- **AND** the same invocation is repeated
- **THEN** the output JSON SHALL be byte-identical across both invocations
- **AND** the `participants` payload SHALL be byte-identical
- **AND** all per-run `chassisId` / `pilotId` / `gunnery` / `piloting` values SHALL match

#### Scenario: Per-run seed derivation is deterministic

- **GIVEN** a swarm with `baseSeed = 100` and `runs = 5`
- **WHEN** each run begins
- **THEN** the per-run seed SHALL be `baseSeed + runIndex` (i.e., 100, 101, 102, 103, 104)
- **AND** the same seed/index pair SHALL always produce the same force / pilot / map / battle outcome

### Requirement: Pilot Skills Drive AI Decisions

`toAIUnitState()` and any companion AI-input helpers SHALL read `gunnery` and `piloting` from `IUnitGameState` rather than substituting hardcoded `DEFAULT_GUNNERY` or `DEFAULT_PILOTING` constants. The default constants SHALL be used only as fallbacks when the unit-game-state field is absent (synthetic-unit paths).

`createInitialState()` and `createMinimalUnitState()` SHALL propagate pilot skills end-to-end from `IGameUnit` (which `encounterToGameSession.buildGameUnitsForForce` already populates from `IPilot.skills`) into `IUnitGameState`.

`AttackAI`, `MoveAI`, and `RetreatAI` SHALL NOT read `DEFAULT_GUNNERY` or `DEFAULT_PILOTING` directly outside of `toAIUnitState`'s fallback branch; all skill reads SHALL go through `IAIUnitState`.

#### Scenario: AI threat scoring uses real gunnery

- **GIVEN** two simulations on identical map/units, one with `gunnery: 2` and one with `gunnery: 5` for the attacking unit
- **WHEN** `AttackAI.scoreThreat` is called for the same target
- **THEN** the score for `gunnery: 2` SHALL exceed the score for `gunnery: 5` (lower gunnery = better, the formula uses `gunnery` as a divisor in threat math)
- **AND** the delta SHALL exceed any noise floor introduced by tie-breaking

#### Scenario: Pilot skill propagates from encounter to AI

- **GIVEN** an encounter where `IForce.assignments[0].pilotId` resolves to a pilot with `skills.gunnery = 3`
- **WHEN** `encounterToGameSession.buildGameUnitsForForce` produces `IGameUnit[]`
- **AND** `createInitialState` constructs `IUnitGameState`
- **AND** `toAIUnitState` projects `IAIUnitState`
- **THEN** the resulting `IAIUnitState.gunnery` SHALL equal 3
- **AND** the `AttackAI` SHALL use 3 in threat scoring, not the default

#### Scenario: Default fallback for synthetic units

- **GIVEN** a synthetic unit constructed via `createMinimalUnitState()` without pilot data
- **WHEN** `toAIUnitState` projects `IAIUnitState`
- **THEN** `gunnery` SHALL be `DEFAULT_GUNNERY` (4) and `piloting` SHALL be `DEFAULT_PILOTING` (5)
- **AND** existing test suites that depend on default skills SHALL continue to pass

#### Scenario: Skill delta produces measurable battle outcome

- **GIVEN** a 100-run batch with side A at gunnery 2 vs side B at gunnery 5, identical mechs and seeded RNG
- **WHEN** the batch completes
- **THEN** side A's win rate SHALL exceed side B's win rate by at least 10 percentage points
- **AND** average turns-to-victory for side A SHALL be lower than the symmetric-skill baseline

### Requirement: Pluggable AI Player

The simulator SHALL accept an injectable AI implementation conforming to the `IAIPlayer` interface, in place of the previously-hardcoded direct `BotPlayer` instantiation. `BotPlayer` SHALL conform to `IAIPlayer` with no runtime behavior change.

`SimulationRunner` SHALL accept an optional `aiPlayerFactory` constructor parameter. When omitted, the factory SHALL default to a `BotPlayer` constructor with the existing `DEFAULT_BEHAVIOR`. When provided, the factory SHALL be called once per run with the per-run `SeededRandom` and an `IBotBehavior` to produce the `IAIPlayer` instance.

When the swarm harness needs different AI variants per side (e.g., `--ai-side-a aggressive --ai-side-b defensive`), `SimulationRunner` SHALL accept a side-keyed factory map: `aiPlayerFactoryBySide: { A: AIPlayerFactory; B: AIPlayerFactory }`. Each side SHALL receive its own `IAIPlayer` instance.

#### Scenario: Default factory produces BotPlayer

- **GIVEN** a `SimulationRunner` constructed without an `aiPlayerFactory`
- **WHEN** the runner executes a turn
- **THEN** the AI driving each side SHALL be a `BotPlayer` instance using `DEFAULT_BEHAVIOR`
- **AND** existing simulation test suites SHALL pass unchanged

#### Scenario: Custom factory injects alternative AI

- **GIVEN** a `SimulationRunner` constructed with a factory that returns a `StandStillAIPlayer` (which always returns `null` from movement and physical phases)
- **WHEN** the runner executes 5 turns
- **THEN** no unit SHALL move from its starting position
- **AND** the `playMovementPhase` method of `StandStillAIPlayer` SHALL be the one invoked, proving the factory is wired

#### Scenario: Side-keyed factory yields different AI per side

- **GIVEN** an `aiPlayerFactoryBySide` mapping `{ A: aggressive-factory, B: defensive-factory }`
- **WHEN** the runner executes a battle
- **THEN** side A units SHALL be driven by an `IAIPlayer` configured with the `aggressive` `IBotBehavior`
- **AND** side B units SHALL be driven by an `IAIPlayer` configured with the `defensive` `IBotBehavior`
- **AND** comparing `aggressive` vs `defensive` over 200 runs SHALL produce a non-degenerate win-rate (between 10% and 90%, inclusive)

#### Scenario: Behavior variant registry exposes named presets

- **GIVEN** the `behaviorVariants.ts` registry
- **WHEN** `getBehaviorVariant('aggressive')` is called
- **THEN** the returned `IBotBehavior` SHALL have `retreatThreshold > 0.5` and `safeHeatThreshold > 13`
- **AND** `getBehaviorVariant('defensive')` SHALL have `retreatThreshold < 0.5` and `safeHeatThreshold < 13`
- **AND** `getBehaviorVariant('unknown')` SHALL throw an explicit error naming the requested variant

### Requirement: Simulation Result Carries Participant Identity

`ISimulationRunResult` SHALL carry a `schemaVersion` field. When the result was produced by a swarm-harness run, `schemaVersion` SHALL equal `2` and the result SHALL include a `participants` payload identifying every unit that fought in the run by side, unit ID, chassis ID, pilot ID, gunnery, piloting, and AI variant name.

Existing consumers that ignore `schemaVersion` SHALL continue to work because the existing fields are preserved. Consumers that need participant identity SHALL gate on `schemaVersion >= 2` before reading `participants`.

#### Scenario: Schema version preserved on existing path

- **GIVEN** a `SimulationRunner.run` called from the existing (non-swarm) `BatchRunner` invocation in the integration test
- **WHEN** the run completes
- **THEN** the result's `schemaVersion` SHALL equal `1`
- **AND** the result SHALL NOT carry a `participants` payload
- **AND** existing assertions on side-aggregate fields SHALL continue to pass

#### Scenario: Swarm run emits participants

- **GIVEN** a swarm-harness invocation that constructs a force from the random force generator
- **WHEN** the run completes
- **THEN** `result.schemaVersion` SHALL equal `2`
- **AND** `result.participants` SHALL be an array with one entry per participating unit
- **AND** each entry SHALL include `sideId`, `unitId`, `chassisId`, `pilotId`, `gunnery`, `piloting`, and `aiVariant`
- **AND** the array length SHALL equal the total unit count across both sides

#### Scenario: chassisId resolves to a valid catalog entry

- **GIVEN** a `participants` payload from a swarm run
- **WHEN** any `chassisId` is looked up in `public/data/units/battlemechs/index.json`
- **THEN** the index SHALL contain a matching entry
- **AND** the matching entry SHALL have a non-null `bv` field

#### Scenario: pilotId is unique within a single run

- **GIVEN** a `participants` payload from a swarm run with synthesized pilots
- **WHEN** all `pilotId` values are collected into a Set
- **THEN** the Set size SHALL equal the array length (no duplicate pilot IDs within the run)
