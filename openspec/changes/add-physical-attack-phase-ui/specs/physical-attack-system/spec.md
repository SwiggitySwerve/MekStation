# physical-attack-system Specification Delta

## ADDED Requirements

### Requirement: UI-Facing Eligibility Projection

The physical-attack system SHALL expose a `getEligiblePhysicalAttacks(attacker: IUnitGameState, target: IUnitGameState): IPhysicalAttackOption[]` function that returns every physical attack type (punch, kick, charge, DFA, push, club) along with its computed to-hit TN, damage, self-risk summary, and a list of any failed restrictions. The UI consumes this projection to render both enabled and disabled rows without duplicating rule logic on the client.

**Priority**: Critical

#### Scenario: Fully-intact mech returns punch + kick options

- **GIVEN** a 50-ton mech with all actuators intact, not having fired any arm weapon this turn, adjacent to an enemy
- **WHEN** `getEligiblePhysicalAttacks(attacker, target)` is called
- **THEN** the returned list SHALL include a `Punch` option for each arm with `toHit = pilotingSkill + TMM`, `damage = ceil(50/10) = 5`, `restrictionsFailed = []`
- **AND** the returned list SHALL include a `Kick` option for each leg with `toHit = pilotingSkill - 2 + TMM`, `damage = floor(50/5) = 10`, `restrictionsFailed = []`

#### Scenario: Arm that fired weapon returns failed restriction

- **GIVEN** a mech whose right arm fired an LRM-10 this turn
- **WHEN** `getEligiblePhysicalAttacks(attacker, target)` is called for a target adjacent
- **THEN** the `Punch (Right Arm)` option SHALL include `restrictionsFailed: ["WeaponFiredThisTurn"]`
- **AND** the option SHALL still include the computed TN and damage so the UI can show what would-have-been

#### Scenario: Non-adjacent target returns empty list

- **GIVEN** a mech with no adjacent enemies
- **WHEN** `getEligiblePhysicalAttacks(attacker, null)` is called (or for a non-adjacent target)
- **THEN** the returned list SHALL be empty

#### Scenario: Charge option requires ran this turn

- **GIVEN** an attacker that walked (did not run) this turn
- **WHEN** `getEligiblePhysicalAttacks` computes options against an adjacent target
- **THEN** the `Charge` option SHALL include `restrictionsFailed: ["DidNotRun"]`

#### Scenario: DFA option requires jumped this turn

- **GIVEN** an attacker that did not jump this turn
- **WHEN** `getEligiblePhysicalAttacks` computes options
- **THEN** the `DFA` option SHALL include `restrictionsFailed: ["DidNotJump"]`

### Requirement: Self-Risk Summary in Options

Each `IPhysicalAttackOption` SHALL include a `selfRisk` summary describing attacker-side consequences (damage to attacker, auto-fall conditions, displacement requirements), so the UI forecast modal can render self-risk without re-deriving the rules.

**Priority**: High

#### Scenario: Charge self-risk includes collision damage

- **GIVEN** a 60-ton attacker declaring a charge against a 40-ton target
- **WHEN** the `Charge` option is computed
- **THEN** `selfRisk.damageToAttacker` SHALL equal `ceil(40 / 10) = 4`
- **AND** `selfRisk.pilotingSkillRoll` SHALL be `{trigger: "ChargeCompleted", required: true}`

#### Scenario: DFA self-risk includes leg damage + miss-fall

- **GIVEN** a 55-ton attacker declaring a DFA
- **WHEN** the `DFA` option is computed
- **THEN** `selfRisk.damageToAttacker` SHALL equal `ceil(55 / 5) = 11` (leg damage regardless of hit/miss)
- **AND** `selfRisk.onMiss` SHALL equal `"AttackerFalls"`

#### Scenario: Push self-risk is empty

- **GIVEN** an attacker declaring a Push
- **WHEN** the `Push` option is computed
- **THEN** `selfRisk.damageToAttacker` SHALL be 0
- **AND** `selfRisk.onMiss` SHALL be null
