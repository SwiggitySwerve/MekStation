# weapon-resolution-system Specification Delta

## MODIFIED Requirements

### Requirement: Attack Events Declare Visual Category

Attack-related events SHALL carry metadata identifying the visual
effect category so the UI can select the right primitive without
re-resolving the weapon.

#### Scenario: Event payload carries effect category

- **GIVEN** an attack resolves
- **WHEN** the `AttackResolved` event is emitted
- **THEN** the payload SHALL contain `visualCategory: 'laser' |
'missile' | 'ballistic' | 'physical'`
- **AND** the payload SHALL contain `visualSubtype` that keys the
  color mapping (e.g., `med-laser`, `er-large`, `lrm`, `ac-standard`,
  `kick`)

#### Scenario: Cluster weapons enumerate projectile count

- **GIVEN** a missile weapon resolves
- **WHEN** the event is emitted
- **THEN** the payload SHALL contain `projectileCount` so the UI knows
  how many trails to stagger
- **AND** `projectileCount` SHALL match the number of missiles launched
