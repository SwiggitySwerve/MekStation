# simulation-system Specification

## Purpose

Defines Simulation System requirements for Replace applySimpleDamage with Full CombatResolver Pipeline, Physical Attack AI Decisions, PSR Resolution in Simulation, and SeededRandom for All Combat Randomness, preserving the source-of-truth scope introduced by archived change full-combat-parity.

## Requirements
### Requirement: Replace applySimpleDamage with Full CombatResolver Pipeline

The simulation runner SHALL replace its simplified damage application (`applySimpleDamage()`) with the full `CombatResolver` pipeline used by the interactive game engine.

#### Scenario: Simulation uses CombatResolver for weapon attacks

- **WHEN** the simulation runner resolves a weapon attack
- **THEN** it SHALL call `CombatResolver.resolveWeaponAttack()` instead of `applySimpleDamage()`
- **AND** the full damage pipeline (armor → structure → transfer → critical → cascade) SHALL be executed

#### Scenario: Simulation damage matches interactive damage

- **WHEN** identical attack scenarios are processed by both the simulation runner and the interactive game engine
- **THEN** the damage results SHALL be identical for the same random seed
- **AND** both paths SHALL produce the same event sequence

#### Scenario: Simulation applies all damage events

- **WHEN** the CombatResolver returns events from a weapon attack
- **THEN** the simulation SHALL apply all returned events (DamageApplied, CriticalHitRolled, AmmoExplosion, PilotHit, UnitDestroyed)
- **AND** the simulation state SHALL be updated accordingly

### Requirement: Physical Attack AI Decisions

The simulation runner SHALL include AI logic for deciding and executing physical attacks during the physical attack phase.

#### Scenario: AI considers physical attacks

- **WHEN** the physical attack phase begins in a simulation
- **THEN** the AI SHALL evaluate whether to punch, kick, charge, DFA, or push
- **AND** the decision SHALL be based on to-hit probability, potential damage, and risk (PSR consequences)

#### Scenario: AI executes physical attack

- **WHEN** the AI decides to perform a physical attack
- **THEN** the attack SHALL be resolved through `CombatResolver.resolvePhysicalAttack()`
- **AND** all resulting events SHALL be applied to the simulation state

#### Scenario: AI respects physical attack restrictions

- **WHEN** the AI evaluates physical attacks
- **THEN** the AI SHALL NOT attempt punches with arms that fired weapons
- **AND** the AI SHALL NOT attempt kicks with legs that have destroyed hip actuators

### Requirement: PSR Resolution in Simulation

The simulation runner SHALL resolve all piloting skill rolls that are triggered during the simulation.

#### Scenario: PSR resolved during simulation turn

- **WHEN** a PSR is triggered (20+ damage, critical hit, physical attack, terrain, etc.)
- **THEN** the simulation SHALL resolve the PSR using the piloting-skill-rolls system
- **AND** if the PSR fails, the fall-mechanics system SHALL be invoked

#### Scenario: Multiple PSRs in a phase

- **WHEN** multiple PSRs are queued in a single simulation phase
- **THEN** they SHALL be resolved in order
- **AND** the first failure SHALL cause a fall and clear remaining PSRs

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

### Requirement: Turn Loop Phase Expansion

The simulation turn loop SHALL include the physical attack phase in its phase sequence.

#### Scenario: Physical attack phase in simulation turn loop

- **WHEN** executing a simulation turn
- **THEN** phases SHALL execute in order: Initiative → Movement → WeaponAttack → PhysicalAttack → Heat → End
- **AND** the PhysicalAttack phase SHALL be processed between WeaponAttack and Heat

### Requirement: Victory Condition Checks with New Combat Effects

The simulation SHALL check for victory conditions that account for new combat effects.

#### Scenario: Unit destroyed by critical hit cascade

- **WHEN** a unit is destroyed by an engine critical hit cascade or ammo explosion during simulation
- **THEN** the simulation SHALL detect the unit's destruction
- **AND** victory conditions SHALL be checked

#### Scenario: Pilot killed ends unit participation

- **WHEN** a pilot is killed by cockpit hit or consciousness failure during simulation
- **THEN** the unit SHALL be marked as inoperable
- **AND** victory conditions SHALL be checked

### Requirement: Bot Target Prioritization by Threat and Kill Probability

`BotPlayer` SHALL select its attack target by evaluating each valid target with a composite score combining the target's offensive threat and the attacker's estimated kill probability, rather than picking uniformly at random.

The score for each candidate target SHALL be computed as:

```
threatScore = totalWeaponDamagePerTurn * remainingHpFraction / max(gunneryModifier, 1)
killProbability = clamp(1 - (toHitTN / 12), 0, 1)
compositeScore = threatScore * killProbability
```

Where `toHitTN` is estimated from the attacker's gunnery skill, the range-bracket modifier, and the firing-arc modifier to the target's hex. The highest composite score SHALL win; ties SHALL be broken using the injected `SeededRandom` so the decision remains reproducible.

#### Scenario: Bot picks high-damage target over crippled light mech

- **GIVEN** a bot attacker with two valid targets: an undamaged Atlas AS7-D (15 damage/turn) and a light mech at 20% armor (4 damage/turn) at equal range
- **WHEN** `BotPlayer.playAttackPhase` runs
- **THEN** the emitted `AttackDeclared` event SHALL target the Atlas
- **AND** the selection SHALL be reproducible across runs with the same seed

#### Scenario: Bot favors easier kill when threats are comparable

- **GIVEN** two targets with equivalent threat scores, but target A has a to-hit TN of 8 and target B has a to-hit TN of 11
- **WHEN** target prioritization runs
- **THEN** the bot SHALL select target A (higher kill probability)

#### Scenario: Bot handles a single target without divide-by-zero

- **GIVEN** exactly one valid target remains on the map
- **WHEN** target prioritization runs
- **THEN** the bot SHALL select that target without evaluating tie-breakers
- **AND** the score computation SHALL NOT throw for zero-heat energy weapons

#### Scenario: Bot returns null when no valid targets exist

- **GIVEN** all enemy units are destroyed or out of maximum weapon range
- **WHEN** `BotPlayer.playAttackPhase` runs
- **THEN** the method SHALL return `null` without raising an exception

### Requirement: Bot Firing-Arc Awareness

`BotPlayer` SHALL exclude weapons that cannot fire into the target's current hex given the attacker's facing and torso-twist state. The arc calculation SHALL use the canonical `calculateFiringArc` helper from `src/utils/gameplay/firingArc.ts` and compare against each weapon's mounted arc.

#### Scenario: Rear-mounted weapon fires when target is behind attacker

- **GIVEN** a bot attacker with a rear-mounted medium laser and a target positioned in the rear arc
- **WHEN** weapon selection runs
- **THEN** the rear medium laser SHALL be included in the fire list
- **AND** forward-mounted weapons in the same unit SHALL NOT be selected for that target

#### Scenario: Torso twist shifts available forward weapons

- **GIVEN** a bot attacker facing north with a target one hex-side to the east, and a pending torso twist to the right
- **WHEN** firing-arc filtering runs
- **THEN** forward-arc weapons SHALL be included because the twist brings the target into the forward arc
- **AND** the emitted attack SHALL record the torso twist state

#### Scenario: Target fully outside all weapon arcs yields empty fire list

- **GIVEN** all of the attacker's weapons mount in the front arc and the target is directly behind the attacker with no torso twist available
- **WHEN** weapon selection runs
- **THEN** the candidate weapon list SHALL be empty
- **AND** `BotPlayer.playAttackPhase` SHALL return `null`

### Requirement: Bot Heat Management Weapon Culling

`BotPlayer` SHALL project the attacker's post-attack heat (`currentHeat + movementHeat + sum(candidateWeaponHeat)`) and, if that value exceeds `IBotBehavior.safeHeatThreshold` (default 13), SHALL drop weapons one at a time from the candidate list — starting with the lowest damage-per-heat ratio — until the projected heat is at or below threshold or the list is empty.

#### Scenario: Bot drops PPC when firing full loadout would shut down

- **GIVEN** an attacker with current heat 10, heat dissipation 10, candidate weapons {PPC: 10 heat / 10 damage, Medium Laser: 3 heat / 5 damage, Small Laser: 1 heat / 3 damage}, and `safeHeatThreshold = 13`
- **WHEN** heat management runs
- **THEN** the PPC SHALL be removed from the candidate list (projected heat without PPC = 10 + 3 + 1 = 14; still over, drop next; final list = {Medium Laser, Small Laser} at projected heat 13)
- **AND** the remaining weapons SHALL all fire

