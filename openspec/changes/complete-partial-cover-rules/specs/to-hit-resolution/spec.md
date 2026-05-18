# to-hit-resolution — Delta for complete-partial-cover-rules

## MODIFIED Requirements

### Requirement: Partial Cover Modifier

The system SHALL apply a penalty when the target is in partial cover.

The simulation runner's weapon-attack phase SHALL derive whether the target is
in partial cover from the encounter board — the target occupying a hex whose
terrain (level-1 hill, building, depth-1 water, rubble) provides cover — and
SHALL supply that value to the to-hit calculation. When no board is loaded, the
target SHALL NOT be treated as in partial cover.

#### Scenario: Partial cover penalty

- **WHEN** the target is in partial cover
- **THEN** the partial cover modifier SHALL be +1

#### Scenario: Runner derives partial cover from target-hex terrain

- **GIVEN** a simulated weapon attack and an encounter board
- **WHEN** the target occupies a hex whose terrain provides cover
- **THEN** the weapon-attack phase SHALL mark the target as in partial cover
- **AND** the +1 partial-cover modifier SHALL appear in the `AttackDeclared`
  modifier breakdown

#### Scenario: No board means no partial cover

- **GIVEN** a simulated weapon attack with no encounter board loaded
- **WHEN** the weapon-attack phase builds the target state
- **THEN** the target SHALL NOT be treated as in partial cover

## ADDED Requirements

### Requirement: Partial Cover Leg-Hit Conversion

A hit on a partial-cover target whose hit-location roll yields a leg location SHALL be converted to a miss. The cover absorbs the shot (Total Warfare p. 53): the attack SHALL resolve as a miss and SHALL NOT apply damage to the target.

#### Scenario: Leg hit on a covered target becomes a miss

- **GIVEN** a target in partial cover and a confirmed weapon hit
- **WHEN** the hit-location roll yields `left_leg` or `right_leg`
- **THEN** the attack SHALL resolve as a miss
- **AND** the `AttackResolved` event SHALL report `hit: false` with no
  `hitLocation`
- **AND** no `DamageApplied` event SHALL be emitted for that weapon

#### Scenario: Non-leg hit on a covered target still applies

- **GIVEN** a target in partial cover and a confirmed weapon hit
- **WHEN** the hit-location roll yields a non-leg location
- **THEN** the attack SHALL resolve as a hit and damage SHALL be applied
  normally

#### Scenario: Attack-event count invariant preserved

- **WHEN** a leg hit on a covered target is converted to a miss
- **THEN** the conversion SHALL still emit one `AttackResolved` event
- **AND** the `AttackDeclared` and `AttackResolved` event counts SHALL remain
  equal at end of match
