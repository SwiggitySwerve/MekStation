# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Physical Attack Sub-Panel

During the Physical Attack phase, the action panel SHALL render a "Physical Attacks" sub-panel that lists every eligible physical attack type (punch, kick, charge, DFA, push, club) for the currently selected unit against the currently locked-in target, along with disabled rows for ineligible attacks showing the restriction reason.

**Priority**: Critical

#### Scenario: Eligible punch row renders

- **GIVEN** the Physical Attack phase is active
- **AND** the selected friendly unit has both arms intact and has not fired any arm-mounted weapon this turn
- **AND** an adjacent enemy is locked as the target
- **WHEN** the sub-panel renders
- **THEN** a "Punch (Right Arm)" row SHALL be visible
- **AND** a "Punch (Left Arm)" row SHALL be visible
- **AND** each row SHALL show the attack-type icon, the target designation, the to-hit TN, and the damage number

#### Scenario: Ineligible punch row renders disabled

- **GIVEN** the Physical Attack phase is active
- **AND** the selected unit's right arm fired an LRM-10 earlier this turn
- **WHEN** the sub-panel renders
- **THEN** the "Punch (Right Arm)" row SHALL render with a red strikethrough
- **AND** a tooltip SHALL read "Right arm fired LRM-10 — cannot punch this turn"
- **AND** the row's Declare button SHALL be disabled

#### Scenario: No eligible attacks renders empty state

- **GIVEN** the Physical Attack phase is active
- **AND** no enemy is adjacent to the selected unit
- **WHEN** the sub-panel renders
- **THEN** the sub-panel SHALL show "No eligible physical attacks this turn"
- **AND** a "Skip Physical Attack" button SHALL be visible

### Requirement: Physical Attack Forecast Modal Variant

The to-hit forecast modal SHALL accept a `PhysicalAttackForecast` variant that replaces weapon range/heat modifiers with physical-specific modifiers: attack-type base, actuator damage mods, piloting skill, TMM, prone-target adjustments, and for charge/DFA a "Self-risk" row showing damage-to-attacker + auto-fall conditions.

**Priority**: Critical

#### Scenario: Kick forecast shows −2 base modifier

- **GIVEN** a player declares a kick
- **WHEN** the forecast modal opens
- **THEN** the modifier breakdown SHALL include "Kick base −2"
- **AND** the breakdown SHALL include the piloting skill, TMM, and any leg actuator damage modifiers

#### Scenario: Charge forecast surfaces self-damage

- **GIVEN** a player declares a charge against a 50-ton target
- **WHEN** the forecast modal opens
- **THEN** a "Self-risk" row SHALL be visible
- **AND** the row SHALL show `damage to attacker = ceil(50 / 10) = 5`
- **AND** the row SHALL note "Attacker takes collision PSR"

#### Scenario: DFA forecast surfaces miss-fall

- **GIVEN** a player declares a DFA
- **WHEN** the forecast modal opens
- **THEN** the Self-risk row SHALL state "On miss: attacker falls"
- **AND** the expected leg damage to attacker SHALL be shown

### Requirement: Physical Attack Intent Arrows

When a physical-attack row is hovered OR an attack of that type is declared, the map SHALL render an intent arrow that visually communicates the action's motion — solid for charge, dashed arc for DFA, and a ghost-hex displacement marker for push.

**Priority**: High

#### Scenario: Charge intent arrow renders on hover

- **GIVEN** the sub-panel shows a "Charge" row
- **WHEN** the player hovers the row
- **THEN** a solid arrow SHALL render from attacker hex center to target hex center
- **AND** the arrow color SHALL match the attacker's side color

#### Scenario: DFA intent arrow is dashed arc

- **GIVEN** the sub-panel shows a "DFA" row
- **WHEN** the player hovers the row
- **THEN** a dashed arrow rendering an arc (lift + crash) SHALL appear between attacker and target
- **AND** the dash pattern SHALL make the DFA arrow distinguishable from the charge arrow under simulated deuteranopia

#### Scenario: Push ghost hex shows displacement

- **GIVEN** the sub-panel shows a "Push" row
- **WHEN** the player hovers the row
- **THEN** a ghost outline SHALL appear on the hex where the target would be pushed to
- **AND** if the destination hex is invalid (off-map, blocked), the ghost SHALL render in red with an "X" overlay

### Requirement: Physical Attack Declaration Commit

Clicking "Declare" on an eligible row SHALL append a `PhysicalAttackDeclared` event to the session with the attacker id, target id, attack type, and limb when applicable. After commit, the sub-panel SHALL collapse to a summary row and disable further declarations for that attacker this phase.

**Priority**: Critical

#### Scenario: Punch declaration appends event

- **GIVEN** a player clicks "Declare" on the "Punch (Right Arm)" row for attacker `unit-1` targeting `unit-42`
- **WHEN** the confirmation modal is accepted
- **THEN** a `PhysicalAttackDeclared` event SHALL be appended
- **AND** its payload SHALL be `{attackerId: "unit-1", targetId: "unit-42", attackType: "Punch", limb: "RightArm"}`

#### Scenario: Post-declaration collapse

- **GIVEN** a player just declared a punch
- **WHEN** the sub-panel re-renders
- **THEN** the sub-panel SHALL show only a summary row ("Punch declared vs. unit-42")
- **AND** all Declare buttons SHALL be disabled
- **AND** the "Skip" button SHALL be hidden (declaration already made)