#### Scenario: Bot fires full loadout when cool

- **GIVEN** an attacker at current heat 3 with the same weapon set and threshold
- **WHEN** heat management runs
- **THEN** all three weapons SHALL remain in the candidate list (projected heat 3 + 10 + 3 + 1 = 17; well within dissipation-adjusted budget for this scenario with threshold 13 means PPC is dropped in a strict reading, so this scenario uses a higher threshold to illustrate the "fire everything" path)
- **AND** the emitted attack SHALL fire the complete loadout

#### Scenario: Bot fires nothing when no weapon subset fits budget

- **GIVEN** an attacker at current heat 12 whose cheapest weapon generates 5 heat, with `safeHeatThreshold = 13`
- **WHEN** heat management runs
- **THEN** every weapon SHALL be culled
- **AND** `BotPlayer.playAttackPhase` SHALL return `null` for that turn

### Requirement: Bot Weapon Ordering by Damage-per-Heat and Range Bracket

`BotPlayer` SHALL sort its candidate weapon list in descending order of `damage / max(heat, 1)` so that the most efficient weapons are retained first when heat culling trims the list. Within equal ratio buckets, weapons whose current range bracket is Short SHALL be preferred over Medium over Long. Weapons where the target is inside `minRange` SHALL be skipped when at least one other weapon can fire without minimum-range penalty.

#### Scenario: Short-range efficient weapon beats long-range inefficient weapon

- **GIVEN** candidate weapons {Medium Laser: 5 damage / 3 heat = 1.67, LRM-10: 6 damage / 4 heat = 1.5} and target at 5 hexes
- **WHEN** weapon ordering runs
- **THEN** the Medium Laser SHALL be placed ahead of the LRM-10 in the fire order
- **AND** if heat culling removes one weapon, the LRM-10 SHALL be dropped first

#### Scenario: LRM skipped at minimum range when alternative exists

- **GIVEN** an attacker 2 hexes from target with candidate weapons {LRM-10 (minRange 6), Medium Laser}
- **WHEN** weapon ordering runs
- **THEN** the LRM-10 SHALL be excluded from the fire list
- **AND** the Medium Laser SHALL fire

#### Scenario: Energy weapon with zero heat does not divide by zero

- **GIVEN** a candidate weapon with `heat = 0` (edge case for certain legacy weapon definitions)
- **WHEN** the damage-per-heat score is computed
- **THEN** the score SHALL use `damage / max(heat, 1)` to avoid division by zero
- **AND** the weapon SHALL receive the same treatment as a 1-heat weapon of equivalent damage

### Requirement: Bot Movement Positioning Maintains Line of Sight

`MoveAI` SHALL score candidate movement destinations and pick the highest-scoring hex rather than choosing uniformly at random. The score SHALL favor destinations that maintain line of sight to at least one live enemy and that keep the highest-threat target in the attacker's forward firing arc at the move's resulting facing.

Scoring SHALL use these component weights:

- `+1000` if at least one non-destroyed enemy has line of sight to the destination hex (per `src/utils/gameplay/lineOfSight.ts`)
- `+500` if the highest-threat target (per the Target Prioritization requirement) lies in the move's resulting forward arc
- `-100 * hexDistance` to the nearest enemy (discourages retreating away from the fight)
- `-1 * heatGenerated` (prefer cooler moves when all else is equal)

Ties SHALL be broken using the injected `SeededRandom`.

#### Scenario: Bot prefers hex with line of sight over blind hex

- **GIVEN** two candidate moves: move A arrives at a hex with LoS to one enemy; move B arrives at a hex blocked by a building with no LoS to any enemy
- **WHEN** `MoveAI.selectMove` runs
- **THEN** move A SHALL be selected
- **AND** the selection SHALL be reproducible for a given seed

#### Scenario: Bot rotates to face highest-threat target

- **GIVEN** two moves reaching the same hex with different ending facings, where facing 0 puts the highest-threat target in the forward arc and facing 3 puts it in the rear
- **WHEN** move scoring runs
- **THEN** the move ending at facing 0 SHALL score higher (+500 forward-arc bonus)
- **AND** the bot SHALL commit that facing

#### Scenario: Bot closes distance when all enemies are far away

- **GIVEN** all enemies are beyond maximum weapon range at the start of movement
- **WHEN** move scoring runs
- **THEN** moves that reduce `hexDistance` to the nearest enemy SHALL score higher (smaller `-100 * distance` penalty)
- **AND** the bot SHALL advance toward the enemy force

#### Scenario: Jump move selected when it restores LoS around blocking terrain

- **GIVEN** the bot is behind a hill that blocks LoS to all enemies; a walk move keeps it behind the hill; a jump move clears the hill
- **WHEN** move scoring runs (jump MP available, movement type selection already chose Jump)
- **THEN** the jump move SHALL score higher (+1000 LoS bonus offsets the heat penalty)
- **AND** the bot SHALL commit the jump

### Requirement: Bot Behavior Configuration Extension

The `IBotBehavior` interface SHALL be extended with a `safeHeatThreshold: number` field (default `13`) so that scenario presets can tune bot aggression without code changes. Values outside `[0, 30]` SHALL be clamped at load time with a warning logged.

#### Scenario: Default behavior uses canonical threshold

- **GIVEN** a `BotPlayer` instantiated without a behavior override
- **WHEN** heat management runs
- **THEN** the threshold SHALL be `13` (matches the canonical +2 to-hit heat level)

#### Scenario: Custom threshold overrides default

- **GIVEN** a `BotPlayer` instantiated with `{ safeHeatThreshold: 8 }`
- **WHEN** heat management runs
- **THEN** the bot SHALL cull weapons aggressively, dropping any weapon that pushes projected heat above 8

#### Scenario: Out-of-range threshold is clamped

- **GIVEN** a behavior override with `safeHeatThreshold: 50`
- **WHEN** the `BotPlayer` initializes
- **THEN** the value SHALL be clamped to `30`
- **AND** a warning SHALL be logged describing the clamp

### Requirement: Bot Determinism Under SeededRandom

All new AI decision branches (target tie-breaking, move tie-breaking, exploration fallbacks) SHALL route randomness through the injected `SeededRandom`. Direct calls to `Math.random()` SHALL NOT appear in any AI module.

#### Scenario: Same seed produces identical decisions across runs

- **GIVEN** two `BotPlayer` instances seeded identically and given identical inputs
- **WHEN** `playMovementPhase` and `playAttackPhase` are called in sequence
- **THEN** both instances SHALL emit byte-identical events
- **AND** this SHALL hold across 100 consecutive turns of the same scenario

#### Scenario: Lint enforcement catches Math.random usage

- **GIVEN** a developer adds `Math.random()` to a file in `src/simulation/ai/`
- **WHEN** the project lint rules run
- **THEN** the existing `no-restricted-globals` rule SHALL flag the usage as an error

### Requirement: Batch Monte Carlo Runner

The simulation system SHALL expose a `QuickResolveService.runBatch(config,
options)` that executes `GameEngine.runToCompletion()` N times with
deterministic seed variation and collects the per-run outcomes into an
`IBatchOutcome[]`.

#### Scenario: Batch runs the requested number of sessions

- **GIVEN** a valid `IGameConfig` and `options = { runs: 100, baseSeed:
42 }`
- **WHEN** `QuickResolveService.runBatch(config, options)` is invoked
- **THEN** `GameEngine.runToCompletion` SHALL be called 100 times
- **AND** the returned `IBatchOutcome[]` SHALL contain 100 entries
  (including entries for runs that errored)

#### Scenario: Seed variation produces distinct outcomes

- **GIVEN** `options = { runs: 5, baseSeed: 42 }`
- **WHEN** the batch runs
- **THEN** run `i` SHALL use `seed = baseSeed + i` (so runs use seeds
  42, 43, 44, 45, 46)
- **AND** each run SHALL have its own fresh `DiceRoller` instance
- **AND** no two runs SHALL share `SeededRandom` state

#### Scenario: Batch reproducibility

- **GIVEN** identical `config` and `options = { runs: 10, baseSeed: 42
}` across two invocations
- **WHEN** both batches complete
- **THEN** the two resulting `IBatchResult` objects SHALL be deeply
  equal
- **AND** each `IBatchOutcome.report` SHALL match position-for-position

#### Scenario: Default run count applied

- **GIVEN** `options.runs` is omitted
- **WHEN** `runBatch` is invoked
- **THEN** the default `runs = 100` SHALL be used

### Requirement: Batch Progress Reporting

