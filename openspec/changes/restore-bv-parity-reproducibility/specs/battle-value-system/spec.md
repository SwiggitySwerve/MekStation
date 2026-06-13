# battle-value-system Delta — restore-bv-parity-reproducibility

## ADDED Requirements

### Requirement: Reproducible Mech BV Parity Guarantee

The BattleMech BV calculation engine SHALL hold a documented parity rate against
committed MegaMek reference data, and that parity rate SHALL be reproducible from
a clean checkout via the BV validation tooling. The documented target is at least
95% of represented mech units within 1% of reference and at least 99.5% within
3% of reference; the recorded parity figure (e.g. "99.8% within 1%,
4187-of-4196") SHALL trace to a reproducible validation run rather than to
narrative alone, and the engine SHALL NOT be permitted to silently regress below
the documented gate.

#### Scenario: Parity figure traces to a reproducible run

- **GIVEN** the committed MegaMek reference dataset and the BV validation tooling
- **WHEN** the documented mech-BV parity figure is cited
- **THEN** that figure SHALL be reproducible by running the validation tooling
  against the committed reference data on a clean checkout
- **AND** the within-1% and within-3% rates SHALL meet the documented gate
  thresholds (≥ 95% within 1%, ≥ 99.5% within 3%).

#### Scenario: Engine regression below the gate is surfaced, not hidden

- **GIVEN** a change to the BV calculation engine that drops the within-1% parity
  rate below the documented 95% gate
- **WHEN** the BV validation tooling runs against the committed reference data
- **THEN** the parity gate SHALL report FAIL and the tooling SHALL exit non-zero
- **AND** the regression SHALL block on the gate rather than being concealed by a
  silent zero-coverage or below-floor run.
