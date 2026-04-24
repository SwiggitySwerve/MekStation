# simulation-system Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.
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

All combat randomness in the simulation SHALL flow through SeededRandom to ensure reproducibility.

#### Scenario: Simulation uses SeededRandom for combat rolls

- **WHEN** the simulation resolves attacks, critical hits, PSRs, and other random events
- **THEN** all dice rolls SHALL use SeededRandom (or injectable DiceRoller backed by SeededRandom)
- **AND** the same seed SHALL produce identical simulation results

#### Scenario: Seed reported for reproduction

- **WHEN** a simulation completes or fails
- **THEN** the seed used SHALL be included in the simulation result
- **AND** re-running with the same seed SHALL reproduce the exact same outcome

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

