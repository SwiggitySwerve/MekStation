## ADDED Requirements

### Requirement: Canonical owned SPA exclusion

The SPA picker SHALL consume the SPA domain's canonical identity projection
for its `excludedIds`, including stored compatibility aliases. It SHALL NOT
maintain a separate alias table or mutate the supplied ids.

#### Scenario: Saved alias disables the canonical row

- **GIVEN** `excludedIds` includes `iron-man`, `iron-will` or `iron_will`
- **WHEN** the picker renders the canonical `iron_man` entry
- **THEN** it SHALL show a disabled "Already owned" button
- **AND** activating that disabled button SHALL NOT emit a selection
- **AND** unrelated unowned entries SHALL remain selectable
- **AND** unknown saved ids SHALL NOT exclude unrelated known entries
