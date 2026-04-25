# firing-arc-calculation (delta)

## ADDED Requirements

### Requirement: Arc Computation Invoked During Attack Resolution

The firing-arc helper (`computeFiringArc(attackerHex, targetHex, targetFacing)`) SHALL be invoked for every attack during resolution. Hardcoded `FiringArc.Front` SHALL NOT appear in the attack-resolution path.

#### Scenario: Direct call during attack resolution

- **GIVEN** an attacker at hex (5, 3) and a target at hex (5, 5) facing direction 0
- **WHEN** the attack is resolved
- **THEN** `computeFiringArc` SHALL be invoked with those arguments
- **AND** the returned arc SHALL propagate onto the `AttackResolved` event payload

#### Scenario: Arc field on event payload

- **GIVEN** an attack that resolves successfully
- **WHEN** the `AttackResolved` event is emitted
- **THEN** the payload SHALL include an `attackerArc: FiringArc` field

#### Scenario: Same-hex arc undefined

- **GIVEN** an attacker and target occupying the same hex
- **WHEN** the arc helper is invoked
- **THEN** the attack SHALL be rejected with `AttackInvalid` and reason `SameHex`

### Requirement: Arc Boundary Resolution Is Deterministic

When the attacker's hex is exactly on the boundary between two arcs, the system SHALL resolve the ambiguity deterministically and document the precedence rule.

Precedence rule: front arc wins front/side boundaries; rear arc wins rear/side boundaries. The same position evaluated twice SHALL return the same arc.

#### Scenario: Front/side boundary

- **GIVEN** an attacker position that mathematically sits on the front-left boundary
- **WHEN** the arc is computed
- **THEN** the arc SHALL be `Front` (front precedence)

#### Scenario: Rear/side boundary

- **GIVEN** an attacker position that mathematically sits on the rear-left boundary
- **WHEN** the arc is computed
- **THEN** the arc SHALL be `Rear` (rear precedence)

#### Scenario: Determinism property

- **GIVEN** any attacker/target/facing triple
- **WHEN** `computeFiringArc` is invoked twice with the same arguments
- **THEN** both calls SHALL return the same `FiringArc` value
