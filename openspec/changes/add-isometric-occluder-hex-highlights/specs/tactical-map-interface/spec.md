# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Isometric Occluder Hex Highlights

The tactical map interface SHALL identify tall isometric terrain that may obscure units behind it.

**Priority**: High

#### Scenario: Occluding terrain exposes hidden-unit metadata

**GIVEN** a unit may be hidden behind elevated terrain in isometric mode
**WHEN** the map derives terrain occlusion information
**THEN** the occluding terrain hex SHALL expose the unit ids it may hide
**AND** the occluding terrain hex SHALL expose the reason for the occlusion
**AND** represented building levels SHALL contribute to the occluder's vertical
height for this readability projection

#### Scenario: Occluding terrain is visually highlighted

**GIVEN** elevated terrain may hide one or more units from the current isometric camera angle
**WHEN** the map is rendered in isometric mode
**THEN** the occluding terrain hex SHALL render an isometric-only highlight
**AND** its elevation stack SHALL indicate that it is the source of occlusion
**AND** the highlight's accessible label SHALL report the effective occluder
height, including represented building levels
**AND** represented building levels SHALL contribute to visible isometric stack
layers even when the base terrain elevation is flat

#### Scenario: Multiple occluding layers remain visible

**GIVEN** more than one elevated terrain hex may hide the same unit from the
current isometric camera angle
**WHEN** the map derives and renders isometric terrain occlusion information
**THEN** every occluding terrain hex SHALL expose the hidden unit id
**AND** every occluding terrain hex SHALL render its isometric occluder
highlight and stack metadata
**AND** the unit token MAY keep one representative occluder reason for compact
foreground readability labeling

#### Scenario: Camera rotation clears stale occluder highlights

**GIVEN** a tall terrain hex only occludes a unit from some camera angles
**WHEN** the isometric camera rotates to an angle where the terrain is no longer in front of the unit
**THEN** the prior occluder hex highlight SHALL be removed
