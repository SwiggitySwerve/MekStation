# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Tactical Projection Explainability

The tactical map SHALL expose shared projection metadata for rendered terrain,
movement, combat, LOS blocker, cover, firing arc, fog, and fallback range
surfaces so the same rules-backed projection can be inspected in top-down and
isometric views.

#### Scenario: Rendered projection surfaces expose rule references

- **GIVEN** a tactical map hex has terrain/elevation, movement, combat, LOS blocker, or legacy range projection sources
- **WHEN** a user, accessibility surface, or browser test inspects the rendered hex or overlay
- **THEN** the surface SHALL expose formatted rule-reference metadata for every source channel that has rule references
- **AND** movement and combat rule references SHALL identify MegaMek as the tactical rules oracle
- **AND** legacy attack-range fallback references SHALL identify that the fallback is MekStation compatibility metadata, not a rules-backed attack option

- **GIVEN** the same hex renders projection badges, terrain/elevation labels, tooltips, or isometric scene wrappers
- **WHEN** those surfaces expose projection source metadata
- **THEN** they SHALL also expose the corresponding rule-reference metadata without recalculating movement, combat, LOS, terrain, or isometric legality