The batch runner SHALL expose an observable progress channel so the UI
can render `runsCompleted / totalRuns` without busy-polling.

#### Scenario: Progress increments per run

- **GIVEN** a batch of 100 runs in progress
- **WHEN** the 10th run completes
- **THEN** the progress signal SHALL emit
  `{runsCompleted: 10, totalRuns: 100}`

#### Scenario: Progress reaches total on completion

- **GIVEN** a batch of 100 runs has fully completed
- **WHEN** the progress signal is observed
- **THEN** the final emission SHALL be
  `{runsCompleted: 100, totalRuns: 100}`

### Requirement: Event Loop Yielding During Batch

The batch runner SHALL yield control to the event loop at least every
10 completed runs so that the main thread does not freeze during long
batches.

#### Scenario: Main thread stays responsive

- **GIVEN** a 500-run batch is executing
- **WHEN** the batch is halfway done
- **THEN** the runner SHALL have performed at least 25 `await
setTimeout(0)` yields (or equivalent)
- **AND** a UI progress bar bound to the progress channel SHALL update
  during the batch

### Requirement: Batch Cancellation

The batch runner SHALL accept an `AbortSignal` and produce a partial
`IBatchResult` when cancellation fires mid-batch.

#### Scenario: Cancellation returns partial aggregate

- **GIVEN** a 100-run batch in progress, 37 runs completed
- **WHEN** the caller aborts the signal
- **THEN** the runner SHALL stop after the current run finishes
- **AND** `aggregateBatchOutcomes` SHALL be called with the 37
  completed outcomes
- **AND** `IBatchResult.totalRuns` SHALL equal 37 (not 100)

#### Scenario: Immediate cancellation before first run

- **GIVEN** a batch is requested but the signal is already aborted
- **WHEN** `runBatch` is invoked
- **THEN** the runner SHALL return an empty `IBatchResult` with
  `totalRuns: 0`
- **AND** no `GameEngine` instances SHALL be created

### Requirement: Per-Run Error Isolation

A single run that throws SHALL NOT abort the entire batch; the error
SHALL be captured in the corresponding `IBatchOutcome` and the batch
SHALL continue.

#### Scenario: Engine error captured as outcome

- **GIVEN** a batch where run 3's `runToCompletion` throws `"Invalid
weapon state"`
- **WHEN** the batch completes
- **THEN** `outcomes[3]` SHALL contain `{runIndex: 3, seed, error:
"Invalid weapon state"}`
- **AND** `outcomes.length` SHALL equal the configured run count

#### Scenario: Batch aborts on systemic failure

- **GIVEN** a batch where more than 20% of runs error out
- **WHEN** the threshold is crossed
- **THEN** the batch SHALL abort
- **AND** the caller SHALL receive `"Quick Resolve failed: engine
errors"` with the partial outcomes attached

### Requirement: Invalid Run Count Rejection

The batch runner SHALL reject run counts outside the inclusive range
`[1, 5000]` before launching any sessions.

#### Scenario: Zero runs rejected

- **GIVEN** `options = { runs: 0 }`
- **WHEN** `runBatch` is invoked
- **THEN** the call SHALL throw `"Invalid run count"`
- **AND** no `GameEngine` SHALL be created

#### Scenario: Excessive runs rejected

- **GIVEN** `options = { runs: 10000 }`
- **WHEN** `runBatch` is invoked
- **THEN** the call SHALL throw `"Invalid run count"`

### Requirement: Auto-Generated Base Seed

When the caller omits `baseSeed`, the batch runner SHALL generate a
cryptographically random integer and include it in the returned
`IBatchResult` so the batch can be replayed deterministically.

#### Scenario: Omitted baseSeed is generated and reported

- **GIVEN** `options = { runs: 10 }` with no `baseSeed`
- **WHEN** `runBatch` completes
- **THEN** `IBatchResult.baseSeed` SHALL be a non-null integer
- **AND** calling `runBatch(config, { runs: 10, baseSeed:
result.baseSeed })` again SHALL reproduce the same
  `IBatchResult`

### Requirement: UI Progress Channel Contract

The simulation system SHALL expose the batch progress channel as a
React-query-compatible observable that the `useQuickResolve` hook can
subscribe to and surface to the `QuickSimResultPanel` progress bar
without busy-polling.

#### Scenario: Hook receives progress updates

- **GIVEN** `useQuickResolve()` is invoked with `runs: 100`
- **WHEN** a run completes
- **THEN** the hook's `{runsCompleted, totalRuns}` state SHALL update
  to reflect the new completion count
- **AND** any subscribed React component SHALL re-render within one
  animation frame

#### Scenario: Progress snapshot survives renders

- **GIVEN** a component subscribed to the progress channel mid-batch
- **WHEN** the component unmounts and remounts during the batch
- **THEN** the newly mounted component SHALL receive the current
  `{runsCompleted, totalRuns}` value on first render (no reset to
  zero)

### Requirement: UI Abort Signal Binding

The simulation system SHALL bind the `AbortSignal` exposed by
`useQuickResolve()` to the batch runner's cancellation contract so the
Cancel button in the result panel stops the batch after the current
run finishes.

#### Scenario: Cancel from UI halts batch

- **GIVEN** a batch in progress dispatched via `useQuickResolve()`
- **WHEN** the consumer calls the hook's `cancel()` method
- **THEN** the underlying `AbortSignal` SHALL fire
- **AND** the batch runner SHALL stop after the current run finishes
- **AND** the hook SHALL transition to state
  `{isRunning: false, result: <partial>}`

#### Scenario: Cancel is idempotent

- **GIVEN** a batch that has already been cancelled
- **WHEN** the consumer calls `cancel()` again
- **THEN** no error SHALL be thrown
- **AND** no additional state change SHALL occur

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

#### Scenario: PR smoke keeps pilot-skill batch proof bounded

- **GIVEN** the pilot-skill batch variance test preserves a default 100-run asymmetric batch and 100-run symmetric baseline
- **WHEN** PR CI executes the perf-sensitive simulation smoke lane
- **THEN** the run count MAY be lowered by explicit CI configuration
- **AND** the smoke lane SHALL keep the same seeded asymmetric-vs-symmetric assertions
- **AND** local/default execution SHALL remain the larger 100-run proof

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

### Requirement: MAX_TURNS Engine Ceiling Set to 100

The simulation engine SHALL enforce a hard turn-count ceiling of 100 turns per simulation run, defined by `MAX_TURNS` in `src/simulation/runner/SimulationRunnerConstants.ts`. The ceiling is applied via `Math.min(config.turnLimit, MAX_TURNS)` in `SimulationRunner.run()`. Lower per-config turn limits MAY override the ceiling downward but MUST NOT raise it above 100.

#### Scenario: Config requesting 200-turn limit clamps to 100

- **GIVEN** an `ISimulationConfig` with `turnLimit: 200`
- **WHEN** `SimulationRunner.run()` executes
- **THEN** the actual run MUST terminate at or before turn 100 regardless of game state

#### Scenario: Zero turn limit defaults to MAX_TURNS

- **GIVEN** an `ISimulationConfig` with `turnLimit: 0` (no explicit limit)
- **WHEN** the runner executes
- **THEN** the run MUST terminate at or before turn 100

#### Scenario: Real catalog 2v2 fights run to natural conclusion

- **GIVEN** a swarm 2v2 encounter with default AI variants and a 50-turn config limit
- **WHEN** the runner executes
- **THEN** the run MUST be ABLE to complete within the 100-turn engine ceiling
- **AND** the run MUST NOT be silently clamped to 10 turns (the prior ceiling that produced 100% Incomplete outcomes for real catalog encounters)

### Requirement: Engine Determinism Contract With Acknowledged Residual Gap

The simulation engine SHALL produce byte-identical event logs for two runs of the same seed AND the same `ISimulationConfig` AND the same injected `D6Roller` for at least the first 10 turns of any combat. Beyond 10 turns the engine MAY exhibit a residual non-determinism of up to 1 event divergence per 300 events. A future change MUST close this residual gap.

The `it.skip`'d test at `src/simulation/__tests__/integration.test.ts:272` ("should produce identical results for same seed") is the canonical canary for the residual gap. It MUST remain skipped until the residual is closed AND MUST be re-enabled (with `.skip` removed) by the change that closes it.

#### Scenario: 10-turn seeded run produces identical logs

- **GIVEN** two `SimulationRunner` instances seeded with `42`
- **AND** identical `STANDARD_LANCE` configs with `turnLimit: 10`
- **AND** identical `SeededD6Roller` rollers
- **WHEN** each runs
- **THEN** `result1.events.length === result2.events.length`
- **AND** `JSON.stringify(result1.events) === JSON.stringify(result2.events)`

