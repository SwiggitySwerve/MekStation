# Damage System (delta)

## MODIFIED Requirements

### Requirement: Destruction Events Carry UI Metadata

Damage-related events SHALL carry enough metadata for the UI to render
presentation-layer effects without recomputing state. The `UnitDestroyed.cause` field SHALL be a closed snake_case enum aligned with the live TypeScript codebase (rather than the prior kebab-case spec value), so that `IUnitDestroyedPayload.cause` at `src/types/gameplay/GameSessionInterfaces.ts` and the union at `src/types/gameplay/CombatInterfaces.ts` remain a single source of truth.

#### Scenario: LocationDestroyed carries anchor location

- **GIVEN** a location is destroyed
- **WHEN** the `LocationDestroyed` event is emitted
- **THEN** the payload SHALL contain the location identifier (RA, LT,
  etc.)
- **AND** the payload SHALL indicate whether destruction was direct or
  via transfer from an adjacent location

#### Scenario: CriticalHit carries slot identity

- **GIVEN** a critical hit lands on an engine slot
- **WHEN** the `CriticalHit` event is emitted
- **THEN** the payload SHALL contain the slot identifier (e.g.,
  `ENGINE`, `GYRO`, `COCKPIT`)
- **AND** the payload SHALL contain which location the slot was in
- **AND** engine crits SHALL be distinguishable from other crits by
  slot value

#### Scenario: UnitDestroyed carries cause

- **GIVEN** a unit is destroyed
- **WHEN** the `UnitDestroyed` event is emitted
- **THEN** the payload SHALL contain `cause: 'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed' | 'shutdown' | 'ct_destroyed' | 'head_destroyed'`
- **AND** the UI SHALL use `cause` to choose the appropriate debris
  variant

#### Scenario: UnitDestroyed cause taxonomy is mutually exclusive

- **GIVEN** a unit is destroyed in a single turn
- **WHEN** multiple destruction conditions could apply (e.g., pilot KIA AND CT destroyed in the same turn)
- **THEN** the engine SHALL pick exactly ONE `cause` value following the canonical priority order: `'pilot_death'` (pilot wounds reach 6) > `'head_destroyed'` (head location destroyed) > `'ct_destroyed'` (CT destroyed) > `'engine_destroyed'` (3 engine crits) > `'ammo_explosion'` (ammo bin cooked off) > `'shutdown'` (heat-induced terminal shutdown) > `'damage'` (generic catch-all)
- **AND** exactly one `UnitDestroyed` event SHALL emit per destroyed unit per match
- **AND** the chosen `cause` SHALL be auditable against the prior event chain (e.g., `cause: 'engine_destroyed'` requires three preceding `ComponentDestroyed { component: 'engine' }` events on that unit)

#### Scenario: Pilot-Killed kebab variant is no longer emitted

- **GIVEN** a unit is destroyed by pilot KIA
- **WHEN** the engine emits `UnitDestroyed`
- **THEN** the payload `cause` MUST be `'pilot_death'` (snake_case)
- **AND** the prior kebab-case value `'pilot-killed'` MUST NOT be emitted by any code path
- **AND** the prior spec-only value `'crew-kia'` MUST NOT appear in the closed set (no live code consumer ever existed)

#### Scenario: Code-spec union is symmetric across type files

- **GIVEN** the closed-set union for `UnitDestroyed.cause`
- **WHEN** a contributor reads `src/types/gameplay/GameSessionInterfaces.ts` (the `IUnitDestroyedPayload.cause` field)
- **AND** also reads `src/types/gameplay/CombatInterfaces.ts` (the `destructionCause` field)
- **AND** also reads `src/utils/gameplay/damage/types.ts` (the `cause` field)
- **THEN** all three union literal types MUST contain exactly the same 7 values listed above
- **AND** no file MUST contain extra or missing values relative to the others
