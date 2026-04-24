# weapon-resolution-system Specification Delta

## ADDED Requirements

### Requirement: UI Weapon Preview Field

The weapon resolution system SHALL extend the existing `IUIWeaponState`
projection with an optional `preview: IAttackPreview | null` field
populated when `useGameplayStore.previewEnabled === true`, allowing
the weapon-picker UI to render expected damage, stddev, and crit
probability alongside the existing hit-probability column.

#### Scenario: Preview populated when toggle enabled

- **GIVEN** `previewEnabled === true`, a locked target, and a Medium
  Laser in range
- **WHEN** the `IUIWeaponState` projection is requested
- **THEN** the returned state SHALL contain `preview:
{hitProbability, expectedDamage, damageStddev, critProbability,
clusterHitsMean, clusterHitsStddev}`
- **AND** `preview.hitProbability` SHALL equal the value returned by
  the existing `hitProbability(forecastToHit(attack).finalTn)`

#### Scenario: Preview null when toggle disabled

- **GIVEN** `previewEnabled === false`
- **WHEN** the projection is requested
- **THEN** the returned `IUIWeaponState.preview` SHALL be `null`
- **AND** no `previewAttackOutcome` computation SHALL occur

#### Scenario: Preview null for out-of-range weapons

- **GIVEN** `previewEnabled === true` and a weapon that is out of
  range (`inRange === false`)
- **WHEN** the projection is requested
- **THEN** `preview` SHALL be `null` (not a zero-filled preview)
- **AND** the weapon-picker UI SHALL render `"—"` in the preview
  columns

### Requirement: Preview Memoization

The weapon resolution system SHALL memoize the `IUIWeaponState`
projection on the tuple
`{attackerId, targetId, weaponId, previewEnabled}` so that unrelated
store updates (e.g., log scrolling, unrelated unit hover) do NOT
trigger re-computation of the preview.

#### Scenario: Memo hit when inputs unchanged

- **GIVEN** `IUIWeaponState` has been computed for
  `{attackerId: "u1", targetId: "u42", weaponId: "ml-1",
previewEnabled: true}`
- **WHEN** a store update fires that does not change any of those
  four keys
- **THEN** the cached projection SHALL be returned
- **AND** `previewAttackOutcome` SHALL NOT be called again

#### Scenario: Memo miss when target changes

- **GIVEN** a cached projection for target `"u42"`
- **WHEN** the target lock changes to `"u43"`
- **THEN** the projection SHALL recompute
- **AND** a fresh `previewAttackOutcome` call SHALL occur

### Requirement: Preview Toggle UI Surface

The weapon-picker UI SHALL expose a "Preview Damage" toggle bound to
`useGameplayStore.previewEnabled`; toggling it SHALL NOT append events,
mutate session state, or clear the attack plan.

#### Scenario: Toggle does not fire weapons

- **GIVEN** the Player has a locked target and one selected weapon
- **WHEN** the "Preview Damage" toggle is flipped ON
- **THEN** no `AttackDeclared` event SHALL be appended
- **AND** `session.events.length` SHALL remain unchanged
- **AND** the weapon's `ammoRemaining` SHALL remain unchanged

#### Scenario: Toggle preserves attack plan

- **GIVEN** an attack plan with `selectedWeapons =
["ml-1", "sl-2"]` and `targetId = "u42"`
- **WHEN** the toggle is flipped ON and OFF repeatedly
- **THEN** `selectedWeapons` SHALL remain `["ml-1", "sl-2"]`
- **AND** `targetId` SHALL remain `"u42"`

#### Scenario: Preview columns only visible when enabled

- **GIVEN** the weapon-picker is rendered with three weapons
- **WHEN** `previewEnabled` is `false`
- **THEN** each weapon row SHALL show only the Phase 1 columns (name,
  location, damage, heat, range, ammo, hit probability)
- **AND** the "Exp. Dmg", "± stddev", "Crit %" columns SHALL NOT be
  visible

- **WHEN** `previewEnabled` is flipped to `true`
- **THEN** the three preview columns SHALL be visible on each row