#### Scenario: 20-turn STANDARD_LANCE may diverge by ≤1 event per 300

- **GIVEN** two seeded runs of the same `STANDARD_LANCE` config with `turnLimit: 20`
- **WHEN** each completes
- **THEN** `Math.abs(result1.events.length - result2.events.length)` MUST be ≤ Math.ceil(events.length / 300)
- **AND** the test that asserts strict equality MUST remain `.skip`'d until a follow-on change closes the residual

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

### Requirement: Event Log Chronological Contract

The `IGameEvent.sequence` field (defined on `IGameEventBase` in `src/types/gameplay/GameSessionInterfaces.ts`) is the canonical chronological key for events emitted by `SimulationRunner`. Within a single `gameId`, sequence numbers SHALL be monotonically increasing across consecutive events in `result.events`. Consumers — including the always-on event-log persistence module at `src/simulation/runner/eventLogPersistence.ts` — MAY rely on this ordering without re-sorting.

The existing `IGameEvent` discriminated-union shape (`IGameEventBase` + per-type `payload`) is the contract for persisted event logs. The persistence module SHALL serialize events with `JSON.stringify(event)` and SHALL NOT add wrapper objects, schema-version fields, or transformation layers above the runtime event shape.

The `gameId` field on every `IGameEvent` MUST be stable for the duration of a single `runner.run(simConfig)` invocation. All events emitted by one run share one `gameId`.

#### Scenario: Sequence numbers strictly increase across a run

- **GIVEN** a single completed `runner.run(simConfig)` invocation that returns `result.events`
- **WHEN** the events are iterated in array order
- **THEN** `events[i+1].sequence` SHALL be strictly greater than `events[i].sequence` for every adjacent pair
- **AND** every event's `gameId` SHALL equal `result.gameId`

#### Scenario: Persisted NDJSON preserves the runtime shape exactly

- **GIVEN** an event emitted by the runner with shape `{ id, gameId, sequence, timestamp, type, turn, phase, payload, ... }`
- **WHEN** the event is serialized via `JSON.stringify(event)`, written as one NDJSON line, then re-parsed via `JSON.parse(line)`
- **THEN** the parsed object SHALL deep-equal the original event
- **AND** no consumer-visible fields SHALL be added, removed, or renamed by the persistence layer

### Requirement: Runner Emits GameCreated as Seed Event

`SimulationRunner.run(config)` SHALL emit a `GameCreated` event as the first entry in the returned `events` array (`sequence: 0`). The payload SHALL include the full unit roster in `payload.units` and the per-game configuration in `payload.config`. This is the seed event that every downstream consumer of the persisted NDJSON event log relies on (replay viewer state-from-events reducer, future fog-aware client filtering, future scenario-test bootstrap helpers).

The payload SHALL conform to `IGameCreatedPayload`:
- `payload.units` MUST contain one `IGameUnit` entry per slot the runner allocates. The `id` of each entry MUST match the slot id used by `createInitialState` (`player-N` / `opponent-N`). The entry's `side` MUST match the slot's `IUnitGameState.side`.
- `payload.config.mapRadius` MUST equal the input `ISimulationConfig.mapRadius`.
- `payload.config.turnLimit` MUST equal the input `ISimulationConfig.turnLimit`.
- `payload.config.victoryConditions` and `payload.config.optionalRules` MAY be defaulted (`['destruction']` and `[]` respectively) — the runner is single-mode today, so these stay synthetic.

When the runner is constructed with a `UnitHydrationMap`, each entry's `name`, `unitRef`, `pilotRef`, `gunnery`, and `piloting` SHALL be populated from the hydration data. When no hydration is present (synthetic minimal-unit fallback), `name` MAY equal the slot id, `unitRef` and `pilotRef` MAY be synthetic placeholders, and `gunnery` / `piloting` SHALL fall back to the runner's default skill values.

The runner MUST emit `GameCreated` exactly once per `run(config)` invocation, before any turn-phase events.

#### Scenario: First event in a swarm run is GameCreated

- **GIVEN** a SimulationRunner constructed with no hydration map
- **AND** an `ISimulationConfig` with `seed: 42`, `mapRadius: 9`, `turnLimit: 0`, `unitCount: { player: 2, opponent: 2 }`
- **WHEN** `runner.run(config)` returns
- **THEN** `result.events[0].type` SHALL equal `GameEventType.GameCreated`
- **AND** `result.events[0].sequence` SHALL equal `0`
- **AND** `result.events[0].payload.units` SHALL contain exactly 4 entries
- **AND** every subsequent event SHALL have `sequence > 0`

#### Scenario: GameCreated payload reflects roster from initial state

- **GIVEN** a SimulationRunner with `unitCount: { player: 1, opponent: 3 }` and no hydration
- **WHEN** `runner.run(config)` returns
- **THEN** the `GameCreated` payload's `units` array SHALL contain entries with ids `player-1`, `opponent-1`, `opponent-2`, `opponent-3`
- **AND** the entry with `id: 'player-1'` SHALL have `side: GameSide.Player`
- **AND** the entries with ids `opponent-N` SHALL have `side: GameSide.Opponent`
- **AND** the payload's `config.mapRadius` SHALL equal the input `config.mapRadius`

#### Scenario: GameCreated payload reads hydrated unit names when hydration is present

- **GIVEN** a SimulationRunner constructed with a `UnitHydrationMap` containing one entry for `player-1` whose `fullUnit.chassis === 'Atlas'` and `fullUnit.model === 'AS7-D'`
- **AND** an `ISimulationConfig` with `unitCount: { player: 1, opponent: 1 }`
- **WHEN** `runner.run(config)` returns
- **THEN** the `GameCreated` payload's entry for `player-1` SHALL have `name === 'Atlas AS7-D'` (or some canonical concatenation)
- **AND** the entry's `gunnery` and `piloting` SHALL match the hydration data's values when present

### Requirement: Shared Terrain Movement-Cost Utility

The system SHALL expose `getTerrainMovementCost` and `getPrimaryTerrainFeature` from a shared simulation-accessible utility module (`src/utils/gameplay/terrainMovementCost.ts`). The simulation layer (`src/simulation/`) SHALL consult terrain movement cost only through this utility and SHALL NOT import from the rendering layer (`src/components/`). The rendering module SHALL re-export both functions so existing rendering call sites are unchanged.

#### Scenario: Open ground costs one movement point

- **GIVEN** a hex with no terrain features
- **WHEN** `getTerrainMovementCost` is evaluated for that hex
- **THEN** it SHALL return `1`

#### Scenario: Heavy terrain costs more than open ground

- **GIVEN** a hex containing a heavy-woods terrain feature
- **WHEN** `getTerrainMovementCost` is evaluated for that hex
- **THEN** it SHALL return a value greater than `1`

#### Scenario: Simulation layer does not import rendering code

- **GIVEN** the AI pathfinder and move scorer
- **WHEN** their module imports are resolved
- **THEN** no import SHALL resolve into `src/components/`
- **AND** terrain cost SHALL be sourced from `src/utils/gameplay/terrainMovementCost.ts`

### Requirement: AI Difficulty Tier Registry

The system SHALL provide an AI Difficulty Tier Registry mapping each tier name — `Green`, `Regular`, `Veteran`, `Elite` — to a frozen `IAITierParameters` record. The registry SHALL expose `getTierParameters(name)` which returns the parameter record for a known tier and throws an explicit error for an unknown name. `IBotBehavior` SHALL carry an optional `tier` field defaulting to `Regular`. The tier is player-selectable per scenario. `IAITierParameters` SHALL be additively extensible: later AI changes register their own parameter blocks without modifying the movement block defined here.

The movement parameter block SHALL carry `pathfinderEnabled`, `coverWeight`, `losDenialWeight`, and `terrainCostWeight`. The `Green` and `Regular` tiers SHALL set `pathfinderEnabled` to `false` with zeroed scoring weights so they reproduce the pre-change move scorer exactly. The `Veteran` and `Elite` tiers SHALL set `pathfinderEnabled` to `true`.

#### Scenario: Every tier resolves to a parameter record

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** `getTierParameters` is called for each
- **THEN** each call SHALL return an `IAITierParameters` record with a populated movement block

#### Scenario: Unknown tier name throws

- **GIVEN** a tier name that is not in the registry
- **WHEN** `getTierParameters` is called with that name
- **THEN** an error SHALL be thrown naming the invalid tier and listing the valid tiers

