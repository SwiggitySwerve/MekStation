# Proposal: End-to-End Game Simulation System

## Status
**Active** | 2026-02-01

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

## References

- MekHQ codebase: `E:\Projects\mekhq` (pattern reference)
- Detailed plan: `.sisyphus/plans/simulation-system.md`
- Design document: `openspec/changes/simulation-system/design.md`
- Task breakdown: `openspec/changes/simulation-system/tasks.md`
