# combat-resolution (delta)

## ADDED Requirements

### Requirement: Infantry Combat Dispatch

The combat resolution engine SHALL route infantry targets to an infantry-specific damage pipeline.

#### Scenario: Infantry target routing

- **GIVEN** an attack whose target has `unitType === UnitType.INFANTRY`
- **WHEN** the engine resolves the hit
- **THEN** `infantryResolveDamage()` SHALL be invoked
- **AND** damage SHALL convert to trooper casualties after applying the weapon damage divisor

#### Scenario: No mech-style criticals on infantry

- **GIVEN** damage applied to an infantry platoon
- **WHEN** critical-hit resolution runs
- **THEN** mech-style crit slot effects SHALL NOT be computed

### Requirement: Infantry Damage Divisor

Incoming damage on infantry SHALL be multiplied by the weapon's anti-infantry divisor before converting to casualties.

#### Scenario: Flamer doubles damage

- **GIVEN** a Flamer dealing 2 damage base to an infantry platoon
- **WHEN** effective damage is computed
- **THEN** effective damage SHALL equal `2 × 2 = 4`

#### Scenario: Machine Gun doubles damage

- **GIVEN** an MG dealing 2 damage base to infantry
- **WHEN** effective damage is computed
- **THEN** effective damage SHALL equal `2 × 2 = 4`

#### Scenario: PPC baseline on infantry

- **GIVEN** a PPC dealing 10 damage base to infantry
- **WHEN** effective damage is computed
- **THEN** effective damage SHALL equal 10 (multiplier 1.0)

### Requirement: Infantry Casualties from Effective Damage

The system SHALL convert effective damage to casualties using trooper resilience.

#### Scenario: Simple casualty math

- **GIVEN** a 28-trooper Foot platoon with trooper resilience 1 (no Flak)
- **WHEN** effective damage of 5 is applied
- **THEN** 5 troopers SHALL die
- **AND** `survivingTroopers` SHALL become 23
- **AND** an `InfantryCasualties` event SHALL fire

#### Scenario: Flak reduces ballistic damage

- **GIVEN** the same platoon wearing Flak kit taking 10 effective ballistic damage
- **WHEN** casualties are computed
- **THEN** ballistic damage SHALL be divided by 2 per Flak rule, yielding 5 casualties

### Requirement: Infantry Morale Rule

When a platoon drops below 25% of starting strength, the system SHALL roll morale.

#### Scenario: Morale check trigger

- **GIVEN** a 28-trooper Foot platoon reduced to 6 troopers (below 25% = 7)
- **WHEN** the Casualties event fires
- **THEN** an `InfantryMoraleCheck` SHALL be queued

#### Scenario: Failed morale → pinned

- **GIVEN** a morale check that fails by 1 (e.g., rolls 7 vs TN 8)
- **WHEN** the result is applied
- **THEN** `InfantryPinned` SHALL fire
- **AND** the platoon SHALL skip firing and movement next phase

#### Scenario: Failed morale by 2+ → routed

- **GIVEN** a morale check that fails by 3 or more
- **WHEN** the result is applied
- **THEN** `InfantryRouted` SHALL fire
- **AND** the platoon SHALL retreat off-board and no longer participate in combat

### Requirement: Field Gun Firing

Field guns SHALL fire once per turn at the gun's mech-scale damage, consuming ammo.

#### Scenario: AC/5 field gun fires

- **GIVEN** a platoon crewing an AC/5 field gun with 10 rounds
- **WHEN** the field gun fires
- **THEN** damage to the target SHALL equal the AC/5 catalog damage
- **AND** ammo SHALL decrement by 1
- **AND** `FieldGunFired` SHALL fire

#### Scenario: Field gun cannot fire when pinned

- **GIVEN** a pinned platoon
- **WHEN** the field gun firing option is evaluated
- **THEN** firing SHALL be disallowed

## MODIFIED Requirements

### Requirement: Damage Distribution

The system SHALL distribute damage across units based on battle intensity and outcome.

#### Scenario: Victory results in light damage

- **GIVEN** a battle with outcome VICTORY and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 0-30% damage on average

#### Scenario: Defeat results in heavy damage

- **GIVEN** a battle with outcome DEFEAT and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 40-80% damage on average

#### Scenario: Draw results in moderate damage

- **GIVEN** a battle with outcome DRAW and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 20-50% damage on average

#### Scenario: Routed infantry surviving at 0 combat strength

- **GIVEN** a battle where an infantry platoon routed off-board
- **WHEN** distributeDamage is called
- **THEN** the routed platoon SHALL count as surviving-but-withdrawn (not wrecked)
- **AND** only actual casualties SHALL be recorded
