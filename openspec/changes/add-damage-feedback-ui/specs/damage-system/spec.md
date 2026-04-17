# damage-system Specification Delta

## ADDED Requirements

### Requirement: Structured Damage Events For UI Feedback

The damage system SHALL emit structured `DamageApplied`, `CriticalHit`,
`PilotHit`, and `ConsciousnessRoll` events containing enough detail for
the UI to render pip decay, crit bursts, log entries, and pilot wound
flashes without additional queries.

#### Scenario: DamageApplied carries location, amount, source, transfer chain

- **GIVEN** a weapon attack that hits the Right Arm for 8 damage (5
  absorbed by armor, 3 transferred to structure)
- **WHEN** the damage pipeline resolves
- **THEN** a `DamageApplied` event SHALL be appended containing
  `{targetId, location: "RA", armorDamage: 5, structureDamage: 3,
sourceWeaponId, transferChain: []}`

#### Scenario: Transfer chain populated for overflow damage

- **GIVEN** 15 damage applied to a destroyed Right Arm (0 armor, 0
  structure), overflow transferring to Right Torso
- **WHEN** the damage pipeline resolves
- **THEN** a `DamageApplied` event SHALL be appended whose
  `transferChain` contains `[{from: "RA", to: "RT", overflow: 15}]`

#### Scenario: CriticalHit event emitted on critical resolution

- **GIVEN** a `resolveCriticalHit` call that destroys a Medium Laser
- **WHEN** the critical is applied
- **THEN** a `CriticalHit` event SHALL be appended with
  `{targetId, location, slotIndex, equipmentId, effect: "destroyed"}`

#### Scenario: ConsciousnessRoll event emitted whenever a roll fires

- **GIVEN** a pilot with 1 hit receives a second pilot hit that triggers
  a consciousness check
- **WHEN** the check runs
- **THEN** a `ConsciousnessRoll` event SHALL be appended with
  `{pilotId, wounds, targetNumber, roll, passed}`
- **AND** if `passed = false`, a `PilotHit` event SHALL follow with
  `{pilotId, consciousnessState: "unconscious"}`

### Requirement: Damage Event Ordering and Batching

The damage system SHALL emit damage events in canonical order so the UI
can animate them sequentially: armor decay → structure damage → transfer
→ critical → pilot hit → consciousness roll.

#### Scenario: Events ordered within one attack resolution

- **GIVEN** an attack that damages armor, transfers into structure,
  triggers a crit, and causes a pilot hit via head damage
- **WHEN** the attack resolves
- **THEN** events SHALL be appended in the order `DamageApplied`
  (armor portion), `DamageApplied` (structure portion), `CriticalHit`,
  `PilotHit`, `ConsciousnessRoll`
- **AND** each event's `sequence` SHALL be strictly increasing

#### Scenario: Cluster attacks batched under parent declaration

- **GIVEN** a cluster weapon that produces 4 hits
- **WHEN** each hit resolves
- **THEN** each `DamageApplied` event SHALL reference the same
  `parentDeclarationId`
- **AND** the UI SHALL use that id to group entries in the event log
