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
