# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Isometric Fog Visibility Reasons

The tactical map interface SHALL distinguish isometric visibility-rule limits from terrain/elevation occlusion when rendering fogged contacts.

**Priority**: High

#### Scenario: Hidden contact shows fog-rule reason without elevation boost

**GIVEN** an enemy contact is hidden by fog or visibility rules
**WHEN** the map is rendered in isometric mode
**THEN** the contact SHALL expose a visibility-rule indicator identifying it as fog-limited
**AND** the contact SHALL NOT receive the terrain occlusion foreground boost solely because it is hidden
**AND** the existing hidden-contact fog marker SHALL remain visible

#### Scenario: Last-known contact shows stale-visibility reason

**GIVEN** an enemy contact is rendered at a last-known position
**WHEN** the map is rendered in isometric mode
**THEN** the contact SHALL expose a visibility-rule indicator identifying it as a last-known contact
**AND** the existing last-known fog marker SHALL remain visible
**AND** terrain/elevation occlusion indicators MAY still appear separately when elevated terrain also occludes the last-known marker

#### Scenario: Top-down fog rendering remains unchanged

**GIVEN** hidden or last-known contacts are rendered in top-down mode
**WHEN** the map displays fog markers
**THEN** the isometric visibility-rule indicator SHALL NOT replace the existing top-down fog marker behavior
