## ADDED Requirements

### Requirement: Catalog-Driven Special Weapon Behavior

Weapon resolution SHALL map official BattleMech ranged weapon catalog rows into runtime behavior for damage, heat, range bands, minimum range, ammunition use, special modes, and cluster behavior. Unsupported or helper-only behavior SHALL remain explicit in the combat validation gap inventory.

#### Scenario: Autocannon special modes are catalog-backed
- **WHEN** UAC, RAC, and LB-X official catalog rows are validated
- **THEN** UAC multi-shot, RAC rate-of-fire, LB-X slug, and LB-X cluster behavior are represented by source-backed catalog mappings or explicit unresolved gaps
- **AND** no static fallback row is counted as integrated support

#### Scenario: Missile special modes are catalog-backed
- **WHEN** Streak, Artemis, NARC, TAG, and MML-family rows are validated
- **THEN** all-or-nothing Streak behavior, Artemis/NARC/TAG modifiers or marker effects, and MML-style damage hazards are integrated, helper-only, partial, unsupported, or out-of-scope with explicit evidence

#### Scenario: AMS behavior is classified
- **WHEN** Anti-Missile System rows are validated
- **THEN** AMS interception behavior and helper boundaries are classified with source-backed evidence
- **AND** unsupported runtime effects remain visible as gaps

#### Scenario: Cluster behavior matches catalog rows
- **WHEN** a catalog row declares cluster behavior
- **THEN** runtime resolution uses the canonical cluster table, declared cluster size, and per-hit damage behavior
- **AND** any unsupported cluster variant remains visible in the gap inventory
