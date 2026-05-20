# Spec Delta: Weapon System — Indirect Mode Toggle

## ADDED Requirements

### Requirement: Weapon Indirect Mode Toggle

Indirect-eligible weapons SHALL expose a runtime combat-state field `mode: 'Direct' | 'Indirect'` that defaults to `'Direct'`. The toggle SHALL be per-weapon-mount and SHALL be reversible turn-to-turn. Toggling to `'Indirect'` on a non-eligible weapon SHALL be rejected at the UI layer with a validation error and SHALL be treated as `'Direct'` if the toggle bypasses the UI and reaches the resolver.

#### Scenario: Default mode on weapon construction

- **GIVEN** an LRM-15 weapon mount on a freshly constructed mech
- **WHEN** the unit enters combat
- **THEN** `weapon.mode` SHALL equal `'Direct'`

#### Scenario: Toggle to indirect on eligible weapon

- **GIVEN** an LRM-15 weapon in `'Direct'` mode
- **WHEN** the player toggles the weapon mode via the UI
- **THEN** `weapon.mode` SHALL become `'Indirect'`
- **AND** subsequent attacks with this weapon SHALL pass through the indirect-fire dispatch

#### Scenario: Toggle reversibility

- **GIVEN** an LRM-15 in `'Indirect'` mode on turn 3
- **WHEN** the player toggles back to `'Direct'` on turn 4
- **THEN** `weapon.mode` SHALL become `'Direct'`
- **AND** subsequent attacks SHALL use the direct-fire pipeline

#### Scenario: Toggle on non-eligible weapon rejected

- **GIVEN** an AC/20 weapon mount
- **WHEN** the player attempts to toggle `mode: 'Indirect'`
- **THEN** the UI SHALL render a validation error `'AC/20 cannot fire indirectly'`
- **AND** `weapon.mode` SHALL remain `'Direct'`

#### Scenario: Resolver ignores bad mode value

- **GIVEN** a manually-constructed combat state where an AC/20's `weapon.mode` has been set to `'Indirect'` (e.g., via a corrupt save)
- **WHEN** the resolver processes the attack
- **THEN** the resolver SHALL treat `weapon.mode` as `'Direct'` (silent fallback)
- **AND** SHALL emit a warning event `'IndirectModeIgnored'` with the weapon family and resolved fallback

### Requirement: Weapon Mode Persistence

The `weapon.mode` field SHALL be part of the per-weapon combat state slice and SHALL round-trip through the JSONL event-log replay path (per the `replay-library` capability). The per-attack event payload SHALL carry the resolved `mode` so replays render the attack's indirect/direct flag without re-deriving it.

#### Scenario: Mode persists across the same turn

- **GIVEN** the player toggles LRM-15 to `'Indirect'` mid-turn
- **WHEN** the player declares two LRM-15 attacks in the same turn
- **THEN** both attack records SHALL carry `weapon.mode === 'Indirect'`

#### Scenario: Mode persists across turn boundaries within a session

- **GIVEN** weapon mode toggled to `'Indirect'` on turn 3
- **WHEN** turn 4 begins
- **THEN** `weapon.mode` SHALL still equal `'Indirect'` (no auto-reset)
- **AND** the player must explicitly toggle back to `'Direct'` to revert

#### Scenario: Event-log replay restores mode

- **GIVEN** a JSONL event log containing attacks with `weapon.mode: 'Indirect'`
- **WHEN** the replay loader replays the log
- **THEN** the reconstructed attack records SHALL carry `weapon.mode === 'Indirect'`
- **AND** the per-attack indirect-fire events SHALL be re-emitted in their original sequence

### Requirement: MML Mode Eligibility by Loaded Ammo

For Multi-Missile Launcher (MML) mounts, indirect-mode eligibility SHALL depend on the currently loaded ammo. MML loaded with LRM ammo IS eligible; MML loaded with SRM ammo IS NOT. Switching the loaded ammo between LRM and SRM SHALL re-evaluate the eligibility and SHALL auto-revert `mode` to `'Direct'` if the new ammo makes the weapon ineligible.

#### Scenario: MML loaded with LRM ammo — eligible

- **GIVEN** an MML-5 with LRM-5 ammo loaded
- **WHEN** the player toggles `mode: 'Indirect'`
- **THEN** the toggle SHALL succeed

#### Scenario: MML loaded with SRM ammo — ineligible

- **GIVEN** an MML-5 with SRM-5 ammo loaded
- **WHEN** the player toggles `mode: 'Indirect'`
- **THEN** the toggle SHALL be rejected

#### Scenario: Switching MML ammo from LRM to SRM auto-reverts mode

- **GIVEN** an MML-5 in `'Indirect'` mode with LRM-5 ammo loaded
- **WHEN** the player switches the loaded ammo to SRM-5
- **THEN** `weapon.mode` SHALL auto-revert to `'Direct'`
- **AND** the UI SHALL render a notice `'Mode reverted to Direct: SRM ammo cannot fire indirectly'`
