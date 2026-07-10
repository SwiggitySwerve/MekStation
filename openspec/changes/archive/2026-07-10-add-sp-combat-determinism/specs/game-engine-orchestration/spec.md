# game-engine-orchestration Delta — add-sp-combat-determinism

## MODIFIED Requirements

### Requirement: GameEngine Configuration

The GameEngine SHALL accept optional configuration for map radius, turn limit, and random seed. The resolved seed SHALL drive ALL combat dice in every execution mode — auto-resolve and interactive alike, including dice consumed by optional-rule subsystems such as the MaxTech heat-scale critical location roll — and SHALL be persisted verbatim into the created session's `IGameConfig` so recovery can reconstruct the RNG. Sessions constructed without an engine (direct `InteractiveSession` construction that omits the seed) SHALL persist no seed.

**Rationale**: Configurable parameters allow testing, deterministic replay, and varied battle scenarios. A seed that is stored but does not reach the dice is not a determinism contract; a seed that is not persisted cannot survive rehydration.

**Priority**: Critical

#### Scenario: Default configuration

- **GIVEN** no configuration is provided
- **WHEN** creating a new GameEngine
- **THEN** mapRadius SHALL default to 7
- **AND** turnLimit SHALL default to 30
- **AND** seed SHALL default to Date.now()
- **AND** a minimal hex grid SHALL be created with the specified radius

#### Scenario: Custom configuration

- **GIVEN** a configuration with mapRadius=5, turnLimit=10, seed=42
- **WHEN** creating a new GameEngine
- **THEN** the engine SHALL use mapRadius=5
- **AND** the engine SHALL use turnLimit=10
- **AND** the engine SHALL use seed=42 for deterministic random number generation

#### Scenario: Resolved seed is persisted on the session config

- **GIVEN** a GameEngine with a resolved seed (explicit or defaulted)
- **WHEN** the engine creates a session in either execution mode (runToCompletion or createInteractiveSession)
- **THEN** the resulting session's `config.seed` SHALL equal the engine's resolved seed
- **AND** the seed SHALL survive event-log persistence and rehydration of the session

#### Scenario: Seed drives interactive combat dice, not only auto-resolve

- **GIVEN** a GameEngine constructed with an explicit seed
- **WHEN** an interactive session created by that engine resolves initiative, attacks, heat, piloting skill rolls, hit locations, or critical hits
- **THEN** every d6 consumed SHALL derive from a roller seeded from the engine's resolved seed
- **AND** no resolver SHALL fall back to `Math.random`

#### Scenario: Optional-rule heat-scale criticals draw from the seeded stream

- **GIVEN** a GameEngine constructed with an explicit seed and the MaxTech heat-scale optional rule enabled
- **WHEN** a failed heat-scale critical check rolls a critical hit location in either execution mode (auto-resolve or interactive)
- **THEN** the location index SHALL be deterministically derived from that mode's seeded dice stream
- **AND** the roll SHALL NOT fall back to the `Math.random`-backed default location roller

### Requirement: Interactive Session Creation

The GameEngine SHALL provide a createInteractiveSession method that returns an InteractiveSession object for turn-by-turn control. The method SHALL construct a seeded d6 roller from the engine's resolved seed — a dedicated dice stream, independent of the bot-AI PRNG — and inject it into the InteractiveSession's `d6Roller` slot, so that every resolver in an engine-created session (including physical-attack special cases such as vibro-claw) draws from one shared seeded stream and none reaches the `Math.random`-backed default roller.

**Rationale**: Interactive mode enables human players to control units, query available actions, and advance phases manually. Deterministic-per-seed dice make single-player battles reproducible for seam journeys and regression triage; a dedicated dice stream decouples combat rolls from bot-AI PRNG draw counts, shrinking the blast radius of AI changes on seed→outcome mappings.

**Priority**: Critical

#### Scenario: Create interactive session

- **GIVEN** player units, opponent units, and game unit configurations
- **WHEN** calling createInteractiveSession
- **THEN** the engine SHALL return an InteractiveSession object
- **AND** the session SHALL start in GamePhase.Initiative
- **AND** the session SHALL have GameStatus.Active
- **AND** the session SHALL not be game over

#### Scenario: Same seed and inputs produce identical interactive battles

- **GIVEN** two GameEngines constructed with the same seed and identical unit inputs
- **WHEN** each creates an interactive session and both are driven through identical phase-advance sequences to completion
- **THEN** the two sessions' event streams SHALL be identical after normalizing wall-clock timestamps and generated ids
- **AND** both sessions SHALL reach the same final outcome

