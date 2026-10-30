## ADDED Requirements

### Requirement: Ammunition counts in preview consumers

The weapon selector and forecast modal SHALL pass the existing per-weapon
ammunition projection to the shared attack-preview owner as remainingShots.
Components SHALL transport counts without deriving ammunition or damage rules.
Missing counts SHALL remain undefined and retain the owner's current policy.
When live ammoState is present, the planning section SHALL use the ammunition
owner's bin projection; only its absence SHALL retain the legacy ammo map.

#### Scenario: Supplied and depleted weapon previews

- **GIVEN** an in-range ammunition-dependent weapon and an enabled preview
- **WHEN** the projected count changes from positive to zero with other inputs unchanged
- **THEN** both preview consumers SHALL refresh expected damage and standard deviation using the new count
- **AND** replenishing the count SHALL refresh both values again
- **AND** the planning section SHALL pass its existing ammo map to both consumers
- **AND** live bin counts SHALL take precedence over an empty or stale legacy ammo map

#### Scenario: Informational and compatibility boundaries

- **WHEN** previews receive ammunition updates
- **THEN** no attack, selection or ammunition mutation SHALL occur
- **AND** energy weapons, disabled previews and out-of-range handling SHALL retain their existing behavior
- **AND** unknown-capacity missile policy, damage magnitude, active-composer routing and native ammunition parity SHALL remain separate concerns


#### Scenario: Unrelated renders preserve preview memoization

- **GIVEN** unchanged weapons, legacy ammo and live bin-state references
- **WHEN** either planning section rerenders for unrelated state or presentation
- **THEN** it SHALL reuse the projected ammo map
- **AND** an enabled weapon selector SHALL reuse its existing previews while other preview inputs remain unchanged
- **AND** replacing ammo inputs SHALL refresh the map and dependent previews

#### Scenario: Physical Attack displays current ammunition

- **WHEN** the active Physical Attack section receives supplied or depleted live bins
- **THEN** its locked weapon list SHALL display the current Ammo: N or No ammo badge
- **AND** that display SHALL NOT commit a weapon attack or change the physical attack intent
