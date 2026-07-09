## MODIFIED Requirements

### Requirement: Canvas-Based Rendering

The system SHALL use Canvas 2D rendering via react-konva for starmap display. Rendering SHALL be resilient to container measurement: the stage SHALL NOT be drawn at non-positive dimensions, and the display SHALL recover automatically when the container gains a valid size.

**Rationale**: The full Inner Sphere contains 2,000-3,500 star systems. SVG rendering degrades at 3,000-5,000 elements, while Canvas 2D remains comfortable up to 10,000 elements.

**Priority**: Critical

#### Scenario: Full Inner Sphere rendering

**GIVEN** a starmap with 3,359 star systems (SUCKit dataset)
**WHEN** rendering the complete Inner Sphere
**THEN** Canvas 2D rendering SHALL be used
**AND** performance SHALL remain above 30 FPS at 1x zoom

#### Scenario: Regional starmap rendering

**GIVEN** a starmap with 200-500 systems (regional view)
**WHEN** rendering a sector or region
**THEN** Canvas 2D rendering SHALL be used
**AND** performance SHALL remain above 60 FPS

#### Scenario: SVG not used for large maps

**GIVEN** a starmap with more than 1,000 systems
**WHEN** selecting rendering technology
**THEN** SVG rendering SHALL NOT be used
**AND** Canvas 2D SHALL be the primary renderer

#### Scenario: Zero-size container does not crash rendering

**GIVEN** a starmap display whose container measures zero width or height
**WHEN** the component mounts or the container resizes to zero
**THEN** no canvas draw SHALL be attempted at non-positive stage dimensions and no error SHALL escape to an error boundary
**AND** when the container subsequently gains positive dimensions, the stage SHALL render at those dimensions without a manual reload

#### Scenario: Campaign starmap route provides a sized container

**GIVEN** the campaign starmap page at `/gameplay/campaigns/[id]/starmap`
**WHEN** the page lays out at any common desktop viewport
**THEN** the starmap display container SHALL have a positive height and the starmap SHALL render
