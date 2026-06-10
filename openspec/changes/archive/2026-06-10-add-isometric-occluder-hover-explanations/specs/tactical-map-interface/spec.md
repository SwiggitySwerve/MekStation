# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Isometric Occluder Hover Explanations

The tactical map interface SHALL explain isometric occluder hexes in hover tooltips using the existing projection-derived occluder metadata.

**Priority**: High

#### Scenario: Occluder hover identifies hidden units

**GIVEN** elevated terrain may hide one or more units from the current isometric camera angle
**WHEN** the player hovers the occluding terrain hex in isometric mode
**THEN** the hover tooltip SHALL identify the unit ids the terrain may hide
**AND** the tooltip SHALL expose the occluder elevation and camera rotation context
**AND** the tooltip SHALL show the projection-derived occlusion reason

#### Scenario: Occluder rows appear with tactical hover variants

**GIVEN** an isometric occluder hex also has movement, combat, unreachable, or combined tactical context
**WHEN** the map renders the corresponding hover tooltip
**THEN** the tooltip SHALL include the occluder explanation without replacing the movement, combat, or terrain details

#### Scenario: Camera rotation clears stale hover explanations

**GIVEN** a tall terrain hex only occludes a unit from some camera angles
**WHEN** the isometric camera rotates to an angle where the terrain is no longer an occluder
**THEN** the prior occluder hover explanation SHALL no longer render for that hex
