# movement-system Delta — fix-tactical-projection-agreement-gaps

## MODIFIED Requirements

### Requirement: Integrated Movement Projection Agreement

Movement projection SHALL represent the same destination legality, MP cost,
terrain cost, elevation cost, heat impact, stand-up state, and blocked reason
that committed movement validation and resolution will enforce for represented
unit movement modes. Turning and facing-change MP SHALL be priced identically
by the projection and by committed movement validation for the same path, and
jump candidate selection SHALL agree with engine jump legality. Agreement SHALL
be enforced by an executable parametrized agreement suite, and any
`validatorDisagreement` diagnostic raised by committed movement validation
SHALL be a test-failing condition for represented movement modes.

#### Scenario: Represented movement modes stay preview/commit aligned

- **GIVEN** a represented unit previews walk, run, jump, vehicle-style, VTOL,
  WiGE, naval, hover, tracked, UMU, infantry, prone, or stand-up movement
- **WHEN** the projection marks a destination legal, costly, blocked, or
  unreachable
- **THEN** the committed movement path for the unchanged destination SHALL spend
  the same MP and heat or reject with the same reason
- **AND** terrain and elevation contributors SHALL remain inspectable by the
  player before commit.

#### Scenario: Turning MP priced identically by projection and commit validation

- **GIVEN** a represented ground unit previews a bent movement path whose
  committed validation charges path-alignment or terminal facing-change MP
- **WHEN** the reachability projection derives the MP cost for that destination
- **THEN** the projected MP cost SHALL include the same turning charges computed
  by the shared turning-cost function that committed movement validation applies
- **AND** a destination whose turning charges exceed the remaining MP SHALL be
  projected unreachable rather than discovered illegal at commit.

#### Scenario: Jump candidate gate agrees with engine jump legality

- **GIVEN** a represented unit previews jump movement
- **WHEN** jump candidate hexes are derived for the projection
- **THEN** every hex projected jump-reachable SHALL be accepted by committed
  jump validation for the same unit state, including represented elevation,
  clearance, occupancy/stacking, posture, and availability gates
- **AND** every hex rejected by committed jump validation SHALL NOT be projected
  jump-reachable
- **AND** any distance pre-filter SHALL only ever exclude hexes that committed
  validation would also reject
- **AND** prohibited landing-terrain support SHALL be listed as not represented
  unless and until committed jump validation implements that gate.

#### Scenario: Validator disagreement is a failing condition in the agreement suite

- **GIVEN** the parametrized movement agreement suite runs a represented
  movement mode across the shared tactical-map scenario fixtures
- **WHEN** committed movement validation produces any `validatorDisagreement`
  diagnostic for a projected destination
- **THEN** the agreement suite SHALL fail
- **AND** production commit behavior SHALL remain projection-authoritative with
  no player-facing hard failure.

#### Scenario: Unsupported agreement modes are enumerated, not skipped

- **GIVEN** a movement mode has no scenario fixture or no represented runtime
  support in the agreement suite
- **WHEN** the agreement suite enumerates its mode coverage
- **THEN** that mode SHALL appear in an explicit unsupported-agreement-mode list
  asserted by the suite
- **AND** removing runtime support for a previously covered mode SHALL fail the
  suite rather than silently shrinking coverage.