#### Scenario: Default tier is Regular

- **GIVEN** an `IBotBehavior` constructed without an explicit `tier`
- **WHEN** the bot resolves its tier parameters
- **THEN** the `Regular` tier SHALL be used

#### Scenario: Lower tiers reproduce the legacy scorer

- **GIVEN** a bot configured with the `Green` or `Regular` tier
- **WHEN** it scores a candidate move
- **THEN** the score SHALL be identical to the pre-change `scoreMove` output for the same inputs

### Requirement: AI Terrain-Cost Pathfinder

The system SHALL provide `AITerrainPathfinder` exposing `findPath(request)` and `findAllPaths(grid, origin, movementType, capability)` per the frozen API contract. `findPath` SHALL return an `IAIPath` carrying the destination, the ordered hex sequence from origin to destination, the total movement-point cost, and a `reachable` flag. Path cost SHALL be the sum of per-hex `getTerrainMovementCost`. The search SHALL be deterministic — an identical request SHALL always produce an identical `IAIPath` — using canonical hex-neighbor order to break ties between equal-cost paths, without consuming `SeededRandom`.

When a destination exceeds the movement-point budget, `findPath` SHALL return `reachable: false` with a best-effort partial path. `findAllPaths` SHALL return the cheapest path to every reachable destination keyed by the canonical `"q,r"` hex string.

#### Scenario: Pathfinder routes around costly terrain

- **GIVEN** an origin and a destination where the straight-line path crosses heavy woods and an alternate path of equal hex length crosses only open ground
- **WHEN** `findPath` runs
- **THEN** the returned path SHALL be the open-ground route
- **AND** its `totalMpCost` SHALL be lower than the straight-line route's cost

#### Scenario: Pathfinding is deterministic

- **GIVEN** two identical `IAIPathfindRequest` values
- **WHEN** `findPath` is called for each
- **THEN** both SHALL return identical hex sequences and identical `totalMpCost`

#### Scenario: Unreachable destination is flagged

- **GIVEN** a destination whose cheapest path cost exceeds the unit's movement-point budget
- **WHEN** `findPath` runs
- **THEN** the returned `IAIPath` SHALL have `reachable` set to `false`

#### Scenario: findAllPaths agrees with per-destination findPath

- **GIVEN** an origin, movement type, and capability
- **WHEN** `findAllPaths` returns its path map and `findPath` is called separately for one of those destinations
- **THEN** the path for that destination SHALL be identical in both results

### Requirement: Terrain-Aware Move Scoring

When the active tier sets `pathfinderEnabled` to `true`, `MoveAI` SHALL extend move scoring with three additive terms, each multiplied by its tier weight: a cover term granting `coverWeight` when the destination hex offers partial cover or better, a line-of-sight-denial term granting `losDenialWeight` when the destination breaks the highest-threat enemy's line of sight, and a terrain-cost term subtracting `terrainCostWeight` scaled by the difference between the path's movement-point cost and the straight-line hex distance. The existing line-of-sight, firing-arc, closing-distance, and heat terms SHALL be unchanged. When `pathfinderEnabled` is `false`, none of the three new terms SHALL apply.

#### Scenario: Veteran bot seeks cover

- **GIVEN** a `Veteran` bot choosing between a partial-cover hex and an open hex with otherwise equal scoring inputs
- **WHEN** move scoring runs
- **THEN** the partial-cover hex SHALL score higher
- **AND** the bot SHALL move to the partial-cover hex

#### Scenario: Veteran bot breaks enemy line of sight

- **GIVEN** a `Veteran` bot with two candidate destinations of equal path cost — one keeps it visible to the highest-threat enemy, one breaks that enemy's line of sight
- **WHEN** move scoring runs
- **THEN** the line-of-sight-breaking destination SHALL score higher

#### Scenario: Wasteful path scores below an efficient path

- **GIVEN** two destinations of equal tactical value, one reached by a path whose movement-point cost exceeds its hex distance and one reached by a path whose cost equals its hex distance
- **WHEN** move scoring runs on a `Veteran` bot
- **THEN** the efficiently-reached destination SHALL score higher

#### Scenario: Regular bot ignores the new terms

- **GIVEN** a `Regular` bot scoring the same candidate moves
- **WHEN** move scoring runs
- **THEN** the cover, line-of-sight-denial, and terrain-cost terms SHALL contribute zero
- **AND** the chosen move SHALL match the pre-change scorer's choice

### Requirement: Resource-Planning Tier Parameters

The AI Difficulty Tier Registry SHALL carry a resource parameter block on each tier, exposing `heatLookaheadTurns`, `ammoConservationWeight`, `critSeekingWeight`, and `weaponModeSelection`. The `Green` and `Regular` tiers SHALL set `heatLookaheadTurns` to `0`, zero the conservation and crit-seeking weights, and set `weaponModeSelection` to `false`, leaving all resource-planning behavior inert. The `Veteran` and `Elite` tiers SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement parameter block.

#### Scenario: Every tier resolves a resource block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the resource parameter block is read for each
- **THEN** each SHALL return a populated `IAITierResourceParameters` record

#### Scenario: Lower tiers disable resource planning

- **GIVEN** a bot configured with the `Green` or `Regular` tier
- **WHEN** it plans heat, ammo, crit-seeking, and weapon modes
- **THEN** multi-turn heat projection SHALL be skipped, ammo conservation SHALL not alter selection, crit-seeking SHALL contribute zero, and every multi-mode weapon SHALL fire its default mode

### Requirement: Multi-Turn Heat Projection

When `heatLookaheadTurns` is greater than zero, the system SHALL provide `AIHeatPlanner.projectHeat` that projects the unit's heat across the lookahead window from current heat, dissipation, and the per-turn heat the candidate fire list generates, and reports the first turn at which a shutdown risk is predicted. When a shutdown is predicted inside the window, `AttackAI` SHALL lower the effective heat budget so the projected curve flattens. The single-turn heat-budget trim SHALL still run each turn. Heat projection SHALL be a pure deterministic function and SHALL NOT consume `SeededRandom`.

#### Scenario: Rising heat curve flags the shutdown turn

- **GIVEN** a unit whose candidate fire list generates more heat per turn than it dissipates
- **WHEN** `projectHeat` runs over the lookahead window
- **THEN** `shutdownRiskTurn` SHALL be the first turn the projected heat crosses the shutdown ceiling

#### Scenario: Sustainable fire list reports no risk

- **GIVEN** a unit whose candidate fire list generates no more heat than it dissipates
- **WHEN** `projectHeat` runs
- **THEN** `shutdownRiskTurn` SHALL be `-1`

#### Scenario: Veteran bot throttles before shutdown

- **GIVEN** a `Veteran` bot whose alpha strike would shut it down two turns out
- **WHEN** it selects its fire list
- **THEN** the effective heat budget SHALL be lowered and lower-efficiency weapons SHALL be culled
- **AND** the unit SHALL NOT shut down within the lookahead window

### Requirement: Ammo-Runway Projection

When `ammoConservationWeight` is greater than zero, the system SHALL provide `AIAmmoRunway` that estimates, per ammo-dependent weapon, the turns of fire the remaining ammo supports and a conservation multiplier in the range `[0, 1]`. A short runway SHALL lower the weapon's selection priority; a long runway SHALL leave it neutral. Energy weapons SHALL report an infinite runway and a neutral weight. The binary rule that culls a weapon with zero ammo SHALL be unchanged — runway projection SHALL modulate priority only, never eligibility.

#### Scenario: Scarce ammo lowers selection priority

- **GIVEN** an ammo-dependent weapon with only a few turns of fire remaining
- **WHEN** weapon selection runs on a `Veteran` bot
- **THEN** the weapon's selection priority SHALL be reduced
- **AND** the weapon SHALL still be eligible to fire

#### Scenario: Abundant ammo is neutral

- **GIVEN** an ammo-dependent weapon with a long runway of remaining fire
- **WHEN** weapon selection runs
- **THEN** the conservation weight SHALL leave the weapon's priority unchanged

#### Scenario: Energy weapons are unaffected

- **GIVEN** an energy weapon with no ammo dependency
- **WHEN** ammo runway is projected
- **THEN** it SHALL report an infinite runway and a neutral conservation weight

### Requirement: Crit-Seeking Target Weighting

When `critSeekingWeight` is greater than zero, `AttackAI.scoreTarget` SHALL add a crit-seeking term, multiplied by `critSeekingWeight`, that raises a target's score in proportion to its structural exposure — stripped armor, prior internal damage, or an opened location where a crippling critical hit is reachable. A fully-armored target SHALL receive a zero crit-seeking bonus. The existing threat and kill-probability terms SHALL be unchanged; crit-seeking SHALL be additive.

