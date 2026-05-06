# Combat Resolution (delta — retrofit)

## ADDED Requirements

### Requirement: Math.random() Audit Guard in Combat Pipeline

The CI pipeline SHALL include a grep-based audit that fails when `Math.random()` is used inside `src/utils/gameplay/` or `src/simulation/`, except at the explicit `defaultD6Roller` definition site (`src/utils/gameplay/diceTypes.ts`). The audit guard exists to prevent regressions that bypass the seeded `D6Roller` injection contract used by the combat-fidelity test pyramid.

#### Scenario: New Math.random() in damage utility fails CI

- **GIVEN** a hypothetical PR introducing `Math.random()` in `src/utils/gameplay/damage/critical.ts` outside the roller-injection contract
- **WHEN** the determinism-audit CI step runs
- **THEN** the step MUST exit non-zero with a message identifying the offending file and line

#### Scenario: Math.random() at defaultD6Roller definition site passes audit

- **GIVEN** the canonical `defaultD6Roller` implementation at `src/utils/gameplay/diceTypes.ts` that internally uses `Math.random()`
- **WHEN** the audit runs
- **THEN** the audit MUST PASS — the definition site is the documented exception

#### Scenario: Math.random() outside audit scope (e.g., UI code) passes

- **GIVEN** a `Math.random()` call in `src/components/` (UI sparkle effect)
- **WHEN** the audit runs
- **THEN** the audit MUST PASS — the audit scope is only `src/utils/gameplay/` and `src/simulation/`
