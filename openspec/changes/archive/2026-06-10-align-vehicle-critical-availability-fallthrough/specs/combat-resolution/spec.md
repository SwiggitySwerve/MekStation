# Spec Delta: Combat Resolution

## ADDED Requirements

### Requirement: Vehicle Critical Availability Fallthrough

Vehicle critical resolution SHALL continue through the struck-location critical
table when represented state proves that the current table entry cannot apply.
If no later entry applies, the resolver SHALL retry the same struck-location
table once from roll 6 before resolving to `none`, matching MegaMek Tank / VTOL
critical-effect selection.

#### Scenario: Rear ammo critical falls through when no explosive ammo is represented

- **GIVEN** a represented ground vehicle is critically hit in the rear
- **AND** the vehicle has no represented explosive ammo remaining
- **WHEN** the vehicle critical roll total is 11
- **THEN** the resolver SHALL skip `ammo_explosion`
- **AND** the applied critical effect SHALL fall through to the roll-12
  engine or fuel-tank outcome for that vehicle's represented engine state.

#### Scenario: Turret ammo critical falls through to turret destruction

- **GIVEN** a represented vehicle is critically hit in the turret
- **AND** the vehicle has no represented explosive ammo remaining
- **WHEN** the vehicle critical roll total is 11
- **THEN** the applied critical effect SHALL be `turret_destroyed`
- **AND** the event stream SHALL NOT emit an `AmmoExplosion` event.

#### Scenario: Crew hit counters alter repeated front criticals

- **GIVEN** a represented ground vehicle is critically hit in the front
- **AND** the driver has already taken a represented hit
- **WHEN** the vehicle critical roll total is 6
- **THEN** the applied critical effect SHALL fall through to a crew-stun or
  crew-kill outcome instead of a duplicate driver hit.

#### Scenario: Rotor damage falls through when the VTOL is already immobile

- **GIVEN** a represented VTOL is critically hit in the rotor
- **AND** the VTOL is already immobilized
- **WHEN** the vehicle critical roll total is 6
- **THEN** the resolver SHALL skip `rotor_damage`
- **AND** the applied critical effect SHALL fall through to the next available
  rotor-table result.

#### Scenario: Unrepresented equipment availability remains optimistic

- **GIVEN** the current session state does not represent target vehicle weapon,
  cargo, or stabilizer inventory availability
- **WHEN** a vehicle critical result depends on that unrepresented inventory
- **THEN** the resolver SHALL preserve the existing optimistic table behavior
  unless a caller supplies explicit availability context.