#### Scenario: Exposed target scores higher

- **GIVEN** two targets identical in threat and kill-probability, one with an open side torso and one fully armored
- **WHEN** `scoreTarget` runs on a `Veteran` bot
- **THEN** the open-side-torso target SHALL score higher

#### Scenario: Threat still dominates crit-seeking

- **GIVEN** a near-dead light with an open location and a fresh heavy posing a much larger threat
- **WHEN** `scoreTarget` runs
- **THEN** the threat and kill-probability terms MAY still place the fresh heavy above the light

#### Scenario: Crit-seeking disabled yields the legacy score

- **GIVEN** a bot whose `critSeekingWeight` is zero
- **WHEN** `scoreTarget` runs
- **THEN** the score SHALL equal the pre-change `scoreTarget` output

### Requirement: Multi-Mode Weapon Selection

When `weaponModeSelection` is enabled, the system SHALL provide `AIWeaponModeSelector` that picks, for each multi-mode weapon, the firing mode maximizing expected damage given range, the target's armor state, and the remaining heat budget. The selected mode SHALL be recorded on the declared attack. A weapon without firing-mode metadata SHALL be treated as single-mode and SHALL fire its default mode unchanged.

#### Scenario: LB-X picks cluster against an exposed target

- **GIVEN** an LB-X autocannon and a target with stripped armor or active evasion
- **WHEN** mode selection runs
- **THEN** cluster mode SHALL be selected

#### Scenario: LB-X picks slug against a fresh target

- **GIVEN** an LB-X autocannon and a fresh, fully-armored target at short range
- **WHEN** mode selection runs
- **THEN** slug mode SHALL be selected

#### Scenario: Rate-of-fire weapon drops to single fire under heat pressure

- **GIVEN** an Ultra autocannon and a heat budget that cannot absorb double fire
- **WHEN** mode selection runs
- **THEN** the single-fire mode SHALL be selected

#### Scenario: Single-mode weapon passes through unchanged

- **GIVEN** a weapon with no firing-mode metadata
- **WHEN** mode selection runs
- **THEN** the weapon SHALL fire its default mode
- **AND** the declared attack SHALL match the pre-change behavior

### Requirement: Coordination Tier Parameters

The AI Difficulty Tier Registry SHALL carry a coordination parameter block on each tier, exposing `lanceCoordination`, `cohesionRadius`, `cohesionWeight`, and `focusFireWeight`. The `Green`, `Regular`, and `Veteran` tiers SHALL set `lanceCoordination` to `false` with zeroed weights, leaving all coordination behavior inert so the `Veteran` tier remains exactly the depth of the movement and resource blocks. The `Elite` tier SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement or resource parameter blocks.

#### Scenario: Every tier resolves a coordination block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the coordination parameter block is read for each
- **THEN** each SHALL return a populated `IAITierCoordinationParameters` record

#### Scenario: Veteran tier excludes coordination

- **GIVEN** a bot configured with the `Veteran` tier
- **WHEN** it plans a turn
- **THEN** the lance planner SHALL NOT be consulted
- **AND** target selection and movement SHALL match the per-unit behavior of the movement and resource tiers

### Requirement: Multi-Unit Threat Aggregation

When `lanceCoordination` is enabled, the system SHALL provide `AIThreatMap.buildThreatMap` that aggregates each enemy's threat across every friendly lance unit into a single ranked list of `IThreatEntry` records. Each entry SHALL carry the enemy identifier, the summed threat the enemy poses across the lance, and the friendly units that can engage that enemy this turn. The aggregation SHALL be a pure deterministic function, independent of the order of the input unit lists.

#### Scenario: Higher aggregate threat ranks first

- **GIVEN** two enemies, one posing a large summed threat across the lance and one posing a small threat
- **WHEN** `buildThreatMap` runs
- **THEN** the high-threat enemy SHALL rank above the low-threat enemy

#### Scenario: Aggregation is order-independent

- **GIVEN** the same friendly and enemy unit sets supplied in two different orders
- **WHEN** `buildThreatMap` runs for each
- **THEN** both threat maps SHALL be identical

#### Scenario: Engageable list excludes out-of-range units

- **GIVEN** an enemy that one friendly unit can reach this turn and another cannot
- **WHEN** `buildThreatMap` runs
- **THEN** the enemy's `engageableBy` list SHALL contain only the friendly unit that can reach it

### Requirement: Focus-Fire Coordination

When `lanceCoordination` is enabled, the system SHALL provide `AIFireCoordinator` that produces an `IFireAssignment` mapping friendly units to targets. The coordinator SHALL prefer assignments whose combined expected damage finishes a target this turn, concentrating fire rather than spreading it. When a target is finishable by fewer units than assigned, the surplus firepower SHALL be released to the next-ranked threat. When no target is finishable, the lance SHALL concentrate on the highest-aggregate-threat target the most units can engage. `playAttackPhase` SHALL bias each unit's target selection toward its assigned target, falling back to the unit's own threat-scored pick when the assigned target is out of arc or range.

#### Scenario: Lance concentrates fire to finish a target

- **GIVEN** a target that one friendly unit cannot destroy alone but two can together
- **WHEN** fire coordination runs on an `Elite` lance
- **THEN** both units SHALL be assigned to that target
- **AND** the target SHALL appear in `finishableTargets`

#### Scenario: Surplus firepower is released

- **GIVEN** a target already finishable by two units and a third unit that could also engage it
- **WHEN** fire coordination runs
- **THEN** the third unit SHALL be assigned to the next-ranked threat rather than the already-finishable target

#### Scenario: Unreachable assignment falls back to the unit's own pick

- **GIVEN** a unit assigned a target that is out of its weapons' arc and range
- **WHEN** `playAttackPhase` runs
- **THEN** the unit SHALL fall back to its own threat-scored target selection
- **AND** no error SHALL be raised

### Requirement: Formation Cohesion Movement

When `lanceCoordination` is enabled, `MoveAI` SHALL extend move scoring with a cohesion term, multiplied by `cohesionWeight`, that penalizes a destination lying beyond `cohesionRadius` from the lance centroid and applies an additional penalty when the destination enters enemy line of sight while no lancemate is within `cohesionRadius`. A unit whose destination is inside the cohesion radius SHALL pay no cohesion penalty. The cohesion term SHALL be additive over the terrain-aware scoring terms. When `lanceCoordination` is disabled, the cohesion term SHALL contribute zero.

#### Scenario: Drifting unit is pulled back toward the lance

- **GIVEN** an `Elite` bot choosing between a destination inside `cohesionRadius` of the lance centroid and one beyond it, with otherwise equal scoring
- **WHEN** move scoring runs
- **THEN** the in-radius destination SHALL score higher

#### Scenario: Advancing alone into enemy line of sight is penalized

- **GIVEN** a destination that enters enemy line of sight with no lancemate within `cohesionRadius`
- **WHEN** move scoring runs on an `Elite` bot
- **THEN** that destination SHALL receive the additional lone-advance penalty

#### Scenario: In-formation unit is unaffected

- **GIVEN** a unit whose destination is inside `cohesionRadius` of the lance centroid
- **WHEN** move scoring runs
- **THEN** the cohesion term SHALL contribute zero to its score

### Requirement: Per-Lance Turn Plan

When `lanceCoordination` is enabled, the system SHALL provide `AILancePlanner.planTurn` that runs once per side per turn and returns an immutable `ILanceTurnPlan` carrying the aggregated threat map, the fire assignment, and the lance centroid. Each unit's movement and attack decisions SHALL consume this plan. `BotPlayer` SHALL accept an optional lance-context parameter; when it is omitted, the bot SHALL fall back to per-unit decisions identical to the pre-change behavior. The lance plan SHALL be a pure deterministic function of the unit set and SHALL NOT consume `SeededRandom`.

#### Scenario: One plan drives every unit in the lance

- **GIVEN** an `Elite` lance of four units beginning a turn
- **WHEN** `planTurn` runs
- **THEN** a single `ILanceTurnPlan` SHALL be produced
- **AND** all four units' move and attack decisions SHALL read from that one plan

#### Scenario: Omitting the lance context preserves per-unit behavior

- **GIVEN** a `BotPlayer` call made without the lance-context parameter
- **WHEN** the movement and attack phases run
- **THEN** the decisions SHALL be identical to the pre-change per-unit behavior

#### Scenario: The plan is deterministic

