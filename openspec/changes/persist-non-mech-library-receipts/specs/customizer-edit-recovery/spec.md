## ADDED Requirements

### Requirement: Compatible receipts across editable unit families

All six editable unit-store families SHALL support the same optional confirmed
library receipt. A draft without a receipt SHALL retain its existing persisted
shape and modified flag. Receipt persistence SHALL be additive and SHALL NOT
change storage keys, construction fields, store facades, or registry/reset seams.

#### Scenario: Old non-mech draft

- **GIVEN** a literal pre-change vehicle, aerospace, infantry, battle armor or ProtoMech draft without a receipt
- **WHEN** its existing registry hydrates it and the browser writes it again
- **THEN** its stored fields and modified flag are unchanged and no receipt is invented

#### Scenario: Confirmed save and later edit

- **GIVEN** an editable unit snapshot is confirmed saved under a library identity/version
- **WHEN** its receipt is recorded and the browser draft reloads
- **THEN** that identity/version and its normalized fingerprints remain available
- **AND** later editor changes remain distinguishable from the submitted snapshot

#### Scenario: Temporary identity and metadata

- **WHEN** only temporary mount IDs, ammo links to those mounts, timestamps or cached BV results change
- **THEN** normalized draft and library comparisons retain their existing content meaning

#### Scenario: Versioned custom-library load

- **GIVEN** a validated custom-library reference has a valid saved identity/version
- **WHEN** the loader admits an editable family state
- **THEN** the state carries a receipt for that loaded design
- **AND** canonical loads, unversioned references and read-only capital views do not acquire a confirmed receipt
