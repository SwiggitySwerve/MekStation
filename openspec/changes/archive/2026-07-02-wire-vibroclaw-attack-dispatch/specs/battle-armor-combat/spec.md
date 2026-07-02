# battle-armor-combat (delta)

Delta for `wire-vibroclaw-attack-dispatch`: the existing Vibroclaw Attack requirement (damage math + UI hiding, already specified and resolver-tested) gains the dispatch and interactive-declaration guarantees that were left unwired when PR-L2/PR-L3 shipped — the resolver must be reachable from the combat pipeline, not remain an orphan module.

## MODIFIED Requirements

### Requirement: Vibroclaw Attack

A BA trooper with `vibroClaws ≥ 1` SHALL be able to make a vibroclaw melee attack against an adjacent enemy. Damage = `missilesHit(shootingStrength) × vibroClaws` (cluster-table lookup against the squad's surviving trooper count). UI MUST hide the vibroclaw action button when the squad's `vibroClaws === 0`. The attack SHALL be declarable through the interactive session's physical-attack declaration path (matching the LegAttack declaration shape) and SHALL resolve through the battle-armor combat dispatch — emitting damage events into the standard resolution pipeline — rather than through a resolver-only call. Declaration SHALL be rejected when the target is not adjacent or the squad's `vibroClaws === 0`.

#### Scenario: Vibroclaw damage on full squad

- **GIVEN** a 4-trooper squad with 2 vibroclaws (squad-level)
- **AND** `missilesHit(4)` returns 3 on the cluster table
- **WHEN** the vibroclaw attack resolves
- **THEN** damage SHALL be `3 × 2 = 6`

#### Scenario: Vibroclaw button hidden when vibroClaws == 0

- **GIVEN** a BA squad with `vibroClaws === 0`
- **WHEN** the attack-declaration UI renders for this squad
- **THEN** the Vibroclaw action button SHALL NOT be visible

#### Scenario: Declared vibroclaw attack resolves through the combat pipeline

- **GIVEN** a 4-trooper squad with 2 vibroclaws adjacent to an enemy mech
- **WHEN** the squad declares the vibroclaw attack in the interactive session and resolution runs
- **THEN** the battle-armor combat dispatch SHALL invoke the vibroclaw resolver
- **AND** the resulting damage SHALL be applied via standard damage events (not a side-channel)

#### Scenario: Non-adjacent declaration rejected

- **GIVEN** a squad with 2 vibroclaws two hexes away from the target
- **WHEN** the squad attempts to declare the vibroclaw attack
- **THEN** the declaration SHALL be rejected with an adjacency reason
