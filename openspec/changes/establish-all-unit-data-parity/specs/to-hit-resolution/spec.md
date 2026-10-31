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

### Requirement: Missile damage previews use per-projectile damage

The shared expected-damage and damage-variance owner SHALL treat a hydrated
missile launcher's `IWeapon.damage` as the launcher total, as the firing side
does. For a missile cluster weapon, identified with the cluster module's
missile rack owner, per-projectile damage SHALL be the total divided by the
rack. Expected damage SHALL be `p x E[hits(rack)] x per-projectile damage` and
standard deviation `sqrt(d^2 x (p x Var(hits) + p x (1 - p) x E[hits]^2))`.
For a Streak launcher expected damage SHALL be `p x total` and standard
deviation `sqrt(p x (1 - p)) x total`. Per-missile damage is 1 for LRM and MRM
and 2 for SRM (pinned MegaMek `MissileWeaponHandler.calcDamagePerHit`,
`SRMHandler.calcDamagePerHit`); hit counts are the
`Compute.calculateClusterHitTableAmount` cluster table for racks 1-20 (MRM 30/40
columns and ATM's built-in +2 cluster modifier remain open); a Streak lock lands the whole rack
(`StreakHandler.calcHits`).

#### Scenario: LRM 16 preview equals the firing side

- **GIVEN** a hydrated LRM 16 mount (`damage` 16) and hit probability 0.5
- **WHEN** the preview computes expected damage and standard deviation
- **THEN** expected damage SHALL be 5.2083 and standard deviation 5.5526
- **AND** both SHALL equal the 2d6-weighted damage the runner resolves for the same weapon
- **AND** neither SHALL multiply the 16-point total by the landed missiles

#### Scenario: Streak SRM 6 previews the all-hit total

- **GIVEN** a hydrated Streak SRM 6 mount (`damage` 12) and hit probability 0.5
- **WHEN** the preview computes expected damage and standard deviation
- **THEN** expected damage SHALL be 6 and standard deviation 6
- **AND** the rack SHALL NOT multiply the total again

#### Scenario: Identification follows the firing side

- **GIVEN** a mount id carrying the hydration `-<mountIndex>` suffix
- **WHEN** the preview identifies the rack
- **THEN** it SHALL use the same rack and missile classification as the runner and selected-AMS paths
- **AND** UAC, RAC and LB-X rows SHALL keep their existing preview until their rate-of-fire and cluster/slug contracts are corrected
- **AND** situational cluster modifiers, including MRM's column modifier, SHALL remain outside the preview
