## ADDED Requirements

### Requirement: Missing Ammunition Warning

Construction validation SHALL emit one WARNING per distinct mounted weapon definition requiring external ammunition when the loadout contains zero tons of compatible ammunition. Compatibility SHALL use the shared weapon-ammunition matcher. This warning SHALL NOT make the unit illegal or prevent saving. The issue SHALL belong to Equipment and offer a hint to add compatible ammunition in Equipment.

#### Scenario: Missing or wrong ammunition

- **WHEN** an AC/20 is carried without positive-weight compatible ammunition
- **THEN** validation reports "AC/20 has no ammunition" with an Equipment fix hint
- **AND** unrelated ammunition does not suppress the warning

#### Scenario: Shared ammunition

- **WHEN** multiple weapons with the same definition share a positive-weight compatible ammunition bin
- **THEN** no missing-ammunition warning is emitted
- **AND** removing the final compatible bin produces exactly one warning for that definition

#### Scenario: Weapons without external ammunition

- **WHEN** a weapon uses no ammunition, is one-shot, or has internal ammunition
- **THEN** it produces no missing-ammunition warning

#### Scenario: Tech-base compatibility

- **WHEN** ammunition explicitly lists compatible IS or Clan weapon definitions
- **THEN** only listed definitions satisfy the warning rule
