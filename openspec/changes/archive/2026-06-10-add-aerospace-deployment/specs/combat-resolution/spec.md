# Spec Delta: Combat Resolution — Aerospace Deployment Dispatch

## ADDED Requirements

### Requirement: Air-to-Air Dispatch

When both the attacker and the target are airborne aerospace units (`airborneState === 'airborne'` or `'taking-off'` or `'landing'`), the combat resolver SHALL route the attack to the air-to-air resolver in `aerospace-deployment`. The air-to-air resolver SHALL handle to-hit modifier calculation and delegate damage application to the existing `aerospaceResolveDamage` per the existing `Aerospace Damage Chain` requirement.

#### Scenario: Two airborne aero — air-to-air dispatch

- **GIVEN** attacker A and target T both in `airborneState: 'airborne'`
- **WHEN** A declares an attack against T
- **THEN** the resolver SHALL invoke the air-to-air resolver
- **AND** the existing `aerospaceResolveDamage` SHALL be invoked for damage application

#### Scenario: Grounded aero attacker bypasses air-to-air

- **GIVEN** A is a grounded aero (`airborneState: 'grounded'`), T is airborne
- **WHEN** A declares an attack at T
- **THEN** the resolver SHALL route through Ground-to-Air Dispatch (A is treated as a ground unit)

### Requirement: Air-to-Ground Dispatch

When the attacker is an airborne aerospace unit and the target is a ground unit (BattleMech, Vehicle, Infantry, Battle Armor, ProtoMek, grounded Aero), the combat resolver SHALL route the attack to the air-to-ground resolver in `aerospace-deployment`. The resolver SHALL apply the +2 base strafe penalty + altitude-tier modifier per `aerospace-deployment → Air-to-Ground Combat`.

#### Scenario: Airborne ASF fires at ground mech — air-to-ground

- **GIVEN** A is `airborneState: 'airborne'` at altitude 5, T is a ground mech
- **WHEN** A declares a forward-arc weapon attack at T's hex during movement
- **THEN** the resolver SHALL invoke the air-to-ground resolver
- **AND** the to-hit penalty SHALL include +2 (strafe) + 1 (medium altitude) = +3

### Requirement: Ground-to-Air Dispatch

When the attacker is a ground unit and the target is an airborne aerospace unit, the combat resolver SHALL route the attack to the ground-to-air resolver in `aerospace-deployment`. The resolver SHALL apply the altitude-tier penalty (low +1, med +2, high +3) and SHALL reject indirect-fire weapons with a warning event.

#### Scenario: Ground mech fires at airborne aero — ground-to-air

- **GIVEN** A is a mech with PPC, T is airborne aero at altitude 8 (high tier)
- **WHEN** A declares the attack
- **THEN** the resolver SHALL invoke the ground-to-air resolver
- **AND** the to-hit penalty SHALL include +3 (high altitude)

#### Scenario: Ground-to-air preview suppresses ground-only minimum range

- **GIVEN** A is a ground unit with a direct-fire weapon that has minimum range
- **AND** T is an airborne aerospace unit at altitude 3 within that weapon's nominal minimum range
- **WHEN** the tactical map projects the target and A declares the attack
- **THEN** the preview and committed to-hit modifiers SHALL NOT include `Minimum Range`
- **AND** the preview and committed to-hit modifiers SHALL include the ground-to-air altitude-tier penalty
- **AND** the tactical map SHALL NOT render a minimum-range badge for T's hex
- **AND** T's altitude and velocity metadata SHALL remain visible in top-down and isometric map projections

#### Scenario: Indirect-fire weapon rejected against airborne target

- **GIVEN** A is a mech with LRM-15 in `weapon.mode: 'Indirect'`, T is airborne aero
- **WHEN** A attempts the attack
- **THEN** the resolver SHALL reject the attack
- **AND** a warning event SHALL be emitted: `'Indirect-fire weapons cannot engage airborne targets'`
- **AND** no ammo or heat SHALL be consumed (attack fully rejected, not auto-miss)

### Requirement: Aerospace Dispatch Matrix Completeness

The combat resolver's aerospace dispatch SHALL cover all combinations of (attacker airborne-state × target airborne-state) for aerospace units per the following matrix:

| Attacker | Target | Dispatch |
|---|---|---|
| Airborne aero | Airborne aero | Air-to-Air |
| Airborne aero | Ground unit | Air-to-Ground |
| Airborne aero | Grounded aero | Air-to-Ground (grounded aero treated as ground unit) |
| Grounded aero | Airborne aero | Ground-to-Air |
| Grounded aero | Ground unit | Standard ground-combat dispatch (per existing `combat-resolution`) |
| Ground unit | Airborne aero | Ground-to-Air |
| Ground unit | Grounded aero | Standard ground-combat dispatch with `aerospaceResolveDamage` for hit-location |

#### Scenario: Grounded aero vs airborne aero — ground-to-air

- **GIVEN** A is a grounded aero, T is airborne
- **WHEN** A declares an attack at T
- **THEN** the resolver SHALL invoke the ground-to-air resolver (A treated as ground)

#### Scenario: Airborne aero vs grounded aero — air-to-ground

- **GIVEN** A is airborne, T is grounded aero
- **WHEN** A declares an attack at T
- **THEN** the resolver SHALL invoke the air-to-ground resolver (T treated as ground unit)
