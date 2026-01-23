# Change: Add Comprehensive E2E Test Coverage

## Why

50+ PRs were merged in January 2026 introducing major features including gameplay systems (campaigns, encounters, combat), customizers (aerospace, vehicle, personnel), data systems (awards, P2P sync, event store), and UI components. Current E2E test coverage is minimal (6 test files, ~1300 lines) and doesn't verify that these features work correctly end-to-end.

Without comprehensive E2E tests:
- Regressions go undetected until manual testing
- Integration issues between systems are missed
- Confidence in deployments is low
- Refactoring is risky

## What Changes

Add E2E test suites covering all major features merged this month:

### Gameplay Systems (High Priority)
- **Campaign Management**: Create/view campaigns, mission progression, audit timeline
- **Encounter System**: Create/configure/launch encounters
- **Force Management**: Create forces, assign units and pilots
- **Game Session**: Start game, combat phases, replay
- **Hex Grid**: Visualization, unit placement, movement
- **Combat Resolution**: Attack rolls, damage application, heat management
- **Repair System**: Repair bay, cost calculation, progress tracking

### Customizer Systems (Medium Priority)
- **Aerospace Customizer**: Create/configure aerospace units
- **Vehicle Customizer**: Create/configure vehicles
- **Personnel Customizer**: Create/configure infantry/BA
- **OmniMech Features**: Pod configuration, switching
- **Exotic Mechs**: Quad, LAM, tripod support

### Data & Storage Systems (Medium Priority)
- **Awards System**: Unlock conditions, display, persistence
- **P2P Vault Sync**: Enhanced tests for sync scenarios
- **Event Store**: Event recording, querying, replay

### UI Components (Medium Priority)
- **Unit Card View**: Data accuracy, interactions
- **PilotMechCard**: Rendering, state display
- **Armor Diagram**: Interaction, damage display
- **Compendium**: Navigation, search, detail views

## Impact

- **New files**: 15-20 new E2E test files in `e2e/`
- **Existing files**: Enhanced `TESTING_CHECKLIST.md`
- **Test infrastructure**: May need test fixtures/helpers
- **CI/CD**: Test suite run time will increase

## Success Criteria

- All major user flows have E2E coverage
- Tests are stable (no flaky tests)
- Tests run in < 5 minutes on CI
- Test failures clearly identify broken functionality
