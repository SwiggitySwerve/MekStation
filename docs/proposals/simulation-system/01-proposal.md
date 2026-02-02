# Proposal: End-to-End Game Simulation System

## Status
**Proposed** | 2026-02-01

## Context

MekStation is a BattleTech campaign management system with turn-based tactical hex grid combat. As the game grows in complexity, we need automated testing to ensure game mechanics work correctly across all scenarios.

### Current State
- Event-sourced architecture with `deriveState()` for state reconstruction
- Existing replay infrastructure (`useReplayPlayer`) with full playback controls
- Jest test suite with 45% coverage threshold
- Seeded RNG support in some combat functions (`distributeDamage`)
- No AI decision-making code exists
- No systematic testing of full game scenarios

### Problem Statement
1. **Bug Detection**: Need to discover edge cases, state corruption, and phase violations in game mechanics
2. **Balance Testing**: Need data on win rates, unit effectiveness, and scenario balance
3. **Coverage Gaps**: Many game paths are never exercised by manual testing

## Proposal

Build a **property-based fuzz testing system** that autonomously plays BattleTech tactical games to detect bugs and gather balance data.

### Goals
1. **Primary**: Bug detection via automated scenario simulation
   - State corruption (negative armor, units in same hex)
   - Phase violations (actions in wrong phase)
   - Combat math errors (to-hit, damage, heat)
   - Edge cases (0 MP, max heat, all units destroyed)
   - Event inconsistencies (replay divergence)

2. **Secondary**: Balance testing
   - Win rate statistics by faction, scenario type, unit composition
   - Game length metrics (turns to completion)
   - Unit survival rates

### Non-Goals
- Smart/tactical AI (only need valid moves, not optimal strategy)
- Campaign-level simulation (focus on tactical battles)
- New UI dashboard (use existing replay UI)
- Implementing unfinished game features (physical attacks, ammo tracking)

## Design Overview

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                   Simulation Runner (Jest)                   │
│  • Batch orchestration (1000+ games)                        │
│  • Turn-by-turn execution loop                              │
│  • Event application via deriveState()                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────────┐   ┌──────────────┐
│   Scenario   │    │   Valid Move AI   │   │  Invariant   │
│  Generator   │    │                   │   │  Checkers    │
│              │    │ • MoveAI         │   │              │
│ • Random     │    │ • AttackAI       │   │ • Position   │
│ • Weighted   │    │ • BotPlayer      │   │ • Heat       │
│ • Seeded     │    │                   │   │ • Armor      │
└──────────────┘    └──────────────────┘   │ • Phase      │
                                            │ • Sequence   │
                                            └──────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Results Processing                      │
│  • Metrics Collector (wins, turns, violations)             │
│  • Snapshot Manager (save failed scenarios)                │
│  • JSON Report Generator                                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Core Infrastructure**
   - `SeededRandom`: Mulberry32 PRNG for 100% reproducibility
   - `WeightedTable<T>`: MekHQ-inspired weighted random selection
   - `ISimulationConfig`: Configuration types (seed, turnLimit, unitCount)

2. **Valid Move AI Engine**
   - Makes random selections from legal moves (no tactical intelligence)
   - Uses existing `getValidDestinations()` and `calculateToHit()`
   - Handles "no valid moves" gracefully (pass turn)

3. **Game Invariant Checkers** (7 invariants)
   - Position uniqueness (no overlapping units)
   - Heat bounds (never negative)
   - Armor/structure bounds (0..max)
   - Destroyed units stay destroyed
   - Phase transitions follow correct order
   - Sequence numbers monotonically increase
   - Turn numbers never decrease

4. **Simulation Runner**
   - Jest-integrated test suite
   - Turn loop: Initiative → Movement → Attack → Heat → End
   - Invariant checking after each event
   - Victory condition evaluation
   - 100-turn timeout per game

5. **Metrics Collection**
   - Per-game: winner, turns, duration, violations, damage
   - Aggregate: win rates, avg length, violation counts by type
   - Performance: ms per turn, memory usage

