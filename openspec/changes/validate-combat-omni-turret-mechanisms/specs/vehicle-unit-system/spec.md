## ADDED Requirements

### Requirement: Explicit combat Omni turret mechanism allowances

The construction owner SHALL charge each ordinary combat or VTOL chin turret independently using the existing default half-ton ceilings. Explicit Omni identity plus a finite nonnegative base-chassis allowance SHALL charge that allowance rounded upward to a half ton. Absent or finite negative allowances SHALL derive the mechanism from qualifying equipment; non-Omni vehicles SHALL ignore allowance values. The rounded requirement SHALL be compared against the raw independent allowance, not its rounded charge. Ruling 5 remains enforced: these source allowances SHALL NOT become generic turret capacity.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, `TestTank.java:178-226,237-239,841-888`. Primary armor-mount exclusions and Java secondary/overload asymmetries require richer equipment facts; complete source parity remains outside this projection.

#### Scenario: Zero, fractional and absent assignments

- **GIVEN** two installed Omni turrets each requiring 0.5 tons for 2.5 tons of qualifying equipment
- **WHEN** each allowance is absent, negative, zero or 0.25 tons
- **THEN** each charge SHALL be 0.5, 0.5, zero or 0.5 tons respectively
- **AND** zero and 0.25 SHALL overload independently, while absent and negative allowances SHALL use ordinary derivation

#### Scenario: Absent turrets retain assigned charges

- **GIVEN** no installed primary or secondary turret and explicit Omni allowances of 1 and 0.25 tons
- **WHEN** mechanism mass is calculated
- **THEN** charges SHALL be 1 and 0.5 tons without installing either turret
- **AND** both requirements SHALL be zero and overload false even when retained equipment mass is unknown
- **AND** absent or finite negative allowances SHALL charge zero for absent turrets

#### Scenario: Known charge with unknown requirement

- **GIVEN** an installed Omni turret with a 0.25-ton allowance and unresolved qualifying equipment mass
- **WHEN** mechanism figures are calculated
- **THEN** the charge SHALL remain 0.5 tons and overload SHALL be unknown
- **AND** ordinary unresolved mechanism mass SHALL remain unknown

#### Scenario: Invalid and unsupported mechanism contexts

- **GIVEN** a nonfinite Omni allowance, invalid qualifying mass, rounded-mass overflow, or unsupported Omni support/sponson context requiring a mechanism calculation
- **WHEN** the mechanism owner evaluates it
- **THEN** dependent mass and overload SHALL be unavailable with a named diagnostic
- **AND** nonfinite allowances SHALL be diagnosed even without an installed turret
- **AND** non-Omni sponson behavior and existing support total calculations SHALL retain their current owners

### Requirement: Incomplete dependent vehicle mass validation

Vehicle construction validation SHALL expose `isComplete` and SHALL NOT report `isValid` for an incomplete dependent mass calculation. It SHALL retain independent known construction errors and known allowance overloads, skip comparisons that require unknown operands, and diagnose invalid supplied mechanism masses. Missing mass SHALL NOT be silently treated as zero. This requirement concerns the mechanism and amplifier inputs; it does not certify full unit weight or source parity.

#### Scenario: Missing mass keeps known errors

- **GIVEN** unknown primary or secondary mechanism mass or amplifier mass and an independently invalid crew
- **WHEN** construction validation runs
- **THEN** `isComplete` and `isValid` SHALL be false and the crew error SHALL remain
- **AND** comparisons requiring unknown mass SHALL not invent mismatch errors
- **AND** a known raw allowance overload SHALL still be reported

#### Scenario: Explicit secondary identity overrides legacy shorthand

- **GIVEN** an explicit secondary type alongside a primary Single or legacy Dual label
- **WHEN** construction validation runs
- **THEN** the explicit secondary type SHALL determine whether that independent mechanism is validated
- **AND** an omitted secondary type SHALL retain the legacy Dual fallback

#### Scenario: Known and invalid supplied masses

- **GIVEN** resolved ordinary masses or independently known absent-turret allowance charges
- **WHEN** dependent validation completes without rule errors
- **THEN** `isComplete` and `isValid` SHALL be true
- **AND** null, negative or nonfinite required declared mechanism/amplifier inputs SHALL prevent certification
