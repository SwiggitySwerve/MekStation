## ADDED Requirements

### Requirement: Phase Damage PSR After Every Damage Phase

At the end of the Physical Attack phase the standalone runner SHALL queue one `20+_damage` PSR for every surviving unit that can fall under MegaMek 48fcb2f64 `Mek.canFall` (a BattleMech-like unit that is not prone) and whose `damageThisPhase` reached the threshold (`TWPhaseEndManager.java:239`, `TWGameManager.java:17843-17893`). The threshold SHALL be 20, or 30 for a dual cockpit with an active dedicated pilot. The weapon-hit path and the end-of-phase sweep SHALL use the same helper, and a unit SHALL carry at most one `20+_damage` PSR at a time.

#### Scenario: Physical damage crosses the threshold

- **GIVEN** two attackers each kick one standing BattleMech in the Physical Attack phase
- **WHEN** the target's `damageThisPhase` is 20 or more at the end of the phase
- **THEN** exactly one `20+_damage` PSR SHALL be pending on the target

#### Scenario: Below the threshold

- **WHEN** the target took less than 20 physical damage
- **THEN** no `20+_damage` PSR SHALL be queued

#### Scenario: A unit that cannot fall

- **WHEN** a prone unit or a unit that is not a BattleMech reaches 20 damage in a phase
- **THEN** no `20+_damage` PSR SHALL be queued

#### Scenario: Dual cockpit threshold

- **WHEN** a dual cockpit unit with a dedicated pilot takes 29 damage in a phase
- **THEN** no PSR SHALL be due
- **AND** at 30 damage one SHALL be due