6. **Snapshot/Replay Integration**
   - Failed scenarios saved to `src/simulation/__snapshots__/failed/`
   - Format: `{seed}_{timestamp}.json` with events and state
   - Loadable via existing `useReplayPlayer`

7. **Random Scenario Generator**
   - Weighted selection for unit tonnage, terrain, starting positions
   - Presets: LIGHT_SKIRMISH (2v2), STANDARD_LANCE (4v4)
   - BV-matched forces

8. **Known Limitations Documentation**
   - Documents what simulation should NOT report as bugs
   - Excludes physical attacks, ammo tracking, heat shutdown
   - Prevents false positives from unimplemented features

### Example Flow
```typescript
// Generate random scenario with seed
const scenario = generator.generate({ seed: 12345, unitCount: 4 });

// Run simulation
const result = runner.run(scenario);
// Turn 1: Initiative, Movement, Attacks, Heat, End
// Turn 2: ...
// Turn N: Victory condition met

// Check invariants after every event
const violations = invariantRunner.check(gameState);

// Collect metrics
metrics.recordGame(result);

// Save if failed
if (violations.length > 0) {
  snapshotManager.saveFailedScenario(result, violations);
}

// Generate report
const report = reportGenerator.generate(metrics);
```

## Success Criteria

### Functional Requirements
- [ ] Generate random scenarios with seeded RNG (deterministic)
- [ ] AI makes only valid moves (exercises all game mechanics)
- [ ] Invariant checkers detect all 5 bug categories
- [ ] 1000+ simulations complete in <10 minutes
- [ ] Failed scenarios reproducible via seed + replay UI
- [ ] JSON reports contain all specified metrics

### Quality Requirements
- [ ] Test coverage ≥80% for simulation module
- [ ] All acceptance criteria executable by agents (no manual steps)
- [ ] Zero imports from `src/components/` (headless mode)
- [ ] Memory usage <500MB for batch of 100

### Integration Requirements
- [ ] Jest test suite integration
- [ ] Existing replay UI compatibility
- [ ] CLI tool for manual batch runs: `bun simulate --count=1000`

## Implementation Plan

See `.sisyphus/plans/simulation-system.md` for detailed task breakdown.

**Wave 1 (Foundation)**: Core infrastructure, invariant framework, documentation
**Wave 2 (Game Logic)**: AI engine, metrics collector, report generator  
**Wave 3 (Integration)**: Simulation runner, snapshot manager, scenario generator
**Final**: Integration testing and CLI

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AI generates invalid moves | High - false bug reports | Use existing validation functions (`getValidDestinations`) |
| Non-deterministic randomness | High - can't reproduce bugs | Inject seeded PRNG at all random points |
| Performance too slow | Medium - can't run 1000+ games | Profile and optimize hot paths |
| False positives from unimplemented features | Medium - noise | Maintain `known-limitations.md` exclusion list |
| Scenario generation creates impossible setups | Medium - crashes | Validate scenarios before running |

## Alternatives Considered

### 1. Manual Test Scenarios
**Rejected**: Too time-consuming, won't catch edge cases

### 2. Smart AI (minimax, threat assessment)
**Rejected**: Out of scope, expensive to build, not needed for bug detection

### 3. Campaign-Level Auto-Resolve
**Rejected**: Too high-level, misses tactical bugs

### 4. MegaMek's Princess AI Integration
**Rejected**: External dependency, harder to control for testing

## Dependencies

### External
- MekHQ patterns (WeightedTable algorithm) - reference only, no dependency

### Internal
- Existing `deriveState()` for event replay
- Existing `getValidDestinations()` for movement
- Existing `calculateToHit()` for attack viability
- Existing `useReplayPlayer` for failed scenario debugging
- Jest test infrastructure

## Open Questions

None - all addressed during planning with Metis review.

## References

- MekHQ codebase: `E:\Projects\mekhq` (pattern reference)
- Metis gap analysis: `.sisyphus/drafts/` (archived)
- Detailed plan: `.sisyphus/plans/simulation-system.md`
