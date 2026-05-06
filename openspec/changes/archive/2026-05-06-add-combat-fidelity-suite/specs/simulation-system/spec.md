# Simulation System (delta)

## ADDED Requirements

### Requirement: Deterministic D6 Roller Adapter for Test Pyramid

The simulation engine SHALL provide a `SeededD6Roller` class at `src/simulation/core/SeededD6Roller.ts` that adapts the existing `SeededRandom` (Mulberry32) PRNG to the `D6Roller` interface defined at `src/utils/gameplay/diceTypes.ts`. The roller MUST implement `rollD6()` returning an integer 1-6 and `roll2d6()` returning the sum of two independent rolls in 2-12.

#### Scenario: Two rollers seeded with the same value produce identical sequences

- **GIVEN** two `SeededD6Roller` instances each constructed with seed `42`
- **WHEN** each calls `roll2d6()` 1000 times
- **THEN** the resulting sequences MUST be byte-identical

#### Scenario: Roller distribution matches analytic 2d6 CDF

- **GIVEN** a `SeededD6Roller` constructed with seed `42`
- **WHEN** 100000 `roll2d6()` calls are made
- **THEN** the histogram of (1+1) through (6+6) outcomes MUST be within ±5% of the analytic 1/36-per-(d1,d2)-pair distribution

#### Scenario: Roller can be passed to combat utility helpers

- **GIVEN** any utility function in `src/utils/gameplay/damage/` or `src/utils/gameplay/criticalHitResolution/` that consumes 2d6
- **WHEN** the function accepts an optional `roller?: D6Roller` parameter
- **THEN** the function MUST use the injected roller when provided AND fall back to `defaultD6Roller` when omitted

### Requirement: Catalog-Hydrated Unit State

The simulation engine SHALL hydrate `IUnitGameState` from the catalog `IFullUnit` for every participant in a swarm run. `toAIUnitState()` at `src/simulation/runner/SimulationRunnerSupport.ts` MUST read the participant's real `unitId`, look up the corresponding `IFullUnit` via the catalog service, and map its weapons, armor, and structure into the in-memory game state. The synthetic single-medium-laser fallback path used by the legacy preset mode MAY remain for non-swarm callers but MUST NOT be the default for swarm participants.

#### Scenario: Atlas AS7-D hydrates with its real loadout

- **GIVEN** an Atlas AS7-D participant with `unitId: 'atlas-as7-d'`
- **WHEN** the runner hydrates initial unit state
- **THEN** the resulting `IUnitGameState.weapons` MUST include 1× AC/20, 1× LRM-20, 4× Medium Laser, and 1× SRM-6
- **AND** the resulting per-location armor map MUST sum to 304 across 11 locations (HD/CT/CTR/LT/LTR/RT/RTR/LA/RA/LL/RL)

#### Scenario: Locust LCT-1V hydrates with its real loadout

- **GIVEN** a Locust LCT-1V participant
- **WHEN** the runner hydrates initial unit state
- **THEN** the resulting weapon list MUST match the canonical Locust loadout (1× Medium Laser, 2× Machine Gun)
- **AND** total armor MUST match the canonical Locust value (64)

### Requirement: Combat Event Causal Ordering

When a weapon attack resolves, the simulation engine SHALL emit events in this declared order: `AttackDeclared` → `AttackResolved` → `DamageApplied` (per location) → `LocationDestroyed` (if location armor + structure both reach zero) → `TransferDamage` (per location transfer) → `CriticalHit` (per crit triggered) → `CriticalHitResolved` (per slot resolved) → `ComponentDestroyed` (per fully-destroyed component) → `UnitDestroyed` (if applicable). Downstream consumers (replay UI, MetricsCollector, swarm aggregation, P2P sync, anomaly detectors) MUST be able to rely on this ordering.

#### Scenario: Atlas hits Locust and destroys CT, ordering verified

- **GIVEN** a seeded Atlas-vs-Locust scenario where the Atlas's AC/20 hits the Locust's CT and destroys it
- **WHEN** the resulting event log is enumerated
- **THEN** the events MUST appear in order: `AttackDeclared { weaponId: 'ac20' }`, `AttackResolved { hit: true, hitLocation: 'CT' }`, `DamageApplied`, `LocationDestroyed { location: 'CT' }`, `UnitDestroyed { cause: 'ct_destroyed' }`

#### Scenario: Crit chain emits in causal order

- **GIVEN** a seeded scenario where a structure hit triggers a critical that destroys the gyro
- **WHEN** the event log is enumerated
- **THEN** `CriticalHit { count: 1 }` MUST precede `CriticalHitResolved { component: 'gyro' }` MUST precede `ComponentDestroyed { component: 'gyro' }`

### Requirement: Audit of Unseeded Dice in Combat Pipeline

The CI pipeline SHALL include a grep-based guard that fails when `Math.random()` appears in `src/utils/gameplay/` or `src/simulation/` outside the `defaultD6Roller` definition site. Production code MAY accept the default roller but MUST NOT bypass it.

#### Scenario: CI fails on new Math.random() in damage utility

- **GIVEN** a hypothetical PR introducing `Math.random()` in `src/utils/gameplay/damage/critical.ts` outside the `defaultD6Roller` definition
- **WHEN** the determinism-audit CI step runs
- **THEN** the step MUST fail with a message identifying the offending file and line

### Requirement: SimulationRunner Phase Loop Emits Typed Events

The `SimulationRunner.run()` phase loop SHALL emit typed events for every state transition that downstream consumers depend on. Combat phases (movement, weapon attack, physical attack, post-combat heat / PSR / end-of-turn) MUST each emit at least one event per resolved action. Heat application MUST emit `HeatGenerated` / `HeatDissipated` / `HeatEffectApplied` rather than mutating state silently. Lifecycle events `GameStarted` and `GameEnded` MUST fire at the start and end of each run.

#### Scenario: 1-turn 1v1 fight emits the expected event types

- **GIVEN** a seeded 1-turn 1v1 fight with both units in range
- **WHEN** the run completes
- **THEN** the event log MUST contain at least: `GameStarted`, `MovementDeclared` × 2, `AttackDeclared`, `AttackResolved`, `DamageApplied`, `HeatGenerated`, `HeatDissipated`, `TurnEnded`, `GameEnded`

#### Scenario: Heat phase events fire even when heat is zero

- **GIVEN** a unit with no movement or weapon fire on its turn
- **WHEN** the heat phase resolves
- **THEN** `HeatGenerated { amount: 0 }` and `HeatDissipated` MUST still fire so consumers can audit per-turn heat tracking
