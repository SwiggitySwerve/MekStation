## ADDED Requirements

### Requirement: MegaMek Ammunition Name Resolution

The equipment registry SHALL resolve catalog-backed MegaMek internal ammunition names using its ammunition alias owner. Aliases SHALL recognize compact IS and CL tech prefixes, supported weapon-code synonyms, ammunition-first and ammunition-last names, and optional omnipod and Artemis/Narc capability labels. Bin sizes and munition variants SHALL remain significant. Missing or inconsistent catalog definitions SHALL NOT be replaced with a different ammunition kind or bin size.

#### Scenario: Compact autocannon and missile tokens

- **WHEN** the registry resolves ISAC20 Ammo and ISLRM20 Ammo
- **THEN** it returns ac-20-ammo and ammo-lrm-20 respectively

#### Scenario: Clan mounting and guidance capability labels

- **WHEN** the registry resolves CLAMS Ammo (omnipod) and ISLRM15 Ammo Artemis-capable
- **THEN** it returns clan-ams-ammo and ammo-lrm-15 respectively
- **AND** the dedicated Clan AMS bin retains its own catalog capacity and battle value

#### Scenario: Half bin identity

- **WHEN** the registry resolves IS Machine Gun Ammo - Half (omnipod)
- **THEN** it returns mg-ammo-half with weight 0.5 tons
- **AND** it does not substitute a full-ton bin for unsupported half-bin ammunition

#### Scenario: Unsupported ammunition

- **WHEN** ISFluidGun Ammo, ISAC20 Ammo Half, or ISAC20 Ammo Inferno has no matching ammunition definition
- **THEN** lookup remains unresolved instead of returning standard full-ton AC/20 ammunition