- **GIVEN** the same friendly and enemy unit sets
- **WHEN** `planTurn` is called twice
- **THEN** both plans SHALL contain identical threat maps, fire assignments, and centroids

### Requirement: Objective-Awareness Tier Parameters

The AI Difficulty Tier Registry SHALL carry an objective parameter block on each tier, exposing `objectiveAwareness`, `objectiveSeekingWeight`, and `objectiveHoldWeight`. The `Green`, `Regular`, and `Veteran` tiers SHALL set `objectiveAwareness` to `false` with zeroed weights, leaving the bot blind to the objective map so it plays every scenario as `Destroy`. The `Elite` tier SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement, resource, or coordination parameter blocks.

#### Scenario: Every tier resolves an objective block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the objective parameter block is read for each
- **THEN** each SHALL return a populated `IAITierObjectiveParameters` record

#### Scenario: Lower tiers ignore the objective map

- **GIVEN** a bot configured with the `Green`, `Regular`, or `Veteran` tier playing a `Capture` scenario
- **WHEN** it plans a turn
- **THEN** the objective planner SHALL NOT be consulted
- **AND** the bot SHALL play the scenario as pure attrition

### Requirement: Objective Ingestion and Classification

When `objectiveAwareness` is enabled, the system SHALL provide `AIObjectivePlanner.classifyObjectives` that reads the game session's `objectives` map and scenario objective type and classifies each marker for the bot's side as `take` (a marker the bot must control to win), `hold` (a marker the bot must keep controlling to win), or `deny` (a marker the bot must keep the enemy off). An empty objective map or a `Destroy` scenario type SHALL yield no classified objectives. Classification SHALL be a pure deterministic function and SHALL NOT modify any objective marker.

#### Scenario: Attacker capture marker classifies as take

- **GIVEN** a `Capture` scenario where the bot is the attacking side
- **WHEN** `classifyObjectives` runs
- **THEN** each objective marker SHALL be classified `take`

#### Scenario: Defender objective marker classifies as hold

- **GIVEN** a `Defend` scenario where the bot is the defending side
- **WHEN** `classifyObjectives` runs
- **THEN** each objective marker SHALL be classified `hold`

#### Scenario: Destroy scenario yields no objectives

- **GIVEN** a scenario whose objective type is `Destroy`, with or without stray markers
- **WHEN** `classifyObjectives` runs
- **THEN** it SHALL return an empty list
- **AND** the bot SHALL fall through to pure coordinated combat

### Requirement: Objective-Aware Lance Planning

When `objectiveAwareness` is enabled and the scenario objective type is not `Destroy`, the per-lance turn plan SHALL carry an objective plan assigning each unit an objective role — `capture`, `hold`, or `screen`. The capture role SHALL be assigned to the unit(s) closest by terrain-pathfinder cost to a `take` marker; the hold role to the unit(s) on or nearest a `hold` marker; the screen role to every other unit. Each role-bearing unit SHALL carry the hex it is working toward or holding. Role assignment SHALL be a pure deterministic function of the objective map and unit positions.

#### Scenario: Capture role goes to the nearest unit

- **GIVEN** a `take` marker and two friendly units at different pathfinder distances from it
- **WHEN** the objective plan is computed
- **THEN** the closer unit SHALL receive the `capture` role

#### Scenario: Hold role goes to the unit on the marker

- **GIVEN** a `hold` marker currently occupied by one friendly unit
- **WHEN** the objective plan is computed
- **THEN** that unit SHALL receive the `hold` role with the marker hex as its target hex

#### Scenario: Remaining units screen

- **GIVEN** a lance with one capture-role unit and one hold-role unit assigned
- **WHEN** the objective plan is computed
- **THEN** every other unit SHALL receive the `screen` role with no objective hex

### Requirement: Objective-Seeking Movement

When `objectiveAwareness` is enabled, `MoveAI` SHALL extend move scoring with an objective term. For a capture-role unit the term SHALL grant `objectiveSeekingWeight` scaled by the reduction in pathfinder distance to its `take` marker, with a large bonus for a destination on the marker hex. For a hold-role unit the term SHALL grant `objectiveHoldWeight` for a destination on its `hold` marker, a reduced value for adjacent hexes, and zero for destinations that abandon the marker. A screen-role unit SHALL receive a zero objective contribution. The objective term SHALL be additive over the terrain-aware and cohesion terms. When `objectiveAwareness` is disabled, the objective term SHALL contribute zero.

#### Scenario: Capture unit moves onto its objective

- **GIVEN** an `Elite` capture-role unit with a candidate destination on its `take` marker and another off it
- **WHEN** move scoring runs
- **THEN** the on-marker destination SHALL score higher
- **AND** the unit SHALL move toward the marker

#### Scenario: Hold unit stays on its objective

- **GIVEN** an `Elite` hold-role unit choosing between staying on its `hold` marker and moving off it to chase an enemy
- **WHEN** move scoring runs
- **THEN** the on-marker destination SHALL score higher

#### Scenario: Screen unit ignores the objective term

- **GIVEN** an `Elite` screen-role unit
- **WHEN** move scoring runs
- **THEN** the objective term SHALL contribute zero to its score

### Requirement: Objective-Aware Target Discipline

When `objectiveAwareness` is enabled, a unit holding a `capture` or `hold` role SHALL have its target selection biased toward targets engageable without leaving its objective hex or its path to it — the unit SHALL fire from the objective rather than pursue an enemy off it. A `screen`-role unit's target selection SHALL be unchanged from the coordinated combat behavior. This discipline SHALL be a bias over the lance fire assignment, not a replacement — an objective-role unit still concentrates fire with the lance on an in-discipline target.

#### Scenario: Hold unit engages from its objective

- **GIVEN** an `Elite` hold-role unit on its marker with an enemy it could only engage by leaving the marker
- **WHEN** target selection runs
- **THEN** the unit SHALL NOT abandon the marker to pursue
- **AND** it SHALL engage the best target reachable from the marker hex

#### Scenario: Screen unit selects targets normally

- **GIVEN** an `Elite` screen-role unit
- **WHEN** target selection runs
- **THEN** its target choice SHALL match the coordinated combat behavior with no objective bias

### Requirement: Advanced-Systems Tier Parameters

The AI Difficulty Tier Registry SHALL carry an advanced parameter block on each tier, exposing `advancedSystems`, `jumpTacticsWeight`, `ecmAvoidanceWeight`, `ecmCoverageWeight`, and `visionWeight`. The `Green`, `Regular`, and `Veteran` tiers SHALL set `advancedSystems` to `false` with zeroed weights, leaving jump tactics, ECM awareness, and vision awareness inert and keeping the flat-probability jump-movement roll. The `Elite` tier SHALL populate the block with active values. This block SHALL be registered additively and SHALL NOT modify the movement, resource, coordination, or objective parameter blocks.

#### Scenario: Every tier resolves an advanced block

- **GIVEN** the tier names `Green`, `Regular`, `Veteran`, and `Elite`
- **WHEN** the advanced parameter block is read for each
- **THEN** each SHALL return a populated `IAITierAdvancedParameters` record

#### Scenario: Lower tiers ignore advanced systems

- **GIVEN** a bot configured with the `Green`, `Regular`, or `Veteran` tier
- **WHEN** it selects movement and scores moves
- **THEN** jump-movement selection SHALL use the flat-probability roll
- **AND** the ECM and vision terms SHALL contribute zero

### Requirement: AI Jump-Jet Tactics

When `advancedSystems` is enabled, the system SHALL provide `AIJumpTactics.evaluateJump` that scores a unit's best jump destination for terrain-clearing, elevation gain, and charge or melee escape, and reports whether jumping risks a shutdown inside the heat lookahead window. Jump heat SHALL be weighed through the multi-turn heat projection from the resource-planning change. `BotPlayer.selectMovementType` SHALL choose the Jump movement type only when the best jump destination's tactical score clears a threshold; otherwise it SHALL NOT jump. When `advancedSystems` is disabled, jump selection SHALL keep the flat-probability roll.

#### Scenario: Bot jumps to clear costly terrain

- **GIVEN** an `Elite` unit whose jump destination is reachable only by walking through heavy terrain at high movement-point cost
- **WHEN** `evaluateJump` runs
- **THEN** the jump SHALL receive a high terrain-clearing score
- **AND** `selectMovementType` SHALL choose Jump

#### Scenario: Heat-unsafe jump is rejected

- **GIVEN** an `Elite` unit whose jump heat would push a shutdown inside the heat lookahead window
- **WHEN** `evaluateJump` runs
- **THEN** `heatUnsafe` SHALL be `true`
- **AND** the jump SHALL NOT be chosen on heat grounds alone

