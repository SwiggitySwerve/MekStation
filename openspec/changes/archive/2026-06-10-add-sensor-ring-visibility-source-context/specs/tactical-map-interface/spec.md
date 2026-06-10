# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Sensor Ring Visibility Source Context

The tactical map interface SHALL expose source-aware context for rendered sensor
rings so players and tests can distinguish live-position rings from last-known
fog-position rings.

**Priority**: High

#### Scenario: Visible unit sensor ring exposes current source context

**GIVEN** a visible unit has a positive sensor range
**WHEN** the tactical map renders that unit's sensor ring
**THEN** the ring SHALL expose the represented range in hexes
**AND** the ring SHALL expose the rendered pixel radius
**AND** the ring SHALL expose the displayed map position
**AND** the ring SHALL expose the source unit position
**AND** the ring SHALL identify the position source as current
**AND** the ring SHALL identify the fog status as visible

#### Scenario: Last-known contact sensor ring exposes stale display context

**GIVEN** an enemy contact has a positive sensor range, a hidden current
position, and a last-known display position
**WHEN** the tactical map renders that contact's sensor ring
**THEN** the ring SHALL be placed at the last-known display position
**AND** the ring SHALL expose the hidden source unit position separately
**AND** the ring SHALL identify the position source as last-known
**AND** the ring SHALL identify the fog status as last-known

#### Scenario: Hidden contact sensor ring remains suppressed

**GIVEN** an enemy contact is hidden by fog or visibility rules
**WHEN** the tactical map renders sensor rings
**THEN** the hidden contact SHALL NOT render a sensor ring
