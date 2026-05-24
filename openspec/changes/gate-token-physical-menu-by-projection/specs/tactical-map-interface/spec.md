# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Physical Attack Projection Detail Surface

Physical attack previews and command surfaces SHALL consume the same
rules-backed target/attack option projections, including per-limb alternatives
and restriction reasons.

#### Scenario: Enemy token menus consume clicked target physical projections

- **GIVEN** an enemy token context menu is opened during Physical Attack phase
- **AND** the clicked enemy has physical attack option projections for the
  active unit
- **WHEN** a matching physical command renders in that enemy token menu
- **THEN** the command SHALL be disabled when every matching projected option is
  blocked
- **AND** the disabled reason SHALL match the first projected restriction reason
- **AND** multi-option physical commands such as punch SHALL remain available
  when at least one matching projected limb option is legal.
