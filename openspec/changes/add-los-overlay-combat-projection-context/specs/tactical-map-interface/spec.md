# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose the weapon-range, firing-arc, LOS, cover,
visibility, and target-number facts needed to understand attack legality before
the player commits.

#### Scenario: LOS overlay carries combat projection evidence

- **GIVEN** a selected unit hovers a hex with an `ICombatRangeHex` combat projection
- **WHEN** the LOS overlay renders for that hover target
- **THEN** the overlay group, LOS line, and LOS state badge SHALL expose the projection LOS state, range bracket, distance, target unit ids, blocker hex, blocker kind, blocker terrain when present, and blocker reason when present
- **AND** the overlay title or accessible announcement SHALL summarize the combat projection LOS state, range, distance, targets, and blocker reason
- **AND** the overlay SHALL read that combat context from the supplied `ICombatRangeHex` rather than deriving combat target facts from local SVG geometry
- **AND** overlay geometry MAY still use the existing LOS classifier to draw the line and blocker annotation
