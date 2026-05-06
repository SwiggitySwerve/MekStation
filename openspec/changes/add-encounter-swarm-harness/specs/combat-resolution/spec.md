# combat-resolution Spec Delta — Add Encounter Swarm Harness

## MODIFIED Requirements

### Requirement: Bot Behavior Variant Registry

`IBotBehavior` (existing type with `retreatThreshold`, `retreatEdge`, `safeHeatThreshold` fields) SHALL be exposed through a named-variant registry that the swarm harness consumes by name. The registry SHALL ship at least four presets: `default`, `aggressive`, `defensive`, `skirmisher`.

The `default` preset SHALL preserve the existing pre-swarm `DEFAULT_BEHAVIOR` values exactly so any existing call site that does not opt into a variant continues to behave identically.

`BotPlayer` SHALL accept an `IBotBehavior` constructor parameter (with the existing `DEFAULT_BEHAVIOR` as the default value) and SHALL use the injected behavior for retreat triggers and heat-aware fire control. `BotPlayer` SHALL declare `implements IAIPlayer`.

#### Scenario: Default preset preserves existing behavior

- **GIVEN** a `BotPlayer` constructed via `new BotPlayer(random)` (no behavior argument)
- **WHEN** retreat triggers are evaluated
- **THEN** the effective `IBotBehavior` SHALL equal the pre-swarm `DEFAULT_BEHAVIOR`
- **AND** all existing bot-retreat / bot-AI tests SHALL continue to pass

#### Scenario: Aggressive variant yields lower retreat propensity

- **GIVEN** two `BotPlayer` instances, one with `default` behavior and one with `aggressive` behavior
- **AND** both units are at 50% structural integrity
- **WHEN** retreat evaluation runs
- **THEN** the `default` unit SHALL retreat (default `retreatThreshold = 0.5`)
- **AND** the `aggressive` unit SHALL NOT retreat at this damage level (`retreatThreshold > 0.5`)

#### Scenario: Defensive variant yields lower heat tolerance

- **GIVEN** two `BotPlayer` instances, one with `default` behavior and one with `defensive` behavior
- **AND** both units have a fire plan that would push heat to 12
- **WHEN** `AttackAI` heat budgeting runs
- **THEN** the `default` unit SHALL fire the full plan (under default `safeHeatThreshold = 13`)
- **AND** the `defensive` unit SHALL drop the highest-heat weapon (under defensive `safeHeatThreshold < 13`)

#### Scenario: Variant lookup with unknown name throws

- **GIVEN** the `getBehaviorVariant(name)` lookup in `behaviorVariants.ts`
- **WHEN** called with `name = 'nonexistent'`
- **THEN** the lookup SHALL throw an error
- **AND** the error message SHALL name the requested variant

#### Scenario: Head-to-head match between two variants converges

- **GIVEN** a 200-run batch of `aggressive` vs `defensive` on the same seed-base, same map, same unit selection
- **WHEN** the batch completes
- **THEN** the `aggressive` win rate SHALL fall in the inclusive range [10%, 90%]
- **AND** the result SHALL NOT degenerate to 0% or 100% (proving both variants make consequential decisions)

### Requirement: BotPlayer Conforms to IAIPlayer

`BotPlayer` SHALL declare `implements IAIPlayer` and SHALL expose the four-method surface defined by `IAIPlayer` (`evaluateRetreat`, `playMovementPhase`, `playAttackPhase`, `playPhysicalAttackPhase`). Method signatures SHALL accept `IGameSession` / `IAIUnitState` / `IHexGrid` and produce `IRetreatEvent` / `IMovementEvent` / `IAttackEvent` (or `null` / array thereof). Internal `AttackAI` / `MoveAI` / `RetreatAI` types SHALL NOT leak through `IAIPlayer`'s public surface.

#### Scenario: BotPlayer satisfies the IAIPlayer contract

- **GIVEN** a `BotPlayer` instance
- **WHEN** assigned to a variable typed `IAIPlayer`
- **THEN** the assignment SHALL type-check without `as` casts or interface adapters

#### Scenario: BotPlayer produces interface-typed outputs

- **GIVEN** a `BotPlayer` driving a unit during a movement phase
- **WHEN** `playMovementPhase` returns
- **THEN** the return value SHALL be `IMovementEvent | null` typed
- **AND** the consumer SHALL NOT need internal `MoveAI` types to consume it

#### Scenario: Alternative IAIPlayer can be substituted

- **GIVEN** a `StandStillAIPlayer` test stub implementing `IAIPlayer`
- **AND** the `SimulationRunner` factory wired to construct it instead of `BotPlayer`
- **WHEN** a 5-turn battle runs
- **THEN** the runner SHALL invoke `StandStillAIPlayer.playMovementPhase` for every unit each turn
- **AND** no unit SHALL change position
- **AND** the simulation SHALL still terminate cleanly (e.g., on turn limit)