#### Scenario: Bot jumps to escape a charge

- **GIVEN** an `Elite` unit with an enemy adjacent and threatening a physical attack, and a heat-safe jump that breaks adjacency
- **WHEN** `evaluateJump` runs
- **THEN** the escape jump SHALL receive a charge-escape bonus
- **AND** `selectMovementType` SHALL choose Jump

#### Scenario: Lower tier keeps the flat jump roll

- **GIVEN** a `Veteran` unit selecting movement
- **WHEN** `selectMovementType` runs
- **THEN** jump selection SHALL use the flat-probability roll unchanged from the pre-change behavior

### Requirement: AI Electronic-Warfare Awareness

When `advancedSystems` is enabled, the system SHALL provide `AIElectronicWarfareAdvisor` that consumes the existing electronic-warfare module to advise move scoring. A destination inside a hostile ECM bubble SHALL incur a penalty scaled by `ecmAvoidanceWeight`. A destination that lets an ECM-suite or BAP-probe carrier cover more lancemates, or counter an enemy ECM source, SHALL earn a bonus scaled by `ecmCoverageWeight`. The advisor SHALL only read electronic-warfare state; it SHALL NOT modify the electronic-warfare module and SHALL NOT alter combat to-hit resolution.

#### Scenario: Bot avoids a hostile ECM bubble

- **GIVEN** an `Elite` unit choosing between a destination inside a hostile ECM bubble and one outside it, with otherwise equal scoring
- **WHEN** move scoring runs
- **THEN** the destination outside the bubble SHALL score higher

#### Scenario: ECM carrier is rewarded for covering the lance

- **GIVEN** an `Elite` unit carrying an ECM suite, choosing a destination whose bubble covers two lancemates
- **WHEN** move scoring runs
- **THEN** that destination SHALL receive an ECM coverage bonus

#### Scenario: Awareness does not touch combat resolution

- **GIVEN** the electronic-warfare advisor in use
- **WHEN** the bot scores moves
- **THEN** no to-hit number, weapon eligibility, or combat-resolution path SHALL be modified by the advisor
- **AND** the electronic-warfare module SHALL be unchanged

### Requirement: AI Spotting and Vision Awareness

When `advancedSystems` is enabled, the system SHALL provide `AIVisionAdvisor` that consumes the existing fog-of-war module to advise move scoring. A destination that newly spots a previously-unspotted enemy SHALL earn a scouting bonus scaled by `visionWeight`. A destination that breaks an enemy's spotting line to the moving unit SHALL earn a line-of-sight-break bonus scaled by `visionWeight`. The advisor SHALL only read fog-of-war visibility; it SHALL NOT modify the fog-of-war module and SHALL NOT hide enemy positions from the bot's planner.

#### Scenario: Bot repositions to scout an unspotted enemy

- **GIVEN** an `Elite` unit with a destination that newly spots an enemy not previously visible to the bot's side
- **WHEN** move scoring runs
- **THEN** that destination SHALL receive a scouting bonus

#### Scenario: Bot values breaking an enemy's spotting line

- **GIVEN** an `Elite` unit choosing between a destination spotted by an enemy and one that breaks that enemy's spotting line, with otherwise equal scoring
- **WHEN** move scoring runs
- **THEN** the line-of-sight-breaking destination SHALL score higher

#### Scenario: Vision awareness does not modify fog-of-war

- **GIVEN** the vision advisor in use
- **WHEN** the bot scores moves
- **THEN** the fog-of-war module SHALL be unchanged
- **AND** enemy positions SHALL remain fully available to the bot's planner

### Requirement: BiomeGenerator Always Returns a Valid Biome

The BiomeGenerator SHALL always return a valid biome value drawn from the four canonical variants (`temperate`, `desert`, `mountain`, `urban`). The previous placeholder value `'none'` is removed from the type union and rejected at the scenario-config validator boundary; legacy callers that pass `'none'` receive a deterministic fallback to `'temperate'` with a `console.warn`. This closes playtest gap #5 (the placeholder was excluded from Phase-1 swarm sweeps because no meaningful terrain could be generated for it).

**Priority**: Low

#### Scenario: Biome enum no longer accepts 'none'

**GIVEN** TypeScript code that attempts `const b: Biome = 'none'`
**WHEN** the compiler runs
**THEN** the compile SHALL fail with a type error (the `'none'` variant is no longer part of the `Biome` union)

#### Scenario: Legacy config with biome: 'none' falls back to temperate

**GIVEN** a legacy swarm config or scenario JSON that contains `biome: 'none'`
**WHEN** the BiomeGenerator processes the config
**THEN** the generator SHALL emit a `console.warn` identifying the offending caller
**AND** SHALL generate a `temperate`-biome scenario
**AND** SHALL NOT silently corrupt the run (the warning ensures regressions in legacy data surface in CI)

#### Scenario: Scenario-config validator rejects 'none'

**GIVEN** an external caller that POSTs a scenario config with `biome: 'none'` to the API boundary
**WHEN** the validator runs
**THEN** the validator SHALL reject the config with an error like `biome 'none' is no longer supported — use one of temperate, desert, mountain, urban`
**AND** the error message SHALL reference this OpenSpec change as the migration path

#### Scenario: Phase-1 swarm matrix runs without 'none' references

**GIVEN** the Phase-1 swarm-config sweep
**WHEN** the matrix re-runs after migration
**THEN** zero configs SHALL reference `biome: 'none'`
**AND** zero `console.warn` calls SHALL fire from the BiomeGenerator legacy-fallback path during the sweep

### Requirement: StateCycleDetector Includes Unit Positions

The StateCycleDetector SHALL include each unit's `position` field in its snapshot key so positional movement between turns does not register as a false-positive state cycle. The previous snapshot scope (armor / structure / heat only) reported a state cycle on 96% of runs even when units had moved between turns (PT-001).

**Priority**: High

#### Scenario: Same heat at different position is not a cycle

**GIVEN** a unit with `heat = 10`, `armor = 30`, `structure = 50` at position `(3, 4)` on turn N
**AND** the same unit with `heat = 10`, `armor = 30`, `structure = 50` at position `(4, 5)` on turn N+1
**WHEN** the StateCycleDetector snapshots both turns
**THEN** the two snapshot keys SHALL differ (because position differs)
**AND** the detector SHALL NOT flag a state cycle

#### Scenario: Same state at same position is still a cycle

**GIVEN** a unit with `heat = 10`, `position = (3, 4)` on turn N
**AND** the same unit with `heat = 10`, `position = (3, 4)` on turn N+1 (no movement, no damage)
**WHEN** the StateCycleDetector snapshots both turns
**THEN** the two snapshot keys SHALL match
**AND** the detector MAY flag a candidate state cycle (existing behavior preserved)

#### Scenario: PT-001 hit-rate drops below 5% after the fix

**GIVEN** the Phase-1 smoke matrix that previously produced StateCycleDetector hits on 96% of runs
**WHEN** the matrix re-runs with the position-aware snapshot
**THEN** the StateCycleDetector hit rate SHALL drop below 5% (the threshold below which the detector is no longer the dominant signal)

### Requirement: TurnLimit Scales With Map Radius

`ScenarioGenerator` SHALL default `turnLimit` to `max(50, mapRadius * 4)` so larger maps don't draw out at the 50-turn cap. Previously the static `turnLimit = 50` caused r20 maps to draw at 100% (PT-003).

**Priority**: Medium

#### Scenario: r12 default is unchanged

**GIVEN** `ScenarioGenerator.generate({ mapRadius: 12, ... })` with no explicit `turnLimit`
**WHEN** the scenario is generated
**THEN** `scenario.turnLimit` SHALL be 50 (`max(50, 12 * 4) = max(50, 48) = 50`)

#### Scenario: r20 default rises to 80

**GIVEN** `ScenarioGenerator.generate({ mapRadius: 20, ... })` with no explicit `turnLimit`
**WHEN** the scenario is generated
**THEN** `scenario.turnLimit` SHALL be 80 (`max(50, 20 * 4) = 80`)
**AND** the Phase-1 r20 draw rate SHALL drop below 50% (PT-003)

#### Scenario: Explicit caller value still wins

**GIVEN** `ScenarioGenerator.generate({ mapRadius: 20, turnLimit: 50, ... })`
**WHEN** the scenario is generated
**THEN** `scenario.turnLimit` SHALL be 50 (the caller's explicit value)
**AND** the auto-scaling SHALL only apply when the caller leaves `turnLimit` undefined