#### Scenario: All resolvers share the injected stream

- **GIVEN** an interactive session created by a seeded GameEngine
- **WHEN** any resolver rolls dice — initiative, weapon attack, heat, PSR, hit location, critical hit, a physical-attack special case, or an optional-rule subsystem roll such as the MaxTech heat-scale critical location
- **THEN** the roll SHALL be drawn from, or deterministically derived from, the single injected seeded stream
- **AND** the legacy `Math.random` fallbacks SHALL be reachable only by direct InteractiveSession constructions that omit the roller

## ADDED Requirements

### Requirement: Single-Player Launch Seed Threading

Every single-player launch surface — the pre-battle launch and skirmish flows and the quick-game start actions — SHALL accept an optional explicit seed sourced from a `?seed=N` query parameter on its page route, mirroring the multiplayer WebSocket seed convention. The parameter SHALL be parsed with `Number.parseInt` and guarded by `Number.isFinite`; when absent or invalid, the surface SHALL fall back to `Date.now()` (the pre-change behavior) without throwing. The parsed seed SHALL be passed into the GameEngine configuration so the resulting battle is reproducible.

**Priority**: High

#### Scenario: Explicit seed produces a reproducible launch

- **GIVEN** a single-player launch page loaded with `?seed=424242`
- **WHEN** the battle is launched (auto-resolve, interactive, skirmish, or a quick-game start action)
- **THEN** the GameEngine SHALL be constructed with seed 424242
- **AND** relaunching the same route with the same seed and inputs SHALL produce an identical battle outcome

#### Scenario: Absent seed preserves current behavior

- **GIVEN** a single-player launch page loaded without a `?seed` parameter
- **WHEN** the battle is launched
- **THEN** the GameEngine seed SHALL fall back to `Date.now()`
- **AND** the launch SHALL behave exactly as before this change

#### Scenario: Invalid seed falls back silently

- **GIVEN** a single-player launch page loaded with `?seed=abc`
- **WHEN** the query parameter is parsed
- **THEN** the parse SHALL fail the `Number.isFinite` guard
- **AND** the surface SHALL fall back to `Date.now()` without throwing or seeding the engine with `NaN`

### Requirement: Recovered Session Dice Re-Seeding

When rehydrating an interactive session from persisted state, the recovery factory SHALL reconstruct the session RNG from the persisted `config.seed` when one is present: a fresh seeded PRNG for bot-AI decisions and a seeded d6 roller for combat dice, both re-seeded **from position zero**. Recovery SHALL NOT claim continuation of the interrupted dice stream — no roll count or PRNG position is persisted, so the post-recovery roll sequence is a re-seeded stream, not a resumption. Sessions whose persisted config carries no seed — including all sessions persisted before this capability and all multiplayer-recovered matches — SHALL be rehydrated with exactly the pre-change RNG wiring, byte-identical in behavior.

**Priority**: High

#### Scenario: Recovered session with a persisted seed gets seeded dice

- **GIVEN** a persisted single-player session whose `config.seed` is a finite number
- **WHEN** the session is rehydrated through the recovery factory
- **THEN** the recovered session's bot-AI PRNG SHALL be seeded from `config.seed`
- **AND** the recovered session's combat dice SHALL be drawn from a seeded roller derived from `config.seed`, starting at position zero

#### Scenario: Identical rehydrations produce identical continuations

- **GIVEN** one persisted single-player session whose `config.seed` is a finite number
- **WHEN** it is rehydrated twice through the recovery factory and both recovered sessions are driven through identical continuation sequences
- **THEN** the two continuations' event streams SHALL be identical after normalizing wall-clock timestamps and generated ids
- **AND** the assertion SHALL be run-to-run equality only — no specific outcome, roll value, or roll sequence SHALL be pinned to the seed

#### Scenario: Recovery is re-seed, not continuation

- **GIVEN** a session interrupted mid-battle and then recovered
- **WHEN** the recovered session continues play
- **THEN** its dice SHALL derive from the persisted seed starting at stream position zero
- **AND** no component SHALL assert or assume the post-recovery rolls match what an uninterrupted run would have produced

#### Scenario: Sessions without a persisted seed recover unchanged

- **GIVEN** a persisted session whose config carries no seed (a legacy single-player session or a multiplayer match)
- **WHEN** the session is rehydrated through the recovery factory
- **THEN** the RNG wiring SHALL be exactly the pre-change wiring
- **AND** multiplayer recovery behavior SHALL be unchanged by this capability
