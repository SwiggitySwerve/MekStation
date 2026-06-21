# physical-attack-system Delta — wire-interactive-turn-engine

## ADDED Requirements

### Requirement: Interactive Commit Declares Through the Engine Session

The interactive physical-attack commit path SHALL declare the attack on the
`InteractiveSession`'s authoritative engine session (via
`InteractiveSession.applyPhysicalAttack`) rather than against a detached store
snapshot, so the declaration the engine resolves on advance out of the
PhysicalAttack phase is the same one the player committed. The store/panel
snapshot SHALL be derived from the engine session after the commit, never the
reverse, and the tactical action dock SHALL dispatch the `physical-attack`
action id to that commit path.

#### Scenario: Committed physical attack is present on the engine session

- **GIVEN** an interactive session in the PhysicalAttack phase with an attacker
  and a legal melee target staged in the physical-attack plan
- **WHEN** the UI confirms the physical attack (kick, punch, charge, or DFA)
- **THEN** the engine session (`InteractiveSession.getSession()`) SHALL carry a
  `PhysicalAttackDeclared` event for that attacker and target
- **AND** the store/panel session snapshot SHALL be derived from that engine
  session
- **AND** advancing out of the PhysicalAttack phase SHALL resolve the declared
  attack rather than no-op.

#### Scenario: Declared attack is not silently dropped

- **GIVEN** a physical attack was committed through the UI in the PhysicalAttack
  phase
- **WHEN** the phase advances and `resolveAllPhysicalAttacks` runs against the
  engine session
- **THEN** the attack SHALL resolve to a hit or a miss with its rule-defined
  consequences
- **AND** the engine session SHALL NOT lack the declaration while the panel
  shows a "Declared" summary.

#### Scenario: Dock physical-attack action reaches the commit path

- **GIVEN** the tactical action dock or context menu surfaces a physical-attack
  command that emits `actionId: 'physical-attack'` with an attack-type payload
- **WHEN** the action is dispatched through `onAction`
- **THEN** a dispatch handler case for `'physical-attack'` SHALL stage the
  attack type and limb and open the commit flow
- **AND** the dispatched action SHALL NOT fall through to the unknown-action
  default.
